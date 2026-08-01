import { describe, expect, it } from "vitest";

import { buildWatermarkPreviewUrl } from "@/lib/watermark-preview-url";

describe("buildWatermarkPreviewUrl", () => {
  it("membangun endpoint preview tetap dari base URL API", () => {
    expect(
      buildWatermarkPreviewUrl("https://api.example.test/api/v1"),
    ).toBe(
      "https://api.example.test/api/v1/watermark-settings/image-preview",
    );
  });

  it.each([
    "",
    "not-a-url",
    "javascript:alert(1)",
    "https://user@api.example.test/api/v1",
    "https://api.example.test/api/v2",
    "https://api.example.test/api/v1?redirect=evil",
  ])("menolak konfigurasi API yang tidak sah: %s", (value) => {
    expect(buildWatermarkPreviewUrl(value)).toBeNull();
  });
});
