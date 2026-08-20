import type { ReactNode } from "react";

export type PersuratanDispositionEntry = {
  label: string;
  value: ReactNode;
};

type PersuratanDispositionPanelProps = {
  summary: readonly [
    PersuratanDispositionEntry,
    PersuratanDispositionEntry,
    PersuratanDispositionEntry,
    PersuratanDispositionEntry,
  ];
  notes: readonly [PersuratanDispositionEntry, PersuratanDispositionEntry];
  action?: ReactNode;
};

function PersuratanDispositionValue({
  label,
  value,
}: PersuratanDispositionEntry) {
  const renderedValue =
    value === null || value === undefined || value === "" ? "-" : value;

  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 min-w-0 whitespace-normal break-words text-sm font-semibold leading-6 text-slate-900 [word-break:normal]">
        {renderedValue}
      </dd>
    </div>
  );
}

export default function PersuratanDispositionPanel({
  summary,
  notes,
  action,
}: PersuratanDispositionPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <dl
        role="group"
        aria-label="Ringkasan alur disposisi"
        className="grid grid-cols-1 [&>*]:border-slate-200 [&>*:not(:last-child)]:border-b sm:grid-cols-2 sm:[&>*:nth-child(3)]:border-b-0 sm:[&>*:nth-child(odd)]:border-r"
      >
        {summary.map((entry) => (
          <PersuratanDispositionValue key={entry.label} {...entry} />
        ))}
      </dl>

      {action ? (
        <div className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
          {action}
        </div>
      ) : null}

      <div className="border-t border-slate-200">
        <div className="bg-slate-50/70 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Keterangan dan Catatan
          </p>
        </div>
        <dl
          role="group"
          aria-label="Keterangan dan catatan disposisi"
          className="grid grid-cols-1 border-t border-slate-200 [&>*]:border-slate-200 [&>*:first-child]:border-b sm:grid-cols-2 sm:[&>*:first-child]:border-b-0 sm:[&>*:first-child]:border-r"
        >
          {notes.map((entry) => (
            <PersuratanDispositionValue key={entry.label} {...entry} />
          ))}
        </dl>
      </div>
    </div>
  );
}
