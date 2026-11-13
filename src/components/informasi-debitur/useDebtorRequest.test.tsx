import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDebtorRequest } from "./useDebtorRequest";

const { auth, showToast } = vi.hoisted(() => ({
  auth: {
    status: "authenticated",
    role: { id: "role-a" },
    user: { id: "user-a" },
  },
  showToast: vi.fn(),
}));

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  auth.status = "authenticated";
  auth.role = { id: "role-a" };
  auth.user = { id: "user-a" };
});

describe("useDebtorRequest", () => {
  it("hides the previous source immediately and ignores its late result", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const firstRequest = vi.fn(() => first.promise);
    const secondRequest = vi.fn(() => second.promise);
    const { result, rerender } = renderHook(
      ({ request }) => useDebtorRequest(request, "Request failed"),
      { initialProps: { request: firstRequest } },
    );
    expect(result.current.isLoading).toBe(true);
    rerender({ request: secondRequest });
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await act(async () => second.resolve("current private data"));
    expect(result.current.data).toBe("current private data");
    await act(async () => first.resolve("old private data"));
    expect(result.current.data).toBe("current private data");
    expect(result.current.isLoading).toBe(false);
  });

  it("clears data when disabled and refetches on restored access", async () => {
    const next = deferred<string>();
    const request = vi.fn().mockResolvedValueOnce("private data").mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(
      ({ enabled }) => useDebtorRequest<string>(request, "Request failed", { enabled }),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.data).toBe("private data"));
    const staleReload = result.current.reload;
    rerender({ enabled: false });
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    await act(async () => staleReload());
    expect(request).toHaveBeenCalledTimes(1);
    rerender({ enabled: true });
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await act(async () => next.resolve("fresh private data"));
    expect(result.current.data).toBe("fresh private data");
  });

  it("hides private data on permission or account changes before refetch resolves", async () => {
    const changedRole = deferred<string>();
    const changedUser = deferred<string>();
    const request = vi.fn().mockResolvedValueOnce("private data")
      .mockReturnValueOnce(changedRole.promise).mockReturnValueOnce(changedUser.promise);
    const { result, rerender } = renderHook(() => useDebtorRequest<string>(request, "Request failed"));
    await waitFor(() => expect(result.current.data).toBe("private data"));
    auth.role = { id: "role-b" };
    rerender();
    expect(result.current.data).toBeNull();
    auth.user = { id: "user-b" };
    rerender();
    await act(async () => changedRole.resolve("previous permission data"));
    expect(result.current.data).toBeNull();
    await act(async () => changedUser.resolve("new account data"));
    expect(result.current.data).toBe("new account data");
    auth.status = "unauthenticated";
    rerender();
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("starts reload loading in the event and only accepts the newest reload", async () => {
    const firstReload = deferred<string>();
    const latestReload = deferred<string>();
    const request = vi.fn().mockResolvedValueOnce("initial")
      .mockReturnValueOnce(firstReload.promise).mockReturnValueOnce(latestReload.promise);
    const { result } = renderHook(() => useDebtorRequest<string>(request, "Request failed"));
    await waitFor(() => expect(result.current.data).toBe("initial"));
    let firstRun!: Promise<void>;
    let latestRun!: Promise<void>;
    act(() => { firstRun = result.current.reload(); });
    expect(result.current.isLoading).toBe(true);
    act(() => { latestRun = result.current.reload(); });
    await act(async () => { latestReload.resolve("latest"); await latestRun; });
    await act(async () => { firstReload.resolve("stale"); await firstRun; });
    expect(result.current.data).toBe("latest");
    expect(result.current.isLoading).toBe(false);
  });

  it("ignores stale failures and unmounted results without showing a toast", async () => {
    const old = deferred<string>();
    const current = deferred<string>();
    const oldRequest = () => old.promise;
    const currentRequest = () => current.promise;
    const { result, rerender, unmount } = renderHook(
      ({ request }) => useDebtorRequest(request, "Request failed"),
      { initialProps: { request: oldRequest } },
    );
    rerender({ request: currentRequest });
    await act(async () => old.reject(new Error("stale error")));
    expect(result.current.errorMessage).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    unmount();
    await act(async () => current.reject(new Error("unmounted error")));
    expect(showToast).not.toHaveBeenCalled();
  });

  it("preserves same-request data on reload failure and can clear detail data explicitly", async () => {
    const request = vi.fn().mockResolvedValueOnce("initial").mockRejectedValueOnce(new Error("reload error"));
    const { result } = renderHook(() => useDebtorRequest<string>(request, "Request failed"));
    await waitFor(() => expect(result.current.data).toBe("initial"));
    await act(async () => result.current.reload());
    expect(result.current.data).toBe("initial");
    expect(result.current.errorMessage).toBe("reload error");
    expect(showToast).toHaveBeenCalledWith("reload error", "error");

    const detailRequest = vi.fn().mockResolvedValueOnce("detail").mockRejectedValueOnce(new Error("detail error"));
    const detail = renderHook(() => useDebtorRequest<string>(detailRequest, "Request failed", {
      clearDataOnError: true, notifyError: false,
    }));
    await waitFor(() => expect(detail.result.current.data).toBe("detail"));
    await act(async () => detail.result.current.reload());
    expect(detail.result.current.data).toBeNull();
    expect(detail.result.current.errorMessage).toBe("detail error");
    expect(showToast).toHaveBeenCalledTimes(1);
  });
});
