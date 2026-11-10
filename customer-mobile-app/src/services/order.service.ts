import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  productImage?: string;
}

export interface SellerOrder {
  id: string;
  sellerId: string;
  shopName: string;
  status: string;
  subtotal: number | string;
  shippingFee: number | string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: string;
  grandTotal: number | string;
  subtotal: number | string;
  shippingTotal: number | string;
  discountTotal?: number | string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  sellerOrders?: SellerOrder[];
  payments?: Array<{
    id: string;
    status: string;
    amount: number | string;
  }>;
}

export const orderService = {
  getOrders: async (): Promise<Order[]> => {
    const res = await axiosInstance.get(API_ROUTES.orders.list);
    return res.data?.orders || [];
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await axiosInstance.get(API_ROUTES.orders.byId(id));
    return res.data?.order || res.data;
  },

  createOrder: async (payload: any): Promise<Order> => {
    const res = await axiosInstance.post(API_ROUTES.orders.create, payload);
    return res.data?.order || res.data;
  },

  formatStatus: (status: string): string => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'CONFIRMED': return 'Confirmed';
      case 'PROCESSING': return 'Processing';
      case 'SHIPPED': return 'Shipped';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  },

  getStatusBadgeColor: (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'DELIVERED':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' };
      case 'SHIPPED':
      case 'PROCESSING':
      case 'CONFIRMED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' };
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.10)', text: '#e4e4e7' };
    }
  },
};
