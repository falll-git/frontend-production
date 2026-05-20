import axios from "axios";

import {
  clearAuthBrowserStorage,
  hasPersistedAuthSession,
} from "@/lib/auth-storage";

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
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
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
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { remember: hasPersistedAuthSession() },
          { withCredentials: true },
        );

        if (hasFailedApiFlag(res.data)) {
          throw new Error(getApiMessage(res.data) ?? "Refresh gagal diproses");
        }

        const newToken = extractAuthToken(res.data);
        if (!newToken) throw new Error("Refresh failed");

        setAccessToken(newToken);

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
