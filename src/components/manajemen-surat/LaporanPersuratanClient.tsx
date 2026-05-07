"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  CircleDot,
  FileText,
  Inbox,
  Mail,
  PlayCircle,
  Search,
  SearchX,
  Send,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import DetailModal, {
  DetailRow,
  DetailSection,
} from "@/components/marketing/DetailModal";
import DocumentViewButton from "@/components/manajemen-surat/DocumentViewButton";
import MemorandumDisposisiModal from "@/components/manajemen-surat/MemorandumDisposisiModal";
import SuratMasukDisposisiModal from "@/components/manajemen-surat/SuratMasukDisposisiModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { Button } from "@/components/ui/button";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import {
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
import { isValidFileUrl } from "@/lib/utils/file";
import { toApiDateTime } from "@/services/api.utils";
import { correspondenceService } from "@/services/correspondence.service";
import { memorandumService } from "@/services/memorandum.service";
import { suratKeluarService } from "@/services/surat-keluar.service";
import { suratMasukService } from "@/services/surat-masuk.service";

type ReportKind = "surat-masuk" | "surat-keluar" | "memorandum";
type SortValue = "terbaru" | "terlama" | "tenggat-terdekat" | "tenggat-terlama";

const SURAT_MASUK_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-surat-masuk";
const SURAT_KELUAR_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-surat-keluar";
const MEMORANDUM_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-memorandum";

const REPORT_SCOPE_OPTIONS: Array<{
  value: CorrespondenceReportScope;
  label: string;
}> = [
  { value: "my", label: "Laporan Saya" },
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

interface SummaryRow {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface SummaryCardConfig {
  kind: ReportKind;
  title: string;
  icon: LucideIcon;
  totalLabel: string;
  totalValue: number;
  ctaLabel: string;
  infoRows: SummaryRow[];
}

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

function formatTenggatDate(value: string) {
  return formatDate(value);
}

function getTenggatStats<T>(
  records: T[],
  getTenggat: (record: T) => string | undefined,
  today: Date,
) {
  let memilikiTenggat = 0;
  let melewatiTenggat = 0;

  records.forEach((record) => {
    const value = getTenggat(record);
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    memilikiTenggat += 1;
    if (parsed < today) {
      melewatiTenggat += 1;
    }
  });

  return { memilikiTenggat, melewatiTenggat };
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

  if (parsed < today) {
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

function SuratMasukStatusBadge({ status }: { status: SuratMasuk["status"] }) {
  return (
    <span className={getSuratMasukStatusPillClass(status)}>
      {formatSuratMasukBadgeStatus(status)}
    </span>
  );
}

function getDispositionStatusPillClass(status: string) {
  if (status === "COMPLETED") {
    return `${TABLE_PILL_BASE_CLASS} border-slate-200 bg-slate-100 text-slate-700`;
  }

  if (status === "IN_PROGRESS") {
    return `${TABLE_PILL_BASE_CLASS} border-amber-200 bg-amber-50 text-amber-700`;
  }

  if (status === "FORWARDED") {
    return `${TABLE_PILL_BASE_CLASS} border-sky-200 bg-sky-50 text-sky-700`;
  }

  return `${TABLE_PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`;
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

function getWorkflowActionLabel(
  disposition: WorkflowDisposition | null,
  fallback: string,
) {
  if (!disposition) return fallback;
  return disposition.sequence && disposition.sequence > 1
    ? "Redisposisi"
    : fallback;
}

function WorkflowStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function WorkflowTimelineSection({
  title,
  dispositions,
}: {
  title: string;
  dispositions: WorkflowDisposition[];
}) {
  return (
    <DetailSection title={title}>
      {dispositions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Belum ada riwayat disposisi.
        </div>
      ) : (
        <div className="space-y-3">
          {dispositions.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-100 px-2 text-xs font-semibold text-sky-700">
                      {(item.sequence ?? 0).toString().padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.timeline_label}
                    </span>
                    {item.is_current ? (
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        Langkah Aktif
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.catatan}
                    </p>
                  ) : null}
                </div>

                <span className={getDispositionStatusPillClass(item.status_key)}>
                  {item.status_label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
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

const ACTION_ICON_BUTTON_CLASS = "rounded-lg p-2 transition-colors";
const TABLE_PILL_BASE_CLASS =
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold";
const REPORT_TABLE_CLASS =
  "w-full min-w-max border-collapse text-sm [&_thead_th]:whitespace-nowrap [&_tbody_td]:whitespace-nowrap";
const REPORT_TABLE_HEADER_CELL_CLASS =
  "px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500";
const REPORT_TABLE_CELL_CLASS = "px-6 py-4 align-middle";
const REPORT_NUMBER_HEADER_CELL_CLASS = REPORT_TABLE_HEADER_CELL_CLASS;
const REPORT_NUMBER_CELL_CLASS = "px-6 py-4 text-gray-500 tabular-nums";
const REPORT_STATUS_HEADER_CELL_CLASS =
  `${REPORT_TABLE_HEADER_CELL_CLASS} text-center`;
const REPORT_STATUS_CELL_CLASS = `${REPORT_TABLE_CELL_CLASS} text-center`;
const REPORT_ACTION_HEADER_CELL_CLASS =
  `${REPORT_TABLE_HEADER_CELL_CLASS} text-center`;
const REPORT_ACTION_CELL_CLASS = `${REPORT_TABLE_CELL_CLASS} text-center`;
const TABLE_TEXT_CLASS = "text-sm text-gray-700";
const TABLE_TEXT_MUTED_CLASS = "text-sm text-gray-600";
const TABLE_TEXT_STRONG_CLASS = "text-sm text-gray-900";
const TABLE_EMPTY_TEXT_CLASS = "text-sm text-gray-400";

function getBooleanPillClass(isEnabled: boolean) {
  return isEnabled
    ? `${TABLE_PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${TABLE_PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
}

function getSuratMasukStatusPillClass(status: SuratMasuk["status"]) {
  if (status === "TERLAMBAT") {
    return `${TABLE_PILL_BASE_CLASS} border-red-200 bg-red-50 text-red-700`;
  }

  if (status === "SELESAI") {
    return `${TABLE_PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
  }

  if (status === "DIDISPOSISI") {
    return `${TABLE_PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }

  return `${TABLE_PILL_BASE_CLASS} border-blue-200 bg-blue-50 text-blue-700`;
}

function getOutgoingStatusPillClass(statusLabel: string) {
  return getBooleanPillClass(statusLabel.trim().toLowerCase() === "aktif");
}

function getTenggatStatusPillClass(variant: "none" | "active" | "overdue") {
  if (variant === "overdue") {
    return `${TABLE_PILL_BASE_CLASS} border-red-200 bg-red-50 text-red-700`;
  }

  if (variant === "active") {
    return `${TABLE_PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }

  return `${TABLE_PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
}

function SelectionState() {
  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Mail className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        Pilih kategori persuratan
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Klik salah satu kartu di atas untuk menampilkan daftar surat atau
        memorandum.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
        <SearchX className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="text-lg font-medium text-gray-900">
        Tidak ada data yang sesuai filter
      </p>
    </div>
  );
}

function DetailButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-10 rounded-lg border-[#d5e6f4] px-4 text-sm text-slate-700 hover:bg-[#f7fbff]"
    >
      Detail
    </Button>
  );
}

function DisposisiButton({
  onClick,
  isRedisposisi = false,
}: {
  onClick: () => void;
  isRedisposisi?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-10 gap-2 rounded-lg border-[#d5e6f4] px-4 text-sm text-slate-700 hover:bg-[#f7fbff]"
    >
      <Send className="h-4 w-4" aria-hidden="true" />
      {isRedisposisi ? "Redisposisi" : "Disposisi"}
    </Button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50 hover:text-red-700`}
      title="Hapus"
      aria-label="Hapus"
    >
      <Trash2 className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

function DocumentSection({
  fileName,
  hasFile,
  onPreview,
}: {
  fileName: string;
  hasFile: boolean;
  onPreview: () => void;
}) {
  return (
    <DetailSection title="Dokumen">
      <DetailRow label="Nama File" value={formatDocumentFileName(fileName)} />
      <DetailRow
        label="Aksi"
        value={
          <DocumentViewButton
            onClick={onPreview}
            title={hasFile ? "View dokumen" : "File belum tersedia"}
            disabled={!hasFile}
          />
        }
      />
    </DetailSection>
  );
}

function WorkflowActionPanel({
  currentDisposition,
  onStart,
  onComplete,
  onRedispose,
  isBusy,
  canRedispose,
  redispositionLabel,
}: {
  currentDisposition: WorkflowDisposition | null;
  onStart: () => void;
  onComplete: () => void;
  onRedispose: () => void;
  isBusy: boolean;
  canRedispose: boolean;
  redispositionLabel: string;
}) {
  if (!currentDisposition) return null;

  return (
    <DetailSection title="Tindak Lanjut">
      <div className="flex flex-wrap gap-3">
        {currentDisposition.can_start ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStart}
            disabled={isBusy}
            className="h-10 gap-2 rounded-lg border-amber-200 bg-amber-50 px-4 text-amber-700 hover:bg-amber-100"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Mulai Proses
          </Button>
        ) : null}

        {currentDisposition.can_complete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onComplete}
            disabled={isBusy}
            className="h-10 gap-2 rounded-lg border-emerald-200 bg-emerald-50 px-4 text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Tandai Selesai
          </Button>
        ) : null}

        {canRedispose && currentDisposition.can_redispose ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRedispose}
            disabled={isBusy}
            className="h-10 gap-2 rounded-lg border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {redispositionLabel}
          </Button>
        ) : null}
      </div>
    </DetailSection>
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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#157ec3]">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
            Tutup List
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-100 px-6 py-5">
        <div className="space-y-5">
          {showReportScopeControls ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cakupan Laporan
                </span>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                  {visibleReportScopeOptions.map((option) => {
                    const isActive = reportScope === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onReportScopeChange(option.value)}
                        className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-[#157ec3] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {reportScope === "my" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Filter Saya
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {MY_REPORT_FILTER_OPTIONS.map((option) => {
                      const isActive = myReportFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onMyReportFilterChange(option.value)}
                          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                            isActive
                              ? "border-blue-200 bg-blue-50 text-[#157ec3]"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
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
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Cari Data
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                className="input input-with-icon bg-white"
                placeholder={searchPlaceholder}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Urutkan
            </label>
            <div className="relative">
              <ArrowUpDown
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <select
                value={sortValue}
                onChange={(event) =>
                  onSortChange(event.target.value as SortValue)
                }
                className="select input-with-icon bg-white"
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
              </select>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="overflow-x-auto">{children}</div>
    </div>
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
  const [selectedDisposisiUserId, setSelectedDisposisiUserId] = useState("");
  const [disposisiUserSearch, setDisposisiUserSearch] = useState("");
  const [disposisiCatatan, setDisposisiCatatan] = useState("");
  const [isDisposisiSubmitting, setIsDisposisiSubmitting] = useState(false);
  const [activeMemorandumDisposisiId, setActiveMemorandumDisposisiId] =
    useState<string | number | null>(null);
  const [
    selectedMemorandumDisposisiUserId,
    setSelectedMemorandumDisposisiUserId,
  ] = useState("");
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
  const canDeleteSuratMasuk = hasCapability(SURAT_MASUK_MENU_URL, "delete");
  const canDeleteSuratKeluar = hasCapability(SURAT_KELUAR_MENU_URL, "delete");
  const canDeleteMemorandum = hasCapability(MEMORANDUM_MENU_URL, "delete");
  const canRedisposeSuratMasuk =
    hasCapability(SURAT_MASUK_MENU_URL, "update") &&
    hasFeature(SURAT_MASUK_MENU_URL, "redispose");
  const canRedisposeMemorandum =
    hasCapability(MEMORANDUM_MENU_URL, "update") &&
    hasFeature(MEMORANDUM_MENU_URL, "redispose");

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

  const requireRedisposeSuratMasukAction = () =>
    ensureCapability(SURAT_MASUK_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah disposisi surat masuk.",
    }) &&
    ensureFeature(SURAT_MASUK_MENU_URL, "redispose", {
      message: "Anda tidak memiliki akses untuk redisposisi surat masuk.",
    });

  const requireRedisposeMemorandumAction = () =>
    ensureCapability(MEMORANDUM_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah disposisi memorandum.",
    }) &&
    ensureFeature(MEMORANDUM_MENU_URL, "redispose", {
      message: "Anda tidak memiliki akses untuk redisposisi memorandum.",
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
  const supportsPersonalScope = activeKind !== "surat-keluar";
  const displayedReportScope: CorrespondenceReportScope = supportsPersonalScope
    ? reportScope
    : "all";
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
          scope: "all",
        }),
      ]);
      const userNameById = new Map<string, string>();
      const nextAvailableScopes =
        report.filters.available_scopes.length > 0
          ? report.filters.available_scopes
          : [report.filters.scope];

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
    if (!supportsPersonalScope) return;

    if (!availableReportScopes.includes(reportScope)) {
      setReportScope(availableReportScopes[0] ?? "my");
    }
  }, [availableReportScopes, reportScope, supportsPersonalScope]);

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
              : "Gagal memuat penerima redisposisi memorandum",
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
    setDeleteOutgoingTarget(record);
  };

  const handleConfirmDeleteSuratKeluar = async () => {
    if (!deleteOutgoingTarget) return;
    if (!requireDeleteSuratKeluarAction()) return;

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
    setSelectedMemorandumDisposisiUserId("");
    setMemorandumDisposisiUserSearch("");
    setMemorandumDisposisiDueDate("");
    setMemorandumDisposisiCatatan("");
  };

  const handleCloseMemorandumDisposisi = () => {
    if (isMemorandumDisposisiSubmitting) return;
    setActiveMemorandumDisposisiId(null);
    setMemorandumDisposisiUsers([]);
    setSelectedMemorandumDisposisiUserId("");
    setMemorandumDisposisiUserSearch("");
    setMemorandumDisposisiDueDate("");
    setMemorandumDisposisiCatatan("");
  };

  const handleDeleteMemorandum = (record: MemorandumRecord) => {
    if (!requireDeleteMemorandumAction()) return;
    setDeleteMemorandumTarget(record);
  };

  const handleConfirmDeleteMemorandum = async () => {
    if (!deleteMemorandumTarget) return;
    if (!requireDeleteMemorandumAction()) return;

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

    if (!selectedMemorandumDisposisiUserId) {
      showToast("Tujuan redisposisi wajib dipilih!", "error");
      return;
    }

    setIsMemorandumDisposisiSubmitting(true);

    try {
      await memorandumService.redispose(String(activeDisposisiMemorandum.id), {
        receiver_id: selectedMemorandumDisposisiUserId,
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

      showToast(
        activeDisposisiMemorandum.disposisi_history.length > 0
          ? "Redisposisi memorandum berhasil dikirim!"
          : "Disposisi memorandum berhasil dikirim!",
        "success",
      );
      handleCloseMemorandumDisposisi();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengirim redisposisi memorandum",
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
      ),
      suratKeluar: {
        memilikiTenggat: 0,
        melewatiTenggat: 0,
      },
      memorandum: getTenggatStats(
        memorandumRecords,
        (record) => record.tenggatWaktu,
        today,
      ),
    }),
    [memorandumRecords, suratMasukRecords, today],
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
            label: "Disposisi",
            value: `${
              new Set(
                suratMasukRecords
                  .filter((record) => record.status === "DIDISPOSISI")
                  .flatMap((record) => record.disposisiKepada),
              ).size
            } User`,
          },
          {
            icon: CalendarDays,
            label: "Memiliki Tenggat Waktu",
            value: `${tenggatStats.suratMasuk.memilikiTenggat}`,
          },
          {
            icon: AlertTriangle,
            label: "Melewati tenggat waktu",
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
            label: "Media",
            value: summarize(
              [...new Set(suratKeluarRecords.map((record) => record.media))],
              3,
            ),
          },
          {
            icon: Shield,
            label: "Status",
            value: summarize(
              [
                ...new Set(
                  suratKeluarRecords.map((record) => record.statusLabel),
                ),
              ],
              3,
            ),
          },
          {
            icon: FileText,
            label: "Dokumen Tersimpan",
            value: `${suratKeluarRecords.filter((record) => Boolean(record.fileName)).length}`,
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
            icon: UserRound,
            label: "Pembuat",
            value: `${new Set(memorandumRecords.map((record) => record.pembuatMemo)).size} User`,
          },
          {
            icon: CalendarDays,
            label: "Memiliki Tenggat Waktu",
            value: `${tenggatStats.memorandum.memilikiTenggat}`,
          },
          {
            icon: AlertTriangle,
            label: "Melewati tenggat waktu",
            value: `${tenggatStats.memorandum.melewatiTenggat}`,
          },
        ],
      },
    ],
    [memorandumRecords, suratKeluarRecords, suratMasukRecords, tenggatStats],
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
      sortValue,
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

  const activeConfig = activeKind ? activeSectionConfig[activeKind] : null;

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
    setActiveMemorandumDisposisiId(null);
  };

  const handleChangeMyReportFilter = (value: CorrespondenceMyReportFilter) => {
    setMyReportFilter(value);
    setSearchValue("");
    setSortValue("terbaru");
    setSelectedDetail(null);
    setActiveDisposisiSuratId(null);
    setActiveMemorandumDisposisiId(null);
  };

  const handleOpenDisposisiSidebar = (suratId: string | number) => {
    if (!requireRedisposeSuratMasukAction()) return;
    setActiveDisposisiSuratId(suratId);
    setSuratDisposisiUsers([]);
    setSelectedDisposisiUserId("");
    setDisposisiUserSearch("");
    setDisposisiCatatan("");
  };

  const handleCloseDisposisiSidebar = () => {
    if (isDisposisiSubmitting) return;
    setActiveDisposisiSuratId(null);
    setSuratDisposisiUsers([]);
    setSelectedDisposisiUserId("");
    setDisposisiUserSearch("");
    setDisposisiCatatan("");
  };

  const handleDeleteSuratMasuk = (record: SuratMasukRecord) => {
    if (!requireDeleteSuratMasukAction()) return;
    setDeleteTarget(record);
  };

  const handleConfirmDeleteSuratMasuk = async () => {
    if (!deleteTarget) return;
    if (!requireDeleteSuratMasukAction()) return;

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

    if (!selectedDisposisiUserId) {
      showToast("Tujuan disposisi wajib dipilih!", "error");
      return;
    }

    const recipient = suratDisposisiUsers.find(
      (item) => item.id === selectedDisposisiUserId,
    );
    if (!recipient) {
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
        receiver_id: recipient.id,
        note: disposisiCatatan.trim() || undefined,
        due_date: activeDisposisiSurat.tenggatWaktu
          ? toApiDateTime(activeDisposisiSurat.tenggatWaktu)
          : undefined,
      });

      const nextState = await refreshReportData();
      const nextRecords = nextState.incoming;

      setSelectedDetail((prev) => {
        if (!prev || prev.kind !== "surat-masuk") return prev;

        const nextRecord =
          nextRecords.find((record) => record.id === prev.record.id) ?? null;

        return nextRecord ? { kind: "surat-masuk", record: nextRecord } : prev;
      });

      showToast(
        activeDisposisiSurat.disposisi_history.length > 0
          ? "Disposisi ulang berhasil dikirim!"
          : "Disposisi berhasil dikirim!",
        "success",
      );
      handleCloseDisposisiSidebar();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal mengirim redisposisi",
        "error",
      );
    } finally {
      setIsDisposisiSubmitting(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          const isActive = activeKind === card.kind;

          return (
            <button
              key={card.kind}
              type="button"
              onClick={() => handleSelectCard(card.kind)}
              className={`group rounded-lg border bg-white p-6 text-left shadow-sm transition-colors duration-150 ${
                isActive
                  ? "border-blue-200 ring-2 ring-blue-100"
                  : "border-gray-100 hover:border-blue-200"
              }`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="mb-6 flex items-start gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#157ec3] transition-colors">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900">
                      {card.title}
                    </p>
                  </div>
                </div>

                <div className="flex w-28 shrink-0 flex-col items-end text-right">
                  <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
                    {card.totalLabel}
                  </span>
                  <span className="text-xl font-semibold tabular-nums text-gray-800">
                    {card.totalValue}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                {card.infoRows.map((row, index) => {
                  const RowIcon = row.icon;

                  return (
                    <div
                      key={`${card.kind}-${row.label}`}
                      className={index === 0 ? "" : "pt-3"}
                    >
                      {index > 0 ? (
                        <div className="mb-3 h-px w-full bg-gray-200" />
                      ) : null}
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="flex items-center gap-2 text-gray-500">
                          <RowIcon
                            className="h-4 w-4 text-gray-500"
                            aria-hidden="true"
                          />
                          {row.label}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {row.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between text-sm font-medium text-primary-600 transition-colors">
                <span>{card.ctaLabel}</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>

      <div ref={reportRef}>
        {!activeConfig ? (
          <SelectionState />
        ) : (
          <ReportSectionShell
            title={activeConfig.title}
            subtitle={activeConfig.subtitle}
            showReportScopeControls={supportsPersonalScope}
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
            onClose={() => setActiveKind(null)}
          >
            {activeKind === "surat-masuk" ? (
              isLoadingSuratMasuk ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Inbox className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    Memuat surat masuk
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Data laporan surat masuk sedang diambil dari server.
                  </p>
                </div>
              ) : filteredSuratMasuk.length > 0 ? (
                <table className={REPORT_TABLE_CLASS}>
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className={REPORT_NUMBER_HEADER_CELL_CLASS}>
                        No
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama Pengirim
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Alamat Pengirim
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama / Nomor Surat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Perihal
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tgl Penerimaan
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Sifat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Disposisi
                      </th>
                      <th className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Surat
                      </th>
                      <th className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Tenggat Waktu
                      </th>
                      <th className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Tenggat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Keterangan Surat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Catatan Disposisi
                      </th>
                      <th className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSuratMasuk.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`${SETUP_PAGE_TABLE_ROW_CLASS} cursor-pointer bg-white`}
                        onDoubleClick={() =>
                          setSelectedDetail({ kind: "surat-masuk", record })
                        }
                      >
                        <td className={REPORT_NUMBER_CELL_CLASS}>{index + 1}</td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.pengirim}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_MUTED_CLASS}>{record.alamatPengirim}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.namaSurat}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.perihal}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDisplayDate(record.tanggalTerima)}
                          </span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.sifat}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          {record.disposisiKepada.length > 0
                            ? record.disposisiKepada.join(", ")
                            : "—"}
                        </td>
                        <td className={REPORT_STATUS_CELL_CLASS}>
                          <SuratMasukStatusBadge status={record.status} />
                        </td>
                        <td className={REPORT_STATUS_CELL_CLASS}>
                          {record.tenggatWaktu ? (
                            <span className={`${TABLE_TEXT_CLASS} text-center whitespace-nowrap`}>
                              {formatTenggatDate(record.tenggatWaktu)}
                            </span>
                          ) : (
                            <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>
                          )}
                        </td>
                        <td className={REPORT_STATUS_CELL_CLASS}>
                          {(() => {
                            const status = getTenggatStatus(
                              record.tenggatWaktu,
                              today,
                            );
                            if (status.variant === "none") {
                              return <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>;
                            }
                            return (
                              <span className={getTenggatStatusPillClass(status.variant)}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          {record.keterangan ? (
                            <p className="text-sm text-gray-600">
                              {record.keterangan}
                            </p>
                          ) : (
                            <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>
                          )}
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          {record.keteranganTenggat ? (
                            <p className="text-sm text-gray-600">
                              {record.keteranganTenggat}
                            </p>
                          ) : (
                            <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>
                          )}
                        </td>
                        <td className={REPORT_ACTION_CELL_CLASS}>
                          <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                            {canDeleteSuratMasuk ? (
                              <DeleteButton
                                onClick={() => handleDeleteSuratMasuk(record)}
                              />
                            ) : null}
                            <DetailButton
                              onClick={() =>
                                setSelectedDetail({
                                  kind: "surat-masuk",
                                  record,
                                })
                              }
                            />
                            {(() => {
                              const currentUserDisposition =
                                getCurrentDispositionForUser(
                                  record.disposisi_history,
                                  user?.id,
                                );

                              if (
                                !canRedisposeSuratMasuk ||
                                !currentUserDisposition?.can_redispose
                              ) {
                                return null;
                              }

                              return (
                              <DisposisiButton
                                isRedisposisi={
                                  getWorkflowActionLabel(
                                    currentUserDisposition,
                                    "Disposisi",
                                  ) === "Redisposisi"
                                }
                                onClick={() =>
                                  handleOpenDisposisiSidebar(record.id)
                                }
                              />
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState />
              )
            ) : null}

            {activeKind === "surat-keluar" ? (
              isLoadingSuratKeluar ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Send className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    Memuat surat keluar
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Data laporan surat keluar sedang diambil dari server.
                  </p>
                </div>
              ) : filteredSuratKeluar.length > 0 ? (
                <table className={REPORT_TABLE_CLASS}>
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className={REPORT_NUMBER_HEADER_CELL_CLASS}>
                        No
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama Penerima
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Alamat Penerima
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Nama / Nomor Surat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tgl Pengiriman
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Sifat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Media
                      </th>
                      <th className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status
                      </th>
                      <th className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSuratKeluar.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`${SETUP_PAGE_TABLE_ROW_CLASS} cursor-pointer bg-white`}
                        onDoubleClick={() =>
                          setSelectedDetail({ kind: "surat-keluar", record })
                        }
                      >
                        <td className={REPORT_NUMBER_CELL_CLASS}>{index + 1}</td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.penerima}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <p className="text-sm text-gray-600">
                            {record.alamatPenerima}
                          </p>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.namaSurat}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDisplayDate(record.tanggalKirim)}
                          </span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.sifat}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.media}</span>
                        </td>
                        <td className={REPORT_STATUS_CELL_CLASS}>
                          <span className={getOutgoingStatusPillClass(record.statusLabel)}>
                            {record.statusLabel}
                          </span>
                        </td>
                        <td className={REPORT_ACTION_CELL_CLASS}>
                          <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                            {canDeleteSuratKeluar ? (
                              <DeleteButton
                                onClick={() => handleDeleteSuratKeluar(record)}
                              />
                            ) : null}
                            <DetailButton
                              onClick={() =>
                                setSelectedDetail({
                                  kind: "surat-keluar",
                                  record,
                                })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState />
              )
            ) : null}

            {activeKind === "memorandum" ? (
              isLoadingMemorandum ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FileText className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    Memuat memorandum
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Data memorandum sedang diambil dari server.
                  </p>
                </div>
              ) : filteredMemorandum.length > 0 ? (
                <table className={REPORT_TABLE_CLASS}>
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className={REPORT_NUMBER_HEADER_CELL_CLASS}>
                        No
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        No Memo
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Perihal
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Divisi Asal
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tujuan Awal
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Pembuat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Penerima
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Tanggal
                      </th>
                      <th className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Tenggat Waktu
                      </th>
                      <th className={REPORT_STATUS_HEADER_CELL_CLASS}>
                        Status Tenggat
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Keterangan Memo
                      </th>
                      <th className={REPORT_TABLE_HEADER_CELL_CLASS}>
                        Catatan Redisposisi
                      </th>
                      <th className={REPORT_ACTION_HEADER_CELL_CLASS}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMemorandum.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`${SETUP_PAGE_TABLE_ROW_CLASS} cursor-pointer bg-white`}
                        onDoubleClick={() =>
                          setSelectedDetail({ kind: "memorandum", record })
                        }
                      >
                        <td className={REPORT_NUMBER_CELL_CLASS}>{index + 1}</td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_STRONG_CLASS} tabular-nums`}>
                            {record.noMemo}
                          </span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.perihal}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>{record.divisiAsal}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_CLASS}>
                            {formatJoinedNames(record.divisiTujuanAwal)}
                          </span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={TABLE_TEXT_STRONG_CLASS}>{record.pembuatMemo}</span>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <p className="text-sm text-gray-700">
                            {formatJoinedNames(record.penerima)}
                          </p>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <span className={`${TABLE_TEXT_MUTED_CLASS} whitespace-nowrap`}>
                            {formatDisplayDate(record.tanggal)}
                          </span>
                        </td>
                        <td className={REPORT_STATUS_CELL_CLASS}>
                          {record.tenggatWaktu ? (
                            <span className={`${TABLE_TEXT_CLASS} text-center whitespace-nowrap`}>
                              {formatTenggatDate(record.tenggatWaktu)}
                            </span>
                          ) : (
                            <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>
                          )}
                        </td>
                        <td className={REPORT_STATUS_CELL_CLASS}>
                          {(() => {
                            const status = getTenggatStatus(
                              record.tenggatWaktu,
                              today,
                            );
                            if (status.variant === "none") {
                              return <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>;
                            }
                            return (
                              <span className={getTenggatStatusPillClass(status.variant)}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          <p className="text-sm text-gray-600">
                            {record.keterangan}
                          </p>
                        </td>
                        <td className={REPORT_TABLE_CELL_CLASS}>
                          {record.keteranganTenggat ? (
                            <p className="text-sm text-gray-600">
                              {record.keteranganTenggat}
                            </p>
                          ) : (
                            <span className={TABLE_EMPTY_TEXT_CLASS}>—</span>
                          )}
                        </td>
                        <td className={REPORT_ACTION_CELL_CLASS}>
                          <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                            {canDeleteMemorandum ? (
                              <DeleteButton
                                onClick={() => handleDeleteMemorandum(record)}
                              />
                            ) : null}
                            <DetailButton
                              onClick={() =>
                                setSelectedDetail({
                                  kind: "memorandum",
                                  record,
                                })
                              }
                            />
                            {(() => {
                              const currentUserDisposition =
                                getCurrentDispositionForUser(
                                  record.disposisi_history,
                                  user?.id,
                                );

                              if (
                                !canRedisposeMemorandum ||
                                !currentUserDisposition?.can_redispose
                              ) {
                                return null;
                              }

                              return (
                                <DisposisiButton
                                  onClick={() =>
                                    handleOpenMemorandumDisposisi(record.id)
                                  }
                                  isRedisposisi={
                                    getWorkflowActionLabel(
                                      currentUserDisposition,
                                      "Disposisi",
                                    ) === "Redisposisi"
                                  }
                                />
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState />
              )
            ) : null}
          </ReportSectionShell>
        )}
      </div>
      <DetailModal
        isOpen={selectedDetail !== null}
        onClose={() => setSelectedDetail(null)}
        title={
          selectedDetail?.kind === "surat-masuk"
            ? "Detail Surat Masuk"
            : selectedDetail?.kind === "surat-keluar"
              ? "Detail Surat Keluar"
              : "Detail Memorandum"
        }
      >
        {selectedDetail?.kind === "surat-masuk" ? (
          (() => {
            const currentUserDisposition = getCurrentDispositionForUser(
              selectedDetail.record.disposisi_history,
              user?.id,
            );

            return (
              <div className="space-y-6">
                <DetailSection title="Informasi Surat">
                  <DetailRow
                    label="Nama Pengirim"
                    value={selectedDetail.record.pengirim}
                  />
                  <DetailRow
                    label="Alamat Pengirim"
                    value={selectedDetail.record.alamatPengirim}
                  />
                  <DetailRow
                    label="Nama / Nomor Surat"
                    value={selectedDetail.record.namaSurat}
                  />
                  <DetailRow
                    label="Perihal"
                    value={selectedDetail.record.perihal}
                  />
                  <DetailRow
                    label="Tanggal Penerimaan"
                    value={formatDisplayDate(selectedDetail.record.tanggalTerima)}
                  />
                  <DetailRow label="Sifat" value={selectedDetail.record.sifat} />
                  <DetailRow
                    label="Divisi Tujuan Awal"
                    value={formatJoinedNames(
                      selectedDetail.record.targetDivisionNames ?? [],
                    )}
                  />
                  <DetailRow
                    label="Disposisi Aktif"
                    value={
                      selectedDetail.record.current_holder_names.length > 0
                        ? selectedDetail.record.current_holder_names.join(", ")
                        : "-"
                    }
                  />
                  <DetailRow
                    label="Tenggat Waktu"
                    value={formatDetailTenggatValue(
                      selectedDetail.record.tenggatWaktu,
                    )}
                  />
                  <DetailRow
                    label="Status Surat"
                    value={
                      selectedDetail.record.statusLabel ??
                      formatSuratMasukStatus(selectedDetail.record.status)
                    }
                  />
                  <DetailRow
                    label="Status Tenggat"
                    value={formatDetailTenggatStatus(
                      selectedDetail.record.tenggatWaktu,
                      today,
                    )}
                  />
                  <DetailRow
                    label="Keterangan Surat"
                    value={selectedDetail.record.keterangan ?? "-"}
                  />
                  <DetailRow
                    label="Catatan Disposisi"
                    value={selectedDetail.record.keteranganTenggat ?? "-"}
                  />
                </DetailSection>

                <DetailSection title="Ringkasan Workflow">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <WorkflowStatCard
                      label="Status Dokumen"
                      value={
                        selectedDetail.record.statusLabel ??
                        formatSuratMasukStatus(selectedDetail.record.status)
                      }
                      icon={CircleDot}
                    />
                    <WorkflowStatCard
                      label="Pemegang Saat Ini"
                      value={
                        selectedDetail.record.current_holder_names.length > 0
                          ? selectedDetail.record.current_holder_names.join(", ")
                          : "Tidak ada"
                      }
                      icon={Users}
                    />
                    <WorkflowStatCard
                      label="Holder Terakhir"
                      value={selectedDetail.record.last_holder_name ?? "Belum ada"}
                      icon={ChevronRight}
                    />
                    <WorkflowStatCard
                      label="Disposisi Aktif"
                      value={String(selectedDetail.record.active_dispositions_count)}
                      icon={CalendarDays}
                    />
                  </div>
                </DetailSection>

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
                  onRedispose={() =>
                    handleOpenDisposisiSidebar(selectedDetail.record.id)
                  }
                  isBusy={isUpdatingDispositionStatus}
                  canRedispose={canRedisposeSuratMasuk}
                  redispositionLabel={getWorkflowActionLabel(
                    currentUserDisposition,
                    "Disposisi",
                  )}
                />

                <WorkflowTimelineSection
                  title="Timeline Disposisi"
                  dispositions={selectedDetail.record.disposisi_history}
                />

                <DocumentSection
                  fileName={selectedDetail.record.fileName}
                  hasFile={isValidFileUrl(selectedDetail.record.fileUrl)}
                  onPreview={() =>
                    handlePreviewDocument(
                      selectedDetail.record.fileUrl,
                      selectedDetail.record.fileName,
                    )
                  }
                />
              </div>
            );
          })()
        ) : null}

        {selectedDetail?.kind === "surat-keluar" ? (
          <div className="space-y-6">
            <DetailSection title="Informasi Surat">
              <DetailRow
                label="Nama Penerima"
                value={selectedDetail.record.penerima}
              />
              <DetailRow
                label="Alamat Penerima"
                value={selectedDetail.record.alamatPenerima}
              />
              <DetailRow
                label="Nama / Nomor Surat"
                value={selectedDetail.record.namaSurat}
              />
              <DetailRow
                label="Tanggal Pengiriman"
                value={formatDisplayDate(selectedDetail.record.tanggalKirim)}
              />
              <DetailRow label="Media" value={selectedDetail.record.media} />
              <DetailRow label="Sifat" value={selectedDetail.record.sifat} />
              <DetailRow
                label="Status"
                value={selectedDetail.record.statusLabel}
              />
            </DetailSection>

            <DocumentSection
              fileName={selectedDetail.record.fileName}
              hasFile={isValidFileUrl(selectedDetail.record.fileUrl)}
              onPreview={() =>
                handlePreviewDocument(
                  selectedDetail.record.fileUrl,
                  selectedDetail.record.fileName,
                )
              }
            />
          </div>
        ) : null}

        {selectedDetail?.kind === "memorandum" ? (
          (() => {
            const currentUserDisposition = getCurrentDispositionForUser(
              selectedDetail.record.disposisi_history,
              user?.id,
            );

            return (
              <div className="space-y-6">
                <DetailSection title="Informasi Memorandum">
                  <DetailRow label="No Memo" value={selectedDetail.record.noMemo} />
                  <DetailRow
                    label="Perihal"
                    value={selectedDetail.record.perihal}
                  />
                  <DetailRow
                    label="Divisi Asal"
                    value={selectedDetail.record.divisiAsal}
                  />
                  <DetailRow
                    label="Tujuan Awal"
                    value={formatJoinedNames(selectedDetail.record.divisiTujuanAwal)}
                  />
                  <DetailRow
                    label="Pembuat"
                    value={selectedDetail.record.pembuatMemo}
                  />
                  <DetailRow
                    label="Penerima Aktif"
                    value={
                      selectedDetail.record.current_holder_names.length > 0
                        ? selectedDetail.record.current_holder_names.join(", ")
                        : formatJoinedNames(selectedDetail.record.penerima)
                    }
                  />
                  <DetailRow
                    label="Tanggal"
                    value={formatDisplayDate(selectedDetail.record.tanggal)}
                  />
                  <DetailRow
                    label="Tenggat Waktu"
                    value={formatDetailTenggatValue(
                      selectedDetail.record.tenggatWaktu,
                    )}
                  />
                  <DetailRow
                    label="Status Workflow"
                    value={selectedDetail.record.statusLabel ?? "Baru"}
                  />
                  <DetailRow
                    label="Status Tenggat"
                    value={formatDetailTenggatStatus(
                      selectedDetail.record.tenggatWaktu,
                      today,
                    )}
                  />
                  <DetailRow
                    label="Keterangan Memo"
                    value={selectedDetail.record.keterangan}
                  />
                  <DetailRow
                    label="Catatan Redisposisi"
                    value={selectedDetail.record.keteranganTenggat ?? "-"}
                  />
                </DetailSection>

                <DetailSection title="Ringkasan Workflow">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <WorkflowStatCard
                      label="Status Dokumen"
                      value={selectedDetail.record.statusLabel ?? "Baru"}
                      icon={CircleDot}
                    />
                    <WorkflowStatCard
                      label="Pemegang Saat Ini"
                      value={
                        selectedDetail.record.current_holder_names.length > 0
                          ? selectedDetail.record.current_holder_names.join(", ")
                          : "Tidak ada"
                      }
                      icon={Users}
                    />
                    <WorkflowStatCard
                      label="Holder Terakhir"
                      value={selectedDetail.record.last_holder_name ?? "Belum ada"}
                      icon={ChevronRight}
                    />
                    <WorkflowStatCard
                      label="Disposisi Aktif"
                      value={String(selectedDetail.record.active_dispositions_count)}
                      icon={CalendarDays}
                    />
                  </div>
                </DetailSection>

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
                  onRedispose={() =>
                    handleOpenMemorandumDisposisi(selectedDetail.record.id)
                  }
                  isBusy={isUpdatingDispositionStatus}
                  canRedispose={canRedisposeMemorandum}
                  redispositionLabel={getWorkflowActionLabel(
                    currentUserDisposition,
                    "Disposisi",
                  )}
                />

                <WorkflowTimelineSection
                  title="Timeline Redisposisi"
                  dispositions={selectedDetail.record.disposisi_history}
                />

                <DocumentSection
                  fileName={selectedDetail.record.fileName}
                  hasFile={isValidFileUrl(selectedDetail.record.fileUrl)}
                  onPreview={() =>
                    handlePreviewDocument(
                      selectedDetail.record.fileUrl,
                      selectedDetail.record.fileName,
                    )
                  }
                />
              </div>
            );
          })()
        ) : null}
      </DetailModal>

      <SuratMasukDisposisiModal
        surat={activeDisposisiSurat}
        isOpen={activeDisposisiSurat !== null}
        users={suratDisposisiUsers}
        selectedUserId={selectedDisposisiUserId}
        userSearch={disposisiUserSearch}
        catatan={disposisiCatatan}
        isSubmitting={isDisposisiSubmitting}
        onChangeSelectedUser={setSelectedDisposisiUserId}
        onChangeUserSearch={setDisposisiUserSearch}
        onChangeCatatan={setDisposisiCatatan}
        onClose={handleCloseDisposisiSidebar}
        onSubmit={handleSubmitDisposisi}
      />
      <MemorandumDisposisiModal
        memorandum={activeDisposisiMemorandum}
        isOpen={activeDisposisiMemorandum !== null}
        users={memorandumDisposisiUsers}
        selectedUserId={selectedMemorandumDisposisiUserId}
        userSearch={memorandumDisposisiUserSearch}
        dueDate={memorandumDisposisiDueDate}
        catatan={memorandumDisposisiCatatan}
        isSubmitting={isMemorandumDisposisiSubmitting}
        onChangeSelectedUser={setSelectedMemorandumDisposisiUserId}
        onChangeUserSearch={setMemorandumDisposisiUserSearch}
        onChangeDueDate={setMemorandumDisposisiDueDate}
        onChangeCatatan={setMemorandumDisposisiCatatan}
        onClose={handleCloseMemorandumDisposisi}
        onSubmit={handleSubmitMemorandumDisposisi}
      />
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
