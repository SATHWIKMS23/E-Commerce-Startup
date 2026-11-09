import { prisma } from "../../../config/prisma.js";
import { DeliveryDispatchService } from "./deliveryDispatch.service.js";
import { logger } from "../../../config/logger.js";

export class DeliveryService {
  static getProvider() {
    return {
      name: "ATLASBASKET_FLEET",
      estimatePrice: async () => ({ amount: 40, currency: "INR" }),
      createBooking: async () => ({ providerOrderId: `dly_${Date.now()}` }),
      trackBooking: async () => ({ status: "IN_TRANSIT" }),
      cancelBooking: async (id: string) => ({ status: "CANCELLED" }),
    };
  }

  static async calculateShares(deliveryCost: number, customerShare = 75, sellerShare = 25) {
    const customerAmount = Math.round((deliveryCost * customerShare) / 100);
    const sellerAmount = deliveryCost - customerAmount;
    return {
      deliveryCost,
      customerDeliveryShare: customerAmount,
      sellerDeliveryShare: sellerAmount,
      customerSharePercent: customerShare,
      sellerSharePercent: sellerShare,
    };
  }

  static async assignDriver(deliveryId: string, driver: any) {
    const driverId = typeof driver === "string" ? driver : driver?.id || driver?.deliveryPartnerId;
    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        deliveryPartnerId: driverId || undefined,
        status: "ASSIGNED",
        assignedAt: new Date(),
        notes: typeof driver === "object" ? JSON.stringify({ manualDriver: driver }) : undefined,
      },
    });
  }

  static async updateStatus(deliveryId: string, status: any, notes?: string) {
    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status,
        notes: notes ? JSON.stringify({ notes }) : undefined,
      },
    });
  }

  static async trackDeliveryById(deliveryId: string) {
    return prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliveryPartner: true,
        deliveryTimelineEvents: true,
      },
    });
  }

  static async createDeliveryForSellerOrder(sellerOrderId: string) {
    // Check if delivery already exists
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
      throw new Error("Seller order not found");
    }

    if (sellerOrder.deliveryMode === "SELF") {
      throw new Error("Cannot create platform delivery booking for self delivery orders.");
    }

    if (sellerOrder.status !== "READY_FOR_PICKUP" && sellerOrder.status !== "PACKED") {
      throw new Error("Seller order not ready for pickup");
    }

    logger.info(`[DeliveryService] Creating local fleet delivery for seller order ${sellerOrderId}`);
    const delivery = await DeliveryDispatchService.createDeliveryForMarketplaceOrder(sellerOrderId);

    return delivery;
  }
}

export default DeliveryService;
