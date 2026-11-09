import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { ExternalShopService } from "../services/externalShop.service.js";
import { DeliveryDispatchService } from "../services/deliveryDispatch.service.js";
import { GoogleMapsService } from "../services/googleMaps.service.js";
import { logger } from "../../../config/logger.js";

export const createExternalShop = async (req: Request, res: Response) => {
  try {
    const shop = await ExternalShopService.createShop(req.body);
    return res.status(201).json({ success: true, shop });
  } catch (err: any) {
    logger.error(`[ExternalShop] Create error: ${err?.message}`);
    return res.status(400).json({ success: false, message: err?.message || "Failed to create shop" });
  }
};

export const listExternalShops = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await ExternalShopService.listShops({ search, status, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to list shops" });
  }
};

export const getExternalShop = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const shop = await ExternalShopService.getShop(id);
    return res.status(200).json({ success: true, shop });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: "Shop not found" });
  }
};

export const updateExternalShop = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updated = await ExternalShopService.updateShop(id, req.body);
    return res.status(200).json({ success: true, shop: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to update shop" });
  }
};

export const requestShopDelivery = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { dropoffAddress, customerName, customerPhone, packageDescription, additionalChargesPaise } = req.body;

    if (!customerName || !customerPhone || !dropoffAddress || !dropoffAddress.addressLine1) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone, and complete delivery address are required.",
      });
    }

    const delivery = await DeliveryDispatchService.createDeliveryForExternalShop({
      externalShopId: id,
      dropoffAddress,
      customerName,
      customerPhone,
      packageDescription,
      additionalChargesPaise,
    });

    return res.status(201).json({
      success: true,
      message: "External shop delivery job created. Nearby riders are being dispatched.",
      delivery,
    });
  } catch (err: any) {
    logger.error(`[ExternalShop] Request delivery error: ${err?.message}`);
    return res.status(400).json({ success: false, message: err?.message || "Failed to create delivery request" });
  }
};

export const trackDelivery = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const delivery = await prisma.delivery.findFirst({
      where: {
        OR: [{ id }, { deliveryNumber: id }],
      },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            vehicleType: true,
            rating: true,
            currentLat: true,
            currentLng: true,
          },
        },
        externalShop: {
          select: { id: true, name: true, category: true, phone: true },
        },
        deliveryTimelineEvents: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!delivery) return res.status(404).json({ message: "Delivery tracking record not found." });

    const pickupLat = Number(delivery.pickupLat || 12.2958);
    const pickupLng = Number(delivery.pickupLng || 76.6394);
    const dropoffLat = Number(delivery.dropoffLat || 12.3106);
    const dropoffLng = Number(delivery.dropoffLng || 76.6548);

    return res.status(200).json({
      success: true,
      tracking: {
        id: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        status: delivery.status,
        distanceKm: Number(delivery.distanceKm || 0),
        estimatedDurationMins: delivery.estimatedDurationMins,
        pickupContactName: delivery.pickupContactName,
        dropoffContactName: delivery.dropoffContactName,
        pickupAddress: delivery.pickupAddressSnapshot,
        dropoffAddress: delivery.deliveryAddressSnapshot,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        assignedRider: delivery.deliveryPartner,
        shop: delivery.externalShop,
        timeline: delivery.deliveryTimelineEvents,
        requestedAt: delivery.requestedAt,
        actualPickupAt: delivery.actualPickupAt,
        actualDeliveryAt: delivery.actualDeliveryAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to track delivery" });
  }
};
