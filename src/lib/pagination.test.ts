import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGINATION_META,
  OPERATIONAL_TABLE_PAGE_SIZE,
  buildClientPaginationMeta,
  clampPage,
  getClientPageItems,
  getPageOffset,
} from "./pagination";

describe("pagination helpers", () => {
  it("menyediakan metadata awal untuk tabel operasional", () => {
    expect(DEFAULT_PAGINATION_META).toEqual({
      total: 0,
      page: 1,
      limit: OPERATIONAL_TABLE_PAGE_SIZE,
      lastPage: 1,
    });
  });

  it.each([
    { page: 0, lastPage: 5, expected: 1 },
    { page: 3.9, lastPage: 5.9, expected: 3 },
    { page: 9, lastPage: 5, expected: 5 },
    { page: Number.NaN, lastPage: Number.NaN, expected: 1 },
  ])("membatasi halaman $page ke rentang yang valid", ({ page, lastPage, expected }) => {
    expect(clampPage(page, lastPage)).toBe(expected);
  });

  it("menghitung offset dan menormalkan nilai minimum", () => {
    expect(getPageOffset(3, 20)).toBe(40);
    expect(getPageOffset(0, 0)).toBe(0);
  });

  it("mengambil item hanya untuk halaman yang diminta", () => {
    expect(getClientPageItems([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(getClientPageItems([1, 2], 5, 2)).toEqual([]);
  });

  it("membangun metadata dan membatasi halaman yang melewati halaman terakhir", () => {
    expect(buildClientPaginationMeta(45, 99, 10)).toEqual({
      total: 45,
      page: 5,
      limit: 10,
      lastPage: 5,
    });
  });

  it("menormalkan limit tidak valid tanpa menghasilkan halaman nol", () => {
    expect(buildClientPaginationMeta(0, 0, Number.NaN)).toEqual({
      total: 0,
      page: 1,
      limit: 1,
      lastPage: 1,
    });
  });
});
