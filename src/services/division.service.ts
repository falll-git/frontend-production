import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  readString,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { PageQuery, PaginatedResult } from "@/types/api.types";
import type { Division, DivisionPayload } from "@/types/master.types";

function mapDivision(record: Record<string, unknown>): Division | null {
  const id = readString(record, "id");
  const name = readString(record, "name");

  if (!id || !name) return null;

  return {
    id,
    name,
  };
}

async function getDivisionsPage({
  page = 1,
  limit = SETUP_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<Division>> {
  const res = await api.get("/divisions", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record) => mapDivision(record))
    .filter((item): item is Division => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const divisionService = {
  getPage: getDivisionsPage,
  getAll: async (): Promise<Division[]> => {
    const first = await getDivisionsPage({ page: 1, limit: MAX_TABLE_PAGE_SIZE });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getDivisionsPage({ page, limit: MAX_TABLE_PAGE_SIZE });
      all.push(...next.items);
    }

    return all;
  },
  getById: async (id: string): Promise<Division | null> => {
    const res = await api.get(`/divisions/${id}`);
    const record = extractRecord(res.data);
    return record ? mapDivision(record) : null;
  },
  create: async (data: DivisionPayload): Promise<Division> => {
    const res = await api.post("/divisions", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDivision(record) : null;

    if (!mapped) {
      throw new Error("Respons create divisi dari server tidak valid");
    }

    return mapped;
  },
  update: async (id: string, data: DivisionPayload): Promise<Division> => {
    const res = await api.put(`/divisions/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapDivision(record) : null;

    if (!mapped) {
      throw new Error("Respons update divisi dari server tidak valid");
    }

    return mapped;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/divisions/${id}`);
  },
};
