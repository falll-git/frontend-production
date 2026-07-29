"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  Scale,
  Shield,
  Users2,
  type LucideIcon,
} from "lucide-react";

import {
  LegalClaimDetailContent,
  LegalProgressDetailContent,
  type LegalProgressDetailType,
} from "@/components/legal/LegalRecordDetailContent";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import DashboardModal from "@/components/ui/DashboardModal";
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
  SetupTableCode,
  SetupTablePrimaryText,
} from "@/components/ui/SetupDataTable";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import {
  deriveDocumentFileName,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import { legalService } from "@/services/legal.service";
import type { PaginationMeta } from "@/types/api.types";
import type { DebtorFileMeta } from "@/types/debitur.types";
import type {
  LegalClaim,
  LegalProgressRecord,
  LegalThirdPartyDocumentsReport,
} from "@/types/legal.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type PihakKetigaKategori = "NOTARIS" | "ASURANSI" | "KJPP";

type PihakKetigaSummaryItem = {
  kategori: PihakKetigaKategori;
  totalProgress: number;
  prosesBerjalan: number;
  laporanSelesai: number;
  lewatExpired: number;
};

type AsuransiModalView = "ASURANSI" | "KLAIM";
type ProgressRecordKind = PihakKetigaKategori;

type DashboardProgressRow = {
  kind: ProgressRecordKind;
  item: LegalProgressRecord;
  module: string;
  contractNumber: string;
  debtorName: string;
  thirdPartyName: string;
  detailType: string;
  status: string;
  date: string;
};

type DashboardClaimRow = {
  kind: "KLAIM";
  item: LegalClaim;
  module: "Klaim";
  contractNumber: string;
  debtorName: string;
  thirdPartyName: string;
  detailType: string;
  status: string;
  date: string;
};

type DashboardThirdPartyRow = DashboardProgressRow | DashboardClaimRow;

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: SETUP_TABLE_PAGE_SIZE,
  total: 0,
  lastPage: 1,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

const kategoriMeta: Record<
  PihakKetigaKategori,
  {
    icon: LucideIcon;
    label: string;
    accentColor: string;
    accentEndColor: string;
    shadowColor: string;
  }
> = {
  NOTARIS: {
    icon: Scale,
    label: "Notaris",
    accentColor: "#157ec3",
    accentEndColor: "#0d5a8f",
    shadowColor: "rgba(21, 126, 195, 0.22)",
  },
  ASURANSI: {
    icon: Shield,
    label: "Asuransi",
    accentColor: "#0f766e",
    accentEndColor: "#0d5f59",
    shadowColor: "rgba(15, 118, 110, 0.22)",
  },
  KJPP: {
    icon: Building2,
    label: "KJPP",
    accentColor: "#7c3aed",
    accentEndColor: "#5b21b6",
    shadowColor: "rgba(124, 58, 237, 0.22)",
  },
};

const kategoriOrder: PihakKetigaKategori[] = ["NOTARIS", "ASURANSI", "KJPP"];

function readGroupCount(record: Record<string, unknown>) {
  const count = record._count;

  if (typeof count === "number") return count;
  if (count && typeof count === "object" && "id" in count) {
    const value = (count as Record<string, unknown>).id;
    if (typeof value === "number") return value;
  }

  for (const key of ["total_records", "total", "count"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return 0;
}

function readStatus(record: Record<string, unknown>) {
  const status = record.status;
  return typeof status === "string" ? status.trim().toUpperCase() : "";
}

function normalizeDisplay(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function statusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (["AKTIF", "ACTIVE"].includes(normalized)) return "Aktif";
  if (["PENDING", "PENGAJUAN"].includes(normalized)) return "Menunggu";
  if (["PROSES", "DIPROSES", "VERIFIKASI"].includes(normalized)) return "Dalam Proses";
  if (["SELESAI", "TERUPLOAD", "DISETUJUI", "DIBAYAR", "CAIR", "APPROVED", "DONE", "COMPLETED"].includes(normalized)) return "Selesai";
  if (["GAGAL", "DITOLAK", "BERMASALAH"].includes(normalized)) return "Ditolak";
  if (["EXPIRED", "LEWAT_TEMPO", "OVERDUE"].includes(normalized)) return "Expired";
  if (normalized === "KLAIM") return "Klaim";
  return normalizeDisplay(normalized);
}

function isDoneStatus(status: string) {
  return [
    "SELESAI",
    "TERUPLOAD",
    "DISETUJUI",
    "DIBAYAR",
    "CAIR",
    "APPROVED",
    "DONE",
    "COMPLETED",
  ].includes(status);
}

function isExpiredStatus(status: string) {
  return ["EXPIRED", "LEWAT_TEMPO", "OVERDUE"].includes(status);
}

function createEmptySummary(kategori: PihakKetigaKategori): PihakKetigaSummaryItem {
  return {
    kategori,
    totalProgress: 0,
    prosesBerjalan: 0,
    laporanSelesai: 0,
    lewatExpired: 0,
  };
}

function appendRows(
  summary: PihakKetigaSummaryItem,
  rows: Array<Record<string, unknown>>,
) {
  rows.forEach((row) => {
    const total = readGroupCount(row);
    const status = readStatus(row);

    summary.totalProgress += total;
    if (isExpiredStatus(status)) {
      summary.lewatExpired += total;
      return;
    }

    if (isDoneStatus(status)) {
      summary.laporanSelesai += total;
      return;
    }

    summary.prosesBerjalan += total;
  });
}

function mapReportSummary(
  report: LegalThirdPartyDocumentsReport | null,
): PihakKetigaSummaryItem[] {
  const summaries = new Map<PihakKetigaKategori, PihakKetigaSummaryItem>(
    kategoriOrder.map((kategori) => [kategori, createEmptySummary(kategori)]),
  );

  appendRows(summaries.get("NOTARIS")!, report?.notary ?? []);
  appendRows(summaries.get("ASURANSI")!, [
    ...(report?.insurance ?? []),
    ...(report?.claims ?? []),
  ]);
  appendRows(summaries.get("KJPP")!, report?.kjpp ?? []);

  return kategoriOrder.map((kategori) => summaries.get(kategori)!);
}

function parameterName(record: Record<string, unknown> | null | undefined) {
  const value = record?.name;
  return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function mapProgressRow(
  item: LegalProgressRecord,
  kind: ProgressRecordKind,
): DashboardProgressRow {
  const detailType =
    kind === "NOTARIS"
      ? item.deed_type
      : kind === "KJPP"
        ? item.appraisal_type
        : item.insurance_type;
  const date =
    kind === "ASURANSI" ? item.period_start : item.received_at;

  return {
    kind,
    item,
    module: kategoriMeta[kind].label,
    contractNumber: item.contract?.no_kontrak ?? "-",
    debtorName: item.contract?.debtor?.name ?? "-",
    thirdPartyName: parameterName(item.third_party),
    detailType: detailType || "-",
    status: item.status,
    date: formatDateOnly(date),
  };
}

function mapClaimRow(item: LegalClaim): DashboardClaimRow {
  return {
    kind: "KLAIM",
    item,
    module: "Klaim",
    contractNumber: item.contract?.no_kontrak ?? "-",
    debtorName: item.contract?.debtor?.name ?? "-",
    thirdPartyName: parameterName(item.insurance_progress?.third_party),
    detailType: item.claim_type || "-",
    status: item.status,
    date: formatDateOnly(item.submitted_at),
  };
}

function progressDetailType(
  kind: ProgressRecordKind,
): LegalProgressDetailType {
  if (kind === "NOTARIS") return "notary";
  if (kind === "KJPP") return "kjpp";
  return "insurance";
}

function openLegalFile(
  file: DebtorFileMeta,
  openPreview: (fileUrl: string, fileName: string) => void,
) {
  const previewableUrl = toPreviewableFileUrl(file.url, file.name);
  if (!previewableUrl) return;
  openPreview(
    previewableUrl,
    deriveDocumentFileName(file.name || previewableUrl, "dokumen-legal"),
  );
}

function SummaryMetricCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-800"
      : tone === "danger"
        ? "text-red-600"
        : "text-slate-700";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${toneClass}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function LaporanPihakKetigaSection({
  widget,
}: {
  widget?: DashboardMenuNode;
}) {
  const { openPreview } = useDocumentPreviewContext();
  const [report, setReport] = useState<LegalThirdPartyDocumentsReport | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedKategori, setSelectedKategori] =
    useState<PihakKetigaKategori | null>(null);
  const [asuransiModalView, setAsuransiModalView] =
    useState<AsuransiModalView>("ASURANSI");
  const [recordRows, setRecordRows] = useState<DashboardThirdPartyRow[]>([]);
  const [recordMeta, setRecordMeta] = useState<PaginationMeta>(EMPTY_META);
  const [recordPage, setRecordPage] = useState(1);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [recordErrorMessage, setRecordErrorMessage] = useState<string | null>(
    null,
  );
  const [detailTarget, setDetailTarget] =
    useState<DashboardThirdPartyRow | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await legalService.getThirdPartyDocumentsReport();
        if (!ignore) setReport(result);
      } catch (error) {
        if (!ignore) {
          setReport(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat progress pihak ketiga",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      ignore = true;
    };
  }, []);

  const activeModule =
    selectedKategori === "ASURANSI"
      ? asuransiModalView
      : selectedKategori;

  useEffect(() => {
    if (!activeModule) {
      setRecordRows([]);
      setRecordMeta(EMPTY_META);
      setRecordErrorMessage(null);
      return;
    }

    let ignore = false;
    const moduleToLoad = activeModule;

    async function loadRecords() {
      try {
        setIsRecordLoading(true);
        setRecordErrorMessage(null);
        setRecordRows([]);
        const query = { page: recordPage, limit: SETUP_TABLE_PAGE_SIZE };

        if (moduleToLoad === "KLAIM") {
          const result = await legalService.getClaimsPage(query);
          if (!ignore) {
            setRecordRows(result.items.map(mapClaimRow));
            setRecordMeta(result.meta);
          }
          return;
        }

        const result =
          moduleToLoad === "NOTARIS"
            ? await legalService.getNotaryPage(query)
            : moduleToLoad === "KJPP"
              ? await legalService.getKjppPage(query)
              : await legalService.getInsurancePage(query);

        if (!ignore) {
          setRecordRows(
            result.items.map((item) => mapProgressRow(item, moduleToLoad)),
          );
          setRecordMeta(result.meta);
        }
      } catch (error) {
        if (!ignore) {
          setRecordRows([]);
          setRecordMeta({ ...EMPTY_META, page: recordPage });
          setRecordErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat detail progress pihak ketiga",
          );
        }
      } finally {
        if (!ignore) setIsRecordLoading(false);
      }
    }

    void loadRecords();

    return () => {
      ignore = true;
    };
  }, [activeModule, recordPage]);

  const progressSummary = useMemo(() => mapReportSummary(report), [report]);
  const selectedSummary = useMemo(
    () => progressSummary.find((item) => item.kategori === selectedKategori) ?? null,
    [progressSummary, selectedKategori],
  );
  const selectedMeta = selectedKategori ? kategoriMeta[selectedKategori] : null;

  const openCategory = (kategori: PihakKetigaKategori) => {
    setSelectedKategori(kategori);
    setAsuransiModalView("ASURANSI");
    setRecordPage(1);
    setDetailTarget(null);
  };

  const closeSummaryModal = () => {
    setSelectedKategori(null);
    setRecordPage(1);
    setDetailTarget(null);
  };

  const selectAsuransiView = (view: AsuransiModalView) => {
    setAsuransiModalView(view);
    setRecordPage(1);
    setDetailTarget(null);
  };

  return (
    <>
      <section className="animate-fade-in">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Users2 className="h-6 w-6 text-gray-600" aria-hidden="true" />
            {widget?.name ?? "Laporan Progress Pihak Ketiga"}
          </h2>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {progressSummary.map((item, index) => {
            const meta = kategoriMeta[item.kategori];
            const CategoryIcon = meta.icon;
            const expiredTone = item.lewatExpired > 0 ? "text-red-700" : "text-gray-700";

            return (
              <button
                type="button"
                key={item.kategori}
                onClick={() => openCategory(item.kategori)}
                className="group rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50/30"
                style={{ animationDelay: `${index * 0.1}s` }}
                title={`Lihat laporan ${meta.label}`}
              >
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${meta.accentColor} 0%, ${meta.accentEndColor} 100%)`,
                        boxShadow: `0 12px 24px ${meta.shadowColor}`,
                      }}
                    >
                      <CategoryIcon className="h-7 w-7 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-gray-900">
                        {meta.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-[7.375rem] shrink-0 flex-col items-end text-right">
                    <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-700">
                      Total Progress
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-gray-800">
                      {isLoading ? "-" : formatNumber(item.totalProgress)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Activity className="h-4 w-4 text-gray-500" aria-hidden="true" />
                      Proses Berjalan
                    </span>
                    <span className="font-semibold text-gray-800">
                      {isLoading ? "-" : formatNumber(item.prosesBerjalan)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-800" aria-hidden="true" />
                      Selesai
                    </span>
                    <span className="font-semibold text-emerald-800">
                      {isLoading ? "-" : formatNumber(item.laporanSelesai)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className={`flex items-center gap-2 ${expiredTone}`}>
                      <AlertTriangle className={`h-4 w-4 ${expiredTone}`} aria-hidden="true" />
                      Lewat Expired
                    </span>
                    <span className={`font-semibold ${expiredTone}`}>
                      {isLoading ? "-" : formatNumber(item.lewatExpired)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between font-medium text-[#0d5a8f] transition-transform group-hover:translate-x-1">
                  <span className="text-sm">Lihat Detail</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <DashboardModal
        isOpen={selectedKategori !== null && detailTarget === null}
        title={selectedMeta ? `Progress Pihak Ketiga - ${selectedMeta.label}` : "Progress Pihak Ketiga"}
        description="Ringkasan status progress pihak ketiga berdasarkan data legal."
        maxWidth="5xl"
        bodyClassName="max-h-[78vh] space-y-5 overflow-y-auto p-4 sm:p-5"
        onClose={closeSummaryModal}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetricCard
            icon={ClipboardList}
            label="Total Progress"
            value={isLoading ? "-" : formatNumber(selectedSummary?.totalProgress ?? 0)}
          />
          <SummaryMetricCard
            icon={Activity}
            label="Proses Berjalan"
            value={isLoading ? "-" : formatNumber(selectedSummary?.prosesBerjalan ?? 0)}
          />
          <SummaryMetricCard
            icon={CheckCircle2}
            label="Selesai"
            value={isLoading ? "-" : formatNumber(selectedSummary?.laporanSelesai ?? 0)}
            tone="success"
          />
          <SummaryMetricCard
            icon={AlertTriangle}
            label="Lewat Expired"
            value={isLoading ? "-" : formatNumber(selectedSummary?.lewatExpired ?? 0)}
            tone={(selectedSummary?.lewatExpired ?? 0) > 0 ? "danger" : "neutral"}
          />
        </div>

        {selectedKategori === "ASURANSI" ? (
          <div
            role="tablist"
            aria-label="Jenis detail laporan asuransi"
            className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto"
          >
            {([
              { value: "ASURANSI", label: "Progress Asuransi" },
              { value: "KLAIM", label: "Klaim" },
            ] as const).map((option) => {
              const isActive = asuransiModalView === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectAsuransiView(option.value)}
                  className={`min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                    isActive
                      ? "bg-white text-[#0d5a8f] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {recordErrorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {recordErrorMessage}
          </div>
        ) : null}

        <SetupTableCard variant="report">
          <SetupDataTable
            variant="report"
            density="compact"
            className="min-w-[1280px]"
          >
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Modul</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {recordRows.map((row, index) => (
                <SetupDataTableRow
                  key={`${row.kind}-${row.item.id}`}
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
                  title={`Double-click untuk melihat detail ${row.module}`}
                  onDoubleClick={() => setDetailTarget(row)}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(recordMeta.page - 1) * recordMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{row.module}</SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableCode>{row.contractNumber}</SetupTableCode>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTablePrimaryText>{row.debtorName}</SetupTablePrimaryText>
                  </SetupDataTableCell>
                  <SetupDataTableCell>{row.thirdPartyName}</SetupDataTableCell>
                  <SetupDataTableCell>{row.detailType}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(row.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell>{row.date}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <div
                      className="flex items-center justify-center"
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <SetupActionMenu
                        label={`Buka aksi ${row.module} ${row.contractNumber}`}
                        menuLabel={`Aksi ${row.module} ${row.contractNumber}`}
                        items={[
                          {
                            key: "detail",
                            label: "Detail",
                            icon: Eye,
                            tone: "blue",
                            onClick: () => setDetailTarget(row),
                          },
                        ]}
                      />
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {isRecordLoading ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Memuat detail progress pihak ketiga...
                </SetupDataTableEmptyRow>
              ) : null}
              {!isRecordLoading && !recordErrorMessage && recordRows.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={9}
                  tone="legal"
                  description="Data detail akan terisi dari record pada modul Legal terkait."
                >
                  Belum ada progress untuk kategori ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
          <Pagination
            page={recordMeta.page}
            lastPage={recordMeta.lastPage}
            total={recordMeta.total}
            limit={recordMeta.limit}
            isLoading={isRecordLoading}
            onPageChange={setRecordPage}
          />
        </SetupTableCard>
      </DashboardModal>

      <DashboardModal
        isOpen={detailTarget !== null}
        title={
          detailTarget?.kind === "KLAIM"
            ? "Detail Klaim Asuransi"
            : detailTarget
              ? `Detail Progress ${detailTarget.module}`
              : "Detail Progress Pihak Ketiga"
        }
        description={detailTarget?.contractNumber}
        onClose={() => setDetailTarget(null)}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] space-y-5 overflow-y-auto p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setDetailTarget(null)}
          >
            Tutup
          </button>
        }
      >
        {detailTarget?.kind === "KLAIM" ? (
          <LegalClaimDetailContent
            item={detailTarget.item}
            onOpenFile={(file) => openLegalFile(file, openPreview)}
          />
        ) : detailTarget ? (
          <LegalProgressDetailContent
            item={detailTarget.item}
            type={progressDetailType(detailTarget.kind)}
            onOpenFile={(file) => openLegalFile(file, openPreview)}
          />
        ) : null}
      </DashboardModal>
    </>
  );
}
