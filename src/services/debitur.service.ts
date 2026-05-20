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
  DebtorCollectibilitySummary,
  DebtorContract,
  DebtorContractPayload,
  DebtorDocument,
  DebtorDocumentChecklistStatus,
  DebtorDocumentPayload,
  DebtorFileMeta,
  DebtorIdebOtherBprs,
  DebtorIdebSummaryDetail,
  DebtorImportJob,
  DebtorImportPayload,
  DebtorImportType,
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
  DebtorUserSummary,
  DebtorWarningLetter,
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
    status: readString(debtor, "status") ?? "ACTIVE",
    description: nullableString(debtor, "description"),
    branch: mapBranch(debtor.branch),
    marketing_user: mapUser(debtor.marketing_user),
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
    contract: mapContract(item.contract),
    uploaded_by: nullableString(item, "uploaded_by", "uploadedBy"),
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
    file: mapFile(job.file),
    total_rows: numberValue(job, "total_rows"),
    success_rows: numberValue(job, "success_rows"),
    failed_rows: numberValue(job, "failed_rows"),
    error_summary: nullableString(job, "error_summary", "errorSummary"),
    started_at: nullableString(job, "started_at", "startedAt"),
    completed_at: nullableString(job, "completed_at", "completedAt"),
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
    status: readString(item, "status") ?? "PENDING",
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
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
      status: query.status,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function mapEndpoint(type: DebtorImportType) {
  switch (type) {
    case "COLLECTIBILITY":
      return "/debtor-imports/collectibility";
    case "SLIK":
      return "/debtor-imports/slik";
    case "RESTRIK":
      return "/debtor-imports/restrik";
    case "MASTER":
    default:
      return "/debtor-imports/master";
  }
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
    const res = await api.post(mapEndpoint(type), toMultipartFormData(payload));
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
    query: { from_date?: string; to_date?: string } = {},
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
            notes: nullableString(item, "notes"),
            created_at: nullableString(item, "created_at", "createdAt"),
          }))
      : [];

    return {
      summary,
      recent_activities: recent,
    };
  },
};
