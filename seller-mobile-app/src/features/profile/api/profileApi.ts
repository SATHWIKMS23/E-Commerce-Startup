import axiosInstance from '@/lib/axios/axiosInstance';

export interface SellerProfileResponse {
  seller: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    isBanned: boolean;
    isDeactivated: boolean;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  verification: {
    status: string;
    gstRegistered: boolean;
    gstNumber: string | null;
    createdAt: string;
  } | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    status: string;
    rejectionReason?: string;
    businessName: string | null;
    gstNumber: string | null;
    gstRegistered: boolean;
    createdAt: string;
  } | null;
  profileCompletion: number;
}

export interface UpdateSellerProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  businessName?: string;
  gstNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  bio?: string;
}

export const profileApi = {
  getProfile: async (): Promise<SellerProfileResponse> => {
    const response = await axiosInstance.get('/seller/api/profile');
    return response.data;
  },

  updateProfile: async (payload: UpdateSellerProfilePayload): Promise<{ message: string; seller: any; shop: any }> => {
    const response = await axiosInstance.put('/seller/api/profile', payload);
    return response.data;
  },
};
