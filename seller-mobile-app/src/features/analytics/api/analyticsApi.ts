import axiosInstance from '@/lib/axios/axiosInstance';

export interface DashboardMetrics {
  totalProducts: number;
  activeProducts: number;
  deletedProducts: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  readyToShipOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  lowStockProducts: number;
  totalRevenue: number;
  monthlyRevenue: number;
  "today'sRevenue": number;
  totalSales: number;
  revenue: number;
  platformCommission: number;
  netEarnings: number;
  todaysOrders: number;
  completedOrders: number;
  packingFeeCollectedToday?: number;
  packingFeeCollectedThisMonth?: number;
  packingFeeCollectedLifetime?: number;
}

export interface SalesSummary {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  yearlySales: number;
}

export interface MonthlyRevenueResponse {
  month: string;
  year: number;
  revenue: Record<string, number>;
}

export interface TopSellingProduct {
  product: {
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
  };
  quantitySold: number;
}

export const analyticsApi = {
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const response = await axiosInstance.get('/seller/api/analytics/dashboard');
    return response.data;
  },

  getSalesSummary: async (): Promise<SalesSummary> => {
    const response = await axiosInstance.get('/seller/api/analytics/sales-summary');
    return response.data;
  },

  getMonthlyRevenue: async (): Promise<MonthlyRevenueResponse> => {
    const response = await axiosInstance.get('/seller/api/analytics/monthly-revenue');
    return response.data;
  },

  getTopSellingProducts: async (limit = 10): Promise<{ products: TopSellingProduct[] }> => {
    const response = await axiosInstance.get('/seller/api/analytics/top-selling', {
      params: { limit },
    });
    return response.data;
  },
};
