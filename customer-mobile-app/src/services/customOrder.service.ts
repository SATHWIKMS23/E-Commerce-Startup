import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface CustomOrderQuote {
  id: string;
  sellerId: string;
  sellerShopName?: string;
  price: number | string;
  leadTimeDays: number;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface CustomOrder {
  id: string;
  title: string;
  description: string;
  material?: string;
  quantity: number;
  status: 'OPEN' | 'QUOTED' | 'ACCEPTED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  attachments?: Array<{
    id?: string;
    url: string;
    filename?: string;
  }>;
  quotes?: CustomOrderQuote[];
  shippingAddress?: {
    fullName: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export const customOrderService = {
  getCustomOrders: async (): Promise<CustomOrder[]> => {
    const res = await axiosInstance.get(API_ROUTES.customOrders.list);
    return res.data?.customOrders || res.data || [];
  },

  getCustomOrderById: async (id: string): Promise<CustomOrder> => {
    const res = await axiosInstance.get(API_ROUTES.customOrders.byId(id));
    return res.data?.customOrder || res.data;
  },

  createCustomOrder: async (payload: {
    title: string;
    description: string;
    material?: string;
    quantity: number;
    shippingAddressId?: string;
    attachments?: Array<{ url: string; filename?: string }>;
  }): Promise<CustomOrder> => {
    const res = await axiosInstance.post(API_ROUTES.customOrders.create, payload);
    return res.data?.customOrder || res.data;
  },

  cancelCustomOrder: async (id: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.customOrders.cancel(id));
    return res.data;
  },

  acceptQuote: async (id: string, quoteId: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.customOrders.acceptQuote(id, quoteId));
    return res.data;
  },

  rejectQuote: async (id: string, quoteId: string, reason?: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.customOrders.rejectQuote(id, quoteId), {
      reason,
    });
    return res.data;
  },
};
