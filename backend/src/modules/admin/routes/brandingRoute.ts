import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { cache } from "../../../middleware/cache.js";
import {
    getAdminBranding,
    getPublicBranding,
    updateAdminBranding
} from "../controllers/brandingController.js";

/**
 * Public branding router → mounted at `/api/branding`.
 * Supports query params (?app=customer | ?app=seller) and path routes (/customer | /seller).
 */
export const publicBrandingRouter = Router();

publicBrandingRouter.get("/", cache(60), getPublicBranding);
publicBrandingRouter.get("/public", cache(60), getPublicBranding);
publicBrandingRouter.get("/customer", cache(60), (req, res) => {
    (req.params as any).app = "customer";
    return getPublicBranding(req, res);
});
publicBrandingRouter.get("/seller", cache(60), (req, res) => {
    (req.params as any).app = "seller";
    return getPublicBranding(req, res);
});
publicBrandingRouter.get("/delivery", cache(60), (req, res) => {
    (req.params as any).app = "delivery";
    return getPublicBranding(req, res);
});
publicBrandingRouter.get("/:app", cache(60), getPublicBranding);

/**
 * Admin branding router → mounted at `/api/admin/settings/branding`.
 * Supports query params (?app=customer | ?app=seller) and path routes (/customer | /seller).
 */
export const adminBrandingRouter = Router();

adminBrandingRouter.use(adminAuth);

adminBrandingRouter.get("/", requirePermission("branding.view"), getAdminBranding);
adminBrandingRouter.put("/", requirePermission("branding.manage"), updateAdminBranding);

adminBrandingRouter.get("/customer", requirePermission("branding.view"), (req, res) => {
    (req.params as any).app = "customer";
    return getAdminBranding(req, res);
});
adminBrandingRouter.put("/customer", requirePermission("branding.manage"), (req, res) => {
    (req.params as any).app = "customer";
    return updateAdminBranding(req, res);
});

adminBrandingRouter.get("/seller", requirePermission("branding.view"), (req, res) => {
    (req.params as any).app = "seller";
    return getAdminBranding(req, res);
});
adminBrandingRouter.put("/seller", requirePermission("branding.manage"), (req, res) => {
    (req.params as any).app = "seller";
    return updateAdminBranding(req, res);
});

adminBrandingRouter.get("/delivery", requirePermission("branding.view"), (req, res) => {
    (req.params as any).app = "delivery";
    return getAdminBranding(req, res);
});
adminBrandingRouter.put("/delivery", requirePermission("branding.manage"), (req, res) => {
    (req.params as any).app = "delivery";
    return updateAdminBranding(req, res);
});

adminBrandingRouter.get("/:app", requirePermission("branding.view"), getAdminBranding);
adminBrandingRouter.put("/:app", requirePermission("branding.manage"), updateAdminBranding);

export default adminBrandingRouter;
