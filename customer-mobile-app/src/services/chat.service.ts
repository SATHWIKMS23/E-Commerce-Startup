import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  subject?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  orderId?: string;
  order?: {
    orderNumber: string;
  };
}

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.chat.conversations);
      return res.data?.conversations || [];
    } catch {
      return [];
    }
  },

  getConversationMessages: async (convId: string): Promise<ChatMessage[]> => {
    const res = await axiosInstance.get(API_ROUTES.chat.messages(convId));
    return res.data?.messages || [];
  },

  sendMessage: async (convId: string, message: string, attachments?: string[]): Promise<ChatMessage> => {
    const res = await axiosInstance.post(API_ROUTES.chat.messages(convId), {
      message,
      attachments,
    });
    return res.data?.message || res.data;
  },

  createConversation: async (payload: {
    subject: string;
    initialMessage: string;
    category?: string;
    orderId?: string;
    attachments?: string[];
  }): Promise<Conversation> => {
    const res = await axiosInstance.post(API_ROUTES.chat.conversations, payload);
    return res.data?.conversation || res.data;
  },

  reportIssue: async (payload: {
    shopId?: string;
    orderId?: string;
    reason: string;
    description: string;
  }): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.chat.reportIssue, payload);
    return res.data;
  },
};
