import { printDocument } from "./printDocument";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = () => void;

function createPrintWindow() {
  const listeners = new Map<string, Listener>();
  return {
    addEventListener: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, listener);
    }),
    close: vi.fn(),
    focus: vi.fn(),
    print: vi.fn(),
    trigger(event: string) {
      listeners.get(event)?.();
    },
  };
}

describe("printDocument", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menolak URL kosong dan popup yang diblokir browser", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    expect(printDocument(" ")).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(printDocument("https://example.test/document.pdf")).toBe(false);
  });

  it("mencetak sekali setelah dokumen siap dan menutup setelah print", () => {
    const printWindow = createPrintWindow();
    vi.spyOn(window, "open").mockReturnValue(
      printWindow as unknown as Window,
    );

    expect(printDocument("https://example.test/document.pdf")).toBe(true);
    expect(window.open).toHaveBeenCalledWith(
      "https://example.test/document.pdf",
      "_blank",
    );

    printWindow.trigger("load");
    vi.advanceTimersByTime(250);
    expect(printWindow.focus).toHaveBeenCalledTimes(1);
    expect(printWindow.print).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    printWindow.trigger("afterprint");
    expect(printWindow.close).toHaveBeenCalledTimes(1);
  });
});
