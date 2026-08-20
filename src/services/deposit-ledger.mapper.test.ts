import { describe, expect, it } from "vitest";

import {
  mapDepositLedgerSnapshot,
  mapDepositTransactionSource,
} from "@/services/deposit-ledger.mapper";

describe("deposit ledger mapper", () => {
  it("memetakan snapshot ledger dan rekonsiliasi tanpa kehilangan sumber", () => {
    const result = mapDepositLedgerSnapshot({
      status: "AKTIF",
      formula_code: "FORMULA",
      formula_label: "Formula saldo",
      total_deposit_amount: "10000000",
      total_payment_amount: 0,
      total_refund_amount: 0,
      balance_amount: 10000000,
      transaction_count: 1,
      visible_transaction_count: 1,
      history_complete: true,
      source_summary: [
        {
          source: "system_import",
          transaction_count: 1,
          total_amount: 10000000,
        },
      ],
      reconciliation: {
        status: "MISMATCH",
        stored_totals: {
          total_deposit_amount: 10000000,
          total_payment_amount: 5000000,
          total_refund_amount: 5000000,
          balance_amount: 5000000,
        },
        differences: {
          total_deposit_amount: 0,
          total_payment_amount: 5000000,
          total_refund_amount: 5000000,
          balance_amount: -5000000,
        },
        message: "Perlu rekonsiliasi",
      },
    });

    expect(result).toMatchObject({
      status: "AKTIF",
      total_deposit_amount: 10000000,
      balance_amount: 10000000,
      history_complete: true,
      source_summary: [
        {
          source: "SYSTEM_IMPORT",
          transaction_count: 1,
        },
      ],
      reconciliation: {
        status: "MISMATCH",
        stored_totals: {
          total_payment_amount: 5000000,
        },
      },
    });
  });

  it("menggunakan input pengguna sebagai fallback sumber kosong", () => {
    expect(mapDepositTransactionSource(null)).toBe("MANUAL_ENTRY");
    expect(mapDepositLedgerSnapshot(null)).toBeNull();
  });
});
