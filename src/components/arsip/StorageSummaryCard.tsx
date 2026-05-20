"use client";

import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type StorageSummaryRow = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  onClick?: () => void;
};

type StorageSummaryCardProps = {
  actionLabel: string;
  className?: string;
  icon: ReactNode;
  onAction: () => void;
  rows: StorageSummaryRow[];
  style?: CSSProperties;
  total: ReactNode;
  totalLabel?: string;
};

export default function StorageSummaryCard({
  actionLabel,
  className = "",
  icon,
  onAction,
  rows,
  style,
  total,
  totalLabel = "Total Arsip",
}: StorageSummaryCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm transition-colors hover:border-gray-300 ${className}`.trim()}
      style={style}
    >
      <div className="mb-6 flex items-start justify-between pl-2 pr-4">
        <div className="flex h-8 w-8 items-center justify-center text-slate-900 [&_svg]:h-7 [&_svg]:w-7">
          {icon}
        </div>
        <div className="flex flex-col items-end">
          <span className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
            {totalLabel}
          </span>
          <span className="text-xl font-semibold tabular-nums text-gray-800">
            {total}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-gray-50">
        {rows.map((row, index) => {
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-3 text-gray-600">
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-gray-500">
                  {row.icon}
                </span>
                <span className="truncate">{row.label}</span>
              </span>
              <span className="min-w-[2.5rem] text-right font-semibold tabular-nums text-gray-800">
                {row.value}
              </span>
            </>
          );

          return (
            <div key={`${row.label}-${index}`}>
              {index > 0 ? <div className="h-px w-full bg-gray-200" /> : null}
              {row.onClick ? (
                <button
                  type="button"
                  onClick={row.onClick}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-gray-100"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  {content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAction}
        className="mt-6 flex w-full items-center justify-between rounded-lg px-3 py-2 font-semibold text-gray-900 transition-colors hover:bg-[rgba(21,126,195,0.06)]"
      >
        <span className="text-sm">{actionLabel}</span>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
