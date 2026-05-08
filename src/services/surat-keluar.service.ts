import api from "@/lib/axios";
import {
  deriveDocumentFileName,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import {
  extractList,
  extractRecord,
  readNullableString,
  readNumber,
  readString,
  toMultipartFormData,
} from "@/services/api.utils";
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

  if (!sendDate || !recipientName || !mailNumber) return null;

  const fileValue = readNullableString(record, "file", "file_url", "fileUrl");
  const fallbackFileName = fileValue
    ? deriveDocumentFileName(fileValue, `surat-keluar-${mailNumber}`)
    : "";
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
    letterPrioritieId:
      readString(record, "letter_prioritie_id", "letterPrioritieId") ??
      undefined,
    statusCode,
    statusLabel: formatOutgoingStatusLabel(record),
    mailNumberRaw: mailNumber,
    mediaRaw: deliveryMedia ?? undefined,
  };
}

export const suratKeluarService = {
  getAll: async (): Promise<SuratKeluar[]> => {
    const res = await api.get("/outgoing-mails");
    return extractList(res.data)
      .map((record, index) => mapSuratKeluarRecord(record, index))
      .filter((item): item is SuratKeluar => item !== null);
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
