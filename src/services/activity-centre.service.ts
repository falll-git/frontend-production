import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  isRecord,
  readNumber,
  readString,
} from "@/services/api.utils";
import type {
  ActivityCentreActor,
  ActivityCentreActorOption,
  ActivityCentreDetail,
  ActivityCentreDetailContext,
  ActivityCentreDetailField,
  ActivityCentreListResult,
  ActivityCentreLog,
  ActivityCentreOption,
  ActivityCentreOptions,
  ActivityCentreQuery,
  ActivityCentreSummary,
  ActivityCentreSummaryItem,
} from "@/types/activity-centre.types";

type AnyRecord = Record<string, unknown>;

function nullableRecord(value: unknown): AnyRecord | null {
  return isRecord(value) ? value : null;
}

function nullableString(record: AnyRecord | null, ...keys: string[]) {
  return record ? readString(record, ...keys) : null;
}

function mapActor(value: unknown): ActivityCentreActor | null {
  const record = nullableRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  if (!id) return null;
  const role = nullableRecord(record.role);
  const division = nullableRecord(record.division);

  return {
    id,
    name: readString(record, "name") ?? "User sistem",
    username: readString(record, "username") ?? "-",
    email: readString(record, "email") ?? "-",
    role:
      role && readString(role, "id")
        ? { id: readString(role, "id")!, name: readString(role, "name") ?? "-" }
        : null,
    division:
      division && readString(division, "id")
        ? {
            id: readString(division, "id")!,
            name: readString(division, "name") ?? "-",
          }
        : null,
  };
}

function mapLog(record: AnyRecord): ActivityCentreLog | null {
  const id = readString(record, "id");
  const createdAt = readString(record, "created_at", "createdAt");
  if (!id || !createdAt) return null;

  return {
    id,
    actor_id: readString(record, "actor_id", "actorId"),
    actor: mapActor(record.actor),
    module: readString(record, "module") ?? "SISTEM",
    module_label: readString(record, "module_label", "moduleLabel") ?? "Sistem",
    action: readString(record, "action") ?? "ACTIVITY",
    action_label: readString(record, "action_label", "actionLabel") ?? "Aktivitas",
    created_at: createdAt,
  };
}

function mapDetailField(value: unknown): ActivityCentreDetailField | null {
  const record = nullableRecord(value);
  if (!record) return null;
  const key = readString(record, "key");
  const label = readString(record, "label");
  const fieldValue = readString(record, "value");
  if (!key || !label || !fieldValue) return null;
  return { key, label, value: fieldValue };
}

function mapDetailContext(value: unknown): ActivityCentreDetailContext {
  const record = nullableRecord(value) ?? {};
  const supportedKinds = new Set<ActivityCentreDetailContext["kind"]>([
    "AUTH",
    "IMPORT",
    "EXPORT",
    "DOCUMENT",
    "WORKFLOW",
    "ACCESS",
    "PARAMETER",
    "CHANGE",
    "GENERAL",
  ]);
  const rawKind = readString(record, "kind") as
    | ActivityCentreDetailContext["kind"]
    | null;

  return {
    kind: rawKind && supportedKinds.has(rawKind) ? rawKind : "GENERAL",
    title: readString(record, "title") ?? "Konteks Aktivitas",
    fields: Array.isArray(record.fields)
      ? record.fields
          .map(mapDetailField)
          .filter((field): field is ActivityCentreDetailField => Boolean(field))
      : [],
    changed_fields: Array.isArray(record.changed_fields)
      ? record.changed_fields
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    empty_message: nullableString(record, "empty_message", "emptyMessage"),
    target_path: nullableString(record, "target_path", "targetPath"),
    target_label: nullableString(record, "target_label", "targetLabel"),
  };
}

function mapDetail(record: AnyRecord): ActivityCentreDetail | null {
  const log = mapLog(record);
  if (!log) return null;
  const resultTone = readString(record, "result_tone", "resultTone");

  return {
    ...log,
    source: readString(record, "source") ?? "API",
    source_label:
      readString(record, "source_label", "sourceLabel") ?? "Aplikasi",
    entity_type: readString(record, "entity_type", "entityType") ?? "AKTIVITAS",
    entity_label:
      readString(record, "entity_label", "entityLabel") ?? "Aktivitas",
    entity_id: nullableString(record, "entity_id", "entityId"),
    object_label: nullableString(record, "object_label", "objectLabel"),
    title: nullableString(record, "title"),
    summary: nullableString(record, "summary"),
    response_status: readNumber(record, "response_status", "responseStatus"),
    result_label:
      readString(record, "result_label", "resultLabel") ?? "Tercatat",
    result_tone:
      resultTone === "emerald" || resultTone === "red"
        ? resultTone
        : "slate",
    context: mapDetailContext(record.context),
  };
}

function mapOption(value: unknown): ActivityCentreOption | null {
  const record = nullableRecord(value);
  if (!record) return null;
  const optionValue = readString(record, "value");
  if (!optionValue) return null;
  return { value: optionValue, label: readString(record, "label") ?? optionValue };
}

function mapActorOption(value: unknown): ActivityCentreActorOption | null {
  const record = nullableRecord(value);
  const option = mapOption(value);
  if (!record || !option) return null;
  return {
    ...option,
    username: nullableString(record, "username"),
    role: nullableString(record, "role"),
    division: nullableString(record, "division"),
  };
}

function mapSummaryItem(value: unknown): ActivityCentreSummaryItem | null {
  const record = nullableRecord(value);
  const option = mapOption(value);
  if (!record || !option) return null;
  return { ...option, total: readNumber(record, "total") ?? 0 };
}

function buildParams(query: ActivityCentreQuery, includePagination = true) {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([key, value]) =>
        (includePagination || !["page", "limit"].includes(key)) &&
        value !== "" &&
        value !== null &&
        value !== undefined,
    ),
  );
}

export const activityCentreService = {
  getPage: async (query: ActivityCentreQuery): Promise<ActivityCentreListResult> => {
    const response = await api.get("/activity-centre", { params: buildParams(query) });
    return {
      items: extractList(response.data)
        .map(mapLog)
        .filter((item): item is ActivityCentreLog => Boolean(item)),
      meta: extractPaginationMeta(response.data, {
        page: query.page,
        limit: query.limit,
      }),
    };
  },

  getSummary: async (query: ActivityCentreQuery): Promise<ActivityCentreSummary> => {
    const response = await api.get("/activity-centre/summary", {
      params: buildParams(query, false),
    });
    const record = extractRecord(response.data) ?? {};
    return {
      total: readNumber(record, "total") ?? 0,
      modules: Array.isArray(record.modules)
        ? record.modules
            .map(mapSummaryItem)
            .filter((item): item is ActivityCentreSummaryItem => Boolean(item))
        : [],
      actions: Array.isArray(record.actions)
        ? record.actions
            .map(mapSummaryItem)
            .filter((item): item is ActivityCentreSummaryItem => Boolean(item))
        : [],
    };
  },

  getById: async (id: string): Promise<ActivityCentreDetail> => {
    const response = await api.get(`/activity-centre/${encodeURIComponent(id)}`);
    const record = extractRecord(response.data);
    const detail = record ? mapDetail(record) : null;
    if (!detail) throw new Error("Detail aktivitas tidak valid dari server.");
    return detail;
  },

  getOptions: async (): Promise<ActivityCentreOptions> => {
    const response = await api.get("/activity-centre/options");
    const record = extractRecord(response.data) ?? {};
    const options = (key: string) =>
      Array.isArray(record[key])
        ? record[key]
            .map(mapOption)
            .filter((item): item is ActivityCentreOption => Boolean(item))
        : [];

    return {
      modules: options("modules"),
      actions: options("actions"),
      sources: options("sources"),
      entity_types: options("entity_types"),
      actors: Array.isArray(record.actors)
        ? record.actors
            .map(mapActorOption)
            .filter((item): item is ActivityCentreActorOption => Boolean(item))
        : [],
    };
  },

  exportExcel: async (
    query: ActivityCentreQuery,
  ): Promise<{ blob: Blob; fileName: string }> => {
    const response = await api.get("/activity-centre/export", {
      params: buildParams(query, false),
      responseType: "blob",
    });
    const header = String(response.headers["content-disposition"] ?? "");
    const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const quoted = header.match(/filename="([^"]+)"/i)?.[1];
    return {
      blob: response.data,
      fileName: encoded
        ? decodeURIComponent(encoded)
        : quoted ||
          `pusat-log-aktivitas-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  },
};
