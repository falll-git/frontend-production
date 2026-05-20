import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  fromStatusLabel,
  readBoolean,
  readNumber,
  readString,
  toStatusLabel,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { PageQuery, PaginatedResult } from "@/types/api.types";
import type { Storage, StoragePayload } from "@/types/master.types";

function mapStorage(record: Record<string, unknown>): Storage | null {
  const id = readString(record, "id");
  const kodeKantor = readString(record, "office_code", "kodeKantor");
  const namaKantor = readString(record, "office_label", "namaKantor");
  const kodeLemari = readString(record, "code", "kodeLemari");
  const rak = readString(record, "name", "rak");
  const kapasitas = readNumber(record, "capacity", "kapasitas");

  if (!id || !kodeKantor || !namaKantor || !kodeLemari || !rak || kapasitas === null) {
    return null;
  }

  return {
    id,
    kodeKantor,
    namaKantor,
    kodeLemari,
    rak,
    kapasitas,
    status: toStatusLabel(readBoolean(record, "is_active", "isActive", "active")),
  };
}

function toPayload(
  data: Pick<
    Storage,
    "kodeKantor" | "namaKantor" | "kodeLemari" | "rak" | "kapasitas" | "status"
  >,
): StoragePayload {
  return {
    office_code: data.kodeKantor.trim().toUpperCase(),
    office_label: data.namaKantor.trim(),
    code: data.kodeLemari.trim().toUpperCase(),
    name: data.rak.trim(),
    capacity: String(data.kapasitas),
    is_active: fromStatusLabel(data.status),
  };
}

async function getStoragesPage({
  page = 1,
  limit = SETUP_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<Storage>> {
  const res = await api.get("/storages", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record) => mapStorage(record))
    .filter((item): item is Storage => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const storageService = {
  getPage: getStoragesPage,
  getAll: async (): Promise<Storage[]> => {
    const first = await getStoragesPage({ page: 1, limit: MAX_TABLE_PAGE_SIZE });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getStoragesPage({ page, limit: MAX_TABLE_PAGE_SIZE });
      all.push(...next.items);
    }

    return all;
  },
  getById: async (id: string): Promise<Storage | null> => {
    const res = await api.get(`/storages/${id}`);
    const record = extractRecord(res.data);
    return record ? mapStorage(record) : null;
  },
  create: async (
    data: Pick<
      Storage,
      "kodeKantor" | "namaKantor" | "kodeLemari" | "rak" | "kapasitas" | "status"
    >,
  ): Promise<Storage> => {
    const payload = toPayload(data);
    const res = await api.post("/storages", payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapStorage(record) : null;

    if (!mapped) {
      throw new Error(
        "Respons create tempat penyimpanan dari server tidak valid",
      );
    }

    return mapped;
  },
  update: async (
    id: string,
    data: Pick<
      Storage,
      "kodeKantor" | "namaKantor" | "kodeLemari" | "rak" | "kapasitas" | "status"
    >,
  ): Promise<Storage> => {
    const payload = toPayload(data);
    const res = await api.put(`/storages/${id}`, payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapStorage(record) : null;

    if (!mapped) {
      throw new Error(
        "Respons update tempat penyimpanan dari server tidak valid",
      );
    }

    return mapped;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/storages/${id}`);
  },
};
