import axiosInstance from '@/lib/axios/axiosInstance';

export interface CustomOrderFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'STL' | 'STEP' | 'OBJ' | 'PDF' | 'IMAGE' | 'OTHER';
  fileSizeBytes: number;
  mimeType?: string;
}

export interface CustomOrderQuote {
  id: string;
  sellerId: string;
  quotedPrice: number;
  estimatedDays: number;
  validUntil: string;
  notes?: string;
  isAccepted: boolean;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface CustomOrder {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  material?: string;
  quantity: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'QUOTING' | 'QUOTED' | 'ACCEPTED' | 'CANCELLED';
  submittedAt: string;
  files: CustomOrderFile[];
  quotes: CustomOrderQuote[];
  timelineEvents?: any[];
}

export const customOrderApi = {
  getOrders: async (): Promise<{ count: number; customOrders: CustomOrder[] }> => {
    const response = await axiosInstance.get('/seller/api/custom-orders');
    return response.data;
  },

  getOrder: async (id: string): Promise<{ customOrder: CustomOrder }> => {
    const response = await axiosInstance.get(`/seller/api/custom-orders/${id}`);
    return response.data;
  },

  acceptOrder: async (id: string): Promise<{ message: string; customOrder: CustomOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/custom-orders/${id}/accept`);
    return response.data;
  },

  rejectOrder: async (id: string, reason: string): Promise<{ message: string; customOrder: CustomOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/custom-orders/${id}/reject`, { reason });
    return response.data;
  },

  sendQuotation: async (
    orderId: string,
    payload: {
      quotedPrice: number;
      estimatedDays: number;
      notes?: string;
      validUntil: string;
    }
  ): Promise<{ message: string; quote: CustomOrderQuote }> => {
    const response = await axiosInstance.post(`/seller/api/custom-orders/${orderId}/quote`, payload);
    return response.data;
  },

  updateQuotation: async (
    orderId: string,
    payload: {
      quotedPrice?: number;
      estimatedDays?: number;
      notes?: string;
      validUntil?: string;
    }
  ): Promise<{ message: string; quote: CustomOrderQuote }> => {
    const response = await axiosInstance.put(`/seller/api/custom-orders/${orderId}/quote`, payload);
    return response.data;
  },

  deleteQuotation: async (orderId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/seller/api/custom-orders/${orderId}/quote`);
    return response.data;
  },
};
