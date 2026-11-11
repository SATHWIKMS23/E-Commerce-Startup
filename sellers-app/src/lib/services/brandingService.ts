// =============================================================================
// SHARED BRANDING SERVICE (Single Source of Truth)
// -----------------------------------------------------------------------------
// Branding is owned by Admin and served by the branding endpoint:
//   GET /api/branding/public   (primary)
//   GET /api/branding          (fallback)
// Both return identical public JSON with no auth. If every endpoint fails we
// fall back to the default below. Never crashes.
// =============================================================================

import type { AxiosInstance } from 'axios';

export interface BrandingConfig {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  tagline?: string;
  shortName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  darkLogoUrl?: string;
  lightLogoUrl?: string;
  brandDescription?: string;
  sellerPortalTitle?: string;
  sellerPortalTagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  updatedAt?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  name: 'Marketplace',
  marketplaceName: 'Marketplace',
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
};

export const DEFAULT_SELLER_BRANDING: BrandingConfig = {
  ...DEFAULT_BRANDING,
  name: 'Seller Portal',
  tagline: 'Manage your storefront, products, and incoming orders.',
  browserTitle: 'Seller Portal',
};

const str = (value: unknown, fallback: string | undefined): string =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : (fallback || '');

const cleanUrl = (url: unknown): string => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '/images/logo.png' || trimmed === '/favicon.ico') return '';
  return trimmed;
};

const resolveAssetUrl = (value: string): string => {
  const cleaned = cleanUrl(value);
  if (!cleaned) return '';
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || '')?.replace(/\/$/, '');
  if (!cleaned.startsWith('/') || !backendUrl) return cleaned;
  return `${backendUrl}${cleaned}`;
};

export const normalizeBranding = (
  d: any,
  defaults: BrandingConfig = DEFAULT_BRANDING
): BrandingConfig => {
  const sellerTitle = str(d?.sellerPortalTitle, '') || str(d?.brandName, '') || str(d?.name, '') || str(d?.marketplaceName, '') || defaults.name;
  const rawLogo = cleanUrl(d?.sellerPortalLogoUrl) || cleanUrl(d?.logo) || cleanUrl(d?.logoUrl) || defaults.logo;
  const logoVal = resolveAssetUrl(rawLogo);
  const rawFavicon = cleanUrl(d?.favicon) || cleanUrl(d?.faviconUrl) || rawLogo;
  const faviconVal = resolveAssetUrl(rawFavicon);
  const taglineVal = str(d?.sellerPortalTagline, '') || str(d?.tagline, defaults.tagline);
  const mktName = str(d?.marketplaceName, str(d?.brandName, 'Marketplace'));

  return {
    name: sellerTitle,
    marketplaceName: mktName,
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: str(d?.shortName, 'Seller'),
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    darkLogoUrl: resolveAssetUrl(d?.darkLogoUrl),
    lightLogoUrl: resolveAssetUrl(d?.lightLogoUrl),
    brandDescription: str(d?.brandDescription, defaults.brandDescription),
    sellerPortalTitle: str(d?.sellerPortalTitle, sellerTitle),
    sellerPortalTagline: taglineVal,
    primaryColor: d?.primaryColor || defaults.primaryColor,
    secondaryColor: d?.secondaryColor || defaults.secondaryColor,
    heroBadge: str(d?.heroBadge, defaults.heroBadge),
    heroHeadingLine1: str(d?.heroHeadingLine1, defaults.heroHeadingLine1),
    heroHeadingLine2: str(d?.heroHeadingLine2, defaults.heroHeadingLine2),
    heroHeadingLine3: str(d?.heroHeadingLine3, defaults.heroHeadingLine3),
    heroDescription: str(d?.heroDescription, defaults.heroDescription),
    searchPlaceholder: str(d?.searchPlaceholder, defaults.searchPlaceholder),
    exploreShopsButtonText: str(d?.exploreShopsButtonText, defaults.exploreShopsButtonText),
    browseProductsButtonText: str(d?.browseProductsButtonText, defaults.browseProductsButtonText),
    footerDescription: str(d?.footerDescription, defaults.footerDescription),
    seoTitle: str(d?.seoTitle, `${sellerTitle} | ${mktName}`),
    seoDescription: str(d?.seoDescription, defaults.seoDescription),
    browserTitle: str(d?.browserTitle, sellerTitle),
    updatedAt: d?.updatedAt,
  };
};

const BRANDING_ENDPOINTS = ['/api/branding/public', '/api/branding'];

export const fetchBranding = async (
  client: AxiosInstance,
  app: 'customer' | 'seller' = 'customer'
): Promise<BrandingConfig> => {
  const defaults = app === 'seller' ? DEFAULT_SELLER_BRANDING : DEFAULT_BRANDING;
  for (const url of BRANDING_ENDPOINTS) {
    try {
      const res = await client.get(url, { params: { app } });
      if (res?.data) return normalizeBranding(res.data, defaults);
    } catch {
      // Try the next endpoint; ultimately fall back to DEFAULT_BRANDING.
    }
  }
  return defaults;
};
