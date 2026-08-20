import type { ReactNode } from "react";

import { completeDefinitionGridRows } from "@/lib/ui/definition-grid";

export type SetupRecordDetailRow = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  wide?: boolean;
};

export default function SetupRecordDetailSection({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: SetupRecordDetailRow[];
}) {
  const completedWideRows = completeDefinitionGridRows(
    rows.map((row) => row.wide === true),
  );

  return (
    <section
      data-ui="record-detail-section"
      className="min-w-0 max-w-full space-y-3"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-500">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-6 text-gray-500">{description}</p>
        ) : null}
      </div>
      <dl
        data-ui-layout="modal-definition-grid"
        className="grid min-w-0 max-w-full gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-2"
      >
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            data-ui="modal-definition-cell"
            className={`min-w-0 bg-white px-4 py-3.5 sm:px-5 ${
              completedWideRows[index] ? "md:col-span-2" : ""
            }`.trim()}
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
              {row.label}
            </dt>
            <dd
              className={`mt-1.5 min-w-0 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-gray-900 ${row.valueClassName ?? ""}`.trim()}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
