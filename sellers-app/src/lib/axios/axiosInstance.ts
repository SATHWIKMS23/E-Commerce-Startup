import axios from 'axios';
import { useConfirmStore } from '@/lib/store/confirmStore';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL || '',
  withCredentials: true,
});

// Set Content-Type per-request — never for FormData (browser sets multipart boundary)
axiosInstance.interceptors.request.use(
  async (config) => {
    const isFormData =
      config.data instanceof FormData ||
      (config.data &&
        Object.prototype.toString.call(config.data) === '[object FormData]');

    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (config.data) {
      config.headers['Content-Type'] = 'application/json';
    }

    if (typeof window !== 'undefined') {
      const bearerToken = localStorage.getItem('seller_token');

      if (bearerToken) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
        // Redundant header so the backend can authenticate even if a proxy or
        // CDN strips the Authorization header.
        config.headers['x-seller-token'] = bearerToken;
      }
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

// Response interceptor with single-flight refresh queue and robust session expiry handling
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
      url.includes('/seller/api/auth/logout') ||
      url.includes('/api/seller/login') ||
      url.includes('/api/seller/refresh') ||
      url.includes('/api/seller/logout');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint && typeof window !== 'undefined') {
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
        const currentRefreshToken = localStorage.getItem('seller_refresh_token');
        const refreshRes = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL || ''}/seller/api/auth/refresh`,
          { refreshToken: currentRefreshToken || undefined },
          { withCredentials: true }
        );

        const newToken = refreshRes.data?.token;
        const newRefreshToken = refreshRes.data?.refreshToken;

        if (newToken) {
          localStorage.setItem('seller_token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('seller_refresh_token', newRefreshToken);
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

        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_refresh_token');
        try {
          const { signOut } = await import('next-auth/react');
          await signOut({ redirect: false });
        } catch {
          // ignore signout errors
        }

        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
          window.location.href = `/login?expired=true&callbackUrl=${encodeURIComponent(currentPath)}`;
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
