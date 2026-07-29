import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { BRAND_KEYS, resolveBrandConfig } from "@/config/branding";

describe("branding deployment", () => {
  it("memakai domain demo sebagai default dan hanya menampilkan Ruwang Arsip", () => {
    const brand = resolveBrandConfig(undefined);

    expect(brand.key).toBe("demoruwangarsip");
    expect(brand.partnerLogo).toBeNull();
    expect(brand.authLogoLayout.partnerMaxWidth).toBeNull();
  });

  it("memetakan empat domain ke aset unik yang valid", () => {
    const brands = BRAND_KEYS.map((key) => resolveBrandConfig(key));
    const partnerSources = brands
      .map((brand) => brand.partnerLogo?.src)
      .filter(Boolean);

    expect(brands).toHaveLength(4);
    expect(new Set(partnerSources).size).toBe(3);
    for (const brand of brands) {
      const logos = [brand.ruwangLogo, brand.partnerLogo].filter(Boolean);
      for (const logo of logos) {
        if (!logo) continue;
        expect(
          existsSync(
            path.join(
              process.cwd(),
              "public",
              logo.src.replace(/^\/+/, ""),
            ),
          ),
        ).toBe(true);
        expect(logo.contentBox.x + logo.contentBox.width).toBeLessThanOrEqual(
          logo.sourceWidth,
        );
        expect(logo.contentBox.y + logo.contentBox.height).toBeLessThanOrEqual(
          logo.sourceHeight,
        );
      }
    }
  });

  it("menerima ukuran per deployment tetapi menolak nilai di luar batas aman", () => {
    const customized = resolveBrandConfig("arthamadani", {
      ruwangMaxWidth: "280",
      partnerMaxWidth: "510",
      separatorSize: "40",
    });
    expect(customized.authLogoLayout).toEqual({
      ruwangMaxWidth: 280,
      partnerMaxWidth: 510,
      separatorSize: 40,
    });

    const guarded = resolveBrandConfig("riyalirsyadi", {
      ruwangMaxWidth: "9999",
      partnerMaxWidth: "0",
      separatorSize: "not-a-number",
    });
    expect(guarded.authLogoLayout).toEqual({
      ruwangMaxWidth: 325,
      partnerMaxWidth: 520,
      separatorSize: 34,
    });
  });

  it("menolak brand key yang tidak dikenal agar salah konfigurasi terlihat", () => {
    expect(() => resolveBrandConfig("brand-yang-tidak-ada")).toThrow(
      /tidak dikenal/,
    );
  });
});
