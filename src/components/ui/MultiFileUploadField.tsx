"use client";

import { useMemo, type ChangeEventHandler, type ReactNode } from "react";
import { FileText, Trash2 } from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import UiverseFileUpload from "@/components/ui/UiverseFileUpload";
import {
  DOCUMENT_FILE_ACCEPT,
  DOCUMENT_FILE_EMPTY_META,
  formatUploadFileSize,
} from "@/components/ui/FileUploadField";

type MultiFileUploadFieldProps = {
  id: string;
  accept?: string;
  className?: string;
  description?: string;
  disabled?: boolean;
  emptyFileMeta?: string;
  files: File[];
  helperText?: ReactNode;
  label?: ReactNode;
  maxFiles?: number;
  required?: boolean;
  title?: string;
  validateFile?: (file: File) => string | null;
  onChange: (files: File[]) => void;
};

function buildFileSelectionKey(file: File) {
  return [file.name, file.size, file.lastModified].join("::");
}

function mergeSelectedFiles(existingFiles: File[], incomingFiles: File[]) {
  const mergedFiles = [...existingFiles];
  const knownKeys = new Set(existingFiles.map(buildFileSelectionKey));

  for (const file of incomingFiles) {
    const key = buildFileSelectionKey(file);
    if (knownKeys.has(key)) continue;
    mergedFiles.push(file);
    knownKeys.add(key);
  }

  return mergedFiles;
}

function formatBytes(size: number) {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${size} B`;
}

function selectedFileSummary(files: File[], totalSize: number) {
  if (files.length === 0) {
    return {
      fileName: "Belum ada file dipilih",
      meta: DOCUMENT_FILE_EMPTY_META,
    };
  }

  if (files.length === 1) {
    return {
      fileName: files[0]?.name ?? "1 file dipilih",
      meta: formatUploadFileSize(files[0]),
    };
  }

  return {
    fileName: `${files.length} file dipilih`,
    meta: `Total ${formatBytes(totalSize)}`,
  };
}

export default function MultiFileUploadField({
  id,
  accept = DOCUMENT_FILE_ACCEPT,
  className,
  description = "Klik area ini atau drag & drop file",
  disabled = false,
  emptyFileMeta = DOCUMENT_FILE_EMPTY_META,
  files,
  helperText,
  label = "Upload File",
  maxFiles = 20,
  required = true,
  title,
  validateFile,
  onChange,
}: MultiFileUploadFieldProps) {
  const { showToast } = useAppToast();

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  const fileSummary = useMemo(
    () => selectedFileSummary(files, totalSize),
    [files, totalSize],
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      const error = validateFile?.(file);
      if (error) {
        event.target.value = "";
        showToast(error, "error");
        return;
      }
    }

    const mergedFiles = mergeSelectedFiles(files, selectedFiles);
    if (mergedFiles.length > maxFiles) {
      event.target.value = "";
      showToast(`Maksimal ${maxFiles} file untuk satu upload.`, "error");
      return;
    }

    onChange(mergedFiles);
    event.target.value = "";
  };

  const removeFile = (targetFile: File) => {
    const targetKey = buildFileSelectionKey(targetFile);
    onChange(files.filter((file) => buildFileSelectionKey(file) !== targetKey));
  };

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-3 block text-sm font-medium text-gray-700">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}
      <UiverseFileUpload
        id={id}
        accept={accept}
        disabled={disabled}
        multiple
        fileName={fileSummary.fileName}
        fileMeta={files.length === 0 ? emptyFileMeta : fileSummary.meta}
        fileIcon={<FileText className="h-5 w-5" />}
        title={title ?? (files.length > 0 ? "Tambah file" : "Pilih file")}
        description={description}
        onChange={handleChange}
        onClear={() => onChange([])}
      />
      {files.length > 1 ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Daftar File
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {files.map((file) => (
              <div
                key={buildFileSelectionKey(file)}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {file.name}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatUploadFileSize(file)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  onClick={() => removeFile(file)}
                  aria-label={`Hapus ${file.name}`}
                  title={`Hapus ${file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {helperText ? <p className="mt-2 text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}
