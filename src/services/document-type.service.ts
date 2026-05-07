import api from "@/lib/axios";
import {
  extractLastPage,
  extractList,
  extractRecord,
  fromStatusLabel,
  readBoolean,
  readNullableString,
  readString,
  toStatusLabel,
} from "@/services/api.utils";
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

async function getDocumentTypesPage(page: number): Promise<{
  items: DocumentType[];
  lastPage: number;
}> {
  const res = await api.get("/document-types", { params: { page } });

  return {
    items: extractList(res.data)
      .map((record) => mapDocumentType(record))
      .filter((item): item is DocumentType => item !== null),
    lastPage: extractLastPage(res.data),
  };
}

export const documentTypeService = {
  getAll: async (): Promise<DocumentType[]> => {
    const first = await getDocumentTypesPage(1);
    const all = [...first.items];

    for (let page = 2; page <= first.lastPage; page += 1) {
      const next = await getDocumentTypesPage(page);
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
