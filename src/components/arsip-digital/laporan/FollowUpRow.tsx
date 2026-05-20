import type { ArsipReportRiskItem } from "@/services/arsip.service";
import {
  formatNumber,
  severityTone,
} from "@/components/arsip-digital/laporan/format";

export default function FollowUpRow({
  item,
}: {
  item: ArsipReportRiskItem;
}) {
  const tone = severityTone(item.severity);
  const Icon = tone.icon;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white ${tone.border}`}
      >
        <Icon className="h-4 w-4 text-slate-900" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
          <span className="w-10 text-right text-sm font-bold text-slate-900">
            {formatNumber(item.total)}
          </span>
        </div>
        {item.description ? (
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {item.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
