import api from "@/lib/axios";
import {
  extractList,
  extractRecord,
  readNumber,
  readString,
} from "@/services/api.utils";
import type { RolePayload, RoleRecord } from "@/types/master.types";

type UnknownRecord = Record<string, unknown>;

function mapRole(record: Record<string, unknown>): RoleRecord | null {
  const id = readString(record, "id");
  const name = readString(record, "name");

  if (!id || !name) return null;

  return { id, name };
}

async function getRolesPage(page: number): Promise<{
  items: RoleRecord[];
  lastPage: number;
}> {
  const res = await api.get("/roles", { params: { page } });
  const payload =
    typeof res.data === "object" && res.data !== null
      ? (res.data as UnknownRecord)
      : {};

  return {
    items: extractList(res.data)
      .map((record) => mapRole(record))
      .filter((item): item is RoleRecord => item !== null),
    lastPage: Math.max(1, readNumber(payload, "lastPage", "last_page") ?? 1),
  };
}

export const roleService = {
  getAll: async (): Promise<RoleRecord[]> => {
    const first = await getRolesPage(1);
    const all = [...first.items];

    for (let page = 2; page <= first.lastPage; page += 1) {
      const next = await getRolesPage(page);
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
