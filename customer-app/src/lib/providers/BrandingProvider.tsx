'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { fetchBranding, normalizeBranding, DEFAULT_BRANDING } from '@/lib/services/brandingService';
import type { BrandingData } from '@/lib/services/brandingService';

export type { BrandingData };

const BrandingContext = createContext<{
  branding: BrandingData;
  isLoading: boolean;
  refetchBranding: () => void;
}>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  refetchBranding: () => {},
});

const CACHE_KEY = 'atlasbasket_public_branding';

function getInitialCachedBranding(): BrandingData {
  if (typeof window === 'undefined') return DEFAULT_BRANDING;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return normalizeBranding(parsed);
      }
    }
  } catch {}
  return DEFAULT_BRANDING;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, isLoading, refetch } = useQuery<BrandingData>({
    queryKey: ['public-branding', 'customer'],
    queryFn: async () => {
      const branding = await fetchBranding(axiosInstance);
      const normalized = normalizeBranding(branding);
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
        }
      } catch {}
      return normalized;
    },
    initialData: getInitialCachedBranding,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const branding = data || DEFAULT_BRANDING;

  // Primary effect to sync title and meta tags when pathname or branding updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targetTitle = branding.browserTitle || branding.name;
    if (targetTitle) {
      if (!document.title || document.title === 'Marketplace' || document.title.trim() === '') {
        document.title = targetTitle;
      }
    }

    const faviconUrl = branding.faviconUrl || branding.favicon || branding.logo;
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }

    let appNameMeta: HTMLMetaElement | null = document.querySelector("meta[name='application-name']");
    if (!appNameMeta) {
      appNameMeta = document.createElement('meta');
      appNameMeta.name = 'application-name';
      document.getElementsByTagName('head')[0].appendChild(appNameMeta);
    }
    appNameMeta.content = branding.name;

    let ogSiteMeta: HTMLMetaElement | null = document.querySelector("meta[property='og:site_name']");
    if (!ogSiteMeta) {
      ogSiteMeta = document.createElement('meta');
      ogSiteMeta.setAttribute('property', 'og:site_name');
      document.getElementsByTagName('head')[0].appendChild(ogSiteMeta);
    }
    ogSiteMeta.content = branding.name;
  }, [pathname, branding.name, branding.browserTitle, branding.faviconUrl, branding.favicon, branding.logo]);

  // MutationObserver to ensure Next.js App Router title reconciliation never reverts to static fallback 'Marketplace'
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetTitle = branding.browserTitle || branding.name;
    if (!targetTitle) return;

    const syncTitle = () => {
      if (document.title === 'Marketplace' || !document.title || document.title.trim() === '') {
        document.title = targetTitle;
      }
    };

    syncTitle();

    const headElement = document.querySelector('head');
    if (!headElement) return;

    const observer = new MutationObserver(() => {
      syncTitle();
    });

    observer.observe(headElement, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
    };
  }, [branding.browserTitle, branding.name]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refetchBranding: refetch }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
