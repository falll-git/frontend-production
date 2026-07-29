import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ClientErrorMonitor from "@/components/system/ClientErrorMonitor";
import { resetClientErrorDedupeForTests } from "@/lib/client-error-reporting";

describe("ClientErrorMonitor", () => {
  beforeEach(() => {
    resetClientErrorDedupeForTests();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("melaporkan window error dan berhenti setelah unmount", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const view = render(<ClientErrorMonitor />);
    const event = new ErrorEvent("error", { error: new TypeError("rahasia") });

    fireEvent(window, event);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(
      String(fetchMock.mock.calls[0][1]?.body),
    );
    expect(payload.event_type).toBe("unhandled_error");
    expect(payload.boundary).toBe("browser");
    expect(payload.error_name).toBe("TypeError");

    view.unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("melaporkan unhandled rejection tanpa isi reason", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    render(<ClientErrorMonitor />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new Error("token rahasia"),
    });

    fireEvent(window, event);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(
      String(fetchMock.mock.calls[0][1]?.body),
    );
    expect(payload.event_type).toBe("unhandled_rejection");
    expect(JSON.stringify(payload)).not.toContain("token rahasia");
  });
});
