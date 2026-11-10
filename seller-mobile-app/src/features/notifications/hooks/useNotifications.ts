import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, type SidebarBadges } from '../api/notificationApi';

export function useNotifications(options?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}) {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', options],
    queryFn: () => notificationApi.getNotifications(options),
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const readAllMutation = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });

  const readMutation = useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationApi.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });

  const raw = notificationsQuery.data;
  const notifications = raw?.notifications ?? [];
  const unreadCount = raw?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    count: raw?.count ?? notifications.length,
    page: raw?.page ?? 1,
    limit: raw?.limit ?? 20,
    totalPages: raw?.totalPages ?? 1,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    refetch: notificationsQuery.refetch,

    markAllRead: readAllMutation.mutateAsync,
    isMarkingAllRead: readAllMutation.isPending,

    markRead: readMutation.mutateAsync,
    isMarkingRead: readMutation.isPending,

    deleteNotification: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useSidebarBadges() {
  const query = useQuery({
    queryKey: ['sidebar-badges'],
    queryFn: () => notificationApi.getSidebarBadges(),
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const defaultBadges: SidebarBadges = {
    orders: 0,
    customRequests: 0,
    payouts: 0,
    reviews: 0,
    compliance: 0,
    policies: 0,
    commissionStatements: 0,
    support: 0,
    shop: 0,
    notifications: 0,
  };

  return {
    badges: query.data?.badges ?? defaultBadges,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
