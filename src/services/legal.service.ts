import api from "@/lib/axios";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
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
import type { ParameterMasterRecord } from "@/services/parameter-master.service";
import type {
  DebtorCollateral,
  DebtorContract,
  DebtorFileMeta,
  DebtorParameterSummary,
  DebtorRecord,
} from "@/types/debitur.types";
import type {
  LegalClaim,
  LegalClaimPayload,
  LegalDeposit,
  LegalDepositFundsReport,
  LegalDepositPayload,
  LegalDepositTransaction,
  LegalDepositTransactionPayload,
  LegalInsurancePayload,
  LegalKjppPayload,
  LegalListQuery,
  LegalDocumentContext,
  LegalPageResult,
  LegalPrintHistory,
  LegalPrintPayload,
  LegalProgressRecord,
  LegalSummaryReport,
  LegalTemplate,
  LegalTemplatePayload,
  LegalThirdPartyDocumentsReport,
  LegalNotaryPayload,
} from "@/types/legal.types";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return isRecord(value) ? value : null;
}

function nullableString(record: AnyRecord, ...keys: string[]): string | null {
  return readString(record, ...keys);
}

function numberValue(record: AnyRecord, key: string, fallback = 0): number {
  return readNumber(record, key) ?? fallback;
}

function booleanValue(record: AnyRecord, key: string, fallback = false): boolean {
  if (!(key in record)) return fallback;
  return readBoolean(record, key);
}

function normalizeDate(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function mapParameter(record: unknown): ParameterMasterRecord | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  if (!item || !id) return null;
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [key, value];
      }
      return [key, value === null || value === undefined ? null : String(value)];
    }),
  ) as ParameterMasterRecord;
}

function mapDebtorParameter(record: unknown): DebtorParameterSummary | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  const name = item ? readString(item, "name", "label") : null;
  if (!item || !id || !name) return null;
  return {
    id,
    code: nullableString(item, "code", "kode"),
    name,
    level: readNumber(item, "level"),
    is_npf: readBoolean(item, "is_npf", "isNpf"),
  };
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

function dedupeFileMetas(files: DebtorFileMeta[]): DebtorFileMeta[] {
  const seen = new Set<string>();
  const deduped: DebtorFileMeta[] = [];

  for (const file of files) {
    const key = [file.url ?? "", file.name ?? "", file.size_bytes ?? ""].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(file);
  }

  return deduped;
}

function mapFiles(value: unknown): DebtorFileMeta[] {
  if (!Array.isArray(value)) return [];
  return dedupeFileMetas(
    value
      .map((item) => mapFile(item))
      .filter((item): item is DebtorFileMeta => item !== null),
  );
}

function mapDebtor(record: unknown): DebtorRecord | null {
  const debtor = asRecord(record);
  const id = debtor ? readString(debtor, "id") : null;
  const name = debtor ? readString(debtor, "name") : null;
  if (!debtor || !id || !name) return null;
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
    branch: null,
    marketing_user: null,
    individual_profile: null,
    legal_entity_profile: null,
    latest_contract: null,
    contracts: [],
    contracts_count: 0,
    documents_count: 0,
    created_at: nullableString(debtor, "created_at", "createdAt"),
    updated_at: nullableString(debtor, "updated_at", "updatedAt"),
  };
}

function mapContract(record: unknown): DebtorContract | null {
  const contract = asRecord(record);
  const id = contract ? readString(contract, "id") : null;
  const noKontrak = contract ? readString(contract, "no_kontrak", "noKontrak") : null;
  const debtor = contract ? mapDebtor(contract.debtor) : null;
  const debtorId = contract ? readString(contract, "debtor_id", "debtorId") ?? debtor?.id : null;
  if (!contract || !id || !noKontrak || !debtorId) return null;
  return {
    id,
    no_kontrak: noKontrak,
    debtor_id: debtorId,
    debtor,
    product_id: nullableString(contract, "product_id", "productId"),
    akad_type_id: nullableString(contract, "akad_type_id", "akadTypeId"),
    branch_id: nullableString(contract, "branch_id", "branchId"),
    marketing_user_id: nullableString(contract, "marketing_user_id", "marketingUserId"),
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
    product: mapDebtorParameter(contract.product),
    akad_type: mapDebtorParameter(contract.akad_type),
    branch: null,
    marketing_user: null,
    latest_collectibility: null,
    collectibilities: [],
    latest_slik_snapshot: null,
    slik_snapshots: [],
    created_at: nullableString(contract, "created_at", "createdAt"),
    updated_at: nullableString(contract, "updated_at", "updatedAt"),
  };
}

function mapReferenceFields(record: AnyRecord, categories: string[]) {
  return Object.fromEntries(
    categories.flatMap((category) => [
      [`${category}_label`, nullableString(record, `${category}_label`, `${category}Label`)],
      [`${category}_display`, nullableString(record, `${category}_display`, `${category}Display`)],
    ]),
  );
}

function mapCollateral(record: unknown): DebtorCollateral | null {
  const item = asRecord(record);
  if (!item) return null;
  const id = readString(item, "id");
  const collateralNumber = readString(item, "collateral_number", "collateralNumber");
  if (!id || !collateralNumber) return null;

  return {
    id,
    debtor_id: nullableString(item, "debtor_id", "debtorId"),
    contract_id: nullableString(item, "contract_id", "contractId"),
    collateral_number: collateralNumber,
    ...mapReferenceFields(item, [
      "facility_segment",
      "collateral_status",
      "collateral_type",
      "rating_agency",
      "binding_type",
      "location_city",
      "paripasu_status",
      "joint_credit_status",
      "insured_status",
      "operation",
    ]),
    facility_number: nullableString(item, "facility_number", "facilityNumber"),
    facility_segment_code: nullableString(item, "facility_segment_code", "facilitySegmentCode"),
    collateral_status_code: nullableString(item, "collateral_status_code", "collateralStatusCode"),
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
    paripasu_percentage: readNumber(item, "paripasu_percentage", "paripasuPercentage"),
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
    debtor: mapDebtor(item.debtor),
    contract: mapContract(item.contract),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapTemplate(record: unknown): LegalTemplate | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  if (!item || !id) return null;
  return {
    id,
    template_type: readString(item, "template_type", "templateType") ?? "",
    version: numberValue(item, "version", 1),
    title: readString(item, "title") ?? "-",
    content_template: nullableString(item, "content_template", "contentTemplate"),
    is_active: booleanValue(item, "is_active", true),
    file: mapFile(item.file),
    files: mapFiles(item.files),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapPrint(record: unknown): LegalPrintHistory | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  const contractId = item ? readString(item, "contract_id", "contractId") : null;
  const generatedNumber = item ? readString(item, "generated_number", "generatedNumber") : null;
  if (!item || !id || !contractId || !generatedNumber) return null;
  return {
    id,
    template_id: nullableString(item, "template_id", "templateId"),
    numbering_template_id: nullableString(item, "numbering_template_id", "numberingTemplateId"),
    contract_id: contractId,
    document_type: readString(item, "document_type", "documentType") ?? "",
    generated_number: generatedNumber,
    payload_snapshot: asRecord(item.payload_snapshot),
    generated_file: mapFile(item.generated_file),
    files: mapFiles(item.files),
    template: mapTemplate(item.template),
    numbering_template: mapParameter(item.numbering_template),
    contract: mapContract(item.contract),
    printed_at: nullableString(item, "printed_at", "printedAt"),
    created_at: nullableString(item, "created_at", "createdAt"),
  };
}

function mapProgress(record: unknown): LegalProgressRecord | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  const contractId = item ? readString(item, "contract_id", "contractId") : null;
  const thirdPartyId = item ? readString(item, "third_party_id", "thirdPartyId") : null;
  if (!item || !id || !contractId || !thirdPartyId) return null;
  const rawStatus = readString(item, "status") ?? "PROSES";
  const status =
    readString(item, "insurance_type", "insuranceType") && rawStatus.toUpperCase() === "PROSES"
      ? "AKTIF"
      : rawStatus;
  return {
    id,
    contract_id: contractId,
    collateral_id: nullableString(item, "collateral_id", "collateralId"),
    third_party_id: thirdPartyId,
    deed_type: nullableString(item, "deed_type", "deedType"),
    received_at: nullableString(item, "received_at", "receivedAt"),
    estimated_completed_at: nullableString(item, "estimated_completed_at", "estimatedCompletedAt"),
    completed_at: nullableString(item, "completed_at", "completedAt"),
    insurance_type: nullableString(item, "insurance_type", "insuranceType"),
    coverage_amount: numberValue(item, "coverage_amount"),
    premium_amount: numberValue(item, "premium_amount"),
    period_start: nullableString(item, "period_start", "periodStart"),
    period_end: nullableString(item, "period_end", "periodEnd"),
    policy_number: nullableString(item, "policy_number", "policyNumber"),
    appraisal_type: nullableString(item, "appraisal_type", "appraisalType"),
    report_number: nullableString(item, "report_number", "reportNumber"),
    collateral_object: nullableString(item, "collateral_object", "collateralObject"),
    appraisal_value: readNumber(item, "appraisal_value", "appraisalValue"),
    status,
    deed_number: nullableString(item, "deed_number", "deedNumber"),
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
    files: mapFiles(item.files),
    contract: mapContract(item.contract),
    collateral: mapCollateral(item.collateral),
    third_party: mapParameter(item.third_party),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapClaim(record: unknown): LegalClaim | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  const contractId = item ? readString(item, "contract_id", "contractId") : null;
  if (!item || !id || !contractId) return null;
  return {
    id,
    contract_id: contractId,
    collateral_id: nullableString(item, "collateral_id", "collateralId"),
    insurance_progress_id: nullableString(item, "insurance_progress_id", "insuranceProgressId"),
    policy_number: nullableString(item, "policy_number", "policyNumber"),
    claim_type: readString(item, "claim_type", "claimType") ?? "-",
    claim_amount: numberValue(item, "claim_amount"),
    submitted_at: nullableString(item, "submitted_at", "submittedAt"),
    status: readString(item, "status") ?? "PENGAJUAN",
    approved_amount: readNumber(item, "approved_amount", "approvedAmount"),
    disbursed_amount: readNumber(item, "disbursed_amount", "disbursedAmount"),
    disbursed_at: nullableString(item, "disbursed_at", "disbursedAt"),
    rejection_reason: nullableString(item, "rejection_reason", "rejectionReason"),
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
    files: mapFiles(item.files),
    contract: mapContract(item.contract),
    collateral: mapCollateral(item.collateral),
    insurance_progress: mapProgress(item.insurance_progress),
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapDepositTransaction(record: unknown): LegalDepositTransaction | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  const depositId = item ? readString(item, "deposit_id", "depositId") : null;
  if (!item || !id || !depositId) return null;
  return {
    id,
    deposit_id: depositId,
    transaction_date: nullableString(item, "transaction_date", "transactionDate"),
    action: readString(item, "action") ?? "-",
    raw_action: nullableString(item, "raw_action", "rawAction"),
    amount: numberValue(item, "amount"),
    notes: nullableString(item, "notes"),
    file: mapFile(item.file),
    files: mapFiles(item.files),
    created_at: nullableString(item, "created_at", "createdAt"),
  };
}

function mapDeposit(record: unknown): LegalDeposit | null {
  const item = asRecord(record);
  const id = item ? readString(item, "id") : null;
  const contractId = item ? readString(item, "contract_id", "contractId") : null;
  if (!item || !id || !contractId) return null;
  const transactions = Array.isArray(item.transactions)
    ? item.transactions
        .map(mapDepositTransaction)
        .filter((transaction): transaction is LegalDepositTransaction => transaction !== null)
    : [];
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
    total_deposit_amount: numberValue(item, "total_deposit_amount", numberValue(item, "nominal")),
    total_payment_amount: numberValue(item, "total_payment_amount", numberValue(item, "paid_amount")),
    total_refund_amount: numberValue(item, "total_refund_amount", numberValue(item, "processed_amount")),
    balance_amount: numberValue(item, "balance_amount", numberValue(item, "remaining_amount")),
    status: readString(item, "status") ?? "PENDING",
    notes: nullableString(item, "notes"),
    deposit_type: mapParameter(item.deposit_type),
    contract: mapContract(item.contract),
    third_party: mapParameter(item.third_party),
    transactions,
    created_at: nullableString(item, "created_at", "createdAt"),
    updated_at: nullableString(item, "updated_at", "updatedAt"),
  };
}

function mapPrintContext(payload: unknown): LegalDocumentContext {
  const record = asRecord(extractRecord(payload)) ?? {};
  const values = asRecord(record.values) ?? {};
  const context = asRecord(record.context) ?? {};
  return {
    placeholders: Array.isArray(record.placeholders)
      ? record.placeholders.filter((item): item is string => typeof item === "string")
      : [],
    values: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null ||
        value === undefined
          ? value
          : String(value),
      ]),
    ),
    missing_fields: Array.isArray(record.missing_fields)
      ? record.missing_fields.filter((item): item is string => typeof item === "string")
      : [],
    context,
  };
}

function mapPage<T>(
  payload: unknown,
  mapper: (record: unknown) => T | null,
  fallback: { page?: number; limit?: number } = {},
): LegalPageResult<T> {
  const items = extractList(payload)
    .map(mapper)
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

function buildParams(query: LegalListQuery = {}) {
  return Object.fromEntries(
    Object.entries({
      page: query.page ?? 1,
      limit: query.limit ?? SETUP_TABLE_PAGE_SIZE,
      search: query.search,
      status: query.status,
      document_type: query.document_type,
      template_type: query.template_type,
      contract_id: query.contract_id,
      collateral_id: query.collateral_id,
      third_party_id: query.third_party_id,
      type: query.type,
      deposit_id: query.deposit_id,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function multipartBody<T extends object>(payload: T): T | FormData {
  return typeof File !== "undefined" &&
    Object.values(payload).some(
      (value) =>
        value instanceof File ||
        (Array.isArray(value) && value.some((item) => item instanceof File)),
    )
    ? toMultipartFormData(payload)
    : payload;
}

async function getAllPages<T>(
  getter: (query: LegalListQuery) => Promise<LegalPageResult<T>>,
  query: LegalListQuery = {},
): Promise<T[]> {
  const first = await getter({ ...query, page: 1, limit: MAX_TABLE_PAGE_SIZE });
  const all = [...first.items];
  for (let page = 2; page <= first.meta.lastPage; page += 1) {
    const next = await getter({ ...query, page, limit: MAX_TABLE_PAGE_SIZE });
    all.push(...next.items);
  }
  return all;
}

export const legalService = {
  getTemplatesPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/templates", { params });
    return mapPage(res.data, mapTemplate, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  getAllTemplates: (query: LegalListQuery = {}) =>
    getAllPages(legalService.getTemplatesPage, query),
  createTemplate: async (payload: LegalTemplatePayload) => {
    const res = await api.post("/legal/templates", multipartBody(payload));
    const mapped = mapTemplate(extractRecord(res.data));
    if (!mapped) throw new Error("Respons template legal dari server tidak valid");
    return mapped;
  },
  updateTemplate: async (id: string, payload: LegalTemplatePayload) => {
    const res = await api.put(`/legal/templates/${id}`, multipartBody(payload));
    const mapped = mapTemplate(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update template legal dari server tidak valid");
    return mapped;
  },
  removeTemplate: async (id: string) => {
    await api.delete(`/legal/templates/${id}`);
  },
  getPrintsPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/print-documents", { params });
    return mapPage(res.data, mapPrint, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  getPrintContext: async (query: Pick<LegalListQuery, "contract_id" | "collateral_id"> & {
    document_type: string;
  }) => {
    const res = await api.get("/legal/print-documents/context", {
      params: buildParams(query),
    });
    return mapPrintContext(res.data);
  },
  createPrint: async (payload: LegalPrintPayload) => {
    const res = await api.post("/legal/print-documents", multipartBody(payload));
    const mapped = mapPrint(extractRecord(res.data));
    if (!mapped) throw new Error("Respons cetak dokumen legal dari server tidak valid");
    return mapped;
  },
  getNotaryPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/progress/notary", { params });
    return mapPage(res.data, mapProgress, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  createNotary: async (payload: LegalNotaryPayload) => {
    const res = await api.post("/legal/progress/notary", multipartBody(payload));
    const mapped = mapProgress(extractRecord(res.data));
    if (!mapped) throw new Error("Respons progress notaris dari server tidak valid");
    return mapped;
  },
  updateNotary: async (id: string, payload: LegalNotaryPayload) => {
    const res = await api.put(`/legal/progress/notary/${id}`, multipartBody(payload));
    const mapped = mapProgress(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update progress notaris dari server tidak valid");
    return mapped;
  },
  removeNotary: async (id: string) => {
    await api.delete(`/legal/progress/notary/${id}`);
  },
  getInsurancePage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/progress/insurance", { params });
    return mapPage(res.data, mapProgress, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  createInsurance: async (payload: LegalInsurancePayload) => {
    const res = await api.post("/legal/progress/insurance", multipartBody(payload));
    const mapped = mapProgress(extractRecord(res.data));
    if (!mapped) throw new Error("Respons progress asuransi dari server tidak valid");
    return mapped;
  },
  updateInsurance: async (id: string, payload: LegalInsurancePayload) => {
    const res = await api.put(`/legal/progress/insurance/${id}`, multipartBody(payload));
    const mapped = mapProgress(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update progress asuransi dari server tidak valid");
    return mapped;
  },
  removeInsurance: async (id: string) => {
    await api.delete(`/legal/progress/insurance/${id}`);
  },
  getKjppPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/progress/kjpp", { params });
    return mapPage(res.data, mapProgress, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  createKjpp: async (payload: LegalKjppPayload) => {
    const res = await api.post("/legal/progress/kjpp", multipartBody(payload));
    const mapped = mapProgress(extractRecord(res.data));
    if (!mapped) throw new Error("Respons progress KJPP dari server tidak valid");
    return mapped;
  },
  updateKjpp: async (id: string, payload: LegalKjppPayload) => {
    const res = await api.put(`/legal/progress/kjpp/${id}`, multipartBody(payload));
    const mapped = mapProgress(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update progress KJPP dari server tidak valid");
    return mapped;
  },
  removeKjpp: async (id: string) => {
    await api.delete(`/legal/progress/kjpp/${id}`);
  },
  getClaimsPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/claims", { params });
    return mapPage(res.data, mapClaim, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  createClaim: async (payload: LegalClaimPayload) => {
    const res = await api.post("/legal/claims", multipartBody(payload));
    const mapped = mapClaim(extractRecord(res.data));
    if (!mapped) throw new Error("Respons klaim legal dari server tidak valid");
    return mapped;
  },
  updateClaim: async (id: string, payload: LegalClaimPayload) => {
    const res = await api.put(`/legal/claims/${id}`, multipartBody(payload));
    const mapped = mapClaim(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update klaim legal dari server tidak valid");
    return mapped;
  },
  removeClaim: async (id: string) => {
    await api.delete(`/legal/claims/${id}`);
  },
  getDepositsPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/deposits", { params });
    return mapPage(res.data, mapDeposit, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  createDeposit: async (payload: LegalDepositPayload) => {
    const res = await api.post("/legal/deposits", multipartBody(payload));
    const mapped = mapDeposit(extractRecord(res.data));
    if (!mapped) throw new Error("Respons dana titipan dari server tidak valid");
    return mapped;
  },
  updateDeposit: async (id: string, payload: LegalDepositPayload) => {
    const res = await api.put(`/legal/deposits/${id}`, multipartBody(payload));
    const mapped = mapDeposit(extractRecord(res.data));
    if (!mapped) throw new Error("Respons update dana titipan dari server tidak valid");
    return mapped;
  },
  removeDeposit: async (id: string) => {
    await api.delete(`/legal/deposits/${id}`);
  },
  getDepositTransactionsPage: async (query: LegalListQuery = {}) => {
    const params = buildParams(query);
    const res = await api.get("/legal/deposit-transactions", { params });
    return mapPage(res.data, mapDepositTransaction, {
      page: Number(params.page),
      limit: Number(params.limit),
    });
  },
  createDepositTransaction: async (payload: LegalDepositTransactionPayload) => {
    const res = await api.post("/legal/deposit-transactions", multipartBody(payload));
    const mapped = mapDepositTransaction(extractRecord(res.data));
    if (!mapped) throw new Error("Respons transaksi dana titipan dari server tidak valid");
    return mapped;
  },
  getSummaryReport: async (): Promise<LegalSummaryReport> => {
    const res = await api.get("/legal/reports/summary");
    const record = extractRecord(res.data) ?? {};
    return {
      templates: numberValue(record, "templates"),
      prints: numberValue(record, "prints"),
      notary: numberValue(record, "notary"),
      insurance: numberValue(record, "insurance"),
      kjpp: numberValue(record, "kjpp"),
      claims: numberValue(record, "claims"),
      deposits: numberValue(record, "deposits"),
    };
  },
  getThirdPartyDocumentsReport: async (): Promise<LegalThirdPartyDocumentsReport> => {
    const res = await api.get("/legal/reports/third-party-documents");
    const record = extractRecord(res.data) ?? {};
    return {
      notary: Array.isArray(record.notary) ? record.notary.filter(isRecord) : [],
      insurance: Array.isArray(record.insurance) ? record.insurance.filter(isRecord) : [],
      kjpp: Array.isArray(record.kjpp) ? record.kjpp.filter(isRecord) : [],
      claims: Array.isArray(record.claims) ? record.claims.filter(isRecord) : [],
    };
  },
  getThirdPartyDepositFundsReport: async (): Promise<LegalDepositFundsReport[]> => {
    const res = await api.get("/legal/reports/third-party-deposit-funds");
    return extractList(res.data).map((item) => ({
      type: readString(item, "type") ?? "-",
      status: readString(item, "status") ?? "-",
      total_records: numberValue(item, "total_records"),
      nominal: numberValue(item, "nominal"),
      paid_amount: numberValue(item, "paid_amount"),
      processed_amount: numberValue(item, "processed_amount"),
      remaining_amount: numberValue(item, "remaining_amount"),
      total_deposit_amount: numberValue(item, "total_deposit_amount", numberValue(item, "nominal")),
      total_payment_amount: numberValue(item, "total_payment_amount", numberValue(item, "paid_amount")),
      total_refund_amount: numberValue(item, "total_refund_amount", numberValue(item, "processed_amount")),
      balance_amount: numberValue(item, "balance_amount", numberValue(item, "remaining_amount")),
    }));
  },
};
