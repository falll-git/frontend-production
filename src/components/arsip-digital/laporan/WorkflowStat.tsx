import { formatNumber } from "@/components/arsip-digital/laporan/format";

type WorkflowStatProps = {
  label: string;
  value: number;
  className?: string;
};

export default function WorkflowStat({
  label,
  value,
  className = "",
}: WorkflowStatProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm ${className}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}
