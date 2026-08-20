const LEGAL_AUDIT_ENTITY_LABELS: Record<string, string> = {
  LEGAL_NOTARY_PROGRESS: "Progress Notaris",
  LEGAL_INSURANCE_PROGRESS: "Progress Asuransi",
  LEGAL_KJPP_PROGRESS: "Progress KJPP",
  LEGAL_CLAIM: "Klaim Asuransi",
  LEGAL_CLAIMS: "Klaim Asuransi",
  LEGAL_DEPOSIT: "Dana Titipan",
  LEGAL_DEPOSITS: "Dana Titipan",
  LEGAL_DEPOSIT_TRANSACTION: "Transaksi Titipan",
  LEGAL_DEPOSIT_TRANSACTIONS: "Transaksi Titipan",
};

const LEGAL_AUDIT_SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  IMPORT: "Import",
  SYSTEM: "Sistem",
};

const DEPOSIT_TRANSACTION_SOURCE_LABELS: Record<string, string> = {
  OPENING_BALANCE: "Saldo awal",
  LEGACY_MIGRATION: "Migrasi data lama",
  SYSTEM_ADJUSTMENT: "Penyesuaian sistem",
  MANUAL_ENTRY: "Input pengguna",
};

function normalizedIdentifier(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export function isInternalLegalAuditMarker(
  value: string | null | undefined,
) {
  const normalized = normalizedIdentifier(value);
  return normalized.includes("SEED") || normalized.includes("FIXTURE");
}

export function getLegalAuditEntityLabel(
  value: string | null | undefined,
) {
  const normalized = normalizedIdentifier(value);
  return LEGAL_AUDIT_ENTITY_LABELS[normalized] ?? "Aktivitas Legal";
}

export function getLegalAuditSourceLabel(
  value: string | null | undefined,
) {
  const normalized = normalizedIdentifier(value);
  if (isInternalLegalAuditMarker(normalized)) return "Sistem";
  return LEGAL_AUDIT_SOURCE_LABELS[normalized] ?? "Sistem";
}

export function getDepositTransactionSourceLabel(
  value: string | null | undefined,
) {
  const normalized = normalizedIdentifier(value);
  return DEPOSIT_TRANSACTION_SOURCE_LABELS[normalized] ?? "Sistem";
}
