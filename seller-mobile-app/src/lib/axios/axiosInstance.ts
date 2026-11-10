import axios from 'axios';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { supabase } from '@/lib/supabase';
import { appStorage } from '@/lib/storage';
import { ENV } from '@/config/env';

const axiosInstance = axios.create({
  baseURL: ENV.BACKEND_API_URL,
});

// Set Content-Type per-request — never for FormData
axiosInstance.interceptors.request.use(
  async (config) => {
    const isFormData =
      config.data instanceof FormData ||
      (config.data && Object.prototype.toString.call(config.data) === '[object FormData]');

    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (config.data) {
      config.headers['Content-Type'] = 'application/json';
    }

    let bearerToken: string | null = null;
    let tokenSource: 'seller_token' | 'supabase' | 'none' = 'none';

    // 1. Prioritize authoritative marketplace JWT
    const stored = (await appStorage.getItem('seller_token')) || appStorage.getItemSync('seller_token');
    if (stored) {
      bearerToken = stored;
      tokenSource = 'seller_token';
    }

    // 2. Fall back to live Supabase session during initial bootstrap
    if (!bearerToken) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          bearerToken = data.session.access_token;
          tokenSource = 'supabase';
        }
      } catch {
        bearerToken = null;
      }
    }

    if (bearerToken) {
      config.headers.Authorization = `Bearer ${bearerToken}`;
      config.headers['x-seller-token'] = bearerToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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

// Response interceptor with single-flight refresh queue
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint =
      url.includes('/seller/api/auth/login') ||
      url.includes('/seller/api/auth/register') ||
      url.includes('/seller/api/auth/refresh') ||
      url.includes('/seller/api/auth/logout');

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
        const currentRefreshToken =
          (await appStorage.getItem('seller_refresh_token')) ||
          appStorage.getItemSync('seller_refresh_token');

        const refreshRes = await axios.post(
          `${ENV.BACKEND_API_URL}/seller/api/auth/refresh`,
          { refreshToken: currentRefreshToken || undefined }
        );

        const newToken = refreshRes.data?.token;
        const newRefreshToken = refreshRes.data?.refreshToken;

        if (newToken) {
          await appStorage.setItem('seller_token', newToken);
          if (newRefreshToken) {
            await appStorage.setItem('seller_refresh_token', newRefreshToken);
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            originalRequest.headers['x-seller-token'] = newToken;
          }
        }

        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);

        await appStorage.removeItem('seller_token');
        await appStorage.removeItem('seller_refresh_token');
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // ignore signout errors
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    if (error.response?.status === 403) {
      useConfirmStore.getState().showAlert({
        title: 'Action Restricted',
        message: message,
        confirmText: 'Acknowledge',
      });
    }

    error.message = message;
    return Promise.reject(error);
  }
);

export default axiosInstance;
