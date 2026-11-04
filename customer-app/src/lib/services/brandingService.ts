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
  name: '',
  marketplaceName: '',
  logo: '',
  favicon: '',
  tagline: '',
  shortName: '',
  logoUrl: '',
  faviconUrl: '',
  heroBadge: '',
  heroHeadingLine1: '',
  heroHeadingLine2: '',
  heroHeadingLine3: '',
  heroDescription: '',
  searchPlaceholder: '',
  exploreShopsButtonText: '',
  browseProductsButtonText: '',
  footerDescription: '',
  seoTitle: '',
  seoDescription: '',
  browserTitle: '',
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
  const nameVal = d?.customerTitle || d?.brandName || d?.name || d?.marketplaceName || '';
  const rawLogo = cleanUrl(d?.logo) || cleanUrl(d?.logoUrl) || '';
  const logoVal = rawLogo;
  const rawFavicon = cleanUrl(d?.favicon) || cleanUrl(d?.faviconUrl) || rawLogo;
  const faviconVal = rawFavicon;
  const taglineVal = str(d?.tagline, '');
  return {
    name: nameVal,
    marketplaceName: str(d?.marketplaceName, str(d?.brandName, nameVal)),
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: str(d?.shortName, nameVal),
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    heroBadge: str(d?.heroBadge, ''),
    heroHeadingLine1: str(d?.heroHeadingLine1, ''),
    heroHeadingLine2: str(d?.heroHeadingLine2, ''),
    heroHeadingLine3: str(d?.heroHeadingLine3, ''),
    heroDescription: str(d?.heroDescription, ''),
    searchPlaceholder: str(d?.searchPlaceholder, ''),
    exploreShopsButtonText: str(d?.exploreShopsButtonText, ''),
    browseProductsButtonText: str(d?.browseProductsButtonText, ''),
    footerDescription: str(d?.footerDescription, ''),
    seoTitle: str(d?.seoTitle, nameVal),
    seoDescription: str(d?.seoDescription, ''),
    browserTitle: str(d?.browserTitle, nameVal),
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
      const res = await client.get(url, { params: { app: 'customer' } });
      if (res?.data) return normalizeBranding(res.data);
    } catch {
      // Try the next endpoint; ultimately fall back to DEFAULT_BRANDING.
    }
  }
  return DEFAULT_BRANDING;
};
