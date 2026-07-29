import { describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateDisplay,
  formatDateOnly,
  formatDateTime,
  parseDateString,
  todayIsoDate,
  toIsoDate,
} from "@/lib/utils/date";

describe("date utilities", () => {
  it("menghasilkan tanggal ISO lokal dengan padding", () => {
    expect(toIsoDate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  it("membaca format ISO, DMY slash, dan DMY dash", () => {
    expect(parseDateString(" 2026-07-29 ")).toEqual(new Date(2026, 6, 29));
    expect(parseDateString("9/7/2026")).toEqual(new Date(2026, 6, 9));
    expect(parseDateString("09-07-2026")).toEqual(new Date(2026, 6, 9));
    expect(parseDateString("")).toBeUndefined();
    expect(parseDateString("29 Juli 2026")).toBeUndefined();
  });

  it("memformat date-only, datetime, fallback, dan nilai mentah invalid", () => {
    expect(formatDateOnly("2026-07-29")).toContain("2026");
    expect(formatDate("2026-07-29T10:15:00+07:00")).toContain("2026");
    expect(formatDateTime("2026-07-29T10:15:00+07:00")).toMatch(/2026/);
    expect(formatDateOnly(undefined, "Belum ada")).toBe("Belum ada");
    expect(formatDateDisplay("  bukan-tanggal  ")).toBe("bukan-tanggal");
    expect(formatDateDisplay(null, "Kosong")).toBe("Kosong");
  });

  it("todayIsoDate memakai tanggal sistem lokal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 29, 8, 30));
    expect(todayIsoDate()).toBe("2026-07-29");
    vi.useRealTimers();
  });
});
