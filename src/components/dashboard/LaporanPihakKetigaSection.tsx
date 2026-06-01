"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Scale,
  Shield,
  Users2,
  type LucideIcon,
} from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import { legalService } from "@/services/legal.service";
import type { LegalThirdPartyDocumentsReport } from "@/types/legal.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type PihakKetigaKategori = "NOTARIS" | "ASURANSI" | "KJPP";

type PihakKetigaSummaryItem = {
  kategori: PihakKetigaKategori;
  totalDokumen: number;
  prosesBerjalan: number;
  laporanSelesai: number;
  lewatExpired: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

const kategoriMeta: Record<
  PihakKetigaKategori,
  {
    icon: LucideIcon;
    label: string;
    accentColor: string;
  }
> = {
  NOTARIS: {
    icon: Scale,
    label: "Notaris",
    accentColor: "#157ec3",
  },
  ASURANSI: {
    icon: Shield,
    label: "Asuransi",
    accentColor: "#0f766e",
  },
  KJPP: {
    icon: Building2,
    label: "KJPP",
    accentColor: "#7c3aed",
  },
};

const kategoriOrder: PihakKetigaKategori[] = ["NOTARIS", "ASURANSI", "KJPP"];

function readGroupCount(record: Record<string, unknown>) {
  const count = record._count;

  if (typeof count === "number") return count;
  if (count && typeof count === "object" && "id" in count) {
    const value = (count as Record<string, unknown>).id;
    if (typeof value === "number") return value;
  }

  for (const key of ["total_records", "total", "count"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return 0;
}

function readStatus(record: Record<string, unknown>) {
  const status = record.status;
  return typeof status === "string" ? status.trim().toUpperCase() : "";
}

function isDoneStatus(status: string) {
  return [
    "SELESAI",
    "TERUPLOAD",
    "DISETUJUI",
    "DIBAYAR",
    "CAIR",
    "APPROVED",
    "DONE",
    "COMPLETED",
  ].includes(status);
}

function isExpiredStatus(status: string) {
  return ["EXPIRED", "LEWAT_TEMPO", "OVERDUE"].includes(status);
}

function createEmptySummary(kategori: PihakKetigaKategori): PihakKetigaSummaryItem {
  return {
    kategori,
    totalDokumen: 0,
    prosesBerjalan: 0,
    laporanSelesai: 0,
    lewatExpired: 0,
  };
}

function appendRows(
  summary: PihakKetigaSummaryItem,
  rows: Array<Record<string, unknown>>,
) {
  rows.forEach((row) => {
    const total = readGroupCount(row);
    const status = readStatus(row);

    summary.totalDokumen += total;
    if (isExpiredStatus(status)) {
      summary.lewatExpired += total;
      return;
    }

    if (isDoneStatus(status)) {
      summary.laporanSelesai += total;
      return;
    }

    summary.prosesBerjalan += total;
  });
}

function mapReportSummary(
  report: LegalThirdPartyDocumentsReport | null,
): PihakKetigaSummaryItem[] {
  const summaries = new Map<PihakKetigaKategori, PihakKetigaSummaryItem>(
    kategoriOrder.map((kategori) => [kategori, createEmptySummary(kategori)]),
  );

  appendRows(summaries.get("NOTARIS")!, report?.notary ?? []);
  appendRows(summaries.get("ASURANSI")!, [
    ...(report?.insurance ?? []),
    ...(report?.claims ?? []),
  ]);
  appendRows(summaries.get("KJPP")!, report?.kjpp ?? []);

  return kategoriOrder.map((kategori) => summaries.get(kategori)!);
}

export default function LaporanPihakKetigaSection({
  widget,
}: {
  widget?: DashboardMenuNode;
}) {
  const [report, setReport] = useState<LegalThirdPartyDocumentsReport | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detailUrl = widget?.url ?? "/dashboard/legal/laporan/pihak-ketiga/dokumen";

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await legalService.getThirdPartyDocumentsReport();
        if (!ignore) setReport(result);
      } catch (error) {
        if (!ignore) {
          setReport(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan pihak ketiga",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      ignore = true;
    };
  }, []);

  const documentSummary = useMemo(() => mapReportSummary(report), [report]);

  return (
    <section className="animate-fade-in">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Users2 className="h-6 w-6 text-gray-600" aria-hidden="true" />
          {widget?.name ?? "Laporan Pihak Ketiga - Dokumen"}
        </h2>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {documentSummary.map((item, index) => {
          const meta = kategoriMeta[item.kategori];
          const CategoryIcon = meta.icon;

          return (
            <ProtectedLink
              href={detailUrl}
              key={item.kategori}
              className="group animate-slide-up rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${index * 0.1}s` }}
              title={`Lihat laporan ${meta.label}`}
            >
              <div className="mb-6 flex items-start gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${meta.accentColor} 0%, ${meta.accentColor}cc 100%)`,
                      boxShadow: `0 16px 28px ${meta.accentColor}2b`,
                    }}
                  >
                    <CategoryIcon
                      className="h-7 w-7"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900">
                      {meta.label}
                    </p>
                  </div>
                </div>

                <div className="flex w-[7.375rem] shrink-0 flex-col items-end text-right">
                  <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
                    Total Dokumen
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-gray-800">
                    {isLoading ? "-" : formatNumber(item.totalDokumen)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Activity
                      className="h-4 w-4 text-gray-500"
                      aria-hidden="true"
                    />
                    Proses Berjalan
                  </span>
                  <span className="font-semibold text-gray-800">
                    {isLoading ? "-" : formatNumber(item.prosesBerjalan)}
                  </span>
                </div>
                <div className="my-3 h-px w-full bg-gray-200" />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2
                      className="h-4 w-4 text-slate-900"
                      aria-hidden="true"
                    />
                    Laporan Selesai
                  </span>
                  <span className="font-semibold text-gray-800">
                    {isLoading ? "-" : formatNumber(item.laporanSelesai)}
                  </span>
                </div>
                <div className="my-3 h-px w-full bg-gray-200" />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <AlertTriangle
                      className="h-4 w-4 text-gray-500"
                      aria-hidden="true"
                    />
                    Lewat Expired
                  </span>
                  <span className="font-semibold text-gray-800">
                    {isLoading ? "-" : formatNumber(item.lewatExpired)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between font-medium text-gray-900 transition-transform group-hover:translate-x-1">
                <span className="text-sm">Lihat Detail</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </div>
            </ProtectedLink>
          );
        })}
      </div>
    </section>
  );
}
