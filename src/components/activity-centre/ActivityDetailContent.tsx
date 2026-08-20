import type { LucideIcon } from "lucide-react";

import SetupModalDetailLayout from "@/components/ui/SetupModalDetailLayout";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import { formatDateTime } from "@/lib/utils/date";
import type { ActivityCentreDetail } from "@/types/activity-centre.types";

export default function ActivityDetailContent({
  actorName,
  detail,
  moduleIcon: ModuleIcon,
}: {
  actorName: string;
  detail: ActivityCentreDetail;
  moduleIcon: LucideIcon;
}) {
  const hasUniqueSummary = Boolean(
    detail.summary && detail.summary !== detail.title,
  );
  const hasAdditionalDetails =
    hasUniqueSummary ||
    detail.context.fields.length > 0 ||
    detail.context.changed_fields.length > 0;

  return (
    <SetupModalDetailLayout
      summary={
        <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
              <ModuleIcon
                className="size-5 text-slate-600"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">
                {detail.title ||
                  `${detail.action_label} ${detail.module_label}`}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatDateTime(detail.created_at)}
              </p>
            </div>
          </div>
          <SetupStatusBadge
            status={detail.result_label}
            label={detail.result_label}
            tone={detail.result_tone}
          />
        </section>
      }
      information={
        <SetupRecordDetailSection
          title="Informasi Aktivitas"
          rows={[
            { label: "Pelaku", value: actorName },
            {
              label: "Username",
              value: detail.actor?.username ? `@${detail.actor.username}` : "-",
            },
            { label: "Peran", value: detail.actor?.role?.name || "-" },
            { label: "Divisi", value: detail.actor?.division?.name || "-" },
            { label: "Modul", value: detail.module_label },
          ]}
        />
      }
      details={
        hasAdditionalDetails ? (
          <SetupRecordDetailSection
            title={detail.context.title}
            rows={[
              ...(hasUniqueSummary
                ? [
                    {
                      label: "Keterangan",
                      value: detail.summary || "-",
                      wide: true,
                    },
                  ]
                : []),
              ...detail.context.fields.map((field) => ({
                label: field.label,
                value: field.value,
              })),
              ...(detail.context.changed_fields.length > 0
                ? [
                    {
                      label: "Informasi yang Diubah",
                      value: detail.context.changed_fields.join(", "),
                      wide: true,
                    },
                  ]
                : []),
            ]}
          />
        ) : undefined
      }
    />
  );
}
