import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface Shop {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  rating?: number;
  productCount?: number;
  defaultPickupAddress?: {
    city: string;
    state: string;
    addressLine1?: string;
  };
  products?: any[];
  categories?: any[];
}

export const shopService = {
  getFeaturedShops: async (limit: number = 24): Promise<{ shops: Shop[] }> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.shops.featured, {
        params: { limit },
      });
      return { shops: res.data?.shops || res.data || [] };
    } catch {
      return { shops: [] };
    }
  },

  getNearbyShops: async (limit: number = 12): Promise<{ shops: Shop[] }> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.shops.nearby, {
        params: { limit },
      });
      return { shops: res.data?.shops || res.data || [] };
    } catch {
      return { shops: [] };
    }
  },

  getShops: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ shops: Shop[]; totalPages: number }> => {
    const url = params?.search ? API_ROUTES.shops.search : API_ROUTES.shops.list;
    const res = await axiosInstance.get(url, {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 12,
        q: params?.search,
      },
    });
    return {
      shops: res.data?.shops || res.data || [],
      totalPages: res.data?.totalPages || 1,
    };
  },

  getShopDetails: async (slugOrId: string): Promise<Shop> => {
    const res = await axiosInstance.get(API_ROUTES.shops.bySlug(slugOrId));
    return res.data?.shop || res.data;
  },

  getPlaceholderBanner: (name: string): string => {
    const hash = (name || 'AtlasBasket').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = [
      'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
      'linear-gradient(135deg, #09090b 0%, #1c1917 100%)',
      'linear-gradient(135deg, #1e1b4b 0%, #172554 100%)',
      'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
    ];
    return hues[hash % hues.length];
  },
};
