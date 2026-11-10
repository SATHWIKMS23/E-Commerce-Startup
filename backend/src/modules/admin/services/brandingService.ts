import { prisma } from "../../../config/prisma.js";
import storageService from "../../storage/services/storage.service.js";

/**
 * Marketplace branding — independent Admin-owned configurations per app.
 *
 * Scopes:
 *   - CUSTOMER: Controls customer marketplace store, header, colors, marketing copy, and SEO.
 *   - SELLER: Controls seller portal workspace, sidebar, auth headers, colors, and portal metadata.
 *
 * Both are persisted and managed completely independently.
 */

export interface BrandingConfiguration {
    name: string;
    marketplaceName: string;
    brandName: string;
    logo: string;
    favicon: string;
    tagline: string;
    shortName: string;
    logoUrl: string;
    faviconUrl: string;
    darkLogoUrl?: string;
    lightLogoUrl?: string;
    brandDescription?: string;
    customerTitle?: string;
    sellerPortalTitle?: string;
    sellerPortalTagline?: string;
    sellerPortalLogoUrl?: string;
    heroBadge: string;
    heroHeadingLine1: string;
    heroHeadingLine2: string;
    heroHeadingLine3: string;
    heroDescription: string;
    searchPlaceholder: string;
    exploreShopsButtonText: string;
    browseProductsButtonText: string;
    footerDescription: string;
    seoTitle: string;
    seoDescription: string;
    browserTitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    supportEmail?: string;
    supportPhone?: string;
    updatedAt: string;
    updatedBy: string;
}

export type BrandingApp = "CUSTOMER" | "SELLER" | "DELIVERY";

const appDefaults: Record<BrandingApp, BrandingConfiguration> = {
    DELIVERY: {
        name: "AtlasBasket Delivery",
        marketplaceName: "AtlasBasket",
        brandName: "AtlasBasket Delivery",
        logo: "",
        favicon: "",
        tagline: "Local Delivery Fleet",
        shortName: "Delivery",
        logoUrl: "",
        faviconUrl: "",
        darkLogoUrl: "",
        lightLogoUrl: "",
        brandDescription: "On-demand local delivery network in Mysuru.",
        customerTitle: "AtlasBasket Delivery",
        sellerPortalTitle: "AtlasBasket Delivery",
        sellerPortalTagline: "Local Delivery Fleet",
        heroBadge: "Now Launching Across Mysuru City",
        heroHeadingLine1: "Deliver locally.",
        heroHeadingLine2: "Earn directly with every trip.",
        heroHeadingLine3: "In Mysuru.",
        heroDescription:
            "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
        searchPlaceholder: "Search delivery zones…",
        exploreShopsButtonText: "Register as a Rider",
        browseProductsButtonText: "Rider Sign In",
        footerDescription: "Reliable on-demand local deliveries across Mysuru.",
        seoTitle: "AtlasBasket Delivery",
        seoDescription: "On-demand local delivery network in Mysuru.",
        browserTitle: "AtlasBasket Delivery",
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        updatedAt: new Date(0).toISOString(),
        updatedBy: "system"
    },
    CUSTOMER: {
        name: "Sante Marketplace",
        marketplaceName: "Sante Marketplace",
        brandName: "Sante Marketplace",
        logo: "",
        favicon: "",
        tagline: "Your local marketplace for everything",
        shortName: "Sante",
        logoUrl: "",
        faviconUrl: "",
        darkLogoUrl: "",
        lightLogoUrl: "",
        brandDescription: "Your curated marketplace for local creators, artisans, and custom merchandise.",
        customerTitle: "Sante Marketplace",
        sellerPortalTitle: "Sante Seller Portal",
        sellerPortalTagline: "Manage your storefront, products, and incoming orders.",
        heroBadge: "The Local Marketplace for Everything",
        heroHeadingLine1: "Buy Anything.",
        heroHeadingLine2: "From Anyone.",
        heroHeadingLine3: "Near You.",
        heroDescription:
            "Sante is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.",
        searchPlaceholder: "Search products, shops on Marketplace…",
        exploreShopsButtonText: "Explore Shops",
        browseProductsButtonText: "Browse Products",
        footerDescription:
            "Discover local craft creators, purchase unique handmade items, and order custom products directly from makers on Sante.",
        seoTitle: "Sante Marketplace",
        seoDescription: "Discover local artisans, handcrafted items, and custom products.",
        browserTitle: "Sante Marketplace",
        primaryColor: "#FF5722",
        secondaryColor: "#0EA5E9",
        updatedAt: new Date(0).toISOString(),
        updatedBy: "system"
    },
    SELLER: {
        name: "Sante Seller Portal",
        marketplaceName: "Sante Marketplace",
        brandName: "Sante Seller Portal",
        logo: "",
        favicon: "",
        tagline: "Manage your storefront, products, and incoming orders.",
        shortName: "Seller",
        logoUrl: "",
        faviconUrl: "",
        darkLogoUrl: "",
        lightLogoUrl: "",
        brandDescription: "Merchant operating system for marketplace sellers.",
        customerTitle: "Sante Marketplace",
        sellerPortalTitle: "Sante Seller Portal",
        sellerPortalTagline: "Manage your storefront, products, and incoming orders.",
        heroBadge: "The Local Marketplace for Everything",
        heroHeadingLine1: "Sell Anything.",
        heroHeadingLine2: "From Your Shop.",
        heroHeadingLine3: "Locally.",
        heroDescription:
            "Manage your shop, products, orders, and sales seamlessly from one place.",
        searchPlaceholder: "Search your products and orders…",
        exploreShopsButtonText: "Manage Shop",
        browseProductsButtonText: "View Orders",
        footerDescription:
            "Manage your store, track orders, and grow your business with Sante Seller Portal.",
        seoTitle: "Sante Seller Portal",
        seoDescription: "Manage your shop, products, orders, and sales.",
        browserTitle: "Sante Seller Portal",
        primaryColor: "#7C3AED",
        secondaryColor: "#4F46E5",
        updatedAt: new Date(0).toISOString(),
        updatedBy: "system"
    }
};

export const DEFAULT_BRANDING: BrandingConfiguration = appDefaults.CUSTOMER;
export const DEFAULT_SELLER_BRANDING: BrandingConfiguration = appDefaults.SELLER;

const CACHE_TTL_MS = 15_000;
const brandingCache = new Map<BrandingApp, { value: BrandingConfiguration; expiresAt: number }>();

export const invalidateBrandingCache = (app?: BrandingApp): void => {
    if (app) brandingCache.delete(app);
    else brandingCache.clear();
};

const str = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;

const cleanAssetUrl = (url: unknown): string => {
    if (typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed || trimmed === "/images/logo.png" || trimmed === "/favicon.ico") return "";
    return trimmed;
};

export const getBrandingConfiguration = async (
    app: BrandingApp = "CUSTOMER"
): Promise<BrandingConfiguration> => {
    const cacheKey = app;
    const cached = brandingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const defaults = appDefaults[app];

    if (app === "DELIVERY") {
        const { DeliverySettingsService } = await import("../../delivery/services/deliverySettings.service.js");
        const ds = await DeliverySettingsService.getEffectiveSettings();
        const brandName = str(ds.brandName, defaults.brandName);
        const logoUrl = cleanAssetUrl(ds.brandLogoUrl) || "";
        const config: BrandingConfiguration = {
            name: brandName,
            marketplaceName: "AtlasBasket",
            brandName,
            logo: logoUrl,
            favicon: logoUrl,
            logoUrl,
            faviconUrl: logoUrl,
            darkLogoUrl: logoUrl,
            lightLogoUrl: logoUrl,
            tagline: str(ds.brandTagline, defaults.tagline),
            shortName: "Delivery",
            brandDescription: defaults.brandDescription!,
            customerTitle: brandName,
            sellerPortalTitle: brandName,
            sellerPortalTagline: str(ds.brandTagline, defaults.tagline),
            heroBadge: str(ds.heroBadgeText, defaults.heroBadge),
            heroHeadingLine1: str(ds.heroHeadingLine1, defaults.heroHeadingLine1),
            heroHeadingLine2: str(ds.heroHeadingLine2, defaults.heroHeadingLine2),
            heroHeadingLine3: defaults.heroHeadingLine3,
            heroDescription: str(ds.heroDescription, defaults.heroDescription),
            searchPlaceholder: defaults.searchPlaceholder,
            exploreShopsButtonText: defaults.exploreShopsButtonText,
            browseProductsButtonText: defaults.browseProductsButtonText,
            footerDescription: defaults.footerDescription,
            seoTitle: brandName,
            seoDescription: defaults.seoDescription,
            browserTitle: brandName,
            primaryColor: "#000000",
            secondaryColor: "#ffffff",
            updatedAt: ds.updatedAt ? new Date(ds.updatedAt).toISOString() : new Date().toISOString(),
            updatedBy: "admin"
        };
        brandingCache.set(cacheKey, { value: config, expiresAt: Date.now() + CACHE_TTL_MS });
        return config;
    }

    const row = await prisma.marketplaceBranding.findUnique({ where: { app } }).catch(() => null);

    if (app === "SELLER") {
        const sellerRow = row || ({} as any);
        const sellerTitle =
            str(sellerRow.sellerPortalTitle, "") ||
            str(sellerRow.brandName, "") ||
            defaults.name;

        const sellerTagline =
            str(sellerRow.sellerPortalTagline, "") ||
            str(sellerRow.tagline, "") ||
            defaults.tagline;

        const sellerLogo =
            cleanAssetUrl(sellerRow.sellerPortalLogoUrl) ||
            cleanAssetUrl(sellerRow.logoUrl) ||
            defaults.logo;

        const sellerFavicon = cleanAssetUrl(sellerRow.faviconUrl) || sellerLogo;
        const darkLogo = cleanAssetUrl(sellerRow.darkLogoUrl) || sellerLogo;
        const lightLogo = cleanAssetUrl(sellerRow.lightLogoUrl) || sellerLogo;

        const config: BrandingConfiguration = {
            name: sellerTitle,
            marketplaceName: sellerTitle,
            brandName: sellerTitle,
            logo: sellerLogo,
            favicon: sellerFavicon,
            logoUrl: sellerLogo,
            faviconUrl: sellerFavicon,
            darkLogoUrl: darkLogo,
            lightLogoUrl: lightLogo,
            tagline: sellerTagline,
            shortName: str(sellerRow.shortName, "Seller"),
            brandDescription: str(sellerRow.brandDescription, defaults.brandDescription!),
            customerTitle: sellerTitle,
            sellerPortalTitle: sellerTitle,
            sellerPortalTagline: sellerTagline,
            sellerPortalLogoUrl: sellerLogo,
            heroBadge: str(sellerRow.heroBadge, defaults.heroBadge),
            heroHeadingLine1: str(sellerRow.heroHeadingLine1, defaults.heroHeadingLine1),
            heroHeadingLine2: str(sellerRow.heroHeadingLine2, defaults.heroHeadingLine2),
            heroHeadingLine3: str(sellerRow.heroHeadingLine3, defaults.heroHeadingLine3),
            heroDescription: str(sellerRow.heroDescription, defaults.heroDescription),
            searchPlaceholder: str(sellerRow.searchPlaceholder, defaults.searchPlaceholder),
            exploreShopsButtonText: str(sellerRow.exploreShopsButtonText, defaults.exploreShopsButtonText),
            browseProductsButtonText: str(sellerRow.browseProductsButtonText, defaults.browseProductsButtonText),
            footerDescription: str(sellerRow.footerDescription, defaults.footerDescription),
            seoTitle: str(sellerRow.seoTitle, `${sellerTitle}`),
            seoDescription: str(sellerRow.seoDescription, defaults.seoDescription),
            browserTitle: str(sellerRow.browserTitle, `${sellerTitle}`),
            primaryColor: sellerRow.primaryColor || defaults.primaryColor,
            secondaryColor: sellerRow.secondaryColor || defaults.secondaryColor,
            supportEmail: sellerRow.supportEmail || undefined,
            supportPhone: sellerRow.supportPhone || undefined,
            updatedAt: sellerRow.updatedAt ? new Date(sellerRow.updatedAt).toISOString() : new Date().toISOString(),
            updatedBy: str(sellerRow.updatedBy, "system")
        };

        brandingCache.set(cacheKey, { value: config, expiresAt: Date.now() + CACHE_TTL_MS });
        return config;
    }

    // Default: CUSTOMER branding (strictly from CUSTOMER record)
    const custRow = row || ({} as any);
    const customerBrandName = str(custRow.brandName, defaults.brandName);
    const customerLogo = cleanAssetUrl(custRow.logoUrl);
    const customerFavicon = cleanAssetUrl(custRow.faviconUrl) || customerLogo;
    const customerTagline = str(custRow.tagline, defaults.tagline);
    const custTitle = str(custRow.customerTitle, customerBrandName);

    const config: BrandingConfiguration = {
        name: customerBrandName,
        marketplaceName: customerBrandName,
        brandName: customerBrandName,
        logo: customerLogo,
        favicon: customerFavicon,
        logoUrl: customerLogo,
        faviconUrl: customerFavicon,
        darkLogoUrl: cleanAssetUrl(custRow.darkLogoUrl) || customerLogo,
        lightLogoUrl: cleanAssetUrl(custRow.lightLogoUrl) || customerLogo,
        tagline: customerTagline,
        shortName: str(custRow.shortName, customerBrandName),
        brandDescription: str(custRow.brandDescription, defaults.brandDescription!),
        customerTitle: custTitle,
        sellerPortalTitle: str(custRow.sellerPortalTitle, `${customerBrandName} Seller Portal`),
        sellerPortalTagline: str(custRow.sellerPortalTagline, "Manage your storefront, products, and incoming orders."),
        sellerPortalLogoUrl: cleanAssetUrl(custRow.sellerPortalLogoUrl) || customerLogo,
        heroBadge: str(custRow.heroBadge, defaults.heroBadge),
        heroHeadingLine1: str(custRow.heroHeadingLine1, defaults.heroHeadingLine1),
        heroHeadingLine2: str(custRow.heroHeadingLine2, defaults.heroHeadingLine2),
        heroHeadingLine3: str(custRow.heroHeadingLine3, defaults.heroHeadingLine3),
        heroDescription: str(custRow.heroDescription, defaults.heroDescription),
        searchPlaceholder: str(custRow.searchPlaceholder, defaults.searchPlaceholder),
        exploreShopsButtonText: str(custRow.exploreShopsButtonText, defaults.exploreShopsButtonText),
        browseProductsButtonText: str(custRow.browseProductsButtonText, defaults.browseProductsButtonText),
        footerDescription: str(custRow.footerDescription, defaults.footerDescription),
        seoTitle: str(custRow.seoTitle, `${customerBrandName}`),
        seoDescription: str(custRow.seoDescription, defaults.seoDescription),
        browserTitle: str(custRow.browserTitle, `${customerBrandName}`),
        primaryColor: custRow.primaryColor || defaults.primaryColor,
        secondaryColor: custRow.secondaryColor || defaults.secondaryColor,
        supportEmail: custRow.supportEmail || undefined,
        supportPhone: custRow.supportPhone || undefined,
        updatedAt: custRow.updatedAt ? new Date(custRow.updatedAt).toISOString() : new Date().toISOString(),
        updatedBy: str(custRow.updatedBy, "system")
    };

    brandingCache.set(cacheKey, { value: config, expiresAt: Date.now() + CACHE_TTL_MS });
    return config;
};

/** Accepts keys for independent customer or seller branding updates */
export interface BrandingUpdate {
    brandName?: string;
    name?: string;
    marketplaceName?: string;
    shortName?: string;
    tagline?: string;
    logoUrl?: string;
    logoPublicId?: string | null;
    logo?: string;
    darkLogoUrl?: string;
    darkLogoPublicId?: string | null;
    lightLogoUrl?: string;
    lightLogoPublicId?: string | null;
    faviconUrl?: string;
    faviconPublicId?: string | null;
    favicon?: string;
    brandDescription?: string;
    customerTitle?: string;
    sellerPortalTitle?: string;
    sellerPortalTagline?: string;
    sellerPortalLogoUrl?: string;
    sellerPortalLogoPublicId?: string | null;
    browserTitle?: string;
    seoTitle?: string;
    seoDescription?: string;
    primaryColor?: string;
    secondaryColor?: string;
    supportEmail?: string;
    supportPhone?: string;
    heroBadge?: string;
    heroHeadingLine1?: string;
    heroHeadingLine2?: string;
    heroHeadingLine3?: string;
    heroDescription?: string;
    searchPlaceholder?: string;
    exploreShopsButtonText?: string;
    browseProductsButtonText?: string;
    footerDescription?: string;
}

const pick = <T>(...values: T[]): T | undefined =>
    values.find((value) => value !== undefined);

export const saveBranding = async (
    input: BrandingUpdate,
    adminId?: string,
    app: BrandingApp = "CUSTOMER"
): Promise<BrandingConfiguration> => {
    const defaults = appDefaults[app];

    if (app === "DELIVERY") {
        const { DeliverySettingsService } = await import("../../delivery/services/deliverySettings.service.js");
        const brandName = str(pick(input.brandName, input.name), defaults.brandName);
        const brandLogoUrl = pick(input.logoUrl, input.logo) || null;
        const brandTagline = str(pick(input.tagline), defaults.tagline);
        await DeliverySettingsService.updateSettings(adminId || "admin", {
            brandName,
            brandLogoUrl: brandLogoUrl ? String(brandLogoUrl) : null,
            brandTagline,
            heroBadgeText: input.heroBadge,
            heroHeadingLine1: input.heroHeadingLine1,
            heroHeadingLine2: input.heroHeadingLine2,
            heroDescription: input.heroDescription,
            ...(input as any),
        });
        invalidateBrandingCache("DELIVERY");
        return getBrandingConfiguration("DELIVERY");
    }

    const existingRow = await prisma.marketplaceBranding.findUnique({ where: { app } }).catch(() => null);

    const brandName = str(
        pick(input.brandName, input.name, input.marketplaceName),
        existingRow?.brandName || defaults.brandName
    );

    const logoUrl = str(pick(input.logoUrl, input.logo), existingRow?.logoUrl || "");
    const faviconRaw = pick(input.faviconUrl, input.favicon);
    const faviconUrl = faviconRaw === "" ? null : (faviconRaw ?? existingRow?.faviconUrl ?? null);

    const logoPublicId = input.logoPublicId === undefined
        ? existingRow?.logoPublicId ?? null
        : input.logoPublicId || null;

    const faviconPublicId = input.faviconPublicId === undefined
        ? existingRow?.faviconPublicId ?? null
        : input.faviconPublicId || null;

    const darkLogoUrl = input.darkLogoUrl !== undefined ? (input.darkLogoUrl || null) : existingRow?.darkLogoUrl ?? null;
    const darkLogoPublicId = input.darkLogoPublicId !== undefined ? (input.darkLogoPublicId || null) : existingRow?.darkLogoPublicId ?? null;
    const lightLogoUrl = input.lightLogoUrl !== undefined ? (input.lightLogoUrl || null) : existingRow?.lightLogoUrl ?? null;
    const lightLogoPublicId = input.lightLogoPublicId !== undefined ? (input.lightLogoPublicId || null) : existingRow?.lightLogoPublicId ?? null;

    const shortName = str(input.shortName, existingRow?.shortName || defaults.shortName);
    const tagline = str(input.tagline, existingRow?.tagline || defaults.tagline);
    const brandDescription = input.brandDescription !== undefined ? (input.brandDescription || null) : existingRow?.brandDescription ?? null;
    const browserTitle = str(input.browserTitle, existingRow?.browserTitle || brandName);
    const seoTitle = str(input.seoTitle, existingRow?.seoTitle || brandName);
    const seoDescription = str(input.seoDescription, existingRow?.seoDescription || defaults.seoDescription);
    const primaryColor = input.primaryColor ?? existingRow?.primaryColor ?? defaults.primaryColor;
    const secondaryColor = input.secondaryColor ?? existingRow?.secondaryColor ?? defaults.secondaryColor;
    const supportEmail = input.supportEmail !== undefined ? (input.supportEmail || null) : existingRow?.supportEmail ?? null;
    const supportPhone = input.supportPhone !== undefined ? (input.supportPhone || null) : existingRow?.supportPhone ?? null;

    let targetData: any;

    if (app === "SELLER") {
        const sellerPortalTitle = str(
            pick(input.sellerPortalTitle, input.brandName, input.name),
            existingRow?.sellerPortalTitle || existingRow?.brandName || defaults.name
        );
        const sellerPortalTagline = str(
            pick(input.sellerPortalTagline, input.tagline),
            existingRow?.sellerPortalTagline || existingRow?.tagline || defaults.tagline
        );
        const sellerPortalLogoUrl = str(
            pick(input.sellerPortalLogoUrl, input.logoUrl, input.logo),
            existingRow?.sellerPortalLogoUrl || existingRow?.logoUrl || ""
        );
        const sellerPortalLogoPublicId = input.sellerPortalLogoPublicId !== undefined
            ? (input.sellerPortalLogoPublicId || null)
            : input.logoPublicId !== undefined
            ? (input.logoPublicId || null)
            : existingRow?.sellerPortalLogoPublicId ?? existingRow?.logoPublicId ?? null;

        targetData = {
            brandName: sellerPortalTitle,
            shortName,
            tagline: sellerPortalTagline,
            logoUrl: sellerPortalLogoUrl || logoUrl,
            logoPublicId: sellerPortalLogoPublicId || logoPublicId,
            faviconUrl,
            faviconPublicId,
            darkLogoUrl,
            darkLogoPublicId,
            lightLogoUrl,
            lightLogoPublicId,
            brandDescription,
            sellerPortalTitle,
            sellerPortalTagline,
            sellerPortalLogoUrl,
            sellerPortalLogoPublicId,
            browserTitle,
            seoTitle,
            seoDescription,
            primaryColor,
            secondaryColor,
            supportEmail,
            supportPhone,
            updatedBy: adminId ?? "system"
        };
    } else {
        // app === "CUSTOMER"
        const customerTitle = input.customerTitle !== undefined ? (input.customerTitle || null) : existingRow?.customerTitle ?? brandName;
        targetData = {
            brandName,
            shortName,
            tagline,
            logoUrl,
            logoPublicId,
            faviconUrl,
            faviconPublicId,
            darkLogoUrl,
            darkLogoPublicId,
            lightLogoUrl,
            lightLogoPublicId,
            brandDescription,
            customerTitle,
            browserTitle,
            seoTitle,
            seoDescription,
            primaryColor,
            secondaryColor,
            supportEmail,
            supportPhone,
            heroBadge: str(input.heroBadge, existingRow?.heroBadge || defaults.heroBadge),
            heroHeadingLine1: str(input.heroHeadingLine1, existingRow?.heroHeadingLine1 || defaults.heroHeadingLine1),
            heroHeadingLine2: str(input.heroHeadingLine2, existingRow?.heroHeadingLine2 || defaults.heroHeadingLine2),
            heroHeadingLine3: str(input.heroHeadingLine3, existingRow?.heroHeadingLine3 || defaults.heroHeadingLine3),
            heroDescription: str(input.heroDescription, existingRow?.heroDescription || defaults.heroDescription),
            searchPlaceholder: str(input.searchPlaceholder, existingRow?.searchPlaceholder || defaults.searchPlaceholder),
            exploreShopsButtonText: str(input.exploreShopsButtonText, existingRow?.exploreShopsButtonText || defaults.exploreShopsButtonText),
            browseProductsButtonText: str(input.browseProductsButtonText, existingRow?.browseProductsButtonText || defaults.browseProductsButtonText),
            footerDescription: str(input.footerDescription, existingRow?.footerDescription || defaults.footerDescription),
            updatedBy: adminId ?? "system"
        };
    }

    // Persist strictly to the specified app row (never overwrite the other app!)
    await prisma.marketplaceBranding.upsert({
        where: { app },
        update: targetData,
        create: { app, ...targetData }
    });

    // Invalidate cache strictly for the target app
    invalidateBrandingCache(app);

    // Clean up replaced Cloudinary assets strictly for this app row
    const replacedPublicIds = [
        existingRow?.logoPublicId && existingRow.logoPublicId !== targetData.logoPublicId ? existingRow.logoPublicId : null,
        existingRow?.faviconPublicId && existingRow.faviconPublicId !== targetData.faviconPublicId ? existingRow.faviconPublicId : null,
        existingRow?.darkLogoPublicId && existingRow.darkLogoPublicId !== targetData.darkLogoPublicId ? existingRow.darkLogoPublicId : null,
        existingRow?.lightLogoPublicId && existingRow.lightLogoPublicId !== targetData.lightLogoPublicId ? existingRow.lightLogoPublicId : null,
        existingRow?.sellerPortalLogoPublicId && existingRow.sellerPortalLogoPublicId !== targetData.sellerPortalLogoPublicId ? existingRow.sellerPortalLogoPublicId : null,
    ].filter((publicId): publicId is string => Boolean(publicId));

    for (const publicId of replacedPublicIds) {
        try {
            await storageService.deleteImage({ publicId });
        } catch (error) {
            console.error(`FAILED TO REMOVE REPLACED ${app} BRANDING IMAGE:`, error);
        }
    }

    return getBrandingConfiguration(app);
};

/** Admin-facing payload for the specified application row */
export const getBrandingSettings = async (app: BrandingApp = "CUSTOMER") => {
    if (app === "DELIVERY") {
        const branding = await getBrandingConfiguration("DELIVERY");
        return { branding };
    }
    const [branding, row] = await Promise.all([
        getBrandingConfiguration(app),
        prisma.marketplaceBranding.findUnique({ where: { app } })
    ]);
    return {
        branding: {
            ...branding,
            logoPublicId: row?.logoPublicId ?? null,
            faviconPublicId: row?.faviconPublicId ?? null,
            darkLogoUrl: row?.darkLogoUrl ?? null,
            darkLogoPublicId: row?.darkLogoPublicId ?? null,
            lightLogoUrl: row?.lightLogoUrl ?? null,
            lightLogoPublicId: row?.lightLogoPublicId ?? null,
            brandDescription: row?.brandDescription ?? null,
            customerTitle: row?.customerTitle ?? null,
            sellerPortalTitle: row?.sellerPortalTitle ?? null,
            sellerPortalTagline: row?.sellerPortalTagline ?? null,
            sellerPortalLogoUrl: row?.sellerPortalLogoUrl ?? null,
            sellerPortalLogoPublicId: row?.sellerPortalLogoPublicId ?? null,
        }
    };
};
