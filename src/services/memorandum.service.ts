import api from "@/lib/axios";
import {
  deriveDocumentFileName,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import {
  extractPaginationMeta,
  extractList,
  extractRecord,
  readNumber,
  readNullableString,
  readString,
  toMultipartFormData,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE, OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { mapWatermarkFileMeta } from "@/services/watermark.service";
import {
  readPhysicalStorage,
  readPhysicalStorageLabel,
} from "@/services/persuratan-storage.mapper";
import type { PageQuery, PaginatedResult } from "@/types/api.types";
import type {
  DispositionHolderSummary,
  Memorandum,
  MemorandumDisposisi,
  MemorandumPayload,
  MemorandumRedispositionPayload,
  SuratUser,
  UpdateDispositionStatusPayload,
} from "@/types/surat.types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      return record ? readString(record, "id") : null;
    })
    .filter((item): item is string => Boolean(item));
}

function readTargetManagerIds(
  record: UnknownRecord,
  targetDivisionRecords: UnknownRecord[],
): string[] {
  const managerIds = [
    ...readStringArray(record.target_manager_ids),
    ...readUserIds(record.target_managers),
  ];

  for (const target of targetDivisionRecords) {
    managerIds.push(
      ...readStringArray(target.manager_ids),
      ...readUserIds(target.managers),
    );

    const singleManagerId = readString(target, "manager_id", "managerId");
    if (singleManagerId) managerIds.push(singleManagerId);
  }

  return [...new Set(managerIds)];
}

function readReceivers(record: UnknownRecord): string[] {
  const currentHolderNames = Array.isArray(record.current_holder_names)
    ? record.current_holder_names.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : null;

  if (currentHolderNames && currentHolderNames.length > 0) {
    return currentHolderNames;
  }

  const source = Array.isArray(record.dispositions)
    ? record.dispositions
    : Array.isArray(record.receivers)
      ? record.receivers
      : null;

  if (!source) return [];

  return Array.from(
    new Set(
      source
        .map((item) => asRecord(item))
        .filter((item): item is UnknownRecord => item !== null)
        .map((item) => {
          const receiverRecord = asRecord(item.receiver);
          return (
            readString(item, "receiver_name", "receiverName") ??
            (receiverRecord
              ? readString(receiverRecord, "name", "username")
              : null) ??
            readString(item, "receiver_id", "receiverId") ??
            "-"
          );
        }),
    ),
  );
}

function mapHolderSummary(value: unknown): DispositionHolderSummary | null {
  const normalized = asRecord(value);
  if (!normalized) return null;

  const id = readString(normalized, "id");
  const name = readString(normalized, "name") || "-";
  const statusKey = (
    readString(normalized, "status_key", "statusKey") ?? ""
  ).toUpperCase();
  const statusLabel =
    readString(normalized, "status_label", "statusLabel") || "Baru";

  if (!id) return null;

  return {
    id,
    name,
    email: readNullableString(normalized, "email") ?? null,
    status_key:
      statusKey === "IN_PROGRESS" ||
      statusKey === "COMPLETED" ||
      statusKey === "FORWARDED"
        ? statusKey
        : "NEW",
    status_label: statusLabel,
  };
}

function readCurrentHolders(record: UnknownRecord): DispositionHolderSummary[] {
  return Array.isArray(record.current_holders)
    ? record.current_holders
        .map((item) => mapHolderSummary(item))
        .filter((item): item is DispositionHolderSummary => item !== null)
    : [];
}

function readDispositionHistory(record: UnknownRecord): MemorandumDisposisi[] {
  const source = Array.isArray(record.dispositions)
    ? record.dispositions
    : Array.isArray(record.receivers)
      ? record.receivers
      : null;

  if (!source) return [];

  return source.reduce<MemorandumDisposisi[]>((items, item, index) => {
      const normalized = asRecord(item);
      if (!normalized) return items;

      const senderRecord = asRecord(normalized.sender);
      const receiverRecord = asRecord(normalized.receiver);
      const senderId = readString(normalized, "sender_id", "senderId") ?? "";
      const receiverId =
        readString(normalized, "receiver_id", "receiverId") ?? "";
      const statusKey = (
        readString(
          normalized,
          "status_key",
          "statusKey",
          "status",
        ) ?? ""
      ).toUpperCase();

      items.push({
        id: readString(normalized, "id") ?? `memo-disp-${index + 1}`,
        memorandum_id:
          readString(
            normalized,
            "memorandums_id",
            "memorandum_id",
            "memorandumId",
          ) ?? "",
        dari_user_id: senderId,
        dari_user_nama:
          readString(normalized, "sender_name", "senderName") ??
          (senderRecord
            ? readString(senderRecord, "name", "username")
            : null) ??
          senderId ??
          "-",
        ke_user_id: receiverId,
        ke_user_nama:
          readString(normalized, "receiver_name", "receiverName") ??
          (receiverRecord
            ? readString(receiverRecord, "name", "username")
            : null) ??
          receiverId ??
          "-",
        catatan: readNullableString(normalized, "note", "catatan") ?? null,
        created_at:
          readString(
            normalized,
            "disposed_at",
            "created_at",
            "createdAt",
            "start_date",
            "startDate",
          ) ?? "",
        disposed_at:
          readNullableString(normalized, "disposed_at", "created_at", "createdAt") ??
          null,
        start_date:
          readNullableString(normalized, "start_date", "startDate") ?? null,
        due_date:
          readNullableString(normalized, "due_date", "dueDate") ?? null,
        completed_at:
          readNullableString(normalized, "completed_at", "completedAt") ?? null,
        parent_disposition_id:
          readNullableString(
            normalized,
            "parent_disposition_id",
            "parentDispositionId",
          ) ?? null,
        status:
          statusKey === "IN_PROGRESS" ||
          statusKey === "COMPLETED" ||
          statusKey === "FORWARDED"
            ? statusKey
            : "NEW",
        status_key:
          statusKey === "IN_PROGRESS" ||
          statusKey === "COMPLETED" ||
          statusKey === "FORWARDED"
            ? statusKey
            : "NEW",
        status_label:
          readString(normalized, "status_label", "statusLabel") || "Baru",
        sequence: readNumber(normalized, "sequence") ?? index + 1,
        is_current: Boolean(normalized.is_current),
        timeline_label:
          readString(normalized, "timeline_label", "timelineLabel") ||
          `${readString(normalized, "sender_name", "senderName") || "-"} -> ${readString(normalized, "receiver_name", "receiverName") || "-"}`,
        is_disposisi_ulang:
          Boolean(normalized.is_disposisi_ulang) ||
          Boolean(
            readNullableString(
              normalized,
              "parent_disposition_id",
              "parentDispositionId",
            ),
          ) ||
          index > 0,
        can_start: Boolean(normalized.can_start),
        can_complete: Boolean(normalized.can_complete),
        can_redispose: Boolean(normalized.can_redispose),
      });

      return items;
    }, []);
}

function mapAssignableUserRecord(record: UnknownRecord): SuratUser | null {
  const id = readString(record, "id");
  const name = readString(record, "name");
  const roleRecord = asRecord(record.role);
  const divisionRecord = asRecord(record.division);
  const roleName =
    (roleRecord ? readString(roleRecord, "name", "label") : null) ?? "";
  const divisionName =
    (divisionRecord ? readString(divisionRecord, "name", "label") : null) ??
    readString(record, "division_name", "divisionName", "division_id", "divisionId") ??
    "-";

  if (!id || !name) return null;

  return {
    id,
    nama: name,
    divisi: divisionName,
    username: readNullableString(record, "username"),
    email: readNullableString(record, "email") ?? null,
    roleId:
      readString(record, "role_id", "roleId") ??
      (roleRecord ? readString(roleRecord, "id") : null) ??
      undefined,
    roleName: roleName || undefined,
    divisionId:
      readString(record, "division_id", "divisionId") ??
      (divisionRecord ? readString(divisionRecord, "id") : null) ??
      undefined,
  };
}

export function mapMemorandumRecord(
  record: UnknownRecord,
  index = 0,
): Memorandum | null {
  const rawId = readString(record, "id");
  const id = rawId ?? index + 1;
  const memoNumber = readString(record, "memo_number", "memoNumber");
  const regarding = readString(record, "regarding");
  const memoDate = readString(record, "memo_date", "memoDate");
  const originDivisionRecord = asRecord(
    record.origin_division ?? record.originDivision,
  );
  const legacyDivisionRecord = asRecord(record.division);
  const creatorRecord = asRecord(record.creator);
  const storage = readPhysicalStorage(record);
  const fileValue = readNullableString(record, "file", "file_url", "fileUrl");

  if (!memoNumber || !regarding || !memoDate) return null;

  const originalFileName = readNullableString(record, "file_name", "fileName");
  const fallbackFileName =
    originalFileName ??
    (fileValue
      ? deriveDocumentFileName(fileValue, `memorandum-${memoNumber}`)
      : "");
  const previewableFileUrl = fileValue
    ? toPreviewableFileUrl(fileValue, fallbackFileName)
    : undefined;

  const dispositions = readDispositionHistory(record).sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0),
  );
  const currentHolders = readCurrentHolders(record);
  const lastHolder = mapHolderSummary(record.last_holder);
  const targetDivisionNames = Array.isArray(record.target_division_names)
    ? record.target_division_names.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const targetDivisionIds = Array.isArray(record.target_division_ids)
    ? record.target_division_ids.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const targetDivisionRecords = Array.isArray(record.target_divisions)
    ? record.target_divisions.filter(
        (item): item is UnknownRecord =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];

  return {
    id,
    noMemo: memoNumber,
    perihal: regarding,
    divisiAsal:
      readString(record, "origin_division_name", "originDivisionName") ??
      (originDivisionRecord ? readString(originDivisionRecord, "name") : null) ??
      readString(record, "division_name", "divisionName") ??
      (legacyDivisionRecord ? readString(legacyDivisionRecord, "name") : null) ??
      readString(record, "origin_division_id", "originDivisionId") ??
      "-",
    divisiTujuanAwal: targetDivisionNames,
    pembuatMemo:
      readString(record, "sender_name", "senderName", "created_by_name") ??
      (creatorRecord
        ? readString(creatorRecord, "name", "username")
        : null) ??
      readString(record, "created_by", "createdBy") ??
      "-",
    tanggal: memoDate,
    keterangan: readString(record, "description") ?? "",
    penerimaTipe: "perorangan",
    penerima: readReceivers(record),
    fileName: fallbackFileName,
    fileUrl: previewableFileUrl,
    watermark: mapWatermarkFileMeta(record.watermark),
    storageId:
      readString(record, "storage_id", "storageId") ?? storage?.id ?? undefined,
    storage,
    physicalStorageLabel: readPhysicalStorageLabel(record),
    statusCode: readNumber(record, "status") ?? undefined,
    statusKey: readString(record, "status_key", "statusKey") || undefined,
    statusLabel: readString(record, "status_label", "statusLabel") || undefined,
    originDivisionId:
      readString(record, "origin_division_id", "originDivisionId") ?? undefined,
    originDivisionName:
      readString(record, "origin_division_name", "originDivisionName") ??
      (originDivisionRecord ? readString(originDivisionRecord, "name") : null) ??
      readString(record, "division_name", "divisionName") ??
      (legacyDivisionRecord ? readString(legacyDivisionRecord, "name") : null) ??
      undefined,
    receivedDate:
      readNullableString(record, "received_date", "receivedDate") ?? undefined,
    targetDivisionIds:
      targetDivisionIds.length > 0 ? targetDivisionIds : undefined,
    targetDivisionNames:
      targetDivisionNames.length > 0 ? targetDivisionNames : undefined,
    targetManagerIds: readTargetManagerIds(record, targetDivisionRecords),
    createdBy:
      readString(record, "created_by", "createdBy") ??
      (creatorRecord ? readString(creatorRecord, "id") : null) ??
      undefined,
    creatorDivisionId:
      readString(record, "creator_division_id", "creatorDivisionId") ??
      (creatorRecord ? readString(creatorRecord, "division_id", "divisionId") : null) ??
      undefined,
    disposisi_history: dispositions,
    current_holders: currentHolders,
    current_holder_names:
      currentHolders.map((item) => item.name).filter(Boolean) || [],
    active_dispositions_count:
      readNumber(record, "active_dispositions_count", "activeDispositionsCount") ??
      currentHolders.length,
    last_holder: lastHolder,
    last_holder_name:
      readNullableString(record, "last_holder_name", "lastHolderName") ??
      lastHolder?.name ??
      null,
  };
}

async function getMemorandumsPage({
  page = 1,
  limit = OPERATIONAL_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<Memorandum>> {
  const res = await api.get("/memorandums", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record, index) => mapMemorandumRecord(record, index))
    .filter((item): item is Memorandum => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const memorandumService = {
  getPage: getMemorandumsPage,
  getAll: async (): Promise<Memorandum[]> => {
    const first = await getMemorandumsPage({
      page: 1,
      limit: MAX_TABLE_PAGE_SIZE,
    });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getMemorandumsPage({
        page,
        limit: MAX_TABLE_PAGE_SIZE,
      });
      all.push(...next.items);
    }

    return all;
  },
  createWithDisposition: async (
    data: MemorandumPayload,
  ): Promise<Memorandum | null> => {
    const formData = toMultipartFormData(data);
    const res = await api.post("/memorandums/with-disposition", formData);
    const record = extractRecord(res.data);
    return record ? mapMemorandumRecord(record) : null;
  },
  update: async (
    id: string,
    data: Partial<
      Pick<
        MemorandumPayload,
        | "origin_division_id"
        | "storage_id"
        | "regarding"
        | "memo_date"
        | "received_date"
        | "memo_number"
        | "description"
        | "file"
      >
    >,
  ): Promise<Memorandum | null> => {
    const formData = toMultipartFormData(data);
    const res = await api.put(`/memorandums/${id}`, formData);
    const record = extractRecord(res.data);
    return record ? mapMemorandumRecord(record) : null;
  },
  redispose: async (
    id: string,
    data: MemorandumRedispositionPayload,
  ): Promise<void> => {
    await api.post(`/memorandums/${id}/redispose`, data);
  },
  updateDispositionStatus: async (
    id: string,
    dispositionId: string,
    data: UpdateDispositionStatusPayload,
  ): Promise<Memorandum | null> => {
    const res = await api.patch(
      `/memorandums/${id}/dispositions/${dispositionId}/status`,
      data,
    );
    const record = extractRecord(res.data);
    return record ? mapMemorandumRecord(record) : null;
  },
  getDispositionRecipients: async (params?: {
    search?: string;
    divisionId?: string;
    limit?: number;
  }): Promise<SuratUser[]> => {
    const res = await api.get("/memorandums/disposition-recipients", {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.divisionId ? { division_id: params.divisionId } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      },
    });

    return extractList(res.data)
      .map((record) => mapAssignableUserRecord(record))
      .filter((item): item is SuratUser => item !== null);
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/memorandums/${id}`);
  },
};
