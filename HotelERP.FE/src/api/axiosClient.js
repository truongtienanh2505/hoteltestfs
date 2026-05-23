import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:5080/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Nếu request lỗi là login, không thực hiện refresh token
    if (originalRequest.url.includes('/Auth/login')) {
      return Promise.reject(error);
    }

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      const currentRefreshToken = localStorage.getItem('refreshToken');

      try {
        const response = await axios.post(`${API_BASE_URL}/Auth/refresh-token`, {
          accessToken: localStorage.getItem('token'),
          refreshToken: currentRefreshToken,
        });

        const { accessToken, refreshToken } = response.data.data;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        useAuthStore.getState().login(
          useAuthStore.getState().user,
          accessToken,
          refreshToken,
          useAuthStore.getState().permissions
        );

        isRefreshing = false;
        onRefreshed(accessToken);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        resolve(axiosClient(originalRequest));
      });
    });
  }
);

export default axiosClient;