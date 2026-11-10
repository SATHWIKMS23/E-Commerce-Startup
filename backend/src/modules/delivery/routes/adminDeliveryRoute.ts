import express from "express";
import {
  getAllDeliveries,
  getDelivery,
  cancelDelivery,
  reassignDelivery,
  deliveryAnalytics,
  getLiveDeliveries,
  changeDeliveryShare,
} from "../controllers/adminDeliveryController.js";
import {
  getOverviewStats,
  getSettings,
  updateSettings,
  getSettingsAuditLogs,
  listRiders,
  getRiderDetail,
  verifyRider,
  updateRiderStatus,
  deleteRiderAadhaar,
  issueRiderStrike,
  revokeRiderStrike,
  verifyRiderDocument,
  listJobs,
  getJobDetail,
  manualAssignRider,
  adminCancelDelivery,
  getPayoutOverview,
  processPayout,
  listIncidents,
  resolveIncident,
  reviewStrikeAppeal,
  getRiderConversations,
} from "../controllers/adminDeliveryOpsController.js";
import {
  createExternalShop,
  listExternalShops,
  getExternalShop,
  updateExternalShop,
  requestShopDelivery,
} from "../controllers/externalShopController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = express.Router();

// ─── Legacy Deliveries Endpoints (Preserved for compatibility) ──────────────────
router.get("/deliveries", adminAuth, getAllDeliveries);
router.get("/deliveries/:id", adminAuth, getDelivery);
router.patch("/deliveries/:id/cancel", adminAuth, cancelDelivery);
router.patch("/deliveries/:id/reassign", adminAuth, reassignDelivery);
router.get("/deliveries/analytics", adminAuth, deliveryAnalytics);
router.get("/deliveries/live", adminAuth, getLiveDeliveries);
router.patch("/delivery-share", adminAuth, changeDeliveryShare);

// ─── Central Admin Delivery Platform Operations ─────────────────────────────────

// 1. Overview & Stats
router.get("/delivery/stats", adminAuth, getOverviewStats);

// 2. Global Delivery Settings & Audit Logs (Single Source of Truth)
router.get("/delivery/settings", adminAuth, getSettings);
router.put("/delivery/settings", adminAuth, updateSettings);
router.get("/delivery/settings/logs", adminAuth, getSettingsAuditLogs);

// 3. Rider Verification & Management
router.get("/delivery/riders", adminAuth, listRiders);
router.get("/delivery/riders/:id", adminAuth, getRiderDetail);
router.post("/delivery/riders/:id/verify", adminAuth, verifyRider);
router.post("/delivery/riders/:id/status", adminAuth, updateRiderStatus);
router.post("/delivery/riders/:id/strikes", adminAuth, issueRiderStrike);
router.post("/delivery/strikes/:id/revoke", adminAuth, revokeRiderStrike);
router.post("/delivery/documents/:id/verify", adminAuth, verifyRiderDocument);
router.delete("/delivery/riders/:id/aadhaar", adminAuth, deleteRiderAadhaar);

// 4. Delivery Job Lifecycle Management
router.get("/delivery/jobs", adminAuth, listJobs);
router.get("/delivery/jobs/:id", adminAuth, getJobDetail);
router.post("/delivery/jobs/:id/assign", adminAuth, manualAssignRider);
router.post("/delivery/jobs/:id/cancel", adminAuth, adminCancelDelivery);

// 5. Payout Management (Auditable financial ledger)
router.get("/delivery/payouts", adminAuth, getPayoutOverview);
router.post("/delivery/payouts/process", adminAuth, processPayout);

// 6. Incidents, Damage Disputes & Strikes
router.get("/delivery/incidents", adminAuth, listIncidents);
router.post("/delivery/incidents/:id/resolve", adminAuth, resolveIncident);
router.post("/delivery/strikes/:id/appeal", adminAuth, reviewStrikeAppeal);

// 7. Rider Support Chat Inbox
router.get("/delivery/conversations", adminAuth, getRiderConversations);

// 8. External Local Shops Management
router.get("/delivery/shops", adminAuth, listExternalShops);
router.post("/delivery/shops", adminAuth, createExternalShop);
router.get("/delivery/shops/:id", adminAuth, getExternalShop);
router.patch("/delivery/shops/:id", adminAuth, updateExternalShop);
router.post("/delivery/shops/:id/request-delivery", adminAuth, requestShopDelivery);

export default router;
