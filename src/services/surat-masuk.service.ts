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
  IncomingMailPayload,
  IncomingRedispositionPayload,
  SuratDisposisi,
  SuratMasuk,
  SuratMasukStatus,
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

function readDispositions(record: UnknownRecord): string[] {
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
    : Array.isArray(record.disposition_mails)
      ? record.disposition_mails
      : null;

  if (!source) return [];

  return source
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
    });
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

function readDispositionHistory(record: UnknownRecord): SuratDisposisi[] {
  const source = Array.isArray(record.disposition_mails)
    ? record.disposition_mails
    : Array.isArray(record.dispositions)
      ? record.dispositions
      : null;

  if (!source) return [];

  return source.reduce<SuratDisposisi[]>((items, item, index) => {
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
        id: readString(normalized, "id") ?? `disp-${index + 1}`,
        surat_masuk_id:
          readString(
            normalized,
            "incoming_mails_id",
            "incoming_mail_id",
            "surat_masuk_id",
            "incomingMailId",
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

function readSuratMasukStatus(
  record: UnknownRecord,
  dispositions: string[],
): {
  status: SuratMasukStatus;
  statusDisposisi: SuratMasuk["statusDisposisi"] | "Terlambat";
} {
  const statusKey = (
    readString(record, "status_key", "statusKey") ?? ""
  ).toUpperCase();
  const statusLabel = readString(record, "status_label", "statusLabel") ?? "";
  const rawStatus = record.status;
  const numericStatus =
    typeof rawStatus === "number"
      ? rawStatus
      : typeof rawStatus === "string"
        ? Number(rawStatus)
        : Number.NaN;

  if (statusKey === "OVERDUE" || numericStatus === 3) {
    return {
      status: "TERLAMBAT",
      statusDisposisi: "Terlambat",
    };
  }

  if (
    statusKey === "COMPLETED" ||
    statusLabel.toLowerCase() === "selesai" ||
    numericStatus === 2
  ) {
    return {
      status: "SELESAI",
      statusDisposisi: "Selesai",
    };
  }

  if (
    statusKey === "IN_PROGRESS" ||
    statusKey === "FORWARDED" ||
    statusLabel.toLowerCase() === "diproses" ||
    numericStatus === 1 ||
    dispositions.length > 0
  ) {
    return {
      status: "DIDISPOSISI",
      statusDisposisi: "Dalam Proses",
    };
  }

  return {
    status: "BARU",
    statusDisposisi: "Pending",
  };
}

export function mapSuratMasukRecord(
  record: UnknownRecord,
  index = 0,
): SuratMasuk | null {
  const rawId = readString(record, "id");
  const id = rawId ?? index + 1;
  const regarding = readString(record, "regarding", "perihal");
  const name = readString(record, "name");
  const mailNumber = readString(record, "mail_number", "mailNumber");
  const address = readString(record, "address");
  const receiveDate = readString(record, "receive_date", "receiveDate");
  const letterPriorityRecord = asRecord(
    record.letter_prioritie ?? record.letter_priority,
  );

  if (!regarding || !receiveDate) return null;

  const disposisiKepada = readDispositions(record);
  const disposisiHistory = readDispositionHistory(record).sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0),
  );
  const latestDispositionWithDueDate =
    [...disposisiHistory].reverse().find((item) => item.due_date) ?? null;
  const latestDispositionWithNote =
    [...disposisiHistory].reverse().find((item) => item.catatan) ?? null;
  const description = readNullableString(record, "description", "keterangan");
  const fileValue = readNullableString(record, "file", "file_url", "fileUrl");
  const originalFileName = readNullableString(record, "file_name", "fileName");
  const fallbackFileName =
    originalFileName ??
    (fileValue
      ? deriveDocumentFileName(
          fileValue,
          `surat-masuk-${mailNumber ?? regarding ?? id}`,
        )
      : "");
  const previewableFileUrl = fileValue
    ? toPreviewableFileUrl(fileValue, fallbackFileName)
    : undefined;
  const sifatSurat =
    readString(
      record,
      "letter_prioritie_name",
      "letterPriorityName",
      "priority_name",
    ) ??
    (letterPriorityRecord ? readString(letterPriorityRecord, "name") : null) ??
    "Biasa";
  const normalizedSifat = sifatSurat.trim().toLowerCase();
  const status = readSuratMasukStatus(record, disposisiKepada);
  const currentHolders = readCurrentHolders(record);
  const lastHolder = mapHolderSummary(record.last_holder);
  const storage = readPhysicalStorage(record);
  const targetDivisionRecords = Array.isArray(record.target_divisions)
    ? record.target_divisions.filter(
        (item): item is UnknownRecord =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];

  return {
    id,
    namaSurat: mailNumber ?? regarding ?? name ?? "-",
    pengirim:
      readString(record, "sender_name", "senderName", "sender") ?? name ?? "-",
    alamatPengirim: address ?? "-",
    perihal: regarding,
    keterangan: description,
    tanggalTerima: receiveDate,
    sifat:
      normalizedSifat === "sangat rahasia"
        ? "Sangat Rahasia"
        : normalizedSifat === "rahasia"
          ? "Rahasia"
          : normalizedSifat === "terbatas"
            ? "Terbatas"
            : "Biasa",
    letterPrioritieId:
      readString(record, "letter_prioritie_id", "letterPrioritieId") ??
      (letterPriorityRecord ? readString(letterPriorityRecord, "id") : null) ??
      undefined,
    disposisiKepada,
    statusDisposisi: status.statusDisposisi as SuratMasuk["statusDisposisi"],
    status: status.status,
    statusKey: readString(record, "status_key", "statusKey") || undefined,
    statusLabel: readString(record, "status_label", "statusLabel") || undefined,
    disposisi_history: disposisiHistory,
    current_holders: currentHolders,
    current_holder_names:
      currentHolders.map((item) => item.name).filter(Boolean) ||
      disposisiKepada,
    active_dispositions_count:
      readNumber(record, "active_dispositions_count", "activeDispositionsCount") ??
      currentHolders.length,
    last_holder: lastHolder,
    last_holder_name:
      readNullableString(record, "last_holder_name", "lastHolderName") ??
      lastHolder?.name ??
      null,
    fileName: fallbackFileName,
    fileUrl: previewableFileUrl,
    watermark: mapWatermarkFileMeta(record.watermark),
    storageId:
      readString(record, "storage_id", "storageId") ?? storage?.id ?? undefined,
    storage,
    physicalStorageLabel: readPhysicalStorageLabel(record),
    targetDivisionIds: Array.isArray(record.target_division_ids)
      ? record.target_division_ids.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : undefined,
    targetDivisionNames: Array.isArray(record.target_division_names)
      ? record.target_division_names.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : undefined,
    targetManagerIds: readTargetManagerIds(record, targetDivisionRecords),
    createdBy: readString(record, "created_by", "createdBy") ?? undefined,
    tenggatWaktu:
      readNullableString(record, "due_date", "dueDate") ??
      latestDispositionWithDueDate?.due_date ??
      undefined,
    keteranganTenggat:
      readNullableString(record, "note", "catatan") ??
      latestDispositionWithNote?.catatan ??
      undefined,
  };
}

async function getSuratMasukPage({
  page = 1,
  limit = OPERATIONAL_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<SuratMasuk>> {
  const res = await api.get("/incoming-mails", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record, index) => mapSuratMasukRecord(record, index))
    .filter((item): item is SuratMasuk => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const suratMasukService = {
  getPage: getSuratMasukPage,
  getAll: async (): Promise<SuratMasuk[]> => {
    const first = await getSuratMasukPage({
      page: 1,
      limit: MAX_TABLE_PAGE_SIZE,
    });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getSuratMasukPage({
        page,
        limit: MAX_TABLE_PAGE_SIZE,
      });
      all.push(...next.items);
    }

    return all;
  },
  createWithDisposition: async (
    data: IncomingMailPayload,
  ): Promise<SuratMasuk | null> => {
    const formData = toMultipartFormData(data);
    const res = await api.post("/incoming-mails/with-disposition", formData);
    const record = extractRecord(res.data);
    return record ? mapSuratMasukRecord(record) : null;
  },
  redispose: async (
    id: string,
    data: IncomingRedispositionPayload,
  ): Promise<void> => {
    await api.post(`/incoming-mails/${id}/redispose`, data);
  },
  updateDispositionStatus: async (
    id: string,
    dispositionId: string,
    data: UpdateDispositionStatusPayload,
  ): Promise<SuratMasuk | null> => {
    const res = await api.patch(
      `/incoming-mails/${id}/dispositions/${dispositionId}/status`,
      data,
    );
    const record = extractRecord(res.data);
    return record ? mapSuratMasukRecord(record) : null;
  },
  update: async (
    id: string,
    data: Partial<
      Pick<
        IncomingMailPayload,
        | "letter_prioritie_id"
        | "storage_id"
        | "regarding"
        | "receive_date"
        | "mail_number"
        | "name"
        | "description"
        | "file"
        | "address"
      >
    >,
  ): Promise<SuratMasuk | null> => {
    const formData = toMultipartFormData(data);
    const res = await api.put(`/incoming-mails/${id}`, formData);
    const record = extractRecord(res.data);
    return record ? mapSuratMasukRecord(record) : null;
  },
  getDispositionRecipients: async (params?: {
    search?: string;
    divisionId?: string;
    limit?: number;
  }): Promise<SuratUser[]> => {
    const res = await api.get("/incoming-mails/disposition-recipients", {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.divisionId ? { target_division_id: params.divisionId } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      },
    });

    return extractList(res.data)
      .map((record) => mapAssignableUserRecord(record))
      .filter((item): item is SuratUser => item !== null);
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/incoming-mails/${id}`);
  },
};
