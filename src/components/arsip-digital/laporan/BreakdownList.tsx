import type { ArsipReportBreakdownItem } from "@/services/arsip.service";
import EmptyReportState from "@/components/arsip-digital/laporan/EmptyReportState";
import { formatNumber } from "@/components/arsip-digital/laporan/format";

type BreakdownListProps = {
  title: string;
  items: ArsipReportBreakdownItem[];
  emptyText: string;
  mapLabel?: (item: ArsipReportBreakdownItem) => string;
  mapMeta?: (item: ArsipReportBreakdownItem) => string | null;
};

export default function BreakdownList({
  title,
  items,
  emptyText,
  mapLabel,
  mapMeta,
}: BreakdownListProps) {
  const visibleItems = items.slice(0, 5);

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      {visibleItems.length > 0 ? (
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {visibleItems.map((item) => {
            const meta = mapMeta ? mapMeta(item) : item.code;

            return (
              <div
                key={`${item.id ?? item.code ?? item.name}-${item.total}`}
                className="flex items-center justify-between gap-3 px-1 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {mapLabel ? mapLabel(item) : item.name}
                  </p>
                  {meta ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {meta}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                  {formatNumber(item.total)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyReportState>{emptyText}</EmptyReportState>
      )}
    </div>
  );
}
