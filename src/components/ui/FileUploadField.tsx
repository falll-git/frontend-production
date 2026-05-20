"use client";

import type {
  ChangeEventHandler,
  DragEventHandler,
  ReactNode,
  RefObject,
} from "react";
import { FileText } from "lucide-react";

import UiverseFileUpload from "@/components/ui/UiverseFileUpload";
import { DOCUMENT_UPLOAD_EMPTY_META } from "@/lib/upload-limits";

type FileUploadFieldProps = {
  id: string;
  accept?: string;
  className?: string;
  disabled?: boolean;
  emptyFileMeta?: string;
  file?: File | null;
  fileIcon?: ReactNode;
  fileMeta?: string | null;
  fileName?: string | null;
  helperText?: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
  isDragActive?: boolean;
  label?: ReactNode;
  required?: boolean;
  title?: string;
  description?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onClear?: () => void;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
};

export const DOCUMENT_FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png";

export const DOCUMENT_FILE_EMPTY_META = DOCUMENT_UPLOAD_EMPTY_META;

export function formatUploadFileSize(file: File) {
  if (file.size >= 1024 * 1024 * 1024) {
    return `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (file.size >= 1024 * 1024) {
    return `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(file.size / 1024).toFixed(2)} KB`;
}

export default function FileUploadField({
  id,
  accept = DOCUMENT_FILE_ACCEPT,
  className,
  disabled = false,
  emptyFileMeta = DOCUMENT_FILE_EMPTY_META,
  file,
  fileIcon,
  fileMeta,
  fileName,
  helperText,
  inputRef,
  isDragActive = false,
  label = "Upload File",
  required = true,
  title,
  description = "Klik area ini atau drag & drop file",
  onChange,
  onClear,
  onDragLeave,
  onDragOver,
  onDrop,
}: FileUploadFieldProps) {
  const resolvedFileName = fileName ?? file?.name ?? null;
  const resolvedFileMeta =
    fileMeta ?? (file ? formatUploadFileSize(file) : emptyFileMeta);

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-3"
        >
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}
      <UiverseFileUpload
        id={id}
        accept={accept}
        disabled={disabled}
        inputRef={inputRef}
        fileName={resolvedFileName}
        fileMeta={resolvedFileMeta}
        fileIcon={fileIcon ?? <FileText className="h-5 w-5" />}
        isDragActive={isDragActive}
        title={title ?? (resolvedFileName ? "Ganti file" : "Pilih file")}
        description={description}
        onChange={onChange}
        onClear={onClear}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
      {helperText ? (
        <p className="mt-2 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
