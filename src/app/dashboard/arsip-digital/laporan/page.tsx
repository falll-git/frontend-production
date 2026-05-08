"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  FolderKanban,
  Layers3,
  MapPinned,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  arsipService,
  type ArsipDigitalReportSummary,
  type ArsipReportBreakdownItem,
  type ArsipReportQuickReport,
  type ArsipReportRiskItem,
  type ArsipReportStorageOffice,
} from "@/services/arsip.service";

const DEFAULT_QUICK_REPORTS: ArsipReportQuickReport[] = [
  {
    key: "documents",
    label: "Inventaris Dokumen",
    description: "Daftar dokumen, pemilik, jenis, lokasi, dan status akses.",
    endpoint: "/api/digital-archives/reports/documents",
    menu_url: "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
  },
  {
    key: "storage",
    label: "Kesehatan Ruang Arsip",
    description: "Sebaran dokumen per kantor, lemari, dan rak.",
    endpoint: "/api/digital-archives/reports/storage",
    menu_url: "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
  },
  {
    key: "due_dates",
    label: "Jatuh Tempo Dokumen",
    description: "Dokumen yang perlu ditindaklanjuti berdasarkan due date.",
    endpoint: "/api/digital-archives/reports/due-dates",
    menu_url: "/dashboard/arsip-digital/ruang-arsip/jatuh-tempo",
  },
  {
    key: "loans",
    label: "Peminjaman Fisik",
    description: "Request, approval, serah terima, dan pengembalian dokumen.",
    endpoint: "/api/digital-archives/reports/loans",
    menu_url: "/dashboard/arsip-digital/peminjaman/laporan",
  },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function formatPercent(value: number): string {
  return `${clampPercent(value).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })}%`;
}

function getSeverityClass(severity: ArsipReportRiskItem["severity"]) {
  switch (severity) {
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "normal":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function getAccessLevelLabel(key: string): string {
  switch (key) {
    case "RESTRICT":
      return "Terbatas";
    case "NON_RESTRICT":
      return "Umum";
    default:
      return key;
  }
}

function ProgressBar({
  value,
  className = "bg-[#157ec3]",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${className}`}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: string;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {isLoading ? "-" : formatNumber(value)}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${tone}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function RiskRow({ item }: { item: ArsipReportRiskItem }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {item.label}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {item.total > 0 ? "Perlu dicek" : "Tidak ada antrean"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClass(
            item.severity,
          )}`}
        >
          {item.severity === "critical"
            ? "Prioritas"
            : item.severity === "warning"
              ? "Pantau"
              : "Normal"}
        </span>
        <span className="w-10 text-right text-sm font-bold text-slate-900">
          {formatNumber(item.total)}
        </span>
      </div>
    </div>
  );
}

function OfficeRow({
  item,
  maxDocuments,
}: {
  item: ArsipReportStorageOffice;
  maxDocuments: number;
}) {
  const documentPercent = maxDocuments
    ? (item.total_documents / maxDocuments) * 100
    : 0;

  return (
    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {item.code ? `${item.code} - ${item.name}` : item.name}
          </p>
          <p className="text-xs text-slate-500">
            {formatNumber(item.used_rack_count)} dari{" "}
            {formatNumber(item.rack_count)} rak terpakai
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-900">
          {formatNumber(item.total_documents)}
        </span>
      </div>
      <ProgressBar value={documentPercent} className="bg-emerald-500" />
      <div className="flex justify-between text-xs text-slate-500">
        <span>Kapasitas {formatPercent(item.capacity_usage_percent)}</span>
        <span>Risiko {formatNumber(item.risk_count)}</span>
      </div>
    </div>
  );
}

function WorkflowBlock({
  title,
  icon: Icon,
  rows,
  completion,
}: {
  title: string;
  icon: LucideIcon;
  rows: Array<{ label: string; value: number; tone: string }>;
  completion: number;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Selesai {formatPercent(completion)}
        </span>
      </div>
      <ProgressBar value={completion} className="bg-[#157ec3]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md bg-white px-3 py-2">
            <p className="text-xs text-slate-500">{row.label}</p>
            <p className={`mt-1 text-lg font-bold ${row.tone}`}>
              {formatNumber(row.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownList({
  title,
  items,
  formatter,
}: {
  title: string;
  items: ArsipReportBreakdownItem[];
  formatter?: (item: ArsipReportBreakdownItem) => string;
}) {
  const maxValue = Math.max(...items.map((item) => item.total), 0);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.slice(0, 5).map((item) => (
            <div key={`${item.id ?? item.name}-${item.total}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-600">
                  {formatter ? formatter(item) : item.name}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatNumber(item.total)}
                </span>
              </div>
              <ProgressBar
                value={maxValue ? (item.total / maxValue) * 100 : 0}
                className="bg-violet-500"
              />
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Belum ada data.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LaporanArsipDigitalPage() {
  const { showToast } = useAppToast();
  const [summary, setSummary] = useState<ArsipDigitalReportSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      setIsLoading(true);
      try {
        const result = await arsipService.getReportSummary();
        if (!ignore) setSummary(result);
      } catch (error) {
        if (!ignore) {
          setSummary(null);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat ringkasan arsip digital.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadSummary();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const metrics = useMemo(
    () => [
      {
        label: "Total Dokumen",
        value: summary?.overview.total_documents ?? 0,
        description: "Inventaris digital sesuai scope akses role.",
        icon: FileText,
        tone: "text-[#157ec3] bg-sky-50 border-sky-100",
      },
      {
        label: "Perlu Tindak Lanjut",
        value:
          (summary?.overview.due_soon_documents ?? 0) +
          (summary?.overview.overdue_documents ?? 0),
        description: "Gabungan jatuh tempo dekat dan terlambat.",
        icon: AlertTriangle,
        tone: "text-amber-700 bg-amber-50 border-amber-100",
      },
      {
        label: "Peminjaman Aktif",
        value: summary?.overview.active_loans ?? 0,
        description: "Dokumen yang sedang diserahkan atau dipinjam.",
        icon: BookOpen,
        tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
      },
      {
        label: "Utilisasi Rak",
        value: Math.round(summary?.overview.rack_utilization_percent ?? 0),
        description: `${formatNumber(summary?.overview.used_racks ?? 0)} dari ${formatNumber(
          summary?.overview.total_racks ?? 0,
        )} rak terpakai.`,
        icon: MapPinned,
        tone: "text-violet-700 bg-violet-50 border-violet-100",
      },
    ],
    [summary],
  );

  const riskQueue =
    summary?.risk_queue.length && summary.risk_queue.some((item) => item.total > 0)
      ? summary.risk_queue.filter((item) => item.total > 0)
      : summary?.risk_queue ?? [];
  const quickReports = summary?.quick_reports.length
    ? summary.quick_reports
    : DEFAULT_QUICK_REPORTS;
  const topOffices = summary?.storage_health.top_document_offices ?? [];
  const maxOfficeDocuments = Math.max(
    ...topOffices.map((item) => item.total_documents),
    0,
  );

  const accessLevelBreakdown =
    summary?.breakdowns.by_access_level.map((item) => ({
      id: item.key,
      code: null,
      name: getAccessLevelLabel(item.key),
      total: item.total,
    })) ?? [];

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <FeatureHeader
        title="Laporan Arsip Digital"
        subtitle="Kontrol dokumen, ruang arsip, disposisi akses, dan peminjaman fisik."
        icon={<Archive />}
        actions={
          summary ? (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Scope
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {summary.scope.can_report_all ? "Semua Data" : "Data Role Saya"}
              </p>
            </div>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            description={item.description}
            icon={item.icon}
            tone={item.tone}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title="Kesehatan Ruang Arsip" icon={Boxes}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Rak Terpakai
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatPercent(summary?.storage_health.utilization_percent ?? 0)}
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={summary?.storage_health.utilization_percent ?? 0}
                    className="bg-[#157ec3]"
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {formatNumber(summary?.storage_health.used_racks ?? 0)} rak
                  terisi, {formatNumber(summary?.storage_health.empty_racks ?? 0)}{" "}
                  rak kosong.
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Kapasitas Rak
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatPercent(
                      summary?.storage_health.capacity_usage_percent ?? 0,
                    )}
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={summary?.storage_health.capacity_usage_percent ?? 0}
                    className="bg-emerald-500"
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {formatNumber(summary?.storage_health.used_capacity ?? 0)} dari{" "}
                  {formatNumber(summary?.storage_health.total_capacity ?? 0)}{" "}
                  slot kapasitas.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {topOffices.length > 0 ? (
                topOffices.map((item) => (
                  <OfficeRow
                    key={item.id}
                    item={item}
                    maxDocuments={maxOfficeDocuments}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Data lokasi penyimpanan belum tersedia.
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Antrean Risiko" icon={AlertTriangle}>
            <div className="space-y-3">
              {riskQueue.length > 0 ? (
                riskQueue.slice(0, 6).map((item) => (
                  <RiskRow key={item.key} item={item} />
                ))
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">
                      Tidak ada antrean risiko.
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Tidak ada jatuh tempo, pengajuan, atau peminjaman yang
                      perlu diprioritaskan.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title="Workflow Arsip" icon={Workflow}>
            <div className="grid gap-4 md:grid-cols-2">
              <WorkflowBlock
                title="Disposisi Akses"
                icon={FolderKanban}
                completion={
                  summary?.workflow.access_requests.completion_percent ?? 0
                }
                rows={[
                  {
                    label: "Menunggu",
                    value: summary?.workflow.access_requests.pending ?? 0,
                    tone: "text-amber-700",
                  },
                  {
                    label: "Disetujui",
                    value: summary?.workflow.access_requests.approved ?? 0,
                    tone: "text-emerald-700",
                  },
                  {
                    label: "Ditolak",
                    value: summary?.workflow.access_requests.rejected ?? 0,
                    tone: "text-rose-700",
                  },
                  {
                    label: "Total",
                    value: summary?.workflow.access_requests.total ?? 0,
                    tone: "text-slate-900",
                  },
                ]}
              />

              <WorkflowBlock
                title="Peminjaman Fisik"
                icon={BookOpen}
                completion={summary?.workflow.loans.completion_percent ?? 0}
                rows={[
                  {
                    label: "Menunggu",
                    value: summary?.workflow.loans.pending ?? 0,
                    tone: "text-amber-700",
                  },
                  {
                    label: "Aktif",
                    value: summary?.workflow.loans.active ?? 0,
                    tone: "text-[#157ec3]",
                  },
                  {
                    label: "Terlambat",
                    value: summary?.workflow.loans.overdue ?? 0,
                    tone: "text-rose-700",
                  },
                  {
                    label: "Selesai",
                    value:
                      (summary?.workflow.loans.returned ?? 0) +
                      (summary?.workflow.loans.rejected ?? 0),
                    tone: "text-emerald-700",
                  },
                ]}
              />
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Breakdown Dokumen" icon={BarChart3}>
            <div className="space-y-5">
              <BreakdownList
                title="Jenis Dokumen"
                items={summary?.breakdowns.by_document_type ?? []}
                formatter={(item) =>
                  item.code ? `${item.code} - ${item.name}` : item.name
                }
              />
              <BreakdownList
                title="Level Akses"
                items={accessLevelBreakdown}
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4">
        <Panel title="Akses Cepat Laporan" icon={Database}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickReports.map((item) => (
              <ProtectedLink
                key={item.key}
                href={item.menu_url}
                className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-[#157ec3]/30 hover:bg-sky-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#157ec3]">
                    {item.key === "storage" ? (
                      <Layers3 className="h-5 w-5" aria-hidden="true" />
                    ) : item.key === "loans" ? (
                      <BookOpen className="h-5 w-5" aria-hidden="true" />
                    ) : item.key === "due_dates" ? (
                      <Clock3 className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#157ec3]" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {item.description}
                </p>
              </ProtectedLink>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
