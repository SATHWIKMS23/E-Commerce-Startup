import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { Prisma } from "@prisma/client";

export class RiderAvailabilityService {
  static async toggleAvailability(riderId: string, isAvailable: boolean) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error("Rider not found.");
    }

    if (isAvailable) {
      // Must be approved by admin
      if (rider.verificationStatus !== "APPROVED") {
        throw new Error(
          `Cannot go online. Verification status is '${rider.verificationStatus}'. Admin approval is required.`
        );
      }

      if (rider.status !== "ACTIVE") {
        throw new Error(
          `Account is currently ${rider.status.toLowerCase()}. You cannot receive delivery offers.`
        );
      }
    } else {
      // If going offline, check if rider has an ongoing active delivery
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
      });

      if (activeDelivery) {
        // We still allow going offline for future offers, but keep delivery active
        logger.info(
          `[RiderAvailability] Rider ${riderId} going offline with active delivery ${activeDelivery.deliveryNumber}`
        );
      }
    }

    const updated = await prisma.deliveryPartner.update({
      where: { id: riderId },
      data: { isAvailable },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isAvailable: true,
        verificationStatus: true,
        currentLat: true,
        currentLng: true,
      },
    });

    return updated;
  }

  static async updateLocation(
    riderId: string,
    lat: number,
    lng: number,
    accuracyMeters?: number
  ) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        isAvailable: true,
        verificationStatus: true,
      },
    });

    if (!rider) {
      throw new Error("Rider not found.");
    }

    // Update rider's current coordinates
    const updated = await prisma.deliveryPartner.update({
      where: { id: riderId },
      data: {
        currentLat: new Prisma.Decimal(lat),
        currentLng: new Prisma.Decimal(lng),
        lastLocationUpdatedAt: new Date(),
      },
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        lastLocationUpdatedAt: true,
      },
    });

    return updated;
  }
}
