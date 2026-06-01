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
  const Icon = severityTone(item.severity).icon;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />

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
