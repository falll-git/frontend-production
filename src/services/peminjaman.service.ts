import api from "@/lib/axios";
import {
  extractRecord,
  readString,
  toApiDateTime,
} from "@/services/api.utils";
import { getAllPaginatedRecords, mapDigitalDocument } from "@/services/arsip.service";
import type { Peminjaman } from "@/types/arsip.types";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapUserName(record: unknown): string {
  if (!isRecord(record)) return "-";

  return (
    readString(record, "username") ??
    readString(record, "name") ??
    readString(record, "email") ??
    "-"
  );
}

function toTimeLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function mapPeminjaman(record: AnyRecord): Peminjaman | null {
  const id = readString(record, "id");
  const statusKey = readString(record, "status_pinjam_key", "status_key");
  const statusLabel = readString(record, "status_pinjam_label", "status_label");
  const documentRecord = record.document;
  const document = isRecord(documentRecord) ? mapDigitalDocument(documentRecord) : null;

  if (!id || !statusKey || !statusLabel) return null;

  return {
    id,
    dokumenId: readString(record, "document_id") ?? document?.id ?? "",
    detail: document?.namaDokumen ?? "-",
    peminjam: mapUserName(record.borrower),
    tglPinjam:
      readString(record, "tanggal_pinjam", "requested_start_date") ?? "",
    tglKembali:
      readString(record, "tanggal_estimasi_pengembalian", "requested_due_date") ??
      "",
    tglPengembalian: readString(record, "tanggal_pengembalian", "returned_at"),
    status: statusLabel as Peminjaman["status"],
    statusKey: statusKey as Peminjaman["statusKey"],
    alasan: readString(record, "request_reason") ?? "",
    approver: mapUserName(record.approver) === "-" ? null : mapUserName(record.approver),
    tglApprove: readString(record, "approved_at"),
    jamApprove: toTimeLabel(readString(record, "approved_at")),
    alasanApprove: readString(record, "approval_note"),
    tanggalTolak: readString(record, "rejected_at"),
    alasanTolak: readString(record, "rejection_note"),
    tglPenyerahan: readString(record, "tanggal_penyerahan", "handover_at"),
    catatanPenyerahan: readString(record, "handover_note"),
    tanggalDikembalikan: readString(record, "tanggal_pengembalian", "returned_at"),
    catatanPengembalian: readString(record, "return_note"),
    isTerlambat: Boolean(record.is_overdue),
    borrower: isRecord(record.borrower)
      ? {
          id: readString(record.borrower, "id") ?? "",
          name: readString(record.borrower, "name") ?? "-",
          username: readString(record.borrower, "username") ?? "-",
          email: readString(record.borrower, "email") ?? "-",
        }
      : null,
    approverUser: isRecord(record.approver)
      ? {
          id: readString(record.approver, "id") ?? "",
          name: readString(record.approver, "name") ?? "-",
          username: readString(record.approver, "username") ?? "-",
          email: readString(record.approver, "email") ?? "-",
        }
      : null,
    rejectorUser: isRecord(record.rejector)
      ? {
          id: readString(record.rejector, "id") ?? "",
          name: readString(record.rejector, "name") ?? "-",
          username: readString(record.rejector, "username") ?? "-",
          email: readString(record.rejector, "email") ?? "-",
        }
      : null,
    handoverActor: isRecord(record.handover_actor)
      ? {
          id: readString(record.handover_actor, "id") ?? "",
          name: readString(record.handover_actor, "name") ?? "-",
          username: readString(record.handover_actor, "username") ?? "-",
          email: readString(record.handover_actor, "email") ?? "-",
        }
      : null,
    returnActor: isRecord(record.return_actor)
      ? {
          id: readString(record.return_actor, "id") ?? "",
          name: readString(record.return_actor, "name") ?? "-",
          username: readString(record.return_actor, "username") ?? "-",
          email: readString(record.return_actor, "email") ?? "-",
        }
      : null,
    document,
  };
}

type GetAllPeminjamanParams = {
  scope?: "borrower";
  status?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "HANDED_OVER"
    | "BORROWED"
    | "RETURNED"
    | "OVERDUE";
  report?: "history" | "overdue";
  document_id?: string;
  office_id?: string;
  cabinet_id?: string;
};

type CreatePeminjamanPayload = {
  document_ids: string[];
  requested_start_date: string;
  requested_due_date: string;
  request_reason: string;
};

export const peminjamanService = {
  getAll: async (params: GetAllPeminjamanParams = {}): Promise<Peminjaman[]> => {
    const records = await getAllPaginatedRecords("/digital-document-loans", params);
    return records
      .map((record) => mapPeminjaman(record))
      .filter((item): item is Peminjaman => item !== null);
  },
  getById: async (id: string): Promise<Peminjaman | null> => {
    const res = await api.get(`/digital-document-loans/${id}`);
    const record = extractRecord(res.data);
    return record ? mapPeminjaman(record) : null;
  },
  create: async (payload: CreatePeminjamanPayload): Promise<Peminjaman[]> => {
    const res = await api.post("/digital-document-loans", {
      ...payload,
      requested_start_date: toApiDateTime(payload.requested_start_date),
      requested_due_date: toApiDateTime(payload.requested_due_date),
    });
    const record = extractRecord(res.data);
    const items = Array.isArray(record?.items)
      ? record.items.filter(isRecord).map((item) => mapPeminjaman(item)).filter((item): item is Peminjaman => item !== null)
      : [];

    return items;
  },
  approve: async (
    id: string,
    payload: { approval_note: string },
  ): Promise<Peminjaman> => {
    const res = await api.patch(`/digital-document-loans/${id}/approve`, payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapPeminjaman(record) : null;

    if (!mapped) {
      throw new Error("Respons persetujuan peminjaman dari server tidak valid");
    }

    return mapped;
  },
  reject: async (
    id: string,
    payload: { rejection_note: string },
  ): Promise<Peminjaman> => {
    const res = await api.patch(`/digital-document-loans/${id}/reject`, payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapPeminjaman(record) : null;

    if (!mapped) {
      throw new Error("Respons penolakan peminjaman dari server tidak valid");
    }

    return mapped;
  },
  handover: async (
    id: string,
    payload: { handover_at: string; handover_note?: string },
  ): Promise<Peminjaman> => {
    const res = await api.patch(`/digital-document-loans/${id}/handover`, {
      handover_at: toApiDateTime(payload.handover_at),
      handover_note: payload.handover_note ?? "",
    });
    const record = extractRecord(res.data);
    const mapped = record ? mapPeminjaman(record) : null;

    if (!mapped) {
      throw new Error("Respons penyerahan dokumen dari server tidak valid");
    }

    return mapped;
  },
  returnLoan: async (
    id: string,
    payload: { returned_at: string; return_note?: string },
  ): Promise<Peminjaman> => {
    const res = await api.patch(`/digital-document-loans/${id}/return`, {
      returned_at: toApiDateTime(payload.returned_at),
      return_note: payload.return_note ?? "",
    });
    const record = extractRecord(res.data);
    const mapped = record ? mapPeminjaman(record) : null;

    if (!mapped) {
      throw new Error("Respons pengembalian dokumen dari server tidak valid");
    }

    return mapped;
  },
  getHistory: async (): Promise<Peminjaman[]> => {
    const records = await getAllPaginatedRecords("/digital-document-loans", {
      report: "history",
    });
    return records
      .map((record) => mapPeminjaman(record))
      .filter((item): item is Peminjaman => item !== null);
  },
  getOverdue: async (): Promise<Peminjaman[]> => {
    const records = await getAllPaginatedRecords("/digital-document-loans", {
      report: "overdue",
    });
    return records
      .map((record) => mapPeminjaman(record))
      .filter((item): item is Peminjaman => item !== null);
  },
};
