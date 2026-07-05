"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Scale,
  Shield,
  Users2,
  type LucideIcon,
} from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import { SetupDataTable, SetupDataTableBody, SetupDataTableCell, SetupDataTableEmptyRow, SetupDataTableHead, SetupDataTableHeaderCell, SetupDataTableRow, SetupTableCard } from "@/components/ui/SetupDataTable";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import { legalService } from "@/services/legal.service";
import type { LegalThirdPartyDocumentsReport } from "@/types/legal.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type PihakKetigaKategori = "NOTARIS" | "ASURANSI" | "KJPP";

type PihakKetigaSummaryItem = {
  kategori: PihakKetigaKategori;
  totalProgress: number;
  prosesBerjalan: number;
  laporanSelesai: number;
  lewatExpired: number;
};

type DocumentModalRow = {
  module: string;
  record: Record<string, unknown>;
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
  }
> = {
  NOTARIS: {
    icon: Scale,
    label: "Notaris",
    accentColor: "#157ec3",
  },
  ASURANSI: {
    icon: Shield,
    label: "Asuransi",
    accentColor: "#0f766e",
  },
  KJPP: {
    icon: Building2,
    label: "KJPP",
    accentColor: "#7c3aed",
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

function readReportString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "-";
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

function getModalRows(
  report: LegalThirdPartyDocumentsReport | null,
  kategori: PihakKetigaKategori | null,
): DocumentModalRow[] {
  if (!report || !kategori) return [];
  if (kategori === "NOTARIS") {
    return report.notary.map((record) => ({ module: "Notaris", record }));
  }
  if (kategori === "KJPP") {
    return report.kjpp.map((record) => ({ module: "KJPP", record }));
  }
  return [
    ...report.insurance.map((record) => ({ module: "Asuransi", record })),
    ...report.claims.map((record) => ({ module: "Klaim", record })),
  ];
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
      ? "text-emerald-700"
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
  const [report, setReport] = useState<LegalThirdPartyDocumentsReport | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedKategori, setSelectedKategori] =
    useState<PihakKetigaKategori | null>(null);

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

  const progressSummary = useMemo(() => mapReportSummary(report), [report]);
  const selectedSummary = useMemo(
    () => progressSummary.find((item) => item.kategori === selectedKategori) ?? null,
    [progressSummary, selectedKategori],
  );
  const modalRows = useMemo(
    () => getModalRows(report, selectedKategori),
    [report, selectedKategori],
  );
  const selectedMeta = selectedKategori ? kategoriMeta[selectedKategori] : null;

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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {progressSummary.map((item, index) => {
            const meta = kategoriMeta[item.kategori];
            const CategoryIcon = meta.icon;
            const expiredTone = item.lewatExpired > 0 ? "text-red-600" : "text-gray-400";

            return (
              <button
                type="button"
                key={item.kategori}
                onClick={() => setSelectedKategori(item.kategori)}
                className="group animate-slide-up rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[rgba(21,126,195,0.42)] hover:bg-gray-50"
                style={{ animationDelay: `${index * 0.1}s` }}
                title={`Lihat laporan ${meta.label}`}
              >
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${meta.accentColor}14`,
                        color: meta.accentColor,
                      }}
                    >
                      <CategoryIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-gray-900">
                        {meta.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-[7.375rem] shrink-0 flex-col items-end text-right">
                    <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
                      Total Progress
                    </span>
                    <span className="text-xl font-bold tabular-nums text-gray-800">
                      {isLoading ? "-" : formatNumber(item.totalProgress)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      <Activity className="h-4 w-4 text-gray-500" aria-hidden="true" />
                      Proses Berjalan
                    </span>
                    <span className="font-semibold text-gray-800">
                      {isLoading ? "-" : formatNumber(item.prosesBerjalan)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      Selesai
                    </span>
                    <span className="font-semibold text-emerald-600">
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

                <div className="mt-5 flex items-center justify-between font-medium text-gray-900">
                  <span className="text-sm">Lihat Detail</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <DashboardModal
        isOpen={selectedKategori !== null}
        title={selectedMeta ? `Progress Pihak Ketiga - ${selectedMeta.label}` : "Progress Pihak Ketiga"}
        description="Ringkasan status progress pihak ketiga berdasarkan data legal."
        maxWidth="5xl"
        bodyClassName="space-y-5 p-4 sm:p-5"
        onClose={() => setSelectedKategori(null)}
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

        <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className="min-w-[760px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Modul</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Total</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {modalRows.map((item, index) => (
                <SetupDataTableRow key={`${item.module}-${index}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{index + 1}</SetupDataTableCell>
                  <SetupDataTableCell>{item.module}</SetupDataTableCell>
                  <SetupDataTableCell>{readReportString(item.record, "third_party_name", "third_party_id")}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(readStatus(item.record))} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>{formatNumber(readGroupCount(item.record))}</SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {isLoading ? <SetupDataTableEmptyRow colSpan={5}>Memuat progress pihak ketiga...</SetupDataTableEmptyRow> : null}
              {!isLoading && modalRows.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={5}
                  tone="legal"
                  description="Laporan akan terisi dari progress pihak ketiga pada modul Legal."
                >
                  Belum ada progress untuk kategori ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </DashboardModal>
    </>
  );
}
