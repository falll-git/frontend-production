"use client";

import type {
  ChangeEventHandler,
  DragEventHandler,
  RefObject,
  ReactNode,
} from "react";
import { FileImage, Trash2, UploadCloud } from "lucide-react";

type UiverseFileUploadProps = {
  id: string;
  accept?: string;
  className?: string;
  disabled?: boolean;
  fileName?: string | null;
  fileMeta?: string | null;
  fileIcon?: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
  isDragActive?: boolean;
  title?: string;
  description?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onClear?: () => void;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
};

export default function UiverseFileUpload({
  id,
  accept,
  className,
  disabled = false,
  fileName,
  fileMeta,
  fileIcon,
  inputRef,
  isDragActive = false,
  title = "Pilih file",
  description = "Klik untuk memilih file",
  onChange,
  onClear,
  onDragLeave,
  onDragOver,
  onDrop,
}: UiverseFileUploadProps) {
  const hasFile = Boolean(fileName);

  return (
    <div
      className={[
        "uiverse-file-upload",
        disabled ? "uiverse-file-upload--disabled" : "",
        isDragActive ? "uiverse-file-upload--dragover" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <label htmlFor={id} className="uiverse-file-upload__header">
        <UploadCloud className="uiverse-file-upload__upload-icon" aria-hidden="true" />
        <span className="uiverse-file-upload__title">{title}</span>
        <span className="uiverse-file-upload__description">{description}</span>
      </label>

      <div className="uiverse-file-upload__footer">
        <span className="uiverse-file-upload__file-icon" aria-hidden="true">
          {fileIcon ?? <FileImage className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="uiverse-file-upload__file-name">
            {fileName || "Belum ada file dipilih"}
          </span>
          {fileMeta ? (
            <span className="uiverse-file-upload__file-meta">{fileMeta}</span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || !hasFile || !onClear}
          className="uiverse-file-upload__clear"
          aria-label="Bersihkan file terpilih"
          title="Bersihkan file"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={onChange}
        className="uiverse-file-upload__input"
      />
    </div>
  );
}
