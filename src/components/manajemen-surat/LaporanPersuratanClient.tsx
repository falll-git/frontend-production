"use client";

import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableColGroup,
  SetupDataTableCol,
  SetupDataTableEmptyRow,
  SetupTableCard,
  SetupTableScroll,
} from "@/components/ui/SetupDataTable";
import { SetupSkeletonBlock } from "@/components/ui/SetupSkeleton";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCheck,
  Edit2,
  FileText,
  History,
  Inbox,
  Mail,
  PlayCircle,
  Send,
  Shield,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import {
  getDispositionActionLabel,
  getDispositionActionMode,
} from "@/components/manajemen-surat/DispositionModalParts";
import MemorandumDisposisiModal from "@/components/manajemen-surat/MemorandumDisposisiModal";
import PhysicalStorageSelect from "@/components/manajemen-surat/PhysicalStorageSelect";
import SuratMasukDisposisiModal from "@/components/manajemen-surat/SuratMasukDisposisiModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FileUploadField from "@/components/ui/FileUploadField";
import Pagination from "@/components/ui/Pagination";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupReportSelectorCards, {
  type SetupReportSelectorCard,
} from "@/components/ui/SetupReportSelectorCards";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupCloseListButton from "@/components/ui/SetupCloseListButton";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupModalCloseButton from "@/components/ui/SetupModalCloseButton";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import WatermarkFileStatus from "@/components/ui/WatermarkFileStatus";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_PANEL_HEADER_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_GROUP_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import {
  type CorrespondenceMyReportFilter,
  type CorrespondenceReportScope,
  type MemorandumDisposisi,
  type Memorandum,
  type SuratDisposisi,
  type SuratKeluar,
  type SuratMasuk,
  type SuratUser,
} from "@/types/surat.types";
import { formatDate, formatDateTime, parseDateString } from "@/lib/utils/date";
import { isValidFileUrl, validatePersuratanFile } from "@/lib/utils/file";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { toApiDateTime } from "@/services/api.utils";
import { correspondenceService } from "@/services/correspondence.service";
import { divisionService } from "@/services/division.service";
import { letterPriorityService } from "@/services/letter-priority.service";
import { memorandumService } from "@/services/memorandum.service";
import {
  createParameterMasterService,
  type ParameterMasterRecord,
} from "@/services/parameter-master.service";
import { storageService } from "@/services/storage.service";
import { suratKeluarService } from "@/services/surat-keluar.service";
import { suratMasukService } from "@/services/surat-masuk.service";
import type { Division, LetterPriority, Storage } from "@/types/master.types";
import type { WatermarkFileMeta } from "@/types/watermark.types";

type ReportKind = "surat-masuk" | "surat-keluar" | "memorandum";
type SortValue = "terbaru" | "terlama" | "tenggat-terdekat" | "tenggat-terlama";
type SetupStatusBadgeStatus = Parameters<typeof SetupStatusBadge>[0]["status"];

const SURAT_MASUK_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-surat-masuk";
const SURAT_KELUAR_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-surat-keluar";
const MEMORANDUM_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-memorandum";
const LAPORAN_PERSURATAN_MENU_URL = "/dashboard/manajemen-surat/laporan";
const CETAK_PERSURATAN_MENU_URL = "/dashboard/manajemen-surat/cetak-dokumen";
const PERSURATAN_DATA_SCOPE_MENU_URLS = [
  SURAT_MASUK_MENU_URL,
  SURAT_KELUAR_MENU_URL,
  MEMORANDUM_MENU_URL,
  LAPORAN_PERSURATAN_MENU_URL,
  CETAK_PERSURATAN_MENU_URL,
];
const mailDeliveryMediaService = createParameterMasterService(
  "/mail-delivery-media",
);

const REPORT_SCOPE_OPTIONS: Array<{
  value: CorrespondenceReportScope;
  label: string;
}> = [
  { value: "my", label: "Laporan Saya" },
  { value: "division", label: "Data Divisi" },
  { value: "all", label: "Semua Dokumen" },
];

const MY_REPORT_FILTER_OPTIONS: Array<{
  value: CorrespondenceMyReportFilter;
  label: string;
}> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Masih Aktif" },
  { value: "completed", label: "Selesai" },
  { value: "forwarded", label: "Diteruskan" },
];

type SuratMasukRecord = SuratMasuk & {
  fileUrl?: string;
};

type SuratKeluarRecord = SuratKeluar & {
  fileUrl?: string;
};

type MemorandumRecord = Memorandum & {
  fileUrl?: string;
};

type WorkflowDisposition = SuratDisposisi | MemorandumDisposisi;

type DetailState =
  | {
      kind: "surat-masuk";
      record: SuratMasukRecord;
    }
  | {
      kind: "surat-keluar";
      record: SuratKeluarRecord;
    }
  | {
      kind: "memorandum";
      record: MemorandumRecord;
    };

type SummaryCardConfig = SetupReportSelectorCard<ReportKind>;

interface ActiveSectionConfig {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  searchPlaceholder: string;
  supportsTenggatSort: boolean;
}

const personLookup = new Map<string, string>();

function normalizePersonName(value: string) {
  const normalized = value.trim();
  if (!normalized) return "-";

  return (
    personLookup.get(normalized.toLowerCase()) ??
    normalized.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function resolveUserDisplayName(
  value: string,
  userNameById: Map<string, string>,
  fallbackId?: string,
) {
  const directMatch = userNameById.get(value);
  if (directMatch) return directMatch;

  if (fallbackId) {
    const fallbackMatch = userNameById.get(fallbackId);
    if (fallbackMatch) return fallbackMatch;
  }

  return normalizePersonName(value);
}

function sortByDate<T>(
  records: T[],
  getDate: (record: T) => string,
  sort: "terbaru" | "terlama",
) {
  return [...records].sort((left, right) => {
    const leftDate = parseDateString(getDate(left)) ?? new Date(0);
    const rightDate = parseDateString(getDate(right)) ?? new Date(0);

    if (sort === "terlama") {
      return leftDate.getTime() - rightDate.getTime();
    }

    return rightDate.getTime() - leftDate.getTime();
  });
}

function sortByTenggat<T>(
  records: T[],
  getTenggat: (record: T) => string | undefined,
  sort: "tenggat-terdekat" | "tenggat-terlama",
) {
  return [...records].sort((left, right) => {
    const leftValue = getTenggat(left);
    const rightValue = getTenggat(right);
    const leftDate = leftValue ? new Date(leftValue) : undefined;
    const rightDate = rightValue ? new Date(rightValue) : undefined;
    const leftTime =
      leftDate && !Number.isNaN(leftDate.getTime()) ? leftDate.getTime() : null;
    const rightTime =
      rightDate && !Number.isNaN(rightDate.getTime())
        ? rightDate.getTime()
        : null;

    if (leftTime === null && rightTime === null) return 0;
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;

    return sort === "tenggat-terdekat"
      ? leftTime - rightTime
      : rightTime - leftTime;
  });
}

function sortRecords<T>(
  records: T[],
  getDate: (record: T) => string,
  getTenggat: (record: T) => string | undefined,
  sort: SortValue,
) {
  if (sort === "tenggat-terdekat" || sort === "tenggat-terlama") {
    return sortByTenggat(records, getTenggat, sort);
  }

  return sortByDate(records, getDate, sort);
}

function formatDisplayDate(value: string) {
  return formatDate(value);
}

function toDateInputValue(value: string | undefined | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function normalizeDeliveryMediaValue(value: string | undefined | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("langsung")) return "LANGSUNG";
  if (["email", "kurir", "pos"].includes(normalized)) {
    return normalized.toUpperCase();
  }
  return normalized.toUpperCase();
}

function toLocalDateKey(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isDateBeforeToday(value: string, today: Date) {
  const valueKey = toLocalDateKey(value);
  const todayKey = toLocalDateKey(today);

  return Boolean(valueKey && todayKey && valueKey < todayKey);
}

function getTenggatStats<T>(
  records: T[],
  getTenggat: (record: T) => string | undefined,
  today: Date,
  shouldCount: (record: T) => boolean = () => true,
) {
  let memilikiTenggat = 0;
  let melewatiTenggat = 0;

  records.forEach((record) => {
    if (!shouldCount(record)) return;
    const value = getTenggat(record);
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    memilikiTenggat += 1;
    if (isDateBeforeToday(value, today)) {
      melewatiTenggat += 1;
    }
  });

  return { memilikiTenggat, melewatiTenggat };
}

function isWorkflowRecordCompleted(
  record: SuratMasukRecord | MemorandumRecord,
) {
  const statusValues = [
    "statusKey" in record ? record.statusKey : undefined,
    "statusLabel" in record ? record.statusLabel : undefined,
    "statusDisposisi" in record ? record.statusDisposisi : undefined,
  ]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean);

  return statusValues.some((value) =>
    ["COMPLETED", "SELESAI"].includes(value),
  );
}

function hasActiveWorkflowDeadline(record: SuratMasukRecord | MemorandumRecord) {
  return !isWorkflowRecordCompleted(record) && record.active_dispositions_count > 0;
}

function getTenggatStatus(value: string | undefined, today: Date) {
  if (!value) {
    return {
      label: "—",
      variant: "none" as const,
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      label: "—",
      variant: "none" as const,
    };
  }

  if (isDateBeforeToday(value, today)) {
    return {
      label: "Lewat",
      variant: "overdue" as const,
    };
  }

  return {
    label: "Aktif",
    variant: "active" as const,
  };
}

function summarize(values: string[], limit = 2) {
  if (values.length === 0) {
    return "-";
  }

  if (values.length <= limit) {
    return values.join(", ");
  }

  return `${values.slice(0, limit).join(", ")} +${values.length - limit}`;
}

function countUniqueMeaningfulValues(values: Array<string | null | undefined>) {
  return new Set(
    values
      .map((value) => value?.trim() ?? "")
      .filter((value) => value.length > 0 && value !== "-"),
  ).size;
}

function countAvailableFiles(records: Array<{ fileUrl?: string }>) {
  return records.filter((record) => isValidFileUrl(record.fileUrl)).length;
}

function countActiveDispositionHolders(
  records: Array<{
    active_dispositions_count?: number;
    current_holders?: unknown[];
  }>,
) {
  return records.reduce((total, record) => {
    if (
      typeof record.active_dispositions_count === "number" &&
      Number.isFinite(record.active_dispositions_count)
    ) {
      return total + record.active_dispositions_count;
    }

    return total + (record.current_holders?.length ?? 0);
  }, 0);
}

function formatSuratMasukStatus(status: SuratMasuk["status"]) {
  if (status === "TERLAMBAT") return "Terlambat";
  if (status === "SELESAI") return "Selesai";
  return status === "DIDISPOSISI" ? "Disposisi" : "Baru";
}

function formatSuratMasukBadgeStatus(status: SuratMasuk["status"]) {
  if (status === "TERLAMBAT") return "Terlambat";
  if (status === "SELESAI") return "Selesai";
  return status === "DIDISPOSISI" ? "Disposisi" : "Baru";
}

function formatDetailTenggatValue(value: string | undefined) {
  return value ? formatDate(value) : "-";
}

function formatDetailTenggatStatus(value: string | undefined, today: Date) {
  const status = getTenggatStatus(value, today);
  return status.variant === "none" ? "-" : status.label;
}

function formatWorkflowTenggatStatus(
  record: SuratMasukRecord | MemorandumRecord,
  today: Date,
) {
  if (!record.tenggatWaktu) return "-";
  if (isWorkflowRecordCompleted(record)) return "Selesai";
  return formatDetailTenggatStatus(record.tenggatWaktu, today);
}

function getWorkflowTenggatBadgeStatus(label: string): SetupStatusBadgeStatus {
  if (label === "Lewat") return "Terlambat";
  if (label === "Selesai") return "Selesai";
  return "Aktif";
}

function formatJoinedNames(values: string[]) {
  return values.length > 0 ? values.join(", ") : "-";
}

function formatDocumentFileName(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : "Belum tersedia";
}

function normalizeSuratMasukRecord(
  record: SuratMasuk,
  userNameById: Map<string, string>,
): SuratMasukRecord {
  return {
    ...record,
    disposisiKepada: record.disposisiKepada.map((name) =>
      resolveUserDisplayName(name, userNameById),
    ),
    current_holders: record.current_holders.map((item) => ({
      ...item,
      name: resolveUserDisplayName(item.name, userNameById, item.id),
    })),
    current_holder_names: record.current_holder_names.map((name) =>
      resolveUserDisplayName(name, userNameById),
    ),
    last_holder: record.last_holder
      ? {
          ...record.last_holder,
          name: resolveUserDisplayName(
            record.last_holder.name,
            userNameById,
            record.last_holder.id,
          ),
        }
      : null,
    last_holder_name: record.last_holder_name
      ? resolveUserDisplayName(record.last_holder_name, userNameById)
      : record.last_holder_name,
    disposisi_history: record.disposisi_history.map((item) => ({
      ...item,
      dari_user_nama: resolveUserDisplayName(
        item.dari_user_nama,
        userNameById,
        item.dari_user_id,
      ),
      ke_user_nama: resolveUserDisplayName(
        item.ke_user_nama,
        userNameById,
        item.ke_user_id,
      ),
    })),
    fileUrl: record.fileUrl,
  };
}

function normalizeMemorandumRecord(
  record: Memorandum,
  userNameById: Map<string, string>,
): MemorandumRecord {
  return {
    ...record,
    pembuatMemo: resolveUserDisplayName(record.pembuatMemo, userNameById),
    penerima:
      record.penerimaTipe === "perorangan"
        ? record.penerima.map((name) =>
            resolveUserDisplayName(name, userNameById),
          )
        : record.penerima,
    current_holders: record.current_holders.map((item) => ({
      ...item,
      name: resolveUserDisplayName(item.name, userNameById, item.id),
    })),
    current_holder_names: record.current_holder_names.map((name) =>
      resolveUserDisplayName(name, userNameById),
    ),
    last_holder: record.last_holder
      ? {
          ...record.last_holder,
          name: resolveUserDisplayName(
            record.last_holder.name,
            userNameById,
            record.last_holder.id,
          ),
        }
      : null,
    last_holder_name: record.last_holder_name
      ? resolveUserDisplayName(record.last_holder_name, userNameById)
      : record.last_holder_name,
    disposisi_history: record.disposisi_history.map((item) => ({
      ...item,
      dari_user_nama: resolveUserDisplayName(
        item.dari_user_nama,
        userNameById,
        item.dari_user_id,
      ),
      ke_user_nama: resolveUserDisplayName(
        item.ke_user_nama,
        userNameById,
        item.ke_user_id,
      ),
    })),
    fileUrl: record.fileUrl,
  };
}

function getSuratMasukStatusBadgeStatus(
  status: SuratMasuk["status"],
): SetupStatusBadgeStatus {
  if (status === "TERLAMBAT") return "Terlambat";
  if (status === "SELESAI") return "Selesai";
  if (status === "DIDISPOSISI") return "Diteruskan";
  return "Baru";
}

function SuratMasukStatusBadge({ status }: { status: SuratMasuk["status"] }) {
  return (
    <SetupStatusBadge
      status={getSuratMasukStatusBadgeStatus(status)}
      label={formatSuratMasukBadgeStatus(status)}
    />
  );
}

function getDispositionStatusBadgeStatus(
  status: string,
): SetupStatusBadgeStatus {
  if (status === "COMPLETED") {
    return "Selesai";
  }

  if (status === "IN_PROGRESS") {
    return "Dalam Proses";
  }

  if (status === "FORWARDED") {
    return "Diteruskan";
  }

  return "Baru";
}

function getOutgoingStatusBadgeStatus(statusLabel: string): SetupStatusBadgeStatus {
  return statusLabel.trim().toLowerCase() === "aktif" ? "Aktif" : "Nonaktif";
}

function getCurrentDispositionForUser<T extends WorkflowDisposition>(
  dispositions: T[],
  userId?: string | null,
) {
  if (!userId) return null;
  return (
    dispositions.find(
      (item) => item.is_current && item.ke_user_id === userId,
    ) ?? null
  );
}

function PersuratanSectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function PersuratanInfoItem({
  label,
  value,
  children,
  className = "",
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
        {children ?? value ?? "-"}
      </div>
    </div>
  );
}

function PersuratanKeyValueRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="min-w-0 break-words text-sm font-semibold leading-6 text-slate-900">
        {children}
      </div>
    </div>
  );
}

function WorkflowTimelineSection({
  title,
  description,
  dispositions,
}: {
  title: string;
  description: string;
  dispositions: WorkflowDisposition[];
}) {
  return (
    <section className="space-y-4">
      <PersuratanSectionTitle title={title} description={description} />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {dispositions.length === 0 ? (
          <SetupEmptyState
            title="Belum ada riwayat disposisi."
            description="Riwayat akan muncul setelah surat diproses atau diteruskan."
            icon={History}
            tone="import"
            variant="panel"
          />
        ) : (
          <ol className="space-y-3">
            {dispositions.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SetupStatusBadge
                        status="Urutan"
                        label={(item.sequence ?? 0).toString().padStart(2, "0")}
                      />
                      <span className="break-words text-sm font-semibold text-slate-900">
                        {item.timeline_label}
                      </span>
                      {item.is_current ? <SetupStatusBadge status="Aktif" /> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                      <span>{formatDateTime(item.created_at)}</span>
                      {item.start_date ? (
                        <span>Mulai {formatDate(item.start_date)}</span>
                      ) : null}
                      {item.due_date ? (
                        <span>Tenggat {formatDate(item.due_date)}</span>
                      ) : null}
                      {item.completed_at ? (
                        <span>Selesai {formatDateTime(item.completed_at)}</span>
                      ) : null}
                    </div>

                    {item.catatan ? (
                      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm leading-6 text-slate-600">
                        {item.catatan}
                      </p>
                    ) : null}
                  </div>

                  <SetupStatusBadge
                    status={getDispositionStatusBadgeStatus(item.status_key)}
                    label={item.status_label}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const activeSectionConfig: Record<ReportKind, ActiveSectionConfig> = {
  "surat-masuk": {
    title: "Daftar Surat Masuk",
    subtitle: "Klik dua kali pada baris untuk membuka detail surat masuk.",
    icon: Inbox,
    searchPlaceholder: "Cari nama pengirim, perihal, atau nomor surat",
    supportsTenggatSort: true,
  },
  "surat-keluar": {
    title: "Daftar Surat Keluar",
    subtitle: "Klik dua kali pada baris untuk membuka detail surat keluar.",
    icon: Send,
    searchPlaceholder: "Cari nama penerima, alamat, atau nomor surat",
    supportsTenggatSort: false,
  },
  memorandum: {
    title: "Daftar Memorandum",
    subtitle: "Klik dua kali pada baris untuk membuka detail memorandum.",
    icon: FileText,
    searchPlaceholder:
      "Cari nomor memo, perihal, divisi, pembuat, atau penerima",
    supportsTenggatSort: true,
  },
};

const REPORT_TABLE_CLASS =
  `${SETUP_PAGE_MODERN_TABLE_CLASS} [table-layout:fixed] [&_thead_th]:whitespace-nowrap`;
const REPORT_SURAT_MASUK_TABLE_CLASS = `${REPORT_TABLE_CLASS} min-w-[2032px]`;
const REPORT_SURAT_KELUAR_TABLE_CLASS = `${REPORT_TABLE_CLASS} min-w-[1200px]`;
const REPORT_MEMORANDUM_TABLE_CLASS = `${REPORT_TABLE_CLASS} min-w-[1974px]`;
const REPORT_TABLE_HEADER_CELL_CLASS = SETUP_PAGE_MODERN_HEADER_CELL_CLASS;
const REPORT_TABLE_CELL_CLASS = SETUP_PAGE_MODERN_CELL_CLASS;
const REPORT_NUMBER_HEADER_CELL_CLASS = REPORT_TABLE_HEADER_CELL_CLASS;
const REPORT_NUMBER_CELL_CLASS = SETUP_PAGE_MODERN_NUMBER_CELL_CLASS;
const REPORT_STATUS_HEADER_CELL_CLASS =
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS;
const REPORT_STATUS_CELL_CLASS = SETUP_PAGE_MODERN_CENTER_CELL_CLASS;
const REPORT_ACTION_HEADER_CELL_CLASS =
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS;
const REPORT_ACTION_CELL_CLASS = SETUP_PAGE_MODERN_CENTER_CELL_CLASS;
const TABLE_TEXT_CLASS = "text-sm text-gray-700";
const TABLE_TEXT_MUTED_CLASS = "text-sm text-gray-600";
const TABLE_TEXT_STRONG_CLASS = "text-sm text-gray-900";
const TABLE_EMPTY_TEXT_CLASS = "text-sm text-gray-400";
const TABLE_MULTILINE_TEXT_CLASS =
  "block max-w-full break-normal text-sm leading-5 text-gray-600 line-clamp-2";
const TABLE_MULTILINE_STRONG_CLASS =
  "block max-w-full break-normal text-sm font-medium leading-5 text-gray-800 line-clamp-2";
const TABLE_ACTION_BUTTON_CLASS =
  "uiverse-modal-button uiverse-modal-button--primary min-h-9 w-[136px] justify-center whitespace-nowrap px-3 py-2 text-sm";
const REPORT_SURAT_MASUK_COLUMN_WIDTHS = [
  "56px",
  "190px",
  "230px",
  "260px",
  "150px",
  "118px",
  "220px",
  "150px",
  "150px",
  "150px",
  "170px",
  "88px",
] as const;
const REPORT_SURAT_KELUAR_COLUMN_WIDTHS = [
  "56px",
  "190px",
  "220px",
  "150px",
  "118px",
  "130px",
  "150px",
  "88px",
] as const;
const REPORT_MEMORANDUM_COLUMN_WIDTHS = [
  "56px",
  "150px",
  "220px",
  "160px",
  "220px",
  "220px",
  "150px",
  "150px",
  "150px",
  "240px",
  "170px",
  "88px",
] as const;

function ReportColGroup({ widths }: { widths: readonly string[] }) {
  return (
    <SetupDataTableColGroup>
      {widths.map((width, index) => (
        <SetupDataTableCol key={`${width}-${index}`} style={{ width }} />
      ))}
    </SetupDataTableColGroup>
  );
}

function ReportLoadingTable({
  widths,
}: {
  widths: readonly string[];
}) {
  const columnCount = widths.length;

  return (
    <SetupDataTable variant="report" density="compact">
      <ReportColGroup widths={widths} />
      <SetupDataTableHead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          {widths.map((width, index) => (
            <SetupDataTableHeaderCell
              key={`report-loading-head-${width}-${index}`}
              className={
                index === 0
                  ? REPORT_NUMBER_HEADER_CELL_CLASS
                  : REPORT_TABLE_HEADER_CELL_CLASS
              }
            >
              <SetupSkeletonBlock
                className={index === 0 ? "mx-auto h-3 w-7" : "h-3 w-24"}
              />
            </SetupDataTableHeaderCell>
          ))}
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        <SetupDataTableEmptyRow
          colSpan={columnCount}
          state="loading"
          loadingRows={6}
          loadingColumns={Math.min(columnCount, 7)}
        >
          Memuat laporan persuratan...
        </SetupDataTableEmptyRow>
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function SelectionState() {
  return (
    <SetupEmptyState
      title="Pilih kategori persuratan"
      description="Klik salah satu kartu di atas untuk menampilkan daftar surat atau memorandum."
      icon={Mail}
      variant="panel"
    />
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-8">
      <SetupEmptyState
        title="Tidak ada data yang sesuai filter"
        description="Coba ubah kata kunci, tipe surat, atau filter periode."
        isFiltered
        variant="table"
      />
    </div>
  );
}

function CorrespondenceActionMenu({
  itemName,
  canEdit,
  canDelete,
  onDetail,
  onEdit,
  onDelete,
}: {
  itemName: string;
  canEdit: boolean;
  canDelete: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SetupActionMenu
      label={`Buka aksi ${itemName}`}
      menuLabel={`Aksi untuk ${itemName}`}
      items={[
        {
          key: "detail",
          label: "Detail",
          icon: FileText,
          tone: "blue",
          onClick: onDetail,
        },
        {
          key: "edit",
          label: "Edit",
          icon: Edit2,
          tone: "blue",
          disabled: !canEdit,
          onClick: onEdit,
        },
        {
          key: "delete",
          label: "Hapus",
          icon: Trash2,
          tone: "red",
          disabled: !canDelete,
          onClick: onDelete,
        },
      ]}
    />
  );
}

function DispositionTableButton({
  label,
  disabled,
  itemName,
  onClick,
}: {
  label: "Disposisi" | "Redisposisi";
  disabled?: boolean;
  itemName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={TABLE_ACTION_BUTTON_CLASS}
      disabled={disabled}
      title={`${label} ${itemName}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <Send className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function DocumentSection({
  title = "File dan Preview",
  description = "File persuratan yang tersimpan dan dapat dipreview sesuai izin akses.",
  fileName,
  hasFile,
  watermark,
  onPreview,
}: {
  title?: string;
  description?: string;
  fileName: string;
  hasFile: boolean;
  watermark?: WatermarkFileMeta | null;
  onPreview: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-slate-950">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2">
        <PersuratanKeyValueRow label="Nama File">
          <span className="break-all">{formatDocumentFileName(fileName)}</span>
        </PersuratanKeyValueRow>
        <PersuratanKeyValueRow label="Watermark">
          <WatermarkFileStatus watermark={watermark} />
        </PersuratanKeyValueRow>
      </div>

      <div className="flex justify-end">
        <SetupViewButton
          onClick={onPreview}
          title={hasFile ? "Preview dokumen" : "File belum tersedia"}
          label="Preview"
          disabled={!hasFile}
        />
      </div>
    </div>
  );
}

function WorkflowActionPanel({
  currentDisposition,
  onStart,
  onComplete,
  isBusy,
  canUpdateStatus,
}: {
  currentDisposition: WorkflowDisposition | null;
  onStart: () => void;
  onComplete: () => void;
  isBusy: boolean;
  canUpdateStatus: boolean;
}) {
  if (!currentDisposition) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Tindak Lanjut Saya
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Aksi hanya muncul untuk disposisi aktif milik user login.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
        {canUpdateStatus && currentDisposition.can_start ? (
          <button
            type="button"
            onClick={onStart}
            disabled={isBusy}
            className="uiverse-modal-button uiverse-modal-button--neutral h-10 gap-2 border-amber-200 bg-amber-50 px-4 text-gray-900 hover:bg-amber-100"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Mulai Proses
          </button>
        ) : null}

        {canUpdateStatus && currentDisposition.can_complete ? (
          <button
            type="button"
            onClick={onComplete}
            disabled={isBusy}
            className="uiverse-modal-button uiverse-modal-button--neutral h-10 gap-2 border-emerald-200 bg-emerald-50 px-4 text-gray-900 hover:bg-emerald-100"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Tandai Selesai
          </button>
        ) : null}

        {!canUpdateStatus ||
        (!currentDisposition.can_start && !currentDisposition.can_complete) ? (
          <span className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500">
            Tidak ada aksi lanjutan.
          </span>
        ) : null}
        </div>
      </div>
    </div>
  );
}

type EditFormState = {
  letterPriorityId: string;
  personName: string;
  address: string;
  documentNumber: string;
  documentDate: string;
  storageId: string;
  regarding: string;
  description: string;
  deliveryMedia: string;
  originDivisionId: string;
  receivedDate: string;
};

type EditCorrespondencePayload =
  | {
      kind: "surat-masuk";
      id: string;
      data: Parameters<typeof suratMasukService.update>[1];
    }
  | {
      kind: "surat-keluar";
      id: string;
      data: Parameters<typeof suratKeluarService.update>[1];
    }
  | {
      kind: "memorandum";
      id: string;
      data: Parameters<typeof memorandumService.update>[1];
    };

const EMPTY_EDIT_FORM: EditFormState = {
  letterPriorityId: "",
  personName: "",
  address: "",
  documentNumber: "",
  documentDate: "",
  storageId: "",
  regarding: "",
  description: "",
  deliveryMedia: "",
  originDivisionId: "",
  receivedDate: "",
};

function buildEditInitialState(target: DetailState): EditFormState {
  if (target.kind === "surat-masuk") {
    return {
      ...EMPTY_EDIT_FORM,
      letterPriorityId: target.record.letterPrioritieId ?? "",
      personName: target.record.pengirim,
      address: target.record.alamatPengirim,
      documentNumber: target.record.namaSurat,
      documentDate: toDateInputValue(target.record.tanggalTerima),
      storageId: target.record.storageId ?? "",
      regarding: target.record.perihal,
      description: target.record.keterangan ?? "",
    };
  }

  if (target.kind === "surat-keluar") {
    return {
      ...EMPTY_EDIT_FORM,
      letterPriorityId: target.record.letterPrioritieId ?? "",
      personName: target.record.penerima,
      address: target.record.alamatPenerima,
      documentNumber: target.record.namaSurat,
      documentDate: toDateInputValue(target.record.tanggalKirim),
      storageId: target.record.storageId ?? "",
      deliveryMedia: normalizeDeliveryMediaValue(
        target.record.mediaRaw ?? target.record.media,
      ),
    };
  }

  return {
    ...EMPTY_EDIT_FORM,
    originDivisionId: target.record.originDivisionId ?? "",
    documentNumber: target.record.noMemo,
    documentDate: toDateInputValue(target.record.tanggal),
    storageId: target.record.storageId ?? "",
    receivedDate: toDateInputValue(
      target.record.receivedDate ?? target.record.tanggal,
    ),
    regarding: target.record.perihal,
    description: target.record.keterangan,
  };
}

function EditCorrespondenceModal({
  target,
  letterPriorities,
  divisions,
  storageOptions,
  deliveryMediaOptions,
  isOptionsLoading,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  target: DetailState;
  letterPriorities: LetterPriority[];
  divisions: Division[];
  storageOptions: Storage[];
  deliveryMediaOptions: ParameterMasterRecord[];
  isOptionsLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: EditCorrespondencePayload) => Promise<void>;
}) {
  const { showToast } = useAppToast();
  const [form, setForm] = useState<EditFormState>(() =>
    buildEditInitialState(target),
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const title =
    target.kind === "surat-masuk"
      ? "Ubah Surat Masuk"
      : target.kind === "surat-keluar"
        ? "Ubah Surat Keluar"
        : "Ubah Memorandum";

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      return;
    }

    const validationMessage = validatePersuratanFile(nextFile);
    if (validationMessage) {
      event.target.value = "";
      setFile(null);
      showToast(validationMessage, "error");
      return;
    }

    setFile(nextFile);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    if (isSubmitting) return;

    const nextFile = event.dataTransfer.files?.[0] ?? null;
    if (!nextFile) return;

    const validationMessage = validatePersuratanFile(nextFile);
    if (validationMessage) {
      setFile(null);
      showToast(validationMessage, "error");
      return;
    }

    setFile(nextFile);
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (target.kind === "surat-masuk") {
      if (
        !form.letterPriorityId ||
        !form.personName.trim() ||
        !form.address.trim() ||
        !form.documentNumber.trim() ||
        !form.documentDate ||
        !form.storageId ||
        !form.regarding.trim() ||
        !form.description.trim()
      ) {
        showToast("Lengkapi data surat masuk yang wajib.", "warning");
        return;
      }

      await onSubmit({
        kind: target.kind,
        id: String(target.record.id),
        data: {
          letter_prioritie_id: form.letterPriorityId,
          storage_id: form.storageId,
          name: form.personName.trim(),
          address: form.address.trim(),
          mail_number: form.documentNumber.trim(),
          receive_date: toApiDateTime(form.documentDate),
          regarding: form.regarding.trim(),
          description: form.description.trim(),
          file: file ?? undefined,
        },
      });
      return;
    }

    if (target.kind === "surat-keluar") {
      if (
        !form.letterPriorityId ||
        !form.personName.trim() ||
        !form.address.trim() ||
        !form.documentNumber.trim() ||
        !form.documentDate ||
        !form.storageId ||
        !form.deliveryMedia
      ) {
        showToast("Lengkapi data surat keluar yang wajib.", "warning");
        return;
      }

      await onSubmit({
        kind: target.kind,
        id: String(target.record.id),
        data: {
          letter_prioritie_id: form.letterPriorityId,
          storage_id: form.storageId,
          name: form.personName.trim(),
          address: form.address.trim(),
          mail_number: form.documentNumber.trim(),
          send_date: toApiDateTime(form.documentDate),
          delivery_media: form.deliveryMedia,
          file: file ?? undefined,
        },
      });
      return;
    }

    if (
      !form.originDivisionId ||
      !form.documentNumber.trim() ||
      !form.documentDate ||
      !form.receivedDate ||
      !form.storageId ||
      !form.regarding.trim() ||
      !form.description.trim()
    ) {
      showToast("Lengkapi data memorandum yang wajib.", "warning");
      return;
    }

    await onSubmit({
      kind: target.kind,
      id: String(target.record.id),
      data: {
        origin_division_id: form.originDivisionId,
        storage_id: form.storageId,
        memo_number: form.documentNumber.trim(),
        memo_date: toApiDateTime(form.documentDate),
        received_date: toApiDateTime(form.receivedDate),
        regarding: form.regarding.trim(),
        description: form.description.trim(),
        file: file ?? undefined,
      },
    });
  };

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Perubahan mengikuti izin update pada role-menu.
            </p>
          </div>
          <SetupModalCloseButton
            onClick={onClose}
            aria-label="Tutup modal"
            title="Tutup"
          />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-5 md:grid-cols-2">
            {target.kind !== "memorandum" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Sifat Surat <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  name="letterPriorityId"
                  value={form.letterPriorityId}
                  onChange={handleChange}
                  disabled={isOptionsLoading || isSubmitting}
                  required
                >
                  <option value="">
                    {isOptionsLoading ? "Memuat sifat surat..." : "Pilih sifat"}
                  </option>
                  {letterPriorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </SetupSelect>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Divisi Asal <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  name="originDivisionId"
                  value={form.originDivisionId}
                  onChange={handleChange}
                  disabled={isOptionsLoading || isSubmitting}
                  required
                >
                  <option value="">
                    {isOptionsLoading ? "Memuat divisi..." : "Pilih divisi"}
                  </option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </SetupSelect>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {target.kind === "memorandum"
                  ? "No Memo"
                  : "Nama / Nomor Surat"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <SetupTextInput
                name="documentNumber"
                value={form.documentNumber}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>

            {target.kind !== "memorandum" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {target.kind === "surat-masuk"
                      ? "Nama Pengirim"
                      : "Nama Penerima"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SetupTextInput
                    name="personName"
                    value={form.personName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {target.kind === "surat-masuk"
                      ? "Alamat Pengirim"
                      : "Alamat Penerima"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SetupTextarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    rows={2}
                    className="resize-none"
                    required
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {target.kind === "surat-keluar"
                  ? "Tanggal Pengiriman"
                  : target.kind === "memorandum"
                    ? "Tanggal Memo"
                    : "Tanggal Penerimaan"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <BasicDateInput
                value={form.documentDate}
                onChange={(nextValue) =>
                  setForm((prev) => ({ ...prev, documentDate: nextValue }))
                }
              />
            </div>

            <PhysicalStorageSelect
              id="editStorageId"
              name="storageId"
              value={form.storageId}
              storages={storageOptions}
              isLoading={isOptionsLoading}
              disabled={isSubmitting}
              onChange={handleChange}
            />

            {target.kind === "surat-masuk" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Divisi Tujuan Disposisi
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {target.record.targetDivisionNames?.join(", ") ||
                    target.record.disposisiKepada.join(", ") ||
                    "-"}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Divisi tujuan disposisi tidak dapat diubah setelah surat masuk dibuat.
                </p>
              </div>
            ) : null}

            {target.kind === "surat-keluar" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Media Pengiriman <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  name="deliveryMedia"
                  value={form.deliveryMedia}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Pilih media</option>
                  {deliveryMediaOptions.map((media) => (
                    <option key={media.id} value={String(media.code ?? "")}>
                      {String(media.name ?? media.code ?? "-")}
                    </option>
                  ))}
                </SetupSelect>
              </div>
            ) : null}

            {target.kind === "memorandum" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tanggal Diterima <span className="text-red-500">*</span>
                  </label>
                  <BasicDateInput
                    value={form.receivedDate}
                    onChange={(nextValue) =>
                      setForm((prev) => ({ ...prev, receivedDate: nextValue }))
                    }
                  />
                </div>
              </>
            ) : null}

            {target.kind === "memorandum" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Pembuat Memo
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  {target.record.pembuatMemo || "-"}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Pembuat memo mengikuti akun pembuat awal dan tidak diubah dari form update.
                </p>
              </div>
            ) : null}

            {target.kind === "surat-masuk" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Perihal Surat{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SetupTextarea
                  name="regarding"
                  value={form.regarding}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  rows={3}
                  className="resize-none"
                  placeholder="Ringkasan perihal atau isi surat..."
                  required
                />
              </div>
            ) : target.kind === "memorandum" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Perihal Memo <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  name="regarding"
                  value={form.regarding}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="Masukkan perihal memorandum"
                  required
                />
              </div>
            ) : null}

            {target.kind === "memorandum" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tujuan Awal
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {target.record.targetDivisionNames?.join(", ") ||
                    target.record.divisiTujuanAwal.join(", ") ||
                    "-"}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Divisi tujuan awal tidak dapat diubah setelah memorandum dibuat.
                </p>
              </div>
            ) : null}

            {target.kind !== "surat-keluar" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {target.kind === "memorandum"
                    ? "Keterangan Memo"
                    : "Keterangan Surat"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SetupTextarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  rows={3}
                  className="resize-none"
                  required
                />
              </div>
            ) : null}

            <div className="md:col-span-2">
              <FileUploadField
                id={`edit-${target.kind}-file-input`}
                file={file}
                fileName={file ? undefined : target.record.fileName}
                fileMeta={
                  file
                    ? null
                    : target.record.fileName
                      ? "File tersimpan saat ini. Pilih file baru jika ingin mengganti."
                      : "Belum ada file tersimpan."
                }
                inputRef={fileInputRef}
                disabled={isSubmitting}
                isDragActive={dragOver}
                required={false}
                title={
                  file
                    ? "Ganti file"
                    : target.record.fileName
                      ? "Pilih file pengganti"
                      : "Pilih file"
                }
                helperText="Kosongkan jika file lama tetap digunakan."
                onChange={handleFileChange}
                onClear={clearSelectedFile}
                onDrop={handleDrop}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (isSubmitting) return;
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-end gap-3 border-t border-gray-100 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="uiverse-modal-button uiverse-modal-button--neutral h-11 px-4"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOptionsLoading || !form.storageId}
              className="uiverse-modal-button uiverse-modal-button--primary h-11 px-4"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportSectionShell({
  title,
  subtitle,
  showReportScopeControls,
  availableReportScopes,
  icon: Icon,
  reportScope,
  onReportScopeChange,
  myReportFilter,
  onMyReportFilterChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sortValue,
  onSortChange,
  supportsTenggatSort,
  exportLabel = "Export Excel",
  exportDisabled,
  exportLoading,
  onExport,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  showReportScopeControls: boolean;
  availableReportScopes: CorrespondenceReportScope[];
  icon: LucideIcon;
  reportScope: CorrespondenceReportScope;
  onReportScopeChange: (value: CorrespondenceReportScope) => void;
  myReportFilter: CorrespondenceMyReportFilter;
  onMyReportFilterChange: (value: CorrespondenceMyReportFilter) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortValue: SortValue;
  onSortChange: (value: SortValue) => void;
  supportsTenggatSort: boolean;
  exportLabel?: string;
  exportDisabled?: boolean;
  exportLoading?: boolean;
  onExport?: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const visibleReportScopeOptions =
    availableReportScopes.length > 0
      ? REPORT_SCOPE_OPTIONS.filter((option) =>
          availableReportScopes.includes(option.value),
        )
      : REPORT_SCOPE_OPTIONS;

  return (
    <SetupTableCard variant="report" scroll={false}>
      <div className={SETUP_PAGE_PANEL_HEADER_CLASS}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-900">
            <Icon className="h-8 w-8" aria-hidden="true" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onExport ? (
            <SetupExcelButton
              label={exportLabel}
              loading={exportLoading}
              disabled={exportDisabled}
              onClick={onExport}
            />
          ) : null}
          <SetupCloseListButton onClick={onClose} />
        </div>
      </div>

      <div className="border-b border-gray-100 px-6 py-5">
        <div className="space-y-5">
          {showReportScopeControls ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
                  Cakupan Laporan
                </span>
                <div className={SETUP_PAGE_SEGMENTED_GROUP_CLASS}>
                  {visibleReportScopeOptions.map((option) => {
                    const isActive = reportScope === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onReportScopeChange(option.value)}
                        className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} ${
                          isActive
                            ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
                            : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {reportScope === "my" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
                    Filter Saya
                  </span>
                  <div className={`${SETUP_PAGE_SEGMENTED_GROUP_CLASS} flex-wrap`}>
                    {MY_REPORT_FILTER_OPTIONS.map((option) => {
                      const isActive = myReportFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onMyReportFilterChange(option.value)}
                          className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} ${
                            isActive
                              ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
                              : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <SetupSearchInput
              label="Cari Data"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
              Urutkan
            </label>
            <SetupSelect
              value={sortValue}
              onChange={(event) => onSortChange(event.target.value as SortValue)}
              aria-label={`Urutkan ${title}`}
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              {supportsTenggatSort ? (
                <>
                  <option value="tenggat-terdekat">Tenggat Terdekat</option>
                  <option value="tenggat-terlama">Tenggat Terlama</option>
                </>
              ) : null}
            </SetupSelect>
          </div>
        </div>
        </div>
      </div>

      <SetupTableScroll>{children}</SetupTableScroll>
    </SetupTableCard>
  );
}

export default function LaporanPersuratanClient() {
  const { openPreview } = useDocumentPreviewContext();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { hasCapability, hasFeature, ensureCapability, ensureFeature } =
    useProtectedAction();
  const [activeKind, setActiveKind] = useState<ReportKind | null>(null);
  const [reportScope, setReportScope] =
    useState<CorrespondenceReportScope>("my");
  const [availableReportScopes, setAvailableReportScopes] = useState<
    CorrespondenceReportScope[]
  >(["my"]);
  const [myReportFilter, setMyReportFilter] =
    useState<CorrespondenceMyReportFilter>("active");
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState<SortValue>("terbaru");
  const [selectedDetail, setSelectedDetail] = useState<DetailState | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<DetailState | null>(null);
  const [isUpdatingCorrespondence, setIsUpdatingCorrespondence] =
    useState(false);
  const [letterPriorities, setLetterPriorities] = useState<LetterPriority[]>(
    [],
  );
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [storageOptions, setStorageOptions] = useState<Storage[]>([]);
  const [deliveryMediaOptions, setDeliveryMediaOptions] = useState<
    ParameterMasterRecord[]
  >([]);
  const [isEditOptionsLoading, setIsEditOptionsLoading] = useState(false);
  const [suratMasukRecords, setSuratMasukRecords] = useState<
    SuratMasukRecord[]
  >([]);
  const [isLoadingSuratMasuk, setIsLoadingSuratMasuk] = useState(true);
  const [suratKeluarRecords, setSuratKeluarRecords] = useState<
    SuratKeluarRecord[]
  >([]);
  const [isLoadingSuratKeluar, setIsLoadingSuratKeluar] = useState(true);
  const [memorandumRecords, setMemorandumRecords] = useState<
    MemorandumRecord[]
  >([]);
  const [isLoadingMemorandum, setIsLoadingMemorandum] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteOutgoingTarget, setDeleteOutgoingTarget] =
    useState<SuratKeluarRecord | null>(null);
  const [isDeletingSuratKeluar, setIsDeletingSuratKeluar] = useState(false);
  const [deleteMemorandumTarget, setDeleteMemorandumTarget] =
    useState<MemorandumRecord | null>(null);
  const [isDeletingMemorandum, setIsDeletingMemorandum] = useState(false);
  const [suratDisposisiUsers, setSuratDisposisiUsers] = useState<SuratUser[]>(
    [],
  );
  const [memorandumDisposisiUsers, setMemorandumDisposisiUsers] = useState<
    SuratUser[]
  >([]);
  const [activeDisposisiSuratId, setActiveDisposisiSuratId] = useState<
    string | number | null
  >(null);
  const [selectedDisposisiUserIds, setSelectedDisposisiUserIds] = useState<
    string[]
  >([]);
  const [disposisiUserSearch, setDisposisiUserSearch] = useState("");
  const [disposisiDueDate, setDisposisiDueDate] = useState("");
  const [disposisiCatatan, setDisposisiCatatan] = useState("");
  const [isDisposisiSubmitting, setIsDisposisiSubmitting] = useState(false);
  const [activeMemorandumDisposisiId, setActiveMemorandumDisposisiId] =
    useState<string | number | null>(null);
  const [
    selectedMemorandumDisposisiUserIds,
    setSelectedMemorandumDisposisiUserIds,
  ] = useState<string[]>([]);
  const [memorandumDisposisiUserSearch, setMemorandumDisposisiUserSearch] =
    useState("");
  const [memorandumDisposisiDueDate, setMemorandumDisposisiDueDate] =
    useState("");
  const [memorandumDisposisiCatatan, setMemorandumDisposisiCatatan] =
    useState("");
  const [isMemorandumDisposisiSubmitting, setIsMemorandumDisposisiSubmitting] =
    useState(false);
  const [isUpdatingDispositionStatus, setIsUpdatingDispositionStatus] =
    useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SuratMasukRecord | null>(
    null,
  );
  const [isDeletingSuratMasuk, setIsDeletingSuratMasuk] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const canUpdateSuratMasuk = hasCapability(SURAT_MASUK_MENU_URL, "update");
  const canUpdateSuratKeluar = hasCapability(SURAT_KELUAR_MENU_URL, "update");
  const canUpdateMemorandum = hasCapability(MEMORANDUM_MENU_URL, "update");
  const canDeleteSuratMasuk = hasCapability(SURAT_MASUK_MENU_URL, "delete");
  const canDeleteSuratKeluar = hasCapability(SURAT_KELUAR_MENU_URL, "delete");
  const canDeleteMemorandum = hasCapability(MEMORANDUM_MENU_URL, "delete");
  const canRedisposeSuratMasuk =
    hasCapability(SURAT_MASUK_MENU_URL, "update") &&
    hasFeature(SURAT_MASUK_MENU_URL, "redispose");
  const canRedisposeMemorandum =
    hasCapability(MEMORANDUM_MENU_URL, "update") &&
    hasFeature(MEMORANDUM_MENU_URL, "redispose");
  const hasPersuratanScopeFeature = (feature: string) =>
    PERSURATAN_DATA_SCOPE_MENU_URLS.some((menuUrl) =>
      hasFeature(menuUrl, feature),
    );
  const canManageAllPersuratan =
    hasPersuratanScopeFeature("manage_all");

  const isCurrentUserId = (value: string | undefined | null) =>
    Boolean(user?.id && value && String(value) === String(user.id));
  const canManageSuratMasukRecord = (record: SuratMasukRecord) =>
    Boolean(
      user?.id &&
        (canManageAllPersuratan || isCurrentUserId(record.createdBy)),
    );
  const canManageSuratKeluarRecord = (record: SuratKeluarRecord) =>
    Boolean(
      user?.id &&
        (canManageAllPersuratan || isCurrentUserId(record.createdBy)),
    );
  const canManageMemorandumRecord = (record: MemorandumRecord) =>
    Boolean(
      user?.id &&
        (canManageAllPersuratan || isCurrentUserId(record.createdBy)),
    );

  const requireDeleteSuratMasukAction = () =>
    ensureCapability(SURAT_MASUK_MENU_URL, "delete", {
      message: "Anda tidak memiliki akses untuk menghapus surat masuk.",
    });

  const requireDeleteSuratKeluarAction = () =>
    ensureCapability(SURAT_KELUAR_MENU_URL, "delete", {
      message: "Anda tidak memiliki akses untuk menghapus surat keluar.",
    });

  const requireDeleteMemorandumAction = () =>
    ensureCapability(MEMORANDUM_MENU_URL, "delete", {
      message: "Anda tidak memiliki akses untuk menghapus memorandum.",
    });

  const requireUpdateSuratMasukAction = () =>
    ensureCapability(SURAT_MASUK_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah surat masuk.",
    });

  const requireUpdateSuratKeluarAction = () =>
    ensureCapability(SURAT_KELUAR_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah surat keluar.",
    });

  const requireUpdateMemorandumAction = () =>
    ensureCapability(MEMORANDUM_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah memorandum.",
    });

  const requireRedisposeSuratMasukAction = () =>
    ensureCapability(SURAT_MASUK_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah disposisi surat masuk.",
    }) &&
    ensureFeature(SURAT_MASUK_MENU_URL, "redispose", {
      message: "Anda tidak memiliki akses untuk meneruskan disposisi surat masuk.",
    });

  const requireRedisposeMemorandumAction = () =>
    ensureCapability(MEMORANDUM_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah disposisi memorandum.",
    }) &&
    ensureFeature(MEMORANDUM_MENU_URL, "redispose", {
      message: "Anda tidak memiliki akses untuk meneruskan disposisi memorandum.",
    });

  const activeDisposisiSurat = useMemo(
    () =>
      suratMasukRecords.find(
        (record) => record.id === activeDisposisiSuratId,
      ) ?? null,
    [activeDisposisiSuratId, suratMasukRecords],
  );
  const activeDisposisiMemorandum = useMemo(
    () =>
      memorandumRecords.find(
        (record) => record.id === activeMemorandumDisposisiId,
      ) ?? null,
    [activeMemorandumDisposisiId, memorandumRecords],
  );
  const activeSuratDispositionMode = useMemo(
    () =>
      getDispositionActionMode(
        getCurrentDispositionForUser(
          activeDisposisiSurat?.disposisi_history ?? [],
          user?.id,
        ),
      ),
    [activeDisposisiSurat, user?.id],
  );
  const activeMemorandumDispositionMode = useMemo(
    () =>
      getDispositionActionMode(
        getCurrentDispositionForUser(
          activeDisposisiMemorandum?.disposisi_history ?? [],
          user?.id,
        ),
      ),
    [activeDisposisiMemorandum, user?.id],
  );
  const displayedReportScope: CorrespondenceReportScope = reportScope;
  const dispositionUserNameLookup = useMemo(
    () =>
      new Map(
        [...suratDisposisiUsers, ...memorandumDisposisiUsers].map((item) => [
          item.id,
          item.nama,
        ]),
      ),
    [memorandumDisposisiUsers, suratDisposisiUsers],
  );

  const refreshReportData = useCallback(async (): Promise<{
    incoming: SuratMasukRecord[];
    outgoing: SuratKeluarRecord[];
    memorandums: MemorandumRecord[];
  }> => {
    setIsLoadingSuratMasuk(true);
    setIsLoadingSuratKeluar(true);
    setIsLoadingMemorandum(true);

    try {
      const [report, outgoingReport] = await Promise.all([
        correspondenceService.getReport({
          scope: reportScope,
          myFilter:
            reportScope === "my" ? myReportFilter : undefined,
        }),
        correspondenceService.getReport({
          kind: "surat-keluar",
          scope: reportScope,
        }),
      ]);
      const userNameById = new Map<string, string>();
      const nextAvailableScopes =
        report.filters.available_scopes.length > 0
          ? report.filters.available_scopes
          : [report.filters.scope];
      if (report.filters.scope !== reportScope) {
        setReportScope(report.filters.scope);
      }

      const nextIncoming = sortByDate(
        report.records.incoming_mails.map((record) =>
          normalizeSuratMasukRecord(record, userNameById),
        ),
        (record) => record.tanggalTerima,
        "terbaru",
      );
      const nextOutgoing = sortByDate(
        outgoingReport.records.outgoing_mails.map((record) => ({
          ...record,
          fileUrl: record.fileUrl,
        })),
        (record) => record.tanggalKirim,
        "terbaru",
      );
      const nextMemorandums = sortByDate(
        report.records.memorandums.map((record) =>
          normalizeMemorandumRecord(record, userNameById),
        ),
        (record) => record.tanggal,
        "terbaru",
      );

      setAvailableReportScopes(nextAvailableScopes);
      setSuratMasukRecords(nextIncoming);
      setSuratKeluarRecords(nextOutgoing);
      setMemorandumRecords(nextMemorandums);

      return {
        incoming: nextIncoming,
        outgoing: nextOutgoing,
        memorandums: nextMemorandums,
      };
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat data persuratan",
        "error",
      );
      setAvailableReportScopes(["my"]);
      setSuratMasukRecords([]);
      setSuratKeluarRecords([]);
      setMemorandumRecords([]);
      return {
        incoming: [],
        outgoing: [],
        memorandums: [],
      };
    } finally {
      setIsLoadingSuratMasuk(false);
      setIsLoadingSuratKeluar(false);
      setIsLoadingMemorandum(false);
    }
  }, [myReportFilter, reportScope, showToast]);

  useEffect(() => {
    void refreshReportData();
  }, [refreshReportData]);

  useEffect(() => {
    if (!availableReportScopes.includes(reportScope)) {
      setReportScope(availableReportScopes[0] ?? "my");
    }
  }, [availableReportScopes, reportScope]);

  useEffect(() => {
    if (activeDisposisiSuratId === null) {
      setSuratDisposisiUsers([]);
      return;
    }

    let ignore = false;
    const timer = window.setTimeout(async () => {
      try {
        const recipients = await suratMasukService.getDispositionRecipients({
          search: disposisiUserSearch.trim() || undefined,
          limit: 100,
        });

        if (!ignore) {
          setSuratDisposisiUsers(recipients);
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat penerima disposisi surat masuk",
            "error",
          );
          setSuratDisposisiUsers([]);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [activeDisposisiSuratId, disposisiUserSearch, showToast]);

  useEffect(() => {
    if (activeMemorandumDisposisiId === null) {
      setMemorandumDisposisiUsers([]);
      return;
    }

    let ignore = false;
    const timer = window.setTimeout(async () => {
      try {
        const recipients = await memorandumService.getDispositionRecipients({
          search: memorandumDisposisiUserSearch.trim() || undefined,
          limit: 100,
        });

        if (!ignore) {
          setMemorandumDisposisiUsers(recipients);
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat penerima disposisi memorandum",
            "error",
          );
          setMemorandumDisposisiUsers([]);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [activeMemorandumDisposisiId, memorandumDisposisiUserSearch, showToast]);

  const handlePreviewDocument = useCallback(
    (fileUrl: string | undefined, fileName: string) => {
      if (!isValidFileUrl(fileUrl)) {
        showToast("File dokumen belum tersedia.", "warning");
        return;
      }

      openPreview(fileUrl, formatDocumentFileName(fileName));
    },
    [openPreview, showToast],
  );

  const handleDeleteSuratKeluar = (record: SuratKeluarRecord) => {
    if (!requireDeleteSuratKeluarAction()) return;
    if (!canManageSuratKeluarRecord(record)) return;
    setDeleteOutgoingTarget(record);
  };

  const handleConfirmDeleteSuratKeluar = async () => {
    if (!deleteOutgoingTarget) return;
    if (!requireDeleteSuratKeluarAction()) return;
    if (!canManageSuratKeluarRecord(deleteOutgoingTarget)) return;

    setIsDeletingSuratKeluar(true);
    try {
      await suratKeluarService.remove(String(deleteOutgoingTarget.id));
      const nextState = await refreshReportData();
      const nextRecords = nextState.outgoing;

      setSelectedDetail((prev) => {
        if (!prev || prev.kind !== "surat-keluar") return prev;
        return prev.record.id === deleteOutgoingTarget.id ? null : prev;
      });

      if (nextRecords.length === 0 && activeKind === "surat-keluar") {
        setSelectedDetail(null);
      }

      setDeleteOutgoingTarget(null);
      showToast("Surat keluar berhasil dihapus.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus surat keluar",
        "error",
      );
    } finally {
      setIsDeletingSuratKeluar(false);
    }
  };

  const handleOpenMemorandumDisposisi = (memorandumId: string | number) => {
    if (!requireRedisposeMemorandumAction()) return;
    setActiveMemorandumDisposisiId(memorandumId);
    setMemorandumDisposisiUsers([]);
    setSelectedMemorandumDisposisiUserIds([]);
    setMemorandumDisposisiUserSearch("");
    setMemorandumDisposisiDueDate("");
    setMemorandumDisposisiCatatan("");
  };

  const handleCloseMemorandumDisposisi = () => {
    if (isMemorandumDisposisiSubmitting) return;
    setActiveMemorandumDisposisiId(null);
    setMemorandumDisposisiUsers([]);
    setSelectedMemorandumDisposisiUserIds([]);
    setMemorandumDisposisiUserSearch("");
    setMemorandumDisposisiDueDate("");
    setMemorandumDisposisiCatatan("");
  };

  const handleDeleteMemorandum = (record: MemorandumRecord) => {
    if (!requireDeleteMemorandumAction()) return;
    if (!canManageMemorandumRecord(record)) return;
    setDeleteMemorandumTarget(record);
  };

  const handleConfirmDeleteMemorandum = async () => {
    if (!deleteMemorandumTarget) return;
    if (!requireDeleteMemorandumAction()) return;
    if (!canManageMemorandumRecord(deleteMemorandumTarget)) return;

    setIsDeletingMemorandum(true);
    try {
      await memorandumService.remove(String(deleteMemorandumTarget.id));
      const nextState = await refreshReportData();
      const nextRecords = nextState.memorandums;

      setSelectedDetail((prev) => {
        if (!prev || prev.kind !== "memorandum") return prev;
        return prev.record.id === deleteMemorandumTarget.id ? null : prev;
      });

      if (activeMemorandumDisposisiId === deleteMemorandumTarget.id) {
        handleCloseMemorandumDisposisi();
      }

      if (nextRecords.length === 0 && activeKind === "memorandum") {
        setSelectedDetail(null);
      }

      setDeleteMemorandumTarget(null);
      showToast("Memorandum berhasil dihapus.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus memorandum",
        "error",
      );
    } finally {
      setIsDeletingMemorandum(false);
    }
  };

  const handleSubmitMemorandumDisposisi = async () => {
    if (!activeDisposisiMemorandum) return;
    if (!requireRedisposeMemorandumAction()) return;

    const actionMode = activeMemorandumDispositionMode;
    const actionLabel = getDispositionActionLabel(actionMode);

    if (selectedMemorandumDisposisiUserIds.length === 0) {
      showToast(`Tujuan ${actionLabel.toLowerCase()} wajib dipilih!`, "error");
      return;
    }

    const selectedReceiverIds = selectedMemorandumDisposisiUserIds.filter(
      (userId) =>
        memorandumDisposisiUsers.some((recipient) => recipient.id === userId),
    );

    if (selectedReceiverIds.length !== selectedMemorandumDisposisiUserIds.length) {
      showToast("Tujuan disposisi tidak ditemukan!", "error");
      return;
    }

    setIsMemorandumDisposisiSubmitting(true);

    try {
      await memorandumService.redispose(String(activeDisposisiMemorandum.id), {
        receiver_ids: selectedReceiverIds,
        note: memorandumDisposisiCatatan.trim() || undefined,
        due_date: memorandumDisposisiDueDate
          ? toApiDateTime(memorandumDisposisiDueDate)
          : undefined,
      });

      const nextState = await refreshReportData();
      const nextRecords = nextState.memorandums;

      setSelectedDetail((prev) => {
        if (!prev || prev.kind !== "memorandum") return prev;

        const nextRecord =
          nextRecords.find((record) => record.id === prev.record.id) ?? null;

        return nextRecord ? { kind: "memorandum", record: nextRecord } : prev;
      });

      showToast(`${actionLabel} memorandum berhasil dikirim!`, "success");
      handleCloseMemorandumDisposisi();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : `Gagal mengirim ${actionLabel.toLowerCase()} memorandum`,
        "error",
      );
    } finally {
      setIsMemorandumDisposisiSubmitting(false);
    }
  };

  const handleUpdateSuratDispositionStatus = async (
    record: SuratMasukRecord,
    dispositionId: string,
    status: "IN_PROGRESS" | "COMPLETED",
  ) => {
    if (!requireUpdateSuratMasukAction()) return;

    setIsUpdatingDispositionStatus(true);
    try {
      const updated = await suratMasukService.updateDispositionStatus(
        String(record.id),
        dispositionId,
        { status },
      );

      const nextState = await refreshReportData();
      const nextRecord =
        nextState.incoming.find((item) => item.id === record.id) ??
        (updated
          ? normalizeSuratMasukRecord(
              updated,
              dispositionUserNameLookup,
            )
          : null);

      if (nextRecord) {
        setSelectedDetail((prev) =>
          prev?.kind === "surat-masuk" && prev.record.id === record.id
            ? { kind: "surat-masuk", record: nextRecord }
            : prev,
        );
      }

      showToast(
        status === "COMPLETED"
          ? "Disposisi surat masuk ditandai selesai."
          : "Disposisi surat masuk dimulai.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status disposisi surat masuk",
        "error",
      );
    } finally {
      setIsUpdatingDispositionStatus(false);
    }
  };

  const handleUpdateMemorandumDispositionStatus = async (
    record: MemorandumRecord,
    dispositionId: string,
    status: "IN_PROGRESS" | "COMPLETED",
  ) => {
    if (!requireUpdateMemorandumAction()) return;

    setIsUpdatingDispositionStatus(true);
    try {
      const updated = await memorandumService.updateDispositionStatus(
        String(record.id),
        dispositionId,
        { status },
      );

      const nextState = await refreshReportData();
      const nextRecord =
        nextState.memorandums.find((item) => item.id === record.id) ??
        (updated
          ? normalizeMemorandumRecord(
              updated,
              dispositionUserNameLookup,
            )
          : null);

      if (nextRecord) {
        setSelectedDetail((prev) =>
          prev?.kind === "memorandum" && prev.record.id === record.id
            ? { kind: "memorandum", record: nextRecord }
            : prev,
        );
      }

      showToast(
        status === "COMPLETED"
          ? "Disposisi memorandum ditandai selesai."
          : "Disposisi memorandum dimulai.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status disposisi memorandum",
        "error",
      );
    } finally {
      setIsUpdatingDispositionStatus(false);
    }
  };

  const tenggatStats = useMemo(
    () => ({
      suratMasuk: getTenggatStats(
        suratMasukRecords,
        (record) => record.tenggatWaktu,
        today,
        hasActiveWorkflowDeadline,
      ),
      memorandum: getTenggatStats(
        memorandumRecords,
        (record) => record.tenggatWaktu,
        today,
        hasActiveWorkflowDeadline,
      ),
    }),
    [memorandumRecords, suratMasukRecords, today],
  );

  const suratMasukActiveDispositionCount = useMemo(
    () => countActiveDispositionHolders(suratMasukRecords),
    [suratMasukRecords],
  );

  const suratKeluarFileCount = useMemo(
    () => countAvailableFiles(suratKeluarRecords),
    [suratKeluarRecords],
  );

  const suratKeluarStorageCount = useMemo(
    () =>
      countUniqueMeaningfulValues(
        suratKeluarRecords.map((record) => record.physicalStorageLabel),
      ),
    [suratKeluarRecords],
  );

  const memorandumActiveDispositionCount = useMemo(
    () => countActiveDispositionHolders(memorandumRecords),
    [memorandumRecords],
  );

  const summaryCards: SummaryCardConfig[] = useMemo(
    () => [
      {
        kind: "surat-masuk",
        title: "Surat Masuk",
        icon: Inbox,
        totalLabel: "TOTAL SURAT",
        totalValue: suratMasukRecords.length,
        ctaLabel: "Lihat Daftar Surat",
        infoRows: [
          {
            icon: CalendarDays,
            label: "Terbaru",
            value: formatDisplayDate(suratMasukRecords[0]?.tanggalTerima ?? ""),
          },
          {
            icon: Shield,
            label: "Sifat",
            value: summarize(
              [...new Set(suratMasukRecords.map((record) => record.sifat))],
              4,
            ),
          },
          {
            icon: Users,
            label: "Disposisi Aktif",
            value: `${suratMasukActiveDispositionCount} User`,
          },
          {
            icon: CalendarDays,
            label: "Tenggat Aktif",
            value: `${tenggatStats.suratMasuk.memilikiTenggat}`,
          },
          {
            icon: AlertTriangle,
            label: "Lewat Tenggat",
            value: `${tenggatStats.suratMasuk.melewatiTenggat}`,
          },
        ],
      },
      {
        kind: "surat-keluar",
        title: "Surat Keluar",
        icon: Send,
        totalLabel: "TOTAL SURAT",
        totalValue: suratKeluarRecords.length,
        ctaLabel: "Lihat Daftar Surat",
        infoRows: [
          {
            icon: CalendarDays,
            label: "Terbaru",
            value: formatDisplayDate(suratKeluarRecords[0]?.tanggalKirim ?? ""),
          },
          {
            icon: Shield,
            label: "Sifat",
            value: summarize(
              [...new Set(suratKeluarRecords.map((record) => record.sifat))],
              4,
            ),
          },
          {
            icon: Mail,
            label: "Media Pengiriman",
            value: summarize(
              [...new Set(suratKeluarRecords.map((record) => record.media))],
              3,
            ),
          },
          {
            icon: FileText,
            label: "File Tersedia",
            value: `${suratKeluarFileCount} Dokumen`,
          },
          {
            icon: Building2,
            label: "Lokasi Penyimpanan",
            value: `${suratKeluarStorageCount} Lokasi`,
          },
        ],
      },
      {
        kind: "memorandum",
        title: "Memorandum",
        icon: FileText,
        totalLabel: "TOTAL MEMO",
        totalValue: memorandumRecords.length,
        ctaLabel: "Lihat Daftar Memo",
        infoRows: [
          {
            icon: CalendarDays,
            label: "Terbaru",
            value: formatDisplayDate(memorandumRecords[0]?.tanggal ?? ""),
          },
          {
            icon: Building2,
            label: "Divisi Asal",
            value: summarize(
              [
                ...new Set(
                  memorandumRecords.map((record) => record.divisiAsal),
                ),
              ],
              3,
            ),
          },
          {
            icon: Users,
            label: "Tujuan Awal",
            value: summarize(
              [
                ...new Set(
                  memorandumRecords.flatMap(
                    (record) => record.divisiTujuanAwal,
                  ),
                ),
              ],
              3,
            ),
          },
          {
            icon: Users,
            label: "Disposisi Aktif",
            value: `${memorandumActiveDispositionCount} User`,
          },
          {
            icon: CalendarDays,
            label: "Tenggat Aktif",
            value: `${tenggatStats.memorandum.memilikiTenggat}`,
          },
          {
            icon: AlertTriangle,
            label: "Lewat Tenggat",
            value: `${tenggatStats.memorandum.melewatiTenggat}`,
          },
        ],
      },
    ],
    [
      memorandumRecords,
      memorandumActiveDispositionCount,
      suratKeluarRecords,
      suratKeluarFileCount,
      suratKeluarStorageCount,
      suratMasukActiveDispositionCount,
      suratMasukRecords,
      tenggatStats,
    ],
  );

  useEffect(() => {
    if (!activeKind || !reportRef.current) return;

    reportRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeKind]);

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      (activeDisposisiSuratId === null && activeMemorandumDisposisiId === null)
    ) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDisposisiSuratId, activeMemorandumDisposisiId]);

  const filteredSuratMasuk = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    return sortRecords(
      suratMasukRecords.filter((record) => {
        if (!keyword) return true;

        return [
          record.namaSurat,
          record.pengirim,
          record.alamatPengirim,
          record.perihal,
          record.keterangan ?? "",
          record.keteranganTenggat ?? "",
          record.sifat,
          formatSuratMasukStatus(record.status),
          record.targetDivisionNames?.join(" ") ?? "",
          record.disposisiKepada.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      }),
      (record) => record.tanggalTerima,
      (record) => record.tenggatWaktu,
      sortValue,
    );
  }, [searchValue, sortValue, suratMasukRecords]);

  const filteredSuratKeluar = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    const outgoingSortValue: SortValue =
      sortValue === "terlama" ? "terlama" : "terbaru";

    return sortRecords(
      suratKeluarRecords.filter((record) => {
        if (!keyword) return true;

        return [
          record.namaSurat,
          record.penerima,
          record.alamatPenerima,
          record.media,
          record.sifat,
          record.statusLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      }),
      (record) => record.tanggalKirim,
      () => undefined,
      outgoingSortValue,
    );
  }, [searchValue, sortValue, suratKeluarRecords]);

  const filteredMemorandum = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    return sortRecords(
      memorandumRecords.filter((record) => {
        if (!keyword) return true;

        return [
          record.noMemo,
          record.perihal,
          record.divisiAsal,
          record.divisiTujuanAwal.join(" "),
          record.pembuatMemo,
          record.keterangan,
          record.keteranganTenggat ?? "",
          record.penerima.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      }),
      (record) => record.tanggal,
      (record) => record.tenggatWaktu,
      sortValue,
    );
  }, [memorandumRecords, searchValue, sortValue]);
  const {
    paginatedItems: paginatedSuratMasuk,
    meta: suratMasukPaginationMeta,
    setPage: setSuratMasukPage,
    resetPage: resetSuratMasukPage,
  } = useClientPagination(filteredSuratMasuk, OPERATIONAL_TABLE_PAGE_SIZE);
  const {
    paginatedItems: paginatedSuratKeluar,
    meta: suratKeluarPaginationMeta,
    setPage: setSuratKeluarPage,
    resetPage: resetSuratKeluarPage,
  } = useClientPagination(filteredSuratKeluar, OPERATIONAL_TABLE_PAGE_SIZE);
  const {
    paginatedItems: paginatedMemorandum,
    meta: memorandumPaginationMeta,
    setPage: setMemorandumPage,
    resetPage: resetMemorandumPage,
  } = useClientPagination(filteredMemorandum, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetSuratMasukPage();
    resetSuratKeluarPage();
    resetMemorandumPage();
  }, [
    activeKind,
    myReportFilter,
    reportScope,
    resetMemorandumPage,
    resetSuratKeluarPage,
    resetSuratMasukPage,
    searchValue,
    sortValue,
  ]);

  const activeConfig = activeKind ? activeSectionConfig[activeKind] : null;
  const activeExportRows =
    activeKind === "surat-masuk"
      ? filteredSuratMasuk.length
      : activeKind === "surat-keluar"
        ? filteredSuratKeluar.length
        : activeKind === "memorandum"
          ? filteredMemorandum.length
          : 0;
  const activeReportIsLoading =
    activeKind === "surat-masuk"
      ? isLoadingSuratMasuk
      : activeKind === "surat-keluar"
        ? isLoadingSuratKeluar
        : activeKind === "memorandum"
          ? isLoadingMemorandum
          : false;

  const handleExportActiveReport = async () => {
    if (!activeKind) return;
    if (activeExportRows === 0) {
      showToast("Tidak ada data laporan untuk diekspor.", "warning");
      return;
    }

    setIsExporting(true);
    try {
      if (activeKind === "surat-masuk") {
        await exportToExcel({
          filename: "laporan-surat-masuk",
          sheetName: "Surat Masuk",
          title: "Laporan Surat Masuk",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "Nama Pengirim", key: "pengirim", width: 24 },
            { header: "Alamat Pengirim", key: "alamatPengirim", width: 32 },
            { header: "Nama / Nomor Surat", key: "namaSurat", width: 28 },
            { header: "Perihal", key: "perihal", width: 32 },
            { header: "Tanggal Penerimaan", key: "tanggalTerima", width: 20 },
            { header: "Sifat", key: "sifat", width: 16 },
            { header: "Tempat Penyimpanan", key: "penyimpanan", width: 32 },
            { header: "Penerima Disposisi", key: "disposisiKepada", width: 32 },
            { header: "Status Surat", key: "statusSurat", width: 18 },
            { header: "Tenggat Waktu", key: "tenggatWaktu", width: 18 },
            { header: "Status Tenggat", key: "statusTenggat", width: 18 },
            { header: "Keterangan Surat", key: "keterangan", width: 36 },
            { header: "Catatan Disposisi", key: "catatanDisposisi", width: 36 },
            { header: "File", key: "fileName", width: 30 },
          ],
          data: filteredSuratMasuk.map((record, index) => ({
            no: index + 1,
            pengirim: record.pengirim,
            alamatPengirim: record.alamatPengirim,
            namaSurat: record.namaSurat,
            perihal: record.perihal,
            tanggalTerima: formatDisplayDate(record.tanggalTerima),
            sifat: record.sifat,
            penyimpanan: record.physicalStorageLabel ?? "-",
            disposisiKepada:
              record.disposisiKepada.length > 0
                ? record.disposisiKepada.join(", ")
                : "-",
            statusSurat:
              record.statusLabel ?? formatSuratMasukStatus(record.status),
            tenggatWaktu: formatDetailTenggatValue(record.tenggatWaktu),
            statusTenggat: formatWorkflowTenggatStatus(record, today),
            keterangan: record.keterangan ?? "-",
            catatanDisposisi: record.keteranganTenggat ?? "-",
            fileName: record.fileName || "-",
          })),
        });
      }

      if (activeKind === "surat-keluar") {
        await exportToExcel({
          filename: "laporan-surat-keluar",
          sheetName: "Surat Keluar",
          title: "Laporan Surat Keluar",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "Nama Penerima", key: "penerima", width: 24 },
            { header: "Alamat Penerima", key: "alamatPenerima", width: 32 },
            { header: "Nama / Nomor Surat", key: "namaSurat", width: 28 },
            { header: "Tanggal Pengiriman", key: "tanggalKirim", width: 20 },
            { header: "Sifat", key: "sifat", width: 16 },
            { header: "Media", key: "media", width: 16 },
            { header: "Tempat Penyimpanan", key: "penyimpanan", width: 32 },
            { header: "Status", key: "status", width: 16 },
            { header: "File", key: "fileName", width: 30 },
          ],
          data: filteredSuratKeluar.map((record, index) => ({
            no: index + 1,
            penerima: record.penerima,
            alamatPenerima: record.alamatPenerima,
            namaSurat: record.namaSurat,
            tanggalKirim: formatDisplayDate(record.tanggalKirim),
            sifat: record.sifat,
            media: record.media,
            penyimpanan: record.physicalStorageLabel ?? "-",
            status: record.statusLabel,
            fileName: record.fileName || "-",
          })),
        });
      }

      if (activeKind === "memorandum") {
        await exportToExcel({
          filename: "laporan-memorandum",
          sheetName: "Memorandum",
          title: "Laporan Memorandum",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "No Memo", key: "noMemo", width: 22 },
            { header: "Perihal", key: "perihal", width: 34 },
            { header: "Divisi Asal", key: "divisiAsal", width: 24 },
            { header: "Tujuan Awal", key: "tujuanAwal", width: 32 },
            { header: "Pembuat", key: "pembuat", width: 24 },
            { header: "Penerima", key: "penerima", width: 32 },
            { header: "Tanggal", key: "tanggal", width: 18 },
            { header: "Tempat Penyimpanan", key: "penyimpanan", width: 32 },
            { header: "Status Workflow", key: "status", width: 20 },
            { header: "Tenggat Waktu", key: "tenggatWaktu", width: 18 },
            { header: "Status Tenggat", key: "statusTenggat", width: 18 },
            { header: "Keterangan Memo", key: "keterangan", width: 36 },
            { header: "Catatan Disposisi", key: "catatanDisposisi", width: 36 },
            { header: "File", key: "fileName", width: 30 },
          ],
          data: filteredMemorandum.map((record, index) => ({
            no: index + 1,
            noMemo: record.noMemo,
            perihal: record.perihal,
            divisiAsal: record.divisiAsal,
            tujuanAwal: formatJoinedNames(record.divisiTujuanAwal),
            pembuat: record.pembuatMemo,
            penerima: formatJoinedNames(record.penerima),
            tanggal: formatDisplayDate(record.tanggal),
            penyimpanan: record.physicalStorageLabel ?? "-",
            status: record.statusLabel ?? "Baru",
            tenggatWaktu: formatDetailTenggatValue(record.tenggatWaktu),
            statusTenggat: formatWorkflowTenggatStatus(record, today),
            keterangan: record.keterangan || "-",
            catatanDisposisi: record.keteranganTenggat ?? "-",
            fileName: record.fileName || "-",
          })),
        });
      }

      showToast("Laporan berhasil diekspor ke Excel.", "success");
    } finally {
      setIsExporting(false);
    }
  };

  const loadEditOptions = useCallback(
    async (kind: ReportKind) => {
      setIsEditOptionsLoading(true);
      try {
        const storageRowsPromise = storageService.getAll();

        if (kind === "memorandum") {
          const [rows, storageRows] = await Promise.all([
            divisionService.getAll(),
            storageRowsPromise,
          ]);
          setDivisions(
            [...rows].sort((left, right) => left.name.localeCompare(right.name)),
          );
          setStorageOptions(
            storageRows
              .filter((item) => item.status === "Aktif")
              .sort((left, right) =>
                `${left.kodeKantor}${left.kodeLemari}${left.rak}`.localeCompare(
                  `${right.kodeKantor}${right.kodeLemari}${right.rak}`,
                ),
              ),
          );
          return;
        }

        const [rows, storageRows, deliveryMediaRows] = await Promise.all([
          letterPriorityService.getAll(),
          storageRowsPromise,
          kind === "surat-keluar"
            ? mailDeliveryMediaService.getAll({ is_active: true })
            : Promise.resolve([]),
        ]);
        setLetterPriorities(
          rows
            .filter((item) => item.status !== "Nonaktif")
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        setStorageOptions(
          storageRows
            .filter((item) => item.status === "Aktif")
            .sort((left, right) =>
              `${left.kodeKantor}${left.kodeLemari}${left.rak}`.localeCompare(
                `${right.kodeKantor}${right.kodeLemari}${right.rak}`,
              ),
            ),
        );
        setDeliveryMediaOptions(deliveryMediaRows);
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Gagal memuat data pendukung perubahan.",
          "error",
        );
      } finally {
        setIsEditOptionsLoading(false);
      }
    },
    [showToast],
  );

  const handleOpenEdit = (target: DetailState) => {
    if (target.kind === "surat-masuk" && !requireUpdateSuratMasukAction()) {
      return;
    }

    if (
      target.kind === "surat-masuk" &&
      !canManageSuratMasukRecord(target.record)
    ) {
      return;
    }

    if (target.kind === "surat-keluar" && !requireUpdateSuratKeluarAction()) {
      return;
    }

    if (
      target.kind === "surat-keluar" &&
      !canManageSuratKeluarRecord(target.record)
    ) {
      return;
    }

    if (target.kind === "memorandum" && !requireUpdateMemorandumAction()) {
      return;
    }

    if (
      target.kind === "memorandum" &&
      !canManageMemorandumRecord(target.record)
    ) {
      return;
    }

    setEditTarget(target);
    void loadEditOptions(target.kind);
  };

  const handleSelectCard = (kind: ReportKind) => {
    setActiveKind(kind);
    setSearchValue("");
    setSortValue("terbaru");
  };

  const handleChangeReportScope = (value: CorrespondenceReportScope) => {
    setReportScope(value);
    setSearchValue("");
    setSortValue("terbaru");
    setSelectedDetail(null);
    setActiveDisposisiSuratId(null);
    setDisposisiDueDate("");
    setActiveMemorandumDisposisiId(null);
  };

  const handleChangeMyReportFilter = (value: CorrespondenceMyReportFilter) => {
    setMyReportFilter(value);
    setSearchValue("");
    setSortValue("terbaru");
    setSelectedDetail(null);
    setActiveDisposisiSuratId(null);
    setDisposisiDueDate("");
    setActiveMemorandumDisposisiId(null);
  };

  const handleOpenDisposisiSidebar = (suratId: string | number) => {
    if (!requireRedisposeSuratMasukAction()) return;
    const targetRecord =
      suratMasukRecords.find((record) => record.id === suratId) ?? null;
    setActiveDisposisiSuratId(suratId);
    setSuratDisposisiUsers([]);
    setSelectedDisposisiUserIds([]);
    setDisposisiUserSearch("");
    setDisposisiDueDate(toDateInputValue(targetRecord?.tenggatWaktu));
    setDisposisiCatatan("");
  };

  const handleSubmitEdit = async (payload: EditCorrespondencePayload) => {
    if (payload.kind === "surat-masuk" && !requireUpdateSuratMasukAction()) {
      return;
    }

    if (
      payload.kind === "surat-masuk" &&
      editTarget?.kind === "surat-masuk" &&
      !canManageSuratMasukRecord(editTarget.record)
    ) {
      return;
    }

    if (payload.kind === "surat-keluar" && !requireUpdateSuratKeluarAction()) {
      return;
    }

    if (
      payload.kind === "surat-keluar" &&
      editTarget?.kind === "surat-keluar" &&
      !canManageSuratKeluarRecord(editTarget.record)
    ) {
      return;
    }

    if (payload.kind === "memorandum" && !requireUpdateMemorandumAction()) {
      return;
    }

    if (
      payload.kind === "memorandum" &&
      editTarget?.kind === "memorandum" &&
      !canManageMemorandumRecord(editTarget.record)
    ) {
      return;
    }

    setIsUpdatingCorrespondence(true);

    try {
      let nextDetail: DetailState | null = null;

      if (payload.kind === "surat-masuk") {
        const updated = await suratMasukService.update(payload.id, payload.data);
        const nextState = await refreshReportData();
        const nextRecord =
          nextState.incoming.find((item) => String(item.id) === payload.id) ??
          updated;

        if (nextRecord) {
          nextDetail = { kind: "surat-masuk", record: nextRecord };
        }
      }

      if (payload.kind === "surat-keluar") {
        const updated = await suratKeluarService.update(
          payload.id,
          payload.data,
        );
        const nextState = await refreshReportData();
        const nextRecord =
          nextState.outgoing.find((item) => String(item.id) === payload.id) ??
          updated;

        if (nextRecord) {
          nextDetail = { kind: "surat-keluar", record: nextRecord };
        }
      }

      if (payload.kind === "memorandum") {
        const updated = await memorandumService.update(payload.id, payload.data);
        const nextState = await refreshReportData();
        const nextRecord =
          nextState.memorandums.find(
            (item) => String(item.id) === payload.id,
          ) ?? updated;

        if (nextRecord) {
          nextDetail = { kind: "memorandum", record: nextRecord };
        }
      }

      if (nextDetail) {
        const detail = nextDetail;
        setSelectedDetail((prev) =>
          prev &&
          prev.kind === detail.kind &&
          String(prev.record.id) === String(detail.record.id)
            ? detail
            : prev,
        );
      }

      setEditTarget(null);
      showToast("Data persuratan berhasil diperbarui.", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui data persuratan.",
        "error",
      );
    } finally {
      setIsUpdatingCorrespondence(false);
    }
  };

  const handleCloseDisposisiSidebar = () => {
    if (isDisposisiSubmitting) return;
    setActiveDisposisiSuratId(null);
    setSuratDisposisiUsers([]);
    setSelectedDisposisiUserIds([]);
    setDisposisiUserSearch("");
    setDisposisiDueDate("");
    setDisposisiCatatan("");
  };

  const handleDeleteSuratMasuk = (record: SuratMasukRecord) => {
    if (!requireDeleteSuratMasukAction()) return;
    if (!canManageSuratMasukRecord(record)) return;
    setDeleteTarget(record);
  };

  const handleConfirmDeleteSuratMasuk = async () => {
    if (!deleteTarget) return;
    if (!requireDeleteSuratMasukAction()) return;
    if (!canManageSuratMasukRecord(deleteTarget)) return;

    setIsDeletingSuratMasuk(true);
    try {
      await suratMasukService.remove(String(deleteTarget.id));
      const nextState = await refreshReportData();
      const nextRecords = nextState.incoming;

      setSelectedDetail((prev) => {
        if (!prev || prev.kind !== "surat-masuk") return prev;
        return prev.record.id === deleteTarget.id ? null : prev;
      });

      if (activeDisposisiSuratId === deleteTarget.id) {
        handleCloseDisposisiSidebar();
      }

      if (nextRecords.length === 0 && activeKind === "surat-masuk") {
        setSelectedDetail(null);
      }

      setDeleteTarget(null);
      showToast("Surat masuk berhasil dihapus.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus surat masuk",
        "error",
      );
    } finally {
      setIsDeletingSuratMasuk(false);
    }
  };

  const handleSubmitDisposisi = async () => {
    if (!activeDisposisiSurat) return;
    if (!requireRedisposeSuratMasukAction()) return;

    const actionMode = activeSuratDispositionMode;
    const actionLabel = getDispositionActionLabel(actionMode);

    if (selectedDisposisiUserIds.length === 0) {
      showToast(`Tujuan ${actionLabel.toLowerCase()} wajib dipilih!`, "error");
      return;
    }

    const selectedReceiverIds = selectedDisposisiUserIds.filter((userId) =>
      suratDisposisiUsers.some((recipient) => recipient.id === userId),
    );

    if (selectedReceiverIds.length !== selectedDisposisiUserIds.length) {
      showToast("Tujuan disposisi tidak ditemukan!", "error");
      return;
    }

    if (!user?.id) {
      showToast("User login tidak ditemukan!", "error");
      return;
    }

    setIsDisposisiSubmitting(true);

    try {
      await suratMasukService.redispose(String(activeDisposisiSurat.id), {
        receiver_ids: selectedReceiverIds,
        note: disposisiCatatan.trim() || undefined,
        due_date: disposisiDueDate ? toApiDateTime(disposisiDueDate) : undefined,
      });

      const nextState = await refreshReportData();
      const nextRecords = nextState.incoming;

      setSelectedDetail((prev) => {
        if (!prev || prev.kind !== "surat-masuk") return prev;

        const nextRecord =
          nextRecords.find((record) => record.id === prev.record.id) ?? null;

        return nextRecord ? { kind: "surat-masuk", record: nextRecord } : prev;
      });

      showToast(`${actionLabel} surat masuk berhasil dikirim!`, "success");
      handleCloseDisposisiSidebar();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : `Gagal mengirim ${actionLabel.toLowerCase()} surat masuk`,
        "error",
      );
    } finally {
      setIsDisposisiSubmitting(false);
    }
  };

  const toggleSelectedDisposisiUser = (userId: string) => {
    setSelectedDisposisiUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((item) => item !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectedMemorandumDisposisiUser = (userId: string) => {
    setSelectedMemorandumDisposisiUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((item) => item !== userId)
        : [...prev, userId],
    );
  };

  return (
    <div className="mt-6 space-y-6">
      <SetupReportSelectorCards
        cards={summaryCards}
        activeKey={activeKind}
        onSelect={handleSelectCard}
        gridClassName="grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
      />

      <div ref={reportRef}>
        {!activeConfig ? (
          <SelectionState />
        ) : (
          <ReportSectionShell
            title={activeConfig.title}
            subtitle={activeConfig.subtitle}
            showReportScopeControls={true}
            icon={activeConfig.icon}
            availableReportScopes={availableReportScopes}
            reportScope={displayedReportScope}
            onReportScopeChange={handleChangeReportScope}
            myReportFilter={myReportFilter}
            onMyReportFilterChange={handleChangeMyReportFilter}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder={activeConfig.searchPlaceholder}
            sortValue={sortValue}
            onSortChange={setSortValue}
            supportsTenggatSort={activeConfig.supportsTenggatSort}
            exportLoading={isExporting}
            exportDisabled={activeReportIsLoading || activeExportRows === 0}
            onExport={handleExportActiveReport}
            onClose={() => setActiveKind(null)}
          >
            {activeKind === "surat-masuk" ? (
              isLoadingSuratMasuk ? (
                <ReportLoadingTable widths={REPORT_SURAT_MASUK_COLUMN_WIDTHS} />
              ) : filteredSuratMasuk.length > 0 ? (
                <>
                <SetupDataTable variant="report" density="compact" className={REPORT_SURAT_MASUK_TABLE_CLASS}>
                  <ReportColGroup widths={REPORT_SURAT_MASUK_COLUMN_WIDTHS} />
                  <SetupDataTableHead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell className={REPORT_NUMBER_HEADER_CELL_CLASS}>
                        No
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama Pengirim
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama / Nomor Surat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Perihal
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tgl Penerimaan
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Sifat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Pemegang Aktif
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Surat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Tenggat Waktu
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Tenggat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Disposisi
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Aksi
                      </SetupDataTableHeaderCell>
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody className="divide-y divide-gray-100">
                    {paginatedSuratMasuk.map((record, index) => (
                      <SetupDataTableRow
                        key={record.id}
                        className={`${SETUP_PAGE_TABLE_ROW_CLASS} cursor-pointer bg-white`}
                        onDoubleClick={() =>
                          setSelectedDetail({ kind: "surat-masuk", record })
                        }
                      >
                        <SetupDataTableCell className={REPORT_NUMBER_CELL_CLASS}>
                          {(suratMasukPaginationMeta.page - 1) *
                            suratMasukPaginationMeta.limit +
                            index +
                            1}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.pengirim}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.namaSurat}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_MULTILINE_TEXT_CLASS} title={record.perihal}>
                            {record.perihal}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDisplayDate(record.tanggalTerima)}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.sifat}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          {record.current_holder_names.length > 0 ? (
                            <span
                              className={TABLE_MULTILINE_TEXT_CLASS}
                              title={record.current_holder_names.join(", ")}
                            >
                              {record.current_holder_names.join(", ")}
                            </span>
                          ) : (
                            <span className={TABLE_EMPTY_TEXT_CLASS}>-</span>
                          )}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_STATUS_CELL_CLASS}>
                          <SuratMasukStatusBadge status={record.status} />
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDetailTenggatValue(record.tenggatWaktu)}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_STATUS_CELL_CLASS}>
                          {(() => {
                            const tenggatStatusLabel =
                              formatWorkflowTenggatStatus(record, today);

                            if (tenggatStatusLabel === "-") {
                              return (
                                <span className={TABLE_EMPTY_TEXT_CLASS}>-</span>
                              );
                            }

                            return (
                              <SetupStatusBadge
                                status={getWorkflowTenggatBadgeStatus(
                                  tenggatStatusLabel,
                                )}
                                label={tenggatStatusLabel}
                              />
                            );
                          })()}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_ACTION_CELL_CLASS}>
                          {(() => {
                            const currentDisposition =
                              getCurrentDispositionForUser(
                                record.disposisi_history,
                                user?.id,
                              );

                            if (
                              !currentDisposition ||
                              !currentDisposition.can_redispose ||
                              !canRedisposeSuratMasuk
                            ) {
                              return (
                                <span className={TABLE_EMPTY_TEXT_CLASS}>-</span>
                              );
                            }

                            return (
                              <DispositionTableButton
                                label={getDispositionActionLabel(
                                  getDispositionActionMode(currentDisposition),
                                )}
                                itemName={record.namaSurat}
                                disabled={isDisposisiSubmitting}
                                onClick={() =>
                                  handleOpenDisposisiSidebar(record.id)
                                }
                              />
                            );
                          })()}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_ACTION_CELL_CLASS}>
                          <div
                            className="flex items-center justify-center"
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <CorrespondenceActionMenu
                              itemName={record.namaSurat}
                              canEdit={
                                canUpdateSuratMasuk &&
                                canManageSuratMasukRecord(record)
                              }
                              canDelete={
                                canDeleteSuratMasuk &&
                                canManageSuratMasukRecord(record)
                              }
                              onDetail={() =>
                                setSelectedDetail({
                                  kind: "surat-masuk",
                                  record,
                                })
                              }
                              onEdit={() =>
                                handleOpenEdit({
                                  kind: "surat-masuk",
                                  record,
                                })
                              }
                              onDelete={() => handleDeleteSuratMasuk(record)}
                            />
                          </div>
                        </SetupDataTableCell>
                      </SetupDataTableRow>
                    ))}
                  </SetupDataTableBody>
                </SetupDataTable>
                <Pagination
                  page={suratMasukPaginationMeta.page}
                  lastPage={suratMasukPaginationMeta.lastPage}
                  total={suratMasukPaginationMeta.total}
                  limit={suratMasukPaginationMeta.limit}
                  isLoading={isLoadingSuratMasuk}
                  onPageChange={setSuratMasukPage}
                />
                </>
              ) : (
                <EmptyState />
              )
            ) : null}

            {activeKind === "surat-keluar" ? (
              isLoadingSuratKeluar ? (
                <ReportLoadingTable widths={REPORT_SURAT_KELUAR_COLUMN_WIDTHS} />
              ) : filteredSuratKeluar.length > 0 ? (
                <>
                <SetupDataTable variant="report" density="compact" className={REPORT_SURAT_KELUAR_TABLE_CLASS}>
                  <ReportColGroup widths={REPORT_SURAT_KELUAR_COLUMN_WIDTHS} />
                  <SetupDataTableHead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell className={REPORT_NUMBER_HEADER_CELL_CLASS}>
                        No
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama Penerima
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama / Nomor Surat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tgl Pengiriman
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Sifat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Media
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Aksi
                      </SetupDataTableHeaderCell>
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody className="divide-y divide-gray-100">
                    {paginatedSuratKeluar.map((record, index) => (
                      <SetupDataTableRow
                        key={record.id}
                        className={`${SETUP_PAGE_TABLE_ROW_CLASS} cursor-pointer bg-white`}
                        onDoubleClick={() =>
                          setSelectedDetail({ kind: "surat-keluar", record })
                        }
                      >
                        <SetupDataTableCell className={REPORT_NUMBER_CELL_CLASS}>
                          {(suratKeluarPaginationMeta.page - 1) *
                            suratKeluarPaginationMeta.limit +
                            index +
                            1}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.penerima}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.namaSurat}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDisplayDate(record.tanggalKirim)}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.sifat}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.media}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_STATUS_CELL_CLASS}>
                          <SetupStatusBadge
                            status={getOutgoingStatusBadgeStatus(record.statusLabel)}
                            label={record.statusLabel}
                          />
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_ACTION_CELL_CLASS}>
                          <div
                            className="flex items-center justify-center"
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <CorrespondenceActionMenu
                              itemName={record.namaSurat}
                              canEdit={
                                canUpdateSuratKeluar &&
                                canManageSuratKeluarRecord(record)
                              }
                              canDelete={
                                canDeleteSuratKeluar &&
                                canManageSuratKeluarRecord(record)
                              }
                              onDetail={() =>
                                setSelectedDetail({
                                  kind: "surat-keluar",
                                  record,
                                })
                              }
                              onEdit={() =>
                                handleOpenEdit({
                                  kind: "surat-keluar",
                                  record,
                                })
                              }
                              onDelete={() => handleDeleteSuratKeluar(record)}
                            />
                          </div>
                        </SetupDataTableCell>
                      </SetupDataTableRow>
                    ))}
                  </SetupDataTableBody>
                </SetupDataTable>
                <Pagination
                  page={suratKeluarPaginationMeta.page}
                  lastPage={suratKeluarPaginationMeta.lastPage}
                  total={suratKeluarPaginationMeta.total}
                  limit={suratKeluarPaginationMeta.limit}
                  isLoading={isLoadingSuratKeluar}
                  onPageChange={setSuratKeluarPage}
                />
                </>
              ) : (
                <EmptyState />
              )
            ) : null}

            {activeKind === "memorandum" ? (
              isLoadingMemorandum ? (
                <ReportLoadingTable widths={REPORT_MEMORANDUM_COLUMN_WIDTHS} />
              ) : filteredMemorandum.length > 0 ? (
                <>
                <SetupDataTable variant="report" density="compact" className={REPORT_MEMORANDUM_TABLE_CLASS}>
                  <ReportColGroup widths={REPORT_MEMORANDUM_COLUMN_WIDTHS} />
                  <SetupDataTableHead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell className={REPORT_NUMBER_HEADER_CELL_CLASS}>
                        No
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        No Memo
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Perihal
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Divisi Asal
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tujuan Awal
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Pemegang Aktif
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tanggal
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Workflow
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Tenggat Waktu
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Tenggat
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Disposisi
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Aksi
                      </SetupDataTableHeaderCell>
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody className="divide-y divide-gray-100">
                    {paginatedMemorandum.map((record, index) => (
                      <SetupDataTableRow
                        key={record.id}
                        className={`${SETUP_PAGE_TABLE_ROW_CLASS} cursor-pointer bg-white`}
                        onDoubleClick={() =>
                          setSelectedDetail({ kind: "memorandum", record })
                        }
                      >
                        <SetupDataTableCell className={REPORT_NUMBER_CELL_CLASS}>
                          {(memorandumPaginationMeta.page - 1) *
                            memorandumPaginationMeta.limit +
                            index +
                            1}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_STRONG_CLASS} tabular-nums`}>
                            {record.noMemo}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_MULTILINE_TEXT_CLASS} title={record.perihal}>
                            {record.perihal}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.divisiAsal}</span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>
                            {formatJoinedNames(record.divisiTujuanAwal)}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <p
                            className={TABLE_MULTILINE_STRONG_CLASS}
                            title={
                              record.current_holder_names.length > 0
                                ? record.current_holder_names.join(", ")
                                : formatJoinedNames(record.penerima)
                            }
                          >
                            {record.current_holder_names.length > 0
                              ? record.current_holder_names.join(", ")
                              : formatJoinedNames(record.penerima)}
                          </p>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDisplayDate(record.tanggal)}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_STATUS_CELL_CLASS}>
                          <SetupStatusBadge
                            status={getDispositionStatusBadgeStatus(
                              record.statusKey ?? "NEW",
                            )}
                            label={record.statusLabel ?? "Baru"}
                          />
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDetailTenggatValue(record.tenggatWaktu)}
                          </span>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_STATUS_CELL_CLASS}>
                          {(() => {
                            const tenggatStatusLabel =
                              formatWorkflowTenggatStatus(record, today);

                            if (tenggatStatusLabel === "-") {
                              return (
                                <span className={TABLE_EMPTY_TEXT_CLASS}>-</span>
                              );
                            }

                            return (
                              <SetupStatusBadge
                                status={getWorkflowTenggatBadgeStatus(
                                  tenggatStatusLabel,
                                )}
                                label={tenggatStatusLabel}
                              />
                            );
                          })()}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_ACTION_CELL_CLASS}>
                          {(() => {
                            const currentDisposition =
                              getCurrentDispositionForUser(
                                record.disposisi_history,
                                user?.id,
                              );

                            if (
                              !currentDisposition ||
                              !currentDisposition.can_redispose ||
                              !canRedisposeMemorandum
                            ) {
                              return (
                                <span className={TABLE_EMPTY_TEXT_CLASS}>-</span>
                              );
                            }

                            return (
                              <DispositionTableButton
                                label={getDispositionActionLabel(
                                  getDispositionActionMode(currentDisposition),
                                )}
                                itemName={record.noMemo}
                                disabled={isMemorandumDisposisiSubmitting}
                                onClick={() =>
                                  handleOpenMemorandumDisposisi(record.id)
                                }
                              />
                            );
                          })()}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={REPORT_ACTION_CELL_CLASS}>
                          <div
                            className="flex items-center justify-center"
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <CorrespondenceActionMenu
                              itemName={record.noMemo}
                              canEdit={
                                canUpdateMemorandum &&
                                canManageMemorandumRecord(record)
                              }
                              canDelete={
                                canDeleteMemorandum &&
                                canManageMemorandumRecord(record)
                              }
                              onDetail={() =>
                                setSelectedDetail({
                                  kind: "memorandum",
                                  record,
                                })
                              }
                              onEdit={() =>
                                handleOpenEdit({
                                  kind: "memorandum",
                                  record,
                                })
                              }
                              onDelete={() => handleDeleteMemorandum(record)}
                            />
                          </div>
                        </SetupDataTableCell>
                      </SetupDataTableRow>
                    ))}
                  </SetupDataTableBody>
                </SetupDataTable>
                <Pagination
                  page={memorandumPaginationMeta.page}
                  lastPage={memorandumPaginationMeta.lastPage}
                  total={memorandumPaginationMeta.total}
                  limit={memorandumPaginationMeta.limit}
                  isLoading={isLoadingMemorandum}
                  onPageChange={setMemorandumPage}
                />
                </>
              ) : (
                <EmptyState />
              )
            ) : null}
          </ReportSectionShell>
        )}
      </div>
      <DashboardModal
        isOpen={selectedDetail !== null}
        onClose={() => setSelectedDetail(null)}
        title={
          selectedDetail?.kind === "surat-masuk"
            ? "Detail Surat Masuk"
            : selectedDetail?.kind === "surat-keluar"
              ? "Detail Surat Keluar"
              : "Detail Memorandum"
        }
        description={
          selectedDetail?.kind === "surat-masuk"
            ? selectedDetail.record.namaSurat
            : selectedDetail?.kind === "surat-keluar"
              ? selectedDetail.record.namaSurat
              : selectedDetail?.kind === "memorandum"
                ? selectedDetail.record.noMemo
                : undefined
        }
        maxWidth="5xl"
        bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
        footerClassName="flex justify-end border-t border-gray-100 bg-gray-50 p-6"
        footer={
          <button
            type="button"
            onClick={() => setSelectedDetail(null)}
            className="uiverse-modal-button uiverse-modal-button--neutral"
          >
            Tutup
          </button>
        }
      >
        {selectedDetail?.kind === "surat-masuk" ? (
          (() => {
            const currentUserDisposition = getCurrentDispositionForUser(
              selectedDetail.record.disposisi_history,
              user?.id,
            );
            const statusLabel =
              selectedDetail.record.statusLabel ??
              formatSuratMasukStatus(selectedDetail.record.status);
            const tenggatStatusLabel = formatWorkflowTenggatStatus(
              selectedDetail.record,
              today,
            );

            return (
              <div className="space-y-8">
                <section className="space-y-4">
                  <PersuratanSectionTitle
                    title="Informasi Surat Masuk"
                    description="Ringkasan identitas surat, tujuan awal, lokasi arsip, dan file yang tersimpan."
                  />
                  <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Identitas Surat
                          </p>
                          <div className="space-y-1">
                            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                              {selectedDetail.record.pengirim}
                            </h3>
                            <p className="text-base font-medium text-slate-500">
                              {selectedDetail.record.namaSurat}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <SuratMasukStatusBadge status={selectedDetail.record.status} />
                          {tenggatStatusLabel === "-" ? (
                            <SetupStatusBadge
                              status="Baru"
                              label="Tanpa Tenggat"
                              tone="slate"
                            />
                          ) : (
                            <SetupStatusBadge
                              status={getWorkflowTenggatBadgeStatus(
                                tenggatStatusLabel,
                              )}
                              label={tenggatStatusLabel}
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <PersuratanInfoItem
                          label="Tanggal Terima"
                          value={formatDisplayDate(
                            selectedDetail.record.tanggalTerima,
                          )}
                        />
                        <PersuratanInfoItem
                          label="Sifat"
                          value={selectedDetail.record.sifat}
                        />
                        <PersuratanInfoItem
                          label="Status Surat"
                          value={statusLabel}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <PersuratanInfoItem
                          label="Alamat Pengirim"
                          value={selectedDetail.record.alamatPengirim}
                        />
                        <PersuratanInfoItem
                          label="Divisi Tujuan Awal"
                          value={formatJoinedNames(
                            selectedDetail.record.targetDivisionNames ?? [],
                          )}
                        />
                        <PersuratanInfoItem
                          label="Perihal"
                          className="md:col-span-2"
                          value={selectedDetail.record.perihal}
                        />
                        <PersuratanInfoItem
                          label="Penyimpanan Fisik"
                          className="md:col-span-2"
                          value={selectedDetail.record.physicalStorageLabel ?? "-"}
                        />
                      </div>
                    </div>

                    <DocumentSection
                      fileName={selectedDetail.record.fileName}
                      hasFile={isValidFileUrl(selectedDetail.record.fileUrl)}
                      watermark={selectedDetail.record.watermark}
                      onPreview={() =>
                        handlePreviewDocument(
                          selectedDetail.record.fileUrl,
                          selectedDetail.record.fileName,
                        )
                      }
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <PersuratanSectionTitle
                    title="Alur Disposisi"
                    description="Status pemegang surat, tenggat aktif, dan tindakan yang bisa dilakukan user saat ini."
                  />
                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <PersuratanInfoItem label="Pemegang Saat Ini">
                        {selectedDetail.record.current_holder_names.length > 0
                          ? selectedDetail.record.current_holder_names.join(", ")
                          : "Tidak ada"}
                      </PersuratanInfoItem>
                      <PersuratanInfoItem
                        label="Holder Terakhir"
                        value={selectedDetail.record.last_holder_name ?? "Belum ada"}
                      />
                      <PersuratanInfoItem
                        label="Disposisi Aktif"
                        value={`${selectedDetail.record.active_dispositions_count} disposisi`}
                      />
                      <PersuratanInfoItem
                        label="Tenggat Waktu"
                        value={formatDetailTenggatValue(
                          selectedDetail.record.tenggatWaktu,
                        )}
                      />
                    </div>

                    <WorkflowActionPanel
                      currentDisposition={currentUserDisposition}
                      onStart={() =>
                        currentUserDisposition
                          ? handleUpdateSuratDispositionStatus(
                              selectedDetail.record,
                              currentUserDisposition.id,
                              "IN_PROGRESS",
                            )
                          : undefined
                      }
                      onComplete={() =>
                        currentUserDisposition
                          ? handleUpdateSuratDispositionStatus(
                              selectedDetail.record,
                              currentUserDisposition.id,
                              "COMPLETED",
                            )
                          : undefined
                      }
                      isBusy={isUpdatingDispositionStatus}
                      canUpdateStatus={canUpdateSuratMasuk}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <PersuratanInfoItem
                        label="Keterangan Surat"
                        value={selectedDetail.record.keterangan ?? "-"}
                      />
                      <PersuratanInfoItem
                        label="Catatan Disposisi"
                        value={selectedDetail.record.keteranganTenggat ?? "-"}
                      />
                    </div>
                  </div>
                </section>

                <WorkflowTimelineSection
                  title={`Timeline ${getDispositionActionLabel(
                    getDispositionActionMode(currentUserDisposition),
                  )}`}
                  description="Urutan disposisi dan perubahan status yang tercatat untuk surat ini."
                  dispositions={selectedDetail.record.disposisi_history}
                />
              </div>
            );
          })()
        ) : null}

        {selectedDetail?.kind === "surat-keluar" ? (
          <div className="space-y-8">
            <section className="space-y-4">
              <PersuratanSectionTitle
                title="Informasi Surat Keluar"
                description="Ringkasan pengiriman surat keluar, status arsip, lokasi penyimpanan, dan file dokumen."
              />
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Identitas Pengiriman
                      </p>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {selectedDetail.record.penerima}
                        </h3>
                        <p className="text-base font-medium text-slate-500">
                          {selectedDetail.record.namaSurat}
                        </p>
                      </div>
                    </div>
                    <SetupStatusBadge
                      status={getOutgoingStatusBadgeStatus(
                        selectedDetail.record.statusLabel,
                      )}
                      label={selectedDetail.record.statusLabel}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <PersuratanInfoItem
                      label="Tanggal Kirim"
                      value={formatDisplayDate(selectedDetail.record.tanggalKirim)}
                    />
                    <PersuratanInfoItem
                      label="Media"
                      value={selectedDetail.record.media}
                    />
                    <PersuratanInfoItem
                      label="Sifat"
                      value={selectedDetail.record.sifat}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <PersuratanInfoItem
                      label="Alamat Penerima"
                      className="md:col-span-2"
                      value={selectedDetail.record.alamatPenerima}
                    />
                    <PersuratanInfoItem
                      label="Penyimpanan Fisik"
                      className="md:col-span-2"
                      value={selectedDetail.record.physicalStorageLabel ?? "-"}
                    />
                  </div>
                </div>

                <DocumentSection
                  description="Surat keluar tidak memiliki alur disposisi; file dipakai untuk preview dan cetak."
                  fileName={selectedDetail.record.fileName}
                  hasFile={isValidFileUrl(selectedDetail.record.fileUrl)}
                  watermark={selectedDetail.record.watermark}
                  onPreview={() =>
                    handlePreviewDocument(
                      selectedDetail.record.fileUrl,
                      selectedDetail.record.fileName,
                    )
                  }
                />
              </div>
            </section>
          </div>
        ) : null}

        {selectedDetail?.kind === "memorandum" ? (
          (() => {
            const currentUserDisposition = getCurrentDispositionForUser(
              selectedDetail.record.disposisi_history,
              user?.id,
            );
            const tenggatStatusLabel = formatWorkflowTenggatStatus(
              selectedDetail.record,
              today,
            );

            return (
              <div className="space-y-8">
                <section className="space-y-4">
                  <PersuratanSectionTitle
                    title="Informasi Memorandum"
                    description="Ringkasan memo internal, tujuan awal, lokasi arsip, dan file yang tersimpan."
                  />
                  <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Identitas Memo
                          </p>
                          <div className="space-y-1">
                            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                              {selectedDetail.record.noMemo}
                            </h3>
                            <p className="text-base font-medium text-slate-500">
                              {selectedDetail.record.perihal}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <SetupStatusBadge
                            status={getDispositionStatusBadgeStatus(
                              selectedDetail.record.statusKey ?? "NEW",
                            )}
                            label={selectedDetail.record.statusLabel ?? "Baru"}
                          />
                          {tenggatStatusLabel === "-" ? (
                            <SetupStatusBadge
                              status="Baru"
                              label="Tanpa Tenggat"
                              tone="slate"
                            />
                          ) : (
                            <SetupStatusBadge
                              status={getWorkflowTenggatBadgeStatus(
                                tenggatStatusLabel,
                              )}
                              label={tenggatStatusLabel}
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <PersuratanInfoItem
                          label="Tanggal Memo"
                          value={formatDisplayDate(selectedDetail.record.tanggal)}
                        />
                        <PersuratanInfoItem
                          label="Divisi Asal"
                          value={selectedDetail.record.divisiAsal}
                        />
                        <PersuratanInfoItem
                          label="Pembuat"
                          value={selectedDetail.record.pembuatMemo}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <PersuratanInfoItem
                          label="Tujuan Awal"
                          value={formatJoinedNames(
                            selectedDetail.record.divisiTujuanAwal,
                          )}
                        />
                        <PersuratanInfoItem
                          label="Penerima Aktif"
                          value={
                            selectedDetail.record.current_holder_names.length > 0
                              ? selectedDetail.record.current_holder_names.join(", ")
                              : formatJoinedNames(selectedDetail.record.penerima)
                          }
                        />
                        <PersuratanInfoItem
                          label="Penyimpanan Fisik"
                          className="md:col-span-2"
                          value={selectedDetail.record.physicalStorageLabel ?? "-"}
                        />
                      </div>
                    </div>

                    <DocumentSection
                      fileName={selectedDetail.record.fileName}
                      hasFile={isValidFileUrl(selectedDetail.record.fileUrl)}
                      watermark={selectedDetail.record.watermark}
                      onPreview={() =>
                        handlePreviewDocument(
                          selectedDetail.record.fileUrl,
                          selectedDetail.record.fileName,
                        )
                      }
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <PersuratanSectionTitle
                    title="Alur Disposisi"
                    description="Status penerima memo, tenggat aktif, dan tindakan yang bisa dilakukan user saat ini."
                  />
                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <PersuratanInfoItem label="Pemegang Saat Ini">
                        {selectedDetail.record.current_holder_names.length > 0
                          ? selectedDetail.record.current_holder_names.join(", ")
                          : "Tidak ada"}
                      </PersuratanInfoItem>
                      <PersuratanInfoItem
                        label="Holder Terakhir"
                        value={selectedDetail.record.last_holder_name ?? "Belum ada"}
                      />
                      <PersuratanInfoItem
                        label="Disposisi Aktif"
                        value={`${selectedDetail.record.active_dispositions_count} disposisi`}
                      />
                      <PersuratanInfoItem
                        label="Tenggat Waktu"
                        value={formatDetailTenggatValue(
                          selectedDetail.record.tenggatWaktu,
                        )}
                      />
                    </div>

                    <WorkflowActionPanel
                      currentDisposition={currentUserDisposition}
                      onStart={() =>
                        currentUserDisposition
                          ? handleUpdateMemorandumDispositionStatus(
                              selectedDetail.record,
                              currentUserDisposition.id,
                              "IN_PROGRESS",
                            )
                          : undefined
                      }
                      onComplete={() =>
                        currentUserDisposition
                          ? handleUpdateMemorandumDispositionStatus(
                              selectedDetail.record,
                              currentUserDisposition.id,
                              "COMPLETED",
                            )
                          : undefined
                      }
                      isBusy={isUpdatingDispositionStatus}
                      canUpdateStatus={canUpdateMemorandum}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <PersuratanInfoItem
                        label="Keterangan Memo"
                        value={selectedDetail.record.keterangan}
                      />
                      <PersuratanInfoItem
                        label="Catatan Disposisi"
                        value={selectedDetail.record.keteranganTenggat ?? "-"}
                      />
                    </div>
                  </div>
                </section>

                <WorkflowTimelineSection
                  title={`Timeline ${getDispositionActionLabel(
                    getDispositionActionMode(currentUserDisposition),
                  )}`}
                  description="Urutan disposisi dan perubahan status yang tercatat untuk memorandum ini."
                  dispositions={selectedDetail.record.disposisi_history}
                />
              </div>
            );
          })()
        ) : null}
      </DashboardModal>

      <SuratMasukDisposisiModal
        surat={activeDisposisiSurat}
        isOpen={activeDisposisiSurat !== null}
        actionMode={activeSuratDispositionMode}
        users={suratDisposisiUsers}
        selectedUserIds={selectedDisposisiUserIds}
        userSearch={disposisiUserSearch}
        dueDate={disposisiDueDate}
        catatan={disposisiCatatan}
        isSubmitting={isDisposisiSubmitting}
        onToggleSelectedUser={toggleSelectedDisposisiUser}
        onChangeUserSearch={setDisposisiUserSearch}
        onChangeDueDate={setDisposisiDueDate}
        onChangeCatatan={setDisposisiCatatan}
        onClose={handleCloseDisposisiSidebar}
        onSubmit={handleSubmitDisposisi}
      />
      <MemorandumDisposisiModal
        memorandum={activeDisposisiMemorandum}
        isOpen={activeDisposisiMemorandum !== null}
        actionMode={activeMemorandumDispositionMode}
        users={memorandumDisposisiUsers}
        selectedUserIds={selectedMemorandumDisposisiUserIds}
        userSearch={memorandumDisposisiUserSearch}
        dueDate={memorandumDisposisiDueDate}
        catatan={memorandumDisposisiCatatan}
        isSubmitting={isMemorandumDisposisiSubmitting}
        onToggleSelectedUser={toggleSelectedMemorandumDisposisiUser}
        onChangeUserSearch={setMemorandumDisposisiUserSearch}
        onChangeDueDate={setMemorandumDisposisiDueDate}
        onChangeCatatan={setMemorandumDisposisiCatatan}
        onClose={handleCloseMemorandumDisposisi}
        onSubmit={handleSubmitMemorandumDisposisi}
      />
      {editTarget ? (
        <EditCorrespondenceModal
          key={`${editTarget.kind}-${String(editTarget.record.id)}`}
          target={editTarget}
          letterPriorities={letterPriorities}
          divisions={divisions}
          storageOptions={storageOptions}
          deliveryMediaOptions={deliveryMediaOptions}
          isOptionsLoading={isEditOptionsLoading}
          isSubmitting={isUpdatingCorrespondence}
          onClose={() => {
            if (!isUpdatingCorrespondence) {
              setEditTarget(null);
            }
          }}
          onSubmit={handleSubmitEdit}
        />
      ) : null}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        title="Hapus Surat Masuk?"
        entityLabel="surat masuk"
        itemName={deleteTarget?.namaSurat ?? ""}
        onClose={() => {
          if (!isDeletingSuratMasuk) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmDeleteSuratMasuk}
        isLoading={isDeletingSuratMasuk}
      />
      <DeleteConfirmModal
        isOpen={deleteOutgoingTarget !== null}
        title="Hapus Surat Keluar?"
        entityLabel="surat keluar"
        itemName={deleteOutgoingTarget?.namaSurat ?? ""}
        onClose={() => {
          if (!isDeletingSuratKeluar) {
            setDeleteOutgoingTarget(null);
          }
        }}
        onConfirm={handleConfirmDeleteSuratKeluar}
        isLoading={isDeletingSuratKeluar}
      />
      <DeleteConfirmModal
        isOpen={deleteMemorandumTarget !== null}
        title="Hapus Memorandum?"
        entityLabel="memorandum"
        itemName={deleteMemorandumTarget?.noMemo ?? ""}
        onClose={() => {
          if (!isDeletingMemorandum) {
            setDeleteMemorandumTarget(null);
          }
        }}
        onConfirm={handleConfirmDeleteMemorandum}
        isLoading={isDeletingMemorandum}
      />
    </div>
  );
}
