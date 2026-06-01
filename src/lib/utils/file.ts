import {
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
  DOCUMENT_UPLOAD_MAX_SIZE_LABEL,
} from "@/lib/upload-limits";

export type DocumentFileType =
  | "pdf"
  | "image"
  | "presentation"
  | "office"
  | "other";

const PERSURATAN_MAX_FILE_SIZE_BYTES = DOCUMENT_UPLOAD_MAX_SIZE_BYTES;
const DIGITAL_ARCHIVE_MAX_FILE_SIZE_BYTES = DOCUMENT_UPLOAD_MAX_SIZE_BYTES;
const PERSURATAN_ALLOWED_FILE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
]);
const PERSURATAN_ALLOWED_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const DOMAIN_ALLOWED_FILE_EXTENSIONS = new Set([
  ...PERSURATAN_ALLOWED_FILE_EXTENSIONS,
  "txt",
  "csv",
  "json",
  "zip",
]);
const DOMAIN_ALLOWED_FILE_MIME_TYPES = new Set([
  ...PERSURATAN_ALLOWED_FILE_MIME_TYPES,
  "text/plain",
  "text/csv",
  "application/csv",
  "application/json",
  "text/json",
  "application/zip",
  "application/x-zip-compressed",
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "application/json": "json",
  "text/json": "json",
};

function normalizeFileNameBase(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferExtensionFromFileName(fileName?: string | null): string | null {
  if (typeof fileName !== "string" || !fileName.trim()) return null;

  const normalized = fileName.trim().toLowerCase();
  const segments = normalized.split(".");
  const extension = segments.at(-1);

  return extension && extension !== normalized ? extension : null;
}

function inferMimeTypeFromFileName(fileName?: string | null): string | null {
  if (typeof fileName !== "string" || !fileName.trim()) return null;

  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".doc")) return "application/msword";
  if (normalized.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalized.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (normalized.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (normalized.endsWith(".xls")) return "application/vnd.ms-excel";
  if (normalized.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".bmp")) return "image/bmp";
  if (normalized.endsWith(".svg")) return "image/svg+xml";
  if (normalized.endsWith(".zip")) return "application/zip";

  return null;
}

export function validatePersuratanFile(file: File): string | null {
  if (!(file instanceof File)) {
    return "File yang dipilih tidak valid.";
  }

  if (file.size <= 0) {
    return "File yang dipilih kosong atau rusak.";
  }

  if (file.size > PERSURATAN_MAX_FILE_SIZE_BYTES) {
    return `Ukuran file maksimal ${DOCUMENT_UPLOAD_MAX_SIZE_LABEL}.`;
  }

  const normalizedMimeType = file.type.trim().toLowerCase();
  const extension = inferExtensionFromFileName(file.name);

  if (
    normalizedMimeType &&
    PERSURATAN_ALLOWED_FILE_MIME_TYPES.has(normalizedMimeType)
  ) {
    return null;
  }

  if (
    extension &&
    PERSURATAN_ALLOWED_FILE_EXTENSIONS.has(extension) &&
    (!normalizedMimeType || normalizedMimeType === "application/octet-stream")
  ) {
    return null;
  }

  if (extension && PERSURATAN_ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return null;
  }

  return "Format file harus PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, JPEG, atau PNG.";
}

export function validateDigitalArchiveFile(file: File): string | null {
  if (!(file instanceof File)) {
    return "File yang dipilih tidak valid.";
  }

  if (file.size <= 0) {
    return "File yang dipilih kosong atau rusak.";
  }

  if (file.size > DIGITAL_ARCHIVE_MAX_FILE_SIZE_BYTES) {
    return `Ukuran file maksimal ${DOCUMENT_UPLOAD_MAX_SIZE_LABEL}.`;
  }

  const normalizedMimeType = file.type.trim().toLowerCase();
  const extension = inferExtensionFromFileName(file.name);

  if (
    normalizedMimeType &&
    PERSURATAN_ALLOWED_FILE_MIME_TYPES.has(normalizedMimeType)
  ) {
    return null;
  }

  if (extension && PERSURATAN_ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return null;
  }

  return "Format file harus PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, JPEG, atau PNG.";
}

export function validateDomainUploadFile(file: File): string | null {
  if (!(file instanceof File)) {
    return "File yang dipilih tidak valid.";
  }

  if (file.size <= 0) {
    return "File yang dipilih kosong atau rusak.";
  }

  if (file.size > DOCUMENT_UPLOAD_MAX_SIZE_BYTES) {
    return `Ukuran file maksimal ${DOCUMENT_UPLOAD_MAX_SIZE_LABEL}.`;
  }

  const normalizedMimeType = file.type.trim().toLowerCase();
  const extension = inferExtensionFromFileName(file.name);

  if (
    normalizedMimeType &&
    DOMAIN_ALLOWED_FILE_MIME_TYPES.has(normalizedMimeType)
  ) {
    return null;
  }

  if (extension && DOMAIN_ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return null;
  }

  return "Format file harus PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV, JSON, ZIP, JPG, JPEG, atau PNG.";
}

export function isValidFileUrl(url?: string | null): url is string {
  if (typeof url !== "string" || !url || url.trim() === "") {
    return false;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("http://")) return true;
  if (trimmed.startsWith("https://")) return true;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("blob:")) return true;
  return false;
}

export function toPreviewableFileUrl(
  value?: string | null,
  fileName?: string | null,
): string | undefined {
  void fileName;
  if (!isValidFileUrl(value)) return undefined;

  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/api/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function deriveDocumentFileName(
  value?: string | null,
  fallbackBaseName = "dokumen",
): string {
  const safeBaseName = normalizeFileNameBase(fallbackBaseName) || "dokumen";

  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();

    if (isValidFileUrl(trimmed)) {
      const normalized = trimmed.split("#")[0].split("?")[0];
      const fileName = normalized.split("/").filter(Boolean).pop();
      if (fileName) return decodeURIComponent(fileName);
    }

    return trimmed;
  }

  return `${safeBaseName}.pdf`;
}

export function detectDocumentFileType(
  fileUrl?: string | null,
  fileName?: string | null,
): DocumentFileType {
  const rawUrl = typeof fileUrl === "string" ? fileUrl.trim().toLowerCase() : "";
  const url = rawUrl.split("#")[0].split("?")[0];
  const name = typeof fileName === "string" ? fileName.trim().toLowerCase() : "";

  const mimeType = inferMimeTypeFromFileName(name);
  if (
    mimeType === "application/pdf" ||
    url.endsWith(".pdf") ||
    name.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (mimeType?.startsWith("image/")) {
    return "image";
  }

  const extension =
    inferExtensionFromFileName(name) ||
    (url.includes(".")
      ? url.split(".").at(-1) ?? null
      : null);

  if (
    extension &&
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)
  ) {
    return "image";
  }

  const fallbackExtension =
    (mimeType ? MIME_EXTENSION_MAP[mimeType] : null) ?? extension;

  if (fallbackExtension === "pdf") return "pdf";
  if (
    fallbackExtension &&
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(
      fallbackExtension,
    )
  ) {
    return "image";
  }
  if (fallbackExtension && ["ppt", "pptx"].includes(fallbackExtension)) {
    return "presentation";
  }
  if (
    fallbackExtension &&
    ["doc", "docx", "xls", "xlsx"].includes(fallbackExtension)
  ) {
    return "office";
  }

  return "other";
}
