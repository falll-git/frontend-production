"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle,
  ChevronRight,
  Clock,
  FileSignature,
  HeartPulse,
  RotateCcw,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import { SetupDataTable, SetupDataTableBody, SetupDataTableCell, SetupDataTableEmptyRow, SetupDataTableHead, SetupDataTableHeaderCell, SetupDataTableRow, SetupTableCard, SetupTableMoney } from "@/components/ui/SetupDataTable";
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
import type { LegalDepositFundsReport } from "@/types/legal.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type JenisTitipan = "NOTARIS" | "ASURANSI" | "ANGSURAN" | "LAINNYA";

type TitipanSummaryItem = {
  jenisTitipan: JenisTitipan;
  totalTitipan: number;
  totalPembayaran: number;
  totalRefund: number;
  saldoAkhir: number;
  jumlahTitipan: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const jenisMeta: Record<
  JenisTitipan,
  {
    icon: LucideIcon;
    title: string;
    accentColor: string;
  }
> = {
  NOTARIS: {
    icon: FileSignature,
    title: "Titipan Notaris",
    accentColor: "#157ec3",
  },
  ASURANSI: {
    icon: HeartPulse,
    title: "Titipan Asuransi",
    accentColor: "#0f766e",
  },
  ANGSURAN: {
    icon: Banknote,
    title: "Titipan Angsuran",
    accentColor: "#d97706",
  },
  LAINNYA: {
    icon: Wallet,
    title: "Titipan Lainnya",
    accentColor: "#6366f1",
  },
};

const jenisOrder: JenisTitipan[] = ["NOTARIS", "ASURANSI", "ANGSURAN", "LAINNYA"];

function normalizeJenisTitipan(value: string): JenisTitipan | null {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "NOTARIS" ||
    normalized === "ASURANSI" ||
    normalized === "ANGSURAN" ||
    normalized === "LAINNYA"
  ) {
    return normalized;
  }

  return null;
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
  if (["SELESAI", "TERUPLOAD", "DISETUJUI", "DIBAYAR", "CAIR", "APPROVED", "DONE", "COMPLETED"].includes(normalized)) return "Selesai";
  if (["GAGAL", "DITOLAK", "BERMASALAH"].includes(normalized)) return "Ditolak";
  if (normalized === "EXPIRED") return "Expired";
  return normalizeDisplay(normalized);
}

function depositAmount(row: LegalDepositFundsReport, key: "deposit" | "payment" | "refund" | "balance") {
  if (key === "deposit") return row.total_deposit_amount ?? row.nominal;
  if (key === "payment") return row.total_payment_amount ?? row.paid_amount;
  if (key === "refund") return row.total_refund_amount ?? row.processed_amount;
  return row.balance_amount ?? row.remaining_amount;
}

function createEmptySummary(jenisTitipan: JenisTitipan): TitipanSummaryItem {
  return {
    jenisTitipan,
    totalTitipan: 0,
    totalPembayaran: 0,
    totalRefund: 0,
    saldoAkhir: 0,
    jumlahTitipan: 0,
  };
}

function mapDepositSummary(rows: LegalDepositFundsReport[]): TitipanSummaryItem[] {
  const summaries = new Map<JenisTitipan, TitipanSummaryItem>(
    jenisOrder.map((jenisTitipan) => [
      jenisTitipan,
      createEmptySummary(jenisTitipan),
    ]),
  );

  rows.forEach((row) => {
    const jenisTitipan = normalizeJenisTitipan(row.type);
    if (!jenisTitipan) return;

    const summary = summaries.get(jenisTitipan)!;
    summary.totalTitipan += depositAmount(row, "deposit");
    summary.totalPembayaran += depositAmount(row, "payment");
    summary.totalRefund += depositAmount(row, "refund");
    summary.saldoAkhir += depositAmount(row, "balance");
    summary.jumlahTitipan += row.total_records;
  });

  return jenisOrder.map((jenisTitipan) => summaries.get(jenisTitipan)!);
}

function rowsByType(rows: LegalDepositFundsReport[], jenisTitipan: JenisTitipan | null) {
  if (!jenisTitipan) return [];
  return rows.filter((row) => normalizeJenisTitipan(row.type) === jenisTitipan);
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
      <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function LaporanTitipanSection({
  widget,
}: {
  widget?: DashboardMenuNode;
}) {
  const [rows, setRows] = useState<LegalDepositFundsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedJenisTitipan, setSelectedJenisTitipan] =
    useState<JenisTitipan | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await legalService.getThirdPartyDepositFundsReport();
        if (!ignore) setRows(result);
      } catch (error) {
        if (!ignore) {
          setRows([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan dana titipan",
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

  const titipanSummary = useMemo(() => mapDepositSummary(rows), [rows]);
  const selectedSummary = useMemo(
    () => titipanSummary.find((item) => item.jenisTitipan === selectedJenisTitipan) ?? null,
    [titipanSummary, selectedJenisTitipan],
  );
  const modalRows = useMemo(
    () => rowsByType(rows, selectedJenisTitipan),
    [rows, selectedJenisTitipan],
  );
  const selectedMeta = selectedJenisTitipan ? jenisMeta[selectedJenisTitipan] : null;

  return (
    <>
      <section className="animate-fade-in">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Wallet className="h-6 w-6 text-gray-600" aria-hidden="true" />
            {widget?.name ?? "Laporan Dana Titipan"}
          </h2>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {titipanSummary.map((item, index) => {
            const meta = jenisMeta[item.jenisTitipan];
            const SummaryIcon = meta.icon;
            const hasBalance = item.saldoAkhir > 0;

            return (
              <button
                type="button"
                key={item.jenisTitipan}
                onClick={() => setSelectedJenisTitipan(item.jenisTitipan)}
                className="group animate-slide-up rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[rgba(21,126,195,0.42)] hover:bg-gray-50"
                style={{ animationDelay: `${index * 0.1}s` }}
                title={`Lihat ${meta.title}`}
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
                      <SummaryIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-gray-900">
                        {meta.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-[7.375rem] shrink-0 flex-col items-end text-right">
                    <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
                      Jumlah Titipan
                    </span>
                    <span className="text-xl font-bold tabular-nums text-gray-800">
                      {isLoading ? "-" : formatNumber(item.jumlahTitipan)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      <Wallet className="h-4 w-4 text-gray-500" aria-hidden="true" />
                      Total Titipan
                    </span>
                    <span className="font-semibold text-gray-800">
                      {isLoading ? "-" : formatRupiah(item.totalTitipan)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      Total Pembayaran
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {isLoading ? "-" : formatRupiah(item.totalPembayaran)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className={`flex items-center gap-2 ${hasBalance ? "text-red-600" : "text-emerald-700"}`}>
                      <Clock className={`h-4 w-4 ${hasBalance ? "text-red-600" : "text-emerald-600"}`} aria-hidden="true" />
                      Saldo Akhir
                    </span>
                    <span className={`font-semibold ${hasBalance ? "text-red-600" : "text-emerald-600"}`}>
                      {isLoading ? "-" : hasBalance ? formatRupiah(item.saldoAkhir) : "Lunas"}
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
        isOpen={selectedJenisTitipan !== null}
        title={selectedMeta?.title ?? "Laporan Dana Titipan"}
        description="Rekap ledger titipan, pembayaran, refund, dan saldo akhir."
        maxWidth="5xl"
        bodyClassName="space-y-5 p-4 sm:p-5"
        onClose={() => setSelectedJenisTitipan(null)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetricCard
            icon={Wallet}
            label="Total Titipan"
            value={isLoading ? "-" : formatRupiah(selectedSummary?.totalTitipan ?? 0)}
          />
          <SummaryMetricCard
            icon={CheckCircle}
            label="Total Pembayaran"
            value={isLoading ? "-" : formatRupiah(selectedSummary?.totalPembayaran ?? 0)}
            tone="success"
          />
          <SummaryMetricCard
            icon={RotateCcw}
            label="Total Refund"
            value={isLoading ? "-" : formatRupiah(selectedSummary?.totalRefund ?? 0)}
          />
          <SummaryMetricCard
            icon={Clock}
            label="Saldo Akhir"
            value={isLoading ? "-" : (selectedSummary?.saldoAkhir ?? 0) > 0 ? formatRupiah(selectedSummary?.saldoAkhir ?? 0) : "Lunas"}
            tone={(selectedSummary?.saldoAkhir ?? 0) > 0 ? "danger" : "success"}
          />
        </div>

        <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className="min-w-[920px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Total Data</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Total Titipan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pembayaran</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Refund</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Saldo Akhir</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {modalRows.map((item, index) => (
                <SetupDataTableRow key={`${item.type}-${item.status}-${index}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{index + 1}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>{formatNumber(item.total_records)}</SetupDataTableCell>
                  <SetupDataTableCell><SetupTableMoney>{formatRupiah(depositAmount(item, "deposit"))}</SetupTableMoney></SetupDataTableCell>
                  <SetupDataTableCell><SetupTableMoney>{formatRupiah(depositAmount(item, "payment"))}</SetupTableMoney></SetupDataTableCell>
                  <SetupDataTableCell><SetupTableMoney>{formatRupiah(depositAmount(item, "refund"))}</SetupTableMoney></SetupDataTableCell>
                  <SetupDataTableCell><SetupTableMoney>{formatRupiah(depositAmount(item, "balance"))}</SetupTableMoney></SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {isLoading ? <SetupDataTableEmptyRow colSpan={7}>Memuat laporan dana titipan...</SetupDataTableEmptyRow> : null}
              {!isLoading && modalRows.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={7}
                  tone="legal"
                  description="Laporan akan terisi dari transaksi dana titipan pada modul Legal."
                >
                  Belum ada laporan untuk jenis titipan ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </DashboardModal>
    </>
  );
}
