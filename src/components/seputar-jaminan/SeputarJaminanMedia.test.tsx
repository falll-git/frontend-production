import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mediaApi = vi.hoisted(() => ({ getMediaBlob: vi.fn() }));
vi.mock("@/services/seputar-jaminan.service", () => ({
  seputarJaminanService: mediaApi,
}));

import {
  formatSjMediaMeta,
  SjMediaPreview,
  validateSjPublicImage,
} from "./SeputarJaminanMedia";

function imageFile(name: string, type: string, size: number) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("Seputar Jaminan media presentation", () => {
  it("accepts the three public image formats within the existing 10 MB contract", () => {
    expect(validateSjPublicImage(imageFile("rumah.jpg", "image/jpeg", 1024))).toBeNull();
    expect(validateSjPublicImage(imageFile("tanah.png", "image/png", 1024))).toBeNull();
    expect(validateSjPublicImage(imageFile("kendaraan.webp", "image/webp", 1024))).toBeNull();
  });

  it("rejects empty, oversized, invalid, and mismatched files before upload", () => {
    expect(validateSjPublicImage(imageFile("kosong.png", "image/png", 0))).toBe(
      "Gambar yang dipilih kosong atau rusak.",
    );
    expect(
      validateSjPublicImage(imageFile("besar.png", "image/png", 10 * 1024 * 1024 + 1)),
    ).toBe("Ukuran gambar maksimal 10 MB.");
    expect(validateSjPublicImage(imageFile("catatan.txt", "text/plain", 1024))).toBe(
      "Gunakan gambar JPG, PNG, atau WebP yang valid.",
    );
    expect(validateSjPublicImage(imageFile("palsu.jpg", "image/png", 1024))).toBe(
      "Gunakan gambar JPG, PNG, atau WebP yang valid.",
    );
  });

  it("formats type, size, dimensions, and synchronization state", () => {
    expect(
      formatSjMediaMeta({
        mime_type: "image/webp",
        size_bytes: 2048,
        width: 1600,
        height: 900,
        central_ready: false,
      }),
    ).toBe("WebP · 2.00 KB · 1600 × 900 px · menunggu sinkronisasi");
  });
});

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(
    private callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    IntersectionObserverMock.instances.push(this);
  }

  intersect(isIntersecting = true) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const originalIntersectionObserver = globalThis.IntersectionObserver;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("authenticated compact media loading", () => {
  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    mediaApi.getMediaBlob.mockReset().mockResolvedValue(new Blob(["photo"]));
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.stubGlobal("IntersectionObserver", originalIntersectionObserver);
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("waits for actual viewport visibility before requesting a compact thumbnail", async () => {
    render(<SjMediaPreview compact mediaId="offscreen" alt="Foto di bawah layar" />);
    expect(mediaApi.getMediaBlob).not.toHaveBeenCalled();
    const observer = IntersectionObserverMock.instances[0];
    expect(observer.options).toMatchObject({ rootMargin: "0px" });
    expect(observer.observe).toHaveBeenCalledOnce();
    act(() => observer.intersect(false));
    expect(mediaApi.getMediaBlob).not.toHaveBeenCalled();
    act(() => observer.intersect());
    await waitFor(() => expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("offscreen", "thumbnail"));
    expect(await screen.findByRole("img", { name: "Foto di bawah layar" })).toBeVisible();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("does not fetch again on repeated intersection or leaving and re-entering", async () => {
    render(<SjMediaPreview compact mediaId="visible" alt="Foto terlihat" />);
    const observer = IntersectionObserverMock.instances[0];
    act(() => observer.intersect());
    await screen.findByRole("img", { name: "Foto terlihat" });
    act(() => {
      observer.intersect(false);
      observer.intersect();
      observer.intersect();
    });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("visible", "thumbnail");
  });

  it("ignores a disconnected Strict Mode observer and requests once from the active observer", async () => {
    render(<StrictMode><SjMediaPreview compact mediaId="strict" alt="Foto Strict Mode" /></StrictMode>);
    const disconnected = IntersectionObserverMock.instances[0];
    expect(disconnected.disconnect).toHaveBeenCalled();
    act(() => disconnected.intersect());
    expect(mediaApi.getMediaBlob).not.toHaveBeenCalled();
    act(() => IntersectionObserverMock.instances.at(-1)!.intersect());
    await screen.findByRole("img", { name: "Foto Strict Mode" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("strict", "thumbnail");
  });

  it("requires new visibility after the media identity changes, including returning to an old ID", async () => {
    const { rerender } = render(<SjMediaPreview compact mediaId="first" alt="Foto pertama" />);
    act(() => IntersectionObserverMock.instances[0].intersect());
    await screen.findByRole("img", { name: "Foto pertama" });
    rerender(<SjMediaPreview compact mediaId="second" alt="Foto kedua" />);
    expect(mediaApi.getMediaBlob).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    rerender(<SjMediaPreview compact mediaId="first" alt="Foto pertama lagi" />);
    expect(mediaApi.getMediaBlob).toHaveBeenCalledTimes(1);
    act(() => IntersectionObserverMock.instances.at(-1)!.intersect());
    await screen.findByRole("img", { name: "Foto pertama lagi" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledTimes(2);
  });

  it("ignores a late response from a replaced media identity", async () => {
    let finishOld!: (value: Blob) => void;
    mediaApi.getMediaBlob.mockImplementationOnce(() => new Promise<Blob>((resolve) => { finishOld = resolve; }));
    const { rerender } = render(<SjMediaPreview compact mediaId="old" alt="Foto lama" />);
    act(() => IntersectionObserverMock.instances[0].intersect());
    await waitFor(() => expect(mediaApi.getMediaBlob).toHaveBeenCalledOnce());
    rerender(<SjMediaPreview compact mediaId="new" alt="Foto baru" />);
    await act(async () => { finishOld(new Blob(["old"])); });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    act(() => IntersectionObserverMock.instances.at(-1)!.intersect());
    await screen.findByRole("img", { name: "Foto baru" });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("does not reuse visibility or a blob from a different media variant", async () => {
    const { rerender } = render(<SjMediaPreview compact thumbnail={false} mediaId="same" alt="Foto asli" />);
    act(() => IntersectionObserverMock.instances[0].intersect());
    await screen.findByRole("img", { name: "Foto asli" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("same", undefined);
    rerender(<SjMediaPreview compact mediaId="same" alt="Thumbnail" />);
    expect(mediaApi.getMediaBlob).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    act(() => IntersectionObserverMock.instances.at(-1)!.intersect());
    await screen.findByRole("img", { name: "Thumbnail" });
    expect(mediaApi.getMediaBlob).toHaveBeenLastCalledWith("same", "thumbnail");
  });

  it("disconnects an unseen preview on unmount without making a request", () => {
    const { unmount } = render(<SjMediaPreview compact mediaId="never-seen" alt="Foto belum terlihat" />);
    const observer = IntersectionObserverMock.instances[0];
    unmount();
    act(() => observer.intersect());
    expect(observer.disconnect).toHaveBeenCalled();
    expect(mediaApi.getMediaBlob).not.toHaveBeenCalled();
  });

  it("does not create a blob URL for a response arriving after unmount", async () => {
    let finish!: (value: Blob) => void;
    mediaApi.getMediaBlob.mockImplementationOnce(() => new Promise<Blob>((resolve) => { finish = resolve; }));
    const { unmount } = render(<SjMediaPreview compact mediaId="pending" alt="Foto tertunda" />);
    act(() => IntersectionObserverMock.instances[0].intersect());
    await waitFor(() => expect(mediaApi.getMediaBlob).toHaveBeenCalledOnce());
    unmount();
    await act(async () => { finish(new Blob(["late"])); });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("retries a failed authorized request without waiting for another intersection", async () => {
    mediaApi.getMediaBlob.mockRejectedValueOnce(new Error("offline"));
    const { unmount } = render(<SjMediaPreview compact mediaId="retry" alt="Foto gagal" />);
    act(() => IntersectionObserverMock.instances[0].intersect());
    fireEvent.click(await screen.findByRole("button", { name: "Muat ulang pratinjau Foto gagal" }));
    await screen.findByRole("img", { name: "Foto gagal" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledTimes(2);
    expect(mediaApi.getMediaBlob).toHaveBeenLastCalledWith("retry", "thumbnail");
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("falls back to existing eager behavior without IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<SjMediaPreview compact mediaId="fallback" alt="Foto browser lama" />);
    await screen.findByRole("img", { name: "Foto browser lama" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("fallback", "thumbnail");
  });

  it("keeps noncompact detail previews eager even when they use the thumbnail variant", async () => {
    render(<SjMediaPreview mediaId="detail" alt="Foto detail" thumbnail />);
    await screen.findByRole("img", { name: "Foto detail" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("detail", "thumbnail");
    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });

  it("keeps full size detail previews eager and does not request a thumbnail", async () => {
    render(<SjMediaPreview mediaId="full" alt="Foto penuh" />);
    await screen.findByRole("img", { name: "Foto penuh" });
    expect(mediaApi.getMediaBlob).toHaveBeenCalledExactlyOnceWith("full", undefined);
    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });
});
