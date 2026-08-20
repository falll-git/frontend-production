import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DepositLedgerTraceability, {
  depositTransactionSourceLabel,
} from "@/components/legal/DepositLedgerTraceability";
import type { DepositLedgerSnapshot } from "@/types/deposit-ledger.types";

function ledgerFixture(
  overrides: Partial<DepositLedgerSnapshot> = {},
): DepositLedgerSnapshot {
  return {
    status: "AKTIF",
    formula_code:
      "TOTAL_TITIPAN_MINUS_TOTAL_PEMBAYARAN_MINUS_TOTAL_REFUND",
    formula_label:
      "Saldo akhir = Total titipan - Total pembayaran - Total refund",
    total_deposit_amount: 10_000_000,
    total_payment_amount: 0,
    total_refund_amount: 0,
    balance_amount: 10_000_000,
    transaction_count: 1,
    visible_transaction_count: 1,
    history_complete: true,
    source_summary: [
      {
        source: "SYSTEM_IMPORT",
        transaction_count: 1,
        total_amount: 10_000_000,
      },
    ],
    reconciliation: {
      status: "MATCHED",
      stored_totals: {
        total_deposit_amount: 10_000_000,
        total_payment_amount: 0,
        total_refund_amount: 0,
        balance_amount: 10_000_000,
      },
      differences: {
        total_deposit_amount: 0,
        total_payment_amount: 0,
        total_refund_amount: 0,
        balance_amount: 0,
      },
      message: "Agregat tersimpan cocok dengan ledger transaksi.",
    },
    ...overrides,
  };
}

describe("DepositLedgerTraceability", () => {
  it("menjelaskan formula, sumber transaksi, dan kondisi ledger yang cocok", () => {
    render(
      <DepositLedgerTraceability
        item={{
          nominal: 10_000_000,
          paid_amount: 0,
          processed_amount: 0,
          remaining_amount: 10_000_000,
          ledger: ledgerFixture(),
        }}
      />,
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.replace(/\s/g, "") ===
            "Rp10.000.000-Rp0-Rp0=Rp10.000.000",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Impor sistem")).toBeInTheDocument();
    expect(
      screen.getByText("Ringkasan cocok dengan seluruh transaksi pada ledger."),
    ).toBeInTheDocument();
  });

  it("memperingatkan perbedaan agregat lama tanpa mengubah angka ledger", () => {
    render(
      <DepositLedgerTraceability
        item={{
          nominal: 10_000_000,
          paid_amount: 5_000_000,
          processed_amount: 5_000_000,
          remaining_amount: 5_000_000,
          ledger: ledgerFixture({
            reconciliation: {
              status: "MISMATCH",
              stored_totals: {
                total_deposit_amount: 10_000_000,
                total_payment_amount: 5_000_000,
                total_refund_amount: 5_000_000,
                balance_amount: 5_000_000,
              },
              differences: {
                total_deposit_amount: 0,
                total_payment_amount: 5_000_000,
                total_refund_amount: 5_000_000,
                balance_amount: -5_000_000,
              },
              message: "Agregat tersimpan tidak cocok dengan ledger transaksi.",
            },
          }),
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agregat lama tidak cocok dengan riwayat transaksi.",
    );
    expect(screen.getByRole("alert").textContent?.replace(/\s/g, "")).toContain(
      "pembayaranRp5.000.000",
    );
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.replace(/\s/g, "") ===
            "Rp10.000.000-Rp0-Rp0=Rp10.000.000",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ["OPENING_BALANCE", "Saldo awal"],
    ["LEGACY_MIGRATION", "Migrasi data lama"],
    ["SYSTEM_IMPORT", "Impor sistem"],
    ["MANUAL_ENTRY", "Input pengguna"],
  ])("melabeli sumber %s sebagai %s", (source, expected) => {
    expect(depositTransactionSourceLabel(source)).toBe(expected);
  });
});
