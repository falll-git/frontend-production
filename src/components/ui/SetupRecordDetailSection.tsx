import type { ReactNode } from "react";

export type SetupRecordDetailRow = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export default function SetupRecordDetailSection({
  title,
  rows,
}: {
  title: string;
  rows: SetupRecordDetailRow[];
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-500">
        {title}
      </h3>
      <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white px-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
              {row.label}
            </dt>
            <dd
              className={`min-w-0 break-words text-sm font-semibold text-gray-900 ${row.valueClassName ?? ""}`.trim()}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
