import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_BASE_URL, API_ROUTES } from '../config/api';

export const STORAGE_KEYS = {
  TOKEN: '@atlasbasket_token',
  REFRESH_TOKEN: '@atlasbasket_refresh_token',
  USER: '@atlasbasket_user',
  LOCATION_STATE: '@atlasbasket_loc_state',
  LOCATION_DISTRICT: '@atlasbasket_loc_district',
  LOCATION_ADDRESS_ID: '@atlasbasket_loc_address_id',
  BRANDING: '@atlasbasket_branding',
};

const axiosInstance = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Auth Token + Location Query Params
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        config.headers.set('Cookie', `customer_session=${token}`);
      }

      if (config.method?.toLowerCase() === 'get') {
        const selectedState = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_STATE);
        const selectedDistrict = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_DISTRICT);

        if (selectedState && selectedDistrict) {
          config.params = {
            ...config.params,
            state: selectedState,
            district: selectedDistrict,
          };
        }
      }
    } catch {
      // Ignore async storage read error
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token Coordination & Error Normalization
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const res = await axios.post(API_ROUTES.auth.refresh, {
          refreshToken,
        });

        const newToken = res.data?.token;
        const newRefreshToken = res.data?.refreshToken;

        if (newToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
        }
        if (newRefreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    let message = 'An unexpected error occurred';
    const rawData: any = error.response?.data;

    if (rawData && typeof rawData === 'object') {
      message = rawData.message || rawData.error || error.message || message;
    } else if (error.message) {
      message = error.message;
    }

    error.message = message;
    return Promise.reject(error);
  }
);

export default axiosInstance;
