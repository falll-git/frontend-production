import { describe, expect, it } from "vitest";

import { createBackendRewrites } from "@/lib/backend-rewrites";

describe("createBackendRewrites", () => {
  it("mengarahkan file privat ke mount backend tanpa menambahkan versi API", () => {
    expect(createBackendRewrites("http://localhost:7111/api/v1")).toEqual([
      {
        source: "/api/digital-archive-files/:path*",
        destination: "http://localhost:7111/api/digital-archive-files/:path*",
      },
      {
        source: "/api/persuratan-files/:path*",
        destination: "http://localhost:7111/api/persuratan-files/:path*",
      },
      {
        source: "/api/watermark-files/:path*",
        destination: "http://localhost:7111/api/watermark-files/:path*",
      },
      {
        source: "/api/watermarked-files/:path*",
        destination: "http://localhost:7111/api/watermarked-files/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:7111/api/v1/:path*",
      },
    ]);
  });

  it("mempertahankan base path reverse proxy dan menolak URL tidak valid", () => {
    const rewrites = createBackendRewrites(
      "https://arsip.example.test/backend/api/v1/",
    );

    expect(rewrites[0]?.destination).toBe(
      "https://arsip.example.test/backend/api/digital-archive-files/:path*",
    );
    expect(rewrites.at(-1)?.destination).toBe(
      "https://arsip.example.test/backend/api/v1/:path*",
    );
    expect(createBackendRewrites("bukan-url")).toEqual([]);
  });
});
