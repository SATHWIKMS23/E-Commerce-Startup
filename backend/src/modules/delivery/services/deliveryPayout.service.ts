import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";

export class DeliveryPayoutService {
  static async getRiderEarningsSummary(riderId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedDeliveries = await prisma.delivery.findMany({
      where: {
        deliveryPartnerId: riderId,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
    });

    let todayPaise = 0;
    let weeklyPaise = 0;
    let monthlyPaise = 0;
    let totalLifetimePaise = 0;
    let pendingPayoutPaise = 0;

    for (const d of completedDeliveries) {
      const payout = d.riderPayoutPaise || 0;
      totalLifetimePaise += payout;

      if (d.payoutStatus === "PENDING") {
        pendingPayoutPaise += payout;
      }

      if (d.completedAt) {
        const completedTime = new Date(d.completedAt).getTime();
        if (completedTime >= startOfToday.getTime()) {
          todayPaise += payout;
        }
        if (completedTime >= startOfWeek.getTime()) {
          weeklyPaise += payout;
        }
        if (completedTime >= startOfMonth.getTime()) {
          monthlyPaise += payout;
        }
      }
    }

    const payoutsHistory = await prisma.riderPayout.findMany({
      where: { deliveryPartnerId: riderId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      todayEarningsPaise: todayPaise,
      weeklyEarningsPaise: weeklyPaise,
      monthlyEarningsPaise: monthlyPaise,
      totalLifetimePaise: totalLifetimePaise,
      pendingPayoutPaise: pendingPayoutPaise,
      completedTripsCount: completedDeliveries.length,
      recentDeliveries: completedDeliveries.slice(0, 30).map((d) => ({
        id: d.id,
        deliveryNumber: d.deliveryNumber,
        completedAt: d.completedAt,
        distanceKm: Number(d.distanceKm || 0),
        totalDeliveryFeePaise: d.deliveryFeePaise,
        riderPayoutPercentage: Number(d.riderPayoutPercentage),
        riderPayoutPaise: d.riderPayoutPaise,
        payoutStatus: d.payoutStatus,
      })),
      payoutHistory: payoutsHistory,
    };
  }

  static async getAdminPayoutOverview() {
    // Group pending completed deliveries by rider
    const pendingDeliveries = await prisma.delivery.findMany({
      where: {
        status: "COMPLETED",
        payoutStatus: "PENDING",
        deliveryPartnerId: { not: null },
      },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankIfsc: true,
            upiId: true,
          },
        },
      },
    });

    const riderMap = new Map<string, any>();

    for (const d of pendingDeliveries) {
      if (!d.deliveryPartnerId || !d.deliveryPartner) continue;
      const rId = d.deliveryPartnerId;
      if (!riderMap.has(rId)) {
        riderMap.set(rId, {
          rider: d.deliveryPartner,
          pendingDeliveriesCount: 0,
          pendingAmountPaise: 0,
          deliveryIds: [],
        });
      }
      const entry = riderMap.get(rId);
      entry.pendingDeliveriesCount += 1;
      entry.pendingAmountPaise += d.riderPayoutPaise || 0;
      entry.deliveryIds.push(d.id);
    }

    const payoutsList = await prisma.riderPayout.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            upiId: true,
            bankAccountNumber: true,
            bankIfsc: true,
          },
        },
      },
      take: 50,
    });

    return {
      pendingRiders: Array.from(riderMap.values()),
      recentPayouts: payoutsList,
    };
  }

  static async processPayout(
    adminId: string,
    riderId: string,
    paymentReference: string,
    paymentMethod: "UPI" | "BANK_TRANSFER" = "UPI",
    notes?: string
  ) {
    if (!paymentReference || paymentReference.trim().length < 3) {
      throw new Error("Valid transaction UTR or payment reference is required.");
    }

    const pendingDeliveries = await prisma.delivery.findMany({
      where: {
        deliveryPartnerId: riderId,
        status: "COMPLETED",
        payoutStatus: "PENDING",
      },
    });

    if (pendingDeliveries.length === 0) {
      throw new Error("No pending payout balance found for this rider.");
    }

    const now = new Date();
    const grossAmountPaise = pendingDeliveries.reduce(
      (sum, d) => sum + (d.riderPayoutPaise || 0),
      0
    );

    const deliveryIds = pendingDeliveries.map((d) => d.id);

    const payout = await prisma.$transaction(async (tx) => {
      // 1. Create RiderPayout record
      const record = await tx.riderPayout.create({
        data: {
          deliveryPartnerId: riderId,
          periodStart: pendingDeliveries[pendingDeliveries.length - 1].createdAt,
          periodEnd: now,
          totalDeliveriesCount: pendingDeliveries.length,
          grossAmountPaise,
          deductionsPaise: 0,
          netAmountPaise: grossAmountPaise,
          status: "PAID",
          paymentReference: paymentReference.trim(),
          paymentMethod,
          approvedByAdminId: adminId,
          approvedAt: now,
          paidAt: now,
          notes: notes || `Settled ${pendingDeliveries.length} deliveries`,
        },
      });

      // 2. Mark deliveries as PAID
      await tx.delivery.updateMany({
        where: { id: { in: deliveryIds } },
        data: { payoutStatus: "PAID" },
      });

      // 3. Audit log
      await tx.deliverySettingsAuditLog.create({
        data: {
          adminId,
          settingKey: `RIDER_PAYOUT_SETTLED_${record.id}`,
          previousValue: "PENDING",
          newValue: `PAID_INR_${(grossAmountPaise / 100).toFixed(2)}`,
          reason: `Payout settled. Ref: ${paymentReference}`,
        },
      });

      return record;
    });

    logger.info(
      `[Payout] Admin ${adminId} marked payout ${payout.id} (₹${(
        grossAmountPaise / 100
      ).toFixed(2)}) as PAID for rider ${riderId}`
    );

    return payout;
  }
}
