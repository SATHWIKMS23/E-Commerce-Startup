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
            supportedVehicles: ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"],
            isDeliveryServiceEnabled: true,
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
        supportedVehicles: ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"],
        isDeliveryServiceEnabled: true,
      };
    }
  }

  static async updateSettings(
    adminId: string,
    payload: {
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
      supportedVehicles?: string[];
      isDeliveryServiceEnabled?: boolean;
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
    return updated;
  }

  static async calculateQuote(
    distanceKm: number,
    additionalChargesPaise = 0
  ): Promise<DeliveryFinancialQuote> {
    const settings = await this.getEffectiveSettings();

    const baseChargePaise = Number(settings.baseChargePaise || 3000);
    const perKmChargePaise = Number(settings.perKmChargePaise || 1000);
    const minDeliveryChargePaise = Number(
      settings.minDeliveryChargePaise || 4000
    );
    const riderPayoutPercentage = Number(
      settings.riderPayoutPercentage || 90.0
    );

    const distanceChargePaise = Math.round(distanceKm * perKmChargePaise);
    const calculatedFee = baseChargePaise + distanceChargePaise;
    const finalDeliveryFeePaise =
      Math.max(minDeliveryChargePaise, calculatedFee) + additionalChargesPaise;

    const riderPayoutPaise = Math.round(
      (finalDeliveryFeePaise * riderPayoutPercentage) / 100
    );
    const platformCommissionPaise = finalDeliveryFeePaise - riderPayoutPaise;

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      baseChargePaise,
      distanceChargePaise,
      additionalChargePaise: additionalChargesPaise,
      deliveryFeePaise: finalDeliveryFeePaise,
      riderPayoutPercentage,
      riderPayoutPaise,
      platformCommissionPaise,
    };
  }
}
