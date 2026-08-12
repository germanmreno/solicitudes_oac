import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore, type User } from '@/features/auth/auth.store';
import { API_BASE, BASE_PATH } from './config';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (token) {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            } else {
              reject(error);
            }
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post<{ data: { accessToken: string; user?: User } }>(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        if (data.data.user) useAuthStore.getState().setUser(data.data.user);
        processQueue(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(null);
        useAuthStore.getState().clear();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith(`${BASE_PATH}/login`)) {
          window.location.assign(`${BASE_PATH}/login`);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown, fallback = 'Ha ocurrido un error'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    const baseMessage = data?.error?.message || error.message || fallback;
    if (error.response?.status === 429) {
      const retryAfter = Number(error.response.headers['retry-after']);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return `${baseMessage} Reintente en ${retryAfter} segundo${retryAfter === 1 ? '' : 's'}.`;
      }
    }
    return baseMessage;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
