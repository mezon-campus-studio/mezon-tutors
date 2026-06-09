import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getDefaultStore } from "jotai";
import { accessTokenAtom } from "@/store/token.atom";

export const BASE_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    const msg =
      ((body as Record<string, unknown>)?.message as string) ||
      ((body as Record<string, unknown>)?.error as string) ||
      `API Error: ${status} ${statusText}`;
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let refreshPromise: Promise<string> | null = null;
const store = getDefaultStore();

/** Cookie-based auth endpoints only (refresh, logout, login). */
export const credentialsApiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

credentialsApiClient.interceptors.response.use(
  (response) => unwrapApiEnvelope(response) as never,
  (error: AxiosError) => {
    const finalStatus = error.response?.status || 500;
    const body = error.response?.data || null;
    return Promise.reject(new ApiError(finalStatus, error.message, body));
  },
);

export async function refreshAccessTokenWithLock(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = credentialsApiClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then((data) => {
        store.set(accessTokenAtom, data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function unwrapApiEnvelope(response: { status: number; data: unknown }) {
  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body && 'error' in body) {
    if ((body as { error: unknown }).error) {
      throw new ApiError(response.status, 'API Error', (body as { error: unknown }).error);
    }
    return (body as { data: unknown }).data;
  }
  return body;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Public reads — no cookies so credentialed CORS is not required. */
export const publicApiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

publicApiClient.interceptors.response.use(
  (response) => unwrapApiEnvelope(response) as never,
  (error: AxiosError) => {
    const finalStatus = error.response?.status || 500;
    const body = error.response?.data || null;
    return Promise.reject(new ApiError(finalStatus, error.message, body));
  },
);

function isAuthRefreshRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url ?? '';
  const path = url.split('?')[0] ?? '';
  return path === '/auth/refresh' || path.endsWith('/auth/refresh');
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = store.get(accessTokenAtom);
    if (accessToken && config.headers && !isAuthRefreshRequest(config)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => unwrapApiEnvelope(response) as never,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
        })
      | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isAuthRefreshRequest(originalRequest)) {
        store.set(accessTokenAtom, null);
        const finalStatus = error.response?.status || 500;
        const body = error.response?.data || null;
        return Promise.reject(new ApiError(finalStatus, error.message, body));
      }

      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessTokenWithLock();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient.request(originalRequest);
      } catch (refreshError) {
        store.set(accessTokenAtom, null);

        if (refreshError instanceof AxiosError) {
          const refreshStatus = refreshError.response?.status || 500;
          const refreshBody = refreshError.response?.data || null;
          return Promise.reject(new ApiError(refreshStatus, refreshError.message, refreshBody));
        }

        return Promise.reject(refreshError);
      }
    }

    const finalStatus = error.response?.status || 500;
    const body = error.response?.data || null;
    return Promise.reject(new ApiError(finalStatus, error.message, body));
  }
);

declare module 'axios' {
  export interface AxiosInstance {
    request<T = unknown, R = T>(config: AxiosRequestConfig): Promise<R>;
    get<T = unknown, R = T>(url: string, config?: AxiosRequestConfig): Promise<R>;
    delete<T = unknown, R = T>(url: string, config?: AxiosRequestConfig): Promise<R>;
    head<T = unknown, R = T>(url: string, config?: AxiosRequestConfig): Promise<R>;
    options<T = unknown, R = T>(url: string, config?: AxiosRequestConfig): Promise<R>;
    post<T = unknown, R = T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<R>;
    put<T = unknown, R = T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<R>;
    patch<T = unknown, R = T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<R>;
  }
}
