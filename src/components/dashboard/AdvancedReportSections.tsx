"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileSignature,
  HeartPulse,
  Search,
  Scale,
  Shield,
  TrendingDown,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import { getDashboardRouteDecision } from "@/lib/rbac";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

type MetricTone = "neutral" | "success" | "danger" | "warning";

const metricToneClass: Record<MetricTone, string> = {
  neutral: "text-gray-700",
  success: "text-emerald-600",
  danger: "text-red-600",
  warning: "text-amber-600",
};

function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
        {icon}
        {title}
      </h2>
    </div>
  );
}

function SummaryMetricRow({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: MetricTone;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={`flex items-center gap-2 ${metricToneClass[tone]}`}>
        {icon}
        {label}
      </span>
      <span className={`font-semibold ${metricToneClass[tone]}`}>{value}</span>
    </div>
  );
}

function ReportSummaryCard({
  href,
  icon: Icon,
  title,
  counterLabel,
  counterValue,
  children,
  footerLabel,
  isDisabled = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  counterLabel: string;
  counterValue: string;
  children: ReactNode;
  footerLabel: string;
  isDisabled?: boolean;
}) {
  return (
    <ProtectedLink
      href={href}
      className={`group animate-slide-up rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl${
        isDisabled ? " cursor-not-allowed opacity-60 saturate-75" : ""
      }`}
      title={title}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #157ec3 0%, #0d5a8f 100%)",
            }}
          >
            <Icon className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">{title}</p>
          </div>
        </div>

        <div className="flex w-[118px] shrink-0 flex-col items-end text-right">
          <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
            {counterLabel}
          </span>
          <span className="text-2xl font-bold tabular-nums text-gray-800">
            {counterValue}
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">{children}</div>

      <div className="mt-6 flex items-center justify-between font-medium text-primary-600 transition-transform group-hover:translate-x-1">
        <span className="text-sm">{footerLabel}</span>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </div>
    </ProtectedLink>
  );
}

const pihakKetigaCards = [
  { title: "Notaris", icon: Scale },
  { title: "Asuransi", icon: Shield },
  { title: "KJPP", icon: Building2 },
];

export function LaporanPihakKetigaDokumenPreview({
  isDisabled = false,
}: {
  isDisabled?: boolean;
}) {
  return (
    <section className="animate-fade-in">
      <SectionTitle
        icon={<Users2 className="h-6 w-6 text-gray-600" aria-hidden="true" />}
        title="Laporan Pihak Ketiga - Dokumen"
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {pihakKetigaCards.map((item) => (
          <ReportSummaryCard
            key={item.title}
            href="/dashboard/legal/laporan/pihak-ketiga/dokumen"
            icon={item.icon}
            title={item.title}
            counterLabel="Total Pihak Ketiga"
            counterValue={formatNumber(0)}
            footerLabel="Lihat Detail"
            isDisabled={isDisabled}
          >
            <SummaryMetricRow
              icon={<Activity className="h-4 w-4" aria-hidden="true" />}
              label="Proses Berjalan"
              value={formatNumber(0)}
            />
            <div className="my-3 h-px w-full bg-gray-200" />
            <SummaryMetricRow
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              label="Laporan Selesai"
              value={formatNumber(0)}
              tone="success"
            />
            <div className="my-3 h-px w-full bg-gray-200" />
            <SummaryMetricRow
              icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
              label="Lewat Expired"
              value={formatNumber(0)}
              tone="danger"
            />
          </ReportSummaryCard>
        ))}
      </div>
    </section>
  );
}

const titipanCards = [
  { title: "Titipan Notaris", icon: FileSignature },
  { title: "Titipan Asuransi", icon: HeartPulse },
  { title: "Titipan Angsuran", icon: Banknote },
];

export function LaporanPihakKetigaDanaTitipanPreview({
  isDisabled = false,
}: {
  isDisabled?: boolean;
}) {
  return (
    <section className="animate-fade-in">
      <SectionTitle
        icon={<Wallet className="h-6 w-6 text-gray-600" aria-hidden="true" />}
        title="Laporan Pihak Ketiga - Dana Titipan"
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {titipanCards.map((item) => (
          <ReportSummaryCard
            key={item.title}
            href="/dashboard/legal/laporan/pihak-ketiga/dana-titipan"
            icon={item.icon}
            title={item.title}
            counterLabel="Jumlah Nasabah"
            counterValue={formatNumber(0)}
            footerLabel="Lihat Nasabah"
            isDisabled={isDisabled}
          >
            <SummaryMetricRow
              icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
              label="Total Titipan"
              value={formatRupiah(0)}
            />
            <div className="my-3 h-px w-full bg-gray-200" />
            <SummaryMetricRow
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              label="Saldo Terbayar"
              value={formatRupiah(0)}
              tone="success"
            />
            <div className="my-3 h-px w-full bg-gray-200" />
            <SummaryMetricRow
              icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
              label="Sisa Saldo"
              value={formatRupiah(0)}
              tone="danger"
            />
          </ReportSummaryCard>
        ))}
      </div>
    </section>
  );
}

const kolektibilitasRows = [
  { label: "Kol 1", color: "#22c55e" },
  { label: "Kol 2", color: "#eab308" },
  { label: "Kol 3", color: "#f97316" },
  { label: "Kol 4", color: "#ef4444" },
  { label: "Kol 5", color: "#991b1b" },
];

export function LaporanNpfPreview({
  isDisabled = false,
}: {
  isDisabled?: boolean;
}) {
  return (
    <section
      className={`animate-fade-in${isDisabled ? " pointer-events-none opacity-60 saturate-75" : ""}`}
      data-disabled={isDisabled ? "true" : undefined}
    >
      <SectionTitle
        icon={
          <TrendingDown className="h-6 w-6 text-gray-600" aria-hidden="true" />
        }
        title="Laporan NPF"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-8 text-base font-semibold text-gray-900">
            Distribusi Kolektibilitas
          </h3>
          <div className="flex justify-center py-4">
            <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-[44px] border-gray-100">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">0,0%</p>
                <p className="text-sm text-gray-500">Rasio NPF</p>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Kolektibilitas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Nasabah
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kolektibilitasRows.map((item, index) => (
                  <tr key={item.label} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900">
                      <span className="inline-flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatNumber(0)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatRupiah(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <TrendingDown className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="flex min-h-11 items-center text-base font-semibold text-gray-900">
                Ringkasan NPF
              </h3>
            </div>

            <div className="inline-flex h-11 items-center justify-between rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm sm:w-52">
              6 bulan terakhir
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-semibold">NPF dalam batas aman</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-xl bg-gray-50 p-4">
            <SummaryMetricRow
              icon={null}
              label="Total Nasabah Bermasalah (Kol 3-5)"
              value={formatNumber(0)}
            />
            <SummaryMetricRow
              icon={null}
              label="Total Outstanding Bermasalah"
              value={formatRupiah(0)}
            />
            <SummaryMetricRow
              icon={null}
              label="Rasio NPF saat ini"
              value="0,0%"
              tone="success"
            />
          </div>

          <div className="my-6 h-px w-full bg-gray-200" />

          <h3 className="mb-3 font-semibold text-gray-900">
            Riwayat NPF - 6 bulan terakhir
          </h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Bulan Tahun
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Rasio NPF
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={2}
                    className="h-32 px-4 text-center text-sm text-gray-500"
                  >
                    Belum ada data riwayat NPF.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

const aktivitasOptions = ["Semua Aktivitas", "Action Plan", "Hasil Kunjungan", "Langkah Penanganan"];

export function LaporanAktivitasMarketingPreview({
  isDisabled = false,
}: {
  isDisabled?: boolean;
}) {
  const [selectedActivity, setSelectedActivity] = useState(aktivitasOptions[0]);

  return (
    <section
      className={`animate-fade-in${isDisabled ? " pointer-events-none opacity-60 saturate-75" : ""}`}
      data-disabled={isDisabled ? "true" : undefined}
    >
      <SectionTitle
        icon={<Activity className="h-6 w-6 text-gray-600" aria-hidden="true" />}
        title="Laporan Aktivitas Marketing"
      />

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1 sm:flex-none">
            <select
              value={selectedActivity}
              onChange={(event) => setSelectedActivity(event.target.value)}
              className="select"
              aria-label="Filter jenis aktivitas marketing"
            >
              {aktivitasOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[260px] flex-[2]">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              className="input input-with-icon"
              placeholder="Cari nasabah..."
            />
          </div>

          <div className="min-w-[150px] flex-1 sm:flex-none">
            <select className="select" aria-label="Urutan tanggal aktivitas marketing">
              <option>Terbaru</option>
              <option>Terlama</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Aktivitas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nasabah
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="h-32 px-4 text-center text-sm text-gray-500">
                  Belum ada aktivitas marketing.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function AdvancedReportSections() {
  const { role, status, user } = useAuth();

  const reportAccess = useMemo(() => {
    const resolveAccess = (href: string) => {
      if (status !== "authenticated" || !role) return false;
      return getDashboardRouteDecision(href, role, user?.role_id).allowed;
    };

    return {
      pihakKetigaDokumen: resolveAccess(
        "/dashboard/legal/laporan/pihak-ketiga/dokumen",
      ),
      pihakKetigaDanaTitipan: resolveAccess(
        "/dashboard/legal/laporan/pihak-ketiga/dana-titipan",
      ),
      npf: resolveAccess("/dashboard/informasi-debitur/laporan/npf"),
      aktivitasMarketing: resolveAccess(
        "/dashboard/informasi-debitur/laporan/aktivitas-marketing",
      ),
    };
  }, [role, status, user?.role_id]);

  return (
    <div className="mt-10 space-y-10">
      <LaporanPihakKetigaDokumenPreview
        isDisabled={!reportAccess.pihakKetigaDokumen}
      />
      <LaporanPihakKetigaDanaTitipanPreview
        isDisabled={!reportAccess.pihakKetigaDanaTitipan}
      />
      <LaporanNpfPreview isDisabled={!reportAccess.npf} />
      <LaporanAktivitasMarketingPreview
        isDisabled={!reportAccess.aktivitasMarketing}
      />
    </div>
  );
}
