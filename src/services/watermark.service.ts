import api from "@/lib/axios";
import {
  extractRecord,
  readBoolean,
  readNumber,
  readString,
} from "@/services/api.utils";
import type {
  WatermarkOption,
  WatermarkOptions,
  WatermarkFileMeta,
  WatermarkQueueSummary,
  WatermarkSettings,
  WatermarkSettingsPayload,
} from "@/types/watermark.types";

type UnknownRecord = Record<string, unknown>;

const EMPTY_OPTIONS: WatermarkOptions = {
  watermark_types: [],
  positions: [],
  target_modules: [],
  template_tokens: [],
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readStringArray(record: UnknownRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function mapOption(record: UnknownRecord): WatermarkOption | null {
  const key = readString(record, "key");
  const label = readString(record, "label") ?? key;
  return key && label ? { key, label } : null;
}

function readOptionArray(record: UnknownRecord, key: string): WatermarkOption[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => asRecord(item))
    .filter((item): item is UnknownRecord => item !== null)
    .map((item) => mapOption(item))
    .filter((item): item is WatermarkOption => item !== null);
}

function mapOptions(record: UnknownRecord | null): WatermarkOptions {
  if (!record) return EMPTY_OPTIONS;

  return {
    watermark_types: readOptionArray(record, "watermark_types"),
    positions: readOptionArray(record, "positions"),
    target_modules: readOptionArray(record, "target_modules"),
    template_tokens: readOptionArray(record, "template_tokens"),
  };
}

function mapSettings(record: UnknownRecord | null): WatermarkSettings {
  if (!record) {
    throw new Error("Respons konfigurasi watermark dari server tidak valid.");
  }

  return {
    id: readString(record, "id") ?? "",
    is_enabled: readBoolean(record, "is_enabled"),
    target_modules: readStringArray(record, "target_modules"),
    watermark_type: readString(record, "watermark_type") ?? "TEXT",
    text_template: readString(record, "text_template") ?? null,
    text_color: readString(record, "text_color") ?? "#1F2937",
    text_opacity: readNumber(record, "text_opacity") ?? 0.16,
    font_family: readString(record, "font_family") ?? "Arial",
    font_size: readNumber(record, "font_size") ?? 42,
    image_path: readString(record, "image_path") ?? null,
    image_url: readString(record, "image_url") ?? null,
    image_original_name: readString(record, "image_original_name") ?? null,
    image_mime_type: readString(record, "image_mime_type") ?? null,
    image_size_bytes: readNumber(record, "image_size_bytes"),
    image_opacity: readNumber(record, "image_opacity") ?? 0.16,
    image_scale: readNumber(record, "image_scale") ?? 0.35,
    position: readString(record, "position") ?? "CENTER",
    repeat_pattern: readBoolean(record, "repeat_pattern"),
    rotation: readNumber(record, "rotation") ?? -35,
    spacing_x: readNumber(record, "spacing_x") ?? 280,
    spacing_y: readNumber(record, "spacing_y") ?? 180,
    updated_by: readString(record, "updated_by") ?? null,
    created_at: readString(record, "created_at") ?? null,
    updated_at: readString(record, "updated_at") ?? null,
    options: mapOptions(asRecord(record.options)),
  };
}

export function mapWatermarkFileMeta(value: unknown): WatermarkFileMeta | null {
  const record = asRecord(value);
  if (!record) return null;

  const statusKey = readString(record, "status_key") ?? "SKIPPED";

  return {
    status_key:
      statusKey === "PENDING" ||
      statusKey === "PROCESSING" ||
      statusKey === "APPLIED" ||
      statusKey === "FAILED" ||
      statusKey === "UNSUPPORTED"
        ? statusKey
        : "SKIPPED",
    status_label: readString(record, "status_label") ?? "Nonaktif",
    applied: readBoolean(record, "applied"),
    source_path: readString(record, "source_path") ?? null,
    file_path: readString(record, "file_path") ?? null,
    file_url: readString(record, "file_url") ?? null,
    file_name: readString(record, "file_name") ?? null,
    download_name: readString(record, "download_name") ?? null,
    settings_hash: readString(record, "settings_hash") ?? null,
    error_message: readString(record, "error_message") ?? null,
    requested_at: readString(record, "requested_at") ?? null,
    applied_at: readString(record, "applied_at") ?? null,
  };
}

export const watermarkService = {
  getSettings: async (): Promise<WatermarkSettings> => {
    const res = await api.get("/watermark-settings");
    return mapSettings(extractRecord(res.data));
  },

  getOptions: async (): Promise<WatermarkOptions> => {
    const res = await api.get("/watermark-settings/options");
    return mapOptions(extractRecord(res.data));
  },

  updateSettings: async (
    payload: WatermarkSettingsPayload,
  ): Promise<WatermarkSettings> => {
    const res = await api.put("/watermark-settings", payload);
    return mapSettings(extractRecord(res.data));
  },

  uploadImage: async (image: File): Promise<WatermarkSettings> => {
    const formData = new FormData();
    formData.append("image", image);

    const res = await api.post("/watermark-settings/image", formData);
    return mapSettings(extractRecord(res.data));
  },

  deleteImage: async (): Promise<WatermarkSettings> => {
    const res = await api.delete("/watermark-settings/image");
    return mapSettings(extractRecord(res.data));
  },

  applyExistingFiles: async (): Promise<{ scheduled_count: number }> => {
    const res = await api.post("/watermark-settings/apply");
    const record = extractRecord(res.data);
    return {
      scheduled_count: readNumber(record ?? {}, "scheduled_count") ?? 0,
    };
  },

  getQueueSummary: async (): Promise<WatermarkQueueSummary> => {
    const res = await api.get("/watermark-settings/summary");
    return (extractRecord(res.data) ?? {}) as WatermarkQueueSummary;
  },
};
