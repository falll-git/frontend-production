import api from "@/lib/axios";
import { MAX_TABLE_PAGE_SIZE, OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  isRecord,
  readBoolean,
  readNumber,
  readString,
  toMultipartFormData,
} from "@/services/api.utils";
import type {
  DebtorBranchSummary,
  DebtorCollateral,
  DebtorCollectibilitySummary,
  DebtorContract,
  DebtorContractPayload,
  DebtorContractSlikSnapshot,
  DebtorDocument,
  DebtorDocumentChecklistStatus,
  DebtorDocumentPayload,
  DebtorFileMeta,
  DebtorIdebOtherBprs,
  DebtorIdebSummaryDetail,
  DebtorImportJob,
  DebtorImportPayload,
  DebtorImportType,
  DebtorIndividualProfile,
  DebtorLegalEntityProfile,
  DebtorListQuery,
  DebtorMarketingActivity,
  DebtorMarketingKind,
  DebtorMarketingPayload,
  DebtorMarketingReport,
  DebtorMarketingReportActivity,
  DebtorMarketingReportSummary,
  DebtorMarketingTimelineEntry,
  DebtorMarketingTimelineRow,
  DebtorNpfBreakdown,
  DebtorNpfDetail,
  DebtorNpfReport,
  DebtorNpfTrend,
  DebtorPageResult,
  DebtorParameterSummary,
  DebtorPayload,
  DebtorRecord,
  DebtorReportSummary,
  DebtorRestructuringRecord,
  DebtorUserSummary,
  DebtorWarningLetter,
  DebtorWarningLetterPayload,
  DebtorWorkflow,
  DebtorWorkflowClaim,
  DebtorWorkflowCollectibility,
  DebtorWorkflowDeposit,
  DebtorWorkflowDepositTransaction,
  DebtorWorkflowIdebUpload,
  DebtorWorkflowLegalProgress,
  DebtorWorkflowPrint,
} from "@/types/debitur.types";

type UnknownRecord = Record<string, unknown>;

function nullableString(record: UnknownRecord, ...keys: string[]): string | null {
  return readString(record, ...keys);
}

function numberValue(record: UnknownRecord, key: string, fallback = 0): number {
  return readNumber(record, key) ?? fallback;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function mapFile(record: unknown): DebtorFileMeta | null {
  const file = asRecord(record);
  if (!file) return null;

  return {
    name: nullableString(file, "name", "file_name"),
    mime_type: nullableString(file, "mime_type", "mimeType"),
    size_bytes: readNumber(file, "size_bytes", "sizeBytes"),
    url: nullableString(file, "url", "file_url", "fileUrl"),
    original_url: nullableString(file, "original_url", "originalUrl"),
    watermarked_url: nullableString(file, "watermarked_url", "watermarkedUrl"),
  };
}

function mapUser(record: unknown): DebtorUserSummary | null {
  const user = asRecord(record);
  if (!user) return null;
  const id = readString(user, "id");
  const name = readString(user, "name", "username");
  if (!id || !name) return null;

  return {
    id,
    name,
    username: nullableString(user, "username"),
    email: nullableString(user, "email"),
    division_id: nullableString(user, "division_id", "divisionId"),
    division_name: nullableString(user, "division_name", "divisionName"),
  };
}

function mapBranch(record: unknown): DebtorBranchSummary | null {
  const branch = asRecord(record);
  if (!branch) return null;
  const id = readString(branch, "id");
  const name = readString(branch, "name", "label");
  if (!id || !name) return null;

  return {
    id,
    code: nullableString(branch, "code", "kode"),
    name,
  };
}

function mapParameter(record: unknown): DebtorParameterSummary | null {
  const param = asRecord(record);
  if (!param) return null;
  const id = readString(param, "id");
  const name = readString(param, "name", "label");
  if (!id || !name) return null;

  return {
    id,
    code: nullableString(param, "code", "kode"),
    name,
    level: readNumber(param, "level"),
    is_npf:
      "is_npf" in param || "isNpf" in param
        ? readBoolean(param, "is_npf", "isNpf")
        : null,
  };
}

function mapIndividualProfile(record: unknown): DebtorIndividualProfile | null {
  const profile = asRecord(record);
  if (!profile) return null;

  return {
    id: nullableString(profile, "id") ?? undefined,
    debtor_id: nullableString(profile, "debtor_id", "debtorId") ?? undefined,
    identity_type_code: nullableString(profile, "identity_type_code", "identityTypeCode"),
    name_as_identity: nullableString(profile, "name_as_identity", "nameAsIdentity"),
    full_name: nullableString(profile, "full_name", "fullName"),
    education_degree_code: nullableString(profile, "education_degree_code", "educationDegreeCode"),
    gender: nullableString(profile, "gender"),
    birth_place: nullableString(profile, "birth_place", "birthPlace"),
    birth_date: normalizeDate(profile.birth_date),
    tax_number: nullableString(profile, "tax_number", "taxNumber"),
    address_detail: nullableString(profile, "address_detail", "addressDetail"),
    village: nullableString(profile, "village"),
    district: nullableString(profile, "district"),
    city_code: nullableString(profile, "city_code", "cityCode"),
    postal_code: nullableString(profile, "postal_code", "postalCode"),
    phone: nullableString(profile, "phone"),
    mobile_phone: nullableString(profile, "mobile_phone", "mobilePhone"),
    email: nullableString(profile, "email"),
    domicile_country_code: nullableString(profile, "domicile_country_code", "domicileCountryCode"),
    occupation_code: nullableString(profile, "occupation_code", "occupationCode"),
    workplace: nullableString(profile, "workplace"),
    workplace_business_field_code: nullableString(profile, "workplace_business_field_code", "workplaceBusinessFieldCode"),
    workplace_address: nullableString(profile, "workplace_address", "workplaceAddress"),
    annual_gross_income: readNumber(profile, "annual_gross_income", "annualGrossIncome"),
    income_source_code: nullableString(profile, "income_source_code", "incomeSourceCode"),
    dependent_count: readNumber(profile, "dependent_count", "dependentCount"),
    relationship_with_reporter_code: nullableString(profile, "relationship_with_reporter_code", "relationshipWithReporterCode"),
    debtor_group_code: nullableString(profile, "debtor_group_code", "debtorGroupCode"),
    marital_status_code: nullableString(profile, "marital_status_code", "maritalStatusCode"),
    spouse_identity_number: nullableString(profile, "spouse_identity_number", "spouseIdentityNumber"),
    spouse_name: nullableString(profile, "spouse_name", "spouseName"),
    spouse_birth_date: normalizeDate(profile.spouse_birth_date),
    separate_assets_agreement: nullableString(profile, "separate_assets_agreement", "separateAssetsAgreement"),
    violates_bmpk: nullableString(profile, "violates_bmpk", "violatesBmpk"),
    exceeds_bmpk: nullableString(profile, "exceeds_bmpk", "exceedsBmpk"),
    mother_maiden_name: nullableString(profile, "mother_maiden_name", "motherMaidenName"),
    branch_code: nullableString(profile, "branch_code", "branchCode"),
    operation_code: nullableString(profile, "operation_code", "operationCode"),
    status_code: nullableString(profile, "status_code", "statusCode"),
  };
}

function mapLegalEntityProfile(record: unknown): DebtorLegalEntityProfile | null {
  const profile = asRecord(record);
  if (!profile) return null;

  return {
    id: nullableString(profile, "id") ?? undefined,
    debtor_id: nullableString(profile, "debtor_id", "debtorId") ?? undefined,
    business_identity_number: nullableString(profile, "business_identity_number", "businessIdentityNumber"),
    business_name: nullableString(profile, "business_name", "businessName"),
    legal_form_code: nullableString(profile, "legal_form_code", "legalFormCode"),
    establishment_place: nullableString(profile, "establishment_place", "establishmentPlace"),
    establishment_deed_number: nullableString(profile, "establishment_deed_number", "establishmentDeedNumber"),
    establishment_deed_date: normalizeDate(profile.establishment_deed_date),
    latest_amendment_deed_number: nullableString(profile, "latest_amendment_deed_number", "latestAmendmentDeedNumber"),
    latest_amendment_deed_date: normalizeDate(profile.latest_amendment_deed_date),
    phone: nullableString(profile, "phone"),
    mobile_phone: nullableString(profile, "mobile_phone", "mobilePhone"),
    email: nullableString(profile, "email"),
    address_detail: nullableString(profile, "address_detail", "addressDetail"),
    village: nullableString(profile, "village"),
    district: nullableString(profile, "district"),
    city_code: nullableString(profile, "city_code", "cityCode"),
    postal_code: nullableString(profile, "postal_code", "postalCode"),
    domicile_country_code: nullableString(profile, "domicile_country_code", "domicileCountryCode"),
    business_field_code: nullableString(profile, "business_field_code", "businessFieldCode"),
    relationship_with_reporter_code: nullableString(profile, "relationship_with_reporter_code", "relationshipWithReporterCode"),
    violates_bmpk: nullableString(profile, "violates_bmpk", "violatesBmpk"),
    exceeds_bmpk: nullableString(profile, "exceeds_bmpk", "exceedsBmpk"),
    go_public: nullableString(profile, "go_public", "goPublic"),
    debtor_group_code: nullableString(profile, "debtor_group_code", "debtorGroupCode"),
    rating: nullableString(profile, "rating"),
    rating_agency: nullableString(profile, "rating_agency", "ratingAgency"),
    rating_date: normalizeDate(profile.rating_date),
    debtor_group_name: nullableString(profile, "debtor_group_name", "debtorGroupName"),
    branch_code: nullableString(profile, "branch_code", "branchCode"),
    operation_code: nullableString(profile, "operation_code", "operationCode"),
    status_code: nullableString(profile, "status_code", "statusCode"),
  };
}

function mapCollectibility(record: unknown): DebtorCollectibilitySummary | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  if (!id) return null;

  return {
    id,
    period_month: nullableString(item, "period_month", "periodMonth"),
    kol_level_id: nullableString(item, "kol_level_id", "kolLevelId"),
    level: readNumber(item, "level"),
    code: nullableString(item, "code"),
    name: nullableString(item, "name"),
    is_npf: readBoolean(item, "is_npf", "isNpf"),
    outstanding_pokok: numberValue(item, "outstanding_pokok"),
    outstanding_margin: numberValue(item, "outstanding_margin"),
    dpd: readNumber(item, "dpd"),
    notes: nullableString(item, "notes"),
    created_at: nullableString(item, "created_at", "createdAt"),
  };
}

function mapContractSlikSnapshot(record: unknown): DebtorContractSlikSnapshot | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const debtorId = readString(item, "debtor_id", "debtorId");
  const contractId = readString(item, "contract_id", "contractId");
  const periodMonth = readString(item, "period_month", "periodMonth");
  const facilityNumber = readString(item, "facility_number", "facilityNumber");
  if (!id || !debtorId || !contractId || !periodMonth || !facilityNumber) {
    return null;
  }

  return {
    id,
    debtor_id: debtorId,
    contract_id: contractId,
    period_month: periodMonth,
    facility_number: facilityNumber,
    debtor_number: nullableString(item, "debtor_number", "debtorNumber"),
    credit_nature_code: nullableString(item, "credit_nature_code", "creditNatureCode"),
    credit_type_code: nullableString(item, "credit_type_code", "creditTypeCode"),
    financing_scheme_code: nullableString(
      item,
      "financing_scheme_code",
      "financingSchemeCode",
    ),
    initial_akad_number: nullableString(item, "initial_akad_number", "initialAkadNumber"),
    initial_akad_date: normalizeDate(item.initial_akad_date),
    final_akad_number: nullableString(item, "final_akad_number", "finalAkadNumber"),
    final_akad_date: normalizeDate(item.final_akad_date),
    new_or_extension_code: nullableString(
      item,
      "new_or_extension_code",
      "newOrExtensionCode",
    ),
    credit_start_date: normalizeDate(item.credit_start_date),
    start_date: normalizeDate(item.start_date),
    due_date: normalizeDate(item.due_date),
    debtor_category_code: nullableString(
      item,
      "debtor_category_code",
      "debtorCategoryCode",
    ),
    usage_type_code: nullableString(item, "usage_type_code", "usageTypeCode"),
    usage_orientation_code: nullableString(
      item,
      "usage_orientation_code",
      "usageOrientationCode",
    ),
    economic_sector_code: nullableString(item, "economic_sector_code", "economicSectorCode"),
    project_location_city_code: nullableString(
      item,
      "project_location_city_code",
      "projectLocationCityCode",
    ),
    project_value: readNumber(item, "project_value", "projectValue"),
    currency_code: nullableString(item, "currency_code", "currencyCode"),
    interest_rate: readNumber(item, "interest_rate", "interestRate"),
    interest_type_code: nullableString(item, "interest_type_code", "interestTypeCode"),
    government_program_code: nullableString(
      item,
      "government_program_code",
      "governmentProgramCode",
    ),
    takeover_from: nullableString(item, "takeover_from", "takeoverFrom"),
    source_of_funds_code: nullableString(item, "source_of_funds_code", "sourceOfFundsCode"),
    initial_plafond: readNumber(item, "initial_plafond", "initialPlafond"),
    plafond: readNumber(item, "plafond"),
    current_month_disbursement: readNumber(
      item,
      "current_month_disbursement",
      "currentMonthDisbursement",
    ),
    penalty: readNumber(item, "penalty"),
    baki_debet: readNumber(item, "baki_debet", "bakiDebet"),
    original_currency_amount: readNumber(
      item,
      "original_currency_amount",
      "originalCurrencyAmount",
    ),
    collectibility_code: nullableString(item, "collectibility_code", "collectibilityCode"),
    default_date: normalizeDate(item.default_date),
    default_reason_code: nullableString(item, "default_reason_code", "defaultReasonCode"),
    principal_arrears: readNumber(item, "principal_arrears", "principalArrears"),
    margin_arrears: readNumber(item, "margin_arrears", "marginArrears"),
    days_past_due: readNumber(item, "days_past_due", "daysPastDue"),
    arrears_frequency: readNumber(item, "arrears_frequency", "arrearsFrequency"),
    restructuring_frequency: readNumber(
      item,
      "restructuring_frequency",
      "restructuringFrequency",
    ),
    initial_restructuring_date: normalizeDate(item.initial_restructuring_date),
    final_restructuring_date: normalizeDate(item.final_restructuring_date),
    restructuring_method_code: nullableString(
      item,
      "restructuring_method_code",
      "restructuringMethodCode",
    ),
    condition_code: nullableString(item, "condition_code", "conditionCode"),
    condition_date: normalizeDate(item.condition_date),
    description: nullableString(item, "description"),
    branch_code: nullableString(item, "branch_code", "branchCode"),
    operation_code: nullableString(item, "operation_code", "operationCode"),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapContract(record: unknown, includeNestedDebtor = true): DebtorContract | null {
  const contract = asRecord(record);
  if (!contract) return null;
  const id = readString(contract, "id");
  const noKontrak = readString(contract, "no_kontrak", "noKontrak");
  const debtorId = readString(contract, "debtor_id", "debtorId");
  if (!id || !noKontrak || !debtorId) return null;

  const collectibilities = Array.isArray(contract.collectibilities)
    ? contract.collectibilities
        .map((item) => mapCollectibility(item))
        .filter((item): item is DebtorCollectibilitySummary => item !== null)
    : [];
  const latestCollectibility =
    mapCollectibility(contract.latest_collectibility) ?? collectibilities[0] ?? null;
  const slikSnapshots = Array.isArray(contract.slik_snapshots)
    ? contract.slik_snapshots
        .map((item) => mapContractSlikSnapshot(item))
        .filter((item): item is DebtorContractSlikSnapshot => item !== null)
    : [];
  const latestSlikSnapshot =
    mapContractSlikSnapshot(contract.latest_slik_snapshot) ?? slikSnapshots[0] ?? null;

  return {
    id,
    no_kontrak: noKontrak,
    debtor_id: debtorId,
    debtor: includeNestedDebtor ? mapDebtor(contract.debtor, false) : null,
    product_id: nullableString(contract, "product_id", "productId"),
    akad_type_id: nullableString(contract, "akad_type_id", "akadTypeId"),
    branch_id: nullableString(contract, "branch_id", "branchId"),
    marketing_user_id: nullableString(
      contract,
      "marketing_user_id",
      "marketingUserId",
    ),
    tanggal_akad: normalizeDate(contract.tanggal_akad),
    tanggal_jatuh_tempo: normalizeDate(contract.tanggal_jatuh_tempo),
    plafond: numberValue(contract, "plafond"),
    pokok: numberValue(contract, "pokok"),
    margin: numberValue(contract, "margin"),
    tenor: readNumber(contract, "tenor"),
    outstanding_pokok: numberValue(contract, "outstanding_pokok"),
    outstanding_margin: numberValue(contract, "outstanding_margin"),
    total_outstanding: numberValue(contract, "total_outstanding"),
    status: readString(contract, "status") ?? "ACTIVE",
    objek_pembiayaan: nullableString(contract, "objek_pembiayaan", "objekPembiayaan"),
    agunan: nullableString(contract, "agunan"),
    product: mapParameter(contract.product),
    akad_type: mapParameter(contract.akad_type),
    branch: mapBranch(contract.branch),
    marketing_user: mapUser(contract.marketing_user),
    latest_collectibility: latestCollectibility,
    collectibilities,
    latest_slik_snapshot: latestSlikSnapshot,
    slik_snapshots: slikSnapshots,
    created_at: nullableString(contract, "created_at", "createdAt"),
    updated_at: nullableString(contract, "updated_at", "updatedAt"),
  };
}

function mapDebtor(record: unknown, includeContracts = true): DebtorRecord | null {
  const debtor = asRecord(record);
  if (!debtor) return null;
  const id = readString(debtor, "id");
  const name = readString(debtor, "name");
  if (!id || !name) return null;

  const contracts = includeContracts && Array.isArray(debtor.contracts)
    ? debtor.contracts
        .map((item) => mapContract(item, false))
        .filter((item): item is DebtorContract => item !== null)
    : [];

  return {
    id,
    debtor_number: nullableString(debtor, "debtor_number", "debtorNumber"),
    identity_number: nullableString(debtor, "identity_number", "identityNumber"),
    name,
    address: nullableString(debtor, "address"),
    phone: nullableString(debtor, "phone"),
    branch_id: nullableString(debtor, "branch_id", "branchId"),
    marketing_user_id: nullableString(debtor, "marketing_user_id", "marketingUserId"),
    financing_number: nullableString(debtor, "financing_number", "financingNumber"),
    customer_type: nullableString(debtor, "customer_type", "customerType"),
    customer_type_label: nullableString(debtor, "customer_type_label", "customerTypeLabel"),
    slik_segment: nullableString(debtor, "slik_segment", "slikSegment"),
    slik_status_code: nullableString(debtor, "slik_status_code", "slikStatusCode"),
    slik_operation_code: nullableString(debtor, "slik_operation_code", "slikOperationCode"),
    status: readString(debtor, "status") ?? "ACTIVE",
    description: nullableString(debtor, "description"),
    branch: mapBranch(debtor.branch),
    marketing_user: mapUser(debtor.marketing_user),
    individual_profile: mapIndividualProfile(debtor.individual_profile),
    legal_entity_profile: mapLegalEntityProfile(debtor.legal_entity_profile),
    latest_contract: mapContract(debtor.latest_contract, false) ?? contracts[0] ?? null,
    contracts,
    contracts_count: readNumber(debtor, "contracts_count", "contractsCount") ?? contracts.length,
    documents_count: readNumber(debtor, "documents_count", "documentsCount") ?? 0,
    created_at: nullableString(debtor, "created_at", "createdAt"),
    updated_at: nullableString(debtor, "updated_at", "updatedAt"),
  };
}

function mapDocument(record: unknown): DebtorDocument | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const debtorId = readString(item, "debtor_id", "debtorId");
  const documentType = readString(item, "document_type", "documentType");
  if (!id || !debtorId || !documentType) return null;

  return {
    id,
    debtor_id: debtorId,
    contract_id: nullableString(item, "contract_id", "contractId"),
    document_checklist_id: nullableString(
      item,
      "document_checklist_id",
      "documentChecklistId",
    ),
    document_type: documentType,
    category: readString(item, "category") ?? "LAINNYA",
    description: nullableString(item, "description"),
    file: mapFile(item.file),
    document_checklist: mapParameter(item.document_checklist),
    debtor: mapDebtor(item.debtor, false),
    contract: mapContract(item.contract),
    uploaded_by: nullableString(item, "uploaded_by", "uploadedBy"),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapCollateral(record: unknown): DebtorCollateral | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const collateralNumber = readString(
    item,
    "collateral_number",
    "collateralNumber",
  );
  if (!id || !collateralNumber) return null;

  return {
    id,
    debtor_id: nullableString(item, "debtor_id", "debtorId"),
    contract_id: nullableString(item, "contract_id", "contractId"),
    collateral_number: collateralNumber,
    facility_number: nullableString(item, "facility_number", "facilityNumber"),
    facility_segment_code: nullableString(
      item,
      "facility_segment_code",
      "facilitySegmentCode",
    ),
    collateral_status_code: nullableString(
      item,
      "collateral_status_code",
      "collateralStatusCode",
    ),
    collateral_type: nullableString(item, "collateral_type", "collateralType"),
    rating: nullableString(item, "rating"),
    rating_agency_code: nullableString(item, "rating_agency_code", "ratingAgencyCode"),
    binding_type_code: nullableString(item, "binding_type_code", "bindingTypeCode"),
    binding_date: normalizeDate(item.binding_date),
    owner_name: nullableString(item, "owner_name", "ownerName"),
    proof_number: nullableString(item, "proof_number", "proofNumber"),
    address: nullableString(item, "address"),
    location_city_code: nullableString(item, "location_city_code", "locationCityCode"),
    market_value: readNumber(item, "market_value", "marketValue"),
    appraisal_value: readNumber(item, "appraisal_value", "appraisalValue"),
    reporter_appraisal_date: normalizeDate(item.reporter_appraisal_date),
    independent_appraisal_value: readNumber(
      item,
      "independent_appraisal_value",
      "independentAppraisalValue",
    ),
    independent_appraiser_name: nullableString(
      item,
      "independent_appraiser_name",
      "independentAppraiserName",
    ),
    independent_appraisal_date: normalizeDate(item.independent_appraisal_date),
    paripasu_status: nullableString(item, "paripasu_status", "paripasuStatus"),
    paripasu_percentage: readNumber(
      item,
      "paripasu_percentage",
      "paripasuPercentage",
    ),
    joint_credit_status: nullableString(item, "joint_credit_status", "jointCreditStatus"),
    insured_status: nullableString(item, "insured_status", "insuredStatus"),
    description: nullableString(item, "description"),
    branch_code: nullableString(item, "branch_code", "branchCode"),
    operation_code: nullableString(item, "operation_code", "operationCode"),
    period_month: nullableString(item, "period_month", "periodMonth"),
    last_import_period_month: nullableString(
      item,
      "last_import_period_month",
      "lastImportPeriodMonth",
    ),
    debtor: mapDebtor(item.debtor, false),
    contract: mapContract(item.contract, false),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapMarketingActivity(record: unknown): DebtorMarketingActivity | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const debtorId = readString(item, "debtor_id", "debtorId");
  if (!id || !debtorId) return null;

  return {
    id,
    activity_kind: readString(item, "activity_kind", "activityKind") ?? "",
    debtor_id: debtorId,
    contract_id: nullableString(item, "contract_id", "contractId"),
    timeline_group_id: nullableString(item, "timeline_group_id", "timelineGroupId"),
    related_activity_id: nullableString(
      item,
      "related_activity_id",
      "relatedActivityId",
    ),
    activity_date: normalizeDate(item.activity_date),
    target_date: normalizeDate(item.target_date),
    status: readString(item, "status") ?? "PENDING",
    action_plan: nullableString(item, "action_plan", "actionPlan"),
    visit_address: nullableString(item, "visit_address", "visitAddress"),
    visit_result: nullableString(item, "visit_result", "visitResult"),
    conclusion: nullableString(item, "conclusion"),
    handling_step: nullableString(item, "handling_step", "handlingStep"),
    handling_result: nullableString(item, "handling_result", "handlingResult"),
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
    debtor: mapDebtor(item.debtor, false),
    contract: mapContract(item.contract, false),
    activity_type: mapParameter(item.activity_type),
    created_by: nullableString(item, "created_by", "createdBy"),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapDocumentChecklistStatus(record: unknown): DebtorDocumentChecklistStatus | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const name = readString(item, "name");
  if (!id || !name) return null;

  return {
    id,
    code: nullableString(item, "code"),
    name,
    category: nullableString(item, "category"),
    document_type: nullableString(item, "document_type", "documentType"),
    description: nullableString(item, "description"),
    is_required: readBoolean(item, "is_required", "isRequired") ?? false,
    status: readString(item, "status") ?? "BELUM_ADA",
    document: mapDocument(item.document),
  };
}

function mapMarketingTimelineRow(record: unknown): DebtorMarketingTimelineRow | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const label = readString(item, "label");
  if (!id || !label) return null;
  return {
    id,
    label,
    description: nullableString(item, "description"),
  };
}

function mapMarketingTimelineEntry(record: unknown): DebtorMarketingTimelineEntry | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const rowId = readString(item, "row_id", "rowId");
  if (!id || !rowId) return null;

  return {
    id,
    row_id: rowId,
    activity_kind: readString(item, "activity_kind", "activityKind") ?? "",
    date: nullableString(item, "date"),
    title: readString(item, "title") ?? "-",
    summary: readString(item, "summary") ?? "-",
    detail: readString(item, "detail") ?? "-",
    status: readString(item, "status") ?? "PENDING",
    target_date: normalizeDate(item.target_date),
    timeline_group_id: nullableString(item, "timeline_group_id", "timelineGroupId"),
    related_activity_id: nullableString(
      item,
      "related_activity_id",
      "relatedActivityId",
    ),
    created_by: nullableString(item, "created_by", "createdBy"),
    visit_address: nullableString(item, "visit_address", "visitAddress"),
    file: mapFile(item.file),
    contract: mapContract(item.contract, false),
    activity_type: mapParameter(item.activity_type),
  };
}

function mapImportJob(record: unknown): DebtorImportJob | null {
  const job = asRecord(record);
  if (!job) return null;
  const id = readString(job, "id");
  if (!id) return null;

  return {
    id,
    type: readString(job, "type") ?? "",
    status: readString(job, "status") ?? "PENDING",
    import_segment: nullableString(job, "import_segment", "importSegment"),
    cif_status: nullableString(job, "cif_status", "cifStatus"),
    period_month: nullableString(job, "period_month", "periodMonth"),
    file: mapFile(job.file),
    files: Array.isArray(job.files)
      ? job.files.map((file) => mapFile(file)).filter((file): file is NonNullable<ReturnType<typeof mapFile>> => file !== null)
      : [],
    total_rows: numberValue(job, "total_rows"),
    success_rows: numberValue(job, "success_rows"),
    failed_rows: numberValue(job, "failed_rows"),
    error_summary: job.error_summary ?? job.errorSummary ?? null,
    processing_summary: job.processing_summary ?? job.processingSummary ?? null,
    started_at: nullableString(job, "started_at", "startedAt"),
    completed_at: nullableString(job, "completed_at", "completedAt"),
    segments: Array.isArray(job.segments) ? job.segments : [],
    records: Array.isArray(job.records) ? job.records : [],
    created_at: nullableString(job, "created_at", "createdAt"),
    updated_at: nullableString(job, "updated_at", "updatedAt"),
  };
}

function mapWorkflowCollectibility(record: unknown): DebtorWorkflowCollectibility | null {
  const item = asRecord(record);
  if (!item) return null;
  const base = mapCollectibility(item);
  const contractId = readString(item, "contract_id", "contractId");
  const contractNumber = readString(item, "contract_number", "contractNumber");
  if (!base || !contractId || !contractNumber) return null;
  return {
    ...base,
    contract_id: contractId,
    contract_number: contractNumber,
  };
}

function mapIdebOtherBprs(record: unknown): DebtorIdebOtherBprs | null {
  const item = asRecord(record);
  if (!item) return null;
  const name = readString(item, "name");
  if (!name) return null;
  return {
    name,
    collectibility: readString(item, "collectibility") ?? readNumber(item, "collectibility"),
    outstanding_pokok: numberValue(item, "outstanding_pokok"),
  };
}

function mapIdebSummaryDetail(record: unknown): DebtorIdebSummaryDetail | null {
  const item = asRecord(record);
  if (!item) return null;
  const otherBprs = Array.isArray(item.other_bprs)
    ? item.other_bprs
        .map((entry) => mapIdebOtherBprs(entry))
        .filter((entry): entry is DebtorIdebOtherBprs => entry !== null)
    : [];

  return {
    debtor_name: nullableString(item, "debtor_name", "debtorName"),
    identity_number: nullableString(item, "identity_number", "identityNumber"),
    contract_number: nullableString(item, "contract_number", "contractNumber"),
    current_collectibility:
      readString(item, "current_collectibility", "currentCollectibility") ??
      readNumber(item, "current_collectibility", "currentCollectibility"),
    outstanding_pokok: numberValue(item, "outstanding_pokok"),
    financing_status: nullableString(item, "financing_status", "financingStatus"),
    conclusion: nullableString(item, "conclusion"),
    processed_at: normalizeDate(item.processed_at),
    other_bprs: otherBprs,
  };
}

function mapIdebUpload(record: unknown): DebtorWorkflowIdebUpload | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  if (!id) return null;

  return {
    id,
    debtor_id: nullableString(item, "debtor_id", "debtorId"),
    contract_id: nullableString(item, "contract_id", "contractId"),
    month: numberValue(item, "month"),
    year: numberValue(item, "year"),
    status: readString(item, "status") ?? "PENDING",
    result_summary: asRecord(item.result_summary) ?? null,
    summary_detail: mapIdebSummaryDetail(item.summary_detail),
    file: mapFile(item.file),
    debtor: mapDebtor(item.debtor, false),
    contract: mapContract(item.contract, false),
    created_at: nullableString(item, "created_at", "createdAt"),
  };
}

function mapRestructuringRecord(record: unknown): DebtorRestructuringRecord | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const periodMonth = readString(item, "period_month", "periodMonth");
  if (!id || !periodMonth) return null;

  return {
    id,
    import_job_id: nullableString(item, "import_job_id", "importJobId"),
    debtor_id: nullableString(item, "debtor_id", "debtorId"),
    contract_id: nullableString(item, "contract_id", "contractId"),
    period_month: periodMonth,
    restructuring_date: nullableString(item, "restructuring_date", "restructuringDate"),
    restructuring_type: nullableString(item, "restructuring_type", "restructuringType"),
    reason: nullableString(item, "reason"),
    plafond_after: readNumber(item, "plafond_after", "plafondAfter"),
    outstanding_after: readNumber(item, "outstanding_after", "outstandingAfter"),
    tenor_after: readNumber(item, "tenor_after", "tenorAfter"),
    new_due_date: nullableString(item, "new_due_date", "newDueDate"),
    collectibility_before: nullableString(
      item,
      "collectibility_before",
      "collectibilityBefore",
    ),
    collectibility_after: nullableString(
      item,
      "collectibility_after",
      "collectibilityAfter",
    ),
    status: readString(item, "status") ?? "AKTIF",
    description: nullableString(item, "description"),
    raw_data: asRecord(item.raw_data) ?? null,
    contract: mapContract(item.contract, false),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapLegalPrint(record: unknown): DebtorWorkflowPrint | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const contractId = readString(item, "contract_id", "contractId");
  if (!id || !contractId) return null;

  return {
    id,
    template_id: nullableString(item, "template_id", "templateId"),
    numbering_template_id: nullableString(
      item,
      "numbering_template_id",
      "numberingTemplateId",
    ),
    contract_id: contractId,
    document_type: readString(item, "document_type", "documentType") ?? "-",
    generated_number: readString(item, "generated_number", "generatedNumber") ?? "-",
    payload_snapshot: asRecord(item.payload_snapshot) ?? null,
    generated_file: mapFile(item.generated_file),
    contract: mapContract(item.contract, false),
    printed_at: nullableString(item, "printed_at", "printedAt"),
    created_at: nullableString(item, "created_at", "createdAt"),
  };
}

function mapWarningLetter(record: unknown): DebtorWarningLetter | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const debtorId = readString(item, "debtor_id", "debtorId");
  if (!id || !debtorId) return null;

  return {
    id,
    debtor_id: debtorId,
    contract_id: nullableString(item, "contract_id", "contractId"),
    letter_type: readString(item, "letter_type", "letterType") ?? "-",
    issued_at: normalizeDate(item.issued_at),
    sent_at: normalizeDate(item.sent_at),
    delivery_status:
      readString(item, "delivery_status", "deliveryStatus", "status") ??
      "BELUM_DIKIRIM",
    status:
      readString(item, "delivery_status", "deliveryStatus", "status") ??
      "BELUM_DIKIRIM",
    description: nullableString(item, "description", "notes"),
    notes: nullableString(item, "description", "notes"),
    file: mapFile(item.file),
    debtor: mapDebtor(item.debtor, false),
    contract: mapContract(item.contract, false),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapWorkflowProgress(record: unknown): DebtorWorkflowLegalProgress | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const contractId = readString(item, "contract_id", "contractId");
  if (!id || !contractId) return null;

  return {
    id,
    contract_id: contractId,
    third_party_id: nullableString(item, "third_party_id", "thirdPartyId"),
    deed_type: nullableString(item, "deed_type", "deedType"),
    received_at: normalizeDate(item.received_at),
    estimated_completed_at: normalizeDate(item.estimated_completed_at),
    completed_at: normalizeDate(item.completed_at),
    deed_number: nullableString(item, "deed_number", "deedNumber"),
    insurance_type: nullableString(item, "insurance_type", "insuranceType"),
    coverage_amount: numberValue(item, "coverage_amount"),
    period_start: normalizeDate(item.period_start),
    period_end: normalizeDate(item.period_end),
    policy_number: nullableString(item, "policy_number", "policyNumber"),
    appraisal_type: nullableString(item, "appraisal_type", "appraisalType"),
    report_number: nullableString(item, "report_number", "reportNumber"),
    collateral_object: nullableString(item, "collateral_object", "collateralObject"),
    appraisal_value: readNumber(item, "appraisal_value", "appraisalValue"),
    status: readString(item, "status") ?? "PROSES",
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
    contract: mapContract(item.contract, false),
    third_party: mapParameter(item.third_party),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapWorkflowClaim(record: unknown): DebtorWorkflowClaim | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const contractId = readString(item, "contract_id", "contractId");
  if (!id || !contractId) return null;

  return {
    id,
    contract_id: contractId,
    insurance_progress_id: nullableString(
      item,
      "insurance_progress_id",
      "insuranceProgressId",
    ),
    policy_number: nullableString(item, "policy_number", "policyNumber"),
    claim_type: readString(item, "claim_type", "claimType") ?? "-",
    claim_amount: numberValue(item, "claim_amount"),
    submitted_at: normalizeDate(item.submitted_at),
    status: readString(item, "status") ?? "PENGAJUAN",
    approved_amount: readNumber(item, "approved_amount", "approvedAmount"),
    disbursed_amount: readNumber(item, "disbursed_amount", "disbursedAmount"),
    disbursed_at: normalizeDate(item.disbursed_at),
    rejection_reason: nullableString(item, "rejection_reason", "rejectionReason"),
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
    contract: mapContract(item.contract, false),
    insurance_progress: mapWorkflowProgress(item.insurance_progress),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapDepositTransaction(record: unknown): DebtorWorkflowDepositTransaction | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const depositId = readString(item, "deposit_id", "depositId");
  if (!id || !depositId) return null;

  return {
    id,
    deposit_id: depositId,
    transaction_date: normalizeDate(item.transaction_date),
    action: readString(item, "action") ?? "-",
    amount: numberValue(item, "amount"),
    notes: nullableString(item, "notes"),
    created_at: nullableString(item, "created_at", "createdAt"),
  };
}

function mapWorkflowDeposit(record: unknown): DebtorWorkflowDeposit | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const contractId = readString(item, "contract_id", "contractId");
  if (!id || !contractId) return null;

  return {
    id,
    deposit_type_id: nullableString(item, "deposit_type_id", "depositTypeId"),
    type: readString(item, "type") ?? "-",
    contract_id: contractId,
    third_party_id: nullableString(item, "third_party_id", "thirdPartyId"),
    nominal: numberValue(item, "nominal"),
    paid_amount: numberValue(item, "paid_amount"),
    processed_amount: numberValue(item, "processed_amount"),
    remaining_amount: numberValue(item, "remaining_amount"),
    status: readString(item, "status") ?? "PENDING",
    notes: nullableString(item, "notes"),
    deposit_type: mapParameter(item.deposit_type),
    contract: mapContract(item.contract, false),
    third_party: mapParameter(item.third_party),
    transactions: Array.isArray(item.transactions)
      ? item.transactions
          .map((transaction) => mapDepositTransaction(transaction))
          .filter(
            (transaction): transaction is DebtorWorkflowDepositTransaction =>
              transaction !== null,
          )
      : [],
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapWorkflow(payload: unknown): DebtorWorkflow | null {
  const record = extractRecord(payload);
  if (!record) return null;
  const debtor = mapDebtor(record.debtor);
  if (!debtor) return null;

  const marketing = asRecord(record.marketing) ?? {};
  const timeline = asRecord(marketing.timeline) ?? {};
  const legal = asRecord(record.legal) ?? {};

  return {
    debtor,
    contracts: Array.isArray(record.contracts)
      ? record.contracts
          .map((item) => mapContract(item, false))
          .filter((item): item is DebtorContract => item !== null)
      : [],
    collectibilities: Array.isArray(record.collectibilities)
      ? record.collectibilities
          .map((item) => mapWorkflowCollectibility(item))
          .filter((item): item is DebtorWorkflowCollectibility => item !== null)
      : [],
    documents: Array.isArray(record.documents)
      ? record.documents
          .map((item) => mapDocument(item))
          .filter((item): item is DebtorDocument => item !== null)
      : [],
    collaterals: Array.isArray(record.collaterals)
      ? record.collaterals
          .map((item) => mapCollateral(item))
          .filter((item): item is DebtorCollateral => item !== null)
      : [],
    restructuring_records: Array.isArray(record.restructuring_records)
      ? record.restructuring_records
          .map((item) => mapRestructuringRecord(item))
          .filter((item): item is DebtorRestructuringRecord => item !== null)
      : [],
    document_checklist_status: Array.isArray(record.document_checklist_status)
      ? record.document_checklist_status
          .map((item) => mapDocumentChecklistStatus(item))
          .filter((item): item is DebtorDocumentChecklistStatus => item !== null)
      : [],
    marketing: {
      action_plans: Array.isArray(marketing.action_plans)
        ? marketing.action_plans
            .map((item) => mapMarketingActivity(item))
            .filter((item): item is DebtorMarketingActivity => item !== null)
        : [],
      visit_results: Array.isArray(marketing.visit_results)
        ? marketing.visit_results
            .map((item) => mapMarketingActivity(item))
            .filter((item): item is DebtorMarketingActivity => item !== null)
        : [],
      handling_steps: Array.isArray(marketing.handling_steps)
        ? marketing.handling_steps
            .map((item) => mapMarketingActivity(item))
            .filter((item): item is DebtorMarketingActivity => item !== null)
        : [],
      timeline: {
        rows: Array.isArray(timeline.rows)
          ? timeline.rows
              .map((item) => mapMarketingTimelineRow(item))
              .filter((item): item is DebtorMarketingTimelineRow => item !== null)
          : [],
        dates: Array.isArray(timeline.dates)
          ? timeline.dates
              .map((item) => (typeof item === "string" ? item : null))
              .filter((item): item is string => item !== null)
          : [],
        entries: Array.isArray(timeline.entries)
          ? timeline.entries
              .map((item) => mapMarketingTimelineEntry(item))
              .filter((item): item is DebtorMarketingTimelineEntry => item !== null)
          : [],
      },
    },
    ideb_uploads: Array.isArray(record.ideb_uploads)
      ? record.ideb_uploads
          .map((item) => mapIdebUpload(item))
          .filter((item): item is DebtorWorkflowIdebUpload => item !== null)
      : [],
    legal: {
      prints: Array.isArray(legal.prints)
        ? legal.prints
            .map((item) => mapLegalPrint(item))
            .filter((item): item is DebtorWorkflowPrint => item !== null)
        : [],
      warning_letters: Array.isArray(legal.warning_letters)
        ? legal.warning_letters
            .map((item) => mapWarningLetter(item))
            .filter((item): item is DebtorWarningLetter => item !== null)
        : [],
      notary_progress: Array.isArray(legal.notary_progress)
        ? legal.notary_progress
            .map((item) => mapWorkflowProgress(item))
            .filter((item): item is DebtorWorkflowLegalProgress => item !== null)
        : [],
      insurance_progress: Array.isArray(legal.insurance_progress)
        ? legal.insurance_progress
            .map((item) => mapWorkflowProgress(item))
            .filter((item): item is DebtorWorkflowLegalProgress => item !== null)
        : [],
      kjpp_progress: Array.isArray(legal.kjpp_progress)
        ? legal.kjpp_progress
            .map((item) => mapWorkflowProgress(item))
            .filter((item): item is DebtorWorkflowLegalProgress => item !== null)
        : [],
      claims: Array.isArray(legal.claims)
        ? legal.claims
            .map((item) => mapWorkflowClaim(item))
            .filter((item): item is DebtorWorkflowClaim => item !== null)
        : [],
      deposits: Array.isArray(legal.deposits)
        ? legal.deposits
            .map((item) => mapWorkflowDeposit(item))
            .filter((item): item is DebtorWorkflowDeposit => item !== null)
        : [],
    },
  };
}

function mapPage<T>(
  payload: unknown,
  mapper: (record: UnknownRecord) => T | null,
  fallback: { page?: number; limit?: number } = {},
): DebtorPageResult<T> {
  const items = extractList(payload)
    .map((record) => mapper(record))
    .filter((item): item is T => item !== null);

  return {
    items,
    meta: extractPaginationMeta(payload, {
      page: fallback.page,
      limit: fallback.limit,
      total: items.length,
    }),
  };
}

function buildQuery(query: DebtorListQuery = {}) {
  return Object.fromEntries(
    Object.entries({
      page: query.page ?? 1,
      limit: query.limit ?? OPERATIONAL_TABLE_PAGE_SIZE,
      search: query.search,
      branch_id: query.branch_id,
      marketing_user_id: query.marketing_user_id,
      customer_type: query.customer_type,
      status: query.status,
      period_month: query.period_month,
      collectibility_level: query.collectibility_level,
      collateral_type: query.collateral_type,
      link_status: query.link_status,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function mapEndpoint(type: DebtorImportType) {
  switch (type) {
    case "IDEB":
      return "/debtor-imports/ideb";
    case "SLIK":
      return "/debtor-imports/slik";
    case "RESTRIK":
      return "/debtor-imports/restrik";
    default:
      return "/debtor-imports/slik";
  }
}

function toImportFormData(payload: DebtorImportPayload) {
  const formData = new FormData();
  const files = payload.files?.length ? payload.files : payload.file ? [payload.file] : [];
  files.forEach((file) => formData.append("files", file));
  if (payload.import_segment) formData.append("import_segment", payload.import_segment);
  if (payload.debtor_id) formData.append("debtor_id", payload.debtor_id);
  if (payload.contract_id) formData.append("contract_id", payload.contract_id);
  if (payload.period_month) formData.append("period_month", payload.period_month);
  if (payload.raw_reference) formData.append("raw_reference", payload.raw_reference);
  if (payload.total_rows !== undefined) {
    formData.append("total_rows", String(payload.total_rows));
  }
  return formData;
}

export const debiturService = {
  getDebtorsPage: async (
    query: DebtorListQuery = {},
  ): Promise<DebtorPageResult<DebtorRecord>> => {
    const params = buildQuery(query);
    const res = await api.get("/debtors", { params });
    return mapPage(res.data, mapDebtor, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  getAllDebtors: async (query: DebtorListQuery = {}): Promise<DebtorRecord[]> => {
    const first = await debiturService.getDebtorsPage({
      ...query,
      page: 1,
      limit: MAX_TABLE_PAGE_SIZE,
    });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await debiturService.getDebtorsPage({
        ...query,
        page,
        limit: MAX_TABLE_PAGE_SIZE,
      });
      all.push(...next.items);
    }

    return all;
  },

  getDebtorById: async (id: string): Promise<DebtorRecord> => {
    const res = await api.get(`/debtors/${id}`);
    const mapped = mapDebtor(extractRecord(res.data));
    if (!mapped) throw new Error("Respons detail debitur dari server tidak valid");
    return mapped;
  },

  getDebtorWorkflow: async (id: string): Promise<DebtorWorkflow> => {
    const res = await api.get(`/debtors/${id}/workflow`);
    const mapped = mapWorkflow(res.data);
    if (!mapped) throw new Error("Respons workflow debitur dari server tidak valid");
    return mapped;
  },

  createDebtor: async (payload: DebtorPayload): Promise<DebtorRecord> => {
    const res = await api.post("/debtors", payload);
    const mapped = mapDebtor(extractRecord(res.data));
    if (!mapped) throw new Error("Respons create debitur dari server tidak valid");
    return mapped;
  },

  updateDebtor: async (
    id: string,
    payload: DebtorPayload,
  ): Promise<DebtorRecord> => {
    const res = await api.put(`/debtors/${id}`, payload);
    const mapped = mapDebtor(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update debitur dari server tidak valid");
    return mapped;
  },

  removeDebtor: async (id: string): Promise<void> => {
    await api.delete(`/debtors/${id}`);
  },

  getContractsPage: async (
    query: DebtorListQuery & { debtor_id?: string } = {},
  ): Promise<DebtorPageResult<DebtorContract>> => {
    const params = buildQuery(query);
    if (query.debtor_id) params.debtor_id = query.debtor_id;
    const res = await api.get("/debtor-contracts", { params });
    return mapPage(res.data, mapContract, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  getAllContracts: async (
    query: DebtorListQuery & { debtor_id?: string } = {},
  ): Promise<DebtorContract[]> => {
    const first = await debiturService.getContractsPage({
      ...query,
      page: 1,
      limit: MAX_TABLE_PAGE_SIZE,
    });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await debiturService.getContractsPage({
        ...query,
        page,
        limit: MAX_TABLE_PAGE_SIZE,
      });
      all.push(...next.items);
    }

    return all;
  },

  getCollateralsPage: async (
    query: DebtorListQuery = {},
  ): Promise<DebtorPageResult<DebtorCollateral>> => {
    const params = buildQuery(query);
    const res = await api.get("/debtors/collaterals", { params });
    return mapPage(res.data, mapCollateral, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  getContractById: async (id: string): Promise<DebtorContract> => {
    const res = await api.get(`/debtor-contracts/${id}`);
    const mapped = mapContract(extractRecord(res.data));
    if (!mapped) throw new Error("Respons detail kontrak dari server tidak valid");
    return mapped;
  },

  createContract: async (
    payload: DebtorContractPayload,
  ): Promise<DebtorContract> => {
    const res = await api.post("/debtor-contracts", payload);
    const mapped = mapContract(extractRecord(res.data));
    if (!mapped) throw new Error("Respons create kontrak dari server tidak valid");
    return mapped;
  },

  updateContract: async (
    id: string,
    payload: DebtorContractPayload,
  ): Promise<DebtorContract> => {
    const res = await api.put(`/debtor-contracts/${id}`, payload);
    const mapped = mapContract(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update kontrak dari server tidak valid");
    return mapped;
  },

  removeContract: async (id: string): Promise<void> => {
    await api.delete(`/debtor-contracts/${id}`);
  },

  getDebtorDocuments: async (
    debtorId: string,
    query: DebtorListQuery = {},
  ): Promise<DebtorPageResult<DebtorDocument>> => {
    const params = buildQuery(query);
    const res = await api.get(`/debtors/${debtorId}/documents`, { params });
    return mapPage(res.data, mapDocument, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  createDebtorDocument: async (
    debtorId: string,
    payload: DebtorDocumentPayload,
  ): Promise<DebtorDocument> => {
    const res = await api.post(
      `/debtors/${debtorId}/documents`,
      toMultipartFormData(payload),
    );
    const mapped = mapDocument(extractRecord(res.data));
    if (!mapped) {
      throw new Error("Respons upload dokumen debitur dari server tidak valid");
    }
    return mapped;
  },

  getMarketingPage: async (
    kind: DebtorMarketingKind,
    query: DebtorListQuery & { debtor_id?: string; contract_id?: string } = {},
  ): Promise<DebtorPageResult<DebtorMarketingActivity>> => {
    const params = buildQuery(query);
    if (query.debtor_id) params.debtor_id = query.debtor_id;
    if (query.contract_id) params.contract_id = query.contract_id;
    const res = await api.get(`/debtor-marketing/${kind}`, { params });
    return mapPage(res.data, mapMarketingActivity, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  createMarketing: async (
    kind: DebtorMarketingKind,
    payload: DebtorMarketingPayload,
  ): Promise<DebtorMarketingActivity> => {
    const body = payload.file ? toMultipartFormData(payload) : payload;
    const res = await api.post(`/debtor-marketing/${kind}`, body);
    const mapped = mapMarketingActivity(extractRecord(res.data));
    if (!mapped) {
      throw new Error("Respons create aktivitas marketing dari server tidak valid");
    }
    return mapped;
  },

  updateMarketing: async (
    kind: DebtorMarketingKind,
    id: string,
    payload: DebtorMarketingPayload,
  ): Promise<DebtorMarketingActivity> => {
    const body = payload.file ? toMultipartFormData(payload) : payload;
    const res = await api.put(`/debtor-marketing/${kind}/${id}`, body);
    const mapped = mapMarketingActivity(extractRecord(res.data));
    if (!mapped) {
      throw new Error("Respons update aktivitas marketing dari server tidak valid");
    }
    return mapped;
  },

  removeMarketing: async (kind: DebtorMarketingKind, id: string): Promise<void> => {
    await api.delete(`/debtor-marketing/${kind}/${id}`);
  },

  getWarningLettersPage: async (
    query: DebtorListQuery & {
      debtor_id?: string;
      contract_id?: string;
      delivery_status?: string;
      letter_type?: string;
    } = {},
  ): Promise<DebtorPageResult<DebtorWarningLetter>> => {
    const params = buildQuery(query);
    if (query.debtor_id) params.debtor_id = query.debtor_id;
    if (query.contract_id) params.contract_id = query.contract_id;
    if (query.delivery_status) params.delivery_status = query.delivery_status;
    if (query.letter_type) params.letter_type = query.letter_type;
    const res = await api.get("/debtor-warning-letters", { params });
    return mapPage(res.data, mapWarningLetter, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  createWarningLetter: async (
    payload: DebtorWarningLetterPayload,
  ): Promise<DebtorWarningLetter> => {
    const body = payload.file ? toMultipartFormData(payload) : payload;
    const res = await api.post("/debtor-warning-letters", body);
    const mapped = mapWarningLetter(extractRecord(res.data));
    if (!mapped) {
      throw new Error("Respons create surat peringatan dari server tidak valid");
    }
    return mapped;
  },

  updateWarningLetter: async (
    id: string,
    payload: DebtorWarningLetterPayload,
  ): Promise<DebtorWarningLetter> => {
    const body = payload.file ? toMultipartFormData(payload) : payload;
    const res = await api.put(`/debtor-warning-letters/${id}`, body);
    const mapped = mapWarningLetter(extractRecord(res.data));
    if (!mapped) {
      throw new Error("Respons update surat peringatan dari server tidak valid");
    }
    return mapped;
  },

  removeWarningLetter: async (id: string): Promise<void> => {
    await api.delete(`/debtor-warning-letters/${id}`);
  },

  getImportJobs: async (
    query: DebtorListQuery & { type?: DebtorImportType | string } = {},
  ): Promise<DebtorPageResult<DebtorImportJob>> => {
    const params = buildQuery(query);
    if (query.type) params.type = query.type;
    const res = await api.get("/debtor-imports", { params });
    return mapPage(res.data, mapImportJob, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },

  createImportJob: async (
    type: DebtorImportType,
    payload: DebtorImportPayload,
  ): Promise<DebtorImportJob> => {
    const res = await api.post(mapEndpoint(type), toImportFormData(payload));
    const mapped = mapImportJob(extractRecord(res.data));
    if (!mapped) throw new Error("Respons import dari server tidak valid");
    return mapped;
  },

  getReportSummary: async (): Promise<DebtorReportSummary> => {
    const res = await api.get("/debtor-reports/summary");
    const record = extractRecord(res.data) ?? {};
    return {
      total_debtors: numberValue(record, "total_debtors"),
      active_debtors: numberValue(record, "active_debtors"),
      inactive_debtors: numberValue(record, "inactive_debtors"),
      active_contracts: numberValue(record, "active_contracts"),
      closed_contracts: numberValue(record, "closed_contracts"),
    };
  },

  getNpfReport: async (query: { from_period?: string; to_period?: string } = {}): Promise<DebtorNpfReport> => {
    const res = await api.get("/debtor-reports/npf", {
      params: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value),
      ),
    });
    const record = extractRecord(res.data) ?? {};
    const breakdown = Array.isArray(record.breakdown_per_kol)
      ? record.breakdown_per_kol
          .filter(isRecord)
          .map<DebtorNpfBreakdown>((item) => ({
            level: readNumber(item, "level"),
            code: nullableString(item, "code"),
            name: readString(item, "name") ?? "Belum ada kolektibilitas",
            contract_count: numberValue(item, "contract_count"),
            outstanding: numberValue(item, "outstanding"),
            is_npf: readBoolean(item, "is_npf", "isNpf"),
          }))
      : [];
    const trend = Array.isArray(record.trend)
      ? record.trend.filter(isRecord).map<DebtorNpfTrend>((item) => ({
          period_month: readString(item, "period_month", "periodMonth") ?? "-",
          numerator: numberValue(item, "numerator"),
          denominator: numberValue(item, "denominator"),
          percentage: numberValue(item, "percentage"),
        }))
      : [];
    const details = Array.isArray(record.details)
      ? record.details.filter(isRecord).map<DebtorNpfDetail>((item) => ({
          debtor_id: nullableString(item, "debtor_id", "debtorId"),
          debtor_number: nullableString(item, "debtor_number", "debtorNumber"),
          debtor_name: readString(item, "debtor_name", "debtorName") ?? "-",
          contract_id: readString(item, "contract_id", "contractId") ?? "",
          contract_number: readString(item, "contract_number", "contractNumber") ?? "-",
          level: readNumber(item, "level"),
          code: nullableString(item, "code"),
          name: readString(item, "name") ?? "Belum ada kolektibilitas",
          outstanding: numberValue(item, "outstanding"),
          outstanding_pokok: numberValue(item, "outstanding_pokok"),
          outstanding_margin: numberValue(item, "outstanding_margin"),
          remaining_months: numberValue(item, "remaining_months"),
          is_npf: readBoolean(item, "is_npf", "isNpf"),
        }))
      : [];

    return {
      formula: readString(record, "formula") ?? "",
      numerator: numberValue(record, "numerator"),
      denominator: numberValue(record, "denominator"),
      percentage: numberValue(record, "percentage"),
      breakdown_per_kol: breakdown,
      details,
      trend,
    };
  },

  getMarketingReport: async (
    query: {
      from_date?: string;
      to_date?: string;
      activity_kind?: string;
      status?: string;
      search?: string;
      sort?: string;
      limit?: number;
    } = {},
  ): Promise<DebtorMarketingReport> => {
    const res = await api.get("/debtor-reports/marketing-activity", {
      params: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value),
      ),
    });
    const record = extractRecord(res.data) ?? {};
    const summary = Array.isArray(record.summary)
      ? record.summary.filter(isRecord).map<DebtorMarketingReportSummary>((item) => ({
          activity_kind: readString(item, "activity_kind", "activityKind") ?? "-",
          status: readString(item, "status") ?? "-",
          total: numberValue(item, "total"),
        }))
      : [];
    const recent = Array.isArray(record.recent_activities)
      ? record.recent_activities
          .filter(isRecord)
          .map<DebtorMarketingReportActivity>((item) => ({
            id: readString(item, "id") ?? "",
            activity_kind: readString(item, "activity_kind", "activityKind") ?? "-",
            status: readString(item, "status") ?? "-",
            activity_date: normalizeDate(item.activity_date),
            target_date: normalizeDate(item.target_date),
            debtor: mapDebtor(item.debtor, false),
            contract: mapContract(item.contract, false),
            action_plan: nullableString(item, "action_plan", "actionPlan"),
            visit_address: nullableString(item, "visit_address", "visitAddress"),
            visit_result: nullableString(item, "visit_result", "visitResult"),
            conclusion: nullableString(item, "conclusion"),
            handling_step: nullableString(item, "handling_step", "handlingStep"),
            handling_result: nullableString(item, "handling_result", "handlingResult"),
            notes: nullableString(item, "notes"),
            file: mapFile(item.file),
            created_at: nullableString(item, "created_at", "createdAt"),
          }))
      : [];

    return {
      summary,
      recent_activities: recent,
    };
  },
};
