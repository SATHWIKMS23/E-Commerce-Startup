import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { DeliveryDispatchService } from "../services/deliveryDispatch.service.js";
import { DeliveryExecutionService } from "../services/deliveryExecution.service.js";
import { GoogleMapsService } from "../services/googleMaps.service.js";
import { DeliveryIncidentService } from "../services/deliveryIncident.service.js";
import { logger } from "../../../config/logger.js";

export const getOffers = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const offers = await prisma.deliveryAssignment.findMany({
      where: {
        deliveryPartnerId: riderId,
        status: "OFFERED",
        expiresAt: { gt: new Date() },
      },
      include: {
        delivery: {
          include: {
            externalShop: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: { offeredAt: "desc" },
    });

    const formatted = offers.map((o) => {
      const now = Date.now();
      const expiresAtMs = new Date(o.expiresAt).getTime();
      const remainingSeconds = Math.max(0, Math.round((expiresAtMs - now) / 1000));

      return {
        assignmentId: o.id,
        deliveryId: o.delivery.id,
        deliveryNumber: o.delivery.deliveryNumber,
        distanceKm: Number(o.delivery.distanceKm || 0),
        estimatedDurationMins: o.delivery.estimatedDurationMins || 15,
        riderPayoutPaise: o.delivery.riderPayoutPaise,
        totalDeliveryFeePaise: o.delivery.deliveryFeePaise,
        pickupAddress: o.delivery.pickupAddressSnapshot,
        dropoffAddress: o.delivery.deliveryAddressSnapshot,
        remainingSeconds,
        offeredAt: o.offeredAt,
        expiresAt: o.expiresAt,
      };
    });

    return res.status(200).json({ success: true, offers: formatted });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch offers" });
  }
};

export const acceptOffer = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const delivery = await DeliveryDispatchService.acceptOffer(id, riderId);

    return res.status(200).json({
      success: true,
      message: "Delivery accepted! Proceed to pickup location.",
      delivery,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to accept offer" });
  }
};

export const rejectOffer = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const { reason } = req.body;

    await DeliveryDispatchService.rejectOffer(id, riderId, reason);
    return res.status(200).json({ success: true, message: "Delivery offer declined." });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to decline offer" });
  }
};

export const getActiveDelivery = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const delivery = await prisma.delivery.findFirst({
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
      include: {
        externalShop: true,
        deliveryTimelineEvents: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!delivery) {
      return res.status(200).json({ success: true, activeDelivery: null });
    }

    // Include external Google navigation URLs
    const pickupLat = Number(delivery.pickupLat || 12.2958);
    const pickupLng = Number(delivery.pickupLng || 76.6394);
    const dropoffLat = Number(delivery.dropoffLat || 12.3106);
    const dropoffLng = Number(delivery.dropoffLng || 76.6548);

    const pickupNavUrl = GoogleMapsService.getNavigationUrl({ lat: pickupLat, lng: pickupLng });
    const dropoffNavUrl = GoogleMapsService.getNavigationUrl({ lat: dropoffLat, lng: dropoffLng });

    return res.status(200).json({
      success: true,
      activeDelivery: {
        ...delivery,
        pickupNavUrl,
        dropoffNavUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch active delivery" });
  }
};

export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            vehicleType: true,
            avatarUrl: true,
            rating: true,
          },
        },
        externalShop: true,
        deliveryTimelineEvents: {
          orderBy: { timestamp: "asc" },
        },
        ratings: true,
      },
    });

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const pickupLat = Number(delivery.pickupLat || 12.2958);
    const pickupLng = Number(delivery.pickupLng || 76.6394);
    const dropoffLat = Number(delivery.dropoffLat || 12.3106);
    const dropoffLng = Number(delivery.dropoffLng || 76.6548);

    return res.status(200).json({
      success: true,
      delivery: {
        ...delivery,
        pickupNavUrl: GoogleMapsService.getNavigationUrl({ lat: pickupLat, lng: pickupLng }),
        dropoffNavUrl: GoogleMapsService.getNavigationUrl({ lat: dropoffLat, lng: dropoffLng }),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch delivery" });
  }
};

export const startPickupNavigation = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const updated = await DeliveryExecutionService.startNavigationToPickup(id, riderId);
    return res.status(200).json({ success: true, delivery: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Operation failed" });
  }
};

export const arrivedAtPickup = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const updated = await DeliveryExecutionService.confirmArrivedAtPickup(id, riderId);
    return res.status(200).json({ success: true, delivery: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Operation failed" });
  }
};

export const verifyPickup = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const { otp, qrToken } = req.body;

    const updated = await DeliveryExecutionService.verifyPickupOtpOrQr(id, riderId, { otp, qrToken });
    return res.status(200).json({
      success: true,
      message: "Pickup verified successfully! Start delivery to customer.",
      delivery: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Verification failed" });
  }
};

export const startDropoffNavigation = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const updated = await DeliveryExecutionService.startNavigationToDropoff(id, riderId);
    return res.status(200).json({ success: true, delivery: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Operation failed" });
  }
};

export const arrivedAtDropoff = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const updated = await DeliveryExecutionService.confirmArrivedAtDropoff(id, riderId);
    return res.status(200).json({ success: true, delivery: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Operation failed" });
  }
};

export const verifyDropoff = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "Delivery OTP is required." });

    const updated = await DeliveryExecutionService.verifyDropoffOtp(id, riderId, otp);
    return res.status(200).json({
      success: true,
      message: "Delivery verified and completed! Your earnings have been credited.",
      delivery: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Delivery verification failed" });
  }
};

export const cancelJob = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const { reason } = req.body;

    const updated = await DeliveryExecutionService.cancelDelivery(id, "RIDER", riderId, reason || "Cancelled by rider");
    return res.status(200).json({ success: true, message: "Delivery cancelled.", delivery: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to cancel delivery" });
  }
};

export const getTimeline = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const events = await prisma.deliveryTimelineEvent.findMany({
      where: { deliveryId: id },
      orderBy: { timestamp: "asc" },
    });
    return res.status(200).json({ success: true, timeline: events });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch timeline" });
  }
};
