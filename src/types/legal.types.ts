import type { PaginationMeta } from "@/types/api.types";
import type { DebtorContract, DebtorFileMeta, DebtorRecord } from "@/types/debitur.types";
import type { ParameterMasterRecord } from "@/services/parameter-master.service";

export type LegalDocumentType =
  | "AKAD"
  | "HAFTSHEET"
  | "SURAT_PERINGATAN"
  | "FORMULIR_ASURANSI"
  | "SKL"
  | "SAMSAT";

export type LegalPageResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type LegalListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  document_type?: string;
  template_type?: string;
  contract_id?: string;
  third_party_id?: string;
  type?: string;
  deposit_id?: string;
};

export type LegalTemplate = {
  id: string;
  template_type: LegalDocumentType | string;
  version: number;
  title: string;
  content_template: string | null;
  is_active: boolean;
  file: DebtorFileMeta | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LegalPrintHistory = {
  id: string;
  template_id: string | null;
  numbering_template_id: string | null;
  contract_id: string;
  document_type: LegalDocumentType | string;
  generated_number: string;
  payload_snapshot: Record<string, unknown> | null;
  generated_file: DebtorFileMeta | null;
  template: LegalTemplate | null;
  numbering_template: ParameterMasterRecord | null;
  contract: DebtorContract | null;
  printed_at: string | null;
  created_at: string | null;
};

export type LegalIdebUpload = {
  id: string;
  debtor_id: string | null;
  contract_id: string | null;
  month: number;
  year: number;
  status: string;
  result_summary: Record<string, unknown> | null;
  file: DebtorFileMeta | null;
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  created_at: string | null;
};

export type LegalProgressRecord = {
  id: string;
  contract_id: string;
  third_party_id: string;
  deed_type?: string | null;
  received_at?: string | null;
  estimated_completed_at?: string | null;
  completed_at?: string | null;
  insurance_type?: string | null;
  coverage_amount?: number;
  period_start?: string | null;
  period_end?: string | null;
  policy_number?: string | null;
  appraisal_type?: string | null;
  report_number?: string | null;
  collateral_object?: string | null;
  appraisal_value?: number | null;
  status: string;
  deed_number?: string | null;
  notes: string | null;
  file: DebtorFileMeta | null;
  contract: DebtorContract | null;
  third_party: ParameterMasterRecord | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LegalClaim = {
  id: string;
  contract_id: string;
  insurance_progress_id: string | null;
  policy_number: string | null;
  claim_type: string;
  claim_amount: number;
  submitted_at: string | null;
  status: string;
  approved_amount: number | null;
  disbursed_amount: number | null;
  disbursed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  file: DebtorFileMeta | null;
  contract: DebtorContract | null;
  insurance_progress: LegalProgressRecord | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LegalDeposit = {
  id: string;
  deposit_type_id: string | null;
  type: "NOTARIS" | "ASURANSI" | "ANGSURAN" | string;
  contract_id: string;
  third_party_id: string | null;
  nominal: number;
  paid_amount: number;
  processed_amount: number;
  remaining_amount: number;
  status: string;
  notes: string | null;
  deposit_type: ParameterMasterRecord | null;
  contract: DebtorContract | null;
  third_party: ParameterMasterRecord | null;
  transactions: LegalDepositTransaction[];
  created_at: string | null;
  updated_at: string | null;
};

export type LegalDepositTransaction = {
  id: string;
  deposit_id: string;
  transaction_date: string | null;
  action: string;
  amount: number;
  notes: string | null;
  created_at: string | null;
};

export type LegalSummaryReport = {
  templates: number;
  prints: number;
  ideb: number;
  notary: number;
  insurance: number;
  kjpp: number;
  claims: number;
  deposits: number;
};

export type LegalThirdPartyDocumentsReport = {
  notary: Array<Record<string, unknown>>;
  insurance: Array<Record<string, unknown>>;
  kjpp: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
};

export type LegalDepositFundsReport = {
  type: string;
  status: string;
  total_records: number;
  nominal: number;
  paid_amount: number;
  processed_amount: number;
  remaining_amount: number;
};

export type LegalTemplatePayload = {
  template_type: LegalDocumentType | string;
  version?: number;
  title: string;
  content_template?: string | null;
  is_active?: boolean;
  file?: File | null;
};

export type LegalPrintPayload = {
  template_id?: string | null;
  numbering_template_id?: string | null;
  contract_id: string;
  document_type: LegalDocumentType | string;
  payload_snapshot?: Record<string, unknown>;
  generated_number?: string | null;
  file?: File | null;
};

export type LegalIdebPayload = {
  debtor_id?: string | null;
  contract_id?: string | null;
  month: number;
  year: number;
  status?: string;
  result_summary?: Record<string, unknown>;
  file: File;
};

export type LegalNotaryPayload = {
  contract_id: string;
  third_party_id: string;
  deed_type: string;
  received_at: string;
  estimated_completed_at?: string | null;
  completed_at?: string | null;
  status?: string;
  deed_number?: string | null;
  notes?: string | null;
  file?: File | null;
};

export type LegalInsurancePayload = {
  contract_id: string;
  third_party_id: string;
  insurance_type: string;
  coverage_amount?: number;
  period_start: string;
  period_end?: string | null;
  policy_number?: string | null;
  status?: string;
  notes?: string | null;
  file?: File | null;
};

export type LegalKjppPayload = {
  contract_id: string;
  third_party_id: string;
  appraisal_type: string;
  received_at: string;
  estimated_completed_at?: string | null;
  completed_at?: string | null;
  status?: string;
  report_number?: string | null;
  collateral_object?: string | null;
  appraisal_value?: number | null;
  notes?: string | null;
  file?: File | null;
};

export type LegalClaimPayload = {
  contract_id: string;
  insurance_progress_id?: string | null;
  policy_number?: string | null;
  claim_type: string;
  claim_amount?: number;
  submitted_at: string;
  status?: string;
  approved_amount?: number | null;
  disbursed_amount?: number | null;
  disbursed_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  file?: File | null;
};

export type LegalDepositPayload = {
  deposit_type_id?: string | null;
  type: string;
  contract_id: string;
  third_party_id?: string | null;
  nominal: number;
  paid_amount?: number;
  processed_amount?: number;
  remaining_amount?: number | null;
  status?: string;
  notes?: string | null;
};

export type LegalDepositTransactionPayload = {
  deposit_id: string;
  transaction_date: string;
  action: string;
  amount: number;
  notes?: string | null;
};
