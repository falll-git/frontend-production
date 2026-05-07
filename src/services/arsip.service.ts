import api from "@/lib/axios";
import {
  extractLastPage,
  extractList,
  extractRecord,
  readBoolean,
  readNumber,
  readString,
  toMultipartFormData,
} from "@/services/api.utils";
import type {
  AktivitasPenyimpanan,
  ArsipStorageSummary,
  ArsipUserSummary,
  Dokumen,
  Kantor,
  Lemari,
  Peminjaman,
  Rak,
} from "@/types/arsip.types";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNestedRecord(record: AnyRecord, key: string): AnyRecord | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function readDateTime(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function mapUserSummary(record: unknown): ArsipUserSummary | null {
  if (!isRecord(record)) return null;

  const id = readString(record, "id");
  const name = readString(record, "name");
  const username = readString(record, "username");
  const email = readString(record, "email");

  if (!id || !name || !username || !email) return null;

  return {
    id,
    name,
    username,
    email,
  };
}

export function mapStorageSummary(record: unknown): ArsipStorageSummary | null {
  if (!isRecord(record)) return null;

  const id = readString(record, "id");
  const officeId = readString(record, "office_id");
  const officeCode = readString(record, "office_code");
  const officeName = readString(record, "office_name");
  const cabinetId = readString(record, "cabinet_id");
  const cabinetCode = readString(record, "cabinet_code");
  const rackName = readString(record, "rack_name");
  const capacity = readNumber(record, "capacity") ?? 0;
  const isActive = readBoolean(record, "is_active");
  const locationLabel =
    readString(record, "location_label") ??
    [officeName, cabinetCode && rackName ? `${cabinetCode} (${rackName})` : rackName]
      .filter(Boolean)
      .join(" - ");

  if (!id) return null;

  return {
    id,
    officeId,
    officeCode,
    officeName,
    cabinetId,
    cabinetCode,
    rackName,
    capacity,
    isActive,
    locationLabel: locationLabel || rackName || id,
  };
}

function mapAvailabilityLabel(label: string | null): Dokumen["statusPinjam"] {
  switch (label) {
    case "Diajukan":
      return "Diajukan";
    case "Dalam Proses":
      return "Dalam Proses";
    case "Dipinjam":
      return "Dipinjam";
    case "Tersedia":
    default:
      return "Tersedia";
  }
}

function mapLoanStatusLabel(label: string | null): Peminjaman["status"] {
  switch (label) {
    case "Menunggu Persetujuan":
    case "Pending":
      return "Menunggu Persetujuan";
    case "Disetujui":
      return "Disetujui";
    case "Ditolak":
      return "Ditolak";
    case "Sudah Diserahkan":
      return "Sudah Diserahkan";
    case "Dipinjam":
      return "Dipinjam";
    case "Dikembalikan":
      return "Dikembalikan";
    case "Terlambat":
      return "Terlambat";
    default:
      return "Menunggu Persetujuan";
  }
}

function extractTimeLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function mapLoanSummary(record: unknown): Peminjaman | null {
  if (!isRecord(record)) return null;

  const id = readString(record, "id");
  const statusKey = readString(record, "status_pinjam_key", "status_key");
  const statusLabel = readString(record, "status_pinjam_label", "status_label");
  const borrower = mapUserSummary(record.borrower);

  if (!id || !statusKey || !statusLabel) return null;

  return {
    id,
    dokumenId: readString(record, "document_id") ?? "",
    detail: readString(record, "request_reason") ?? "-",
    peminjam: borrower?.username ?? borrower?.name ?? "-",
    tglPinjam:
      readString(record, "tanggal_pinjam", "requested_start_date") ?? "",
    tglKembali:
      readString(record, "tanggal_estimasi_pengembalian", "requested_due_date") ??
      "",
    tglPengembalian: readDateTime(record.tanggal_pengembalian ?? record.returned_at),
    status: mapLoanStatusLabel(statusLabel),
    statusKey: statusKey as Peminjaman["statusKey"],
    alasan: readString(record, "request_reason") ?? "",
    approver:
      mapUserSummary(record.approver)?.username ??
      mapUserSummary(record.approver)?.name ??
      null,
    tglApprove: readDateTime(record.approved_at),
    jamApprove: extractTimeLabel(readDateTime(record.approved_at)),
    alasanApprove: readString(record, "approval_note"),
    tanggalTolak: readDateTime(record.rejected_at),
    alasanTolak: readString(record, "rejection_note"),
    tglPenyerahan: readDateTime(record.tanggal_penyerahan ?? record.handover_at),
    catatanPenyerahan: readString(record, "handover_note"),
    tanggalDikembalikan: readDateTime(
      record.tanggal_pengembalian ?? record.returned_at,
    ),
    catatanPengembalian: readString(record, "return_note"),
    isTerlambat: readBoolean(record, "is_overdue"),
    borrower,
    approverUser: mapUserSummary(record.approver),
    rejectorUser: mapUserSummary(record.rejector),
    handoverActor: mapUserSummary(record.handover_actor),
    returnActor: mapUserSummary(record.return_actor),
    document: undefined,
  };
}

export function mapDigitalDocument(record: AnyRecord): Dokumen | null {
  const id = readString(record, "id");
  const kode = readString(record, "document_number");
  const namaDokumen = readString(record, "document_name");
  const statusPinjam = mapAvailabilityLabel(
    readString(record, "availability_status_label"),
  );
  const statusPinjamKey = readString(record, "availability_status_key");
  const storage = mapStorageSummary(record.storage);
  const creator = mapUserSummary(record.creator);
  const currentLoan = mapLoanSummary(record.current_loan);
  const fileRecord = readNestedRecord(record, "file");

  const documentType = readNestedRecord(record, "document_type");
  const jenisDokumen =
    readString(documentType ?? {}, "name") ??
    readString(documentType ?? {}, "code") ??
    "-";

  if (!id || !kode || !namaDokumen || !statusPinjamKey) return null;

  return {
    id,
    kode,
    jenisDokumen,
    namaDokumen,
    detail: readString(record, "description") ?? "-",
    tglInput: readString(record, "created_at") ?? "",
    userInput: creator?.username ?? creator?.name ?? "-",
    tempatPenyimpanan: storage?.locationLabel ?? "-",
    tempatPenyimpananId: storage?.id,
    statusPinjam,
    statusPeminjaman: statusPinjam,
    statusPinjamKey: statusPinjamKey as Dokumen["statusPinjamKey"],
    levelAkses:
      readString(record, "level_access") === "RESTRICT"
        ? "RESTRICT"
        : "NON_RESTRICT",
    restrict: readBoolean(record, "is_restricted"),
    fileUrl: readString(fileRecord ?? {}, "url") ?? undefined,
    fileName: readString(fileRecord ?? {}, "name") ?? undefined,
    creator,
    storage,
    currentLoan,
    accessRequestSummary: {
      pendingCount:
        readNumber(readNestedRecord(record, "access_request_summary") ?? {}, "pending_count") ??
        0,
    },
    loanSummary: {
      totalCount:
        readNumber(readNestedRecord(record, "loan_summary") ?? {}, "total_count") ??
        0,
    },
  };
}

function mapStorageHistory(record: AnyRecord): AktivitasPenyimpanan | null {
  const id = readString(record, "id");
  const actionKey = readString(record, "action_key");
  const actionLabel = readString(record, "action_label");
  const documentRecord = readNestedRecord(record, "document");

  if (!id || !actionKey || !actionLabel) return null;

  return {
    id,
    actionKey,
    actionLabel,
    referenceType: readString(record, "reference_type"),
    referenceId: readString(record, "reference_id"),
    description: readString(record, "description"),
    createdAt: readString(record, "created_at") ?? "",
    actor: mapUserSummary(record.actor),
    document: documentRecord
      ? {
          id: readString(documentRecord, "id") ?? "",
          documentNumber: readString(documentRecord, "document_number") ?? "-",
          documentName: readString(documentRecord, "document_name") ?? "-",
        }
      : null,
    fromStorage: mapStorageSummary(record.from_storage),
    toStorage: mapStorageSummary(record.to_storage),
  };
}

function mapOffice(record: AnyRecord): Kantor | null {
  const id = readString(record, "id");
  const namaKantor = readString(record, "name");
  if (!id || !namaKantor) return null;

  return {
    id,
    namaKantor,
    kodeKantor: readString(record, "code") ?? undefined,
    totalDokumen: readNumber(record, "total_documents") ?? 0,
    jumlahLemari: readNumber(record, "cabinet_count") ?? 0,
    dokumenDisposisi: readNumber(record, "pending_access_request_count") ?? 0,
    dokumenDipinjam: readNumber(record, "borrowed_document_count") ?? 0,
    dokumenDipinjamJatuhTempo: readNumber(record, "overdue_document_count") ?? 0,
  };
}

function mapCabinet(record: AnyRecord): Lemari | null {
  const id = readString(record, "id");
  const kantorId = readString(record, "office_id");
  const kodeLemari = readString(record, "code");
  if (!id || !kantorId || !kodeLemari) return null;

  return {
    id,
    kantorId,
    kodeLemari,
    jumlahRak: readNumber(record, "rack_count") ?? 0,
    totalDokumen: readNumber(record, "total_documents") ?? 0,
    dokumenDisposisi: readNumber(record, "pending_access_request_count") ?? 0,
    dokumenDipinjam: readNumber(record, "borrowed_document_count") ?? 0,
    dokumenDipinjamJatuhTempo: readNumber(record, "overdue_document_count") ?? 0,
  };
}

function mapRack(record: AnyRecord): Rak | null {
  const id = readString(record, "id");
  const lemariId = readString(record, "cabinet_id");
  const namaRak = readString(record, "rack_name");
  if (!id || !lemariId || !namaRak) return null;

  return {
    id,
    lemariId,
    namaRak,
    totalArsip: readNumber(record, "total_documents") ?? 0,
    kapasitas: readNumber(record, "capacity") ?? undefined,
    status: readBoolean(record, "is_active") ? "Aktif" : "Nonaktif",
    totalDokumen: readNumber(record, "total_documents") ?? 0,
    dokumenDisposisi: readNumber(record, "pending_access_request_count") ?? 0,
    dokumenDipinjam: readNumber(record, "borrowed_document_count") ?? 0,
    dokumenDipinjamJatuhTempo: readNumber(record, "overdue_document_count") ?? 0,
  };
}

async function getPaginatedRecords(
  path: string,
  params: Record<string, unknown> = {},
): Promise<AnyRecord[]> {
  const first = await api.get(path, {
    params: {
      ...params,
      page: 1,
      limit: 100,
    },
  });

  const items = [...extractList(first.data)];
  const lastPage = extractLastPage(first.data);

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await api.get(path, {
      params: {
        ...params,
        page,
        limit: 100,
      },
    });

    items.push(...extractList(next.data));
  }

  return items;
}

export async function getAllPaginatedRecords(
  path: string,
  params: Record<string, unknown> = {},
): Promise<AnyRecord[]> {
  return getPaginatedRecords(path, params);
}

export type CreateDokumenPayload = {
  storage_id: string;
  document_type_id: string;
  document_name: string;
  description?: string;
  is_restricted: boolean;
  owner_user_id?: string;
  owner_division_id?: string;
  related_user_ids?: string[];
  debtor_id?: string;
  debtor_name?: string;
  document_date?: string;
  due_date?: string;
  file: File;
};

export type ArsipDigitalReportSummary = {
  documents: {
    total: number;
    restricted: number;
    non_restricted: number;
    linked_to_debtor: number;
    due_soon: number;
    overdue: number;
  };
  access_requests: {
    pending: number;
    approved: number;
    rejected: number;
  };
  loans: {
    pending: number;
    approved: number;
    handed_over: number;
    borrowed: number;
    returned: number;
    rejected: number;
    overdue: number;
  };
  storage: {
    offices: number;
    cabinets: number;
    racks: number;
    used_racks: number;
  };
};

function mapReportSummary(record: AnyRecord | null): ArsipDigitalReportSummary {
  const documents = readNestedRecord(record ?? {}, "documents") ?? {};
  const accessRequests = readNestedRecord(record ?? {}, "access_requests") ?? {};
  const loans = readNestedRecord(record ?? {}, "loans") ?? {};
  const storage = readNestedRecord(record ?? {}, "storage") ?? {};

  return {
    documents: {
      total: readNumber(documents, "total") ?? 0,
      restricted: readNumber(documents, "restricted") ?? 0,
      non_restricted: readNumber(documents, "non_restricted") ?? 0,
      linked_to_debtor: readNumber(documents, "linked_to_debtor") ?? 0,
      due_soon: readNumber(documents, "due_soon") ?? 0,
      overdue: readNumber(documents, "overdue") ?? 0,
    },
    access_requests: {
      pending: readNumber(accessRequests, "pending") ?? 0,
      approved: readNumber(accessRequests, "approved") ?? 0,
      rejected: readNumber(accessRequests, "rejected") ?? 0,
    },
    loans: {
      pending: readNumber(loans, "pending") ?? 0,
      approved: readNumber(loans, "approved") ?? 0,
      handed_over: readNumber(loans, "handed_over") ?? 0,
      borrowed: readNumber(loans, "borrowed") ?? 0,
      returned: readNumber(loans, "returned") ?? 0,
      rejected: readNumber(loans, "rejected") ?? 0,
      overdue: readNumber(loans, "overdue") ?? 0,
    },
    storage: {
      offices: readNumber(storage, "offices") ?? 0,
      cabinets: readNumber(storage, "cabinets") ?? 0,
      racks: readNumber(storage, "racks") ?? 0,
      used_racks: readNumber(storage, "used_racks") ?? 0,
    },
  };
}

export const arsipService = {
  getReportSummary: async (): Promise<ArsipDigitalReportSummary> => {
    const res = await api.get("/digital-archives/reports/summary");
    return mapReportSummary(extractRecord(res.data));
  },
  getAll: async (): Promise<Dokumen[]> => {
    const records = await getPaginatedRecords("/digital-documents");
    return records
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);
  },
  getRequestable: async (): Promise<Dokumen[]> => {
    const records = await getPaginatedRecords("/digital-documents/requestable");
    return records
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);
  },
  getById: async (id: string): Promise<Dokumen | null> => {
    const res = await api.get(`/digital-documents/${id}`);
    const record = extractRecord(res.data);
    return record ? mapDigitalDocument(record) : null;
  },
  getActivityLogs: async (id: string): Promise<AktivitasPenyimpanan[]> => {
    const records = await getPaginatedRecords(`/digital-documents/${id}/activity-logs`);
    return records
      .map((record) => mapStorageHistory(record))
      .filter((item): item is AktivitasPenyimpanan => item !== null);
  },
  getStorageHistories: async (): Promise<AktivitasPenyimpanan[]> => {
    const records = await getPaginatedRecords("/digital-archives/histories/storage");
    return records
      .map((record) => mapStorageHistory(record))
      .filter((item): item is AktivitasPenyimpanan => item !== null);
  },
  getStorageSummary: async (): Promise<{
    offices: Kantor[];
    cabinets: Lemari[];
    racks: Rak[];
  }> => {
    const res = await api.get("/digital-archives/storage/offices");
    const record = extractRecord(res.data);
    const offices = Array.isArray(record?.offices)
      ? record.offices
          .filter(isRecord)
          .map((item) => mapOffice(item))
          .filter((item): item is Kantor => item !== null)
      : [];
    const cabinets = Array.isArray(record?.cabinets)
      ? record.cabinets
          .filter(isRecord)
          .map((item) => mapCabinet(item))
          .filter((item): item is Lemari => item !== null)
      : [];
    const racks = Array.isArray(record?.racks)
      ? record.racks
          .filter(isRecord)
          .map((item) => mapRack(item))
          .filter((item): item is Rak => item !== null)
      : [];

    return { offices, cabinets, racks };
  },
  create: async (data: CreateDokumenPayload): Promise<Dokumen> => {
    const res = await api.post(
      "/digital-documents",
      toMultipartFormData(data),
    );
    const record = extractRecord(res.data);
    const mapped = record ? mapDigitalDocument(record) : null;

    if (!mapped) {
      throw new Error("Respons create dokumen dari server tidak valid");
    }

    return mapped;
  },
  update: async (
    id: string,
    data: Partial<CreateDokumenPayload>,
  ): Promise<Dokumen> => {
    const body =
      data.file instanceof File
        ? toMultipartFormData(data)
        : data;
    const res = await api.put(`/digital-documents/${id}`, body);
    const record = extractRecord(res.data);
    const mapped = record ? mapDigitalDocument(record) : null;

    if (!mapped) {
      throw new Error("Respons update dokumen dari server tidak valid");
    }

    return mapped;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/digital-documents/${id}`);
  },
  getOfficeCabinets: async (officeId: string): Promise<Lemari[]> => {
    const res = await api.get(`/digital-archives/storage/offices/${officeId}/cabinets`);
    return extractList(res.data)
      .map((item) => mapCabinet(item))
      .filter((item): item is Lemari => item !== null);
  },
  getCabinetRacks: async (cabinetId: string): Promise<Rak[]> => {
    const res = await api.get(`/digital-archives/storage/cabinets/${cabinetId}/racks`);
    return extractList(res.data)
      .map((item) => mapRack(item))
      .filter((item): item is Rak => item !== null);
  },
  getRackDocuments: async (rackId: string, params: Record<string, unknown> = {}): Promise<{
    data: Dokumen[];
    meta: { total: number; page: number; lastPage: number };
  }> => {
    const res = await api.get(`/digital-archives/storage/racks/${rackId}/documents`, { params });
    const items = extractList(res.data)
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);
    const meta = isRecord(res.data?.meta) ? res.data.meta : res.data;
    return {
      data: items,
      meta: {
        total: readNumber(meta, "total") ?? items.length,
        page: readNumber(meta, "page") ?? 1,
        lastPage: readNumber(meta, "lastPage", "last_page") ?? 1,
      },
    };
  },
};
