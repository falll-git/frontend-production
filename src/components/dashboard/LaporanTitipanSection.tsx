"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileSignature,
  HeartPulse,
  RotateCcw,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { LegalDepositDetailContent } from "@/components/legal/LegalRecordDetailContent";
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
  SetupTableMoney,
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
import {
  deriveDocumentFileName,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import { legalService } from "@/services/legal.service";
import type { PaginationMeta } from "@/types/api.types";
import type { DebtorFileMeta } from "@/types/debitur.types";
import type {
  LegalDeposit,
  LegalDepositFundsReport,
} from "@/types/legal.types";
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

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: SETUP_TABLE_PAGE_SIZE,
  total: 0,
  lastPage: 1,
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
    accentEndColor: string;
    shadowColor: string;
  }
> = {
  NOTARIS: {
    icon: FileSignature,
    title: "Titipan Notaris",
    accentColor: "#157ec3",
    accentEndColor: "#0d5a8f",
    shadowColor: "rgba(21, 126, 195, 0.22)",
  },
  ASURANSI: {
    icon: HeartPulse,
    title: "Titipan Asuransi",
    accentColor: "#0f766e",
    accentEndColor: "#0d5f59",
    shadowColor: "rgba(15, 118, 110, 0.22)",
  },
  ANGSURAN: {
    icon: Banknote,
    title: "Titipan Angsuran",
    accentColor: "#d97706",
    accentEndColor: "#b45309",
    shadowColor: "rgba(217, 119, 6, 0.22)",
  },
  LAINNYA: {
    icon: Wallet,
    title: "Titipan Lainnya",
    accentColor: "#6366f1",
    accentEndColor: "#4f46e5",
    shadowColor: "rgba(99, 102, 241, 0.22)",
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

function parameterName(record: Record<string, unknown> | null | undefined) {
  const value = record?.name ?? record?.label;
  return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function depositTypeName(item: LegalDeposit) {
  const configuredName = parameterName(item.deposit_type);
  return configuredName === "-" ? normalizeDisplay(item.type) : configuredName;
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
      <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function LaporanTitipanSection({
  widget,
}: {
  widget?: DashboardMenuNode;
}) {
  const { openPreview } = useDocumentPreviewContext();
  const [rows, setRows] = useState<LegalDepositFundsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedJenisTitipan, setSelectedJenisTitipan] =
    useState<JenisTitipan | null>(null);
  const [depositRecords, setDepositRecords] = useState<LegalDeposit[]>([]);
  const [depositMeta, setDepositMeta] = useState<PaginationMeta>(EMPTY_META);
  const [depositPage, setDepositPage] = useState(1);
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [depositErrorMessage, setDepositErrorMessage] = useState<string | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<LegalDeposit | null>(null);

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

  useEffect(() => {
    if (!selectedJenisTitipan) {
      setDepositRecords([]);
      setDepositMeta(EMPTY_META);
      setDepositErrorMessage(null);
      return;
    }

    let ignore = false;
    const typeToLoad = selectedJenisTitipan;

    async function loadDeposits() {
      try {
        setIsDepositLoading(true);
        setDepositErrorMessage(null);
        setDepositRecords([]);
        const result = await legalService.getDepositsPage({
          page: depositPage,
          limit: SETUP_TABLE_PAGE_SIZE,
          type: typeToLoad,
        });

        if (!ignore) {
          setDepositRecords(result.items);
          setDepositMeta(result.meta);
        }
      } catch (error) {
        if (!ignore) {
          setDepositRecords([]);
          setDepositMeta({ ...EMPTY_META, page: depositPage });
          setDepositErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat detail dana titipan",
          );
        }
      } finally {
        if (!ignore) setIsDepositLoading(false);
      }
    }

    void loadDeposits();

    return () => {
      ignore = true;
    };
  }, [depositPage, selectedJenisTitipan]);

  const titipanSummary = useMemo(() => mapDepositSummary(rows), [rows]);
  const selectedSummary = useMemo(
    () => titipanSummary.find((item) => item.jenisTitipan === selectedJenisTitipan) ?? null,
    [titipanSummary, selectedJenisTitipan],
  );
  const selectedMeta = selectedJenisTitipan ? jenisMeta[selectedJenisTitipan] : null;

  const openDepositSummary = (type: JenisTitipan) => {
    setSelectedJenisTitipan(type);
    setDepositPage(1);
    setDetailTarget(null);
  };

  const closeDepositSummary = () => {
    setSelectedJenisTitipan(null);
    setDepositPage(1);
    setDetailTarget(null);
  };

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

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {titipanSummary.map((item, index) => {
            const meta = jenisMeta[item.jenisTitipan];
            const SummaryIcon = meta.icon;
            const hasBalance = item.saldoAkhir > 0;

            return (
              <button
                type="button"
                key={item.jenisTitipan}
                onClick={() => openDepositSummary(item.jenisTitipan)}
                className="group rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50/30"
                style={{ animationDelay: `${index * 0.1}s` }}
                title={`Lihat ${meta.title}`}
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
                      <SummaryIcon className="h-7 w-7 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-gray-900">
                        {meta.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-[7.375rem] shrink-0 flex-col items-end text-right">
                    <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-700">
                      Jumlah Titipan
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-gray-800">
                      {isLoading ? "-" : formatNumber(item.jumlahTitipan)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Wallet className="h-4 w-4 text-gray-500" aria-hidden="true" />
                      Total Titipan
                    </span>
                    <span className="font-semibold text-gray-800">
                      {isLoading ? "-" : formatRupiah(item.totalTitipan)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle className="h-4 w-4 text-emerald-800" aria-hidden="true" />
                      Total Pembayaran
                    </span>
                    <span className="font-semibold text-emerald-800">
                      {isLoading ? "-" : formatRupiah(item.totalPembayaran)}
                    </span>
                  </div>
                  <div className="my-3 h-px w-full bg-gray-200" />
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className={`flex items-center gap-2 ${hasBalance ? "text-red-700" : "text-emerald-800"}`}>
                      <Clock className={`h-4 w-4 ${hasBalance ? "text-red-700" : "text-emerald-800"}`} aria-hidden="true" />
                      Saldo Akhir
                    </span>
                    <span className={`font-semibold ${hasBalance ? "text-red-700" : "text-emerald-800"}`}>
                      {isLoading ? "-" : formatRupiah(item.saldoAkhir)}
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
        isOpen={selectedJenisTitipan !== null && detailTarget === null}
        title={selectedMeta?.title ?? "Laporan Dana Titipan"}
        description="Rekap ledger titipan, pembayaran, refund, dan saldo akhir."
        maxWidth="5xl"
        bodyClassName="max-h-[78vh] space-y-5 overflow-y-auto p-4 sm:p-5"
        onClose={closeDepositSummary}
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
            value={isLoading ? "-" : formatRupiah(selectedSummary?.saldoAkhir ?? 0)}
            tone={(selectedSummary?.saldoAkhir ?? 0) > 0 ? "danger" : "success"}
          />
        </div>

        {depositErrorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {depositErrorMessage}
          </div>
        ) : null}

        <SetupTableCard variant="report">
          <SetupDataTable
            variant="report"
            density="compact"
            className="min-w-[1540px]"
          >
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Total Titipan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pembayaran</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Refund</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Saldo Akhir</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {depositRecords.map((item, index) => (
                <SetupDataTableRow
                  key={item.id}
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
                  title="Double-click untuk melihat detail dana titipan"
                  onDoubleClick={() => setDetailTarget(item)}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(depositMeta.page - 1) * depositMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableCode>{item.contract?.no_kontrak ?? "-"}</SetupTableCode>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTablePrimaryText>
                      {item.contract?.debtor?.name ?? "-"}
                    </SetupTablePrimaryText>
                  </SetupDataTableCell>
                  <SetupDataTableCell>{depositTypeName(item)}</SetupDataTableCell>
                  <SetupDataTableCell>
                    {parameterName(item.third_party)}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableMoney>
                      {formatRupiah(item.total_deposit_amount ?? item.nominal)}
                    </SetupTableMoney>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableMoney>
                      {formatRupiah(item.total_payment_amount ?? item.paid_amount)}
                    </SetupTableMoney>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableMoney>
                      {formatRupiah(item.total_refund_amount ?? item.processed_amount)}
                    </SetupTableMoney>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableMoney>
                      {formatRupiah(item.balance_amount ?? item.remaining_amount)}
                    </SetupTableMoney>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <div
                      className="flex items-center justify-center"
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <SetupActionMenu
                        label={`Buka aksi dana titipan ${item.contract?.no_kontrak ?? ""}`}
                        menuLabel={`Aksi dana titipan ${item.contract?.no_kontrak ?? ""}`}
                        items={[
                          {
                            key: "detail",
                            label: "Detail",
                            icon: Eye,
                            tone: "blue",
                            onClick: () => setDetailTarget(item),
                          },
                        ]}
                      />
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {isDepositLoading ? (
                <SetupDataTableEmptyRow colSpan={11}>
                  Memuat detail dana titipan...
                </SetupDataTableEmptyRow>
              ) : null}
              {!isDepositLoading && !depositErrorMessage && depositRecords.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={11}
                  tone="legal"
                  description="Data detail akan terisi dari record dana titipan pada modul Legal."
                >
                  Belum ada laporan untuk jenis titipan ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
          <Pagination
            page={depositMeta.page}
            lastPage={depositMeta.lastPage}
            total={depositMeta.total}
            limit={depositMeta.limit}
            isLoading={isDepositLoading}
            onPageChange={setDepositPage}
          />
        </SetupTableCard>
      </DashboardModal>

      <DashboardModal
        isOpen={detailTarget !== null}
        title="Detail Dana Titipan"
        description={detailTarget?.contract?.no_kontrak}
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
        {detailTarget ? (
          <LegalDepositDetailContent
            item={detailTarget}
            onOpenFile={(file) => openLegalFile(file, openPreview)}
          />
        ) : null}
      </DashboardModal>
    </>
  );
}
