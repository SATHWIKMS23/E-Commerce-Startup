import axiosInstance from '@/lib/axios/axiosInstance';

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  comment?: string;
  reply?: string;
  createdAt: string;
  customer: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export const reviewApi = {
  getReviews: async (): Promise<{ count: number; reviews: Review[] }> => {
    const response = await axiosInstance.get('/seller/api/reviews');
    return response.data;
  },

  replyToReview: async (reviewId: string, replyText: string): Promise<{ message: string; review: Review }> => {
    const response = await axiosInstance.post(`/seller/api/reviews/${reviewId}/reply`, {
      reply: replyText,
    });
    return response.data;
  },

  deleteReply: async (reviewId: string): Promise<{ message: string; review: Review }> => {
    const response = await axiosInstance.delete(`/seller/api/reviews/${reviewId}/reply`);
    return response.data;
  },
};
