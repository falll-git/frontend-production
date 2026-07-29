import axios, {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api, {
  ApiRequestError,
  getAccessToken,
  setAccessToken,
} from "@/lib/axios";
import { AUTH_STORAGE_KEYS } from "@/lib/auth-storage";
import { resetClientErrorDedupeForTests } from "@/lib/client-error-reporting";

function successResponse(
  config: InternalAxiosRequestConfig,
): AxiosResponse {
  return {
    data: { status: true, success: true },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  };
}

describe("API request correlation", () => {
  beforeEach(() => {
    resetClientErrorDedupeForTests();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
    vi.spyOn(console, "error").mockImplementation(() => {});
    setAccessToken("reset-auth-failure-state");
    setAccessToken(null);
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("menambahkan request ID aman pada request API", async () => {
    let requestId: string | null = null;
    await api.get("/health", {
      adapter: async (config) => {
        requestId = config.headers.get("X-Request-Id") as string;
        return successResponse(config);
      },
    });

    expect(requestId).toMatch(/^client-request:[0-9a-f-]{36}$/);
  });

  it("membawa bearer token dan membiarkan browser menentukan boundary FormData", async () => {
    setAccessToken("access-token-memory");
    expect(getAccessToken()).toBe("access-token-memory");
    let authorization: string | null = null;
    let contentType: string | null = "not-inspected";

    await api.post("/digital-documents", new FormData(), {
      adapter: async (config) => {
        authorization = config.headers.get("Authorization") as string;
        contentType = config.headers.get("Content-Type") as string | null;
        return successResponse(config);
      },
    });

    expect(authorization).toBe("Bearer access-token-memory");
    expect(contentType).not.toBe("application/json");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it("menolak payload HTTP 200 yang membawa flag gagal", async () => {
    await expect(
      api.get("/legacy", {
        adapter: async (config) => ({
          ...successResponse(config),
          data: { success: false, messsage: "Permintaan legacy gagal." },
        }),
      }),
    ).rejects.toThrow("Permintaan legacy gagal.");

    await expect(
      api.get("/legacy-empty", {
        adapter: async (config) => ({
          ...successResponse(config),
          data: { status: false, message: "" },
        }),
      }),
    ).rejects.toThrow("Request gagal diproses");
  });

  it("mengorelasikan respons 5xx dengan reporter tanpa membocorkan path ID", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );

    const result = api.get("/debtors/ktp-rahasia", {
      adapter: async (config) =>
        Promise.reject({
          config,
          response: {
            status: 503,
            data: {
              status: false,
              message: "Layanan sementara tidak tersedia.",
              request_id: "backend-request-12345678",
            },
            headers: {},
          },
        }),
    });

    await expect(result).rejects.toMatchObject({
      name: "ApiRequestError",
      requestId: "backend-request-12345678",
      statusCode: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const report = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(report.api_resource).toBe("debtors");
    expect(report.related_request_id).toBe("backend-request-12345678");
    expect(JSON.stringify(report)).not.toContain("ktp-rahasia");
  });

  it("tidak melaporkan validasi 4xx sebagai error sistem", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );

    const result = api.post("/debtors", {}, {
      adapter: async (config) =>
        Promise.reject({
          config,
          response: {
            status: 422,
            data: {
              status: false,
              message: "Data yang dikirim belum sesuai.",
              request_id: "backend-request-87654321",
            },
            headers: {},
          },
        }),
    });

    await expect(result).rejects.toBeInstanceOf(ApiRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengambil request ID dari response header ketika body tidak memilikinya", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const result = api.get("/legal/claims/id-rahasia", {
      adapter: async (config) =>
        Promise.reject({
          config,
          response: {
            status: 500,
            data: { status: false },
            headers: new AxiosHeaders({
              "x-request-id": "header-request-12345678",
            }),
          },
        }),
    });

    await expect(result).rejects.toMatchObject({
      requestId: "header-request-12345678",
      statusCode: 500,
      message: "Terjadi kesalahan pada server",
    });
    const report = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(report.api_resource).toBe("legal");
    expect(report.related_request_id).toBe("header-request-12345678");
  });

  it("melaporkan network error memakai client request ID dan status nol", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const result = api.get("/notifications", {
      adapter: async (config) => Promise.reject({ config }),
    });

    await expect(result).rejects.toMatchObject({
      name: "ApiRequestError",
      statusCode: null,
    });
    const report = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(report.response_status).toBe(0);
    expect(report.related_request_id).toMatch(
      /^client-request:[0-9a-f-]{36}$/,
    );
  });

  it("me-refresh sekali lalu mengulang request 401 dengan token baru", async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.persistedUser, "yes");
    const refreshPost = vi.spyOn(axios, "post").mockResolvedValue({
      data: { data: { token: "fresh-access-token" } },
    });
    let adapterCalls = 0;
    let retryAuthorization: string | null = null;

    const response = await api.get("/users", {
      adapter: async (config) => {
        adapterCalls += 1;
        if (adapterCalls === 1) {
          return Promise.reject({
            config,
            response: { status: 401, data: {}, headers: {} },
          });
        }
        retryAuthorization = config.headers.get("Authorization") as string;
        return successResponse(config);
      },
    });

    expect(response.status).toBe(200);
    expect(adapterCalls).toBe(2);
    expect(retryAuthorization).toBe("Bearer fresh-access-token");
    expect(refreshPost).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/auth/refresh",
      { remember: true },
      expect.objectContaining({ withCredentials: true }),
    );
    expect(getAccessToken()).toBe("fresh-access-token");
  });

  it("menggabungkan refresh paralel agar hanya satu request refresh berjalan", async () => {
    let resolveRefresh!: (value: { data: { token: string } }) => void;
    const refreshPost = vi.spyOn(axios, "post").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const adapter = async (config: InternalAxiosRequestConfig) => {
      if (!config.headers.get("Authorization")) {
        return Promise.reject({
          config,
          response: { status: 401, data: {}, headers: {} },
        });
      }
      return successResponse(config);
    };

    const first = api.get("/users", { adapter });
    const second = api.get("/roles", { adapter });
    await vi.waitFor(() => expect(refreshPost).toHaveBeenCalledTimes(1));
    expect(resolveRefresh).toBeTypeOf("function");
    resolveRefresh({ data: { token: "shared-fresh-token" } });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(refreshPost).toHaveBeenCalledTimes(1);
  });

  it("membersihkan sesi browser ketika refresh gagal tanpa melaporkan 401", async () => {
    const reportFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh down"));
    window.localStorage.setItem(AUTH_STORAGE_KEYS.persistedUser, "stored");
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.sessionUser, "stored");
    setAccessToken("expired-token");

    const originalError = {
      config: {
        url: "/users",
        headers: {} as InternalAxiosRequestConfig["headers"],
      },
      response: { status: 401, data: {}, headers: {} },
    };
    const result = api.get("/users", {
      adapter: async () => Promise.reject(originalError),
    });

    await expect(result).rejects.toBe(originalError);
    expect(getAccessToken()).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedUser)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionUser)).toBeNull();
    expect(reportFetch).not.toHaveBeenCalled();
  });

  it("tidak mencoba refresh untuk endpoint login", async () => {
    const refreshPost = vi.spyOn(axios, "post");
    const result = api.post("/auth/login", {}, {
      adapter: async (config) =>
        Promise.reject({
          config,
          response: {
            status: 401,
            data: { error: "Login tidak valid." },
            headers: {},
          },
        }),
    });

    await expect(result).rejects.toMatchObject({
      name: "ApiRequestError",
      message: "Login tidak valid.",
      statusCode: 401,
    });
    expect(refreshPost).not.toHaveBeenCalled();
  });
});
