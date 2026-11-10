import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { Prisma } from "@prisma/client";

export interface DeliveryFinancialQuote {
  distanceKm: number;
  baseChargePaise: number;
  distanceChargePaise: number;
  additionalChargePaise: number;
  deliveryFeePaise: number;
  riderPayoutPercentage: number;
  riderPayoutPaise: number;
  platformCommissionPaise: number;
}

export class DeliverySettingsService {
  private static cachedSettings: any = null;
  private static lastCacheTime = 0;
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  static invalidateCache() {
    this.cachedSettings = null;
    this.lastCacheTime = 0;
  }

  static async getEffectiveSettings() {
    const now = Date.now();
    if (this.cachedSettings && now - this.lastCacheTime < this.CACHE_TTL_MS) {
      return this.cachedSettings;
    }

    try {
      let settings = await prisma.deliveryGlobalSetting.findUnique({
        where: { id: 1 },
      });

      if (!settings) {
        settings = await prisma.deliveryGlobalSetting.create({
          data: {
            id: 1,
            brandName: "AtlasBasket Delivery",
            brandLogoUrl: null,
            brandTagline: "Local Delivery Fleet",
            riderPayoutPercentage: new Prisma.Decimal(90.0),
            platformCommissionPercentage: new Prisma.Decimal(10.0),
            baseChargePaise: 3000, // ₹30
            perKmChargePaise: 1000, // ₹10 per km
            minDeliveryChargePaise: 4000, // ₹40
            maxDeliveryRadiusMeters: 25000,
            assignmentTimeoutSeconds: 30,
            searchRadiusMeters: 5000,
            maxAssignmentAttempts: 3,
            maxMonthlyRiderCancellations: 5,
            damagePenaltyPercentage: new Prisma.Decimal(20.0),
            maxStrikesBeforeBan: 3,
            activeCity: "Mysuru",
            activeCities: ["Mysuru"],
            supportedVehicles: ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"],
            isDeliveryServiceEnabled: true,
            heroBadgeText: "Now Launching Across Mysuru City",
            heroHeadingLine1: "Deliver locally.",
            heroHeadingLine2: "Earn directly with every trip.",
            heroDescription: "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
            showCardPayout: true,
            cardPayoutValue: "~90%",
            cardPayoutLabel: "Rider Payout",
            cardPayoutDesc: "Direct earnings share",
            showCardCity: true,
            cardCityValue: "Mysuru",
            cardCityLabel: "Active City",
            cardCityDesc: "Local delivery zones",
            showCardFee: true,
            cardFeeValue: "₹0 Free",
            cardFeeLabel: "Registration Fee",
            cardFeeDesc: "No upfront fees",
            showCardVehicles: true,
            cardVehiclesValue: "Bikes & EVs",
            cardVehiclesLabel: "Vehicles Welcome",
            cardVehiclesDesc: "Bicycles welcome",
          },
        });
      }

      this.cachedSettings = settings;
      this.lastCacheTime = now;
      return settings;
    } catch (err: any) {
      logger.error(`[DeliverySettings] Error fetching settings: ${err?.message}`);
      // Fallback safe defaults if database access is momentarily delayed
      return {
        id: 1,
        brandName: "AtlasBasket Delivery",
        brandLogoUrl: null,
        brandTagline: "Local Delivery Fleet",
        riderPayoutPercentage: 90,
        platformCommissionPercentage: 10,
        baseChargePaise: 3000,
        perKmChargePaise: 1000,
        minDeliveryChargePaise: 4000,
        maxDeliveryRadiusMeters: 25000,
        assignmentTimeoutSeconds: 30,
        searchRadiusMeters: 5000,
        maxAssignmentAttempts: 3,
        maxMonthlyRiderCancellations: 5,
        damagePenaltyPercentage: 20,
        maxStrikesBeforeBan: 3,
        activeCity: "Mysuru",
        activeCities: ["Mysuru"],
        supportedVehicles: ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"],
        isDeliveryServiceEnabled: true,
        heroBadgeText: "Now Launching Across Mysuru City",
        heroHeadingLine1: "Deliver locally.",
        heroHeadingLine2: "Earn directly with every trip.",
        heroDescription: "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
        showCardPayout: true,
        cardPayoutValue: "~90%",
        cardPayoutLabel: "Rider Payout",
        cardPayoutDesc: "Direct earnings share",
        showCardCity: true,
        cardCityValue: "Mysuru",
        cardCityLabel: "Active City",
        cardCityDesc: "Local delivery zones",
        showCardFee: true,
        cardFeeValue: "₹0 Free",
        cardFeeLabel: "Registration Fee",
        cardFeeDesc: "No upfront fees",
        showCardVehicles: true,
        cardVehiclesValue: "Bikes & EVs",
        cardVehiclesLabel: "Vehicles Welcome",
        cardVehiclesDesc: "Bicycles welcome",
      };
    }
  }

  static async updateSettings(
    adminId: string,
    payload: {
      brandName?: string;
      brandLogoUrl?: string | null;
      brandTagline?: string;
      riderPayoutPercentage?: number;
      platformCommissionPercentage?: number;
      baseChargePaise?: number;
      perKmChargePaise?: number;
      minDeliveryChargePaise?: number;
      maxDeliveryRadiusMeters?: number;
      assignmentTimeoutSeconds?: number;
      searchRadiusMeters?: number;
      maxAssignmentAttempts?: number;
      maxMonthlyRiderCancellations?: number;
      damagePenaltyPercentage?: number;
      maxStrikesBeforeBan?: number;
      activeCity?: string;
      activeCities?: string[];
      supportedVehicles?: string[];
      isDeliveryServiceEnabled?: boolean;
      heroBadgeText?: string;
      heroHeadingLine1?: string;
      heroHeadingLine2?: string;
      heroDescription?: string;
      showCardPayout?: boolean;
      cardPayoutValue?: string;
      cardPayoutLabel?: string;
      cardPayoutDesc?: string;
      showCardCity?: boolean;
      cardCityValue?: string;
      cardCityLabel?: string;
      cardCityDesc?: string;
      showCardFee?: boolean;
      cardFeeValue?: string;
      cardFeeLabel?: string;
      cardFeeDesc?: string;
      showCardVehicles?: boolean;
      cardVehiclesValue?: string;
      cardVehiclesLabel?: string;
      cardVehiclesDesc?: string;
    },
    reason = "Admin settings update"
  ) {
    const current = await this.getEffectiveSettings();

    const updateData: any = {
      updatedByAdminId: adminId,
    };

    const auditEntries: Array<{
      adminId: string;
      settingKey: string;
      previousValue: string;
      newValue: string;
      reason: string;
    }> = [];

    for (const [key, val] of Object.entries(payload)) {
      if (typeof val !== "undefined" && val !== null) {
        if (key.includes("Percentage")) {
          updateData[key] = new Prisma.Decimal(Number(val));
        } else {
          updateData[key] = val;
        }

        const prev = String(current[key] ?? "");
        const next = String(val);
        if (prev !== next) {
          auditEntries.push({
            adminId,
            settingKey: key,
            previousValue: prev,
            newValue: next,
            reason,
          });
        }
      }
    }

    // Auto balance platform commission if payout % changed
    if (payload.riderPayoutPercentage && !payload.platformCommissionPercentage) {
      const comm = Math.max(0, 100 - Number(payload.riderPayoutPercentage));
      updateData.platformCommissionPercentage = new Prisma.Decimal(comm);
    }

    const updated = await prisma.deliveryGlobalSetting.update({
      where: { id: 1 },
      data: updateData,
    });

    if (auditEntries.length > 0) {
      await prisma.deliverySettingsAuditLog.createMany({
        data: auditEntries,
      });
    }

    this.invalidateCache();
    logger.info(`[DeliverySettings] Global settings updated by admin: ${adminId}`);
    return updated;
  }

  static async calculateQuote(
    distanceKm: number,
    additionalChargePaise: number = 0
  ): Promise<DeliveryFinancialQuote> {
    const settings = await this.getEffectiveSettings();

    const baseChargePaise = settings.baseChargePaise;
    const perKmChargePaise = settings.perKmChargePaise;
    const minDeliveryChargePaise = settings.minDeliveryChargePaise;
    const riderPayoutPct = Number(settings.riderPayoutPercentage);

    const distanceChargePaise = Math.round(distanceKm * perKmChargePaise);
    const calculatedFee = baseChargePaise + distanceChargePaise + additionalChargePaise;
    const deliveryFeePaise = Math.max(minDeliveryChargePaise, calculatedFee);

    const riderPayoutPaise = Math.round((deliveryFeePaise * riderPayoutPct) / 100);
    const platformCommissionPaise = deliveryFeePaise - riderPayoutPaise;

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      baseChargePaise,
      distanceChargePaise,
      additionalChargePaise,
      deliveryFeePaise,
      riderPayoutPercentage: riderPayoutPct,
      riderPayoutPaise,
      platformCommissionPaise,
    };
  }
}
