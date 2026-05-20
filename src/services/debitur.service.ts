import api from "@/lib/axios";
import {
  extractLastPage,
  extractList,
  extractRecord,
  readNullableString,
  readNumber,
  readString,
} from "@/services/api.utils";

type UnknownRecord = Record<string, unknown>;

export interface Debitur {
  id: string;
  debtor_number?: string;
  identity_number?: string;
  name: string;
  address?: string;
  phone?: string;
  branch_id?: string;
  marketing_user_id?: string;
  financing_number?: string;
  status?: string;
  description?: string;
  branch?: { id: string; name: string } | null;
  marketing_user?: { id: string; name: string; username: string } | null;
  latest_contract?: DebiturContract | null;
  contracts_count?: number;
  documents_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DebiturPayload {
  name: string;
  debtor_number?: string;
  identity_number?: string;
  address?: string;
  phone?: string;
  branch_id?: string;
  marketing_user_id?: string;
  financing_number?: string;
  status?: string;
  description?: string;
}

export interface DebiturContract {
  id: string;
  no_kontrak?: string;
  debtor_id?: string;
  product_id?: string;
  akad_type_id?: string;
  branch_id?: string;
  tanggal_akad?: string;
  tanggal_jatuh_tempo?: string;
  plafond?: number;
  pokok?: number;
  margin?: number;
  tenor?: number;
  outstanding_pokok?: number;
  outstanding_margin?: number;
  total_outstanding?: number;
  status?: string;
  objek_pembiayaan?: string;
  agunan?: string;
  created_at?: string;
}

export interface DebiturDocument {
  id: string;
  debtor_id: string;
  contract_id?: string;
  document_type?: string;
  category?: string;
  description?: string;
  file?: { url?: string; name?: string } | null;
  created_at?: string;
}

export interface DebiturListParams {
  search?: string;
  page?: number;
}

export interface DebiturListResult {
  items: Debitur[];
  lastPage: number;
  total?: number;
}

function mapContract(record: UnknownRecord): DebiturContract | null {
  const id = readString(record, "id");
  if (!id) return null;

  return {
    id,
    no_kontrak: readNullableString(record, "no_kontrak"),
    debtor_id: readNullableString(record, "debtor_id"),
    product_id: readNullableString(record, "product_id"),
    akad_type_id: readNullableString(record, "akad_type_id"),
    branch_id: readNullableString(record, "branch_id"),
    tanggal_akad: readNullableString(record, "tanggal_akad"),
    tanggal_jatuh_tempo: readNullableString(record, "tanggal_jatuh_tempo"),
    plafond: readNumber(record, "plafond") ?? undefined,
    pokok: readNumber(record, "pokok") ?? undefined,
    margin: readNumber(record, "margin") ?? undefined,
    tenor: readNumber(record, "tenor") ?? undefined,
    outstanding_pokok: readNumber(record, "outstanding_pokok") ?? undefined,
    outstanding_margin: readNumber(record, "outstanding_margin") ?? undefined,
    total_outstanding: readNumber(record, "total_outstanding") ?? undefined,
    status: readNullableString(record, "status"),
    objek_pembiayaan: readNullableString(record, "objek_pembiayaan"),
    agunan: readNullableString(record, "agunan"),
    created_at: readNullableString(record, "created_at"),
  };
}

function mapDebitur(record: UnknownRecord): Debitur | null {
  const id = readString(record, "id");
  const name = readString(record, "name");
  if (!id || !name) return null;

  const latestContractRaw = record.latest_contract;
  const latestContract =
    typeof latestContractRaw === "object" && latestContractRaw !== null
      ? mapContract(latestContractRaw as UnknownRecord)
      : null;

  const branchRaw = record.branch;
  const branch =
    typeof branchRaw === "object" && branchRaw !== null
      ? { id: String((branchRaw as UnknownRecord).id ?? ""), name: String((branchRaw as UnknownRecord).name ?? "") }
      : null;

  const muRaw = record.marketing_user;
  const marketing_user =
    typeof muRaw === "object" && muRaw !== null
      ? {
          id: String((muRaw as UnknownRecord).id ?? ""),
          name: String((muRaw as UnknownRecord).name ?? ""),
          username: String((muRaw as UnknownRecord).username ?? ""),
        }
      : null;

  return {
    id,
    name,
    debtor_number: readNullableString(record, "debtor_number"),
    identity_number: readNullableString(record, "identity_number"),
    address: readNullableString(record, "address"),
    phone: readNullableString(record, "phone"),
    branch_id: readNullableString(record, "branch_id"),
    marketing_user_id: readNullableString(record, "marketing_user_id"),
    financing_number: readNullableString(record, "financing_number"),
    status: readNullableString(record, "status"),
    description: readNullableString(record, "description"),
    branch,
    marketing_user,
    latest_contract: latestContract,
    contracts_count: readNumber(record, "contracts_count") ?? undefined,
    documents_count: readNumber(record, "documents_count") ?? undefined,
    created_at: readNullableString(record, "created_at"),
    updated_at: readNullableString(record, "updated_at"),
  };
}

function mapDocument(record: UnknownRecord): DebiturDocument | null {
  const id = readString(record, "id");
  if (!id) return null;

  const fileRaw = record.file;
  const file =
    typeof fileRaw === "object" && fileRaw !== null
      ? {
          url: readNullableString(fileRaw as UnknownRecord, "url"),
          name: readNullableString(fileRaw as UnknownRecord, "name"),
        }
      : null;

  return {
    id,
    debtor_id: readString(record, "debtor_id") ?? "",
    contract_id: readNullableString(record, "contract_id"),
    document_type: readNullableString(record, "document_type"),
    category: readNullableString(record, "category"),
    description: readNullableString(record, "description"),
    file,
    created_at: readNullableString(record, "created_at"),
  };
}

export const debiturService = {
  getAll: async (params?: DebiturListParams): Promise<DebiturListResult> => {
    const res = await api.get("/debtors", {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: params.page } : {}),
      },
    });

    return {
      items: extractList(res.data)
        .map((record) => mapDebitur(record))
        .filter((item): item is Debitur => item !== null),
      lastPage: extractLastPage(res.data),
    };
  },

  getById: async (id: string): Promise<Debitur | null> => {
    const res = await api.get(`/debtors/${id}`);
    const record = extractRecord(res.data);
    return record ? mapDebitur(record) : null;
  },

  create: async (data: DebiturPayload): Promise<Debitur> => {
    const res = await api.post("/debtors", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDebitur(record) : null;
    if (!mapped) throw new Error("Respons create debitur dari server tidak valid");
    return mapped;
  },

  update: async (id: string, data: Partial<DebiturPayload>): Promise<Debitur> => {
    const res = await api.put(`/debtors/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDebitur(record) : null;
    if (!mapped) throw new Error("Respons update debitur dari server tidak valid");
    return mapped;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/debtors/${id}`);
  },

  getContracts: async (id: string): Promise<DebiturContract[]> => {
    const res = await api.get(`/debtors/${id}/contracts`);
    return extractList(res.data)
      .map((record) => mapContract(record))
      .filter((item): item is DebiturContract => item !== null);
  },

  createContract: async (id: string, data: object): Promise<DebiturContract> => {
    const res = await api.post(`/debtors/${id}/contracts`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapContract(record) : null;
    if (!mapped) throw new Error("Respons create kontrak dari server tidak valid");
    return mapped;
  },

  getDocuments: async (id: string): Promise<DebiturDocument[]> => {
    const res = await api.get(`/debtors/${id}/documents`);
    return extractList(res.data)
      .map((record) => mapDocument(record))
      .filter((item): item is DebiturDocument => item !== null);
  },

  createDocument: async (id: string, formData: FormData): Promise<DebiturDocument> => {
    const res = await api.post(`/debtors/${id}/documents`, formData);
    const record = extractRecord(res.data);
    const mapped = record ? mapDocument(record) : null;
    if (!mapped) throw new Error("Respons upload dokumen dari server tidak valid");
    return mapped;
  },
};
