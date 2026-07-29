"use client";

import {
  Activity,
  Archive,
  Bell,
  CheckCircle2,
  Download,
  Eye,
  FileClock,
  FileText,
  FolderCog,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCard,
  SetupTablePrimaryText,
  SetupTableSecondaryText,
} from "@/components/ui/SetupDataTable";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_GROUP_CLASS,
} from "@/components/ui/setupPageStyles";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils/date";
import { activityCentreService } from "@/services/activity-centre.service";
import type { PaginationMeta } from "@/types/api.types";
import type {
  ActivityCentreDetail,
  ActivityCentreLog,
  ActivityCentreOptions,
  ActivityCentreQuery,
  ActivityCentreSummary,
} from "@/types/activity-centre.types";

type PeriodMode = "day" | "month" | "year";

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: SETUP_TABLE_PAGE_SIZE,
  lastPage: 1,
};

const EMPTY_SUMMARY: ActivityCentreSummary = {
  total: 0,
  modules: [],
  actions: [],
};

const EMPTY_OPTIONS: ActivityCentreOptions = {
  modules: [],
  actions: [],
  sources: [],
  entity_types: [],
  actors: [],
};

const FIELD_LABEL_CLASS =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500";

const MODULE_META: Record<
  string,
  { icon: LucideIcon; tone: SetupStatusTone; iconClass: string }
> = {
  AUTH: { icon: KeyRound, tone: "slate", iconClass: "text-slate-700" },
  ARSIP_DIGITAL: { icon: Archive, tone: "blue", iconClass: "text-blue-700" },
  PERSURATAN: { icon: Mail, tone: "violet", iconClass: "text-violet-700" },
  INFORMASI_DEBITUR: { icon: Users, tone: "emerald", iconClass: "text-emerald-700" },
  MANAJEMEN_LEGAL: { icon: ShieldCheck, tone: "amber", iconClass: "text-amber-700" },
  PARAMETER: { icon: FolderCog, tone: "sky", iconClass: "text-sky-700" },
  USER_DAN_AKSES: { icon: UserCog, tone: "slate", iconClass: "text-slate-700" },
  NOTIFIKASI: { icon: Bell, tone: "violet", iconClass: "text-violet-700" },
  SISTEM: { icon: Activity, tone: "gray", iconClass: "text-gray-700" },
};

const ACTION_META: Record<
  string,
  { icon: LucideIcon; tone: SetupStatusTone }
> = {
  LOGIN: { icon: LogIn, tone: "emerald" },
  LOGOUT: { icon: LogOut, tone: "slate" },
  CHANGE_PASSWORD: { icon: KeyRound, tone: "violet" },
  CREATE: { icon: Plus, tone: "emerald" },
  CREATED: { icon: Plus, tone: "emerald" },
  UPDATE: { icon: Pencil, tone: "blue" },
  UPDATED: { icon: Pencil, tone: "blue" },
  DELETE: { icon: Trash2, tone: "red" },
  DELETED: { icon: Trash2, tone: "red" },
  APPROVE: { icon: CheckCircle2, tone: "emerald" },
  REJECT: { icon: XCircle, tone: "red" },
  REVOKE: { icon: XCircle, tone: "red" },
  HANDOVER: { icon: FileText, tone: "blue" },
  RETURN: { icon: RotateCcw, tone: "violet" },
  COMPLETE: { icon: CheckCircle2, tone: "emerald" },
  REDISPOSE: { icon: RefreshCw, tone: "violet" },
  IMPORT: { icon: Upload, tone: "blue" },
  UPLOAD: { icon: Upload, tone: "blue" },
  RETRY: { icon: RefreshCw, tone: "amber" },
  RESTORE: { icon: RotateCcw, tone: "emerald" },
  ACTIVATE: { icon: CheckCircle2, tone: "emerald" },
  DEACTIVATE: { icon: XCircle, tone: "red" },
  EXPORT: { icon: Download, tone: "emerald" },
  VIEW_FILE: { icon: Eye, tone: "sky" },
  ACCESS_REQUESTED: { icon: FileClock, tone: "amber" },
  ACCESS_APPROVED: { icon: CheckCircle2, tone: "emerald" },
  ACCESS_REJECTED: { icon: XCircle, tone: "red" },
  ACCESS_REVOKED: { icon: XCircle, tone: "red" },
  LOAN_REQUESTED: { icon: FileClock, tone: "amber" },
  LOAN_APPROVED: { icon: CheckCircle2, tone: "emerald" },
  LOAN_REJECTED: { icon: XCircle, tone: "red" },
  LOAN_HANDED_OVER: { icon: FileText, tone: "blue" },
  LOAN_RETURNED: { icon: RotateCcw, tone: "violet" },
  STORAGE_MOVED: { icon: Archive, tone: "blue" },
  BULK_UPDATE_COLLATERAL_EXPIRY: { icon: Upload, tone: "blue" },
  UPDATE_COLLATERAL_EXPIRY: { icon: Pencil, tone: "blue" },
  UPLOAD_DOCUMENT: { icon: Upload, tone: "blue" },
  UPLOAD_WARNING_LETTER: { icon: Upload, tone: "blue" },
  UPDATE_WARNING_LETTER: { icon: Pencil, tone: "blue" },
  DELETE_WARNING_LETTER: { icon: Trash2, tone: "red" },
  RESOLVE_IDEB: { icon: CheckCircle2, tone: "emerald" },
  UPLOAD_IDEB: { icon: Upload, tone: "blue" },
  IMPORT_QUEUED: { icon: FileClock, tone: "amber" },
  IMPORT_PROCESSING: { icon: RefreshCw, tone: "blue" },
  IMPORT_COMPLETED: { icon: CheckCircle2, tone: "emerald" },
  IMPORT_COMPLETED_WITH_ERRORS: { icon: FileClock, tone: "amber" },
  IMPORT_FAILED: { icon: XCircle, tone: "red" },
  IMPORT_RETRY: { icon: RefreshCw, tone: "amber" },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDayValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function buildPeriodRange(mode: PeriodMode, day: string, month: string, year: string) {
  let start: Date;
  let end: Date;

  if (mode === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    const selectedYear = Number(match?.[1] ?? new Date().getFullYear());
    const selectedMonth = Number(match?.[2] ?? new Date().getMonth() + 1) - 1;
    start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
    end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
  } else if (mode === "year") {
    const selectedYear = Number(year) || new Date().getFullYear();
    start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    const now = new Date();
    const selectedYear = Number(match?.[1] ?? now.getFullYear());
    const selectedMonth = Number(match?.[2] ?? now.getMonth() + 1) - 1;
    const selectedDay = Number(match?.[3] ?? now.getDate());
    start = new Date(selectedYear, selectedMonth, selectedDay, 0, 0, 0, 0);
    end = new Date(selectedYear, selectedMonth, selectedDay, 23, 59, 59, 999);
  }

  return { date_from: start.toISOString(), date_to: end.toISOString() };
}

function humanize(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceLabel(value: string) {
  const labels: Record<string, string> = {
    API: "Aplikasi",
    MANUAL: "Input Manual",
    IMPORT: "Import",
    SLIK_IMPORT: "Import SLIK",
    IDEB_IMPORT: "Import IDEB",
    SYSTEM: "Sistem",
  };
  return labels[value] ?? humanize(value);
}

function actionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Activity, tone: "gray" as SetupStatusTone };
}

function moduleMeta(module: string) {
  return (
    MODULE_META[module] ?? {
      icon: Activity,
      tone: "gray" as SetupStatusTone,
      iconClass: "text-gray-700",
    }
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MetricCell({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 bg-white px-4 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Icon className={`size-5 ${iconClass}`} aria-hidden="true" strokeWidth={1.7} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
          {new Intl.NumberFormat("id-ID").format(value)}
        </p>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 last:border-b-0 sm:grid-cols-[132px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </dt>
      <dd
        className={`break-words text-sm font-semibold leading-5 text-gray-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ActivityDetailModal({
  selected,
  detail,
  errorMessage,
  isLoading,
  onClose,
}: {
  selected: ActivityCentreLog | null;
  detail: ActivityCentreDetail | null;
  errorMessage: string | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  const item = detail ?? selected;
  const itemAction = item ? actionMeta(item.action) : actionMeta("ACTIVITY");
  const ModuleIcon = item ? moduleMeta(item.module).icon : Activity;
  const actorName =
    item?.actor?.name || item?.actor?.username || "Aktivitas Sistem";

  return (
    <DashboardModal
      isOpen={selected !== null}
      title={
        item
          ? `Detail Aktivitas - ${item.action_label}`
          : "Detail Aktivitas"
      }
      description="Detail ditampilkan sesuai konteks aman yang benar-benar tercatat pada aktivitas."
      onClose={onClose}
      maxWidth="4xl"
      bodyClassName="space-y-5 p-4 sm:p-5"
      footer={
        <>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={onClose}
          >
            Tutup
          </button>
          {detail?.context.target_path ? (
            <ProtectedLink
              href={detail.context.target_path}
              className="uiverse-modal-button uiverse-modal-button--primary"
              onClick={onClose}
            >
              {detail.context.target_label || "Buka Modul Terkait"}
            </ProtectedLink>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="status"
          aria-label="Memuat detail aktivitas"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-lg border border-gray-100 bg-gray-100"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </div>
      ) : detail ? (
        <>
          <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <ModuleIcon
                  className="size-5 text-slate-600"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">
                  {detail.title || `${detail.action_label} ${detail.module_label}`}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDateTime(detail.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SetupStatusBadge
                status={detail.action_label}
                label={detail.action_label}
                tone={itemAction.tone}
                icon={itemAction.icon}
              />
              <SetupStatusBadge
                status={detail.result_label}
                label={detail.result_label}
                tone={detail.result_tone}
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900">
              Informasi Aktivitas
            </h3>
            <dl className="mt-2 grid gap-x-6 rounded-lg border border-gray-200 bg-white px-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Pelaku" value={actorName} />
              <DetailField
                label="Username"
                value={detail.actor?.username ? `@${detail.actor.username}` : "-"}
              />
              <DetailField
                label="Peran"
                value={detail.actor?.role?.name || "-"}
              />
              <DetailField
                label="Divisi"
                value={detail.actor?.division?.name || "-"}
              />
              <DetailField label="Modul" value={detail.module_label} />
              <DetailField label="Sumber" value={detail.source_label} />
              <DetailField label="Jenis Data" value={detail.entity_label} />
              <DetailField
                label="Status Respons"
                value={
                  detail.response_status
                    ? `${detail.result_label} (${detail.response_status})`
                    : detail.result_label
                }
              />
              <DetailField label="ID Aktivitas" value={detail.id} mono />
            </dl>
          </section>

          {detail.summary &&
          detail.summary !== detail.title ? (
            <section className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
                Ringkasan
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-700">
                {detail.summary}
              </p>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-bold text-gray-900">
              {detail.context.title}
            </h3>
            {detail.context.fields.length > 0 ? (
              <dl className="mt-2 grid gap-x-6 rounded-lg border border-gray-200 bg-white px-4 sm:grid-cols-2">
                {detail.context.fields.map((field, index) => (
                  <DetailField
                    key={`${field.key}-${field.label}-${index}`}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </dl>
            ) : null}

            {detail.context.changed_fields.length > 0 ? (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                  Field yang Berubah
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.context.changed_fields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {detail.context.empty_message ? (
              <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {detail.context.empty_message}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </DashboardModal>
  );
}

export default function ActivityCentreClient() {
  const { showToast } = useAppToast();
  const now = useMemo(() => new Date(), []);
  const [items, setItems] = useState<ActivityCentreLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [summary, setSummary] = useState<ActivityCentreSummary>(EMPTY_SUMMARY);
  const [options, setOptions] = useState<ActivityCentreOptions>(EMPTY_OPTIONS);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day");
  const [day, setDay] = useState(localDayValue(now));
  const [month, setMonth] = useState(localMonthValue(now));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ActivityCentreLog | null>(
    null,
  );
  const [detail, setDetail] = useState<ActivityCentreDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const detailRequestIdRef = useRef(0);

  const periodRange = useMemo(
    () => buildPeriodRange(periodMode, day, month, year),
    [day, month, periodMode, year],
  );

  const baseQuery = useMemo<ActivityCentreQuery>(
    () => ({
      search: deferredSearch.trim() || undefined,
      module: module || undefined,
      action: action || undefined,
      actor_id: actorId || undefined,
      source: source || undefined,
      sort,
      ...periodRange,
    }),
    [action, actorId, deferredSearch, module, periodRange, sort, source],
  );

  useEffect(() => {
    let cancelled = false;
    activityCentreService
      .getOptions()
      .then((result) => {
        if (!cancelled) setOptions(result);
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : "Gagal memuat pilihan filter aktivitas.", "error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const [pageResult, summaryResult] = await Promise.all([
          activityCentreService.getPage({
            ...baseQuery,
            page,
            limit: SETUP_TABLE_PAGE_SIZE,
          }),
          activityCentreService.getSummary(baseQuery),
        ]);
        if (cancelled) return;
        setItems(pageResult.items);
        setMeta(pageResult.meta);
        setSummary(summaryResult);
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setMeta(EMPTY_META);
          setSummary(EMPTY_SUMMARY);
          showToast(error instanceof Error ? error.message : "Gagal memuat Pusat Log Aktivitas.", "error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [baseQuery, page, showToast]);

  const setFilter = useCallback((setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const result = await activityCentreService.exportExcel(baseQuery);
      downloadBlob(result.blob, result.fileName);
      showToast("Log aktivitas berhasil diexport.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal export log aktivitas.", "error");
    } finally {
      setIsExporting(false);
    }
  }, [baseQuery, showToast]);

  const openDetail = useCallback(
    async (item: ActivityCentreLog) => {
      const requestId = detailRequestIdRef.current + 1;
      detailRequestIdRef.current = requestId;
      setSelectedItem(item);
      setDetail(null);
      setDetailError(null);
      setIsDetailLoading(true);

      try {
        const result = await activityCentreService.getById(item.id);
        if (detailRequestIdRef.current !== requestId) return;
        setDetail(result);
      } catch (error) {
        if (detailRequestIdRef.current !== requestId) return;
        const message =
          error instanceof Error
            ? error.message
            : "Gagal memuat detail aktivitas.";
        setDetailError(message);
        showToast(message, "error");
      } finally {
        if (detailRequestIdRef.current === requestId) {
          setIsDetailLoading(false);
        }
      }
    },
    [showToast],
  );

  const closeDetail = useCallback(() => {
    detailRequestIdRef.current += 1;
    setSelectedItem(null);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }, []);

  const resetFilters = () => {
    const current = new Date();
    setPage(1);
    setSearch("");
    setModule("");
    setAction("");
    setActorId("");
    setSource("");
    setSort("newest");
    setPeriodMode("day");
    setDay(localDayValue(current));
    setMonth(localMonthValue(current));
    setYear(String(current.getFullYear()));
  };

  const topModules = [...summary.modules]
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "id"))
    .slice(0, 4);

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Pusat Log Aktivitas"
        subtitle="Ringkasan aktivitas lintas modul berdasarkan tanggal, user, dan aksi. Buka detail untuk melihat konteks aman sesuai fungsi."
        icon={<Activity className="size-7" aria-hidden="true" />}
        actions={
          <SetupExcelButton loading={isExporting} onClick={() => void handleExport()} />
        }
      />

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,2.2fr)]">
          <div className="border-b border-gray-100 p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Ringkasan Periode</p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-gray-900">
              {new Intl.NumberFormat("id-ID").format(summary.total)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Aktivitas sesuai filter aktif</p>
          </div>
          {topModules.length > 0 ? (
            <div className="grid gap-px bg-gray-100 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              {topModules.map((item) => {
                const metaItem = moduleMeta(item.value);
                return (
                  <MetricCell
                    key={item.value}
                    label={item.label}
                    value={item.total}
                    icon={metaItem.icon}
                    iconClass={metaItem.iconClass}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-28 items-center px-5 py-4 text-sm text-gray-500">
              Belum ada aktivitas pada periode dan filter ini.
            </div>
          )}
        </div>
      </section>

      <section className={`${SETUP_PAGE_SEARCH_CARD_CLASS} space-y-4`}>
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className={FIELD_LABEL_CLASS}>Cakupan Waktu</p>
            <div className={`${SETUP_PAGE_SEGMENTED_GROUP_CLASS} w-fit`}>
              {([
                ["day", "Hari"],
                ["month", "Bulan"],
                ["year", "Tahun"],
              ] as Array<[PeriodMode, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} ${
                    periodMode === value
                      ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
                      : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
                  }`}
                  onClick={() => {
                    setPage(1);
                    setPeriodMode(value);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full xl:max-w-xs">
            <label className={FIELD_LABEL_CLASS} htmlFor="activity-period-value">
              Periode
            </label>
            {periodMode === "day" ? (
              <SetupTextInput
                id="activity-period-value"
                type="date"
                value={day}
                onChange={(event) => setFilter(setDay, event.target.value)}
              />
            ) : periodMode === "month" ? (
              <SetupTextInput
                id="activity-period-value"
                type="month"
                value={month}
                onChange={(event) => setFilter(setMonth, event.target.value)}
              />
            ) : (
              <SetupTextInput
                id="activity-period-value"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setFilter(setYear, event.target.value)}
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(300px,1.5fr)_repeat(2,minmax(180px,0.75fr))]">
          <SetupSearchInput
            id="activity-center-search"
            label="Cari Aktivitas"
            value={search}
            placeholder="Cari user, modul, atau aksi..."
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="activity-module">Modul</label>
            <SetupSelect id="activity-module" value={module} onChange={(event) => setFilter(setModule, event.target.value)}>
              <option value="">Semua Modul</option>
              {options.modules.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SetupSelect>
          </div>
          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="activity-action">Aktivitas</label>
            <SetupSelect id="activity-action" value={action} onChange={(event) => setFilter(setAction, event.target.value)}>
              <option value="">Semua Aktivitas</option>
              {options.actions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SetupSelect>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(180px,1fr))_auto] xl:items-end">
          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="activity-actor">User</label>
            <SetupSelect id="activity-actor" value={actorId} onChange={(event) => setFilter(setActorId, event.target.value)}>
              <option value="">Semua User</option>
              {options.actors.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.username ? ` (@${option.username})` : ""}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="activity-source">Sumber</label>
            <SetupSelect id="activity-source" value={source} onChange={(event) => setFilter(setSource, event.target.value)}>
              <option value="">Semua Sumber</option>
              {options.sources.map((option) => <option key={option.value} value={option.value}>{sourceLabel(option.value)}</option>)}
            </SetupSelect>
          </div>
          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="activity-sort">Urutan</label>
            <SetupSelect id="activity-sort" value={sort} onChange={(event) => {
              setPage(1);
              setSort(event.target.value as "newest" | "oldest");
            }}>
              <option value="newest">Terbaru ke Terlama</option>
              <option value="oldest">Terlama ke Terbaru</option>
            </SetupSelect>
          </div>
          <button type="button" className="uiverse-modal-button uiverse-modal-button--neutral" onClick={resetFilters}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </section>

      <SetupTableCard variant="report">
        <SetupDataTable variant="report" density="compact" className="min-w-[940px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal &amp; Waktu</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>User</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Modul</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aktivitas</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => {
              const itemAction = actionMeta(item.action);
              const ModuleIcon = moduleMeta(item.module).icon;
              return (
                <SetupDataTableRow
                  key={item.id}
                  title="Klik dua kali untuk melihat detail aktivitas"
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`}
                  onDoubleClick={() => void openDetail(item)}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(meta.page - 1) * meta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="whitespace-nowrap">{formatDateTime(item.created_at)}</SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTablePrimaryText>{item.actor?.name || item.actor?.username || "Sistem"}</SetupTablePrimaryText>
                    <SetupTableSecondaryText>
                      {[item.actor?.username ? `@${item.actor.username}` : null, item.actor?.role?.name].filter(Boolean).join(" · ") || "Aktivitas otomatis"}
                    </SetupTableSecondaryText>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <span className="inline-flex items-center gap-2 font-semibold text-gray-800">
                      <ModuleIcon className="size-4 text-gray-500" aria-hidden="true" strokeWidth={1.7} />
                      {item.module_label}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge
                      status={item.action_label}
                      label={item.action_label}
                      tone={itemAction.tone}
                      icon={itemAction.icon}
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <div
                      className="flex items-center justify-center"
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <SetupActionMenu
                        label={`Buka aksi aktivitas ${item.action_label}`}
                        menuLabel={`Aksi aktivitas ${item.action_label}`}
                        items={[
                          {
                            key: "detail",
                            label: "Detail",
                            icon: Eye,
                            tone: "blue",
                            onClick: () => openDetail(item),
                          },
                        ]}
                      />
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              );
            })}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={6}
                state={isLoading ? "loading" : "empty"}
                description={isLoading ? "Data aktivitas sedang dimuat." : "Ubah periode atau filter untuk melihat aktivitas lain."}
                icon={FileClock}
                isFiltered={Boolean(search || module || action || actorId || source)}
              >
                {isLoading ? "Memuat log aktivitas..." : "Belum ada log aktivitas pada periode ini."}
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination
          page={meta.page}
          lastPage={meta.lastPage}
          total={meta.total}
          limit={meta.limit}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </SetupTableCard>

      <ActivityDetailModal
        selected={selectedItem}
        detail={detail}
        errorMessage={detailError}
        isLoading={isDetailLoading}
        onClose={closeDetail}
      />
    </DashboardPageShell>
  );
}
