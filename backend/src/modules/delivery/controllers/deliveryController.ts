import type { Request, Response } from "express";
import DeliveryService from "../services/delivery.service.js";
import { prisma } from "../../../config/prisma.js";
import { getObjectUrl, isValidS3Key, headObjectExists } from '../../../config/storage.js';

export const createDelivery = async (req: Request, res: Response) => {
  try {
    const { sellerOrderId } = req.body;
    if (!sellerOrderId) return res.status(400).json({ message: "sellerOrderId is required" });

    const sellerOrder = await prisma.sellerOrder.findUnique({ where: { id: sellerOrderId } });
    if (!sellerOrder) return res.status(404).json({ message: "Seller order not found" });

    // ownership validated at seller endpoints; for admin/customer we allow if authorized elsewhere
    const delivery = await DeliveryService.createDeliveryForSellerOrder(sellerOrderId);
    return res.status(201).json({ delivery });
  } catch (err: any) {
    console.error("CREATE DELIVERY ERROR:", err);
    return res.status(400).json({ message: err.message || "Failed to create delivery" });
  }
};

export const cancelDelivery = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ message: "Delivery id required" });

    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // cancel provider booking if present (provider metadata stored in notes)
    try {
      const notes = delivery.notes ? JSON.parse(delivery.notes) : {};
      const providerOrderId = notes.providerOrderId || null;
      if (providerOrderId) {
        const Provider = (await import("../services/delivery.service.js")).default.getProvider();
        await Provider.cancelBooking(providerOrderId).catch(() => null);
      }
    } catch (e) {}

    const updated = await prisma.delivery.update({ where: { id }, data: { status: "CANCELLED", failedAt: new Date() } });
    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: id, status: "CANCELLED", title: "Delivery Cancelled", description: "Cancelled by system or admin" } });
    return res.status(200).json({ delivery: updated });
  } catch (err) {
    console.error("CANCEL DELIVERY ERROR:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDelivery = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ message: "Delivery id required" });

    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string;
    const where: any = {};
    if (status) where.status = status;
    const deliveries = await prisma.delivery.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } });
    return res.status(200).json({ count: deliveries.length, deliveries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const trackDelivery = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ message: "Delivery id required" });

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { sellerOrder: { include: { order: true } } }
    });

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const isAuthorized =
      req.adminId ||
      (req.customerId && delivery.sellerOrder?.order.customerId === req.customerId) ||
      (req.sellerId && delivery.sellerOrder?.sellerId === req.sellerId) ||
      (req.deliveryPartnerId && delivery.deliveryPartnerId === req.deliveryPartnerId);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await DeliveryService.trackDeliveryById(id);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("TRACK DELIVERY ERROR:", err);
    return res.status(400).json({ message: err.message || "Failed to track" });
  }
};

export const assignDeliveryPartner = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, phone, vehicleNumber } = req.body;
    if (!id || !name || !phone) return res.status(400).json({ message: "Missing fields" });
    const driver = { name, phone, vehicleNumber };
    const delivery = await DeliveryService.assignDriver(id, driver);
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    if (!id || !status) return res.status(400).json({ message: "Missing fields" });
    const delivery = await DeliveryService.updateStatus(id, status);
    return res.status(200).json({ delivery });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || "Failed to update status" });
  }
};

export const markPickedUp = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ message: "deliveryId required" });
    const delivery = await DeliveryService.updateStatus(deliveryId, "PICKED_UP");
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markOutForDelivery = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ message: "deliveryId required" });
    const delivery = await DeliveryService.updateStatus(deliveryId, "OUT_FOR_DELIVERY");
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markDelivered = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ message: "deliveryId required" });
    const delivery = await DeliveryService.updateStatus(deliveryId, "DELIVERED");
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const uploadDeliveryProof = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.body;
    let proofImage = req.body.proofImage || null;
    if (!deliveryId || !proofImage) return res.status(400).json({ message: "deliveryId and proofImage required" });

    if (isValidS3Key(proofImage)) {
      const exists = await headObjectExists(proofImage);
      if (!exists) return res.status(400).json({ message: `S3 object not found for ${proofImage}` });
      if (proofImage.startsWith('uploads/')) proofImage = getObjectUrl(proofImage);
    }

    // create a DeliveryProof record and update delivery timestamps/status
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    const dp = await prisma.deliveryProof.create({ data: { deliveryId, deliveryPartnerId: delivery.deliveryPartnerId || 'system', proofType: 'DELIVERY', imageUrl: proofImage } });
    const updated = await prisma.delivery.update({ where: { id: deliveryId }, data: { status: 'DELIVERED', actualDeliveryAt: new Date(), completedAt: new Date() } });
    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: deliveryId, status: "DELIVERED", title: "Delivery Proof Uploaded", description: "Proof uploaded by delivery partner", metadata: { proofImage } } });
    return res.status(200).json({ delivery: updated, proof: dp });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDeliveryTimeline = async (req: Request, res: Response) => {
  try {
    const deliveryId = req.params.id as string;
    if (!deliveryId) return res.status(400).json({ message: "delivery id required" });

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { sellerOrder: { include: { order: true } } }
    });

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const isAuthorized =
      req.adminId ||
      (req.customerId && delivery.sellerOrder?.order.customerId === req.customerId) ||
      (req.sellerId && delivery.sellerOrder?.sellerId === req.sellerId) ||
      (req.deliveryPartnerId && delivery.deliveryPartnerId === req.deliveryPartnerId);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const events = await prisma.orderTimelineEvent.findMany({ where: { deliveryId }, orderBy: { occurredAt: "asc" } });
    return res.status(200).json({ events });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const calculateDeliveryCharge = async (req: Request, res: Response) => {
  try {
    const { deliveryCost } = req.body;
    if (typeof deliveryCost === "undefined") return res.status(400).json({ message: "deliveryCost required" });
    const shares = await DeliveryService.calculateShares(Number(deliveryCost));
    return res.status(200).json({ shares });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
