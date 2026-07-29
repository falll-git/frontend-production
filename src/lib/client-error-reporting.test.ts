import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createClientRequestId,
  reportClientError,
  resetClientErrorDedupeForTests,
  resolveApiResource,
  resolveRouteGroup,
} from "@/lib/client-error-reporting";

const SYNTHETIC_PASSWORD = "fixture-password-not-a-real-secret-12345";
const SYNTHETIC_IDENTITY_NUMBER = "9999999999999999";

describe("client error reporting", () => {
  beforeEach(() => {
    resetClientErrorDedupeForTests();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
    vi.stubEnv("NEXT_PUBLIC_APP_RELEASE", "commit-abc123");
    window.history.replaceState({}, "", "/dashboard/debitur/rahasia");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mengirim metadata allowlist tanpa message, stack, URL, atau auth state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const error = Object.assign(
      new Error(
        `password=${SYNTHETIC_PASSWORD} ktp=${SYNTHETIC_IDENTITY_NUMBER}`,
      ),
      {
        digest: "digest-001",
        stack: "stack rahasia",
      },
    );

    await expect(
      reportClientError(error, {
        boundary: "api",
        eventType: "api_error",
        relatedRequestId: "request-12345678",
        apiResource: "debtors",
        responseStatus: 503,
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0];
    const requestOptions = options as RequestInit;
    const requestHeaders = new Headers(requestOptions.headers);
    expect(endpoint).toBe("https://api.example.test/api/v1/client-errors");
    expect(requestOptions.credentials).toBe("omit");
    expect(requestOptions.referrerPolicy).toBe("no-referrer");
    expect(requestHeaders.get("X-Client-Error-Report")).toBe("1");

    const payload = JSON.parse(String(requestOptions.body));
    expect(payload).toEqual(
      expect.objectContaining({
        event_type: "api_error",
        boundary: "api",
        error_name: "Error",
        route_group: "dashboard",
        release: "commit-abc123",
        related_request_id: "request-12345678",
        api_resource: "debtors",
        response_status: 503,
      }),
    );
    expect(payload).not.toHaveProperty("message");
    expect(payload).not.toHaveProperty("stack");
    expect(payload).not.toHaveProperty("url");
    expect(payload).not.toHaveProperty("error_digest");
    expect(JSON.stringify(payload)).not.toContain(SYNTHETIC_PASSWORD);
    expect(JSON.stringify(payload)).not.toContain(SYNTHETIC_IDENTITY_NUMBER);
  });

  it("menolak nama dan digest bebas dari objek error browser", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const craftedError = {
      name: "NamaNasabah123",
      digest: "data-yang-tidak-boleh-masuk",
    };

    await expect(
      reportClientError(craftedError, {
        boundary: "browser",
        eventType: "unhandled_rejection",
      }),
    ).resolves.toBe(true);

    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(payload.error_name).toBe("Error");
    expect(payload).not.toHaveProperty("error_digest");
    expect(JSON.stringify(payload)).not.toContain("NamaNasabah123");
    expect(JSON.stringify(payload)).not.toContain(
      "data-yang-tidak-boleh-masuk",
    );
  });

  it("mempertahankan digest aman hanya untuk error boundary", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );

    await expect(
      reportClientError(Object.assign(new TypeError("tidak dikirim"), {
        digest: "digest-001",
      }), { boundary: "dashboard" }),
    ).resolves.toBe(true);

    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(payload.error_name).toBe("TypeError");
    expect(payload.error_digest).toBe("digest-001");
  });

  it("mendeduplikasi fingerprint berulang dalam window singkat", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const error = new TypeError("isi tidak dikirim");

    await expect(
      reportClientError(error, { boundary: "dashboard" }),
    ).resolves.toBe(true);
    await expect(
      reportClientError(error, { boundary: "dashboard" }),
    ).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gagal secara aman ketika endpoint tidak tersedia atau network putus", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    await expect(
      reportClientError(new Error("rahasia"), { boundary: "global" }),
    ).resolves.toBe(false);

    resetClientErrorDedupeForTests();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    await expect(
      reportClientError(new Error("rahasia lain"), { boundary: "route" }),
    ).resolves.toBe(false);
  });

  it("menormalkan request ID, resource API, dan kelompok route tanpa parameter", () => {
    expect(createClientRequestId()).toMatch(
      /^client-request:[0-9a-f-]{36}$/,
    );
    expect(resolveApiResource("/api/v1/digital-documents/secret-id?token=x")).toBe(
      "digital-documents",
    );
    expect(resolveApiResource("/debtors/secret-id")).toBe("debtors");
    expect(resolveApiResource("javascript:not-safe")).toBeUndefined();
    expect(resolveRouteGroup("/dashboard/debtors/secret-id")).toBe("dashboard");
    expect(resolveRouteGroup("/forgot-password?token=secret")).toBe(
      "authentication",
    );
    expect(resolveRouteGroup("/status")).toBe("public");
    expect(resolveRouteGroup()).toBe("unknown");
  });
});
