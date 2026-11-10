import express from "express";
import { deliveryPartnerAuth } from "../../../middleware/deliveryPartnerAuth.js";
import {
  registerRider,
  loginRider,
  googleLoginRider,
  logoutRider,
  getMe,
  updateProfile,
  getPublicProfile,
} from "../controllers/riderAuthController.js";
import {
  getDashboard,
  setAvailability,
  updateLocation,
  getEarnings,
  getHistory,
} from "../controllers/riderDashboardController.js";
import {
  getOffers,
  acceptOffer,
  rejectOffer,
  getActiveDelivery,
  getDeliveryById,
  startPickupNavigation,
  arrivedAtPickup,
  verifyPickup,
  startDropoffNavigation,
  arrivedAtDropoff,
  verifyDropoff,
  cancelJob,
  getTimeline,
} from "../controllers/riderDeliveryController.js";
import { DeliverySettingsService } from "../services/deliverySettings.service.js";
import { DeliveryIncidentService } from "../services/deliveryIncident.service.js";
import { prisma } from "../../../config/prisma.js";

const router = express.Router();

// ─── Public Rider Endpoints ────────────────────────────────────────────────────
router.post("/api/delivery/auth/register", registerRider);
router.post("/api/delivery/auth/login", loginRider);
router.post("/api/delivery/auth/google", googleLoginRider);
router.post("/api/delivery/auth/logout", logoutRider);
router.get("/api/delivery/riders/:id/public", getPublicProfile);

// Dynamic Operational Districts (Strictly from Database enabled by Admin)
router.get("/api/delivery/districts", async (req, res) => {
  try {
    const districts = await prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, state: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({
      success: true,
      districts: districts.map((d) => ({
        id: d.id,
        name: d.name,
        state: d.state,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch operational districts" });
  }
});

router.get("/api/delivery/settings/public", async (req, res) => {
  try {
    const settings = await DeliverySettingsService.getEffectiveSettings();

    // Query active districts directly from DB enabled by Admin
    const activeCitiesFromDb = await prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, state: true },
      orderBy: { name: "asc" },
    });
    const activeDistrictNames = activeCitiesFromDb.map((c) => c.name);

    const dynamicCityCardValue =
      settings.cardCityValue && settings.cardCityValue !== "Mysuru"
        ? settings.cardCityValue
        : activeDistrictNames.length === 1
        ? activeDistrictNames[0]
        : activeDistrictNames.length > 1
        ? `${activeDistrictNames.length} Districts`
        : "No active zones";

    const dynamicCityCardDesc =
      settings.cardCityDesc && settings.cardCityDesc !== "Local delivery zones"
        ? settings.cardCityDesc
        : activeDistrictNames.length > 0
        ? activeDistrictNames.slice(0, 3).join(", ")
        : "Pending admin enablement";

    const dynamicHeroBadge =
      settings.heroBadgeText && !settings.heroBadgeText.includes("Mysuru")
        ? settings.heroBadgeText
        : activeDistrictNames.length > 0
        ? `Now Live across ${activeDistrictNames.slice(0, 2).join(", ")}${
            activeDistrictNames.length > 2 ? ` & ${activeDistrictNames.length - 2} more` : ""
          }`
        : "Local Delivery Network";

    return res.status(200).json({
      success: true,
      settings: {
        brandName: settings.brandName || "AtlasBasket Delivery",
        brandLogoUrl: settings.brandLogoUrl || null,
        brandTagline: settings.brandTagline || "Local Delivery Fleet",
        riderPayoutPercentage: Number(settings.riderPayoutPercentage),
        baseChargePaise: settings.baseChargePaise,
        perKmChargePaise: settings.perKmChargePaise,
        minDeliveryChargePaise: settings.minDeliveryChargePaise,
        activeCity: activeDistrictNames[0] || null,
        activeCities: activeDistrictNames,
        activeDistrictCount: activeDistrictNames.length,
        supportedVehicles: settings.supportedVehicles,
        isDeliveryServiceEnabled: settings.isDeliveryServiceEnabled,
        hero: {
          badge: dynamicHeroBadge,
          line1: settings.heroHeadingLine1 || "Deliver locally.",
          line2: settings.heroHeadingLine2 || "Earn directly with every trip.",
          description:
            settings.heroDescription ||
            "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in admin-approved operational districts. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
        },
        cards: {
          payout: {
            show: settings.showCardPayout ?? true,
            value: settings.cardPayoutValue || `~${Number(settings.riderPayoutPercentage)}%`,
            label: settings.cardPayoutLabel || "Rider Payout",
            desc: settings.cardPayoutDesc || "Direct earnings share",
          },
          city: {
            show: settings.showCardCity ?? true,
            value: dynamicCityCardValue,
            label: settings.cardCityLabel || "Active Districts",
            desc: dynamicCityCardDesc,
          },
          fee: {
            show: settings.showCardFee ?? true,
            value: settings.cardFeeValue || "₹0 Free",
            label: settings.cardFeeLabel || "Registration Fee",
            desc: settings.cardFeeDesc || "No upfront fees",
          },
          vehicles: {
            show: settings.showCardVehicles ?? true,
            value: settings.cardVehiclesValue || "Bikes & EVs",
            label: settings.cardVehiclesLabel || "Vehicles Welcome",
            desc: settings.cardVehiclesDesc || "Bicycles welcome",
          },
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch delivery settings" });
  }
});

// ─── Authenticated Rider Endpoints ─────────────────────────────────────────────
router.get("/api/delivery/riders/me", deliveryPartnerAuth, getMe);
router.put("/api/delivery/riders/me", deliveryPartnerAuth, updateProfile);
router.patch("/api/delivery/riders/me", deliveryPartnerAuth, updateProfile);
router.get("/api/delivery/dashboard", deliveryPartnerAuth, getDashboard);
router.post("/api/delivery/availability", deliveryPartnerAuth, setAvailability);
router.post("/api/delivery/location", deliveryPartnerAuth, updateLocation);
router.get("/api/delivery/earnings", deliveryPartnerAuth, getEarnings);
router.get("/api/delivery/history", deliveryPartnerAuth, getHistory);

// Offers & Active Workflow
router.get("/api/delivery/offers", deliveryPartnerAuth, getOffers);
router.post("/api/delivery/jobs/:id/accept", deliveryPartnerAuth, acceptOffer);
router.post("/api/delivery/jobs/:id/reject", deliveryPartnerAuth, rejectOffer);
router.get("/api/delivery/jobs/active", deliveryPartnerAuth, getActiveDelivery);
router.get("/api/delivery/jobs/:id", deliveryPartnerAuth, getDeliveryById);
router.post("/api/delivery/jobs/:id/start-pickup", deliveryPartnerAuth, startPickupNavigation);
router.post("/api/delivery/jobs/:id/arrived-pickup", deliveryPartnerAuth, arrivedAtPickup);
router.post("/api/delivery/jobs/:id/verify-pickup", deliveryPartnerAuth, verifyPickup);
router.post("/api/delivery/jobs/:id/start-dropoff", deliveryPartnerAuth, startDropoffNavigation);
router.post("/api/delivery/jobs/:id/arrived-dropoff", deliveryPartnerAuth, arrivedAtDropoff);
router.post("/api/delivery/jobs/:id/verify-dropoff", deliveryPartnerAuth, verifyDropoff);
router.post("/api/delivery/jobs/:id/cancel", deliveryPartnerAuth, cancelJob);
router.get("/api/delivery/jobs/:id/timeline", deliveryPartnerAuth, getTimeline);

// Ratings & Incidents
router.post("/api/delivery/jobs/:id/incident", deliveryPartnerAuth, async (req, res) => {
  try {
    const riderId = req.deliveryPartnerId!;
    const id = String(req.params.id);
    const { incidentType, description, evidenceUrls } = req.body;
    const incident = await DeliveryIncidentService.reportIncident({
      deliveryId: id,
      reporterType: "ADMIN",
      reporterId: riderId,
      incidentType,
      description,
      evidenceUrls,
    });
    return res.status(201).json({ success: true, incident });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message });
  }
});

router.post("/api/delivery/incidents/:id/response", deliveryPartnerAuth, async (req, res) => {
  try {
    const riderId = req.deliveryPartnerId!;
    const id = String(req.params.id);
    const { response } = req.body;
    const updated = await DeliveryIncidentService.submitRiderResponse(id, riderId, response);
    return res.status(200).json({ success: true, incident: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message });
  }
});

router.post("/api/delivery/strikes/:id/appeal", deliveryPartnerAuth, async (req, res) => {
  try {
    const riderId = req.deliveryPartnerId!;
    const id = String(req.params.id);
    const { appealNotes } = req.body;
    const updated = await DeliveryIncidentService.appealStrike(id, riderId, appealNotes);
    return res.status(200).json({ success: true, strike: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message });
  }
});

// Support Conversations (Rider - Admin Live Support Chat)
router.get("/api/delivery/conversations", deliveryPartnerAuth, async (req, res) => {
  try {
    const riderId = req.deliveryPartnerId!;
    const conversations = await prisma.conversation.findMany({
      where: { deliveryPartnerId: riderId },
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return res.status(200).json({ success: true, conversations });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

router.post("/api/delivery/conversations", deliveryPartnerAuth, async (req, res) => {
  try {
    const riderId = req.deliveryPartnerId!;
    const { subject, initialMessage, deliveryId } = req.body;

    const conv = await prisma.$transaction(async (tx) => {
      const newConv = await tx.conversation.create({
        data: {
          type: "DELIVERY_ADMIN" as any,
          deliveryPartnerId: riderId,
          subject: subject || "Delivery Support Inquiry",
          relatedEntityType: deliveryId ? "DELIVERY" : undefined,
          relatedEntityId: deliveryId || undefined,
          status: "OPEN",
        },
      });

      if (initialMessage) {
        const rider = await tx.deliveryPartner.findUnique({ where: { id: riderId } });
        await tx.conversationMessage.create({
          data: {
            conversationId: newConv.id,
            senderType: "DELIVERY_PARTNER" as any,
            senderId: riderId,
            senderName: rider ? `${rider.firstName} ${rider.lastName}` : "Rider",
            message: initialMessage,
          },
        });
      }

      return newConv;
    });

    return res.status(201).json({ success: true, conversation: conv });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message });
  }
});

router.get("/api/delivery/conversations/:id/messages", deliveryPartnerAuth, async (req, res) => {
  try {
    const riderId = req.deliveryPartnerId!;
    const id = String(req.params.id);

    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.deliveryPartnerId !== riderId) {
      return res.status(403).json({ message: "Unauthorized for this conversation" });
    }

    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId: id, isInternal: false },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ success: true, messages });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

export default router;
