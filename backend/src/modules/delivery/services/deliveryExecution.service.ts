import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { DeliveryDispatchService } from "./deliveryDispatch.service.js";
import { DeliverySettingsService } from "./deliverySettings.service.js";

export class DeliveryExecutionService {
  static async startNavigationToPickup(deliveryId: string, riderId: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery || delivery.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or delivery not found.");
    }

    if (delivery.status !== "ASSIGNED" && delivery.status !== "ACCEPTED") {
      throw new Error(`Cannot start navigation in status ${delivery.status}`);
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: "ARRIVING_AT_PICKUP" },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "ARRIVING_AT_PICKUP",
      "Rider En Route to Pickup",
      "RIDER",
      riderId,
      undefined,
      "Rider has started navigation to the seller/shop pickup location."
    );

    return updated;
  }

  static async confirmArrivedAtPickup(deliveryId: string, riderId: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery || delivery.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or delivery not found.");
    }

    const now = new Date();
    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "ARRIVED_AT_PICKUP",
        arrivedAtPickupAt: now,
      },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "ARRIVED_AT_PICKUP",
      "Rider Arrived at Shop",
      "RIDER",
      riderId,
      undefined,
      "Rider arrived at the pickup location. Awaiting pickup verification."
    );

    return updated;
  }

  static async verifyPickupOtpOrQr(
    deliveryId: string,
    riderId: string,
    options: { otp?: string; qrToken?: string }
  ) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { sellerOrder: true },
    });

    if (!delivery || delivery.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or delivery not found.");
    }

    if (delivery.pickupOtpVerifiedAt) {
      return { success: true, message: "Pickup already verified." };
    }

    let isVerified = false;
    const now = new Date();

    if (options.qrToken) {
      // QR verification with cryptographic signature validation
      try {
        const jwtSecret = process.env.JWT_SECRET_KEY || "atlasbasket_qr_secret";
        const decoded: any = jwt.verify(options.qrToken, jwtSecret);
        if (
          decoded &&
          (decoded.deliveryId === delivery.deliveryNumber || decoded.deliveryId === delivery.id)
        ) {
          isVerified = true;
        }
      } catch (err: any) {
        logger.warn(`[PickupVerification] QR verification failed: ${err?.message}`);
      }
    }

    if (!isVerified && options.otp) {
      // OTP verification
      if (!delivery.pickupOtpHash) {
        throw new Error("No pickup verification code is registered for this delivery.");
      }

      if (delivery.pickupOtpExpiresAt && now > delivery.pickupOtpExpiresAt) {
        throw new Error("Pickup verification code has expired.");
      }

      const match = await bcrypt.compare(options.otp.trim(), delivery.pickupOtpHash);
      if (match) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      await DeliveryDispatchService.recordTimelineEvent(
        deliveryId,
        "PICKUP_VERIFICATION",
        "Pickup Verification Failed",
        "RIDER",
        riderId,
        undefined,
        "Invalid OTP code or QR signature provided at pickup."
      );
      throw new Error("Invalid pickup verification code or QR token.");
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "PICKED_UP",
        pickupOtpVerifiedAt: now,
        actualPickupAt: now,
        pickedUpAt: now,
      },
    });

    // If linked to a marketplace seller order, update seller order status
    if (delivery.sellerOrderId) {
      await prisma.sellerOrder.update({
        where: { id: delivery.sellerOrderId },
        data: { status: "SHIPPED" },
      });
    }

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "PICKED_UP",
      "Order Picked Up Successfully",
      "RIDER",
      riderId,
      undefined,
      "Pickup code verified. Package in custody of rider."
    );

    return updated;
  }

  static async startNavigationToDropoff(deliveryId: string, riderId: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery || delivery.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or delivery not found.");
    }

    const now = new Date();
    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "IN_TRANSIT",
        inTransitAt: now,
      },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "IN_TRANSIT",
      "Out for Delivery",
      "RIDER",
      riderId,
      undefined,
      "Rider has started travel towards customer delivery address."
    );

    return updated;
  }

  static async confirmArrivedAtDropoff(deliveryId: string, riderId: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery || delivery.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or delivery not found.");
    }

    const now = new Date();
    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "ARRIVED_AT_DROPOFF",
        arrivedAtDropoffAt: now,
      },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "ARRIVED_AT_DROPOFF",
      "Rider Arrived at Customer Location",
      "RIDER",
      riderId,
      undefined,
      "Rider reached customer location. Awaiting delivery completion OTP."
    );

    return updated;
  }

  static async verifyDropoffOtp(deliveryId: string, riderId: string, otp: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { deliveryPartner: true },
    });

    if (!delivery || delivery.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or delivery not found.");
    }

    if (delivery.deliveryOtpVerifiedAt) {
      return { success: true, message: "Delivery already completed." };
    }

    const now = new Date();
    if (!delivery.deliveryOtpHash) {
      throw new Error("No delivery verification OTP configured.");
    }

    if (delivery.deliveryOtpExpiresAt && now > delivery.deliveryOtpExpiresAt) {
      throw new Error("Delivery OTP has expired.");
    }

    const isMatch = await bcrypt.compare(otp.trim(), delivery.deliveryOtpHash);
    if (!isMatch) {
      await DeliveryDispatchService.recordTimelineEvent(
        deliveryId,
        "DELIVERY_VERIFICATION",
        "Delivery OTP Failed",
        "RIDER",
        riderId,
        undefined,
        "Incorrect delivery verification OTP entered."
      );
      throw new Error("Incorrect delivery OTP. Please ask customer for correct 6-digit code.");
    }

    // Atomic completion and earnings recording
    const updated = await prisma.$transaction(async (tx) => {
      const completedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "COMPLETED",
          deliveryOtpVerifiedAt: now,
          actualDeliveryAt: now,
          deliveredAt: now,
          completedAt: now,
          payoutStatus: "PENDING", // Ready for rider payout cycle
        },
      });

      // Update rider performance metrics
      await tx.deliveryPartner.update({
        where: { id: riderId },
        data: {
          totalDeliveriesCount: { increment: 1 },
          completedDeliveriesCount: { increment: 1 },
        },
      });

      // Update seller order if applicable
      if (delivery.sellerOrderId) {
        await tx.sellerOrder.update({
          where: { id: delivery.sellerOrderId },
          data: { status: "DELIVERED" },
        });
      }

      return completedDelivery;
    });

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "COMPLETED",
      "Delivery Successfully Completed",
      "RIDER",
      riderId,
      delivery.deliveryPartner
        ? `${delivery.deliveryPartner.firstName} ${delivery.deliveryPartner.lastName}`
        : undefined,
      `Delivery completed. Rider payout of ₹${(updated.riderPayoutPaise / 100).toFixed(
        2
      )} credited to pending earnings.`
    );

    return updated;
  }

  static async cancelDelivery(
    deliveryId: string,
    actorType: "ADMIN" | "RIDER" | "SELLER" | "CUSTOMER",
    actorId: string,
    reason: string
  ) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new Error("Delivery not found.");

    if (delivery.status === "COMPLETED" || delivery.status === "DELIVERED") {
      throw new Error("Cannot cancel an already completed delivery.");
    }

    const now = new Date();

    // Check rider cancellation policy limits
    if (actorType === "RIDER") {
      const settings = await DeliverySettingsService.getEffectiveSettings();
      const maxCancellations = Number(settings.maxMonthlyRiderCancellations || 5);

      const rider = await prisma.deliveryPartner.findUnique({
        where: { id: actorId },
      });

      if (rider && rider.cancelledDeliveriesCount >= maxCancellations) {
        throw new Error(
          `Monthly cancellation limit reached (${maxCancellations} cancellations/month). Please contact admin support.`
        );
      }

      await prisma.deliveryPartner.update({
        where: { id: actorId },
        data: {
          cancelledDeliveriesCount: { increment: 1 },
        },
      });
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: reason,
        cancelledBy: actorType,
      },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      deliveryId,
      "CANCELLED",
      `Delivery Cancelled by ${actorType}`,
      actorType,
      actorId,
      undefined,
      `Reason: ${reason}`
    );

    return updated;
  }
}
