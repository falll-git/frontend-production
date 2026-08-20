export type DepositTransactionSource =
  | "OPENING_BALANCE"
  | "MANUAL_ENTRY"
  | "LEGACY_MIGRATION"
  | "SYSTEM_IMPORT"
  | string;

export type DepositLedgerTotals = {
  total_deposit_amount: number;
  total_payment_amount: number;
  total_refund_amount: number;
  balance_amount: number;
};

export type DepositLedgerSourceSummary = {
  source: DepositTransactionSource;
  transaction_count: number;
  total_amount: number;
};

export type DepositLedgerReconciliation = {
  status: "MATCHED" | "MISMATCH";
  stored_totals: DepositLedgerTotals;
  differences: DepositLedgerTotals;
  message: string;
};

export type DepositLedgerSnapshot = DepositLedgerTotals & {
  status: "PENDING" | "AKTIF" | "SELESAI" | string;
  formula_code: string;
  formula_label: string;
  transaction_count: number;
  visible_transaction_count: number;
  history_complete: boolean;
  source_summary: DepositLedgerSourceSummary[];
  reconciliation: DepositLedgerReconciliation;
};
