import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analyticsApi';
import { analyticsService } from '../services/analyticsService';

export function useAnalytics() {
  const metricsQuery = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {
      try {
        return await analyticsApi.getDashboardMetrics();
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  const salesSummaryQuery = useQuery({
    queryKey: ['analytics-sales-summary'],
    queryFn: async () => {
      try {
        return await analyticsApi.getSalesSummary();
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  const monthlyRevenueQuery = useQuery({
    queryKey: ['analytics-monthly-revenue'],
    queryFn: async () => {
      try {
        return await analyticsApi.getMonthlyRevenue();
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const topSellingQuery = useQuery({
    queryKey: ['analytics-top-selling'],
    queryFn: async () => {
      try {
        return await analyticsApi.getTopSellingProducts();
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const chartData = monthlyRevenueQuery.data?.revenue
    ? analyticsService.transformRevenueData(monthlyRevenueQuery.data.revenue)
    : [];

  return {
    metrics: metricsQuery.data ?? null,
    isLoadingMetrics: metricsQuery.isLoading,
    isErrorMetrics: metricsQuery.isError,

    salesSummary: salesSummaryQuery.data ?? null,
    isLoadingSales: salesSummaryQuery.isLoading,

    monthlyRevenue: monthlyRevenueQuery.data ?? null,
    chartData,
    isLoadingRevenue: monthlyRevenueQuery.isLoading,

    topSelling: topSellingQuery.data?.products ?? [],
    isLoadingTop: topSellingQuery.isLoading,
  };
}
