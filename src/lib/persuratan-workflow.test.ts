import { describe, expect, it } from "vitest";

import {
  formatActiveAssigneeLabel,
  getDispositionActionVisibility,
  getMyReportFilterForWorkflowStatus,
  loadPersuratanDeepLinkRecord,
  parsePersuratanDeepLink,
} from "@/lib/persuratan-workflow";

describe("persuratan workflow presentation", () => {
  it("menerima deep link tiga jenis persuratan dan menolak input tidak lengkap", () => {
    expect(parsePersuratanDeepLink("memorandum", "memo-1")).toEqual({
      kind: "memorandum",
      id: "memo-1",
    });
    expect(parsePersuratanDeepLink("surat-masuk", "in-1")).toEqual({
      kind: "surat-masuk",
      id: "in-1",
    });
    expect(parsePersuratanDeepLink("surat-keluar", "out-1")).toEqual({
      kind: "surat-keluar",
      id: "out-1",
    });
    expect(parsePersuratanDeepLink("memorandum", "")).toBeNull();
    expect(parsePersuratanDeepLink("jenis-lain", "x")).toBeNull();
  });

  it("memuat record tepat melalui loader kategori dari notifikasi", async () => {
    const calls: string[] = [];
    const loaders = {
      suratMasuk: async (id: string) => {
        calls.push(`surat-masuk:${id}`);
        return { id };
      },
      suratKeluar: async (id: string) => {
        calls.push(`surat-keluar:${id}`);
        return { id };
      },
      memorandum: async (id: string) => {
        calls.push(`memorandum:${id}`);
        return { id };
      },
    };

    await expect(
      loadPersuratanDeepLinkRecord(
        { kind: "memorandum", id: "memo-target" },
        loaders,
      ),
    ).resolves.toEqual({
      kind: "memorandum",
      record: { id: "memo-target" },
    });
    await expect(
      loadPersuratanDeepLinkRecord(
        { kind: "surat-masuk", id: "incoming-target" },
        loaders,
      ),
    ).resolves.toEqual({
      kind: "surat-masuk",
      record: { id: "incoming-target" },
    });
    await expect(
      loadPersuratanDeepLinkRecord(
        { kind: "surat-keluar", id: "outgoing-target" },
        loaders,
      ),
    ).resolves.toEqual({
      kind: "surat-keluar",
      record: { id: "outgoing-target" },
    });

    expect(calls).toEqual([
      "memorandum:memo-target",
      "surat-masuk:incoming-target",
      "surat-keluar:outgoing-target",
    ]);
  });

  it("tidak memakai penerima lama sebagai penanggung jawab aktif", () => {
    expect(formatActiveAssigneeLabel({ names: [], status: "COMPLETED" })).toBe(
      "Tidak ada — proses sudah selesai.",
    );
    expect(formatActiveAssigneeLabel({ names: [], status: "NEW" })).toBe(
      "Belum ada penanggung jawab aktif.",
    );
    expect(
      formatActiveAssigneeLabel({
        names: ["Manager Operasional", "Manager Operasional", "Staf Legal"],
        status: "IN_PROGRESS",
      }),
    ).toBe("Manager Operasional, Staf Legal");
  });

  it("menampilkan satu tahap tindakan pada setiap status", () => {
    expect(getDispositionActionVisibility("NEW")).toEqual({
      canStart: true,
      canComplete: false,
      canRedispose: false,
    });
    expect(getDispositionActionVisibility("IN_PROGRESS")).toEqual({
      canStart: false,
      canComplete: true,
      canRedispose: true,
    });
    expect(getDispositionActionVisibility("COMPLETED")).toEqual({
      canStart: false,
      canComplete: false,
      canRedispose: false,
    });
  });

  it("memilih filter riwayat yang sesuai ketika deep link dibuka", () => {
    expect(getMyReportFilterForWorkflowStatus("COMPLETED")).toBe("completed");
    expect(getMyReportFilterForWorkflowStatus("FORWARDED")).toBe("forwarded");
    expect(getMyReportFilterForWorkflowStatus("IN_PROGRESS")).toBe("active");
  });
});
