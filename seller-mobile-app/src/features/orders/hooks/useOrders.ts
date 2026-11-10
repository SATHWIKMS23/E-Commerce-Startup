import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';

export function useOrders(orderId?: string) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await ordersApi.getOrders();
      return res.orders;
    },
    staleTime: 30 * 1000,
  });

  const orderDetailQuery = useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await ordersApi.getOrder(orderId);
      return res.order;
    },
    enabled: !!orderId,
  });

  const timelineQuery = useQuery({
    queryKey: ['orders', orderId, 'timeline'],
    queryFn: async () => {
      if (!orderId) return [];
      const res = await ordersApi.getOrderTimeline(orderId);
      return res.timeline;
    },
    enabled: !!orderId,
  });

  const deliveryMethodsQuery = useQuery({
    queryKey: ['allowed-delivery-methods'],
    queryFn: async () => {
      const res = await ordersApi.getAllowedDeliveryMethods();
      return res.deliveryMethods;
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: ordersApi.acceptOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ordersApi.rejectOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const setReadyTimeMutation = useMutation({
    mutationFn: ({ id, readyByAt }: { id: string; readyByAt: string }) =>
      ordersApi.setReadyTime(id, readyByAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const assignDeliveryMethodMutation = useMutation({
    mutationFn: ({ id, deliveryMethod }: { id: string; deliveryMethod: string }) =>
      ordersApi.assignDeliveryMethod(id, deliveryMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const uploadPackingProofMutation = useMutation({
    mutationFn: ({ id, imageUrls, notes }: { id: string; imageUrls: string[]; notes?: string }) =>
      ordersApi.uploadPackingProof(id, imageUrls, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const markPackedMutation = useMutation({
    mutationFn: ordersApi.markPacked,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const markShippedMutation = useMutation({
    mutationFn: ordersApi.markShipped,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: ordersApi.markDelivered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const markCodCollectedMutation = useMutation({
    mutationFn: ordersApi.markCodCollected,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    refetch: ordersQuery.refetch,

    order: orderDetailQuery.data ?? null,
    isLoadingDetails: orderDetailQuery.isLoading,
    isErrorDetails: orderDetailQuery.isError,

    timeline: timelineQuery.data ?? [],
    allowedDeliveryMethods: deliveryMethodsQuery.data ?? [],

    acceptOrder: acceptOrderMutation.mutateAsync,
    isAccepting: acceptOrderMutation.isPending,

    rejectOrder: rejectOrderMutation.mutateAsync,
    isRejecting: rejectOrderMutation.isPending,

    setReadyTime: setReadyTimeMutation.mutateAsync,
    isSettingReadyTime: setReadyTimeMutation.isPending,

    assignDeliveryMethod: assignDeliveryMethodMutation.mutateAsync,
    isAssigningDeliveryMethod: assignDeliveryMethodMutation.isPending,

    uploadPackingProof: uploadPackingProofMutation.mutateAsync,
    isUploadingProof: uploadPackingProofMutation.isPending,

    markPacked: markPackedMutation.mutateAsync,
    isMarkingPacked: markPackedMutation.isPending,

    markShipped: markShippedMutation.mutateAsync,
    isMarkingShipped: markShippedMutation.isPending,

    markDelivered: markDeliveredMutation.mutateAsync,
    isMarkingDelivered: markDeliveredMutation.isPending,

    markCodCollected: markCodCollectedMutation.mutateAsync,
    isMarkingCodCollected: markCodCollectedMutation.isPending,
  };
}
