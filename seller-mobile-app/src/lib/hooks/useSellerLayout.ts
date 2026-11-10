import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { DEFAULT_SELLER_BRANDING, fetchBranding, normalizeBranding } from '@/lib/services/brandingService';
import type { BrandingConfig } from '@/lib/services/brandingService';

export interface UiLayoutItem {
  id: string;
  name: string;
  enabled?: boolean;
  path?: string;
  icon?: string;
}

export type { BrandingConfig };

export interface SellerLayout {
  branding: BrandingConfig;
  sidebar: UiLayoutItem[];
  dashboardWidgets: UiLayoutItem[];
  quickActions: UiLayoutItem[];
  dashboardCards: UiLayoutItem[];
}

export const DEFAULT_SIDEBAR: UiLayoutItem[] = [
  { id: 'side-dashboard', name: 'Dashboard', path: '/dashboard', enabled: true },
  { id: 'side-products', name: 'Products', path: '/products', enabled: true },
  { id: 'side-orders', name: 'Orders', path: '/orders', enabled: true },
  { id: 'side-custom-orders', name: 'Custom Requests', path: '/custom-orders', enabled: true },
  { id: 'side-analytics', name: 'Analytics', path: '/analytics', enabled: true },
  { id: 'side-payouts', name: 'Payouts', path: '/payouts', enabled: true },
  { id: 'side-reviews', name: 'Reviews', path: '/reviews', enabled: true },
  { id: 'side-enforcement', name: 'Compliance & Strikes', path: '/enforcement', enabled: true },
  { id: 'side-policies', name: 'Policy Bulletins', path: '/policies', enabled: true },
  { id: 'side-commission', name: 'Commission Statements', path: '/commission-statements', enabled: true },
  { id: 'side-support-chat', name: 'Support & Helpdesk', path: '/support-chat', enabled: true },
  { id: 'side-profile', name: 'Seller Profile', path: '/profile', enabled: true },
  { id: 'side-shop', name: 'Shop & Bank', path: '/shop', enabled: true },
  { id: 'side-settings', name: 'Settings', path: '/settings', enabled: true },
];

export const DEFAULT_WIDGETS: UiLayoutItem[] = [
  { id: 'widget-revenue', name: 'Revenue Summary', enabled: true },
  { id: 'widget-orders', name: 'Recent Incoming Orders', enabled: true },
];

export const DEFAULT_QUICK_ACTIONS: UiLayoutItem[] = [
  { id: 'action-add-product', name: 'Add catalog item', path: '/products', enabled: true },
  { id: 'action-quote-custom', name: 'Quote custom requests', path: '/custom-orders', enabled: true },
  { id: 'action-link-bank', name: 'Link settlement bank', path: '/shop', enabled: true },
];

export const DEFAULT_CARDS: UiLayoutItem[] = [
  { id: 'card-gross-sales', name: 'Gross Sales', enabled: true },
  { id: 'card-net-earnings', name: 'Net Earnings', enabled: true },
  { id: 'card-commission', name: 'Platform Commission', enabled: true },
  { id: 'card-packing-fee', name: 'Packing Fee Collected', enabled: true },
  { id: 'card-delivered-revenue', name: 'Delivered Revenue', enabled: true },
  { id: 'card-todays-orders', name: "Today's Orders", enabled: true },
  { id: 'card-pending-orders', name: 'Pending Orders', enabled: true },
  { id: 'card-completed-orders', name: 'Completed Orders', enabled: true },
  { id: 'card-cancelled-orders', name: 'Cancelled Orders', enabled: true },
];

const onlyEnabled = (items: UiLayoutItem[]): UiLayoutItem[] =>
  items.filter((item) => item.enabled !== false);

export function useSellerLayout() {
  const { data: brandingData, isLoading, isError } = useQuery<BrandingConfig>({
    queryKey: ['public-branding', 'seller'],
    queryFn: async () => {
      const branding = await fetchBranding(axiosInstance, 'seller');
      return normalizeBranding(branding, DEFAULT_SELLER_BRANDING);
    },
    staleTime: 10 * 60 * 1000,
  });

  const branding: BrandingConfig = brandingData ?? normalizeBranding(null, DEFAULT_SELLER_BRANDING);

  return {
    branding,
    sidebar: onlyEnabled(DEFAULT_SIDEBAR),
    dashboardWidgets: onlyEnabled(DEFAULT_WIDGETS),
    quickActions: onlyEnabled(DEFAULT_QUICK_ACTIONS),
    dashboardCards: onlyEnabled(DEFAULT_CARDS),
    isLoading,
    isError,
  };
}
