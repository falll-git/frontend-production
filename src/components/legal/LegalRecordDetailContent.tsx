"use client";

import { useEffect, useState } from "react";

import DepositLedgerTraceability, {
  depositTransactionSourceLabel,
} from "@/components/legal/DepositLedgerTraceability";
import Pagination from "@/components/ui/Pagination";
import SetupFilePreviewGroup from "@/components/ui/SetupFilePreviewGroup";
import SetupModalDetailLayout from "@/components/ui/SetupModalDetailLayout";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCard,
  SetupTableMoney,
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
import { formatDateOnly } from "@/lib/utils/date";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { legalService } from "@/services/legal.service";
import type { ParameterMasterRecord } from "@/services/parameter-master.service";
import type { PaginationMeta } from "@/types/api.types";
import type { DebtorCollateral, DebtorFileMeta } from "@/types/debitur.types";
import type {
  LegalClaim,
  LegalDeposit,
  LegalDepositTransaction,
  LegalProgressRecord,
} from "@/types/legal.types";

export type LegalProgressDetailType = "notary" | "insurance" | "kjpp";

type LegalFileOpenHandler = (file: DebtorFileMeta) => void;

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function getRecordText(
  record: ParameterMasterRecord | null | undefined,
  ...keys: string[]
) {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function collateralOptionLabel(collateral: DebtorCollateral) {
  const type =
    collateral.collateral_type_display ||
    collateral.collateral_type_label ||
    collateral.collateral_type ||
    "Agunan";

  return [
    collateral.collateral_number,
    type,
    collateral.owner_name ? `a.n. ${collateral.owner_name}` : null,
    collateral.proof_number,
  ]
    .filter(Boolean)
    .join(" - ");
}

function statusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (["AKTIF", "ACTIVE"].includes(normalized)) return "Aktif";
  if (["INACTIVE", "NONAKTIF"].includes(normalized)) return "Nonaktif";
  if (["PENDING", "PENGAJUAN"].includes(normalized)) return "Menunggu";
  if (["PROSES", "DIPROSES", "VERIFIKASI"].includes(normalized)) {
    return "Dalam Proses";
  }
  if (
    [
      "SELESAI",
      "TERUPLOAD",
      "DISETUJUI",
      "DIBAYAR",
      "CAIR",
      "APPROVED",
      "DONE",
      "COMPLETED",
    ].includes(normalized)
  ) {
    return "Selesai";
  }
  if (["GAGAL", "DITOLAK", "BERMASALAH"].includes(normalized)) {
    return "Ditolak";
  }
  if (["EXPIRED", "LEWAT_TEMPO", "OVERDUE"].includes(normalized)) {
    return "Expired";
  }
  if (normalized === "KLAIM") return "Klaim";

  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function depositTypeLabel(type: string | null | undefined) {
  const normalized = String(type ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (normalized === "NOTARIS") return "Titipan Notaris";
  if (normalized === "ASURANSI") return "Titipan Asuransi";
  if (normalized === "ANGSURAN") return "Titipan Angsuran";
  if (normalized === "LAINNYA") return "Titipan Lainnya";
  return statusLabel(normalized);
}

function depositActionLabel(action: string | null | undefined) {
  const normalized = String(action ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (normalized === "TITIPAN") return "Titipan";
  if (["PEMBAYARAN", "BAYAR", "PAID"].includes(normalized)) {
    return "Pembayaran";
  }
  if (["REFUND", "PROSES", "PROCESS", "DIPROSES"].includes(normalized)) {
    return "Refund";
  }
  return statusLabel(normalized);
}

function resolvePreviewFiles(
  files?: DebtorFileMeta[] | null,
  file?: DebtorFileMeta | null,
) {
  const source =
    Array.isArray(files) && files.length > 0 ? files : file ? [file] : [];
  const seen = new Set<string>();

  return source.filter((entry) => {
    if (!entry || (!entry.url && !entry.name)) return false;
    const key = [entry.url ?? "", entry.name ?? ""].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveDepositFiles(item: LegalDeposit) {
  const files = item.transactions.flatMap((transaction) =>
    resolvePreviewFiles(transaction.files, transaction.file),
  );
  const seen = new Set<string>();

  return files.filter((file) => {
    const key = [file.url ?? "", file.name ?? ""].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function LegalProgressDetailContent({
  item,
  type,
  onOpenFile,
}: {
  item: LegalProgressRecord;
  type: LegalProgressDetailType;
  onOpenFile: LegalFileOpenHandler;
}) {
  const isNotary = type === "notary";
  const isKjpp = type === "kjpp";
  const typeLabel = isNotary
    ? "Jenis Akta"
    : isKjpp
      ? "Jenis Penilaian"
      : "Jenis Asuransi";
  const dateLabel = isNotary || isKjpp ? "Tanggal Terima" : "Tanggal Mulai";

  return (
    <SetupModalDetailLayout
      information={
      <SetupRecordDetailSection
        title="Informasi Utama"
        description="Relasi kontrak, debitur, agunan, dan pihak ketiga pada progress ini."
        rows={[
          { label: "Nomor Kontrak", value: item.contract?.no_kontrak ?? "-" },
          { label: "Debitur", value: item.contract?.debtor?.name ?? "-" },
          {
            label: "Agunan",
            value: item.collateral ? collateralOptionLabel(item.collateral) : "-",
          },
          {
            label: "Pihak Ketiga",
            value: getRecordText(item.third_party, "name") || "-",
          },
          {
            label: "Status",
            value: <SetupStatusBadge status={statusLabel(item.status)} />,
          },
        ]}
      />
      }
      details={
      <SetupRecordDetailSection
        title="Detail Progress"
        description="Data operasional progress sesuai jenis layanan legal yang dipilih."
        rows={[
          {
            label: typeLabel,
            value: isNotary
              ? item.deed_type ?? "-"
              : isKjpp
                ? item.appraisal_type ?? "-"
                : item.insurance_type ?? "-",
          },
          {
            label: dateLabel,
            value: formatDateOnly(
              isNotary || isKjpp ? item.received_at : item.period_start,
            ),
          },
          {
            label: isNotary
              ? "Nomor Akta"
              : isKjpp
                ? "Nomor Laporan"
                : "Nomor Polis",
            value: isNotary
              ? item.deed_number ?? "-"
              : isKjpp
                ? item.report_number ?? "-"
                : item.policy_number ?? "-",
          },
          ...(isNotary
            ? [
                {
                  label: "Estimasi Selesai",
                  value: formatDateOnly(item.estimated_completed_at),
                },
                {
                  label: "Tanggal Selesai",
                  value: formatDateOnly(item.completed_at),
                },
              ]
            : isKjpp
              ? [
                  {
                    label: "Objek Jaminan",
                    value: item.collateral_object ?? "-",
                  },
                  {
                    label: "Nilai Taksasi",
                    value: formatCurrency(item.appraisal_value),
                  },
                  {
                    label: "Estimasi Selesai",
                    value: formatDateOnly(item.estimated_completed_at),
                  },
                  {
                    label: "Tanggal Selesai",
                    value: formatDateOnly(item.completed_at),
                  },
                ]
              : [
                  {
                    label: "Periode Berakhir",
                    value: formatDateOnly(item.period_end),
                  },
                  {
                    label: "Nilai Pertanggungan",
                    value: formatCurrency(item.coverage_amount),
                  },
                  {
                    label: "Nilai Premi",
                    value: formatCurrency(item.premium_amount),
                  },
                ]),
          { label: "Catatan", value: item.notes || "-" },
        ]}
      />
      }
      attachments={
      <SetupRecordDetailSection
        title="Lampiran"
        description="File pendukung yang tersimpan pada progress legal ini."
        rows={[
          {
            label: "Jumlah File",
            value: String(resolvePreviewFiles(item.files, item.file).length),
          },
          {
            label: "Aksi",
            value: (
              <SetupFilePreviewGroup
                file={item.file}
                files={item.files}
                onOpen={onOpenFile}
                align="start"
              />
            ),
          },
        ]}
      />
      }
    />
  );
}

export function LegalClaimDetailContent({
  item,
  onOpenFile,
}: {
  item: LegalClaim;
  onOpenFile: LegalFileOpenHandler;
}) {
  return (
    <SetupModalDetailLayout
      information={
      <SetupRecordDetailSection
        title="Informasi Utama"
        description="Relasi kontrak, agunan, polis, dan status klaim asuransi."
        rows={[
          { label: "Nomor Kontrak", value: item.contract?.no_kontrak ?? "-" },
          { label: "Debitur", value: item.contract?.debtor?.name ?? "-" },
          {
            label: "Agunan",
            value: item.collateral ? collateralOptionLabel(item.collateral) : "-",
          },
          {
            label: "Progress Asuransi",
            value:
              item.insurance_progress?.policy_number ||
              item.insurance_progress?.insurance_type ||
              "-",
          },
          { label: "Nomor Polis", value: item.policy_number || "-" },
          {
            label: "Status",
            value: <SetupStatusBadge status={statusLabel(item.status)} />,
          },
        ]}
      />
      }
      details={
        <div className="space-y-6">
      <SetupRecordDetailSection
        title="Detail Klaim"
        description="Nilai pengajuan, persetujuan, pencairan, dan catatan penyelesaian klaim."
        rows={[
          { label: "Jenis Klaim", value: item.claim_type || "-" },
          { label: "Nominal Klaim", value: formatCurrency(item.claim_amount) },
          { label: "Tanggal Pengajuan", value: formatDateOnly(item.submitted_at) },
          {
            label: "Nominal Disetujui",
            value: formatCurrency(item.approved_amount),
          },
          { label: "Nominal Cair", value: formatCurrency(item.disbursed_amount) },
          { label: "Tanggal Cair", value: formatDateOnly(item.disbursed_at) },
          { label: "Alasan Ditolak", value: item.rejection_reason || "-" },
          { label: "Catatan", value: item.notes || "-" },
        ]}
      />
        </div>
      }
      attachments={
      <SetupRecordDetailSection
        title="Lampiran"
        description="File pendukung yang tersimpan pada klaim asuransi ini."
        rows={[
          {
            label: "Jumlah File",
            value: String(resolvePreviewFiles(item.files, item.file).length),
          },
          {
            label: "Aksi File",
            value: (
              <SetupFilePreviewGroup
                file={item.file}
                files={item.files}
                onOpen={onOpenFile}
                align="start"
              />
            ),
          },
        ]}
      />
      }
    />
  );
}

export function LegalDepositDetailContent({
  item,
  onOpenFile,
}: {
  item: LegalDeposit;
  onOpenFile: LegalFileOpenHandler;
}) {
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactions, setTransactions] = useState<LegalDepositTransaction[]>(
    item.transactions,
  );
  const initialTransactionTotal =
    item.ledger?.transaction_count ?? item.transactions.length;
  const isTransactionHistoryComplete =
    !item.ledger || item.ledger.history_complete;
  const [transactionMeta, setTransactionMeta] = useState<PaginationMeta>({
    page: 1,
    limit: SETUP_TABLE_PAGE_SIZE,
    total: initialTransactionTotal,
    lastPage: Math.max(
      1,
      Math.ceil(initialTransactionTotal / SETUP_TABLE_PAGE_SIZE),
    ),
  });
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  useEffect(() => {
    setTransactionPage(1);
    setTransactions(item.transactions);
  }, [item.id, item.transactions]);

  useEffect(() => {
    if (isTransactionHistoryComplete) {
      setTransactionMeta({
        page: 1,
        limit: SETUP_TABLE_PAGE_SIZE,
        total: item.ledger?.transaction_count ?? item.transactions.length,
        lastPage: 1,
      });
      setTransactionError(null);
      return undefined;
    }

    let ignore = false;

    async function loadTransactions() {
      try {
        setIsTransactionLoading(true);
        setTransactionError(null);
        const result = await legalService.getDepositTransactionsPage({
          deposit_id: item.id,
          page: transactionPage,
          limit: SETUP_TABLE_PAGE_SIZE,
        });
        if (ignore) return;
        setTransactions(result.items);
        setTransactionMeta(result.meta);
      } catch (error) {
        if (ignore) return;
        setTransactionError(
          error instanceof Error
            ? error.message
            : "Riwayat transaksi tidak dapat dimuat.",
        );
      } finally {
        if (!ignore) setIsTransactionLoading(false);
      }
    }

    void loadTransactions();
    return () => {
      ignore = true;
    };
  }, [
    isTransactionHistoryComplete,
    item.id,
    item.ledger?.transaction_count,
    item.transactions.length,
    transactionPage,
  ]);

  const attachmentFiles = resolveDepositFiles({ ...item, transactions });

  return (
    <SetupModalDetailLayout
      information={
      <SetupRecordDetailSection
        title="Informasi Utama"
        description="Relasi kontrak, jenis titipan, pihak ketiga, dan status ledger."
        rows={[
          { label: "Nomor Kontrak", value: item.contract?.no_kontrak ?? "-" },
          { label: "Debitur", value: item.contract?.debtor?.name ?? "-" },
          {
            label: "Jenis Titipan",
            value:
              getRecordText(item.deposit_type, "name", "label") ||
              depositTypeLabel(item.type),
          },
          {
            label: "Pihak Ketiga",
            value: getRecordText(item.third_party, "name") || "-",
          },
          {
            label: "Status",
            value: <SetupStatusBadge status={statusLabel(item.status)} />,
          },
        ]}
      />
      }
      details={
        <div className="space-y-6">
          <SetupRecordDetailSection
            title="Detail Dana Titipan"
            description="Ringkasan nilai ledger dan catatan dana titipan."
            rows={[
              {
                label: "Total Titipan",
                value: formatCurrency(item.total_deposit_amount ?? item.nominal),
              },
              {
                label: "Pembayaran",
                value: formatCurrency(item.total_payment_amount ?? item.paid_amount),
              },
              {
                label: "Refund",
                value: formatCurrency(item.total_refund_amount ?? item.processed_amount),
              },
              {
                label: "Saldo Akhir",
                value: formatCurrency(item.balance_amount ?? item.remaining_amount),
              },
              { label: "Catatan", value: item.notes || "-" },
            ]}
          />
          <DepositLedgerTraceability item={item} />
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-500">
            Riwayat Transaksi
          </h3>
          <p className="text-sm leading-6 text-gray-500">
            Pergerakan titipan, pembayaran, dan refund yang membentuk saldo akhir.
          </p>
        </div>
        {transactionError ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {transactionError} Data awal tetap ditampilkan jika tersedia.
          </div>
        ) : null}
        <SetupTableCard variant="nested">
          <SetupDataTable
            variant="nested"
            density="compact"
            className="min-w-[900px]"
          >
            <SetupDataTableHead>
              <SetupDataTableRow
                className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}
              >
                <SetupDataTableHeaderCell
                  className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}
                >
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Transaksi</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Sumber</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Catatan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell
                  className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}
                >
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {transactions.map((transaction, index) => (
                <SetupDataTableRow
                  key={transaction.id}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}
                  >
                    {(transactionMeta.page - 1) * transactionMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {formatDateOnly(transaction.transaction_date)}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {depositActionLabel(transaction.action)}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {depositTransactionSourceLabel(transaction.source)}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableMoney>
                      {formatCurrency(transaction.amount)}
                    </SetupTableMoney>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {transaction.notes || "-"}
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                  >
                    <SetupFilePreviewGroup
                      file={transaction.file}
                      files={transaction.files}
                      label="Lihat File"
                      onOpen={onOpenFile}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {isTransactionLoading ? (
                <SetupDataTableEmptyRow colSpan={7}>
                  Memuat riwayat transaksi...
                </SetupDataTableEmptyRow>
              ) : null}
              {!isTransactionLoading && transactions.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={7}>
                  Belum ada transaksi pada ledger dana titipan ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
          <Pagination
            page={transactionMeta.page}
            lastPage={transactionMeta.lastPage}
            total={transactionMeta.total}
            limit={transactionMeta.limit}
            isLoading={isTransactionLoading}
            onPageChange={setTransactionPage}
          />
        </SetupTableCard>
      </section>
        </div>
      }
      attachments={
        <SetupRecordDetailSection
          title="Lampiran"
          description="File pendukung pada halaman riwayat transaksi yang sedang ditampilkan."
          rows={[
            {
              label: "Jumlah File Halaman Ini",
              value: String(attachmentFiles.length),
            },
            {
              label: "Aksi File",
              value: (
                <SetupFilePreviewGroup
                  files={attachmentFiles}
                  label="Lihat File"
                  onOpen={onOpenFile}
                  align="start"
                />
              ),
            },
          ]}
        />
      }
    />
  );
}
