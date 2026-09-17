import { secureStorage } from '@/features/auth/lib';
import { isTokenExpired } from '@/features/auth/lib/jwt';
import { apiClient } from '@/shared/config/api';
import { AxiosError, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { Platform } from 'react-native';
import {
  applyAccessTokenUpdate,
  applyAuthRefreshFailure,
} from '../store/auth.store';
import * as authApi from './auth.api';

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });

  failedQueue = [];
}

function isPublicAuthUrl(url?: string) {
  if (!url) return false;
  return /\/auth\/(refresh|login|register|google|telegram|logout)(?:\?|$)/.test(
    url
  );
}

async function getAccessTokenUniversal() {
  if (Platform.OS === 'web') return localStorage.getItem('access_token');
  return secureStorage.getAccessToken();
}

async function setAccessTokenUniversal(token?: string) {
  if (!token) return;
  if (Platform.OS === 'web') {
    localStorage.setItem('access_token', token);
    return;
  }
  await secureStorage.setAccessToken(token);
}

async function clearTokensUniversal() {
  if (Platform.OS === 'web') {
    localStorage.removeItem('access_token');
    return;
  }
  await secureStorage.clearTokens();
}

function shouldEndSessionOnRefreshError(error: unknown) {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

async function refreshAccessTokenOnce(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({
        resolve: (value) => resolve(value as string),
        reject,
      });
    });
  }

  isRefreshing = true;
  try {
    const response = await authApi.refreshToken();
    const newAccessToken = response.accessToken;
    if (!newAccessToken) {
      throw new Error('Refresh failed');
    }
    await setAccessTokenUniversal(newAccessToken);
    await applyAccessTokenUpdate(newAccessToken);
    processQueue(null, newAccessToken);
    return newAccessToken;
  } catch (refreshError) {
    processQueue(refreshError as Error, null);
    if (shouldEndSessionOnRefreshError(refreshError)) {
      await clearTokensUniversal();
      await applyAuthRefreshFailure();
    }
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

export function setupAuthInterceptors() {
  const requestInterceptorId = apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (isPublicAuthUrl(config.url)) {
        return config;
      }

      let accessToken = await getAccessTokenUniversal();
      if (accessToken && isTokenExpired(accessToken)) {
        try {
          accessToken = await refreshAccessTokenOnce();
        } catch {
          // Leave the existing token; the 401 handler may retry once.
        }
      }

      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  const responseInterceptorId = apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (!originalRequest) {
        return Promise.reject(error);
      }

      if (isPublicAuthUrl(originalRequest.url)) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const token = await refreshAccessTokenOnce();
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return () => {
    apiClient.interceptors.request.eject(requestInterceptorId);
    apiClient.interceptors.response.eject(responseInterceptorId);
  };
}
