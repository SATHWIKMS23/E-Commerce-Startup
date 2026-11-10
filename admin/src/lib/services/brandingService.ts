// =============================================================================
// BRANDING SERVICE (Customer & Seller Branding Scopes)
// -----------------------------------------------------------------------------
// Separate scopes for Customer Marketplace and Seller Portal branding.
// Endpoints:
//   GET /api/branding/public?app=customer | seller
//   GET /api/branding/:app
// Admin CRUD:
//   GET /api/admin/settings/branding?app=customer | seller
//   PUT /api/admin/settings/branding?app=customer | seller
// =============================================================================

import type { AxiosInstance } from 'axios';

export interface BrandingConfig {
  name: string;
  marketplaceName: string;
  brandName?: string;
  logo: string;
  favicon: string;
  tagline?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  darkLogoUrl?: string | null;
  lightLogoUrl?: string | null;
  brandDescription?: string | null;
  customerTitle?: string | null;
  sellerPortalTitle?: string | null;
  sellerPortalTagline?: string | null;
  sellerPortalLogoUrl?: string | null;
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
  updatedAt?: string;
  updatedBy?: string;
}

export type BrandingApp = 'customer' | 'seller' | 'delivery';

export const DEFAULT_BRANDING: BrandingConfig = {
  name: 'Marketplace',
  marketplaceName: 'Marketplace',
  brandName: 'Marketplace',
  logo: '',
  favicon: '',
  tagline: 'Your local marketplace for everything',
  shortName: 'Marketplace',
  logoUrl: '',
  faviconUrl: '',
  heroBadge: 'The Local Marketplace for Everything',
  heroHeadingLine1: 'Buy Anything.',
  heroHeadingLine2: 'From Anyone.',
  heroHeadingLine3: 'Near You.',
  heroDescription: 'Marketplace is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.',
  searchPlaceholder: 'Search products, shops on Marketplace…',
  exploreShopsButtonText: 'Explore Shops',
  browseProductsButtonText: 'Browse Products',
  footerDescription: 'Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on Marketplace.',
  seoTitle: 'Marketplace',
  seoDescription: 'Discover local artisans, handcrafted items, and custom products.',
  browserTitle: 'Marketplace',
  primaryColor: '#FF5722',
  secondaryColor: '#0EA5E9',
};

export const DEFAULT_SELLER_BRANDING: BrandingConfig = {
  ...DEFAULT_BRANDING,
  name: 'Seller Portal',
  marketplaceName: 'Marketplace',
  brandName: 'Seller Portal',
  tagline: 'Manage your storefront, products, and incoming orders.',
  shortName: 'Seller',
  seoTitle: 'Seller Portal',
  seoDescription: 'Manage your shop, products, orders, and sales.',
  browserTitle: 'Seller Portal',
  primaryColor: '#7C3AED',
  secondaryColor: '#4F46E5',
};

export const DEFAULT_DELIVERY_BRANDING: BrandingConfig = {
  ...DEFAULT_BRANDING,
  name: 'AtlasBasket Delivery',
  marketplaceName: 'AtlasBasket',
  brandName: 'AtlasBasket Delivery',
  tagline: 'Local Delivery Fleet',
  shortName: 'Delivery',
  heroBadge: 'Now Launching Across Mysuru City',
  heroHeadingLine1: 'Deliver locally.',
  heroHeadingLine2: 'Earn directly with every trip.',
  heroHeadingLine3: 'In Mysuru.',
  heroDescription:
    'Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.',
  searchPlaceholder: 'Search delivery zones…',
  exploreShopsButtonText: 'Register as a Rider',
  browseProductsButtonText: 'Rider Sign In',
  seoTitle: 'AtlasBasket Delivery',
  seoDescription: 'On-demand local delivery network in Mysuru.',
  browserTitle: 'AtlasBasket Delivery',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
};

const str = (value: unknown, fallback?: string | null): string =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : (fallback || '');

export const normalizeBranding = (
  d: any,
  defaults: BrandingConfig = DEFAULT_BRANDING
): BrandingConfig => {
  const nameVal = str(d?.customerTitle, '') || str(d?.sellerPortalTitle, '') || str(d?.brandName, '') || str(d?.name, '') || str(d?.marketplaceName, '') || defaults.name;
  const logoVal = str(d?.sellerPortalLogoUrl, '') || str(d?.logo, '') || str(d?.logoUrl, '') || defaults.logo;
  const rawFavicon = str(d?.favicon, '') || str(d?.faviconUrl, '') || '';
  const faviconVal = rawFavicon && rawFavicon !== '/favicon.ico' ? rawFavicon : (logoVal || defaults.favicon);
  const taglineVal = str(d?.sellerPortalTagline, '') || str(d?.tagline, defaults.tagline);

  return {
    name: nameVal,
    marketplaceName: str(d?.marketplaceName, str(d?.brandName, defaults.marketplaceName)),
    brandName: str(d?.brandName, nameVal),
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: str(d?.shortName, defaults.shortName),
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    darkLogoUrl: str(d?.darkLogoUrl, null),
    lightLogoUrl: str(d?.lightLogoUrl, null),
    brandDescription: str(d?.brandDescription, defaults.brandDescription),
    customerTitle: str(d?.customerTitle, null),
    sellerPortalTitle: str(d?.sellerPortalTitle, null),
    sellerPortalTagline: str(d?.sellerPortalTagline, null),
    sellerPortalLogoUrl: str(d?.sellerPortalLogoUrl, null),
    heroBadge: str(d?.heroBadge, defaults.heroBadge),
    heroHeadingLine1: str(d?.heroHeadingLine1, defaults.heroHeadingLine1),
    heroHeadingLine2: str(d?.heroHeadingLine2, defaults.heroHeadingLine2),
    heroHeadingLine3: str(d?.heroHeadingLine3, defaults.heroHeadingLine3),
    heroDescription: str(d?.heroDescription, defaults.heroDescription),
    searchPlaceholder: str(d?.searchPlaceholder, defaults.searchPlaceholder),
    exploreShopsButtonText: str(d?.exploreShopsButtonText, defaults.exploreShopsButtonText),
    browseProductsButtonText: str(d?.browseProductsButtonText, defaults.browseProductsButtonText),
    footerDescription: str(d?.footerDescription, defaults.footerDescription),
    seoTitle: str(d?.seoTitle, defaults.seoTitle),
    seoDescription: str(d?.seoDescription, defaults.seoDescription),
    browserTitle: str(d?.browserTitle, defaults.browserTitle),
    primaryColor: d?.primaryColor || defaults.primaryColor,
    secondaryColor: d?.secondaryColor || defaults.secondaryColor,
    supportEmail: str(d?.supportEmail, null),
    supportPhone: str(d?.supportPhone, null),
    updatedAt: d?.updatedAt,
    updatedBy: d?.updatedBy,
  };
};

const BRANDING_ENDPOINTS = [
  '/api/branding/public',
  '/api/branding',
];

export const fetchBranding = async (
  client: AxiosInstance,
  app: BrandingApp = 'customer'
): Promise<BrandingConfig> => {
  const defaults =
    app === 'seller'
      ? DEFAULT_SELLER_BRANDING
      : app === 'delivery'
      ? DEFAULT_DELIVERY_BRANDING
      : DEFAULT_BRANDING;
  for (const url of BRANDING_ENDPOINTS) {
    try {
      const res = await client.get(url, { params: { app } });
      if (res?.data) return normalizeBranding(res.data, defaults);
    } catch {
      // Try next endpoint
    }
  }
  return defaults;
};
