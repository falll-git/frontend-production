import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { DepositLedgerSnapshot } from "@/types/deposit-ledger.types";

type LedgerRecord = {
  total_deposit_amount?: number;
  nominal: number;
  total_payment_amount?: number;
  paid_amount: number;
  total_refund_amount?: number;
  processed_amount: number;
  balance_amount?: number;
  remaining_amount: number;
  ledger: DepositLedgerSnapshot | null;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function depositTransactionSourceLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "OPENING_BALANCE") return "Saldo awal";
  if (normalized === "LEGACY_MIGRATION") return "Migrasi data lama";
  if (normalized === "SYSTEM_IMPORT") return "Impor sistem";
  if (normalized === "MANUAL_ENTRY") return "Input pengguna";
  return normalized
    ? normalized
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Input pengguna";
}

function ledgerTotals(item: LedgerRecord) {
  return {
    deposit: item.ledger?.total_deposit_amount ??
      item.total_deposit_amount ??
      item.nominal,
    payment: item.ledger?.total_payment_amount ??
      item.total_payment_amount ??
      item.paid_amount,
    refund: item.ledger?.total_refund_amount ??
      item.total_refund_amount ??
      item.processed_amount,
    balance: item.ledger?.balance_amount ??
      item.balance_amount ??
      item.remaining_amount,
  };
}

export default function DepositLedgerTraceability({
  item,
}: {
  item: LedgerRecord;
}) {
  const totals = ledgerTotals(item);
  const mismatch = item.ledger?.reconciliation.status === "MISMATCH";
  const stored = item.ledger?.reconciliation.stored_totals;

  return (
    <section
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
      aria-labelledby="deposit-ledger-formula-title"
    >
      <div className="space-y-1">
        <h3
          id="deposit-ledger-formula-title"
          className="text-sm font-bold uppercase tracking-[0.08em] text-slate-600"
        >
          Dasar Perhitungan Saldo
        </h3>
        <p className="text-sm leading-6 text-slate-600">
          Ringkasan dihitung dari seluruh transaksi pada ledger, bukan dari angka
          manual yang berdiri sendiri.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold tabular-nums text-slate-800">
          <span>{formatCurrency(totals.deposit)}</span>
          <span aria-hidden="true">-</span>
          <span>{formatCurrency(totals.payment)}</span>
          <span aria-hidden="true">-</span>
          <span>{formatCurrency(totals.refund)}</span>
          <span aria-hidden="true">=</span>
          <span>{formatCurrency(totals.balance)}</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Saldo akhir = Total titipan - Total pembayaran - Total refund
        </p>
      </div>

      {item.ledger?.source_summary.length ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            Sumber Transaksi
          </p>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-4">
            {item.ledger.source_summary.map((entry) => (
              <li
                key={entry.source}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm"
              >
                <span className="font-medium text-slate-700">
                  {depositTransactionSourceLabel(entry.source)}
                </span>
                <span className="tabular-nums text-slate-500">
                  {entry.transaction_count} transaksi
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mismatch && stored ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-2">
              <p className="font-semibold">Agregat lama tidak cocok dengan riwayat transaksi.</p>
              <p className="text-sm leading-6">
                Angka yang ditampilkan di ringkasan memakai ledger transaksi.
                Nilai agregat tersimpan tetap dipertahankan untuk pemeriksaan dan
                tidak diubah otomatis.
              </p>
              <p className="text-xs leading-5 text-amber-900">
                Agregat tersimpan: titipan {formatCurrency(stored.total_deposit_amount)},
                pembayaran {formatCurrency(stored.total_payment_amount)}, refund{" "}
                {formatCurrency(stored.total_refund_amount)}, saldo{" "}
                {formatCurrency(stored.balance_amount)}.
              </p>
            </div>
          </div>
        </div>
      ) : item.ledger ? (
        <div className="flex items-start gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ringkasan cocok dengan seluruh transaksi pada ledger.</span>
        </div>
      ) : (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          role="status"
        >
          Status rekonsiliasi belum tersedia. Muat ulang setelah backend terbaru
          aktif.
        </div>
      )}
    </section>
  );
}
