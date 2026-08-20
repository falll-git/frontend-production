import { describe, expect, it } from "vitest";

import {
  formatMarketingActivityStatus,
  marketingActivityCreatorLabel,
} from "@/lib/marketing-activity";

describe("formatMarketingActivityStatus", () => {
  it.each([
    ["IN_PROGRESS", "Dalam Proses"],
    ["PROSES", "Dalam Proses"],
    ["PENDING", "Menunggu"],
    ["COMPLETED", "Selesai"],
    ["FAILED", "Gagal"],
  ])("mengubah %s menjadi label Indonesia", (status, expected) => {
    expect(formatMarketingActivityStatus(status)).toBe(expected);
  });

  it("mengubah enum tak dikenal menjadi label yang tetap terbaca", () => {
    expect(formatMarketingActivityStatus("WAITING_REVIEW")).toBe(
      "Waiting Review",
    );
  });

  it("mengembalikan tanda kosong untuk status kosong", () => {
    expect(formatMarketingActivityStatus(null)).toBe("-");
  });
});

describe("marketingActivityCreatorLabel", () => {
  it("memprioritaskan nama pembuat", () => {
    expect(
      marketingActivityCreatorLabel({ name: "Sifa Fauziah", username: "sifa" }),
    ).toBe("Sifa Fauziah");
  });

  it("menggunakan username saat nama tidak tersedia", () => {
    expect(marketingActivityCreatorLabel({ name: "", username: "sifa" })).toBe(
      "sifa",
    );
  });

  it("tidak menampilkan id teknis ketika relasi pembuat tidak tersedia", () => {
    expect(marketingActivityCreatorLabel(null)).toBe("-");
  });
});
