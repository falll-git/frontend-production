"use client";

import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import type { WatermarkFileMeta } from "@/types/watermark.types";

type WatermarkFileStatusProps = {
  watermark?: WatermarkFileMeta | null;
};

export default function WatermarkFileStatus({
  watermark,
}: WatermarkFileStatusProps) {
  const isActive = Boolean(
    watermark?.applied ||
      watermark?.status_key === "APPLIED" ||
      watermark?.file_url,
  );
  const statusLabel = isActive ? "Aktif" : "Nonaktif";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SetupStatusBadge
        status={statusLabel}
        tone={isActive ? "emerald" : "red"}
      />
      {watermark?.error_message ? (
        <span className="text-xs font-medium text-red-600">
          {watermark.error_message}
        </span>
      ) : null}
    </div>
  );
}
