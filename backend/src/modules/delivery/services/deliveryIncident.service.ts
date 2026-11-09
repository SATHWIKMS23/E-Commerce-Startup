import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { DeliverySettingsService } from "./deliverySettings.service.js";
import { DeliveryDispatchService } from "./deliveryDispatch.service.js";
import { Prisma } from "@prisma/client";

export class DeliveryIncidentService {
  static async submitRating(input: {
    deliveryId: string;
    raterType: "CUSTOMER" | "SELLER" | "EXTERNAL_SHOP";
    raterId: string;
    raterName?: string;
    rating: number;
    review?: string;
    tags?: string[];
  }) {
    if (input.rating < 1 || input.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: input.deliveryId },
      include: { deliveryPartner: true },
    });

    if (!delivery || !delivery.deliveryPartnerId) {
      throw new Error("Delivery or assigned rider not found.");
    }

    if (delivery.status !== "COMPLETED" && delivery.status !== "DELIVERED") {
      throw new Error("Ratings can only be submitted for completed deliveries.");
    }

    // Upsert rating (one rating per rater per delivery)
    const ratingRecord = await prisma.deliveryRating.upsert({
      where: {
        deliveryId_raterType_raterId: {
          deliveryId: input.deliveryId,
          raterType: input.raterType,
          raterId: input.raterId,
        },
      },
      update: {
        rating: input.rating,
        review: input.review || null,
        tags: input.tags || [],
      },
      create: {
        deliveryId: input.deliveryId,
        deliveryPartnerId: delivery.deliveryPartnerId,
        raterType: input.raterType,
        raterId: input.raterId,
        raterName: input.raterName || null,
        rating: input.rating,
        review: input.review || null,
        tags: input.tags || [],
      },
    });

    // Recalculate rider overall rating
    const allRatings = await prisma.deliveryRating.findMany({
      where: { deliveryPartnerId: delivery.deliveryPartnerId },
      select: { rating: true },
    });

    const totalRatings = allRatings.length;
    const avgRating =
      totalRatings > 0
        ? Math.round(
            (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10
          ) / 10
        : 5.0;

    await prisma.deliveryPartner.update({
      where: { id: delivery.deliveryPartnerId },
      data: {
        rating: avgRating,
        totalRatings,
      },
    });

    return ratingRecord;
  }

  static async reportIncident(input: {
    deliveryId: string;
    reporterType: "CUSTOMER" | "SELLER" | "EXTERNAL_SHOP" | "ADMIN";
    reporterId: string;
    reporterName?: string;
    incidentType: "ITEM_DAMAGED" | "WRONG_DELIVERY" | "RUDE_BEHAVIOR" | "LATE" | "THEFT" | "OTHER";
    description: string;
    evidenceUrls?: string[];
  }) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: input.deliveryId },
    });

    if (!delivery || !delivery.deliveryPartnerId) {
      throw new Error("Delivery or assigned rider not found.");
    }

    const incident = await prisma.deliveryIncident.create({
      data: {
        deliveryId: input.deliveryId,
        deliveryPartnerId: delivery.deliveryPartnerId,
        reporterType: input.reporterType,
        reporterId: input.reporterId,
        reporterName: input.reporterName || null,
        incidentType: input.incidentType,
        description: input.description,
        evidenceUrls: input.evidenceUrls || [],
        status: "REPORTED",
      },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      input.deliveryId,
      "DISPUTED",
      `Incident Reported: ${input.incidentType}`,
      input.reporterType,
      input.reporterId,
      input.reporterName,
      `Reported incident: ${input.description}. Awaiting Admin review.`
    );

    return incident;
  }

  static async submitRiderResponse(incidentId: string, riderId: string, response: string) {
    const incident = await prisma.deliveryIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.deliveryPartnerId !== riderId) {
      throw new Error("Unauthorized or incident not found.");
    }

    const updated = await prisma.deliveryIncident.update({
      where: { id: incidentId },
      data: {
        riderResponse: response,
        riderRespondedAt: new Date(),
        status: "UNDER_INVESTIGATION",
      },
    });

    return updated;
  }

  static async resolveIncidentByAdmin(input: {
    incidentId: string;
    adminId: string;
    decision: "CONFIRMED" | "DISMISSED";
    adminNotes: string;
    applyPenalty?: boolean;
    issueStrike?: boolean;
  }) {
    const incident = await prisma.deliveryIncident.findUnique({
      where: { id: input.incidentId },
      include: { delivery: true, deliveryPartner: true },
    });

    if (!incident) throw new Error("Incident not found.");

    const now = new Date();
    const settings = await DeliverySettingsService.getEffectiveSettings();

    if (input.decision === "DISMISSED") {
      const updated = await prisma.deliveryIncident.update({
        where: { id: input.incidentId },
        data: {
          status: "DISMISSED",
          adminDecision: "DISMISSED",
          adminNotes: input.adminNotes,
          decidedAt: now,
          decidedByAdminId: input.adminId,
        },
      });
      return updated;
    }

    // Decision: CONFIRMED
    let payoutAdjustmentPaise = 0;
    const penaltyPct = Number(settings.damagePenaltyPercentage || 20.0);

    if (input.applyPenalty && incident.delivery) {
      // Reduce payout to 20% (deduction = 80%) under confirmed damage policy
      const originalPayout = incident.delivery.riderPayoutPaise;
      const reducedPayout = Math.round((originalPayout * penaltyPct) / 100);
      payoutAdjustmentPaise = originalPayout - reducedPayout;

      await prisma.delivery.update({
        where: { id: incident.deliveryId },
        data: {
          riderPayoutPaise: reducedPayout,
          notes: JSON.stringify({
            incidentPenaltyApplied: true,
            originalPayoutPaise: originalPayout,
            reducedPayoutPaise: reducedPayout,
            incidentId: incident.id,
          }),
        },
      });
    }

    let strikeIssued = false;
    if (input.issueStrike) {
      const currentStrikesCount = await prisma.riderStrike.count({
        where: {
          deliveryPartnerId: incident.deliveryPartnerId,
          isRevoked: false,
        },
      });

      const newStrikeNumber = currentStrikesCount + 1;

      await prisma.riderStrike.create({
        data: {
          deliveryPartnerId: incident.deliveryPartnerId,
          incidentId: incident.id,
          strikeNumber: newStrikeNumber,
          reason: `Incident ${incident.incidentType} confirmed by Admin: ${input.adminNotes}`,
          issuedByAdminId: input.adminId,
        },
      });

      strikeIssued = true;

      // Update rider strike counter
      const maxStrikes = Number(settings.maxStrikesBeforeBan || 3);
      if (newStrikeNumber >= maxStrikes) {
        // Auto suspend / ban rider after 3 strikes
        await prisma.deliveryPartner.update({
          where: { id: incident.deliveryPartnerId },
          data: {
            strikeCount: newStrikeNumber,
            status: "SUSPENDED",
            verificationStatus: "SUSPENDED",
            isAvailable: false,
          },
        });
        logger.warn(
          `[StrikePolicy] Rider ${incident.deliveryPartnerId} suspended due to ${newStrikeNumber} strikes.`
        );
      } else {
        await prisma.deliveryPartner.update({
          where: { id: incident.deliveryPartnerId },
          data: { strikeCount: newStrikeNumber },
        });
      }
    }

    const updated = await prisma.deliveryIncident.update({
      where: { id: input.incidentId },
      data: {
        status: "CONFIRMED",
        adminDecision: "PENALTY_APPLIED",
        adminNotes: input.adminNotes,
        penaltyPercentage: new Prisma.Decimal(penaltyPct),
        payoutAdjustmentPaise,
        strikeIssued,
        decidedAt: now,
        decidedByAdminId: input.adminId,
      },
    });

    await DeliveryDispatchService.recordTimelineEvent(
      incident.deliveryId,
      "DISPUTED",
      "Incident Resolved by Admin",
      "ADMIN",
      input.adminId,
      "Administrator",
      `Admin decision: CONFIRMED. Penalty: ${input.applyPenalty ? `payout reduced to ${penaltyPct}%` : "None"}. Strike issued: ${strikeIssued ? "Yes" : "No"}.`
    );

    return updated;
  }

  static async appealStrike(strikeId: string, riderId: string, appealNotes: string) {
    const strike = await prisma.riderStrike.findUnique({
      where: { id: strikeId },
    });

    if (!strike || strike.deliveryPartnerId !== riderId) {
      throw new Error("Strike not found or unauthorized.");
    }

    const updated = await prisma.riderStrike.update({
      where: { id: strikeId },
      data: {
        isAppealed: true,
        appealNotes,
        appealStatus: "PENDING",
      },
    });

    return updated;
  }

  static async reviewAppealByAdmin(
    strikeId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ) {
    const strike = await prisma.riderStrike.findUnique({
      where: { id: strikeId },
    });
    if (!strike) throw new Error("Strike not found.");

    const now = new Date();

    if (approved) {
      // Revoke strike
      await prisma.riderStrike.update({
        where: { id: strikeId },
        data: {
          isRevoked: true,
          revokedAt: now,
          appealStatus: "APPROVED",
          appealDecidedByAdminId: adminId,
          appealDecidedAt: now,
        },
      });

      // Recalculate active strikes
      const activeStrikes = await prisma.riderStrike.count({
        where: {
          deliveryPartnerId: strike.deliveryPartnerId,
          isRevoked: false,
        },
      });

      await prisma.deliveryPartner.update({
        where: { id: strike.deliveryPartnerId },
        data: {
          strikeCount: activeStrikes,
          status: activeStrikes < 3 ? "ACTIVE" : "SUSPENDED",
        },
      });
    } else {
      await prisma.riderStrike.update({
        where: { id: strikeId },
        data: {
          appealStatus: "REJECTED",
          appealDecidedByAdminId: adminId,
          appealDecidedAt: now,
        },
      });
    }

    return { success: true };
  }
}
