import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { RiderAvailabilityService } from "../services/riderAvailability.service.js";
import { DeliveryPayoutService } from "../services/deliveryPayout.service.js";
import { logger } from "../../../config/logger.js";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        vehicleType: true,
        vehicleNumber: true,
        status: true,
        verificationStatus: true,
        isAvailable: true,
        rating: true,
        totalRatings: true,
        totalDeliveriesCount: true,
        completedDeliveriesCount: true,
        strikeCount: true,
      },
    });

    if (!rider) return res.status(404).json({ message: "Rider not found" });

    // Active delivery
    const activeDelivery = await prisma.delivery.findFirst({
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
      },
    });

    // Earnings
    const earnings = await DeliveryPayoutService.getRiderEarningsSummary(riderId);

    // Pending offers
    const pendingOffer = await prisma.deliveryAssignment.findFirst({
      where: {
        deliveryPartnerId: riderId,
        status: "OFFERED",
        expiresAt: { gt: new Date() },
      },
      include: {
        delivery: true,
      },
      orderBy: { offeredAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      rider,
      activeDelivery,
      pendingOffer,
      earnings: {
        todayPaise: earnings.todayEarningsPaise,
        weeklyPaise: earnings.weeklyEarningsPaise,
        monthlyPaise: earnings.monthlyEarningsPaise,
        pendingPayoutPaise: earnings.pendingPayoutPaise,
        totalCompletedTrips: earnings.completedTripsCount,
      },
    });
  } catch (err: any) {
    logger.error(`[Dashboard] Error: ${err?.message}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const setAvailability = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable boolean required" });
    }

    const updated = await RiderAvailabilityService.toggleAvailability(riderId, isAvailable);
    return res.status(200).json({ success: true, rider: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to update availability" });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const latitude = typeof req.body.lat === "number" ? req.body.lat : req.body.latitude;
    const longitude = typeof req.body.lng === "number" ? req.body.lng : req.body.longitude;
    const accuracy = req.body.accuracy;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ message: "Valid latitude and longitude required" });
    }

    const updated = await RiderAvailabilityService.updateLocation(riderId, latitude, longitude, accuracy);
    return res.status(200).json({ success: true, location: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to update location" });
  }
};

export const getEarnings = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const summary = await DeliveryPayoutService.getRiderEarningsSummary(riderId);
    return res.status(200).json({ success: true, earnings: summary });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch earnings" });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const [total, deliveries] = await Promise.all([
      prisma.delivery.count({ where: { deliveryPartnerId: riderId } }),
      prisma.delivery.findMany({
        where: { deliveryPartnerId: riderId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          ratings: true,
          externalShop: { select: { name: true, category: true } },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      deliveries,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch history" });
  }
};
