import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customOrderApi } from '../api/customOrderApi';

export function useCustomOrders(orderId?: string) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['custom-orders'],
    queryFn: async () => {
      const res = await customOrderApi.getOrders();
      return res.customOrders;
    },
    staleTime: 30 * 1000,
  });

  const orderDetailQuery = useQuery({
    queryKey: ['custom-orders', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await customOrderApi.getOrder(orderId);
      return res.customOrder;
    },
    enabled: !!orderId,
  });

  const acceptMutation = useMutation({
    mutationFn: customOrderApi.acceptOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customOrderApi.rejectOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });

  const sendQuotationMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      customOrderApi.sendQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      customOrderApi.updateQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: customOrderApi.deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });

  return {
    customOrders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    refetch: ordersQuery.refetch,

    order: orderDetailQuery.data ?? null,
    isLoadingDetail: orderDetailQuery.isLoading,

    acceptOrder: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,

    rejectOrder: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,

    sendQuotation: sendQuotationMutation.mutateAsync,
    isSendingQuote: sendQuotationMutation.isPending,

    updateQuotation: updateQuotationMutation.mutateAsync,
    isUpdatingQuote: updateQuotationMutation.isPending,

    deleteQuotation: deleteQuotationMutation.mutateAsync,
    isDeletingQuote: deleteQuotationMutation.isPending,
  };
}
