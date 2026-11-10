import axiosInstance from '@/lib/axios/axiosInstance';

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    name: string;
    imageUrl?: string;
  };
}

export interface SellerOrder {
  id: string;
  orderId: string;
  sellerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod?: string;
  selectedDeliveryMethod?: string;
  deliveryAssignedAt?: string;
  deliveryAssignedBy?: string;
  deliveryMode?: 'PLATFORM' | 'SELF';
  totalPrice: number;
  subtotal: number;
  packingFee: number;
  shippingAmount: number;
  taxAmount: number;
  platformCommission: number;
  sellerEarnings: number;
  createdAt: string;
  acceptedAt?: string;
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  readyByAt?: string;
  rejectionReason?: string;
  seller?: {
    firstName: string;
    lastName: string;
    shop?: {
      name: string;
      businessName?: string | null;
      gstNumber?: string | null;
      gstRegistered?: boolean;
      supportEmail?: string | null;
      supportPhone?: string | null;
      logoUrl?: string | null;
    } | null;
  } | null;
  order: {
    orderNumber: string;
    shippingAddress: any;
    customerEmail?: string;
    customerPhone?: string;
    paymentMethod?: string;
    payments?: any[];
    codCollected?: boolean;
    codCollectedAt?: string | null;
    codCollectedBy?: string | null;
  };
  items: OrderItem[];
  packingProof?: {
    id: string;
    imageUrls: string[];
    notes?: string;
  };
  delivery?: any;
  timelineEvents?: any[];
}

export interface DeliveryMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  enabled: boolean;
}

export const ordersApi = {
  getOrders: async (): Promise<{ count: number; orders: SellerOrder[] }> => {
    const response = await axiosInstance.get('/seller/api/orders');
    return response.data;
  },

  getOrder: async (orderId: string): Promise<{ order: SellerOrder }> => {
    const response = await axiosInstance.get(`/seller/api/orders/${orderId}`);
    return response.data;
  },

  acceptOrder: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/accept`);
    return response.data;
  },

  rejectOrder: async (orderId: string, reason: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/reject`, { reason });
    return response.data;
  },

  setReadyTime: async (orderId: string, readyByAt: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/ready-time`, { readyByAt });
    return response.data;
  },

  assignDeliveryMethod: async (orderId: string, deliveryMethod: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/delivery-method`, { deliveryMethod });
    return response.data;
  },

  getAllowedDeliveryMethods: async (): Promise<{ deliveryMethods: DeliveryMethod[] }> => {
    const response = await axiosInstance.get('/seller/api/orders/allowed-delivery-methods');
    return response.data;
  },

  uploadPackingProof: async (
    orderId: string,
    imageUrls: string[],
    notes?: string
  ): Promise<{ message: string; packingProof: any }> => {
    const response = await axiosInstance.post(`/seller/api/orders/${orderId}/packing-proof`, {
      imageUrls,
      notes,
    });
    return response.data;
  },

  markPacked: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/packed`);
    return response.data;
  },

  markShipped: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/shipped`);
    return response.data;
  },

  markDelivered: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/delivered`);
    return response.data;
  },

  markCodCollected: async (orderId: string): Promise<{ message: string; paymentStatus: string }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/mark-cod-collected`);
    return response.data;
  },

  getOrderTimeline: async (orderId: string): Promise<{ count: number; timeline: any[] }> => {
    const response = await axiosInstance.get(`/seller/api/orders/${orderId}/timeline`);
    return response.data;
  },
};
