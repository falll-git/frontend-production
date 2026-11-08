import { describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateDisplay,
  formatDateOnly,
  formatDateTime,
  formatDateTimeShort,
  formatDateTimeForExport,
  formatTime,
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

  it("tanggal/jam normal menggunakan koma dan titik dua tanpa zona teknis", () => {
    const value = new Date(2026, 8, 26, 13, 33).toISOString();
    expect(formatDateTime(value)).toBe("26 September 2026, 13:33");
    expect(formatDateTimeShort(value)).toBe("26 Sep 2026, 13:33");
    expect(formatTime(value)).toBe("13:33");
    expect(formatDateTime(value)).not.toMatch(/GMT|UTC|pukul/);
  });

  it("tengah malam dan pergantian tanggal memakai jam 00, bukan 24", () => {
    expect(formatDateTime(new Date(2026, 8, 30, 23, 59).toISOString())).toBe("30 September 2026, 23:59");
    expect(formatDateTime(new Date(2026, 9, 1, 0, 0).toISOString())).toBe("1 Oktober 2026, 00:00");
    expect(formatTime(new Date(2026, 9, 1, 0, 0))).toBe("00:00");
  });

  it("date-only tidak bergeser atau diberi jam yang tidak tersedia", () => {
    for (const value of ["2026-09-26", "26/09/2026", "26-09-2026"]) {
      expect(formatDateOnly(value)).toBe("26 September 2026");
      expect(formatDateTime(value)).toBe("26 September 2026");
    }
    expect(formatDateOnly("2024-02-29")).toBe("29 Februari 2024");
    expect(formatDateOnly("2026-02-29")).toBe("-");
    expect(formatDateOnly("2026-13-01")).toBe("-");
  });

  it("timestamp ber-offset tetap menunjukkan instant yang sama dalam zona perangkat", () => {
    const offset = "2026-09-26T00:15:00+14:00";
    expect(formatDateTime(offset)).toBe(formatDateTime("2026-09-25T10:15:00Z"));
    const native = new Date(offset);
    const expectedTime = `${String(native.getHours()).padStart(2, "0")}:${String(native.getMinutes()).padStart(2, "0")}`;
    expect(formatTime(offset)).toBe(expectedTime);
    expect(offset).toBe("2026-09-26T00:15:00+14:00");
  });

  it("kosong/invalid mempunyai fallback aman dan angka epoch nol tetap sah", () => {
    for (const value of [null, undefined, "", " ", "not-a-date", "2026-99-99"]) {
      expect(formatDateTime(value)).toBe("-");
      expect(formatDateTimeShort(value, "Belum tercatat")).toBe("Belum tercatat");
      expect(formatTime(value)).toBe("-");
    }
    expect(formatTime(new Date(NaN))).toBe("-");
    expect(formatDateTime(new Date(0).toISOString())).not.toBe("-");
  });

  it("format kolom ekspor existing tidak ikut berubah ke format UI", () => {
    const value = "2026-09-26T06:33:00Z";
    const old = new Intl.DateTimeFormat("id-ID", {day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
    expect(formatDateTimeForExport(value)).toBe(old);
    expect(formatDateDisplay("2026-09-26")).toBe("26 Sep 2026");
  });
});
