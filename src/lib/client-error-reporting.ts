export type ClientErrorBoundary =
  | "route"
  | "dashboard"
  | "global"
  | "browser"
  | "api";

export type ClientErrorEventType =
  | "render_error"
  | "unhandled_error"
  | "unhandled_rejection"
  | "api_error";

export type ClientErrorContext = {
  boundary: ClientErrorBoundary;
  eventType?: ClientErrorEventType;
  referenceId?: string;
  relatedRequestId?: string;
  apiResource?: string;
  responseStatus?: number;
};

type ClientErrorPayload = {
  event_id: string;
  event_type: ClientErrorEventType;
  boundary: ClientErrorBoundary;
  error_name: string;
  error_digest?: string;
  route_group: "authentication" | "dashboard" | "public" | "unknown";
  release?: string;
  related_request_id?: string;
  api_resource?: string;
  response_status?: number;
  online: boolean;
  occurred_at: string;
};

const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]+$/;
const SAFE_RESOURCE = /^[a-z0-9-]+$/;
const CLIENT_ERROR_NAMES = new Set([
  "AbortError",
  "AggregateError",
  "ApiRequestError",
  "ChunkLoadError",
  "Error",
  "EvalError",
  "InvalidStateError",
  "NetworkError",
  "NotAllowedError",
  "NotFoundError",
  "OperationError",
  "QuotaExceededError",
  "RangeError",
  "ReferenceError",
  "SecurityError",
  "SyntaxError",
  "TimeoutError",
  "TypeError",
  "URIError",
]);
const DEDUPE_WINDOW_MS = 30_000;
const MAX_DEDUPE_ENTRIES = 100;
const recentReports = new Map<string, number>();

function safeIdentifier(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > maxLength ||
    !SAFE_IDENTIFIER.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function safeResource(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < 1 ||
    normalized.length > 80 ||
    !SAFE_RESOURCE.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function createUuidV4() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createClientRequestId(prefix = "client-request") {
  const safePrefix = safeResource(prefix) || "client-request";
  return `${safePrefix}:${createUuidV4()}`;
}

export function resolveApiResource(url: unknown) {
  if (typeof url !== "string" || !url.trim()) return undefined;

  try {
    const parsed = new URL(url, "http://ruwang-arsip.local");
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/i.test(segment));
    const candidate = segments[versionIndex >= 0 ? versionIndex + 1 : 0];
    return safeResource(candidate);
  } catch {
    return undefined;
  }
}

export function resolveRouteGroup(pathname?: string) {
  const path = (pathname || "").split(/[?#]/)[0];
  if (!path) return "unknown" as const;
  if (path === "/" || /^\/(?:forgot|set|reset)-password(?:\/|$)/.test(path)) {
    return "authentication" as const;
  }
  if (/^\/dashboard(?:\/|$)/.test(path)) return "dashboard" as const;
  return "public" as const;
}

function resolveErrorName(error: unknown) {
  if (error && typeof error === "object" && "name" in error) {
    const name = safeIdentifier((error as { name?: unknown }).name, 80);
    if (name && CLIENT_ERROR_NAMES.has(name)) return name;
  }
  return "Error";
}

function resolveErrorDigest(
  error: unknown,
  boundary: ClientErrorBoundary,
  referenceId?: string,
) {
  if (!["route", "dashboard", "global"].includes(boundary)) return undefined;
  const digest = referenceId ??
    (error && typeof error === "object" && "digest" in error
      ? (error as { digest?: unknown }).digest
      : undefined);
  return safeIdentifier(digest, 128);
}

function resolveEndpoint() {
  const baseUrl = String(process.env.NEXT_PUBLIC_API_URL || "")
    .trim()
    .replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/client-errors` : null;
}

function shouldSend(payload: ClientErrorPayload, now: number) {
  for (const [key, timestamp] of recentReports) {
    if (now - timestamp > DEDUPE_WINDOW_MS) recentReports.delete(key);
  }

  const fingerprint = [
    payload.event_type,
    payload.boundary,
    payload.error_name,
    payload.error_digest || "",
    payload.route_group,
    payload.api_resource || "",
    payload.response_status ?? "",
  ].join("|");

  const previous = recentReports.get(fingerprint);
  if (previous !== undefined && now - previous <= DEDUPE_WINDOW_MS) return false;

  recentReports.set(fingerprint, now);
  while (recentReports.size > MAX_DEDUPE_ENTRIES) {
    const oldestKey = recentReports.keys().next().value;
    if (oldestKey === undefined) break;
    recentReports.delete(oldestKey);
  }
  return true;
}

export function resetClientErrorDedupeForTests() {
  recentReports.clear();
}

export async function reportClientError(
  error: unknown,
  context: ClientErrorContext,
) {
  if (typeof window === "undefined") return false;

  const eventId = createUuidV4();
  const payload: ClientErrorPayload = {
    event_id: eventId,
    event_type: context.eventType || "render_error",
    boundary: context.boundary,
    error_name: resolveErrorName(error),
    route_group: resolveRouteGroup(window.location.pathname),
    online: typeof navigator === "undefined" || navigator.onLine !== false,
    occurred_at: new Date().toISOString(),
  };

  const errorDigest = resolveErrorDigest(
    error,
    context.boundary,
    context.referenceId,
  );
  const release = safeIdentifier(process.env.NEXT_PUBLIC_APP_RELEASE, 100);
  const relatedRequestId = safeIdentifier(context.relatedRequestId, 128);
  const apiResource = safeResource(context.apiResource);
  if (errorDigest) payload.error_digest = errorDigest;
  if (release) payload.release = release;
  if (relatedRequestId && relatedRequestId.length >= 8) {
    payload.related_request_id = relatedRequestId;
  }
  if (apiResource) payload.api_resource = apiResource;
  if (
    Number.isInteger(context.responseStatus) &&
    Number(context.responseStatus) >= 0 &&
    Number(context.responseStatus) <= 599
  ) {
    payload.response_status = Number(context.responseStatus);
  }

  if (!shouldSend(payload, Date.now())) return false;

  // Console fallback is intentionally restricted to allowlisted metadata.
  // Never add error.message, stack, page payload, URL, query, or auth state here.
  console.error("[ruwang-arsip:client-error]", {
    eventId: payload.event_id,
    eventType: payload.event_type,
    boundary: payload.boundary,
    referenceId: payload.error_digest || "unavailable",
    name: payload.error_name,
    relatedRequestId: payload.related_request_id || "unavailable",
  });

  const endpoint = resolveEndpoint();
  if (!endpoint) return false;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Error-Report": "1",
        "X-Request-Id": `client-error:${eventId}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "omit",
      keepalive: true,
      referrerPolicy: "no-referrer",
    });
    return response.ok;
  } catch {
    return false;
  }
}
