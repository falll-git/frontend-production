import api from "@/lib/axios";
import {
  extractLastPage,
  extractList,
  extractRecord,
  readString,
} from "@/services/api.utils";
import type {
  LetterPriority,
  LetterPriorityPayload,
} from "@/types/master.types";

function mapLetterPriority(record: Record<string, unknown>): LetterPriority | null {
  const id = readString(record, "id");
  const name = readString(record, "name");

  if (!id || !name) return null;

  return {
    id,
    name,
  };
}

async function getLetterPrioritiesPage(page: number): Promise<{
  items: LetterPriority[];
  lastPage: number;
}> {
  const res = await api.get("/letter-priorities", { params: { page } });

  return {
    items: extractList(res.data)
      .map((record) => mapLetterPriority(record))
      .filter((item): item is LetterPriority => item !== null),
    lastPage: extractLastPage(res.data),
  };
}

export const letterPriorityService = {
  getAll: async (): Promise<LetterPriority[]> => {
    const first = await getLetterPrioritiesPage(1);
    const all = [...first.items];

    for (let page = 2; page <= first.lastPage; page += 1) {
      const next = await getLetterPrioritiesPage(page);
      all.push(...next.items);
    }

    return all;
  },
  getById: async (id: string): Promise<LetterPriority | null> => {
    const res = await api.get(`/letter-priorities/${id}`);
    const record = extractRecord(res.data);
    return record ? mapLetterPriority(record) : null;
  },
  create: async (data: LetterPriorityPayload): Promise<LetterPriority> => {
    const res = await api.post("/letter-priorities", data);
    const record = extractRecord(res.data);
    const mapped = record ? mapLetterPriority(record) : null;

    if (!mapped) {
      throw new Error(
        "Respons create prioritas surat dari server tidak valid",
      );
    }

    return mapped;
  },
  update: async (
    id: string,
    data: LetterPriorityPayload,
  ): Promise<LetterPriority> => {
    const res = await api.put(`/letter-priorities/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapLetterPriority(record) : null;

    if (!mapped) {
      throw new Error(
        "Respons update prioritas surat dari server tidak valid",
      );
    }

    return mapped;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/letter-priorities/${id}`);
  },
};
