import api from "@/lib/axios";
import {
  extractList,
  extractRecord,
  readNullableString,
  readNumber,
  readString,
} from "@/services/api.utils";

type UnknownRecord = Record<string, unknown>;

function readFile(record: UnknownRecord): { url?: string; name?: string } | null {
  const fileRaw = record.file;
  if (typeof fileRaw === "object" && fileRaw !== null) {
    return {
      url: readNullableString(fileRaw as UnknownRecord, "url"),
      name: readNullableString(fileRaw as UnknownRecord, "name"),
    };
  }
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LegalTemplate {
  id: string;
  template_type?: string;
  version?: number;
  title?: string;
  content_template?: string;
  is_active?: boolean;
  file?: { url?: string; name?: string } | null;
  created_at?: string;
}

export interface LegalIdeb {
  id: string;
  debtor_id?: string;
  contract_id?: string;
  month?: number;
  year?: number;
  status?: string;
  file?: { url?: string; name?: string } | null;
  created_at?: string;
}

export interface NotaryProgress {
  id: string;
  contract_id?: string;
  third_party_id?: string;
  deed_type?: string;
  deed_number?: string;
  received_at?: string;
  estimated_completed_at?: string;
  completed_at?: string;
  status?: string;
  notes?: string;
  file?: { url?: string; name?: string } | null;
  created_at?: string;
}

export interface InsuranceProgress {
  id: string;
  contract_id?: string;
  third_party_id?: string;
  insurance_type?: string;
  coverage_amount?: number;
  period_start?: string;
  period_end?: string;
  policy_number?: string;
  status?: string;
  notes?: string;
  file?: { url?: string; name?: string } | null;
  created_at?: string;
}

export interface LegalClaim {
  id: string;
  contract_id?: string;
  insurance_progress_id?: string;
  policy_number?: string;
  claim_type?: string;
  claim_amount?: number;
  approved_amount?: number;
  disbursed_amount?: number;
  submitted_at?: string;
  disbursed_at?: string;
  status?: string;
  rejection_reason?: string;
  notes?: string;
  file?: { url?: string; name?: string } | null;
  created_at?: string;
}

export interface LegalDeposit {
  id: string;
  contract_id?: string;
  type?: string;
  nominal?: number;
  paid_amount?: number;
  processed_amount?: number;
  remaining_amount?: number;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface LegalDepositTransaction {
  id: string;
  deposit_id?: string;
  transaction_date?: string;
  action?: string;
  amount?: number;
  notes?: string;
  created_at?: string;
}

export interface LegalSummaryReport {
  templates?: number;
  prints?: number;
  ideb?: number;
  notary?: number;
  insurance?: number;
  claims?: number;
  deposits?: number;
}

export interface LegalThirdPartyDocumentsReport {
  notary: UnknownRecord[];
  insurance: UnknownRecord[];
  claims: UnknownRecord[];
}

export interface LegalThirdPartyDepositFundReport {
  type?: string;
  status?: string;
  total_records?: number;
  nominal?: number;
  paid_amount?: number;
  processed_amount?: number;
  remaining_amount?: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapTemplate(record: UnknownRecord): LegalTemplate | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    template_type: readNullableString(record, "template_type"),
    version: readNumber(record, "version") ?? undefined,
    title: readNullableString(record, "title"),
    content_template: readNullableString(record, "content_template"),
    is_active: typeof record.is_active === "boolean" ? record.is_active : undefined,
    file: readFile(record),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapIdeb(record: UnknownRecord): LegalIdeb | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    debtor_id: readNullableString(record, "debtor_id"),
    contract_id: readNullableString(record, "contract_id"),
    month: readNumber(record, "month") ?? undefined,
    year: readNumber(record, "year") ?? undefined,
    status: readNullableString(record, "status"),
    file: readFile(record),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapNotaryProgress(record: UnknownRecord): NotaryProgress | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    contract_id: readNullableString(record, "contract_id"),
    third_party_id: readNullableString(record, "third_party_id"),
    deed_type: readNullableString(record, "deed_type"),
    deed_number: readNullableString(record, "deed_number"),
    received_at: readNullableString(record, "received_at"),
    estimated_completed_at: readNullableString(record, "estimated_completed_at"),
    completed_at: readNullableString(record, "completed_at"),
    status: readNullableString(record, "status"),
    notes: readNullableString(record, "notes"),
    file: readFile(record),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapInsuranceProgress(record: UnknownRecord): InsuranceProgress | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    contract_id: readNullableString(record, "contract_id"),
    third_party_id: readNullableString(record, "third_party_id"),
    insurance_type: readNullableString(record, "insurance_type"),
    coverage_amount: readNumber(record, "coverage_amount") ?? undefined,
    period_start: readNullableString(record, "period_start"),
    period_end: readNullableString(record, "period_end"),
    policy_number: readNullableString(record, "policy_number"),
    status: readNullableString(record, "status"),
    notes: readNullableString(record, "notes"),
    file: readFile(record),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapClaim(record: UnknownRecord): LegalClaim | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    contract_id: readNullableString(record, "contract_id"),
    insurance_progress_id: readNullableString(record, "insurance_progress_id"),
    policy_number: readNullableString(record, "policy_number"),
    claim_type: readNullableString(record, "claim_type"),
    claim_amount: readNumber(record, "claim_amount") ?? undefined,
    approved_amount: readNumber(record, "approved_amount") ?? undefined,
    disbursed_amount: readNumber(record, "disbursed_amount") ?? undefined,
    submitted_at: readNullableString(record, "submitted_at"),
    disbursed_at: readNullableString(record, "disbursed_at"),
    status: readNullableString(record, "status"),
    rejection_reason: readNullableString(record, "rejection_reason"),
    notes: readNullableString(record, "notes"),
    file: readFile(record),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapDeposit(record: UnknownRecord): LegalDeposit | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    contract_id: readNullableString(record, "contract_id"),
    type: readNullableString(record, "type"),
    nominal: readNumber(record, "nominal") ?? undefined,
    paid_amount: readNumber(record, "paid_amount") ?? undefined,
    processed_amount: readNumber(record, "processed_amount") ?? undefined,
    remaining_amount: readNumber(record, "remaining_amount") ?? undefined,
    status: readNullableString(record, "status"),
    notes: readNullableString(record, "notes"),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapDepositTransaction(record: UnknownRecord): LegalDepositTransaction | null {
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    deposit_id: readNullableString(record, "deposit_id"),
    transaction_date: readNullableString(record, "transaction_date"),
    action: readNullableString(record, "action"),
    amount: readNumber(record, "amount") ?? undefined,
    notes: readNullableString(record, "notes"),
    created_at: readNullableString(record, "created_at"),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const legalService = {
  // Templates
  getTemplates: async (): Promise<LegalTemplate[]> => {
    const res = await api.get("/legal/templates");
    return extractList(res.data).map(mapTemplate).filter((i): i is LegalTemplate => i !== null);
  },
  createTemplate: async (data: FormData): Promise<LegalTemplate> => {
    const res = await api.post("/legal/templates", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapTemplate(record) : null;
    if (!mapped) throw new Error("Respons create template tidak valid");
    return mapped;
  },
  updateTemplate: async (id: string, data: FormData): Promise<LegalTemplate> => {
    const res = await api.put(`/legal/templates/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapTemplate(record) : null;
    if (!mapped) throw new Error("Respons update template tidak valid");
    return mapped;
  },
  removeTemplate: async (id: string): Promise<void> => {
    await api.delete(`/legal/templates/${id}`);
  },

  // Print Documents
  getPrintDocuments: async (): Promise<UnknownRecord[]> => {
    const res = await api.get("/legal/print-documents");
    return extractList(res.data);
  },
  createPrintDocument: async (data: FormData): Promise<UnknownRecord> => {
    const res = await api.post("/legal/print-documents", data);
    return extractRecord(res.data) ?? {};
  },

  // IDEB
  getIdeb: async (): Promise<LegalIdeb[]> => {
    const res = await api.get("/legal/ideb");
    return extractList(res.data).map(mapIdeb).filter((i): i is LegalIdeb => i !== null);
  },
  createIdeb: async (data: FormData): Promise<LegalIdeb> => {
    const res = await api.post("/legal/ideb", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapIdeb(record) : null;
    if (!mapped) throw new Error("Respons upload IDEB tidak valid");
    return mapped;
  },

  // Notary Progress
  getNotaryProgress: async (): Promise<NotaryProgress[]> => {
    const res = await api.get("/legal/progress/notary");
    return extractList(res.data).map(mapNotaryProgress).filter((i): i is NotaryProgress => i !== null);
  },
  createNotaryProgress: async (data: FormData): Promise<NotaryProgress> => {
    const res = await api.post("/legal/progress/notary", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapNotaryProgress(record) : null;
    if (!mapped) throw new Error("Respons create progress notaris tidak valid");
    return mapped;
  },
  updateNotaryProgress: async (id: string, data: FormData): Promise<NotaryProgress> => {
    const res = await api.put(`/legal/progress/notary/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapNotaryProgress(record) : null;
    if (!mapped) throw new Error("Respons update progress notaris tidak valid");
    return mapped;
  },
  removeNotaryProgress: async (id: string): Promise<void> => {
    await api.delete(`/legal/progress/notary/${id}`);
  },

  // Insurance Progress
  getInsuranceProgress: async (): Promise<InsuranceProgress[]> => {
    const res = await api.get("/legal/progress/insurance");
    return extractList(res.data).map(mapInsuranceProgress).filter((i): i is InsuranceProgress => i !== null);
  },
  createInsuranceProgress: async (data: FormData): Promise<InsuranceProgress> => {
    const res = await api.post("/legal/progress/insurance", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapInsuranceProgress(record) : null;
    if (!mapped) throw new Error("Respons create progress asuransi tidak valid");
    return mapped;
  },
  updateInsuranceProgress: async (id: string, data: FormData): Promise<InsuranceProgress> => {
    const res = await api.put(`/legal/progress/insurance/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapInsuranceProgress(record) : null;
    if (!mapped) throw new Error("Respons update progress asuransi tidak valid");
    return mapped;
  },
  removeInsuranceProgress: async (id: string): Promise<void> => {
    await api.delete(`/legal/progress/insurance/${id}`);
  },

  // Claims
  getClaims: async (): Promise<LegalClaim[]> => {
    const res = await api.get("/legal/claims");
    return extractList(res.data).map(mapClaim).filter((i): i is LegalClaim => i !== null);
  },
  createClaim: async (data: FormData): Promise<LegalClaim> => {
    const res = await api.post("/legal/claims", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapClaim(record) : null;
    if (!mapped) throw new Error("Respons create klaim tidak valid");
    return mapped;
  },
  updateClaim: async (id: string, data: FormData): Promise<LegalClaim> => {
    const res = await api.put(`/legal/claims/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapClaim(record) : null;
    if (!mapped) throw new Error("Respons update klaim tidak valid");
    return mapped;
  },
  removeClaim: async (id: string): Promise<void> => {
    await api.delete(`/legal/claims/${id}`);
  },

  // Deposits
  getDeposits: async (): Promise<LegalDeposit[]> => {
    const res = await api.get("/legal/deposits");
    return extractList(res.data).map(mapDeposit).filter((i): i is LegalDeposit => i !== null);
  },
  createDeposit: async (data: object): Promise<LegalDeposit> => {
    const res = await api.post("/legal/deposits", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDeposit(record) : null;
    if (!mapped) throw new Error("Respons create titipan tidak valid");
    return mapped;
  },
  updateDeposit: async (id: string, data: object): Promise<LegalDeposit> => {
    const res = await api.put(`/legal/deposits/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDeposit(record) : null;
    if (!mapped) throw new Error("Respons update titipan tidak valid");
    return mapped;
  },
  removeDeposit: async (id: string): Promise<void> => {
    await api.delete(`/legal/deposits/${id}`);
  },

  // Deposit Transactions
  getDepositTransactions: async (): Promise<LegalDepositTransaction[]> => {
    const res = await api.get("/legal/deposit-transactions");
    return extractList(res.data).map(mapDepositTransaction).filter((i): i is LegalDepositTransaction => i !== null);
  },
  createDepositTransaction: async (data: object): Promise<LegalDepositTransaction> => {
    const res = await api.post("/legal/deposit-transactions", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDepositTransaction(record) : null;
    if (!mapped) throw new Error("Respons create transaksi tidak valid");
    return mapped;
  },

  // Reports
  getSummaryReport: async (): Promise<LegalSummaryReport> => {
    const res = await api.get("/legal/reports/summary");
    const record = extractRecord(res.data);
    if (!record) return {};
    return {
      templates: readNumber(record, "templates") ?? undefined,
      prints: readNumber(record, "prints") ?? undefined,
      ideb: readNumber(record, "ideb") ?? undefined,
      notary: readNumber(record, "notary") ?? undefined,
      insurance: readNumber(record, "insurance") ?? undefined,
      claims: readNumber(record, "claims") ?? undefined,
      deposits: readNumber(record, "deposits") ?? undefined,
    };
  },

  getThirdPartyDocumentsReport: async (): Promise<LegalThirdPartyDocumentsReport> => {
    const res = await api.get("/legal/reports/third-party-documents");
    const record = extractRecord(res.data);
    return {
      notary: Array.isArray(record?.notary) ? record.notary as UnknownRecord[] : [],
      insurance: Array.isArray(record?.insurance) ? record.insurance as UnknownRecord[] : [],
      claims: Array.isArray(record?.claims) ? record.claims as UnknownRecord[] : [],
    };
  },

  getThirdPartyDepositFundsReport: async (): Promise<LegalThirdPartyDepositFundReport[]> => {
    const res = await api.get("/legal/reports/third-party-deposit-funds");
    return extractList(res.data).map((record) => ({
      type: readNullableString(record, "type"),
      status: readNullableString(record, "status"),
      total_records: readNumber(record, "total_records") ?? undefined,
      nominal: readNumber(record, "nominal") ?? undefined,
      paid_amount: readNumber(record, "paid_amount") ?? undefined,
      processed_amount: readNumber(record, "processed_amount") ?? undefined,
      remaining_amount: readNumber(record, "remaining_amount") ?? undefined,
    }));
  },
};
