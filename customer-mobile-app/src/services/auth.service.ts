import axiosInstance, { STORAGE_KEYS } from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ROUTES } from '../config/api';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  role?: string;
  addresses?: any[];
}

export const authService = {
  login: async (identifier: string, password: string):Promise<{ user: User; token: string }> => {
    const res = await axiosInstance.post(API_ROUTES.auth.login, {
      identifier,
      password,
    });
    const { user, token, refreshToken } = res.data;
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    }
    if (refreshToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    return { user, token };
  },

  register: async (payload: {
    firstName: string;
    lastName?: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ user: User; token?: string }> => {
    const res = await axiosInstance.post(API_ROUTES.auth.register, payload);
    return res.data;
  },

  getProfile: async (): Promise<User> => {
    const res = await axiosInstance.get(API_ROUTES.auth.profile);
    const user = res.data?.user || res.data;
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    return user;
  },

  editProfile: async (payload: {
    firstName?: string;
    lastName?: string;
    username?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<User> => {
    const res = await axiosInstance.put(API_ROUTES.auth.profileEdit, payload);
    const user = res.data?.user || res.data;
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    return user;
  },

  forgotPassword: async (email: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.auth.forgotPassword, { email });
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(API_ROUTES.auth.logout);
    } catch {
      // Ignore network errors on logout
    } finally {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    }
  },

  getCurrentStoredUser: async (): Promise<User | null> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  },
};
