import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { GoogleMapsService, haversineDistanceKm } from "./googleMaps.service.js";
import { DeliverySettingsService } from "./deliverySettings.service.js";
import { Prisma } from "@prisma/client";

export class DeliveryDispatchService {
  private static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private static generateQrToken(deliveryId: string, secret: string): string {
    return jwt.sign(
      { deliveryId, purpose: "PICKUP_VERIFICATION", salt: crypto.randomBytes(8).toString("hex") },
      secret,
      { expiresIn: "48h" }
    );
  }

  static async recordTimelineEvent(
    deliveryId: string,
    status: string,
    title: string,
    actorType: "ADMIN" | "RIDER" | "SELLER" | "CUSTOMER" | "SYSTEM" | "EXTERNAL_SHOP",
    actorId?: string,
    actorName?: string,
    description?: string,
    metadata?: any
  ) {
    try {
      await prisma.deliveryTimelineEvent.create({
        data: {
          deliveryId,
          status,
          title,
          actorType,
          actorId: actorId || null,
          actorName: actorName || null,
          description: description || null,
          metadata: metadata || undefined,
          timestamp: new Date(),
        },
      });
    } catch (err: any) {
      logger.warn(`[Timeline] Error logging timeline event: ${err?.message}`);
    }
  }

  static async createDeliveryForMarketplaceOrder(sellerOrderId: string) {
    // Prevent duplicate delivery creation
    const existing = await prisma.delivery.findUnique({
      where: { sellerOrderId },
    });
    if (existing) {
      return existing;
    }

    const sellerOrder = await prisma.sellerOrder.findUnique({
      where: { id: sellerOrderId },
      include: {
        order: { include: { customer: true } },
        seller: true,
        pickupSellerAddress: true,
      },
    });

    if (!sellerOrder) {
      throw new Error("Seller order not found.");
    }

    const pickupAddress = sellerOrder.pickupSellerAddress;
    const dropoffAddress = await prisma.customerAddress.findUnique({
      where: { id: sellerOrder.order.shippingAddressId },
    });

    if (!pickupAddress) {
      throw new Error("Seller pickup address is missing.");
    }
    if (!dropoffAddress) {
      throw new Error("Customer shipping address is missing.");
    }

    const pickupLat = pickupAddress.latitude ? Number(pickupAddress.latitude) : 12.2958;
    const pickupLng = pickupAddress.longitude ? Number(pickupAddress.longitude) : 76.6394;
    const dropoffLat = dropoffAddress.latitude ? Number(dropoffAddress.latitude) : 12.3106;
    const dropoffLng = dropoffAddress.longitude ? Number(dropoffAddress.longitude) : 76.6548;

    const route = await GoogleMapsService.calculateRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: dropoffLat, lng: dropoffLng }
    );

    const financials = await DeliverySettingsService.calculateQuote(route.distanceKm);

    const pickupOtp = this.generateOtp();
    const deliveryOtp = this.generateOtp();
    const pickupOtpHash = await bcrypt.hash(pickupOtp, 8);
    const deliveryOtpHash = await bcrypt.hash(deliveryOtp, 8);

    const jwtSecret = process.env.JWT_SECRET_KEY || "atlasbasket_qr_secret";
    const tempDeliveryNumber = `AB_${Date.now()}`;
    const pickupQrToken = this.generateQrToken(tempDeliveryNumber, jwtSecret);

    const now = new Date();
    const otpExpiry = new Date(now.getTime() + 48 * 3600 * 1000); // 48h validity

    const delivery = await prisma.delivery.create({
      data: {
        deliveryNumber: tempDeliveryNumber,
        sellerOrderId,
        status: "REQUESTED",
        pickupSellerAddressId: pickupAddress.id,
        dropoffCustomerAddressId: dropoffAddress.id,
        pickupAddressSnapshot: pickupAddress as any,
        deliveryAddressSnapshot: dropoffAddress as any,
        pickupContactName: `${sellerOrder.seller.firstName} ${sellerOrder.seller.lastName}`,
        pickupContactPhone: sellerOrder.seller.phone,
        dropoffContactName: `${sellerOrder.order.customer.firstName} ${sellerOrder.order.customer.lastName}`,
        dropoffContactPhone: sellerOrder.order.customer.phone,
        pickupLat: new Prisma.Decimal(pickupLat),
        pickupLng: new Prisma.Decimal(pickupLng),
        dropoffLat: new Prisma.Decimal(dropoffLat),
        dropoffLng: new Prisma.Decimal(dropoffLng),
        distanceKm: new Prisma.Decimal(route.distanceKm),
        estimatedDurationMins: route.durationMins,
        baseChargePaise: financials.baseChargePaise,
        distanceChargePaise: financials.distanceChargePaise,
        additionalChargePaise: financials.additionalChargePaise,
        deliveryFeePaise: financials.deliveryFeePaise,
        riderPayoutPercentage: new Prisma.Decimal(financials.riderPayoutPercentage),
        riderPayoutPaise: financials.riderPayoutPaise,
        platformCommissionPaise: financials.platformCommissionPaise,
        pickupOtpHash,
        pickupOtpExpiresAt: otpExpiry,
        pickupQrToken,
        deliveryOtpHash,
        deliveryOtpExpiresAt: otpExpiry,
        requestedAt: now,
        notes: JSON.stringify({
          pickupOtpPlainForSeller: pickupOtp,
          deliveryOtpPlainForCustomer: deliveryOtp,
          routeSource: route.source,
        }),
      },
    });

    await this.recordTimelineEvent(
      delivery.id,
      "REQUESTED",
      "Delivery Request Created",
      "SELLER",
      sellerOrder.sellerId,
      `${sellerOrder.seller.firstName} ${sellerOrder.seller.lastName}`,
      `Delivery job created from seller order ${sellerOrder.id}. Distance: ${route.distanceKm} km. Fee: ₹${(
        financials.deliveryFeePaise / 100
      ).toFixed(2)}.`
    );

    // Trigger automatic assignment dispatch
    this.dispatchToNextEligibleRider(delivery.id).catch((err) => {
      logger.error(`[Dispatch] Auto-dispatch error: ${err?.message}`);
    });

    return delivery;
  }

  static async createDeliveryForExternalShop(input: {
    externalShopId: string;
    dropoffAddress: {
      addressLine1: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
    };
    customerName: string;
    customerPhone: string;
    packageDescription?: string;
    additionalChargesPaise?: number;
  }) {
    const shop = await prisma.externalDeliveryShop.findUnique({
      where: { id: input.externalShopId },
    });
    if (!shop) throw new Error("External shop not found.");

    const pickupLat = shop.latitude ? Number(shop.latitude) : 12.2958;
    const pickupLng = shop.longitude ? Number(shop.longitude) : 76.6394;
    const dropoffLat = input.dropoffAddress.latitude || 12.3106;
    const dropoffLng = input.dropoffAddress.longitude || 76.6548;

    const route = await GoogleMapsService.calculateRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: dropoffLat, lng: dropoffLng }
    );

    const financials = await DeliverySettingsService.calculateQuote(
      route.distanceKm,
      input.additionalChargesPaise || 0
    );

    const pickupOtp = this.generateOtp();
    const deliveryOtp = this.generateOtp();
    const pickupOtpHash = await bcrypt.hash(pickupOtp, 8);
    const deliveryOtpHash = await bcrypt.hash(deliveryOtp, 8);

    const jwtSecret = process.env.JWT_SECRET_KEY || "atlasbasket_qr_secret";
    const tempDeliveryNumber = `EXT_${Date.now()}`;
    const pickupQrToken = this.generateQrToken(tempDeliveryNumber, jwtSecret);

    const now = new Date();
    const otpExpiry = new Date(now.getTime() + 48 * 3600 * 1000);

    const pickupSnapshot = {
      name: shop.name,
      contactPerson: shop.contactPerson,
      phone: shop.phone,
      addressLine1: shop.addressLine1,
      addressLine2: shop.addressLine2,
      city: shop.city,
      state: shop.state,
      postalCode: shop.postalCode,
      latitude: pickupLat,
      longitude: pickupLng,
    };

    const dropoffSnapshot = {
      name: input.customerName,
      phone: input.customerPhone,
      addressLine1: input.dropoffAddress.addressLine1,
      addressLine2: input.dropoffAddress.addressLine2,
      city: input.dropoffAddress.city || "Mysuru",
      state: input.dropoffAddress.state || "Karnataka",
      postalCode: input.dropoffAddress.postalCode,
      latitude: dropoffLat,
      longitude: dropoffLng,
    };

    const delivery = await prisma.delivery.create({
      data: {
        deliveryNumber: tempDeliveryNumber,
        externalShopId: shop.id,
        status: "REQUESTED",
        pickupAddressSnapshot: pickupSnapshot as any,
        deliveryAddressSnapshot: dropoffSnapshot as any,
        pickupContactName: shop.contactPerson,
        pickupContactPhone: shop.phone,
        dropoffContactName: input.customerName,
        dropoffContactPhone: input.customerPhone,
        pickupLat: new Prisma.Decimal(pickupLat),
        pickupLng: new Prisma.Decimal(pickupLng),
        dropoffLat: new Prisma.Decimal(dropoffLat),
        dropoffLng: new Prisma.Decimal(dropoffLng),
        distanceKm: new Prisma.Decimal(route.distanceKm),
        estimatedDurationMins: route.durationMins,
        baseChargePaise: financials.baseChargePaise,
        distanceChargePaise: financials.distanceChargePaise,
        additionalChargePaise: financials.additionalChargePaise,
        deliveryFeePaise: financials.deliveryFeePaise,
        riderPayoutPercentage: new Prisma.Decimal(financials.riderPayoutPercentage),
        riderPayoutPaise: financials.riderPayoutPaise,
        platformCommissionPaise: financials.platformCommissionPaise,
        pickupOtpHash,
        pickupOtpExpiresAt: otpExpiry,
        pickupQrToken,
        deliveryOtpHash,
        deliveryOtpExpiresAt: otpExpiry,
        requestedAt: now,
        notes: JSON.stringify({
          packageDescription: input.packageDescription,
          pickupOtpPlainForShop: pickupOtp,
          deliveryOtpPlainForCustomer: deliveryOtp,
          routeSource: route.source,
        }),
      },
    });

    await this.recordTimelineEvent(
      delivery.id,
      "REQUESTED",
      "External Shop Delivery Created",
      "SELLER",
      shop.id,
      shop.name,
      `External delivery job requested by ${shop.name}. Distance: ${route.distanceKm} km. Fee: ₹${(
        financials.deliveryFeePaise / 100
      ).toFixed(2)}.`
    );

    this.dispatchToNextEligibleRider(delivery.id).catch((err) => {
      logger.error(`[Dispatch] Auto-dispatch error: ${err?.message}`);
    });

    return delivery;
  }

  static async findEligibleRiders(delivery: any, searchRadiusMeters = 5000) {
    const pickupLat = Number(delivery.pickupLat || 12.2958);
    const pickupLng = Number(delivery.pickupLng || 76.6394);

    // 1. Find all online, approved, active riders
    const candidateRiders = await prisma.deliveryPartner.findMany({
      where: {
        status: "ACTIVE",
        verificationStatus: "APPROVED",
        isAvailable: true,
        currentLat: { not: null },
        currentLng: { not: null },
      },
      include: {
        // Count active deliveries to ensure max 1 active delivery rule
        deliveries: {
          where: {
            status: {
              in: [
                "ASSIGNED",
                "ACCEPTED",
                "ARRIVING_AT_PICKUP",
                "ARRIVED_AT_PICKUP",
                "PICKUP_VERIFICATION",
                "PICKED_UP",
                "IN_TRANSIT",
                "ARRIVED_AT_DROPOFF",
                "DELIVERY_VERIFICATION",
              ],
            },
          },
        },
        assignments: {
          where: {
            deliveryId: delivery.id,
            status: { in: ["REJECTED", "TIMEOUT", "EXPIRED"] },
          },
        },
      },
    });

    // Filter riders who already rejected this specific delivery or currently have active delivery
    const eligibleRiders = candidateRiders.filter((r) => {
      if (r.deliveries.length > 0) return false; // 1 active job per rider rule
      if (r.assignments.length > 0) return false; // Already rejected/timed out on this job
      return true;
    });

    // Calculate distance to pickup for each eligible rider
    const rankedRiders = eligibleRiders
      .map((rider) => {
        const rLat = Number(rider.currentLat);
        const rLng = Number(rider.currentLng);
        const distKm = haversineDistanceKm(
          { lat: rLat, lng: rLng },
          { lat: pickupLat, lng: pickupLng }
        );
        const distMeters = distKm * 1000;

        // Score: lower distance + higher rating
        const rating = rider.rating || 5.0;
        const score = 100 - distKm * 5 + rating * 4;

        return {
          rider,
          distanceMeters: Math.round(distMeters),
          distanceKm: distKm,
          score,
        };
      })
      .filter((r) => r.distanceMeters <= searchRadiusMeters)
      .sort((a, b) => b.score - a.score);

    return rankedRiders;
  }

  static async dispatchToNextEligibleRider(deliveryId: string) {
    const settings = await DeliverySettingsService.getEffectiveSettings();
    const timeoutSeconds = Number(settings.assignmentTimeoutSeconds || 30);
    const searchRadiusMeters = Number(settings.searchRadiusMeters || 5000);
    const maxAttempts = Number(settings.maxAssignmentAttempts || 3);

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { assignments: true },
    });

    if (!delivery) return;

    if (
      delivery.status !== "REQUESTED" &&
      delivery.status !== "SEARCHING_FOR_RIDER" &&
      delivery.status !== "REASSIGNMENT_REQUIRED"
    ) {
      return; // Already assigned or in progress
    }

    const previousAttemptsCount = delivery.assignments.length;
    if (previousAttemptsCount >= maxAttempts) {
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: "REASSIGNMENT_REQUIRED" },
      });
      await this.recordTimelineEvent(
        deliveryId,
        "REASSIGNMENT_REQUIRED",
        "Max Assignment Attempts Reached",
        "SYSTEM",
        undefined,
        undefined,
        `No riders accepted after ${previousAttemptsCount} attempts. Delivery marked for manual admin assignment.`
      );
      return;
    }

    const eligible = await this.findEligibleRiders(delivery, searchRadiusMeters);

    if (eligible.length === 0) {
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: "SEARCHING_FOR_RIDER" },
      });
      await this.recordTimelineEvent(
        deliveryId,
        "SEARCHING_FOR_RIDER",
        "Searching for Nearby Riders",
        "SYSTEM",
        undefined,
        undefined,
        `No available online riders within ${searchRadiusMeters / 1000} km. Will retry automatically.`
      );
      return;
    }

    const chosen = eligible[0];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000);

    // Atomic transaction: create assignment offer and update delivery state
    await prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.create({
        data: {
          deliveryId,
          deliveryPartnerId: chosen.rider.id,
          status: "OFFERED",
          offeredAt: now,
          expiresAt,
        },
      });

      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "OFFERED_TO_RIDER",
          searchStartedAt: delivery.searchStartedAt || now,
          offeredAt: now,
        },
      });
    });

    await this.recordTimelineEvent(
      deliveryId,
      "OFFERED_TO_RIDER",
      "Delivery Offer Sent to Rider",
      "SYSTEM",
      chosen.rider.id,
      `${chosen.rider.firstName} ${chosen.rider.lastName}`,
      `Offer dispatched to rider ${chosen.rider.firstName} (${chosen.distanceKm} km away). Timer: ${timeoutSeconds}s.`
    );

    logger.info(
      `[Dispatch] Delivery ${delivery.deliveryNumber} offered to rider ${chosen.rider.id}. Expires at ${expiresAt.toISOString()}`
    );

    // Schedule automated timeout check
    setTimeout(async () => {
      try {
        await DeliveryDispatchService.checkAssignmentTimeout(deliveryId, chosen.rider.id);
      } catch (err: any) {
        logger.error(`[Dispatch] Timeout handler error: ${err?.message}`);
      }
    }, (timeoutSeconds + 2) * 1000);
  }

  static async checkAssignmentTimeout(deliveryId: string, riderId: string) {
    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        deliveryId,
        deliveryPartnerId: riderId,
        status: "OFFERED",
      },
    });

    if (!assignment) return; // Already accepted or rejected

    if (new Date() >= assignment.expiresAt) {
      await prisma.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "TIMEOUT",
          respondedAt: new Date(),
          rejectionReason: "Acceptance window expired",
        },
      });

      await this.recordTimelineEvent(
        deliveryId,
        "OFFERED_TO_RIDER",
        "Offer Timed Out",
        "SYSTEM",
        riderId,
        undefined,
        "Rider did not accept offer within configured timer. Attempting next eligible rider."
      );

      // Re-trigger dispatch for next candidate
      await this.dispatchToNextEligibleRider(deliveryId);
    }
  }

  static async acceptOffer(deliveryId: string, riderId: string) {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify assignment offer is valid
      const assignment = await tx.deliveryAssignment.findFirst({
        where: {
          deliveryId,
          deliveryPartnerId: riderId,
          status: "OFFERED",
          expiresAt: { gt: now },
        },
      });

      if (!assignment) {
        throw new Error("This delivery offer has expired or is no longer available.");
      }

      // 2. Verify delivery status
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery || delivery.status !== "OFFERED_TO_RIDER") {
        throw new Error("This delivery has already been assigned or cancelled.");
      }

      // 3. Verify rider has no concurrent active delivery
      const activeJob = await tx.delivery.findFirst({
        where: {
          deliveryPartnerId: riderId,
          status: {
            in: [
              "ASSIGNED",
              "ACCEPTED",
              "ARRIVING_AT_PICKUP",
              "ARRIVED_AT_PICKUP",
              "PICKUP_VERIFICATION",
              "PICKED_UP",
              "IN_TRANSIT",
              "ARRIVED_AT_DROPOFF",
              "DELIVERY_VERIFICATION",
            ],
          },
        },
      });

      if (activeJob) {
        throw new Error("You already have an active delivery in progress.");
      }

      // 4. Update assignment
      await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "ACCEPTED",
          respondedAt: now,
        },
      });

      // 5. Update delivery
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "ASSIGNED",
          deliveryPartnerId: riderId,
          assignedAt: now,
          acceptedAt: now,
        },
        include: {
          deliveryPartner: true,
        },
      });

      return updatedDelivery;
    });

    const riderName = result.deliveryPartner
      ? `${result.deliveryPartner.firstName} ${result.deliveryPartner.lastName}`
      : "Rider";

    await this.recordTimelineEvent(
      deliveryId,
      "ASSIGNED",
      "Delivery Offer Accepted",
      "RIDER",
      riderId,
      riderName,
      `Delivery assigned to rider ${riderName}. Navigating to pickup.`
    );

    return result;
  }

  static async rejectOffer(deliveryId: string, riderId: string, reason?: string) {
    const now = new Date();

    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        deliveryId,
        deliveryPartnerId: riderId,
        status: "OFFERED",
      },
    });

    if (assignment) {
      await prisma.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "REJECTED",
          respondedAt: now,
          rejectionReason: reason || "Declined by rider",
        },
      });
    }

    await this.recordTimelineEvent(
      deliveryId,
      "OFFERED_TO_RIDER",
      "Offer Declined by Rider",
      "RIDER",
      riderId,
      undefined,
      `Rider declined offer. Reason: ${reason || "Not specified"}. Searching next rider.`
    );

    // Try next rider
    await this.dispatchToNextEligibleRider(deliveryId);
    return { success: true };
  }

  static async adminManualAssign(deliveryId: string, riderId: string, adminId: string) {
    const now = new Date();

    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
    });
    if (!rider) throw new Error("Rider not found.");
    if (rider.verificationStatus !== "APPROVED") {
      throw new Error("Cannot assign to unapproved rider.");
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new Error("Delivery not found.");

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "ASSIGNED",
        deliveryPartnerId: riderId,
        assignedAt: now,
        acceptedAt: now,
      },
    });

    await this.recordTimelineEvent(
      deliveryId,
      "ASSIGNED",
      "Manual Rider Assignment by Admin",
      "ADMIN",
      adminId,
      "Administrator",
      `Admin assigned delivery to rider ${rider.firstName} ${rider.lastName}.`
    );

    return updated;
  }
}
