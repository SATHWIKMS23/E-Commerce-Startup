import axiosInstance from '@/lib/axios/axiosInstance';

export interface SellerProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isDeactivated?: boolean;
  addresses?: any[];
}

export interface LoginResponse {
  message: string;
  token?: string;
  refreshToken?: string;
  user: SellerProfile;
}

export interface RegisterResponse {
  message?: string;
  token?: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    fullname: string;
  };
}

export const authApi = {
  login: async (credentials: { identifier: string; password?: string }): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/seller/api/auth/login', {
      identifier: credentials.identifier,
      password: credentials.password,
    });
    return response.data;
  },

  register: async (payload: {
    username: string;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
  }): Promise<RegisterResponse> => {
    const response = await axiosInstance.post('/seller/api/auth/register', payload);
    return response.data;
  },

  refresh: async (refreshToken?: string): Promise<{ success: boolean; token: string; refreshToken: string }> => {
    const response = await axiosInstance.post('/seller/api/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/seller/api/auth/logout');
    return response.data;
  },

  getProfile: async (): Promise<{ message: string; user: SellerProfile }> => {
    const response = await axiosInstance.get('/seller/api/auth/profile');
    return response.data;
  },

  updateProfile: async (payload: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<{ message: string; user: SellerProfile }> => {
    const response = await axiosInstance.put('/seller/api/auth/profile/edit', payload);
    return response.data;
  },

  deactivateAccount: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete('/seller/api/auth/profile/deactivate');
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete('/seller/api/auth/profile/delete');
    return response.data;
  },

  forgotPassword: async (payload: { identifier: string }): Promise<{ message: string; email: string }> => {
    const response = await axiosInstance.post('/seller/api/auth/forgot-password', payload);
    return response.data;
  },

  verifyOtp: async (payload: { identifier: string; otp: string }): Promise<{ message: string; resetToken: string }> => {
    const response = await axiosInstance.post('/seller/api/auth/verify-otp', payload);
    return response.data;
  },

  resetPassword: async (payload: { resetToken: string; newPassword?: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/seller/api/auth/reset-password', payload);
    return response.data;
  },
};
