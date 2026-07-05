"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCard,
  SetupTableCode,
  SetupTablePrimaryText,
  SetupTableSecondaryText,
  SetupTableScroll,
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Eye,
  FileText,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import ReportDocumentDetailModal from "@/components/arsip-digital/laporan/ReportDocumentDetailModal";
import BasicDateInput from "@/components/ui/BasicDateInput";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupCloseListButton from "@/components/ui/SetupCloseListButton";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_PANEL_HEADER_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS,
  SETUP_PAGE_SEGMENTED_GROUP_CLASS,
} from "@/components/ui/setupPageStyles";
import { DEFAULT_PAGINATION_META, OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { exportToExcel } from "@/lib/utils/exportExcel";
import {
  arsipService,
  type ArsipDigitalReportQuery,
  type ArsipDigitalReportSummary,
} from "@/services/arsip.service";
import type {
  ArsipUserSummary,
  Disposisi,
  Dokumen,
  LoanStatusKey,
  Peminjaman,
} from "@/types/arsip.types";
import type { PaginationMeta } from "@/types/api.types";

type ReportKind = "documents" | "dueDates" | "accessRequests" | "loans";
type DateFilterMode = "none" | "loan-start" | "loan-due";

type StatusOption = {
  label: string;
  value: string;
};

type ReportDefinition = {
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  searchPlaceholder: string;
  emptyText: string;
  statusLabel: string;
  statusOptions: StatusOption[];
  dateMode: DateFilterMode;
  dateLabel: string;
};

type ReportRowsState = {
  documents: Dokumen[];
  dueDates: Peminjaman[];
  accessRequests: Disposisi[];
  loans: Peminjaman[];
};

const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: OPERATIONAL_TABLE_PAGE_SIZE,
};

const ALL_STATUS_OPTION: StatusOption = { label: "Semua Status", value: "all" };

const REPORT_ORDER: ReportKind[] = [
  "documents",
  "dueDates",
  "accessRequests",
  "loans",
];

const REPORT_DEFINITIONS: Record<ReportKind, ReportDefinition> = {
  documents: {
    title: "Daftar Dokumen Arsip",
    shortTitle: "Dokumen",
    description: "Daftar dokumen aktif beserta jenis, PIC, lokasi, akses, dan keterkaitan debitur.",
    icon: FileText,
    searchPlaceholder: "Cari nomor, nama, jenis, lokasi, atau PIC...",
    emptyText: "Belum ada dokumen arsip pada scope laporan ini.",
    statusLabel: "Status Dokumen",
    statusOptions: [
      ALL_STATUS_OPTION,
      { label: "Tersedia", value: "AVAILABLE" },
      { label: "Diajukan", value: "REQUESTED" },
      { label: "Dalam Proses", value: "PROCESSING" },
      { label: "Dipinjam", value: "BORROWED" },
    ],
    dateMode: "none",
    dateLabel: "",
  },
  dueDates: {
    title: "Jatuh Tempo",
    shortTitle: "Jatuh Tempo",
    description: "Pinjaman fisik aktif yang perlu dipantau karena mendekati atau melewati jatuh tempo.",
    icon: CalendarClock,
    searchPlaceholder: "Cari dokumen, peminjam, atau lokasi...",
    emptyText: "Belum ada dokumen yang masuk pemantauan jatuh tempo.",
    statusLabel: "Status Jatuh Tempo",
    statusOptions: [
      ALL_STATUS_OPTION,
      { label: "Akan Jatuh Tempo", value: "UPCOMING" },
      { label: "Overdue", value: "OVERDUE" },
    ],
    dateMode: "loan-due",
    dateLabel: "Jatuh Tempo",
  },
  accessRequests: {
    title: "Akses & Disposisi",
    shortTitle: "Akses",
    description: "Riwayat dan antrean permintaan akses dokumen arsip digital.",
    icon: ShieldCheck,
    searchPlaceholder: "Cari dokumen, pemohon, owner, atau alasan...",
    emptyText: "Belum ada pengajuan akses dokumen pada scope laporan ini.",
    statusLabel: "Status Akses",
    statusOptions: [
      ALL_STATUS_OPTION,
      { label: "Menunggu Persetujuan", value: "PENDING" },
      { label: "Disetujui", value: "APPROVED" },
      { label: "Ditolak", value: "REJECTED" },
    ],
    dateMode: "none",
    dateLabel: "",
  },
  loans: {
    title: "Peminjaman Fisik",
    shortTitle: "Peminjaman",
    description: "Daftar peminjaman dan pengembalian fisik dokumen arsip.",
    icon: BookOpen,
    searchPlaceholder: "Cari dokumen, peminjam, atau penyetuju...",
    emptyText: "Belum ada data peminjaman fisik pada scope laporan ini.",
    statusLabel: "Status Peminjaman",
    statusOptions: [
      ALL_STATUS_OPTION,
      { label: "Menunggu Persetujuan", value: "PENDING" },
      { label: "Disetujui", value: "APPROVED" },
      { label: "Sudah Diserahkan", value: "HANDED_OVER" },
      { label: "Dipinjam", value: "BORROWED" },
      { label: "Terlambat", value: "OVERDUE" },
      { label: "Dikembalikan", value: "RETURNED" },
      { label: "Ditolak", value: "REJECTED" },
    ],
    dateMode: "loan-start",
    dateLabel: "Tanggal Pinjam",
  },
};

const EMPTY_ROWS: ReportRowsState = {
  documents: [],
  dueDates: [],
  accessRequests: [],
  loans: [],
};

const DOCUMENT_TABLE_COLUMNS = [
  "56px",
  "150px",
  null,
  "150px",
  "180px",
  "220px",
  "150px",
  "130px",
  "150px",
  "92px",
] as const;

const DUE_DATE_TABLE_COLUMNS = [
  "56px",
  null,
  "170px",
  "140px",
  "140px",
  "120px",
  "140px",
  "220px",
  "92px",
] as const;

const ACCESS_TABLE_COLUMNS = [
  "56px",
  null,
  "150px",
  "170px",
  "140px",
  "150px",
  "180px",
  "260px",
  "92px",
] as const;

const LOAN_TABLE_COLUMNS = [
  "56px",
  null,
  "150px",
  "140px",
  "130px",
  "130px",
  "140px",
  "140px",
  "170px",
  "92px",
] as const;

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("id-ID");
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getUserDisplayName(user?: ArsipUserSummary | null) {
  return user?.name || user?.username || "-";
}

function getDocumentOwner(doc?: Dokumen | null) {
  return getUserDisplayName(doc?.owner ?? doc?.creator);
}

function getDocumentOwnerDivision(doc?: Dokumen | null) {
  return doc?.ownerDivision?.name ?? doc?.owner?.division?.name ?? "-";
}

function getDocumentLocation(doc?: Dokumen | null) {
  return doc?.tempatPenyimpanan ?? doc?.storage?.locationLabel ?? "-";
}

function getDocumentDebtorLabel(doc: Dokumen) {
  if (!doc.debtor) return "-";
  return [doc.debtor.debtor_number, doc.debtor.name].filter(Boolean).join(" - ");
}

function getLoanStatusLabel(statusKey: LoanStatusKey, isOverdue: boolean) {
  switch (statusKey) {
    case "PENDING":
      return "Menunggu Persetujuan";
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "HANDED_OVER":
      return isOverdue ? "Terlambat" : "Sudah Diserahkan";
    case "BORROWED":
      return isOverdue ? "Terlambat" : "Dipinjam";
    case "RETURNED":
      return "Dikembalikan";
    case "OVERDUE":
      return "Terlambat";
    default:
      return "Menunggu Persetujuan";
  }
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getRemainingDays(value: string | null | undefined) {
  const dueDate = parseDate(value);
  if (!dueDate) return null;
  const diff = startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime();
  return Math.ceil(diff / 86_400_000);
}

function formatRemainingDays(value: string | null | undefined) {
  const days = getRemainingDays(value);
  if (days === null) return "-";
  if (days < 0) return `${Math.abs(days)} hari terlambat`;
  if (days === 0) return "Hari ini";
  return `${days} hari`;
}

function getDueDateStatusLabel(item: Peminjaman) {
  const days = getRemainingDays(item.tglKembali);
  if (item.isTerlambat || (days !== null && days < 0)) return "Overdue";
  if (days !== null && days <= 30) return "Jatuh Tempo";
  return "Aktif";
}

function normalizeDateRange(from: string, to: string) {
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

function formatFilenameDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}${month}${day}`;
}

function getReportScope(summary: ArsipDigitalReportSummary | null) {
  return summary?.operational_summary?.scope ?? summary?.scope ?? null;
}

function getScopeLabel(summary: ArsipDigitalReportSummary | null) {
  const scope = getReportScope(summary);
  if (!scope) return null;
  if (scope.can_report_all) return "Semua Data";
  return scope.division_name ?? "Data Saya";
}

function buildReportQuery({
  activeReport,
  search,
  status,
  dateFrom,
  dateTo,
}: {
  activeReport: ReportKind;
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}): ArsipDigitalReportQuery {
  const query: ArsipDigitalReportQuery = {};
  if (search) query.search = search;

  if (activeReport === "documents") {
    if (status !== "all") query.availability = status;
    return query;
  }

  if (activeReport === "dueDates") {
    if (status !== "all") query.due_status = status;
    if (dateFrom) query.due_date_from = dateFrom;
    if (dateTo) query.due_date_to = dateTo;
    return query;
  }

  if (activeReport === "accessRequests") {
    if (status !== "all") query.status = status;
    return query;
  }

  if (status !== "all") query.status = status;
  if (dateFrom) query.requested_start_date_from = dateFrom;
  if (dateTo) query.requested_start_date_to = dateTo;
  return query;
}

type SummaryRow = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type SummaryCardConfig = {
  kind: ReportKind;
  title: string;
  icon: LucideIcon;
  totalLabel: string;
  totalValue: number;
  ctaLabel: string;
  infoRows: SummaryRow[];
};

function getSummaryCards(
  summary: ArsipDigitalReportSummary | null,
  isLoading: boolean,
): SummaryCardConfig[] {
  const metrics = summary?.operational_summary?.metrics;
  const overview = summary?.overview;
  const documents = summary?.documents;
  const accessRequests = summary?.access_requests;
  const loans = summary?.loans;
  const workflow = summary?.workflow;
  const pendingAccess =
    metrics?.pending_access_requests ??
    overview?.pending_access_requests ??
    accessRequests?.pending ??
    0;
  const activeAccess =
    metrics?.active_access_requests ??
    overview?.active_access_requests ??
    accessRequests?.active ??
    accessRequests?.approved ??
    0;
  const expiredAccess =
    metrics?.expired_access_requests ??
    overview?.expired_access_requests ??
    accessRequests?.expired ??
    0;
  const rejectedAccess = accessRequests?.rejected ?? 0;
  const pendingLoans =
    metrics?.pending_loans ?? overview?.pending_loans ?? loans?.pending ?? 0;
  const activeLoans =
    metrics?.active_loans ??
    overview?.active_loans ??
    workflow?.loans.active ??
    (loans?.handed_over ?? 0) + (loans?.borrowed ?? 0);
  const borrowedLoans = loans?.borrowed ?? 0;
  const dueSoonLoans =
    metrics?.due_soon_loans ?? overview?.due_soon_loans ?? loans?.due_soon ?? 0;
  const overdueLoans =
    metrics?.overdue_loans ?? overview?.overdue_loans ?? loans?.overdue ?? 0;
  const dueOrOverdueLoans =
    metrics?.due_or_overdue_loans ??
    overview?.due_or_overdue_loans ??
    dueSoonLoans + overdueLoans;

  if (isLoading) {
    return REPORT_ORDER.map((kind) => {
      const definition = REPORT_DEFINITIONS[kind];
      return {
        kind,
        title: definition.shortTitle,
        icon: definition.icon,
        totalLabel: "TOTAL",
        totalValue: 0,
        ctaLabel: `Lihat ${definition.shortTitle}`,
        infoRows: [],
      };
    });
  }

  return [
    {
      kind: "documents",
      title: "Dokumen Arsip",
      icon: FileText,
      totalLabel: "TOTAL DOKUMEN",
      totalValue:
        metrics?.total_active_documents ??
        overview?.total_documents ??
        documents?.total ??
        0,
      ctaLabel: "Lihat Daftar Dokumen",
      infoRows: [
        {
          icon: LockKeyhole,
          label: "Restrict",
          value: formatNumber(
            metrics?.restricted_documents ??
              overview?.restricted_documents ??
              documents?.restricted ??
              0,
          ),
        },
        {
          icon: ClipboardList,
          label: "Non-restrict",
          value: formatNumber(
            metrics?.non_restricted_documents ??
              overview?.non_restricted_documents ??
              documents?.non_restricted ??
              0,
          ),
        },
        {
          icon: CircleDot,
          label: "Terkait Debitur",
          value: formatNumber(
            overview?.linked_to_debtor_documents ??
              documents?.linked_to_debtor ??
              0,
          ),
        },
      ],
    },
    {
      kind: "dueDates",
      title: "Jatuh Tempo",
      icon: CalendarClock,
      totalLabel: "TOTAL DOKUMEN",
      totalValue: dueOrOverdueLoans,
      ctaLabel: "Lihat Jatuh Tempo",
      infoRows: [
        {
          icon: CalendarDays,
          label: "Akan jatuh tempo",
          value: formatNumber(dueSoonLoans),
        },
        {
          icon: AlertTriangle,
          label: "Overdue",
          value: formatNumber(overdueLoans),
        },
        {
          icon: BookOpen,
          label: "Pinjaman aktif",
          value: formatNumber(activeLoans),
        },
      ],
    },
    {
      kind: "accessRequests",
      title: "Akses & Disposisi",
      icon: ShieldCheck,
      totalLabel: "TOTAL AKSES",
      totalValue: workflow?.access_requests.total ?? pendingAccess + activeAccess + rejectedAccess,
      ctaLabel: "Lihat Akses Dokumen",
      infoRows: [
        {
          icon: CircleDot,
          label: "Menunggu",
          value: formatNumber(pendingAccess),
        },
        {
          icon: ShieldCheck,
          label: "Akses aktif",
          value: formatNumber(activeAccess),
        },
        {
          icon: CalendarClock,
          label: "Expired / ditolak",
          value: `${formatNumber(expiredAccess)} / ${formatNumber(rejectedAccess)}`,
        },
      ],
    },
    {
      kind: "loans",
      title: "Peminjaman Fisik",
      icon: BookOpen,
      totalLabel: "TOTAL PINJAMAN",
      totalValue:
        workflow?.loans.total ??
        pendingLoans +
          (loans?.approved ?? 0) +
          (loans?.handed_over ?? 0) +
          borrowedLoans +
          (loans?.returned ?? 0) +
          (loans?.rejected ?? 0),
      ctaLabel: "Lihat Peminjaman",
      infoRows: [
        {
          icon: CircleDot,
          label: "Menunggu",
          value: formatNumber(pendingLoans),
        },
        {
          icon: BookOpen,
          label: "Dipinjam",
          value: formatNumber(borrowedLoans),
        },
        {
          icon: AlertTriangle,
          label: "Overdue / kembali",
          value: `${formatNumber(overdueLoans)} / ${formatNumber(loans?.returned ?? 0)}`,
        },
      ],
    },
  ];
}

function SummaryCards({
  cards,
  activeReport,
  onSelect,
}: {
  cards: SummaryCardConfig[];
  activeReport: ReportKind | null;
  onSelect: (value: ReportKind) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isActive = activeReport === card.kind;

        return (
          <button
            key={card.kind}
            type="button"
            onClick={() => onSelect(card.kind)}
            aria-pressed={isActive}
            className={joinClasses(
              "group rounded-lg border bg-white p-6 text-left shadow-sm transition-colors duration-150",
              isActive
                ? "border-blue-200 ring-2 ring-blue-100"
                : "border-gray-100 hover:border-blue-200",
            )}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="mb-6 flex items-start justify-between pl-2 pr-4">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-900 transition-colors [&_svg]:h-7 [&_svg]:w-7">
                  <Icon aria-hidden="true" strokeWidth={1.8} />
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
                  {formatNumber(card.totalValue)}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-gray-50">
              {card.infoRows.length > 0 ? (
                card.infoRows.map((row, rowIndex) => {
                  const RowIcon = row.icon;

                  return (
                    <div key={`${card.kind}-${row.label}`}>
                      {rowIndex > 0 ? (
                        <div className="h-px w-full bg-gray-200" />
                      ) : null}
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="flex min-w-0 items-center gap-3 text-gray-600">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-500">
                            <RowIcon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 leading-5">
                            {row.label}
                          </span>
                        </span>
                        <span className="min-w-[2.5rem] text-right font-semibold tabular-nums text-gray-800">
                          {row.value}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Memuat ringkasan...
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 transition-colors group-hover:bg-[rgba(21,126,195,0.06)]">
              <span>{card.ctaLabel}</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ReportFilters({
  activeReport,
  search,
  status,
  dateFrom,
  dateTo,
  scopeLabel,
  onSearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: {
  activeReport: ReportKind;
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  scopeLabel: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
}) {
  const report = REPORT_DEFINITIONS[activeReport];
  const showDateFilter = report.dateMode !== "none";

  return (
    <div className="border-b border-gray-100 px-6 py-5">
      <div className="space-y-5">
        {scopeLabel ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
              Cakupan Laporan
            </span>
            <div className={SETUP_PAGE_SEGMENTED_GROUP_CLASS}>
              <span
                className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} ${SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS}`}
              >
                {scopeLabel}
              </span>
            </div>
          </div>
        ) : null}

        <div
          className={joinClasses(
            "grid grid-cols-1 items-end gap-4",
            showDateFilter
              ? "lg:grid-cols-[minmax(0,1fr)_220px_180px_180px_auto]"
              : "lg:grid-cols-[minmax(0,1fr)_240px_auto]",
          )}
        >
          <SetupSearchInput
            label="Cari Data"
            placeholder={report.searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />

          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
              {report.statusLabel}
            </label>
            <SetupSelect
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              {report.statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>

          {showDateFilter ? (
            <>
              <div>
                <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
                  Dari {report.dateLabel}
                </label>
                <BasicDateInput value={dateFrom} onChange={onDateFromChange} />
              </div>
              <div>
                <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
                  Sampai {report.dateLabel}
                </label>
                <BasicDateInput value={dateTo} onChange={onDateToChange} />
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={onReset}
            className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportSectionShell({
  activeReport,
  title,
  subtitle,
  icon: Icon,
  search,
  status,
  dateFrom,
  dateTo,
  scopeLabel,
  exportLoading,
  exportDisabled,
  onSearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onReset,
  onExport,
  onClose,
  children,
  footer,
}: {
  activeReport: ReportKind;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  scopeLabel: string | null;
  exportLoading?: boolean;
  exportDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
  onExport: () => void;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SetupTableCard variant="report" scroll={false}>
      <div className={SETUP_PAGE_PANEL_HEADER_CLASS}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-900">
            <Icon className="h-8 w-8" aria-hidden="true" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SetupExcelButton
            loading={exportLoading}
            disabled={exportDisabled}
            onClick={onExport}
          />
          <SetupCloseListButton onClick={onClose} />
        </div>
      </div>

      <ReportFilters
        activeReport={activeReport}
        search={search}
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        scopeLabel={scopeLabel}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onReset={onReset}
      />

      <SetupTableScroll>{children}</SetupTableScroll>
      {footer}
    </SetupTableCard>
  );
}

function SelectionState() {
  return (
    <SetupEmptyState
      title="Pilih laporan arsip digital"
      description="Klik salah satu kartu di atas untuk menampilkan daftar dokumen, jatuh tempo, akses, atau peminjaman fisik."
      icon={Archive}
      variant="panel"
    />
  );
}

function TableCodeAndName({
  code,
  name,
  secondary,
}: {
  code: string;
  name: string;
  secondary?: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <SetupTableCode>{code || "-"}</SetupTableCode>
      <SetupTablePrimaryText>{name || "-"}</SetupTablePrimaryText>
      {secondary ? (
        <SetupTableSecondaryText>{secondary}</SetupTableSecondaryText>
      ) : null}
    </div>
  );
}

function ReportDocumentActionButton({
  document,
  onView,
}: {
  document?: Dokumen | null;
  onView: (document: Dokumen) => void;
}) {
  if (!document) {
    return <span className="text-sm text-slate-300">-</span>;
  }

  return (
    <SetupActionMenu
      items={[
        {
          key: "detail",
          label: "Detail",
          icon: Eye,
          tone: "blue",
          onClick: () => onView(document),
        },
      ]}
      label={`Buka aksi untuk dokumen ${document.kode}`}
      menuLabel={`Aksi dokumen ${document.kode}`}
    />
  );
}

function DocumentsTable({
  rows,
  meta,
  isLoading,
  onViewDocument,
}: {
  rows: Dokumen[];
  meta: PaginationMeta;
  isLoading: boolean;
  onViewDocument: (document: Dokumen) => void;
}) {
  return (
    <SetupDataTable
      variant="report"
      density="compact"
      className={`${SETUP_PAGE_MODERN_TABLE_CLASS} min-w-[1412px] table-fixed`}
    >
      <SetupDataTableColGroup>
        {DOCUMENT_TABLE_COLUMNS.map((width, index) => (
          <SetupDataTableCol
            key={`${index}-${width ?? "flex"}`}
            style={width ? { width } : undefined}
          />
        ))}
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Kode Dokumen
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Nama Dokumen
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Jenis
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            PIC / Divisi
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Lokasi
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Terkait Debitur
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Input
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {rows.map((item, index) => (
          <SetupDataTableRow
            key={item.id}
            className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer hover:bg-gray-50/50`}
            onDoubleClick={() => onViewDocument(item)}
          >
            <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
              {(meta.page - 1) * meta.limit + index + 1}
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTableCode>{item.kode}</SetupTableCode>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>{item.namaDokumen}</SetupTablePrimaryText>
              <SetupTableSecondaryText>{item.detail}</SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>{item.jenisDokumen}</SetupTablePrimaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>{getDocumentOwner(item)}</SetupTablePrimaryText>
              <SetupTableSecondaryText>{getDocumentOwnerDivision(item)}</SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTableSecondaryText>{getDocumentLocation(item)}</SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              {item.debtor ? (
                <>
                  <SetupStatusBadge status="Ya" size="sm" />
                  <SetupTableSecondaryText className="mt-1">
                    {getDocumentDebtorLabel(item)}
                  </SetupTableSecondaryText>
                </>
              ) : (
                <SetupStatusBadge status="Tidak" size="sm" />
              )}
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <div className="flex flex-col items-center gap-1">
                <SetupStatusBadge
                  status={item.restrict ? "Restrict" : "Non-restrict"}
                  tone={item.restrict ? "blue" : "slate"}
                  size="sm"
                />
                <SetupStatusBadge status={item.statusPinjam} size="sm" />
              </div>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <span className="tabular-nums">{formatDateOnly(item.tglInput)}</span>
            </SetupDataTableCell>
            <SetupDataTableCell
              className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <ReportDocumentActionButton
                document={item}
                onView={onViewDocument}
              />
            </SetupDataTableCell>
          </SetupDataTableRow>
        ))}
        {rows.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={10}
            state={isLoading ? "loading" : "empty"}
            icon={REPORT_DEFINITIONS.documents.icon}
            description={
              isLoading
                ? "Mengambil daftar dokumen sesuai scope laporan."
                : REPORT_DEFINITIONS.documents.description
            }
          >
            {isLoading ? "Memuat laporan dokumen..." : REPORT_DEFINITIONS.documents.emptyText}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function DueDateTable({
  rows,
  meta,
  isLoading,
  onViewDocument,
}: {
  rows: Peminjaman[];
  meta: PaginationMeta;
  isLoading: boolean;
  onViewDocument: (document: Dokumen) => void;
}) {
  return (
    <SetupDataTable
      variant="report"
      density="compact"
      className={`${SETUP_PAGE_MODERN_TABLE_CLASS} min-w-[1252px] table-fixed`}
    >
      <SetupDataTableColGroup>
        {DUE_DATE_TABLE_COLUMNS.map((width, index) => (
          <SetupDataTableCol
            key={`${index}-${width ?? "flex"}`}
            style={width ? { width } : undefined}
          />
        ))}
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Dokumen
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Peminjam / PIC
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Tgl Pinjam
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Jatuh Tempo
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Sisa Hari
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status Jatuh Tempo
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Lokasi
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {rows.map((item, index) => {
          const dueDateStatusLabel = getDueDateStatusLabel(item);

          return (
            <SetupDataTableRow
              key={item.id}
              className={joinClasses(
                SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
                item.document && "cursor-pointer hover:bg-gray-50/50",
              )}
              onDoubleClick={() => {
                if (item.document) onViewDocument(item.document);
              }}
            >
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {(meta.page - 1) * meta.limit + index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <TableCodeAndName
                  code={item.document?.kode ?? "-"}
                  name={item.document?.namaDokumen ?? item.detail}
                  secondary={item.document?.jenisDokumen ?? null}
                />
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <SetupTablePrimaryText>{item.peminjam}</SetupTablePrimaryText>
                <SetupTableSecondaryText>
                  {getDocumentOwner(item.document ?? undefined)}
                </SetupTableSecondaryText>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <span className="tabular-nums">{formatDateOnly(item.tglPinjam)}</span>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <span className="tabular-nums">{formatDateOnly(item.tglKembali)}</span>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <span className="tabular-nums">{formatRemainingDays(item.tglKembali)}</span>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupStatusBadge status={dueDateStatusLabel} size="sm" />
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <SetupTableSecondaryText>
                  {getDocumentLocation(item.document)}
                </SetupTableSecondaryText>
              </SetupDataTableCell>
              <SetupDataTableCell
                className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <ReportDocumentActionButton
                  document={item.document}
                  onView={onViewDocument}
                />
              </SetupDataTableCell>
            </SetupDataTableRow>
          );
        })}
        {rows.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={9}
            state={isLoading ? "loading" : "empty"}
            icon={REPORT_DEFINITIONS.dueDates.icon}
            description={
              isLoading
                ? "Mengambil daftar dokumen yang perlu dipantau jatuh temponya."
                : REPORT_DEFINITIONS.dueDates.description
            }
          >
            {isLoading ? "Memuat laporan jatuh tempo..." : REPORT_DEFINITIONS.dueDates.emptyText}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function AccessRequestTable({
  rows,
  meta,
  isLoading,
  onViewDocument,
}: {
  rows: Disposisi[];
  meta: PaginationMeta;
  isLoading: boolean;
  onViewDocument: (document: Dokumen) => void;
}) {
  return (
    <SetupDataTable
      variant="report"
      density="compact"
      className={`${SETUP_PAGE_MODERN_TABLE_CLASS} min-w-[1332px] table-fixed`}
    >
      <SetupDataTableColGroup>
        {ACCESS_TABLE_COLUMNS.map((width, index) => (
          <SetupDataTableCol
            key={`${index}-${width ?? "flex"}`}
            style={width ? { width } : undefined}
          />
        ))}
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Dokumen
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Pemohon
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Owner / Approver
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Pengajuan
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Keputusan / Expired
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Alasan
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {rows.map((item, index) => (
          <SetupDataTableRow
            key={item.id}
            className={joinClasses(
              SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
              item.document && "cursor-pointer hover:bg-gray-50/50",
            )}
            onDoubleClick={() => {
              if (item.document) onViewDocument(item.document);
            }}
          >
            <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
              {(meta.page - 1) * meta.limit + index + 1}
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <TableCodeAndName
                code={item.document?.kode ?? "-"}
                name={item.document?.namaDokumen ?? "-"}
                secondary={item.document?.jenisDokumen ?? null}
              />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>{item.pemohon}</SetupTablePrimaryText>
              <SetupTableSecondaryText>
                {item.requester?.division?.name ?? "-"}
              </SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>
                {item.actor ? getUserDisplayName(item.actor) : item.pemilik}
              </SetupTablePrimaryText>
              <SetupTableSecondaryText>{item.pemilik}</SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupStatusBadge status={item.status} size="sm" />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <span className="tabular-nums">{formatDateOnly(item.tglPengajuan)}</span>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>
                {item.tglAksi ? formatDateOnly(item.tglAksi) : "-"}
              </SetupTablePrimaryText>
              <SetupTableSecondaryText>
                Expired {formatDateOnly(item.tglExpired)}
              </SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTableSecondaryText>{item.alasanPengajuan}</SetupTableSecondaryText>
            </SetupDataTableCell>
            <SetupDataTableCell
              className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <ReportDocumentActionButton
                document={item.document}
                onView={onViewDocument}
              />
            </SetupDataTableCell>
          </SetupDataTableRow>
        ))}
        {rows.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={9}
            state={isLoading ? "loading" : "empty"}
            icon={REPORT_DEFINITIONS.accessRequests.icon}
            description={
              isLoading
                ? "Mengambil riwayat dan antrean permintaan akses."
                : REPORT_DEFINITIONS.accessRequests.description
            }
          >
            {isLoading ? "Memuat laporan akses..." : REPORT_DEFINITIONS.accessRequests.emptyText}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function LoansTable({
  rows,
  meta,
  isLoading,
  onViewDocument,
}: {
  rows: Peminjaman[];
  meta: PaginationMeta;
  isLoading: boolean;
  onViewDocument: (document: Dokumen) => void;
}) {
  return (
    <SetupDataTable
      variant="report"
      density="compact"
      className={`${SETUP_PAGE_MODERN_TABLE_CLASS} min-w-[1372px] table-fixed`}
    >
      <SetupDataTableColGroup>
        {LOAN_TABLE_COLUMNS.map((width, index) => (
          <SetupDataTableCol
            key={`${index}-${width ?? "flex"}`}
            style={width ? { width } : undefined}
          />
        ))}
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Dokumen
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Peminjam
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Tgl Pinjam
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Serah Terima
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Jatuh Tempo
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Tgl Kembali
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
            Penyetuju
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {rows.map((item, index) => (
          <SetupDataTableRow
            key={item.id}
            className={joinClasses(
              SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
              item.document && "cursor-pointer hover:bg-gray-50/50",
              item.isTerlambat && "bg-red-50/30",
            )}
            onDoubleClick={() => {
              if (item.document) onViewDocument(item.document);
            }}
          >
            <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
              {(meta.page - 1) * meta.limit + index + 1}
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <TableCodeAndName
                code={item.document?.kode ?? "-"}
                name={item.document?.namaDokumen ?? item.detail}
                secondary={item.document?.jenisDokumen ?? null}
              />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>{item.peminjam}</SetupTablePrimaryText>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupStatusBadge
                status={getLoanStatusLabel(item.statusKey, item.isTerlambat)}
                size="sm"
              />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <span className="tabular-nums">{formatDateOnly(item.tglPinjam)}</span>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <span className="tabular-nums">{formatDateOnly(item.tglPenyerahan)}</span>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <span className="tabular-nums">{formatDateOnly(item.tglKembali)}</span>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <span className="tabular-nums">
                {formatDateOnly(item.tanggalDikembalikan ?? item.tglPengembalian)}
              </span>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
              <SetupTablePrimaryText>
                {item.approverUser ? getUserDisplayName(item.approverUser) : item.approver ?? "-"}
              </SetupTablePrimaryText>
            </SetupDataTableCell>
            <SetupDataTableCell
              className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <ReportDocumentActionButton
                document={item.document}
                onView={onViewDocument}
              />
            </SetupDataTableCell>
          </SetupDataTableRow>
        ))}
        {rows.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={10}
            state={isLoading ? "loading" : "empty"}
            icon={REPORT_DEFINITIONS.loans.icon}
            description={
              isLoading
                ? "Mengambil daftar peminjaman dan pengembalian fisik."
                : REPORT_DEFINITIONS.loans.description
            }
          >
            {isLoading ? "Memuat laporan peminjaman..." : REPORT_DEFINITIONS.loans.emptyText}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

export default function LaporanArsipDigitalPage() {
  const { showToast } = useAppToast();
  const [summary, setSummary] = useState<ArsipDigitalReportSummary | null>(null);
  const [activeReport, setActiveReport] = useState<ReportKind | null>(null);
  const [rows, setRows] = useState<ReportRowsState>(EMPTY_ROWS);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedReportDocument, setSelectedReportDocument] =
    useState<Dokumen | null>(null);

  const activeDefinition = activeReport ? REPORT_DEFINITIONS[activeReport] : null;
  const summaryCards = useMemo(
    () => getSummaryCards(summary, isSummaryLoading),
    [isSummaryLoading, summary],
  );
  const normalizedDateRange = useMemo(
    () => normalizeDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );
  const reportQuery = useMemo(
    () => {
      if (!activeReport) return {};

      return buildReportQuery({
        activeReport,
        search: debouncedSearch,
        status: statusFilter,
        dateFrom: normalizedDateRange.from,
        dateTo: normalizedDateRange.to,
      });
    },
    [activeReport, debouncedSearch, normalizedDateRange, statusFilter],
  );
  const scopeLabel = getScopeLabel(summary);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      setIsSummaryLoading(true);
      try {
        const result = await arsipService.getReportSummary();
        if (!ignore) setSummary(result);
      } catch (error) {
        if (!ignore) {
          setSummary(null);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat ringkasan laporan arsip digital.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsSummaryLoading(false);
      }
    }

    void loadSummary();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!activeReport) return;
    setCurrentPage(1);
  }, [activeReport, reportQuery]);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      if (!activeReport || !activeDefinition) {
        setIsReportLoading(false);
        setPaginationMeta(INITIAL_PAGINATION_META);
        return;
      }

      setIsReportLoading(true);
      try {
        if (activeReport === "documents") {
          const result = await arsipService.getDocumentReportPage({
            ...reportQuery,
            page: currentPage,
            limit: OPERATIONAL_TABLE_PAGE_SIZE,
          });
          if (!ignore) {
            setRows((current) => ({ ...current, documents: result.items }));
            setPaginationMeta(result.meta);
          }
          return;
        }

        if (activeReport === "dueDates") {
          const result = await arsipService.getDueDateReportPage({
            ...reportQuery,
            page: currentPage,
            limit: OPERATIONAL_TABLE_PAGE_SIZE,
          });
          if (!ignore) {
            setRows((current) => ({ ...current, dueDates: result.items }));
            setPaginationMeta(result.meta);
          }
          return;
        }

        if (activeReport === "accessRequests") {
          const result = await arsipService.getAccessRequestReportPage({
            ...reportQuery,
            page: currentPage,
            limit: OPERATIONAL_TABLE_PAGE_SIZE,
          });
          if (!ignore) {
            setRows((current) => ({ ...current, accessRequests: result.items }));
            setPaginationMeta(result.meta);
          }
          return;
        }

        const result = await arsipService.getLoanReportPage({
          ...reportQuery,
          page: currentPage,
          limit: OPERATIONAL_TABLE_PAGE_SIZE,
        });
        if (!ignore) {
          setRows((current) => ({ ...current, loans: result.items }));
          setPaginationMeta(result.meta);
        }
      } catch (error) {
        if (!ignore) {
          setRows((current) => ({ ...current, [activeReport]: [] }));
          setPaginationMeta(INITIAL_PAGINATION_META);
          showToast(
            error instanceof Error
              ? error.message
              : `Gagal memuat ${activeDefinition.title.toLowerCase()}.`,
            "error",
          );
        }
      } finally {
        if (!ignore) setIsReportLoading(false);
      }
    }

    void loadReport();

    return () => {
      ignore = true;
    };
  }, [activeDefinition, activeReport, currentPage, reportQuery, showToast]);

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleReportChange = (report: ReportKind) => {
    if (report === activeReport) return;
    setActiveReport(report);
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleCloseReport = () => {
    setActiveReport(null);
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    setPaginationMeta(INITIAL_PAGINATION_META);
  };

  const handleExport = async () => {
    if (!activeReport) return;

    setIsExporting(true);
    try {
      const filename = `laporan-arsip-${activeReport}-${formatFilenameDate(new Date())}`;

      if (activeReport === "documents") {
        const items = await arsipService.getDocumentReport(reportQuery);
        await exportToExcel({
          filename,
          sheetName: "Dokumen Arsip",
          title: "Laporan Daftar Dokumen Arsip",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "Kode Dokumen", key: "kode", width: 18 },
            { header: "Nama Dokumen", key: "namaDokumen", width: 34 },
            { header: "Jenis", key: "jenisDokumen", width: 20 },
            { header: "PIC", key: "pic", width: 22 },
            { header: "Divisi", key: "divisi", width: 22 },
            { header: "Lokasi", key: "lokasi", width: 34 },
            { header: "Akses", key: "akses", width: 16 },
            { header: "Status", key: "status", width: 18 },
            { header: "Terkait Debitur", key: "debitur", width: 32 },
            { header: "Tanggal Input", key: "tanggalInput", width: 18 },
          ],
          data: items.map((item, index) => ({
            no: index + 1,
            kode: item.kode,
            namaDokumen: item.namaDokumen,
            jenisDokumen: item.jenisDokumen,
            pic: getDocumentOwner(item),
            divisi: getDocumentOwnerDivision(item),
            lokasi: getDocumentLocation(item),
            akses: item.restrict ? "Restrict" : "Non-restrict",
            status: item.statusPinjam,
            debitur: getDocumentDebtorLabel(item),
            tanggalInput: formatDateOnly(item.tglInput),
          })),
        });
      } else if (activeReport === "dueDates") {
        const items = await arsipService.getDueDateReport(reportQuery);
        await exportToExcel({
          filename,
          sheetName: "Jatuh Tempo",
          title: "Laporan Jatuh Tempo Arsip",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "Kode Dokumen", key: "kode", width: 18 },
            { header: "Nama Dokumen", key: "namaDokumen", width: 34 },
            { header: "Peminjam", key: "peminjam", width: 22 },
            { header: "Tanggal Pinjam", key: "tanggalPinjam", width: 18 },
            { header: "Jatuh Tempo", key: "jatuhTempo", width: 18 },
            { header: "Sisa Hari", key: "sisaHari", width: 20 },
            { header: "Status Jatuh Tempo", key: "statusJatuhTempo", width: 22 },
            { header: "Lokasi", key: "lokasi", width: 34 },
          ],
          data: items.map((item, index) => ({
            no: index + 1,
            kode: item.document?.kode ?? "-",
            namaDokumen: item.document?.namaDokumen ?? item.detail,
            peminjam: item.peminjam,
            tanggalPinjam: formatDateOnly(item.tglPinjam),
            jatuhTempo: formatDateOnly(item.tglKembali),
            sisaHari: formatRemainingDays(item.tglKembali),
            statusJatuhTempo: getDueDateStatusLabel(item),
            lokasi: getDocumentLocation(item.document),
          })),
        });
      } else if (activeReport === "accessRequests") {
        const items = await arsipService.getAccessRequestReport(reportQuery);
        await exportToExcel({
          filename,
          sheetName: "Akses Disposisi",
          title: "Laporan Akses & Disposisi Arsip",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "Kode Dokumen", key: "kode", width: 18 },
            { header: "Nama Dokumen", key: "namaDokumen", width: 34 },
            { header: "Pemohon", key: "pemohon", width: 22 },
            { header: "Owner", key: "owner", width: 22 },
            { header: "Status", key: "status", width: 18 },
            { header: "Tanggal Pengajuan", key: "tanggalPengajuan", width: 20 },
            { header: "Tanggal Aksi", key: "tanggalAksi", width: 18 },
            { header: "Expired Akses", key: "expired", width: 18 },
            { header: "Alasan", key: "alasan", width: 40 },
          ],
          data: items.map((item, index) => ({
            no: index + 1,
            kode: item.document?.kode ?? "-",
            namaDokumen: item.document?.namaDokumen ?? "-",
            pemohon: item.pemohon,
            owner: item.pemilik,
            status: item.status,
            tanggalPengajuan: formatDateOnly(item.tglPengajuan),
            tanggalAksi: formatDateOnly(item.tglAksi),
            expired: formatDateOnly(item.tglExpired),
            alasan: item.alasanPengajuan,
          })),
        });
      } else {
        const items = await arsipService.getLoanReport(reportQuery);
        await exportToExcel({
          filename,
          sheetName: "Peminjaman Fisik",
          title: "Laporan Peminjaman Fisik Arsip",
          columns: [
            { header: "No", key: "no", width: 6 },
            { header: "Kode Dokumen", key: "kode", width: 18 },
            { header: "Nama Dokumen", key: "namaDokumen", width: 34 },
            { header: "Peminjam", key: "peminjam", width: 22 },
            { header: "Status", key: "status", width: 20 },
            { header: "Tanggal Pinjam", key: "tanggalPinjam", width: 18 },
            { header: "Serah Terima", key: "serahTerima", width: 18 },
            { header: "Jatuh Tempo", key: "jatuhTempo", width: 18 },
            { header: "Tanggal Kembali", key: "tanggalKembali", width: 20 },
            { header: "Penyetuju", key: "penyetuju", width: 22 },
          ],
          data: items.map((item, index) => ({
            no: index + 1,
            kode: item.document?.kode ?? "-",
            namaDokumen: item.document?.namaDokumen ?? item.detail,
            peminjam: item.peminjam,
            status: getLoanStatusLabel(item.statusKey, item.isTerlambat),
            tanggalPinjam: formatDateOnly(item.tglPinjam),
            serahTerima: formatDateOnly(item.tglPenyerahan),
            jatuhTempo: formatDateOnly(item.tglKembali),
            tanggalKembali: formatDateOnly(item.tanggalDikembalikan ?? item.tglPengembalian),
            penyetuju: item.approverUser ? getUserDisplayName(item.approverUser) : item.approver ?? "-",
          })),
        });
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal export laporan arsip digital.",
        "error",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Laporan Arsip Digital"
        subtitle="Workspace laporan operasional dokumen, akses, jatuh tempo, dan peminjaman fisik arsip."
        icon={<Archive />}
      />

      <SummaryCards
        cards={summaryCards}
        activeReport={activeReport}
        onSelect={handleReportChange}
      />

      {!activeReport || !activeDefinition ? (
        <SelectionState />
      ) : (
        <ReportSectionShell
          activeReport={activeReport}
          title={activeDefinition.title}
          subtitle={activeDefinition.description}
          icon={activeDefinition.icon}
          search={searchTerm}
          status={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          scopeLabel={scopeLabel}
          exportLoading={isExporting}
          exportDisabled={isReportLoading}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onReset={resetFilters}
          onExport={handleExport}
          onClose={handleCloseReport}
          footer={
            <Pagination
              page={paginationMeta.page}
              lastPage={paginationMeta.lastPage}
              total={paginationMeta.total}
              limit={paginationMeta.limit}
              isLoading={isReportLoading}
              onPageChange={setCurrentPage}
            />
          }
        >
          {activeReport === "documents" ? (
            <DocumentsTable
              rows={rows.documents}
              meta={paginationMeta}
              isLoading={isReportLoading}
              onViewDocument={setSelectedReportDocument}
            />
          ) : null}
          {activeReport === "dueDates" ? (
            <DueDateTable
              rows={rows.dueDates}
              meta={paginationMeta}
              isLoading={isReportLoading}
              onViewDocument={setSelectedReportDocument}
            />
          ) : null}
          {activeReport === "accessRequests" ? (
            <AccessRequestTable
              rows={rows.accessRequests}
              meta={paginationMeta}
              isLoading={isReportLoading}
              onViewDocument={setSelectedReportDocument}
            />
          ) : null}
          {activeReport === "loans" ? (
            <LoansTable
              rows={rows.loans}
              meta={paginationMeta}
              isLoading={isReportLoading}
              onViewDocument={setSelectedReportDocument}
            />
          ) : null}
        </ReportSectionShell>
      )}
      <ReportDocumentDetailModal
        isOpen={selectedReportDocument !== null}
        document={selectedReportDocument}
        onClose={() => setSelectedReportDocument(null)}
      />
    </DashboardPageShell>
  );
}
