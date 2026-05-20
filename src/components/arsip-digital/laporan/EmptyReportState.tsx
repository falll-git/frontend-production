import type { ReactNode } from "react";

export default function EmptyReportState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm font-medium text-slate-500">
      {children}
    </div>
  );
}
