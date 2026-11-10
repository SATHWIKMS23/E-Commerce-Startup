import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  route?: string;
  data?: any;
}

export const notificationService = {
  getNotifications: async (): Promise<{ notifications: NotificationItem[]; unreadCount: number }> => {
    const res = await axiosInstance.get(API_ROUTES.notifications.list);
    const notifications = res.data?.notifications || res.data || [];
    const unreadCount = res.data?.unreadCount ?? notifications.filter((n: NotificationItem) => !n.isRead).length;
    return { notifications, unreadCount };
  },

  markRead: async (id: string): Promise<any> => {
    const res = await axiosInstance.patch(API_ROUTES.notifications.markRead(id));
    return res.data;
  },

  markAllRead: async (): Promise<any> => {
    const res = await axiosInstance.patch(API_ROUTES.notifications.markAllRead);
    return res.data;
  },

  deleteNotification: async (id: string): Promise<any> => {
    const res = await axiosInstance.delete(API_ROUTES.notifications.delete(id));
    return res.data;
  },
};
