import api from "@/lib/axios";
import {
  deriveDocumentFileName,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import {
  extractPaginationMeta,
  extractList,
  extractRecord,
  readNullableString,
  readNumber,
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
  OutgoingMailPayload,
  SuratKeluar,
} from "@/types/surat.types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function formatOutgoingStatusLabel(record: UnknownRecord) {
  const explicitLabel = readString(record, "status_label", "statusLabel");
  if (explicitLabel) return explicitLabel;

  const statusCode = readNumber(record, "status");
  if (statusCode === 1) return "Aktif";
  if (statusCode === 0) return "Nonaktif";
  if (statusCode === null || statusCode === undefined) return "-";
  return String(statusCode);
}

export function mapSuratKeluarRecord(
  record: UnknownRecord,
  index = 0,
): SuratKeluar | null {
  const rawId = readString(record, "id");
  const id = rawId ?? index + 1;
  const recipientName = readString(record, "name");
  const mailNumber = readString(record, "mail_number", "mailNumber");
  const sendDate = readString(record, "send_date", "sendDate");
  const address = readString(record, "address");
  const deliveryMedia = readString(record, "delivery_media", "deliveryMedia");
  const statusCode = readNumber(record, "status") ?? undefined;
  const letterPriorityRecord = asRecord(record.letter_prioritie);
  const creatorRecord = asRecord(record.creator);
  const storage = readPhysicalStorage(record);

  if (!sendDate || !recipientName || !mailNumber) return null;

  const fileValue = readNullableString(record, "file", "file_url", "fileUrl");
  const originalFileName = readNullableString(record, "file_name", "fileName");
  const fallbackFileName =
    originalFileName ??
    (fileValue
      ? deriveDocumentFileName(fileValue, `surat-keluar-${mailNumber}`)
      : "");
  const previewableFileUrl = fileValue
    ? toPreviewableFileUrl(fileValue, fallbackFileName)
    : undefined;
  const sifatSurat =
    (letterPriorityRecord ? readString(letterPriorityRecord, "name") : null) ??
    "Biasa";
  const normalizedSifat = sifatSurat.trim().toLowerCase();

  return {
    id,
    namaSurat: mailNumber,
    penerima: recipientName,
    alamatPenerima: address ?? "-",
    tanggalKirim: sendDate,
    media: deliveryMedia ?? "-",
    sifat:
      normalizedSifat === "sangat rahasia"
        ? "Sangat Rahasia"
        : normalizedSifat === "rahasia"
          ? "Rahasia"
          : normalizedSifat === "terbatas"
            ? "Terbatas"
            : "Biasa",
    fileName: fallbackFileName,
    fileUrl: previewableFileUrl,
    watermark: mapWatermarkFileMeta(record.watermark),
    storageId:
      readString(record, "storage_id", "storageId") ?? storage?.id ?? undefined,
    storage,
    physicalStorageLabel: readPhysicalStorageLabel(record),
    letterPrioritieId:
      readString(record, "letter_prioritie_id", "letterPrioritieId") ??
      undefined,
    statusCode,
    statusLabel: formatOutgoingStatusLabel(record),
    mailNumberRaw: mailNumber,
    mediaRaw: deliveryMedia ?? undefined,
    createdBy:
      readString(record, "created_by", "createdBy") ??
      (creatorRecord ? readString(creatorRecord, "id") : null) ??
      undefined,
    creatorDivisionId:
      readString(record, "creator_division_id", "creatorDivisionId") ??
      (creatorRecord ? readString(creatorRecord, "division_id", "divisionId") : null) ??
      undefined,
  };
}

async function getSuratKeluarPage({
  page = 1,
  limit = OPERATIONAL_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<SuratKeluar>> {
  const res = await api.get("/outgoing-mails", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record, index) => mapSuratKeluarRecord(record, index))
    .filter((item): item is SuratKeluar => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const suratKeluarService = {
  getPage: getSuratKeluarPage,
  getAll: async (): Promise<SuratKeluar[]> => {
    const first = await getSuratKeluarPage({
      page: 1,
      limit: MAX_TABLE_PAGE_SIZE,
    });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getSuratKeluarPage({
        page,
        limit: MAX_TABLE_PAGE_SIZE,
      });
      all.push(...next.items);
    }

    return all;
  },
  create: async (data: OutgoingMailPayload): Promise<SuratKeluar | null> => {
    const formData = toMultipartFormData(data);
    const res = await api.post("/outgoing-mails", formData);
    const record = extractRecord(res.data);
    return record ? mapSuratKeluarRecord(record) : null;
  },
  update: async (
    id: string,
    data: Partial<OutgoingMailPayload> & { status?: "ACTIVE" | "INACTIVE" },
  ): Promise<SuratKeluar | null> => {
    const formData = toMultipartFormData(data);
    const res = await api.put(`/outgoing-mails/${id}`, formData);
    const record = extractRecord(res.data);
    return record ? mapSuratKeluarRecord(record) : null;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/outgoing-mails/${id}`);
  },
};
