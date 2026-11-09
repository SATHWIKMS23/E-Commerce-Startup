import { prisma } from "../../../config/prisma.js";
import { GoogleMapsService } from "./googleMaps.service.js";
import { Prisma } from "@prisma/client";

export class ExternalShopService {
  static async createShop(input: {
    name: string;
    category: string;
    contactPerson: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    pricingAgreementNotes?: string;
  }) {
    let lat = input.latitude;
    let lng = input.longitude;

    if (!lat || !lng) {
      const fullAddress = `${input.addressLine1}, ${input.city || "Mysuru"}`;
      const geo = await GoogleMapsService.geocodeAddress(fullAddress, input.city || "Mysuru");
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      } else {
        // Center of Mysuru
        lat = 12.2958;
        lng = 76.6394;
      }
    }

    const shop = await prisma.externalDeliveryShop.create({
      data: {
        name: input.name,
        category: input.category,
        contactPerson: input.contactPerson,
        phone: input.phone.trim(),
        email: input.email || null,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city || "Mysuru",
        state: input.state || "Karnataka",
        postalCode: input.postalCode || "570001",
        latitude: new Prisma.Decimal(lat),
        longitude: new Prisma.Decimal(lng),
        status: "ACTIVE",
        pricingAgreementNotes: input.pricingAgreementNotes || null,
      },
    });

    return shop;
  }

  static async listShops(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, params?.limit || 20);
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search } },
        { contactPerson: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, shops] = await Promise.all([
      prisma.externalDeliveryShop.count({ where }),
      prisma.externalDeliveryShop.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
      }),
    ]);

    return { total, page, limit, shops };
  }

  static async getShop(id: string) {
    const shop = await prisma.externalDeliveryShop.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!shop) throw new Error("Shop not found.");
    return shop;
  }

  static async updateShop(
    id: string,
    data: {
      name?: string;
      category?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      status?: string;
      pricingAgreementNotes?: string;
    }
  ) {
    const updated = await prisma.externalDeliveryShop.update({
      where: { id },
      data,
    });
    return updated;
  }
}
