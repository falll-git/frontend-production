import { describe, expect, it } from "vitest";

import { normalizeWatermarkImageUrl } from "@/lib/watermark-image-url";

const API_BASE_URL = "https://api.example.test/api/v1";

describe("normalizeWatermarkImageUrl", () => {
  it("menerima aset watermark pada origin dan struktur path API yang sah", () => {
    expect(
      normalizeWatermarkImageUrl(
        "https://api.example.test/api/watermark-assets/2026/07/123-logo.png",
        API_BASE_URL,
      ),
    ).toBe(
      "https://api.example.test/api/watermark-assets/2026/07/123-logo.png",
    );

    expect(
      normalizeWatermarkImageUrl(
        "/api/watermark-assets/2026/12/123-logo.jpg",
        API_BASE_URL,
      ),
    ).toBe(
      "https://api.example.test/api/watermark-assets/2026/12/123-logo.jpg",
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "https://evil.example/api/watermark-assets/2026/07/logo.png",
    "https://api.example.test/api/watermark-assets/2026/07/../secret.png",
    "https://api.example.test/api/watermark-assets/2026/07/logo.svg",
    "https://api.example.test/api/watermark-assets/2026/07/logo.png?next=evil",
    "https://api.example.test/api/watermark-assets/2026/07/logo.png#payload",
  ])("menolak URL yang tidak dapat dipercaya: %s", (value) => {
    expect(normalizeWatermarkImageUrl(value, API_BASE_URL)).toBeNull();
  });

  it("menolak konfigurasi API yang tidak valid", () => {
    expect(
      normalizeWatermarkImageUrl(
        "/api/watermark-assets/2026/07/logo.png",
        "not-a-url",
      ),
    ).toBeNull();
  });
});
