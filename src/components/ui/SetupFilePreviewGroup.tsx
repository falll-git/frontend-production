"use client";

import type { ReactNode } from "react";

import type { DebtorFileMeta } from "@/types/debitur.types";
import SetupViewButton from "@/components/ui/SetupViewButton";

type SetupFilePreviewGroupProps = {
  file?: DebtorFileMeta | null;
  files?: DebtorFileMeta[] | null;
  label?: string;
  emptyLabel?: ReactNode;
  onOpen: (file: DebtorFileMeta) => void;
  align?: "start" | "center";
};

function previewFileKey(file: DebtorFileMeta, index: number) {
  return [file.url ?? "", file.name ?? "", index].join("::");
}

function normalizePreviewFiles(
  files?: DebtorFileMeta[] | null,
  file?: DebtorFileMeta | null,
) {
  const source = Array.isArray(files) && files.length > 0 ? files : file ? [file] : [];
  const seen = new Set<string>();
  const normalized: DebtorFileMeta[] = [];

  for (const entry of source) {
    if (!entry || (!entry.url && !entry.name)) continue;
    const key = [entry.url ?? "", entry.name ?? ""].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(entry);
  }

  return normalized;
}

export default function SetupFilePreviewGroup({
  file,
  files,
  label = "Preview",
  emptyLabel = <span className="text-gray-400">-</span>,
  onOpen,
  align = "center",
}: SetupFilePreviewGroupProps) {
  const previewFiles = normalizePreviewFiles(files, file);

  if (previewFiles.length === 0) return <>{emptyLabel}</>;

  if (previewFiles.length === 1) {
    const firstFile = previewFiles[0];
    if (!firstFile?.url) {
      return <span className="text-sm text-slate-500">{firstFile?.name ?? "-"}</span>;
    }

    return (
      <SetupViewButton
        label={label}
        title={firstFile.name ? `Preview ${firstFile.name}` : "Preview dokumen"}
        onClick={() => onOpen(firstFile)}
      />
    );
  }

  return (
    <div
      className={[
        "flex flex-col gap-2",
        align === "center" ? "items-center" : "items-start",
      ].join(" ")}
    >
      <span className="text-xs font-medium text-slate-500">
        {previewFiles.length} file
      </span>
      {previewFiles.map((previewFile, index) =>
        previewFile.url ? (
          <SetupViewButton
            key={previewFileKey(previewFile, index)}
            label={`File ${index + 1}`}
            title={previewFile.name ? `Preview ${previewFile.name}` : `Preview file ${index + 1}`}
            onClick={() => onOpen(previewFile)}
          />
        ) : (
          <span
            key={previewFileKey(previewFile, index)}
            className="text-xs text-slate-500"
            title={previewFile.name ?? undefined}
          >
            {previewFile.name ?? `File ${index + 1}`}
          </span>
        ),
      )}
    </div>
  );
}
