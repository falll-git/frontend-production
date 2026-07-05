import type { PaginationMeta } from "@/types/api.types";

export type DebtorStatus = "ACTIVE" | "INACTIVE" | string;
export type DebtorContractStatus = "ACTIVE" | "CLOSED" | "INACTIVE" | string;
export type SlikReferenceFields = {
  [key: `${string}_label`]: string | null | undefined;
} & {
  [key: `${string}_display`]: string | null | undefined;
};
export type DebtorMarketingKind =
  | "action-plans"
  | "visit-results"
  | "handling-steps";
export type DebtorImportType = "SLIK" | "IDEB";

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

export type DebtorContractSlikSnapshot = SlikReferenceFields & {
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

export type DebtorRecord = SlikReferenceFields & {
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
  collaterals_count?: number;
  documents_count: number;
  required_documents_total?: number;
  required_documents_uploaded?: number;
  required_documents_missing?: number;
  required_documents_status?: string | null;
  required_documents_display?: string | null;
  slik_completeness_status?: string | null;
  slik_completeness_label?: string | null;
  total_outstanding?: number;
  latest_slik_period_month?: string | null;
  latest_collectibility_display?: string | null;
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
  files?: DebtorFileMeta[];
  document_checklist: DebtorParameterSummary | null;
  debtor?: DebtorRecord | null;
  contract: DebtorContract | null;
  uploaded_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorCollateral = SlikReferenceFields & {
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
  files?: DebtorFileMeta[];
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
  files?: DebtorFileMeta[];
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

export type DebtorIdebSummaryStats = Record<string, unknown>;

export type DebtorIdebIdentity = Record<string, unknown>;

export type DebtorIdebFacility = Record<string, unknown>;

export type DebtorIdebMonthlyCollectibility = Record<string, unknown>;

export type DebtorIdebSourceFile = {
  part_number?: number;
  total_parts?: number;
  file_name?: string | null;
  file_path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  checksum?: string | null;
};

export type DebtorIdebSummaryDetail = {
  schema_version?: string | null;
  source_format?: string | null;
  total_parts?: number;
  received_parts?: number;
  part_numbers?: number[];
  source_files?: DebtorIdebSourceFile[];
  period_month?: string | null;
  officer_name?: string | null;
  report_number?: string | null;
  reference_number?: string | null;
  request_date?: string | null;
  result_date?: string | null;
  debtor_name: string | null;
  identity_number: string | null;
  contract_number: string | null;
  current_collectibility: string | number | null;
  outstanding_pokok: number;
  financing_status: string | null;
  conclusion: string | null;
  processed_at: string | null;
  identity?: DebtorIdebIdentity | null;
  summary?: DebtorIdebSummaryStats | null;
  facilities?: DebtorIdebFacility[];
  monthly_collectibility_history?: DebtorIdebMonthlyCollectibility[];
  other_bprs: DebtorIdebOtherBprs[];
};

export type DebtorIdebUploadFile = {
  id: string;
  part_number: number;
  total_parts: number;
  file: DebtorFileMeta | null;
  created_at?: string | null;
};

export type DebtorIdebUploader = {
  id: string;
  name: string;
  username: string;
  email: string;
  division_id: string;
  division: { id: string; name: string } | null;
};

export type DebtorIdebReporterGroup = {
  key: string;
  reporter_code: string | null;
  reporter_name: string;
  facility_count: number;
  active_facility_count: number;
  paid_off_facility_count: number;
  write_off_facility_count: number;
  worst_collectibility: string | number | null;
  active_worst_collectibility: string | number | null;
  highest_days_past_due: number;
  total_plafond: number;
  total_outstanding: number;
  total_arrears: number;
  active_outstanding: number;
  active_arrears: number;
  paid_off_plafond: number;
  write_off_plafond: number;
  write_off_outstanding: number;
  write_off_arrears: number;
  collateral_count: number;
};

export type DebtorIdebReportSummary = {
  reporter_count: number;
  derived_reporter_count: number;
  reported_reporter_count: number | null;
  facilities_count: number;
  active_facilities_count: number;
  paid_off_facilities_count: number;
  write_off_facilities_count: number;
  reported_worst_collectibility: string | number | null;
  overall_worst_collectibility: string | number | null;
  active_worst_collectibility: string | number | null;
  worst_collectibility: string | number | null;
  highest_days_past_due: number;
  total_plafond: number;
  calculated_total_plafond: number;
  total_outstanding: number;
  calculated_total_outstanding: number;
  active_outstanding: number;
  active_arrears: number;
  total_arrears: number;
  paid_off_plafond: number;
  write_off_plafond: number;
  write_off_outstanding: number;
  write_off_arrears: number;
  reporter_groups: DebtorIdebReporterGroup[];
  priority_reporters: DebtorIdebReporterGroup[];
  collateral_source: "IDEB" | "A01" | null;
  collaterals: Record<string, unknown>[];
  data_quality_warnings: string[];
};

export type DebtorWorkflowIdebUpload = {
  id: string;
  source_fingerprint?: string | null;
  debtor_id: string | null;
  import_job_id?: string | null;
  contract_id: string | null;
  month: number;
  year: number;
  status: string;
  result_summary: Record<string, unknown> | null;
  summary_detail: DebtorIdebSummaryDetail | null;
  file: DebtorFileMeta | null;
  files?: DebtorIdebUploadFile[];
  uploaded_by?: string | null;
  uploader?: DebtorIdebUploader | null;
  report_summary?: DebtorIdebReportSummary | null;
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  created_at: string | null;
};

export type DebtorIdebPendingUpload = DebtorWorkflowIdebUpload & {
  import_job_id: string | null;
  external_status: string;
  period_month: string | null;
  debtor_name: string | null;
  identity_number: string | null;
  contract_number: string | null;
  source_format: string | null;
  current_collectibility: string | number | null;
  outstanding_pokok: number;
  updated_at: string | null;
};

export type DebtorIdebReportUpload = DebtorIdebPendingUpload & {
  link_status: string;
  result_date: string | null;
  reporter_count: number;
  facilities_count: number;
  active_facilities_count: number;
  paid_off_facilities_count: number;
  write_off_facilities_count: number;
  active_outstanding: number;
  active_arrears: number;
  paid_off_plafond: number;
  write_off_plafond: number;
  write_off_outstanding: number;
  write_off_arrears: number;
  total_plafond: number;
  total_outstanding: number;
  total_arrears: number;
  reported_worst_collectibility: string | number | null;
  active_worst_collectibility: string | number | null;
  worst_collectibility: string | number | null;
  officer_name: string | null;
  total_parts: number;
  received_parts: number;
  part_display: string;
  report_summary: DebtorIdebReportSummary | null;
};

export type DebtorIdebResolvePayload = {
  debtor_id: string;
  contract_id?: string | null;
};

export type DebtorIdebComparisonStatus =
  | "MATCHED"
  | "DIFFERENT"
  | "EXTERNAL_ONLY"
  | "INTERNAL_ONLY";

export type DebtorIdebComparisonFacility = {
  reporter?: string | null;
  account_number?: string | null;
  contract_id?: string | null;
  no_kontrak?: string | null;
  facility_number?: string | null;
  product?: string | null;
  akad?: string | null;
  plafond?: number | null;
  outstanding?: number | null;
  collectibility?: string | number | null;
  dpd?: number | null;
  condition?: string | null;
  due_date?: string | null;
  period_month?: string | null;
};

export type DebtorIdebComparisonDifference = {
  field: string;
  label: string;
  external: string | number | null;
  internal: string | number | null;
};

export type DebtorIdebComparisonItem = {
  status: DebtorIdebComparisonStatus;
  status_label: string;
  match_key: string | null;
  external: DebtorIdebComparisonFacility | null;
  internal: DebtorIdebComparisonFacility | null;
  differences: DebtorIdebComparisonDifference[];
};

export type DebtorIdebComparisonSummary = {
  total: number;
  matched: number;
  different: number;
  external_only: number;
  internal_only: number;
};

export type DebtorIdebComparison = {
  ideb_upload_id: string;
  debtor_id: string;
  period_month: string | null;
  summary: DebtorIdebComparisonSummary;
  items: DebtorIdebComparisonItem[];
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
  files?: DebtorFileMeta[];
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
  files?: DebtorFileMeta[];
  debtor: DebtorRecord | null;
  contract: DebtorContract | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorIndividualProfile = SlikReferenceFields & {
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

export type DebtorLegalEntityProfile = SlikReferenceFields & {
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
  collateral_id: string | null;
  third_party_id: string | null;
  deed_type?: string | null;
  received_at?: string | null;
  estimated_completed_at?: string | null;
  completed_at?: string | null;
  deed_number?: string | null;
  insurance_type?: string | null;
  coverage_amount?: number;
  premium_amount?: number;
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
  files?: DebtorFileMeta[];
  contract: DebtorContract | null;
  collateral: DebtorCollateral | null;
  third_party: DebtorParameterSummary | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorWorkflowClaim = {
  id: string;
  contract_id: string;
  collateral_id: string | null;
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
  files?: DebtorFileMeta[];
  contract: DebtorContract | null;
  collateral: DebtorCollateral | null;
  insurance_progress: DebtorWorkflowLegalProgress | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorWorkflowDepositTransaction = {
  id: string;
  deposit_id: string;
  transaction_date: string | null;
  action: string;
  raw_action?: string | null;
  amount: number;
  notes: string | null;
  file: DebtorFileMeta | null;
  files?: DebtorFileMeta[];
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
  total_deposit_amount?: number;
  total_payment_amount?: number;
  total_refund_amount?: number;
  balance_amount?: number;
  status: string;
  notes: string | null;
  deposit_type: DebtorParameterSummary | null;
  contract: DebtorContract | null;
  third_party: DebtorParameterSummary | null;
  transactions: DebtorWorkflowDepositTransaction[];
  created_at: string | null;
  updated_at: string | null;
};

export type DebtorActivityLog = {
  id: string;
  actor_id: string | null;
  actor: DebtorUserSummary | null;
  action: string;
  source: string;
  entity_type: string;
  entity_id: string | null;
  debtor_id: string | null;
  contract_id: string | null;
  import_job_id: string | null;
  ideb_upload_id: string | null;
  document_id: string | null;
  marketing_activity_id: string | null;
  warning_letter_id: string | null;
  title: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  request_ip: string | null;
  user_agent: string | null;
  created_at: string | null;
};

export type DebtorWorkflow = {
  debtor: DebtorRecord;
  contracts: DebtorContract[];
  collectibilities: DebtorWorkflowCollectibility[];
  documents: DebtorDocument[];
  collaterals: DebtorCollateral[];
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
  activity_logs: DebtorActivityLog[];
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
  individual_debtors?: number;
  legal_entity_debtors?: number;
  total_facilities?: number;
  total_collaterals?: number;
  total_outstanding?: number;
  scope?: DebtorReportScope | null;
};

export type DebtorReportScope = {
  can_report_all: boolean;
  can_view_division: boolean;
  can_manage_all: boolean;
};

export type DebtorReportQuery = DebtorListQuery & {
  period_month?: string;
  collectibility_level?: string;
  collateral_type?: string;
  link_status?: string;
  issue_type?: string;
};

export type DebtorPortfolioReport = {
  summary: DebtorReportSummary;
  items: DebtorRecord[];
  meta: PaginationMeta;
};

export type DebtorFacilityReportSummary = {
  total_facilities: number;
  active_facilities: number;
  npf_facilities: number;
  total_plafond: number;
  total_outstanding: number;
  scope?: DebtorReportScope | null;
};

export type DebtorFacilityReport = {
  summary: DebtorFacilityReportSummary;
  items: DebtorContract[];
  meta: PaginationMeta;
};

export type DebtorCollateralReportSummary = {
  total_collaterals: number;
  linked_collaterals: number;
  unlinked_collaterals: number;
  total_market_value: number;
  total_appraisal_value: number;
  scope?: DebtorReportScope | null;
};

export type DebtorCollateralReport = {
  summary: DebtorCollateralReportSummary;
  items: DebtorCollateral[];
  meta: PaginationMeta;
};

export type DebtorCompletenessIssueType =
  | "REQUIRED_DOCUMENTS_INCOMPLETE"
  | "DEBTOR_WITHOUT_FACILITY"
  | "FACILITY_WITHOUT_COLLATERAL"
  | "UNLINKED_COLLATERAL"
  | "MISSING_SLIK_PERIOD"
  | string;

export type DebtorCompletenessIssue = {
  id: string;
  issue_type: DebtorCompletenessIssueType;
  issue_label: string;
  severity: string;
  impact: string;
  recommendation: string;
  debtor_id: string | null;
  debtor: DebtorRecord | null;
  contract_id: string | null;
  contract: DebtorContract | null;
  collateral_id: string | null;
  collateral: DebtorCollateral | null;
  period_month: string | null;
  created_at: string | null;
};

export type DebtorCompletenessReportSummary = {
  total_issues: number;
  required_documents_incomplete: number;
  debtors_without_facilities: number;
  facilities_without_collaterals: number;
  unlinked_collaterals: number;
  missing_slik_period: number;
  scope?: DebtorReportScope | null;
};

export type DebtorCompletenessReport = {
  summary: DebtorCompletenessReportSummary;
  items: DebtorCompletenessIssue[];
  meta: PaginationMeta;
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
  items?: DebtorNpfDetail[];
  meta?: PaginationMeta;
  summary?: {
    numerator: number;
    denominator: number;
    percentage: number;
    total_facilities: number;
    npf_facilities: number;
    scope?: DebtorReportScope | null;
  };
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
  files?: DebtorFileMeta[];
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
  debtor_id?: string;
  contract_id?: string;
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
  file?: File | null;
  files?: File[];
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
  files?: File[];
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
  files?: File[];
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
