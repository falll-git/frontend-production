import writeExcelFile from "write-excel-file/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportToExcel } from "./exportExcel";

const toFile = vi.fn<(...args: unknown[]) => Promise<void>>();

vi.mock("write-excel-file/browser", () => ({
  default: vi.fn(() => ({ toFile })),
}));

describe("exportToExcel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 27, 10, 0, 0));
    toFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("membangun workbook dan nama file aman dengan tanggal", async () => {
    await exportToExcel({
      filename: "Laporan: Surat/Legal?.xlsx",
      sheetName: "Data",
      title: "Laporan Operasional",
      columns: [
        { header: "Kode", key: "code", width: 15 },
        { header: "Nilai", key: "value" },
      ],
      data: [{ code: "REG-001", value: 1000 }],
    });

    expect(writeExcelFile).toHaveBeenCalledTimes(1);
    const [rawRows, options] = vi.mocked(writeExcelFile).mock.calls[0];
    const rows = rawRows as unknown as Array<
      Array<{ value?: unknown; columnSpan?: number } | null>
    >;
    expect(rows).toHaveLength(3);
    expect(rows[0]?.[0]).toMatchObject({
      value: "Laporan Operasional",
      columnSpan: 2,
    });
    expect(
      rows[1]?.map((cell) => cell && cell.value),
    ).toEqual([
      "Kode",
      "Nilai",
    ]);
    expect(
      rows[2]?.map((cell) => cell && cell.value),
    ).toEqual([
      "REG-001",
      "1000",
    ]);
    expect(options).toMatchObject({
      sheet: "Data",
      stickyRowsCount: 2,
      showGridLines: false,
      columns: [{ width: 15 }, { width: 20 }],
    });
    expect(toFile).toHaveBeenCalledWith(
      "Laporan-Surat-Legal-20260727.xlsx",
    );
  });

  it("meneruskan kegagalan penulisan agar UI tidak melaporkan sukses palsu", async () => {
    toFile.mockRejectedValueOnce(new Error("write failed"));

    await expect(
      exportToExcel({
        filename: "laporan",
        sheetName: "Data",
        columns: [{ header: "Kode", key: "code" }],
        data: [],
      }),
    ).rejects.toThrow("write failed");
  });
});
