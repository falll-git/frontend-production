import { describe, expect, it } from "vitest";

import {
  getDepositTransactionSourceLabel,
  getLegalAuditEntityLabel,
  getLegalAuditSourceLabel,
  isInternalLegalAuditMarker,
} from "@/lib/legal-audit-presentation";

describe("presentasi Audit Legal", () => {
  it.each([
    ["legal_deposit_transactions", "Transaksi Titipan"],
    ["LEGAL_DEPOSIT_TRANSACTION", "Transaksi Titipan"],
    ["legal_claims", "Klaim Asuransi"],
    ["LEGAL_CLAIM", "Klaim Asuransi"],
    ["legal_notary_progress", "Progress Notaris"],
  ])("memetakan identifier %s menjadi istilah bisnis", (value, expected) => {
    expect(getLegalAuditEntityLabel(value)).toBe(expected);
  });

  it("menyembunyikan marker seed dan fixture sebagai sumber sistem", () => {
    expect(isInternalLegalAuditMarker("REVIEW_SEED")).toBe(true);
    expect(isInternalLegalAuditMarker("integration_fixture")).toBe(true);
    expect(getLegalAuditSourceLabel("REVIEW_SEED")).toBe("Sistem");
    expect(getLegalAuditSourceLabel("MANUAL")).toBe("Manual");
  });

  it.each([
    ["OPENING_BALANCE", "Saldo awal"],
    ["LEGACY_MIGRATION", "Migrasi data lama"],
    ["SYSTEM_ADJUSTMENT", "Penyesuaian sistem"],
    ["MANUAL_ENTRY", "Input pengguna"],
  ])("memetakan sumber transaksi %s", (value, expected) => {
    expect(getDepositTransactionSourceLabel(value)).toBe(expected);
  });
});
