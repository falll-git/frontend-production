"use client";

import type { ReactNode } from "react";

import SetupFilePreviewGroup from "@/components/ui/SetupFilePreviewGroup";
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
import type { ParameterMasterRecord } from "@/services/parameter-master.service";
import type { DebtorCollateral, DebtorFileMeta } from "@/types/debitur.types";
import type {
  LegalClaim,
  LegalDeposit,
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

function LegalAmountItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-700">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
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
    <>
      <SetupRecordDetailSection
        title="Kontrak dan Pihak Ketiga"
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
      <SetupRecordDetailSection
        title="Detail Progress"
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
      <SetupRecordDetailSection
        title="Dokumen"
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
    </>
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
    <>
      <SetupRecordDetailSection
        title="Kontrak dan Klaim"
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
      <SetupRecordDetailSection
        title="Nilai dan Realisasi"
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
        ]}
      />
      <SetupRecordDetailSection
        title="Catatan dan File"
        rows={[
          { label: "Alasan Ditolak", value: item.rejection_reason || "-" },
          { label: "Catatan", value: item.notes || "-" },
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
    </>
  );
}

export function LegalDepositDetailContent({
  item,
  onOpenFile,
}: {
  item: LegalDeposit;
  onOpenFile: LegalFileOpenHandler;
}) {
  return (
    <>
      <SetupRecordDetailSection
        title="Relasi Titipan"
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
          { label: "Catatan", value: item.notes || "-" },
        ]}
      />
      <div className="grid gap-3 md:grid-cols-4">
        <LegalAmountItem
          label="Total Titipan"
          value={formatCurrency(item.total_deposit_amount ?? item.nominal)}
        />
        <LegalAmountItem
          label="Pembayaran"
          value={formatCurrency(item.total_payment_amount ?? item.paid_amount)}
        />
        <LegalAmountItem
          label="Refund"
          value={formatCurrency(item.total_refund_amount ?? item.processed_amount)}
        />
        <LegalAmountItem
          label="Saldo Akhir"
          value={formatCurrency(item.balance_amount ?? item.remaining_amount)}
        />
      </div>
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-500">
          Riwayat Transaksi
        </h3>
        <SetupTableCard variant="nested">
          <SetupDataTable
            variant="nested"
            density="compact"
            className="min-w-[760px]"
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
                <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
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
              {item.transactions.map((transaction, index) => (
                <SetupDataTableRow
                  key={transaction.id}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}
                  >
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {formatDateOnly(transaction.transaction_date)}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {depositActionLabel(transaction.action)}
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
              {item.transactions.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={6}>
                  Belum ada transaksi pada dana titipan ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </section>
    </>
  );
}
