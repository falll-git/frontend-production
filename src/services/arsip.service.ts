import api from "@/lib/axios";
import {
  extractLastPage,
  extractList,
  extractPaginationMeta,
  extractRecord,
  readBoolean,
  readNumber,
  readString,
  toMultipartFormData,
} from "@/services/api.utils";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { toPreviewableFileUrl } from "@/lib/utils/file";
import { mapWatermarkFileMeta } from "@/services/watermark.service";
import type { PageQuery, PaginatedResult, PaginationMeta } from "@/types/api.types";
import type {
  AktivitasPenyimpanan,
  ArsipDivisionSummary,
  ArsipRoleSummary,
  ArsipStorageSummary,
  ArsipUserSummary,
  Dokumen,
  Kantor,
  Lemari,
  Peminjaman,
  Rak,
} from "@/types/arsip.types";

type AnyRecord = Record<string, unknown>;
type CollectionQuery = {
  page?: number;
  limit?: number | "all";
  search?: string;
};

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

function mapNamedSummary(
  record: unknown,
  nameKeys: string[] = ["name", "label"],
): { id: string; name: string } | null {
  if (!isRecord(record)) return null;

  const id = readString(record, "id");
  const name = readString(record, ...nameKeys);

  if (!id || !name) return null;

  return { id, name };
}

function mapRoleSummary(record: unknown): ArsipRoleSummary | null {
  return mapNamedSummary(record, ["name", "label", "role_name", "roleName"]);
}

function mapDivisionSummary(record: unknown): ArsipDivisionSummary | null {
  return mapNamedSummary(record, [
    "name",
    "label",
    "division_name",
    "divisionName",
  ]);
}

function mapUserSummary(record: unknown): ArsipUserSummary | null {
  if (!isRecord(record)) return null;

  const id = readString(record, "id");
  const name = readString(record, "name");
  const username = readString(record, "username");
  const email = readString(record, "email") ?? "";

  if (!id || !name || !username) return null;

  return {
    id,
    name,
    username,
    email,
    role_id: readString(record, "role_id", "roleId"),
    division_id: readString(record, "division_id", "divisionId"),
    role: mapRoleSummary(record.role),
    division: mapDivisionSummary(record.division),
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
  const owner = mapUserSummary(record.owner ?? record.owner_user);
  const ownerDivision = mapDivisionSummary(record.owner_division);
  const relatedUsers = Array.isArray(record.related_users)
    ? record.related_users
        .map((item) =>
          mapUserSummary(
            isRecord(item) && isRecord(item.user) ? item.user : item,
          ),
        )
        .filter((item): item is ArsipUserSummary => item !== null)
    : [];
  const currentLoan = mapLoanSummary(record.current_loan);
  const fileRecord = readNestedRecord(record, "file");

  const documentType = readNestedRecord(record, "document_type");
  const documentTypeId = readString(documentType ?? {}, "id");
  const jenisDokumen =
    readString(documentType ?? {}, "name") ??
    readString(documentType ?? {}, "code") ??
    "-";

  if (!id || !kode || !namaDokumen || !statusPinjamKey) return null;

  const fileName = readString(fileRecord ?? {}, "name") ?? undefined;
  const rawFileUrl = readString(fileRecord ?? {}, "url");
  const fileUrl = rawFileUrl
    ? toPreviewableFileUrl(rawFileUrl, fileName ?? namaDokumen)
    : undefined;

  return {
    id,
    kode,
    documentTypeId: documentTypeId ?? undefined,
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
      readString(record, "access_level", "level_access") === "RESTRICT"
        ? "RESTRICT"
        : "NON_RESTRICT",
    restrict: readBoolean(record, "is_restricted"),
    fileUrl,
    fileName,
    watermark: mapWatermarkFileMeta(record.watermark ?? fileRecord?.watermark),
    creator,
    owner,
    ownerDivision,
    relatedUsers,
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
    dokumenDipinjamJatuhTempo:
      readNumber(record, "overdue_loan_count") ??
      readNumber(record, "overdue_document_count") ??
      0,
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
    kapasitas: readNumber(record, "capacity") ?? undefined,
    status: readBoolean(record, "is_active") ? "Aktif" : "Nonaktif",
    jumlahRak: readNumber(record, "rack_count") ?? 0,
    totalDokumen: readNumber(record, "total_documents") ?? 0,
    dokumenDisposisi: readNumber(record, "pending_access_request_count") ?? 0,
    dokumenDipinjam: readNumber(record, "borrowed_document_count") ?? 0,
    dokumenDipinjamJatuhTempo:
      readNumber(record, "overdue_loan_count") ??
      readNumber(record, "overdue_document_count") ??
      0,
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
    dokumenDipinjamJatuhTempo:
      readNumber(record, "overdue_loan_count") ??
      readNumber(record, "overdue_document_count") ??
      0,
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
  file: File;
};

export type ArsipReportRiskItem = {
  key: string;
  label: string;
  description: string | null;
  total: number;
  severity: "normal" | "info" | "warning" | "critical";
  report_key: string | null;
  endpoint: string | null;
  query: Record<string, unknown>;
};

export type ArsipReportBreakdownItem = {
  id: string | null;
  code: string | null;
  name: string;
  division_id?: string | null;
  division_name?: string | null;
  total: number;
};

export type ArsipReportScope = {
  user_id: string | null;
  role_name: string | null;
  division_id: string | null;
  division_name: string | null;
  can_view_division_documents: boolean;
  can_view_all_documents: boolean;
  can_access_restricted_documents: boolean;
  can_report_all: boolean;
};

export type ArsipOperationalSummary = {
  version: string | null;
  generated_at: string | null;
  scope: ArsipReportScope;
  metrics: {
    total_active_documents: number;
    restricted_documents: number;
    non_restricted_documents: number;
    active_access_requests: number;
    expiring_access_requests: number;
    expired_access_requests: number;
    active_loans: number;
    pending_access_requests: number;
    pending_loans: number;
    due_soon_loans: number;
    overdue_loans: number;
    due_or_overdue_loans: number;
  };
};

export type ArsipDigitalReportSummary = {
  version: string | null;
  generated_at: string | null;
  scope: ArsipReportScope;
  operational_summary: ArsipOperationalSummary;
  overview: {
    total_documents: number;
    restricted_documents: number;
    non_restricted_documents: number;
    linked_to_debtor_documents: number;
    due_soon_loans: number;
    due_or_overdue_loans: number;
    pending_access_requests: number;
    active_access_requests: number;
    expiring_access_requests: number;
    expired_access_requests: number;
    pending_loans: number;
    active_loans: number;
    overdue_loans: number;
  };
  documents: {
    total: number;
    restricted: number;
    non_restricted: number;
    linked_to_debtor: number;
  };
  access_requests: {
    pending: number;
    approved: number;
    active: number;
    expiring_soon: number;
    expired: number;
    rejected: number;
  };
  loans: {
    pending: number;
    approved: number;
    handed_over: number;
    borrowed: number;
    returned: number;
    rejected: number;
    due_soon: number;
    overdue: number;
  };
  risk_queue: ArsipReportRiskItem[];
  workflow: {
    access_requests: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      completion_percent: number;
    };
    loans: {
      total: number;
      pending: number;
      approved: number;
      handed_over: number;
      borrowed: number;
      active: number;
      returned: number;
      rejected: number;
      overdue: number;
      completion_percent: number;
    };
  };
  breakdowns: {
    by_document_type: ArsipReportBreakdownItem[];
    by_owner_division: ArsipReportBreakdownItem[];
    by_owner_user: ArsipReportBreakdownItem[];
    by_access_level: Array<{
      key: string;
      total: number;
    }>;
  };
};

function mapReportScope(record: AnyRecord | null): ArsipReportScope {
  return {
    user_id: readString(record ?? {}, "user_id"),
    role_name: readString(record ?? {}, "role_name"),
    division_id: readString(record ?? {}, "division_id"),
    division_name: readString(record ?? {}, "division_name"),
    can_view_division_documents: readBoolean(
      record ?? {},
      "can_view_division_documents",
    ),
    can_view_all_documents: readBoolean(record ?? {}, "can_view_all_documents"),
    can_access_restricted_documents: readBoolean(
      record ?? {},
      "can_access_restricted_documents",
    ),
    can_report_all: readBoolean(record ?? {}, "can_report_all"),
  };
}

function mapRiskSeverity(value: string | null): ArsipReportRiskItem["severity"] {
  switch (value) {
    case "info":
    case "warning":
    case "critical":
    case "normal":
      return value;
    default:
      return "normal";
  }
}

function mapOperationalSummary(
  record: AnyRecord | null,
  fallbackScope: ArsipReportScope,
  overview: AnyRecord,
): ArsipOperationalSummary {
  const metricsRecord = readNestedRecord(record ?? {}, "metrics") ?? {};
  const dueSoonLoans =
    readNumber(metricsRecord, "due_soon_loans") ??
    readNumber(overview, "due_soon_loans") ??
    0;
  const overdueLoans =
    readNumber(metricsRecord, "overdue_loans") ??
    readNumber(overview, "overdue_loans") ??
    0;
  const metrics = {
    total_active_documents:
      readNumber(metricsRecord, "total_active_documents") ??
      readNumber(overview, "total_documents") ??
      0,
    restricted_documents:
      readNumber(metricsRecord, "restricted_documents") ??
      readNumber(overview, "restricted_documents") ??
      0,
    non_restricted_documents:
      readNumber(metricsRecord, "non_restricted_documents") ??
      readNumber(overview, "non_restricted_documents") ??
      0,
    active_access_requests:
      readNumber(metricsRecord, "active_access_requests") ??
      readNumber(overview, "active_access_requests") ??
      0,
    expiring_access_requests:
      readNumber(metricsRecord, "expiring_access_requests") ??
      readNumber(overview, "expiring_access_requests") ??
      0,
    expired_access_requests:
      readNumber(metricsRecord, "expired_access_requests") ??
      readNumber(overview, "expired_access_requests") ??
      0,
    active_loans:
      readNumber(metricsRecord, "active_loans") ??
      readNumber(overview, "active_loans") ??
      0,
    pending_access_requests:
      readNumber(metricsRecord, "pending_access_requests") ??
      readNumber(overview, "pending_access_requests") ??
      0,
    pending_loans:
      readNumber(metricsRecord, "pending_loans") ??
      readNumber(overview, "pending_loans") ??
      0,
    due_soon_loans: dueSoonLoans,
    overdue_loans: overdueLoans,
    due_or_overdue_loans:
      readNumber(metricsRecord, "due_or_overdue_loans") ??
      dueSoonLoans + overdueLoans,
  };
  return {
    version: readString(record ?? {}, "version"),
    generated_at: readString(record ?? {}, "generated_at"),
    scope: record?.scope && isRecord(record.scope)
      ? mapReportScope(record.scope)
      : fallbackScope,
    metrics,
  };
}

function mapRiskQueueItem(record: unknown): ArsipReportRiskItem | null {
  if (!isRecord(record)) return null;

  const key = readString(record, "key");
  const label = readString(record, "label");
  if (!key || !label) return null;

  return {
    key,
    label,
    description: readString(record, "description"),
    total: readNumber(record, "total") ?? 0,
    severity: mapRiskSeverity(readString(record, "severity")),
    report_key: readString(record, "report_key"),
    endpoint: readString(record, "endpoint"),
    query: isRecord(record.query) ? record.query : {},
  };
}

function mapBreakdownItem(record: unknown): ArsipReportBreakdownItem | null {
  if (!isRecord(record)) return null;

  return {
    id: readString(record, "id"),
    code: readString(record, "code"),
    name: readString(record, "name", "key") ?? "-",
    division_id: readString(record, "division_id", "divisionId"),
    division_name: readString(record, "division_name", "divisionName"),
    total: readNumber(record, "total") ?? 0,
  };
}

function mapAccessLevelBreakdown(record: unknown): {
  key: string;
  total: number;
} | null {
  if (!isRecord(record)) return null;

  const key = readString(record, "key");
  if (!key) return null;

  return {
    key,
    total: readNumber(record, "total") ?? 0,
  };
}

function mapReportSummary(record: AnyRecord | null): ArsipDigitalReportSummary {
  const documents = readNestedRecord(record ?? {}, "documents") ?? {};
  const accessRequests = readNestedRecord(record ?? {}, "access_requests") ?? {};
  const loans = readNestedRecord(record ?? {}, "loans") ?? {};
  const overview = readNestedRecord(record ?? {}, "overview") ?? {};
  const workflow = readNestedRecord(record ?? {}, "workflow") ?? {};
  const workflowAccessRequests =
    readNestedRecord(workflow, "access_requests") ?? {};
  const workflowLoans = readNestedRecord(workflow, "loans") ?? {};
  const breakdowns = readNestedRecord(record ?? {}, "breakdowns") ?? {};
  const scope = mapReportScope(readNestedRecord(record ?? {}, "scope"));
  const activeLoans =
    (readNumber(loans, "handed_over") ?? 0) +
    (readNumber(loans, "borrowed") ?? 0);
  const dueSoonLoans =
    readNumber(overview, "due_soon_loans") ??
    readNumber(loans, "due_soon") ??
    0;
  const overdueLoans =
    readNumber(overview, "overdue_loans") ??
    readNumber(loans, "overdue") ??
    0;
  const accessWorkflowTotal =
    (readNumber(accessRequests, "pending") ?? 0) +
    (readNumber(accessRequests, "approved") ?? 0) +
    (readNumber(accessRequests, "rejected") ?? 0);
  const loanWorkflowTotal =
    (readNumber(loans, "pending") ?? 0) +
    (readNumber(loans, "approved") ?? 0) +
    (readNumber(loans, "handed_over") ?? 0) +
    (readNumber(loans, "borrowed") ?? 0) +
    (readNumber(loans, "returned") ?? 0) +
    (readNumber(loans, "rejected") ?? 0);

  return {
    version: readString(record ?? {}, "version"),
    generated_at: readString(record ?? {}, "generated_at"),
    scope,
    operational_summary: mapOperationalSummary(
      readNestedRecord(record ?? {}, "operational_summary"),
      scope,
      overview,
    ),
    overview: {
      total_documents:
        readNumber(overview, "total_documents") ??
        readNumber(documents, "total") ??
        0,
      restricted_documents:
        readNumber(overview, "restricted_documents") ??
        readNumber(documents, "restricted") ??
        0,
      non_restricted_documents:
        readNumber(overview, "non_restricted_documents") ??
        readNumber(documents, "non_restricted") ??
        0,
      linked_to_debtor_documents:
        readNumber(overview, "linked_to_debtor_documents") ??
        readNumber(documents, "linked_to_debtor") ??
        0,
      due_soon_loans:
        dueSoonLoans,
      due_or_overdue_loans:
        readNumber(overview, "due_or_overdue_loans") ??
        dueSoonLoans + overdueLoans,
      pending_access_requests:
        readNumber(overview, "pending_access_requests") ??
        readNumber(accessRequests, "pending") ??
        0,
      active_access_requests:
        readNumber(overview, "active_access_requests") ??
        readNumber(accessRequests, "active") ??
        readNumber(accessRequests, "approved") ??
        0,
      expiring_access_requests:
        readNumber(overview, "expiring_access_requests") ??
        readNumber(accessRequests, "expiring_soon") ??
        0,
      expired_access_requests:
        readNumber(overview, "expired_access_requests") ??
        readNumber(accessRequests, "expired") ??
        0,
      pending_loans:
        readNumber(overview, "pending_loans") ??
        readNumber(loans, "pending") ??
        0,
      active_loans: readNumber(overview, "active_loans") ?? activeLoans,
      overdue_loans: overdueLoans,
    },
    documents: {
      total: readNumber(documents, "total") ?? 0,
      restricted: readNumber(documents, "restricted") ?? 0,
      non_restricted: readNumber(documents, "non_restricted") ?? 0,
      linked_to_debtor: readNumber(documents, "linked_to_debtor") ?? 0,
    },
    access_requests: {
      pending: readNumber(accessRequests, "pending") ?? 0,
      approved: readNumber(accessRequests, "approved") ?? 0,
      active:
        readNumber(accessRequests, "active") ??
        readNumber(accessRequests, "approved") ??
        0,
      expiring_soon: readNumber(accessRequests, "expiring_soon") ?? 0,
      expired: readNumber(accessRequests, "expired") ?? 0,
      rejected: readNumber(accessRequests, "rejected") ?? 0,
    },
    loans: {
      pending: readNumber(loans, "pending") ?? 0,
      approved: readNumber(loans, "approved") ?? 0,
      handed_over: readNumber(loans, "handed_over") ?? 0,
      borrowed: readNumber(loans, "borrowed") ?? 0,
      returned: readNumber(loans, "returned") ?? 0,
      rejected: readNumber(loans, "rejected") ?? 0,
      due_soon: dueSoonLoans,
      overdue: overdueLoans,
    },
    risk_queue: Array.isArray(record?.risk_queue)
      ? record.risk_queue
          .map((item) => mapRiskQueueItem(item))
          .filter((item): item is ArsipReportRiskItem => item !== null)
      : [],
    workflow: {
      access_requests: {
        total:
          readNumber(workflowAccessRequests, "total") ?? accessWorkflowTotal,
        pending:
          readNumber(workflowAccessRequests, "pending") ??
          readNumber(accessRequests, "pending") ??
          0,
        approved:
          readNumber(workflowAccessRequests, "approved") ??
          readNumber(accessRequests, "approved") ??
          0,
        rejected:
          readNumber(workflowAccessRequests, "rejected") ??
          readNumber(accessRequests, "rejected") ??
          0,
        completion_percent:
          readNumber(workflowAccessRequests, "completion_percent") ?? 0,
      },
      loans: {
        total: readNumber(workflowLoans, "total") ?? loanWorkflowTotal,
        pending:
          readNumber(workflowLoans, "pending") ??
          readNumber(loans, "pending") ??
          0,
        approved:
          readNumber(workflowLoans, "approved") ??
          readNumber(loans, "approved") ??
          0,
        handed_over:
          readNumber(workflowLoans, "handed_over") ??
          readNumber(loans, "handed_over") ??
          0,
        borrowed:
          readNumber(workflowLoans, "borrowed") ??
          readNumber(loans, "borrowed") ??
          0,
        active: readNumber(workflowLoans, "active") ?? activeLoans,
        returned:
          readNumber(workflowLoans, "returned") ??
          readNumber(loans, "returned") ??
          0,
        rejected:
          readNumber(workflowLoans, "rejected") ??
          readNumber(loans, "rejected") ??
          0,
        overdue:
          readNumber(workflowLoans, "overdue") ??
          readNumber(loans, "overdue") ??
          0,
        completion_percent: readNumber(workflowLoans, "completion_percent") ?? 0,
      },
    },
    breakdowns: {
      by_document_type: Array.isArray(breakdowns.by_document_type)
        ? breakdowns.by_document_type
            .map((item) => mapBreakdownItem(item))
            .filter((item): item is ArsipReportBreakdownItem => item !== null)
        : [],
      by_owner_division: Array.isArray(breakdowns.by_owner_division)
        ? breakdowns.by_owner_division
            .map((item) => mapBreakdownItem(item))
            .filter((item): item is ArsipReportBreakdownItem => item !== null)
        : [],
      by_owner_user: Array.isArray(breakdowns.by_owner_user)
        ? breakdowns.by_owner_user
            .map((item) => mapBreakdownItem(item))
            .filter((item): item is ArsipReportBreakdownItem => item !== null)
        : [],
      by_access_level: Array.isArray(breakdowns.by_access_level)
        ? breakdowns.by_access_level
            .map((item) => mapAccessLevelBreakdown(item))
            .filter(
              (item): item is { key: string; total: number } => item !== null,
            )
        : [],
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
  getPage: async ({
    page = 1,
    limit = OPERATIONAL_TABLE_PAGE_SIZE,
    search,
  }: PageQuery = {}): Promise<PaginatedResult<Dokumen>> => {
    const res = await api.get("/digital-documents", {
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
      },
    });
    const items = extractList(res.data)
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);

    return {
      items,
      meta: extractPaginationMeta(res.data, {
        page,
        limit,
        total: items.length,
      }),
    };
  },
  getRequestable: async (): Promise<Dokumen[]> => {
    const records = await getPaginatedRecords("/digital-documents/requestable");
    return records
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);
  },
  getRequestablePage: async ({
    page = 1,
    limit = OPERATIONAL_TABLE_PAGE_SIZE,
    search,
  }: PageQuery = {}): Promise<PaginatedResult<Dokumen>> => {
    const res = await api.get("/digital-documents/requestable", {
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
      },
    });
    const items = extractList(res.data)
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);

    return {
      items,
      meta: extractPaginationMeta(res.data, {
        page,
        limit,
        total: items.length,
      }),
    };
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
  getStorageHistoriesPage: async ({
    page = 1,
    limit = OPERATIONAL_TABLE_PAGE_SIZE,
    search,
  }: PageQuery = {}): Promise<PaginatedResult<AktivitasPenyimpanan>> => {
    const res = await api.get("/digital-archives/histories/storage", {
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
      },
    });
    const items = extractList(res.data)
      .map((record) => mapStorageHistory(record))
      .filter((item): item is AktivitasPenyimpanan => item !== null);

    return {
      items,
      meta: extractPaginationMeta(res.data, {
        page,
        limit,
        total: items.length,
      }),
    };
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
  getStorageOfficesPage: async ({
    page = 1,
    limit = OPERATIONAL_TABLE_PAGE_SIZE,
    search,
  }: CollectionQuery = {}): Promise<PaginatedResult<Kantor>> => {
    const res = await api.get("/digital-archives/storage/offices", {
      params: {
        ...(limit === "all" ? { limit } : { page, limit }),
        ...(search ? { search } : {}),
      },
    });
    const items = extractList(res.data)
      .map((item) => mapOffice(item))
      .filter((item): item is Kantor => item !== null);
    const fallback =
      limit === "all"
        ? {
            total: items.length,
            page: 1,
            limit: Math.max(items.length, 1),
            lastPage: 1,
          }
        : {
            page,
            limit,
            total: items.length,
          };

    return {
      items,
      meta: extractPaginationMeta(res.data, fallback),
    };
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
    const res = await api.get(
      `/digital-archives/storage/offices/${officeId}/cabinets`,
      {
        params: {
          limit: "all",
        },
      },
    );
    return extractList(res.data)
      .map((item) => mapCabinet(item))
      .filter((item): item is Lemari => item !== null);
  },
  getOfficeCabinetsPage: async (
    officeId: string,
    {
      page = 1,
      limit = OPERATIONAL_TABLE_PAGE_SIZE,
      search,
    }: CollectionQuery = {},
  ): Promise<PaginatedResult<Lemari>> => {
    const res = await api.get(
      `/digital-archives/storage/offices/${officeId}/cabinets`,
      {
        params: {
          ...(limit === "all" ? { limit } : { page, limit }),
          ...(search ? { search } : {}),
        },
      },
    );
    const items = extractList(res.data)
      .map((item) => mapCabinet(item))
      .filter((item): item is Lemari => item !== null);
    const fallback =
      limit === "all"
        ? {
            total: items.length,
            page: 1,
            limit: Math.max(items.length, 1),
            lastPage: 1,
          }
        : {
            page,
            limit,
            total: items.length,
          };

    return {
      items,
      meta: extractPaginationMeta(res.data, fallback),
    };
  },
  getCabinetRacks: async (cabinetId: string): Promise<Rak[]> => {
    const res = await api.get(
      `/digital-archives/storage/cabinets/${cabinetId}/racks`,
      {
        params: {
          limit: "all",
        },
      },
    );
    return extractList(res.data)
      .map((item) => mapRack(item))
      .filter((item): item is Rak => item !== null);
  },
  getCabinetRacksPage: async (
    cabinetId: string,
    {
      page = 1,
      limit = OPERATIONAL_TABLE_PAGE_SIZE,
      search,
    }: CollectionQuery = {},
  ): Promise<PaginatedResult<Rak>> => {
    const res = await api.get(
      `/digital-archives/storage/cabinets/${cabinetId}/racks`,
      {
        params: {
          ...(limit === "all" ? { limit } : { page, limit }),
          ...(search ? { search } : {}),
        },
      },
    );
    const items = extractList(res.data)
      .map((item) => mapRack(item))
      .filter((item): item is Rak => item !== null);
    const fallback =
      limit === "all"
        ? {
            total: items.length,
            page: 1,
            limit: Math.max(items.length, 1),
            lastPage: 1,
          }
        : {
            page,
            limit,
            total: items.length,
          };

    return {
      items,
      meta: extractPaginationMeta(res.data, fallback),
    };
  },
  getRackDocuments: async (rackId: string, params: Record<string, unknown> = {}): Promise<{
    data: Dokumen[];
    meta: PaginationMeta;
  }> => {
    const res = await api.get(`/digital-archives/storage/racks/${rackId}/documents`, { params });
    const items = extractList(res.data)
      .map((record) => mapDigitalDocument(record))
      .filter((item): item is Dokumen => item !== null);
    return {
      data: items,
      meta: extractPaginationMeta(res.data, { total: items.length }),
    };
  },
};
