import api from "@/lib/axios";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  isRecord,
} from "@/services/api.utils";
import type { PaginatedResult } from "@/types/api.types";

export type ParameterMasterValue = string | number | boolean | null;

export type ParameterMasterRecord = Record<string, ParameterMasterValue> & {
  id: string;
};

export type ParameterMasterQuery = {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
};

export type ParameterMasterPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

function normalizeValue(value: unknown): ParameterMasterValue {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : String(value);
}

function mapParameterRecord(record: Record<string, unknown>): ParameterMasterRecord | null {
  const idValue = record.id;
  const id =
    typeof idValue === "string"
      ? idValue
      : typeof idValue === "number"
        ? String(idValue)
        : "";

  if (!id) return null;

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, normalizeValue(value)]),
  ) as ParameterMasterRecord;
}

function buildParams(query: ParameterMasterQuery) {
  return {
    page: query.page ?? 1,
    limit: query.limit ?? SETUP_TABLE_PAGE_SIZE,
    ...(query.search ? { search: query.search } : {}),
    ...Object.fromEntries(
      Object.entries(query.filters ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
    ),
  };
}

function mapList(payload: unknown): ParameterMasterRecord[] {
  return extractList(payload)
    .map((record) => mapParameterRecord(record))
    .filter((item): item is ParameterMasterRecord => item !== null);
}

export function createParameterMasterService(endpoint: string) {
  async function getPage({
    page = 1,
    limit = SETUP_TABLE_PAGE_SIZE,
    search,
    filters,
  }: ParameterMasterQuery = {}): Promise<PaginatedResult<ParameterMasterRecord>> {
    const res = await api.get(endpoint, {
      params: buildParams({ page, limit, search, filters }),
    });
    const items = mapList(res.data);

    return {
      items,
      meta: extractPaginationMeta(res.data, {
        page,
        limit,
        total: items.length,
      }),
    };
  }

  return {
    getPage,
    getAll: async (
      filters?: ParameterMasterQuery["filters"],
    ): Promise<ParameterMasterRecord[]> => {
      const first = await getPage({
        page: 1,
        limit: MAX_TABLE_PAGE_SIZE,
        filters,
      });
      const all = [...first.items];

      for (let page = 2; page <= first.meta.lastPage; page += 1) {
        const next = await getPage({
          page,
          limit: MAX_TABLE_PAGE_SIZE,
          filters,
        });
        all.push(...next.items);
      }

      return all;
    },
    getById: async (id: string): Promise<ParameterMasterRecord | null> => {
      const res = await api.get(`${endpoint}/${id}`);
      const record = extractRecord(res.data);
      return isRecord(record) ? mapParameterRecord(record) : null;
    },
    create: async (
      payload: ParameterMasterPayload,
    ): Promise<ParameterMasterRecord> => {
      const res = await api.post(endpoint, payload);
      const record = extractRecord(res.data);
      const mapped = isRecord(record) ? mapParameterRecord(record) : null;

      if (!mapped) {
        throw new Error("Respons create parameter dari server tidak valid");
      }

      return mapped;
    },
    update: async (
      id: string,
      payload: ParameterMasterPayload,
    ): Promise<ParameterMasterRecord> => {
      const res = await api.put(`${endpoint}/${id}`, payload);
      const record = extractRecord(res.data);
      const mapped = isRecord(record) ? mapParameterRecord(record) : null;

      if (!mapped) {
        throw new Error("Respons update parameter dari server tidak valid");
      }

      return mapped;
    },
    remove: async (id: string): Promise<void> => {
      await api.delete(`${endpoint}/${id}`);
    },
  };
}
