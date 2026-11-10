import axiosInstance from '@/lib/axios/axiosInstance';

export interface PayoutRecord {
  id: string;
  sellerId: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payoutMethod?: string;
  transactionRef?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PayoutSummary {
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
  deliveredOrdersCount: number;
  pendingPayoutsCount: number;
  completedPayoutsCount: number;
}

export const payoutApi = {
  getPayoutHistory: async (): Promise<{ count: number; payouts: PayoutRecord[] }> => {
    const response = await axiosInstance.get('/seller/api/payouts/history');
    return response.data;
  },

  getPendingPayouts: async (): Promise<{ count: number; payouts: PayoutRecord[] }> => {
    const response = await axiosInstance.get('/seller/api/payouts/pending');
    return response.data;
  },

  getCompletedPayouts: async (): Promise<{ count: number; payouts: PayoutRecord[] }> => {
    const response = await axiosInstance.get('/seller/api/payouts/completed');
    return response.data;
  },

  getEarningsSummary: async (): Promise<PayoutSummary> => {
    const response = await axiosInstance.get('/seller/api/payouts/summary');
    return response.data;
  },
};
