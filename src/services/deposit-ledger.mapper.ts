import {
  isRecord,
  readBoolean,
  readNumber,
  readString,
} from "@/services/api.utils";
import type {
  DepositLedgerSnapshot,
  DepositLedgerTotals,
  DepositTransactionSource,
} from "@/types/deposit-ledger.types";

function mapTotals(value: unknown): DepositLedgerTotals {
  const item = isRecord(value) ? value : {};
  return {
    total_deposit_amount: readNumber(item, "total_deposit_amount") ?? 0,
    total_payment_amount: readNumber(item, "total_payment_amount") ?? 0,
    total_refund_amount: readNumber(item, "total_refund_amount") ?? 0,
    balance_amount: readNumber(item, "balance_amount") ?? 0,
  };
}

export function mapDepositTransactionSource(
  value: unknown,
): DepositTransactionSource {
  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : "MANUAL_ENTRY";
}

export function mapDepositLedgerSnapshot(
  value: unknown,
): DepositLedgerSnapshot | null {
  if (!isRecord(value)) return null;
  const reconciliation = isRecord(value.reconciliation)
    ? value.reconciliation
    : {};
  const sourceSummary = Array.isArray(value.source_summary)
    ? value.source_summary.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        return [
          {
            source: mapDepositTransactionSource(entry.source),
            transaction_count: readNumber(entry, "transaction_count") ?? 0,
            total_amount: readNumber(entry, "total_amount") ?? 0,
          },
        ];
      })
    : [];

  return {
    ...mapTotals(value),
    status: readString(value, "status") ?? "PENDING",
    formula_code: readString(value, "formula_code") ?? "",
    formula_label:
      readString(value, "formula_label") ??
      "Saldo akhir = Total titipan - Total pembayaran - Total refund",
    transaction_count: readNumber(value, "transaction_count") ?? 0,
    visible_transaction_count:
      readNumber(value, "visible_transaction_count") ?? 0,
    history_complete: readBoolean(value, "history_complete") ?? false,
    source_summary: sourceSummary,
    reconciliation: {
      status:
        readString(reconciliation, "status") === "MISMATCH"
          ? "MISMATCH"
          : "MATCHED",
      stored_totals: mapTotals(reconciliation.stored_totals),
      differences: mapTotals(reconciliation.differences),
      message: readString(reconciliation, "message") ?? "",
    },
  };
}
