import axiosInstance from '@/lib/axios/axiosInstance';

export interface NotificationRecord {
  id: string;
  sellerId?: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  isRead: boolean;
  data?: any;
  route?: string | null;
  createdAt: string;
}

export interface SidebarBadges {
  orders: number;
  customRequests: number;
  payouts: number;
  reviews: number;
  compliance: number;
  policies: number;
  commissionStatements: number;
  support: number;
  shop: number;
  notifications: number;
}

export interface NotificationListResponse {
  count: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
  notifications: NotificationRecord[];
}

export const notificationApi = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<NotificationListResponse> => {
    const response = await axiosInstance.get('/seller/api/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await axiosInstance.get('/seller/api/notifications/unread-count');
    return response.data;
  },

  getSidebarBadges: async (): Promise<{ badges: SidebarBadges }> => {
    const response = await axiosInstance.get('/seller/api/sidebar-badges');
    return response.data;
  },

  markAllRead: async (): Promise<{ message: string; count?: number }> => {
    const response = await axiosInstance.patch('/seller/api/notifications/read-all');
    return response.data;
  },

  markRead: async (id: string): Promise<{ message: string; notification: NotificationRecord }> => {
    const response = await axiosInstance.patch(`/seller/api/notifications/${id}/read`);
    return response.data;
  },

  deleteNotification: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/seller/api/notifications/${id}`);
    return response.data;
  },
};
