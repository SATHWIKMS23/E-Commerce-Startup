import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

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
}

export const DEFAULT_BRANDING: BrandingData = {
  name: 'Atlas Basket',
  marketplaceName: 'Atlas Basket',
  logo: 'https://res.cloudinary.com/dexsh34w/image/upload/v1793735854/branding/jx2msikhugt4wy2i19vr.jpg',
  favicon: 'https://res.cloudinary.com/dexsh34w/image/upload/v1793735861/branding/eflv6srkpg0n5xhyujpn.jpg',
  tagline: 'BY THE LOCAL FOR THE LOCAL',
  shortName: 'Atlas Basket',
  logoUrl: 'https://res.cloudinary.com/dexsh34w/image/upload/v1793735854/branding/jx2msikhugt4wy2i19vr.jpg',
  faviconUrl: 'https://res.cloudinary.com/dexsh34w/image/upload/v1793735861/branding/eflv6srkpg0n5xhyujpn.jpg',
  heroBadge: 'BY LOCAL PEOPLE - FOR THE LOCAL PEOPLE',
  heroHeadingLine1: 'Buy Anything.',
  heroHeadingLine2: 'From Anyone.',
  heroHeadingLine3: 'Near You.',
  heroDescription: 'Atlas Basket is your local marketplace for everything — fashion, prints, crafts, and beyond. Discover creators. Support neighbours.',
  searchPlaceholder: 'Search products, shops on Marketplace…',
  exploreShopsButtonText: 'Explore Shops',
  browseProductsButtonText: 'Browse Products',
  footerDescription: 'Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on Marketplace.',
  seoTitle: 'Atlas Basket',
  seoDescription: 'Discover local artisans, handcrafted items, and custom products.',
  browserTitle: 'Atlas Basket',
};

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;

export const normalizeBranding = (d: any): BrandingData => {
  const nameVal = d?.customerTitle || d?.brandName || d?.name || d?.marketplaceName || DEFAULT_BRANDING.name;
  const rawLogo = d?.logo || d?.logoUrl || DEFAULT_BRANDING.logo;
  const rawFavicon = d?.favicon || d?.faviconUrl || rawLogo;
  const taglineVal = str(d?.tagline, DEFAULT_BRANDING.tagline);

  return {
    name: nameVal,
    marketplaceName: str(d?.marketplaceName, nameVal),
    logo: rawLogo,
    favicon: rawFavicon,
    tagline: taglineVal,
    shortName: str(d?.shortName, nameVal),
    logoUrl: rawLogo,
    faviconUrl: rawFavicon,
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
  };
};

export const brandingService = {
  fetchBranding: async (): Promise<BrandingData> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.branding.public, {
        params: { app: 'customer' },
        timeout: 4000,
      });
      return normalizeBranding(res.data);
    } catch {
      try {
        const fallbackRes = await axiosInstance.get(API_ROUTES.branding.main, { timeout: 4000 });
        return normalizeBranding(fallbackRes.data);
      } catch {
        return DEFAULT_BRANDING;
      }
    }
  },
};
