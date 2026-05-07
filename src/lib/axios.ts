import axios from "axios";

import { AUTH_STORAGE_KEYS, clearAuthBrowserStorage } from "@/lib/auth-storage";

function getApiMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message ?? record.messsage ?? record.error;

  return typeof message === "string" && message.trim().length > 0
    ? message
    : null;
}

function hasFailedApiFlag(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return record.status === false || record.success === false;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedRefreshToken) ??
    window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionRefreshToken)
  );
}

function persistAccessToken(token: string) {
  if (typeof window === "undefined") return;

  if (window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedAccessToken)) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.persistedAccessToken, token);
    return;
  }

  if (window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionAccessToken)) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.sessionAccessToken, token);
  }
}

function persistRefreshToken(token: string) {
  if (typeof window === "undefined") return;

  if (window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedRefreshToken)) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.persistedRefreshToken, token);
    return;
  }

  if (window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionRefreshToken)) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.sessionRefreshToken, token);
  }
}

function extractAuthToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.token === "string") return record.token;

  if (
    typeof record.data === "object" &&
    record.data !== null &&
    !Array.isArray(record.data) &&
    typeof (record.data as Record<string, unknown>).token === "string"
  ) {
    return (record.data as Record<string, unknown>).token as string;
  }

  return null;
}

function extractRefreshToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.refreshToken === "string") return record.refreshToken;

  if (
    typeof record.data === "object" &&
    record.data !== null &&
    !Array.isArray(record.data) &&
    typeof (record.data as Record<string, unknown>).refreshToken === "string"
  ) {
    return (record.data as Record<string, unknown>).refreshToken as string;
  }

  return null;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    const headers = config.headers as Record<string, unknown> | undefined;
    if (headers) {
      delete headers["Content-Type"];
      delete headers["content-type"];
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (hasFailedApiFlag(response.data)) {
      return Promise.reject(
        new Error(getApiMessage(response.data) ?? "Request gagal diproses"),
      );
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    const requestPath = String(originalRequest?.url ?? "");
    const isAuthLoginOrRefresh =
      requestPath.includes("/auth/login") || requestPath.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthLoginOrRefresh
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
        );

        if (hasFailedApiFlag(res.data)) {
          throw new Error(getApiMessage(res.data) ?? "Refresh gagal diproses");
        }

        const newToken = extractAuthToken(res.data);
        if (!newToken) throw new Error("Refresh failed");

        const nextRefreshToken = extractRefreshToken(res.data);
        setAccessToken(newToken);
        persistAccessToken(newToken);

        if (nextRefreshToken) {
          persistRefreshToken(nextRefreshToken);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        setAccessToken(null);
        clearAuthBrowserStorage();
        window.location.href = "/";
        return Promise.reject(error);
      }
    }

    return Promise.reject(
      new Error(
        getApiMessage(error.response?.data) ?? "Terjadi kesalahan pada server",
      ),
    );
  },
);

export default api;
