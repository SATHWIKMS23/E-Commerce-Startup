import type { Request, Response } from "express";
import { AdminActionType } from "@prisma/client";
import { logAdminAction } from "../utils/actionLogger.js";
import { invalidatePublicCache } from "../../../middleware/cache.js";
import { broadcastBrandingUpdated } from "../../../services/chat/chat.service.js";
import type { BrandingApp, BrandingUpdate } from "../services/brandingService.js";
import {
    getBrandingConfiguration,
    getBrandingSettings,
    saveBranding
} from "../services/brandingService.js";

export const parseBrandingApp = (value: unknown): BrandingApp | null => {
    if (value === undefined || value === null || value === "") return "CUSTOMER";
    if (typeof value !== "string") return null;
    const app = value.trim().toUpperCase();
    return app === "CUSTOMER" || app === "SELLER" || app === "DELIVERY" ? app : null;
};

const HEX_OR_COLOR_REGEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$|^rgba?\([\d\s,%.-]+\)$|^hsla?\([\d\s,%.-]+\)$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateBrandingInput = (input: BrandingUpdate): string | null => {
    if (input.brandName !== undefined && typeof input.brandName === "string") {
        if (input.brandName.length > 150) return "Brand name must not exceed 150 characters.";
    }
    if (input.name !== undefined && typeof input.name === "string") {
        if (input.name.length > 150) return "Name must not exceed 150 characters.";
    }
    if (input.shortName !== undefined && typeof input.shortName === "string") {
        if (input.shortName.length > 80) return "Short name must not exceed 80 characters.";
    }
    if (input.tagline !== undefined && typeof input.tagline === "string") {
        if (input.tagline.length > 300) return "Tagline must not exceed 300 characters.";
    }
    if (input.browserTitle !== undefined && typeof input.browserTitle === "string") {
        if (input.browserTitle.length > 200) return "Browser title must not exceed 200 characters.";
    }
    if (input.seoTitle !== undefined && typeof input.seoTitle === "string") {
        if (input.seoTitle.length > 200) return "SEO title must not exceed 200 characters.";
    }
    if (input.seoDescription !== undefined && typeof input.seoDescription === "string") {
        if (input.seoDescription.length > 500) return "SEO description must not exceed 500 characters.";
    }
    if (input.primaryColor && typeof input.primaryColor === "string") {
        if (input.primaryColor.length > 30 || !HEX_OR_COLOR_REGEX.test(input.primaryColor.trim())) {
            return "Primary color must be a valid hex or CSS color code.";
        }
    }
    if (input.secondaryColor && typeof input.secondaryColor === "string") {
        if (input.secondaryColor.length > 30 || !HEX_OR_COLOR_REGEX.test(input.secondaryColor.trim())) {
            return "Secondary color must be a valid hex or CSS color code.";
        }
    }
    if (input.supportEmail && typeof input.supportEmail === "string" && input.supportEmail.trim() !== "") {
        if (!EMAIL_REGEX.test(input.supportEmail.trim())) {
            return "Support email must be a valid email address.";
        }
    }
    if (input.logoUrl && typeof input.logoUrl === "string" && input.logoUrl.length > 2048) {
        return "Logo URL exceeds maximum length of 2048 characters.";
    }
    if (input.faviconUrl && typeof input.faviconUrl === "string" && input.faviconUrl.length > 2048) {
        return "Favicon URL exceeds maximum length of 2048 characters.";
    }
    return null;
};

/** GET /api/branding, /api/branding/:app, /api/branding/public */
export const getPublicBranding = async (req: Request, res: Response) => {
    try {
        const appParam = (req.params as any)?.app || req.query.app;
        const app = parseBrandingApp(appParam);
        if (!app) {
            return res.status(400).json({ message: "Invalid branding application scope. Use customer or seller." });
        }
        const branding = await getBrandingConfiguration(app);
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        return res.status(200).json(branding);
    } catch (error: any) {
        console.error("GET PUBLIC BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to load branding. Please try again." });
    }
};

/** GET /api/admin/settings/branding and /api/admin/settings/branding/:app */
export const getAdminBranding = async (req: Request, res: Response) => {
    try {
        const appParam = (req.params as any)?.app || req.query.app;
        const app = parseBrandingApp(appParam);
        if (!app) {
            return res.status(400).json({ message: "Invalid branding application scope. Use customer or seller." });
        }
        return res.status(200).json(await getBrandingSettings(app));
    } catch (error: any) {
        console.error("GET BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to load branding. Please try again." });
    }
};

/** PUT /api/admin/settings/branding and /api/admin/settings/branding/:app */
export const updateAdminBranding = async (req: Request, res: Response) => {
    try {
        const appParam = (req.params as any)?.app || req.query.app;
        const app = parseBrandingApp(appParam);
        if (!app) {
            return res.status(400).json({ message: "Invalid branding application scope. Use customer or seller." });
        }

        const adminId = req.adminId!;
        const input = (req.body?.branding && typeof req.body.branding === "object"
            ? req.body.branding
            : req.body) as BrandingUpdate;

        const validationError = validateBrandingInput(input);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const previous = await getBrandingConfiguration(app);
        const branding = await saveBranding(input, adminId, app);

        invalidatePublicCache();
        broadcastBrandingUpdated(app).catch(() => {});

        await logAdminAction({
            adminId,
            actionType: AdminActionType.BRANDING_UPDATED,
            targetType: "MarketplaceBranding",
            targetId: app,
            description: `Updated ${app.toLowerCase()} branding ("${previous.brandName}" → "${branding.brandName}")`,
            previousValue: previous,
            newValue: branding,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        const appLabel = app === "CUSTOMER" ? "Customer" : "Seller";
        return res.status(200).json({
            branding,
            message: `${appLabel} branding updated successfully`
        });
    } catch (error: any) {
        console.error("UPDATE BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to save branding. Please try again." });
    }
};
