import { describe, expect, it } from "vitest";

import {
  formatSjMediaMeta,
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
