import { describe, expect, it } from "vitest";

import { mapMemorandumRecord } from "@/services/memorandum.service";
import { mapSuratMasukRecord } from "@/services/surat-masuk.service";

const completedDispositionHistory = [
  {
    id: "root-disposition",
    receiver_id: "manager-id",
    receiver_name: "Manager Operasional",
    parent_disposition_id: null,
    status: "FORWARDED",
    status_key: "FORWARDED",
    status_label: "Diteruskan",
  },
  {
    id: "child-disposition",
    receiver_id: "staff-id",
    receiver_name: "Staf Administrasi",
    parent_disposition_id: "root-disposition",
    status: "COMPLETED",
    status_key: "COMPLETED",
    status_label: "Selesai",
  },
];

describe("persuratan workflow mappers", () => {
  it("tidak menghidupkan kembali penerima lama sebagai penanggung jawab aktif surat masuk", () => {
    const record = mapSuratMasukRecord({
      id: "incoming-1",
      mail_number: "SM-001",
      regarding: "Surat pengujian",
      receive_date: "2026-08-18T00:00:00.000Z",
      status_key: "COMPLETED",
      status_label: "Selesai",
      initial_recipient_names: ["Manager Operasional"],
      current_holders: [],
      current_holder_names: [],
      disposition_mails: completedDispositionHistory,
    });

    expect(record).not.toBeNull();
    expect(record?.initial_recipient_names).toEqual(["Manager Operasional"]);
    expect(record?.current_holder_names).toEqual([]);
    expect(record?.disposisiKepada).toEqual([]);
    expect(record?.disposisi_history).toHaveLength(2);
  });

  it("memisahkan penerima awal, penanggung jawab aktif, dan riwayat memorandum", () => {
    const record = mapMemorandumRecord({
      id: "memo-1",
      memo_number: "MEMO-001",
      regarding: "Memo pengujian",
      memo_date: "2026-08-18T00:00:00.000Z",
      status_key: "COMPLETED",
      status_label: "Selesai",
      initial_recipient_names: ["Manager Operasional"],
      current_holders: [],
      current_holder_names: [],
      dispositions: completedDispositionHistory,
    });

    expect(record).not.toBeNull();
    expect(record?.penerima).toEqual(["Manager Operasional"]);
    expect(record?.initial_recipient_names).toEqual(["Manager Operasional"]);
    expect(record?.current_holder_names).toEqual([]);
    expect(record?.disposisi_history).toHaveLength(2);
  });
});
