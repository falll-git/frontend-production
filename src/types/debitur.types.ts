import type { PaginationMeta } from "@/types/api.types";

export type DebtorStatus = "ACTIVE" | "INACTIVE" | string;
export type DebtorContractStatus = "ACTIVE" | "CLOSED" | "INACTIVE" | string;
export type DebtorMarketingKind =
  | "action-plans"
  | "visit-results"
  | "handling-steps";
export type DebtorImportType = "MASTER" | "COLLECTIBILITY" | "SLIK" | "RESTRIK";

export type DebtorFileMeta = {
  name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  original_url?: string | null;
  watermarked_url?: string | null;
};

export type DebtorUserSummary = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  division_id: string | null;
  division_name?: string | null;
};

export type DebtorBranchSummary = {
  id: string;
  code: string | null;
  name: string;
};

export type DebtorParameterSummary = {
  id: string;
  code: string | null;
  name: string;
  level?: number | null;
  is_npf?: boolean | null;
};

export type DebtorCollectibilitySummary = {
  id: string;
  period_month: string | null;
  kol_level_id?: string | null;
  level: number | null;
  code: string | null;
  name: string | null;
  is_npf: boolean;
  outstanding_pokok: number;
  outstanding_margin: number;
  dpd: number | null;
  notes: string | null;
  created_at?: string | null;
};

export type DebtorContract = {
  id: string;
  no_kontrak: string;
  debtor_id: string;
  debtor: DebtorRecord | null;
  product_id: string | null;
  akad_type_id: string | null;
  branch_id: string | null;
  marketing_user_id: string | null;
  tanggal_akad: string | null;
  tanggal_jatuh_tempo: string | null;
  plafond: number;
  pokok: number;
  margin: number;
  tenor: number | null;
  outstanding_pokok: number;
  outstanding_margin: number;
  total_outstanding: number;
  status: DebtorContractStatus;
  objek_pembiayaan: string | null;
  agunan: string | null;
  product: DebtorParameterSummary | null;
  akad_type: DebtorParameterSummary | null;
  branch: DebtorBranchSummary | null;
  marketing_user: DebtorUserSummary | null;
  latest_collectibility: DebtorCollectibilitySummary | null;
  collectibilities: DebtorCollectibilitySummary[];
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorRecord = {
  id: string;
  debtor_number: string | null;
  identity_number: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  branch_id: string | null;
  marketing_user_id: string | null;
  financing_number: string | null;
  status: DebtorStatus;
  description: string | null;
  branch: DebtorBranchSummary | null;
  marketing_user: DebtorUserSummary | null;
  latest_contract: DebtorContract | null;
  contracts: DebtorContract[];
  contracts_count: number;
  documents_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorDocument = {
  id: string;
  debtor_id: string;
  contract_id: string | null;
  document_checklist_id: string | null;
  document_type: string;
  category: "AWAL" | "LAINNYA" | string;
  description: string | null;
  file: DebtorFileMeta | null;
  document_checklist: DebtorParameterSummary | null;
  contract: DebtorContract | null;
  uploaded_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorDocumentChecklistStatus = {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  document_type: string | null;
  description: string | null;
  is_required: boolean;
  status: "ADA" | "BELUM_ADA" | string;
  document: DebtorDocument | null;
};

export type DebtorMarketingActivity = {
  id: string;
  activity_kind: string;
  debtor_id: string;
  contract_id: string | null;
  timeline_group_id: string | null;
  related_activity_id: string | null;
  activity_date: string | null;
  target_date: string | null;
  status: string;
  action_plan: string | null;
  visit_address: string | null;
  visit_result: string | null;
  conclusion: string | null;
  handling_step: string | null;
  handling_result: string | null;
  notes: string | null;
  file: DebtorFileMeta | null;
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  activity_type: DebtorParameterSummary | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorMarketingTimelineRow = {
  id: "action-plan" | "hasil-kunjungan" | "langkah-penanganan" | string;
  label: string;
  description: string | null;
};

export type DebtorMarketingTimelineEntry = {
  id: string;
  row_id: string;
  activity_kind: string;
  date: string | null;
  title: string;
  summary: string;
  detail: string;
  status: string;
  target_date: string | null;
  timeline_group_id: string | null;
  related_activity_id: string | null;
  created_by: string | null;
  visit_address: string | null;
  file: DebtorFileMeta | null;
  contract: DebtorContract | null;
  activity_type: DebtorParameterSummary | null;
};

export type DebtorWorkflowCollectibility = DebtorCollectibilitySummary & {
  contract_id: string;
  contract_number: string;
};

export type DebtorIdebOtherBprs = {
  name: string;
  collectibility: string | number | null;
  outstanding_pokok: number;
};

export type DebtorIdebSummaryDetail = {
  debtor_name: string | null;
  identity_number: string | null;
  contract_number: string | null;
  current_collectibility: string | number | null;
  outstanding_pokok: number;
  financing_status: string | null;
  conclusion: string | null;
  processed_at: string | null;
  other_bprs: DebtorIdebOtherBprs[];
};

export type DebtorWorkflowIdebUpload = {
  id: string;
  debtor_id: string | null;
  contract_id: string | null;
  month: number;
  year: number;
  status: string;
  result_summary: Record<string, unknown> | null;
  summary_detail: DebtorIdebSummaryDetail | null;
  file: DebtorFileMeta | null;
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  created_at: string | null;
};

export type DebtorWorkflowPrint = {
  id: string;
  template_id: string | null;
  numbering_template_id: string | null;
  contract_id: string;
  document_type: string;
  generated_number: string;
  payload_snapshot: Record<string, unknown> | null;
  generated_file: DebtorFileMeta | null;
  contract: DebtorContract | null;
  printed_at: string | null;
  created_at: string | null;
};

export type DebtorWarningLetter = {
  id: string;
  debtor_id: string;
  contract_id: string | null;
  letter_type: string;
  issued_at: string | null;
  sent_at: string | null;
  status: string;
  notes: string | null;
  file: DebtorFileMeta | null;
  contract: DebtorContract | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorWorkflowLegalProgress = {
  id: string;
  contract_id: string;
  third_party_id: string | null;
  deed_type?: string | null;
  received_at?: string | null;
  estimated_completed_at?: string | null;
  completed_at?: string | null;
  deed_number?: string | null;
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
  notes: string | null;
  file: DebtorFileMeta | null;
  contract: DebtorContract | null;
  third_party: DebtorParameterSummary | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorWorkflowClaim = {
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
  insurance_progress: DebtorWorkflowLegalProgress | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorWorkflowDepositTransaction = {
  id: string;
  deposit_id: string;
  transaction_date: string | null;
  action: string;
  amount: number;
  notes: string | null;
  created_at: string | null;
};

export type DebtorWorkflowDeposit = {
  id: string;
  deposit_type_id: string | null;
  type: string;
  contract_id: string;
  third_party_id: string | null;
  nominal: number;
  paid_amount: number;
  processed_amount: number;
  remaining_amount: number;
  status: string;
  notes: string | null;
  deposit_type: DebtorParameterSummary | null;
  contract: DebtorContract | null;
  third_party: DebtorParameterSummary | null;
  transactions: DebtorWorkflowDepositTransaction[];
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorWorkflow = {
  debtor: DebtorRecord;
  contracts: DebtorContract[];
  collectibilities: DebtorWorkflowCollectibility[];
  documents: DebtorDocument[];
  document_checklist_status: DebtorDocumentChecklistStatus[];
  marketing: {
    action_plans: DebtorMarketingActivity[];
    visit_results: DebtorMarketingActivity[];
    handling_steps: DebtorMarketingActivity[];
    timeline: {
      rows: DebtorMarketingTimelineRow[];
      dates: string[];
      entries: DebtorMarketingTimelineEntry[];
    };
  };
  ideb_uploads: DebtorWorkflowIdebUpload[];
  legal: {
    prints: DebtorWorkflowPrint[];
    warning_letters: DebtorWarningLetter[];
    notary_progress: DebtorWorkflowLegalProgress[];
    insurance_progress: DebtorWorkflowLegalProgress[];
    kjpp_progress: DebtorWorkflowLegalProgress[];
    claims: DebtorWorkflowClaim[];
    deposits: DebtorWorkflowDeposit[];
  };
};

export type DebtorImportJob = {
  id: string;
  type: DebtorImportType | string;
  status: string;
  file: DebtorFileMeta | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  error_summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  records: unknown[];
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorReportSummary = {
  total_debtors: number;
  active_debtors: number;
  inactive_debtors: number;
  active_contracts: number;
  closed_contracts: number;
};

export type DebtorNpfBreakdown = {
  level: number | null;
  code: string | null;
  name: string;
  contract_count: number;
  outstanding: number;
  is_npf: boolean;
};

export type DebtorNpfTrend = {
  period_month: string;
  numerator: number;
  denominator: number;
  percentage: number;
};

export type DebtorNpfDetail = {
  debtor_id: string | null;
  debtor_number: string | null;
  debtor_name: string;
  contract_id: string;
  contract_number: string;
  level: number | null;
  code: string | null;
  name: string;
  outstanding: number;
  outstanding_pokok: number;
  outstanding_margin: number;
  remaining_months: number;
  is_npf: boolean;
};

export type DebtorNpfReport = {
  formula: string;
  numerator: number;
  denominator: number;
  percentage: number;
  breakdown_per_kol: DebtorNpfBreakdown[];
  details: DebtorNpfDetail[];
  trend: DebtorNpfTrend[];
};

export type DebtorMarketingReportSummary = {
  activity_kind: string;
  status: string;
  total: number;
};

export type DebtorMarketingReportActivity = {
  id: string;
  activity_kind: string;
  status: string;
  activity_date: string | null;
  target_date: string | null;
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  notes: string | null;
  created_at: string | null;
};

export type DebtorMarketingReport = {
  summary: DebtorMarketingReportSummary[];
  recent_activities: DebtorMarketingReportActivity[];
};

export type DebtorListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  branch_id?: string;
  marketing_user_id?: string;
  status?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
};

export type DebtorPayload = {
  debtor_number?: string | null;
  identity_number?: string | null;
  name: string;
  address?: string | null;
  phone?: string | null;
  branch_id?: string | null;
  marketing_user_id?: string | null;
  financing_number?: string | null;
  status?: string;
  description?: string | null;
};

export type DebtorContractPayload = {
  no_kontrak: string;
  debtor_id: string;
  product_id: string;
  akad_type_id: string;
  branch_id?: string | null;
  marketing_user_id?: string | null;
  tanggal_akad: string;
  tanggal_jatuh_tempo?: string | null;
  plafond?: number;
  pokok?: number;
  margin?: number;
  tenor: number;
  outstanding_pokok?: number;
  outstanding_margin?: number;
  status?: string;
  objek_pembiayaan?: string | null;
  agunan?: string | null;
};

export type DebtorDocumentPayload = {
  contract_id?: string | null;
  document_checklist_id?: string | null;
  document_type: string;
  category?: string;
  description?: string | null;
  file: File;
};

export type DebtorMarketingPayload = {
  debtor_id: string;
  contract_id?: string | null;
  timeline_group_id?: string | null;
  related_activity_id?: string | null;
  activity_date?: string | null;
  target_date?: string | null;
  status?: string;
  action_plan?: string | null;
  visit_address?: string | null;
  visit_result?: string | null;
  conclusion?: string | null;
  handling_step?: string | null;
  handling_result?: string | null;
  notes?: string | null;
  file?: File | null;
};

export type DebtorImportPayload = {
  file: File;
  debtor_id?: string | null;
  contract_id?: string | null;
  period_month?: string | null;
  raw_reference?: string | null;
  total_rows?: number;
};

export type DebtorPageResult<T> = {
  items: T[];
  meta: PaginationMeta;
};
