// =============================================================================
// SHARED BRANDING SERVICE (Single Source of Truth)
// -----------------------------------------------------------------------------
// Admin owns branding. Every frontend reads the SAME public endpoint:
//   GET /api/branding/public   (primary)
//   GET /api/branding          (fallback)
// If every endpoint fails we fall back to the default below. Never crashes.
// =============================================================================

import type { AxiosInstance } from 'axios';

export interface BrandingData {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  tagline: string;
  shortName?: string;
  logoUrl?: string;
  faviconUrl?: string;
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

export const DEFAULT_BRANDING: BrandingData = {
  name: 'AtlasBasket',
  marketplaceName: 'AtlasBasket',
  logo: '',
  favicon: '',
  tagline: 'Your local marketplace for everything',
  shortName: 'AtlasBasket',
  logoUrl: '',
  faviconUrl: '',
  heroBadge: 'The Local Marketplace for Everything',
  heroHeadingLine1: 'Buy Anything.',
  heroHeadingLine2: 'From Anyone.',
  heroHeadingLine3: 'Near You.',
  heroDescription: 'AtlasBasket is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.',
  searchPlaceholder: 'Search products, shops on AtlasBasket…',
  exploreShopsButtonText: 'Explore Shops',
  browseProductsButtonText: 'Browse Products',
  footerDescription: 'Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on AtlasBasket.',
  seoTitle: 'AtlasBasket',
  seoDescription: 'Discover local artisans, handcrafted items, and custom products on AtlasBasket.',
  browserTitle: 'AtlasBasket',
};

const str = (value: unknown, fallback: string | undefined): string =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : (fallback || '');

const cleanUrl = (url: unknown): string => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '/images/logo.png' || trimmed === '/favicon.ico') return '';
  return trimmed;
};

export const normalizeBranding = (d: any): BrandingData => {
  const nameVal = d?.customerTitle || d?.brandName || d?.name || d?.marketplaceName || DEFAULT_BRANDING.name;
  const rawLogo = cleanUrl(d?.logo) || cleanUrl(d?.logoUrl) || DEFAULT_BRANDING.logo;
  const logoVal = rawLogo;
  const rawFavicon = cleanUrl(d?.favicon) || cleanUrl(d?.faviconUrl) || rawLogo;
  const faviconVal = rawFavicon;
  const taglineVal = str(d?.tagline, DEFAULT_BRANDING.tagline);
  return {
    name: nameVal,
    marketplaceName: str(d?.marketplaceName, str(d?.brandName, nameVal)),
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: str(d?.shortName, nameVal),
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    heroBadge: str(d?.heroBadge, DEFAULT_BRANDING.heroBadge),
    heroHeadingLine1: str(d?.heroHeadingLine1, DEFAULT_BRANDING.heroHeadingLine1),
    heroHeadingLine2: str(d?.heroHeadingLine2, DEFAULT_BRANDING.heroHeadingLine2),
    heroHeadingLine3: str(d?.heroHeadingLine3, DEFAULT_BRANDING.heroHeadingLine3),
    heroDescription: str(d?.heroDescription, DEFAULT_BRANDING.heroDescription),
    searchPlaceholder: str(d?.searchPlaceholder, DEFAULT_BRANDING.searchPlaceholder),
    exploreShopsButtonText: str(d?.exploreShopsButtonText, DEFAULT_BRANDING.exploreShopsButtonText),
    browseProductsButtonText: str(d?.browseProductsButtonText, DEFAULT_BRANDING.browseProductsButtonText),
    footerDescription: str(d?.footerDescription, DEFAULT_BRANDING.footerDescription),
    seoTitle: str(d?.seoTitle, DEFAULT_BRANDING.seoTitle),
    seoDescription: str(d?.seoDescription, DEFAULT_BRANDING.seoDescription),
    browserTitle: str(d?.browserTitle, DEFAULT_BRANDING.browserTitle),
    updatedAt: d?.updatedAt,
  };
};

const BRANDING_ENDPOINTS = [
  '/api/branding/public',
  '/api/branding',
];

export const fetchBranding = async (client: AxiosInstance): Promise<BrandingData> => {
  for (const url of BRANDING_ENDPOINTS) {
    try {
      const res = await client.get(url, { params: { app: 'customer' }, timeout: 4000 });
      if (res?.data) return normalizeBranding(res.data);
    } catch {
      // Try the next endpoint; ultimately fall back to DEFAULT_BRANDING.
    }
  }
  return DEFAULT_BRANDING;
};
