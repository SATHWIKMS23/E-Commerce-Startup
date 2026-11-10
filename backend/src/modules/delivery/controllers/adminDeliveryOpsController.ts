import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { DeliverySettingsService } from "../services/deliverySettings.service.js";
import { RiderAuthService } from "../services/riderAuth.service.js";
import { DeliveryDispatchService } from "../services/deliveryDispatch.service.js";
import { DeliveryExecutionService } from "../services/deliveryExecution.service.js";
import { DeliveryPayoutService } from "../services/deliveryPayout.service.js";
import { DeliveryIncidentService } from "../services/deliveryIncident.service.js";
import { logger } from "../../../config/logger.js";

export const getOverviewStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalRiders,
      approvedRiders,
      pendingVerifications,
      onlineRiders,
      activeDeliveries,
      unassignedDeliveries,
      completedToday,
      totalCompleted,
      activeIncidents,
      revenueResult,
    ] = await Promise.all([
      prisma.deliveryPartner.count(),
      prisma.deliveryPartner.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.deliveryPartner.count({ where: { verificationStatus: "PENDING" } }),
      prisma.deliveryPartner.count({ where: { isAvailable: true, verificationStatus: "APPROVED" } }),
      prisma.delivery.count({
        where: {
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
      }),
      prisma.delivery.count({
        where: {
          status: { in: ["REQUESTED", "SEARCHING_FOR_RIDER", "REASSIGNMENT_REQUIRED"] },
        },
      }),
      prisma.delivery.count({
        where: { status: "COMPLETED", completedAt: { gte: today } },
      }),
      prisma.delivery.count({ where: { status: "COMPLETED" } }),
      prisma.deliveryIncident.count({ where: { status: { in: ["REPORTED", "UNDER_INVESTIGATION"] } } }),
      prisma.delivery.aggregate({
        where: { status: "COMPLETED" },
        _sum: { deliveryFeePaise: true, riderPayoutPaise: true, platformCommissionPaise: true },
      }),
    ]);

    const globalSettings = await DeliverySettingsService.getEffectiveSettings();

    return res.status(200).json({
      success: true,
      stats: {
        totalRiders,
        approvedRiders,
        pendingVerifications,
        onlineRiders,
        activeDeliveries,
        unassignedDeliveries,
        completedToday,
        totalCompleted,
        activeIncidents,
        totalRevenuePaise: revenueResult._sum.deliveryFeePaise || 0,
        totalRiderPayoutPaise: revenueResult._sum.riderPayoutPaise || 0,
        totalPlatformCommissionPaise: revenueResult._sum.platformCommissionPaise || 0,
      },
      settings: globalSettings,
    });
  } catch (err: any) {
    logger.error(`[AdminDeliveryStats] Error: ${err?.message}`);
    return res.status(500).json({ message: "Failed to fetch delivery stats" });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await DeliverySettingsService.getEffectiveSettings();
    return res.status(200).json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const { reason, ...payload } = req.body;

    const updated = await DeliverySettingsService.updateSettings(
      adminId,
      payload,
      reason || "Settings updated from Admin Panel"
    );

    return res.status(200).json({
      success: true,
      message: "Delivery settings updated successfully.",
      settings: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to update settings" });
  }
};

export const getSettingsAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.deliverySettingsAuditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    return res.status(200).json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

export const listRiders = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { status, verificationStatus, isAvailable, search } = req.query;

    const where: any = {};
    if (status) where.status = String(status) as any;
    if (verificationStatus) where.verificationStatus = String(verificationStatus) as any;
    if (typeof isAvailable !== "undefined") {
      where.isAvailable = isAvailable === "true";
    }
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
        { phone: { contains: String(search) } },
        { email: { contains: String(search), mode: "insensitive" } },
        { vehicleNumber: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [total, riders] = await Promise.all([
      prisma.deliveryPartner.count({ where }),
      prisma.deliveryPartner.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          documents: { where: { isDeleted: false } },
          _count: {
            select: { deliveries: true, strikes: true, incidents: true },
          },
        },
      }),
    ]);

    const sanitized = riders.map((r) => RiderAuthService.sanitizeRiderProfile(r));

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      riders: sanitized,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to list riders" });
  }
};

export const getRiderDetail = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id },
      include: {
        documents: true,
        strikes: { orderBy: { createdAt: "desc" } },
        incidents: { orderBy: { createdAt: "desc" } },
        payouts: { orderBy: { createdAt: "desc" }, take: 10 },
        deliveries: { orderBy: { createdAt: "desc" }, take: 15 },
      },
    });

    if (!rider) return res.status(404).json({ message: "Rider not found" });

    return res.status(200).json({
      success: true,
      rider: RiderAuthService.sanitizeRiderProfile(rider),
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch rider detail" });
  }
};

export const verifyRider = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const decision = req.body.decision || req.body.status;
    const rejectionReason = req.body.rejectionReason || req.body.reason;
    const documentApprovals = req.body.documentApprovals;

    if (decision !== "APPROVED" && decision !== "REJECTED" && decision !== "ACTION_REQUIRED") {
      return res.status(400).json({ message: "Invalid decision. Must be APPROVED, REJECTED, or ACTION_REQUIRED." });
    }

    if (decision === "REJECTED" && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required." });
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const rider = await tx.deliveryPartner.update({
        where: { id },
        data: {
          verificationStatus: decision,
          rejectionReason: decision === "REJECTED" || decision === "ACTION_REQUIRED" ? rejectionReason : null,
          verifiedByAdminId: adminId,
          approvedAt: decision === "APPROVED" ? now : null,
          status: decision === "APPROVED" ? "ACTIVE" : undefined,
        },
      });

      // Update document records
      if (documentApprovals && Array.isArray(documentApprovals)) {
        for (const doc of documentApprovals) {
          if (doc.id && doc.status) {
            await tx.riderDocument.update({
              where: { id: doc.id },
              data: {
                status: doc.status,
                rejectionReason: doc.rejectionReason || null,
                verifiedByAdminId: adminId,
                verifiedAt: now,
              },
            });
          }
        }
      }

      await tx.deliverySettingsAuditLog.create({
        data: {
          adminId,
          settingKey: `RIDER_VERIFICATION_${id}`,
          previousValue: "PENDING",
          newValue: decision,
          reason: rejectionReason || `Rider ${decision.toLowerCase()} by administrator`,
        },
      });

      return rider;
    });

    return res.status(200).json({
      success: true,
      message: `Rider ${decision.toLowerCase()} successfully.`,
      rider: RiderAuthService.sanitizeRiderProfile(updated),
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Verification failed" });
  }
};

export const updateRiderStatus = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const { status, reason } = req.body;

    if (status !== "ACTIVE" && status !== "SUSPENDED" && status !== "BANNED" && status !== "INACTIVE") {
      return res.status(400).json({ message: "Status must be ACTIVE, SUSPENDED, BANNED, or INACTIVE." });
    }

    const isSuspendedOrBanned = status === "SUSPENDED" || status === "BANNED";

    const updated = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        status: status === "BANNED" ? "SUSPENDED" : status,
        verificationStatus: status === "BANNED" ? "BANNED" : status === "SUSPENDED" ? "SUSPENDED" : status === "ACTIVE" ? "APPROVED" : undefined,
        isAvailable: isSuspendedOrBanned ? false : undefined,
      },
    });

    await prisma.deliverySettingsAuditLog.create({
      data: {
        adminId,
        settingKey: `RIDER_STATUS_${id}`,
        previousValue: "PREVIOUS",
        newValue: status,
        reason: reason || "Status changed by administrator",
      },
    });

    return res.status(200).json({ success: true, rider: RiderAuthService.sanitizeRiderProfile(updated) });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to update status" });
  }
};

export const issueRiderStrike = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const { reason, severity, incidentId } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Strike reason is required." });
    }

    const rider = await prisma.deliveryPartner.findUnique({
      where: { id },
      include: {
        strikes: { where: { isRevoked: false } },
      },
    });

    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const currentStrikesCount = rider.strikes.length;
    const newStrikeNumber = currentStrikesCount + 1;
    const settings = await DeliverySettingsService.getEffectiveSettings();
    const maxStrikes = Number(settings.maxStrikesBeforeBan || 3);

    const formattedReason = severity ? `[${severity}] ${reason.trim()}` : reason.trim();

    const strike = await prisma.riderStrike.create({
      data: {
        deliveryPartnerId: id,
        incidentId: incidentId || null,
        strikeNumber: newStrikeNumber,
        reason: formattedReason,
        issuedByAdminId: adminId,
      },
    });

    const shouldSuspend = newStrikeNumber >= maxStrikes;

    const updatedRider = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        strikeCount: newStrikeNumber,
        status: shouldSuspend ? "SUSPENDED" : undefined,
        verificationStatus: shouldSuspend ? "SUSPENDED" : undefined,
        isAvailable: shouldSuspend ? false : undefined,
      },
    });

    await prisma.deliverySettingsAuditLog.create({
      data: {
        adminId,
        settingKey: `RIDER_STRIKE_${id}`,
        previousValue: `${currentStrikesCount} strikes`,
        newValue: `Strike #${newStrikeNumber}: ${formattedReason}`,
        reason: shouldSuspend ? `Auto-suspended: reached ${newStrikeNumber}/${maxStrikes} strikes` : formattedReason,
      },
    });

    return res.status(200).json({
      success: true,
      message: shouldSuspend
        ? `Strike #${newStrikeNumber} issued. Rider has reached ${maxStrikes} strikes and has been suspended.`
        : `Strike #${newStrikeNumber} issued to rider.`,
      strike,
      rider: RiderAuthService.sanitizeRiderProfile(updatedRider),
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to issue strike" });
  }
};

export const revokeRiderStrike = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const strikeId = String(req.params.id);
    const { reason } = req.body;

    const strike = await prisma.riderStrike.findUnique({
      where: { id: strikeId },
    });

    if (!strike) return res.status(404).json({ message: "Strike not found" });

    const now = new Date();
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

    const activeStrikes = await prisma.riderStrike.count({
      where: {
        deliveryPartnerId: strike.deliveryPartnerId,
        isRevoked: false,
      },
    });

    const settings = await DeliverySettingsService.getEffectiveSettings();
    const maxStrikes = Number(settings.maxStrikesBeforeBan || 3);
    const shouldReinstate = activeStrikes < maxStrikes;

    const updatedRider = await prisma.deliveryPartner.update({
      where: { id: strike.deliveryPartnerId },
      data: {
        strikeCount: activeStrikes,
        status: shouldReinstate ? "ACTIVE" : undefined,
        verificationStatus: shouldReinstate ? "APPROVED" : undefined,
      },
    });

    await prisma.deliverySettingsAuditLog.create({
      data: {
        adminId,
        settingKey: `RIDER_STRIKE_REVOKED_${strike.deliveryPartnerId}`,
        previousValue: `Strike #${strike.strikeNumber}`,
        newValue: "REVOKED",
        reason: reason || "Strike revoked by administrator",
      },
    });

    return res.status(200).json({
      success: true,
      message: shouldReinstate
        ? "Strike revoked. Rider reinstated to active status."
        : "Strike revoked.",
      rider: RiderAuthService.sanitizeRiderProfile(updatedRider),
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to revoke strike" });
  }
};

export const verifyRiderDocument = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const documentId = String(req.params.id);
    const { status, rejectionReason } = req.body;

    if (status !== "APPROVED" && status !== "REJECTED" && status !== "PENDING") {
      return res.status(400).json({ message: "Status must be APPROVED, REJECTED, or PENDING" });
    }

    const doc = await prisma.riderDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        verifiedByAdminId: adminId,
        verifiedAt: new Date(),
      },
    });

    return res.status(200).json({ success: true, message: `Document marked as ${status}.`, document: doc });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to update document" });
  }
};

export const deleteRiderAadhaar = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);

    const result = await RiderAuthService.deleteAadhaarDocument(adminId, id);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to delete document" });
  }
};

export const listJobs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const { status, search, riderId } = req.query;

    const where: any = {};
    if (status) where.status = String(status) as any;
    if (riderId) where.deliveryPartnerId = String(riderId);
    if (search) {
      where.OR = [
        { deliveryNumber: { contains: String(search), mode: "insensitive" } },
        { pickupContactName: { contains: String(search), mode: "insensitive" } },
        { dropoffContactName: { contains: String(search), mode: "insensitive" } },
        { dropoffContactPhone: { contains: String(search) } },
      ];
    }

    const [total, deliveries] = await Promise.all([
      prisma.delivery.count({ where }),
      prisma.delivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          deliveryPartner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              vehicleType: true,
              rating: true,
            },
          },
          externalShop: { select: { id: true, name: true, category: true } },
          ratings: true,
          incidents: true,
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
    return res.status(500).json({ message: "Failed to list deliveries" });
  }
};

export const getJobDetail = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            vehicleType: true,
            vehicleNumber: true,
            avatarUrl: true,
            rating: true,
            currentLat: true,
            currentLng: true,
          },
        },
        externalShop: true,
        deliveryTimelineEvents: {
          orderBy: { timestamp: "asc" },
        },
        assignments: {
          orderBy: { offeredAt: "asc" },
          include: {
            deliveryPartner: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
        ratings: true,
        incidents: true,
      },
    });

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    return res.status(200).json({ success: true, delivery });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch delivery detail" });
  }
};

export const manualAssignRider = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const riderId = req.body.riderId || req.body.deliveryPartnerId;

    if (!riderId) return res.status(400).json({ message: "riderId required" });

    const delivery = await DeliveryDispatchService.adminManualAssign(id, riderId, adminId);
    return res.status(200).json({ success: true, message: "Rider assigned manually.", delivery });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Manual assignment failed" });
  }
};

export const adminCancelDelivery = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const { reason } = req.body;

    const delivery = await DeliveryExecutionService.cancelDelivery(
      id,
      "ADMIN",
      adminId,
      reason || "Cancelled by administrator"
    );

    return res.status(200).json({ success: true, message: "Delivery cancelled by admin.", delivery });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to cancel delivery" });
  }
};

export const getPayoutOverview = async (req: Request, res: Response) => {
  try {
    const overview = await DeliveryPayoutService.getAdminPayoutOverview();
    return res.status(200).json({ success: true, ...overview });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch payout overview" });
  }
};

export const processPayout = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const { riderId, paymentReference, paymentMethod, notes } = req.body;

    if (!riderId || !paymentReference) {
      return res.status(400).json({ message: "riderId and paymentReference are required" });
    }

    const payout = await DeliveryPayoutService.processPayout(
      adminId,
      riderId,
      paymentReference,
      paymentMethod || "UPI",
      notes
    );

    return res.status(200).json({
      success: true,
      message: `Payout of ₹${(payout.netAmountPaise / 100).toFixed(2)} marked as PAID.`,
      payout,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to process payout" });
  }
};

export const listIncidents = async (req: Request, res: Response) => {
  try {
    const incidents = await prisma.deliveryIncident.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        delivery: {
          select: {
            deliveryNumber: true,
            status: true,
            deliveryFeePaise: true,
            riderPayoutPaise: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            strikeCount: true,
          },
        },
      },
    });

    return res.status(200).json({ success: true, incidents });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to list incidents" });
  }
};

export const resolveIncident = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const rawDecision = req.body.decision || req.body.status;
    const decision = rawDecision === "CONFIRMED" ? "CONFIRMED" : rawDecision === "DISMISSED" ? "DISMISSED" : "CONFIRMED";
    const adminNotes = req.body.adminNotes || req.body.resolutionNotes || "Resolved by administrator";
    const applyPenalty = typeof req.body.applyPenalty !== "undefined" ? Boolean(req.body.applyPenalty) : Boolean(req.body.faultPenaltyPaise);
    const issueStrike = typeof req.body.issueStrike !== "undefined" ? Boolean(req.body.issueStrike) : true;

    const resolved = await DeliveryIncidentService.resolveIncidentByAdmin({
      incidentId: id,
      adminId,
      decision,
      adminNotes,
      applyPenalty,
      issueStrike,
    });

    return res.status(200).json({
      success: true,
      message: `Incident resolved: ${decision}.`,
      incident: resolved,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to resolve incident" });
  }
};

export const reviewStrikeAppeal = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId || "admin";
    const id = String(req.params.id);
    const approved = typeof req.body.approved !== "undefined"
      ? Boolean(req.body.approved)
      : req.body.decision === "OVERTURNED" || req.body.decision === "APPROVED";
    const notes = req.body.notes || req.body.reviewNotes;

    const result = await DeliveryIncidentService.reviewAppealByAdmin(
      id,
      adminId,
      approved,
      notes
    );

    return res.status(200).json({
      success: true,
      message: approved ? "Strike successfully revoked." : "Appeal rejected.",
      result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Failed to review appeal" });
  }
};

export const getRiderConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { type: "DELIVERY_ADMIN" as any },
      orderBy: { lastMessageAt: "desc" },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            verificationStatus: true,
            isAvailable: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return res.status(200).json({ success: true, conversations });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to list rider conversations" });
  }
};
