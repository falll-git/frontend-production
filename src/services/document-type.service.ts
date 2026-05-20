import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  fromStatusLabel,
  readBoolean,
  readNullableString,
  readString,
  toStatusLabel,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { PageQuery, PaginatedResult } from "@/types/api.types";
import type {
  DocumentType,
  DocumentTypePayload,
} from "@/types/master.types";

function mapDocumentType(record: Record<string, unknown>): DocumentType | null {
  const id = readString(record, "id");
  const kode = readString(record, "code", "kode");
  const nama = readString(record, "name", "nama");

  if (!id || !kode || !nama) return null;

  return {
    id,
    kode,
    nama,
    keterangan: readNullableString(record, "description", "keterangan"),
    status: toStatusLabel(readBoolean(record, "is_active", "isActive", "active")),
  };
}

function toPayload(data: Pick<DocumentType, "kode" | "nama" | "keterangan" | "status">): DocumentTypePayload {
  return {
    code: data.kode.trim().toUpperCase(),
    name: data.nama.trim(),
    description: data.keterangan?.trim() ?? "",
    is_active: fromStatusLabel(data.status),
  };
}

async function getDocumentTypesPage({
  page = 1,
  limit = SETUP_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<DocumentType>> {
  const res = await api.get("/document-types", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record) => mapDocumentType(record))
    .filter((item): item is DocumentType => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const documentTypeService = {
  getPage: getDocumentTypesPage,
  getAll: async (): Promise<DocumentType[]> => {
    const first = await getDocumentTypesPage({
      page: 1,
      limit: MAX_TABLE_PAGE_SIZE,
    });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getDocumentTypesPage({
        page,
        limit: MAX_TABLE_PAGE_SIZE,
      });
      all.push(...next.items);
    }

    return all;
  },
  getById: async (id: string): Promise<DocumentType | null> => {
    const res = await api.get(`/document-types/${id}`);
    const record = extractRecord(res.data);
    return record ? mapDocumentType(record) : null;
  },
  create: async (
    data: Pick<DocumentType, "kode" | "nama" | "keterangan" | "status">,
  ): Promise<DocumentType> => {
    const payload = toPayload(data);
    const res = await api.post("/document-types", payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapDocumentType(record) : null;

    if (!mapped) {
      throw new Error("Respons create jenis dokumen dari server tidak valid");
    }

    return mapped;
  },
  update: async (
    id: string,
    data: Pick<DocumentType, "kode" | "nama" | "keterangan" | "status">,
  ): Promise<DocumentType> => {
    const payload = toPayload(data);
    const res = await api.put(`/document-types/${id}`, payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapDocumentType(record) : null;

    if (!mapped) {
      throw new Error("Respons update jenis dokumen dari server tidak valid");
    }

    return mapped;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/document-types/${id}`);
  },
};
