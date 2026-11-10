import { useQuery } from '@tanstack/react-query';
import { payoutApi } from '../api/payoutApi';

export function usePayouts() {
  const historyQuery = useQuery({
    queryKey: ['payouts-history'],
    queryFn: async () => {
      const res = await payoutApi.getPayoutHistory();
      return res.payouts;
    },
    staleTime: 30 * 1000,
  });

  const pendingQuery = useQuery({
    queryKey: ['payouts-pending'],
    queryFn: async () => {
      const res = await payoutApi.getPendingPayouts();
      return res.payouts;
    },
    staleTime: 30 * 1000,
  });

  const completedQuery = useQuery({
    queryKey: ['payouts-completed'],
    queryFn: async () => {
      const res = await payoutApi.getCompletedPayouts();
      return res.payouts;
    },
    staleTime: 30 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ['payouts-summary'],
    queryFn: payoutApi.getEarningsSummary,
    staleTime: 30 * 1000,
  });

  return {
    payouts: historyQuery.data ?? [],
    pendingPayouts: pendingQuery.data ?? [],
    completedPayouts: completedQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    isLoadingSummary: summaryQuery.isLoading,
    isLoading: historyQuery.isLoading,
  };
}
