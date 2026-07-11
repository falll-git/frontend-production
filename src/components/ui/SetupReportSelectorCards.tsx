"use client";

import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type SetupReportSelectorRow = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
};

export type SetupReportSelectorCard<TKey extends string> = {
  kind: TKey;
  title: string;
  icon: LucideIcon;
  totalLabel: string;
  totalValue: ReactNode;
  ctaLabel: string;
  infoRows: SetupReportSelectorRow[];
};

type SetupReportSelectorCardsProps<TKey extends string> = {
  cards: SetupReportSelectorCard<TKey>[];
  activeKey: TKey | null;
  onSelect: (key: TKey) => void;
  gridClassName?: string;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatTotal(value: ReactNode) {
  return typeof value === "number" ? numberFormatter.format(value) : value;
}

export default function SetupReportSelectorCards<TKey extends string>({
  cards,
  activeKey,
  onSelect,
  gridClassName = "grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4",
}: SetupReportSelectorCardsProps<TKey>) {
  return (
    <div className={`grid ${gridClassName}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeKey === card.kind;

        return (
          <button
            key={card.kind}
            type="button"
            onClick={() => onSelect(card.kind)}
            aria-pressed={isActive}
            className={`group flex h-full min-w-0 flex-col rounded-lg border bg-white p-6 text-left shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
              isActive
                ? "border-blue-200 ring-2 ring-blue-100"
                : "border-gray-100 hover:border-blue-200"
            }`}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-900 [&_svg]:h-7 [&_svg]:w-7">
                  <Icon aria-hidden="true" strokeWidth={1.8} />
                </span>
                <p className="min-w-0 text-lg font-bold leading-6 text-gray-900">
                  {card.title}
                </p>
              </div>

              <div className="flex w-24 shrink-0 flex-col items-end text-right">
                <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
                  {card.totalLabel}
                </span>
                <span className="max-w-full break-words text-xl font-semibold tabular-nums text-gray-800">
                  {formatTotal(card.totalValue)}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-gray-50">
              {card.infoRows.length > 0 ? (
                card.infoRows.map((row, rowIndex) => {
                  const RowIcon = row.icon;

                  return (
                    <div key={`${card.kind}-${row.label}`}>
                      {rowIndex > 0 ? (
                        <div className="h-px w-full bg-gray-200" />
                      ) : null}
                      <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="flex min-w-0 items-center gap-3 text-gray-600">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-500">
                            <RowIcon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 break-words leading-5">
                            {row.label}
                          </span>
                        </span>
                        <span className="min-w-[2.5rem] max-w-[55%] break-words text-right font-semibold tabular-nums text-gray-800">
                          {row.value}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Memuat ringkasan...
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 transition-colors group-hover:bg-[rgba(21,126,195,0.06)]">
                <span className="min-w-0 break-words">{card.ctaLabel}</span>
                <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
