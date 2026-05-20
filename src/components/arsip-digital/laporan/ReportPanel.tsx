import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ReportPanelProps = {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  aside?: ReactNode;
};

export default function ReportPanel({
  title,
  icon: Icon,
  children,
  aside,
}: ReportPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
