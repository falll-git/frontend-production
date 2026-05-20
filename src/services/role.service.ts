import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  readString,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { PageQuery, PaginatedResult } from "@/types/api.types";
import type { RolePayload, RoleRecord } from "@/types/master.types";

function mapRole(record: Record<string, unknown>): RoleRecord | null {
  const id = readString(record, "id");
  const name = readString(record, "name");

  if (!id || !name) return null;

  return {
    id,
    name,
  };
}

async function getRolesPage({
  page = 1,
  limit = SETUP_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<RoleRecord>> {
  const res = await api.get("/roles", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record) => mapRole(record))
    .filter((item): item is RoleRecord => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const roleService = {
  getPage: getRolesPage,
  getAll: async (): Promise<RoleRecord[]> => {
    const first = await getRolesPage({ page: 1, limit: MAX_TABLE_PAGE_SIZE });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getRolesPage({ page, limit: MAX_TABLE_PAGE_SIZE });
      all.push(...next.items);
    }

    return all;
  },
  getById: async (id: string): Promise<RoleRecord | null> => {
    const res = await api.get(`/roles/${id}`);
    const record = extractRecord(res.data);
    return record ? mapRole(record) : null;
  },
  create: async (data: RolePayload): Promise<RoleRecord> => {
    const res = await api.post("/roles", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapRole(record) : null;

    if (!mapped) {
      throw new Error("Respons create role dari server tidak valid");
    }

    return mapped;
  },
  update: async (id: string, data: RolePayload): Promise<RoleRecord> => {
    const res = await api.put(`/roles/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapRole(record) : null;

    if (!mapped) {
      throw new Error("Respons update role dari server tidak valid");
    }

    return mapped;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },
};
