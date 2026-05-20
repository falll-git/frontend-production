export type WatermarkType = "TEXT" | "IMAGE" | "TEXT_IMAGE" | string;

export type WatermarkPosition =
  | "CENTER"
  | "TOP_LEFT"
  | "TOP_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_RIGHT"
  | string;

export type WatermarkStatusKey =
  | "PENDING"
  | "PROCESSING"
  | "APPLIED"
  | "SKIPPED"
  | "FAILED"
  | "UNSUPPORTED";

export type WatermarkOption = {
  key: string;
  label: string;
};

export type WatermarkOptions = {
  watermark_types: WatermarkOption[];
  positions: WatermarkOption[];
  target_modules: WatermarkOption[];
  template_tokens: WatermarkOption[];
};

export type WatermarkSettings = {
  id: string;
  is_enabled: boolean;
  target_modules: string[];
  watermark_type: WatermarkType;
  text_template: string | null;
  text_color: string;
  text_opacity: number;
  font_family: string;
  font_size: number;
  image_path: string | null;
  image_url: string | null;
  image_original_name: string | null;
  image_mime_type: string | null;
  image_size_bytes: number | null;
  image_opacity: number;
  image_scale: number;
  position: WatermarkPosition;
  repeat_pattern: boolean;
  rotation: number;
  spacing_x: number;
  spacing_y: number;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  options: WatermarkOptions;
};

export type WatermarkSettingsPayload = Partial<{
  is_enabled: boolean;
  target_modules: string[];
  watermark_type: string;
  text_template: string | null;
  text_color: string;
  text_opacity: number;
  font_family: string;
  font_size: number;
  image_opacity: number;
  image_scale: number;
  position: string;
  repeat_pattern: boolean;
  rotation: number;
  spacing_x: number;
  spacing_y: number;
  clear_image: boolean;
}>;

export type WatermarkFileMeta = {
  status_key: WatermarkStatusKey;
  status_label: string;
  applied: boolean;
  source_path: string | null;
  file_path: string | null;
  file_url: string | null;
  settings_hash: string | null;
  error_message: string | null;
  requested_at: string | null;
  applied_at: string | null;
};

export type WatermarkQueueSummary = Record<
  string,
  Partial<Record<WatermarkStatusKey, number>>
>;
