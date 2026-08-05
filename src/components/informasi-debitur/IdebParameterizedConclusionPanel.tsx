import type { DebtorIdebParameterizedConclusion } from "@/types/debitur.types";

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}

function formatPeriod(value: string | null | undefined) {
  if (!value) return "-";
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

function conclusionTone(indicator: DebtorIdebParameterizedConclusion["indicator"]) {
  return {
    GREEN: {
      panel: "border-emerald-200 bg-emerald-50",
      badge: "border-emerald-300 bg-emerald-100 text-emerald-800",
      title: "text-emerald-950",
    },
    YELLOW: {
      panel: "border-amber-200 bg-amber-50",
      badge: "border-amber-300 bg-amber-100 text-amber-900",
      title: "text-amber-950",
    },
    RED: {
      panel: "border-red-200 bg-red-50",
      badge: "border-red-300 bg-red-100 text-red-800",
      title: "text-red-950",
    },
    GRAY: {
      panel: "border-slate-200 bg-slate-50",
      badge: "border-slate-300 bg-slate-100 text-slate-700",
      title: "text-slate-900",
    },
  }[indicator];
}

export default function IdebParameterizedConclusionPanel({
  result,
}: {
  result: DebtorIdebParameterizedConclusion | null | undefined;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
        Kesimpulan matriks belum tersedia. Data sumber perlu diperiksa sebelum
        keputusan dibuat.
      </div>
    );
  }

  const tone = conclusionTone(result.indicator);

  return (
    <div className={`rounded-xl border p-4 ${tone.panel}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}>
          Indikator {result.indicator_label}
        </span>
        <span className="text-xs font-semibold text-slate-600">
          {result.rule_number === null
            ? "Belum ada aturan yang terpenuhi"
            : `Aturan matriks ${formatNumber(result.rule_number)}`}
        </span>
      </div>

      <p className={`mt-4 text-base font-bold leading-7 ${tone.title}`}>
        {result.conclusion}
      </p>

      <div className="mt-4 rounded-lg border border-white/80 bg-white/75 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Kondisi yang Dinilai
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
          {result.condition}
        </p>
      </div>

      <p className="mt-3 border-t border-slate-300/60 pt-3 text-xs font-medium leading-5 text-slate-600">
        Acuan periode: {formatPeriod(result.reference_period)}. Hasil matriks
        merupakan ringkasan otomatis dan tetap perlu diverifikasi terhadap data
        IDEB sumber sebelum keputusan pembiayaan dibuat.
      </p>
    </div>
  );
}
