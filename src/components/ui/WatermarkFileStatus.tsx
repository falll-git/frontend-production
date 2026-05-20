"use client";

import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import type { WatermarkFileMeta } from "@/types/watermark.types";

type WatermarkFileStatusProps = {
  watermark?: WatermarkFileMeta | null;
};

export default function WatermarkFileStatus({
  watermark,
}: WatermarkFileStatusProps) {
  const statusLabel =
    watermark?.status_label && watermark.status_label.trim()
      ? watermark.status_label
      : "Nonaktif";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SetupStatusBadge
        status={statusLabel as Parameters<typeof SetupStatusBadge>[0]["status"]}
      />
      {watermark?.error_message ? (
        <span className="text-xs font-medium text-red-600">
          {watermark.error_message}
        </span>
      ) : null}
    </div>
  );
}
