import type { PaginationMeta } from "@/types/api.types";

export type DebtorStatus = "ACTIVE" | "INACTIVE" | string;
export type DebtorContractStatus = "ACTIVE" | "CLOSED" | "INACTIVE" | string;
export type DebtorMarketingKind =
  | "action-plans"
  | "visit-results"
  | "handling-steps";
export type DebtorImportType = "SLIK" | "RESTRIK" | "IDEB";

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

export type DebtorContractSlikSnapshot = {
  id: string;
  debtor_id: string;
  contract_id: string;
  period_month: string;
  facility_number: string;
  debtor_number: string | null;
  credit_nature_code: string | null;
  credit_type_code: string | null;
  financing_scheme_code: string | null;
  initial_akad_number: string | null;
  initial_akad_date: string | null;
  final_akad_number: string | null;
  final_akad_date: string | null;
  new_or_extension_code: string | null;
  credit_start_date: string | null;
  start_date: string | null;
  due_date: string | null;
  debtor_category_code: string | null;
  usage_type_code: string | null;
  usage_orientation_code: string | null;
  economic_sector_code: string | null;
  project_location_city_code: string | null;
  project_value: number | null;
  currency_code: string | null;
  interest_rate: number | null;
  interest_type_code: string | null;
  government_program_code: string | null;
  takeover_from: string | null;
  source_of_funds_code: string | null;
  initial_plafond: number | null;
  plafond: number | null;
  current_month_disbursement: number | null;
  penalty: number | null;
  baki_debet: number | null;
  original_currency_amount: number | null;
  collectibility_code: string | null;
  default_date: string | null;
  default_reason_code: string | null;
  principal_arrears: number | null;
  margin_arrears: number | null;
  days_past_due: number | null;
  arrears_frequency: number | null;
  restructuring_frequency: number | null;
  initial_restructuring_date: string | null;
  final_restructuring_date: string | null;
  restructuring_method_code: string | null;
  condition_code: string | null;
  condition_date: string | null;
  description: string | null;
  branch_code: string | null;
  operation_code: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  latest_slik_snapshot: DebtorContractSlikSnapshot | null;
  slik_snapshots: DebtorContractSlikSnapshot[];
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
  customer_type: "INDIVIDUAL" | "LEGAL_ENTITY" | string | null;
  customer_type_label: string | null;
  slik_segment: string | null;
  slik_status_code: string | null;
  slik_operation_code: string | null;
  status: DebtorStatus;
  description: string | null;
  branch: DebtorBranchSummary | null;
  marketing_user: DebtorUserSummary | null;
  individual_profile: DebtorIndividualProfile | null;
  legal_entity_profile: DebtorLegalEntityProfile | null;
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
  debtor?: DebtorRecord | null;
  contract: DebtorContract | null;
  uploaded_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorCollateral = {
  id: string;
  debtor_id: string | null;
  contract_id: string | null;
  collateral_number: string;
  facility_number: string | null;
  facility_segment_code: string | null;
  collateral_status_code: string | null;
  collateral_type: string | null;
  rating: string | null;
  rating_agency_code: string | null;
  binding_type_code: string | null;
  binding_date: string | null;
  owner_name: string | null;
  proof_number: string | null;
  address: string | null;
  location_city_code: string | null;
  market_value: number | null;
  appraisal_value: number | null;
  reporter_appraisal_date: string | null;
  independent_appraisal_value: number | null;
  independent_appraiser_name: string | null;
  independent_appraisal_date: string | null;
  paripasu_status: string | null;
  paripasu_percentage: number | null;
  joint_credit_status: string | null;
  insured_status: string | null;
  description: string | null;
  branch_code: string | null;
  operation_code: string | null;
  period_month: string | null;
  last_import_period_month: string | null;
  debtor: DebtorRecord | null;
  contract: Pick<DebtorContract, "id" | "debtor_id" | "no_kontrak" | "status"> | null;
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

export type DebtorRestructuringRecord = {
  id: string;
  import_job_id: string | null;
  debtor_id: string | null;
  contract_id: string | null;
  period_month: string;
  restructuring_date: string | null;
  restructuring_type: string | null;
  reason: string | null;
  plafond_after: number | null;
  outstanding_after: number | null;
  tenor_after: number | null;
  new_due_date: string | null;
  collectibility_before: string | null;
  collectibility_after: string | null;
  status: string;
  description: string | null;
  raw_data: Record<string, unknown> | null;
  contract: Pick<DebtorContract, "id" | "debtor_id" | "no_kontrak" | "status"> | null;
  created_at: string | null;
  updated_at: string | null;
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
  delivery_status: string;
  status: string;
  description: string | null;
  notes: string | null;
  file: DebtorFileMeta | null;
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorIndividualProfile = {
  id?: string;
  debtor_id?: string;
  identity_type_code?: string | null;
  name_as_identity?: string | null;
  full_name?: string | null;
  education_degree_code?: string | null;
  gender?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  tax_number?: string | null;
  address_detail?: string | null;
  village?: string | null;
  district?: string | null;
  city_code?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  email?: string | null;
  domicile_country_code?: string | null;
  occupation_code?: string | null;
  workplace?: string | null;
  workplace_business_field_code?: string | null;
  workplace_address?: string | null;
  annual_gross_income?: number | null;
  income_source_code?: string | null;
  dependent_count?: number | null;
  relationship_with_reporter_code?: string | null;
  debtor_group_code?: string | null;
  marital_status_code?: string | null;
  spouse_identity_number?: string | null;
  spouse_name?: string | null;
  spouse_birth_date?: string | null;
  separate_assets_agreement?: string | null;
  violates_bmpk?: string | null;
  exceeds_bmpk?: string | null;
  mother_maiden_name?: string | null;
  branch_code?: string | null;
  operation_code?: string | null;
  status_code?: string | null;
};

export type DebtorLegalEntityProfile = {
  id?: string;
  debtor_id?: string;
  business_identity_number?: string | null;
  business_name?: string | null;
  legal_form_code?: string | null;
  establishment_place?: string | null;
  establishment_deed_number?: string | null;
  establishment_deed_date?: string | null;
  latest_amendment_deed_number?: string | null;
  latest_amendment_deed_date?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  email?: string | null;
  address_detail?: string | null;
  village?: string | null;
  district?: string | null;
  city_code?: string | null;
  postal_code?: string | null;
  domicile_country_code?: string | null;
  business_field_code?: string | null;
  relationship_with_reporter_code?: string | null;
  violates_bmpk?: string | null;
  exceeds_bmpk?: string | null;
  go_public?: string | null;
  debtor_group_code?: string | null;
  rating?: string | null;
  rating_agency?: string | null;
  rating_date?: string | null;
  debtor_group_name?: string | null;
  branch_code?: string | null;
  operation_code?: string | null;
  status_code?: string | null;
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
  collaterals: DebtorCollateral[];
  restructuring_records: DebtorRestructuringRecord[];
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
  import_segment: string | null;
  cif_status: string | null;
  period_month: string | null;
  file: DebtorFileMeta | null;
  files: DebtorFileMeta[];
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  error_summary: unknown;
  processing_summary: unknown;
  started_at: string | null;
  completed_at: string | null;
  segments?: Array<{
    id?: string;
    segment?: string;
    file_name?: string;
    declared_rows?: number;
    actual_rows?: number;
    status?: string;
  }>;
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
  action_plan: string | null;
  visit_address: string | null;
  visit_result: string | null;
  conclusion: string | null;
  handling_step: string | null;
  handling_result: string | null;
  notes: string | null;
  file: DebtorFileMeta | null;
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
  customer_type?: string;
  status?: string;
  period_month?: string;
  collectibility_level?: string;
  collateral_type?: string;
  link_status?: string;
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
  customer_type?: string | null;
  individual_profile?: Partial<DebtorIndividualProfile> | null;
  legal_entity_profile?: Partial<DebtorLegalEntityProfile> | null;
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

export type DebtorWarningLetterPayload = {
  debtor_id: string;
  contract_id?: string | null;
  letter_type: string;
  issued_at: string;
  sent_at?: string | null;
  delivery_status?: string;
  description?: string | null;
  file?: File | null;
};

export type DebtorImportPayload = {
  file?: File | null;
  files?: File[];
  import_segment?: "D01" | "D02" | "F01" | "A01" | string | null;
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
