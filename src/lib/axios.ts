import axios from "axios";

import {
  clearAuthBrowserStorage,
  hasPersistedAuthSession,
} from "@/lib/auth-storage";
import {
  createClientRequestId,
  reportClientError,
  resolveApiResource,
} from "@/lib/client-error-reporting";

export class ApiRequestError extends Error {
  readonly requestId: string | null;
  readonly statusCode: number | null;

  constructor(
    message: string,
    { requestId = null, statusCode = null }: {
      requestId?: string | null;
      statusCode?: number | null;
    } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.requestId = requestId;
    this.statusCode = statusCode;
  }
}

export class SessionRefreshRateLimitError extends ApiRequestError {
  readonly retryAfterMs: number;

  constructor(
    message: string,
    {
      requestId = null,
      retryAfterMs = 0,
    }: { requestId?: string | null; retryAfterMs?: number } = {},
  ) {
    super(message, { requestId, statusCode: 429 });
    this.name = "SessionRefreshRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class SessionRefreshTransientError extends ApiRequestError {
  constructor(
    message: string,
    {
      requestId = null,
      statusCode = null,
    }: { requestId?: string | null; statusCode?: number | null } = {},
  ) {
    super(message, { requestId, statusCode });
    this.name = "SessionRefreshTransientError";
  }
}

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
let refreshSessionPromise: Promise<unknown> | null = null;
let refreshRateLimitedUntil = 0;
let lastRefreshRateLimitError: SessionRefreshRateLimitError | null = null;
let authFailureRedirecting = false;

const MAX_REFRESH_RATE_LIMIT_RETRIES = 1;
const MAX_REFRESH_TRANSIENT_RETRIES = 2;
const REFRESH_TRANSIENT_RETRY_BASE_MS = 150;
const MAX_REFRESH_RETRY_WAIT_MS = 5_000;
const MAX_REFRESH_RETRY_AFTER_MS = 15 * 60_000;
const MIN_REFRESH_COOLDOWN_MS = 1_000;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    authFailureRedirecting = false;
  }
}

function safeRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9._:-]{8,128}$/.test(normalized) ? normalized : null;
}

function responseRequestId(error: {
  response?: { data?: unknown; headers?: unknown };
  config?: { headers?: unknown };
}) {
  const payload = error.response?.data;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const fromBody = safeRequestId(
      (payload as Record<string, unknown>).request_id,
    );
    if (fromBody) return fromBody;
  }

  const responseHeaders = error.response?.headers as
    | { get?: (name: string) => unknown; [key: string]: unknown }
    | undefined;
  const fromResponseHeader = safeRequestId(
    responseHeaders?.get?.("x-request-id") ?? responseHeaders?.["x-request-id"],
  );
  if (fromResponseHeader) return fromResponseHeader;

  const requestHeaders = error.config?.headers as
    | { get?: (name: string) => unknown; [key: string]: unknown }
    | undefined;
  return safeRequestId(
    requestHeaders?.get?.("X-Request-Id") ??
      requestHeaders?.["X-Request-Id"] ??
      requestHeaders?.["x-request-id"],
  );
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

function readResponseHeader(headers: unknown, name: string): unknown {
  if (!headers || typeof headers !== "object") return null;
  const record = headers as {
    get?: (headerName: string) => unknown;
    [key: string]: unknown;
  };
  return record.get?.(name) ?? record[name] ?? record[name.toLowerCase()];
}

function parseRetryAfterMs(error: unknown): number {
  if (!error || typeof error !== "object") return 0;
  const response = (error as { response?: { data?: unknown; headers?: unknown } })
    .response;
  const payload = response?.data;

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const seconds = Number(
      (payload as Record<string, unknown>).retry_after_seconds,
    );
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, MAX_REFRESH_RETRY_AFTER_MS);
    }
  }

  const rawHeader = readResponseHeader(response?.headers, "retry-after");
  if (typeof rawHeader !== "string" && typeof rawHeader !== "number") return 0;
  const normalized = String(rawHeader).trim();
  if (!normalized) return 0;

  const seconds = Number(normalized);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_REFRESH_RETRY_AFTER_MS);
  }

  const retryAt = Date.parse(normalized);
  if (!Number.isFinite(retryAt)) return 0;
  return Math.min(Math.max(0, retryAt - Date.now()), MAX_REFRESH_RETRY_AFTER_MS);
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as { response?: { status?: unknown } }).response?.status;
  return Number.isInteger(value) ? Number(value) : null;
}

function waitForRetry(delayMs: number): Promise<void> {
  const boundedDelay = Math.min(delayMs, MAX_REFRESH_RETRY_WAIT_MS);
  if (boundedDelay <= 0) return Promise.resolve();
  return new Promise((resolve) => globalThis.setTimeout(resolve, boundedDelay));
}

export function isSessionRefreshRateLimitError(
  error: unknown,
): error is SessionRefreshRateLimitError {
  return error instanceof SessionRefreshRateLimitError;
}

export function isSessionRefreshTransientError(
  error: unknown,
): error is SessionRefreshTransientError {
  return error instanceof SessionRefreshTransientError;
}

export function requestSessionRefresh(options?: {
  remember?: boolean;
}): Promise<unknown> {
  if (refreshSessionPromise) return refreshSessionPromise;
  if (
    lastRefreshRateLimitError &&
    Date.now() < refreshRateLimitedUntil
  ) {
    return Promise.reject(lastRefreshRateLimitError);
  }

  const run = async () => {
    let rateLimitAttempts = 0;
    let transientAttempts = 0;

    while (true) {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { remember: Boolean(options?.remember) },
          {
            withCredentials: true,
            headers: { "X-Request-Id": createClientRequestId() },
          },
        );

        if (hasFailedApiFlag(response.data)) {
          throw new Error(
            getApiMessage(response.data) ?? "Refresh gagal diproses",
          );
        }
        refreshRateLimitedUntil = 0;
        lastRefreshRateLimitError = null;
        return response.data;
      } catch (error) {
        const statusCode = errorStatus(error);
        if (statusCode !== 429) {
          const isTransient =
            statusCode === null ||
            statusCode === 500 ||
            statusCode === 502 ||
            statusCode === 503 ||
            statusCode === 504;
          if (!isTransient) throw error;

          if (transientAttempts < MAX_REFRESH_TRANSIENT_RETRIES) {
            transientAttempts += 1;
            await waitForRetry(
              REFRESH_TRANSIENT_RETRY_BASE_MS * transientAttempts,
            );
            continue;
          }

          throw new SessionRefreshTransientError(
            getApiMessage(
              (error as { response?: { data?: unknown } }).response?.data,
            ) ?? "Layanan autentikasi sedang mengalami gangguan. Silakan coba lagi.",
            {
              requestId: responseRequestId(
                error as {
                  response?: { data?: unknown; headers?: unknown };
                  config?: { headers?: unknown };
                },
              ),
              statusCode,
            },
          );
        }

        const retryAfterMs = parseRetryAfterMs(error);
        if (rateLimitAttempts < MAX_REFRESH_RATE_LIMIT_RETRIES) {
          rateLimitAttempts += 1;
          await waitForRetry(retryAfterMs);
          continue;
        }

        const rateLimitError = new SessionRefreshRateLimitError(
          getApiMessage(
            (error as { response?: { data?: unknown } }).response?.data,
          ) ?? "Pembaruan sesi sedang dibatasi. Silakan coba lagi.",
          {
            requestId: responseRequestId(
              error as {
                response?: { data?: unknown; headers?: unknown };
                config?: { headers?: unknown };
              },
            ),
            retryAfterMs,
          },
        );
        lastRefreshRateLimitError = rateLimitError;
        refreshRateLimitedUntil =
          Date.now() + Math.max(MIN_REFRESH_COOLDOWN_MS, retryAfterMs);
        throw rateLimitError;
      }
    }

  };

  refreshSessionPromise = run().finally(() => {
    refreshSessionPromise = null;
  });
  return refreshSessionPromise;
}

function handleAuthFailureRedirect() {
  if (authFailureRedirecting) return;

  authFailureRedirecting = true;
  setAccessToken(null);
  clearAuthBrowserStorage();

  if (typeof window !== "undefined") {
    window.location.href = window.location.origin;
  }
}

function refreshAccessToken(): Promise<string> {
  return requestSessionRefresh({ remember: hasPersistedAuthSession() }).then(
    (payload) => {
      const newToken = extractAuthToken(payload);
      if (!newToken) throw new Error("Refresh failed");

      setAccessToken(newToken);
      return newToken;
    },
  );
}

api.interceptors.request.use((config) => {
  if (!config.headers["X-Request-Id"]) {
    config.headers["X-Request-Id"] = createClientRequestId();
  }
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
        const newToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (
          isSessionRefreshRateLimitError(refreshError) ||
          isSessionRefreshTransientError(refreshError)
        ) {
          return Promise.reject(refreshError);
        }
        handleAuthFailureRedirect();
        return Promise.reject(error);
      }
    }

    const statusCode = Number.isInteger(error.response?.status)
      ? Number(error.response.status)
      : null;
    const requestId = responseRequestId(error);

    if (statusCode === null || statusCode >= 500) {
      void reportClientError(Object.assign(new Error(), { name: "ApiRequestError" }), {
        boundary: "api",
        eventType: "api_error",
        relatedRequestId: requestId || undefined,
        apiResource: resolveApiResource(originalRequest?.url),
        responseStatus: statusCode ?? 0,
      });
    }

    return Promise.reject(
      new ApiRequestError(
        getApiMessage(error.response?.data) ?? "Terjadi kesalahan pada server",
        { requestId, statusCode },
      ),
    );
  },
);

export default api;
