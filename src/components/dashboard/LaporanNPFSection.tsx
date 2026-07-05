"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  XCircle,
} from "lucide-react";

import DonutNPFChart from "@/components/charts/DonutNPFChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KolektibilitasTable from "@/components/dashboard/KolektibilitasTable";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import SetupSelect from "@/components/ui/SetupSelect";
import { COLLECTIBILITY_CHART_COLORS } from "@/components/ui/SetupCollectibilityBadge";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import type {
  KolektibilitasItem,
  KolektibilitasNasabahItem,
  NpfKolektibilitasLevel,
  RiwayatNPF,
} from "@/lib/types";
import { debiturService } from "@/services/debitur.service";
import type { DebtorNpfReport } from "@/types/debitur.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatRatio(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getRatioTone(value: number) {
  if (value < 5) {
    return "text-emerald-600";
  }

  if (value <= 10) {
    return "text-amber-600";
  }

  return "text-red-600";
}

type RiwayatRange = 6 | 12;

const riwayatRangeOptions: Array<{ value: RiwayatRange; label: string }> = [
  { value: 6, label: "6 bulan terakhir" },
  { value: 12, label: "12 bulan terakhir" },
];

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function normalizeKolLevel(value: number | null | undefined): NpfKolektibilitasLevel | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }

  return null;
}

function mapKolektibilitas(report: DebtorNpfReport | null): KolektibilitasItem[] {
  const rowsByLevel = new Map<NpfKolektibilitasLevel, KolektibilitasItem>();

  report?.breakdown_per_kol.forEach((item) => {
    const level = normalizeKolLevel(item.level);
    if (!level) return;

    rowsByLevel.set(level, {
      kol: level,
      label: `Kol ${level} / ${item.name}`,
      jumlahNasabah: item.contract_count,
      outstandingPokok: item.outstanding,
    });
  });

  return ([1, 2, 3, 4, 5] as NpfKolektibilitasLevel[]).map(
    (level) =>
      rowsByLevel.get(level) ?? {
        kol: level,
        label: `Kol ${level}`,
        jumlahNasabah: 0,
        outstandingPokok: 0,
      },
  );
}

function mapRiwayat(report: DebtorNpfReport | null): RiwayatNPF[] {
  return (report?.trend ?? [])
    .map((item) => {
      const [yearText, monthText] = item.period_month.split("-");
      const tahun = Number(yearText);
      const bulan = Number(monthText);
      if (!Number.isFinite(tahun) || !Number.isFinite(bulan)) return null;

      return {
        tahun,
        bulan,
        namaBulan: monthNames[bulan - 1] ?? item.period_month,
        jumlahNasabah: 0,
        outstandingPokok: item.numerator,
        rasioNPF: item.percentage,
      };
    })
    .filter((item): item is RiwayatNPF => item !== null);
}

export default function LaporanNPFSection({
  widget,
  showTitle = true,
}: {
  widget?: DashboardMenuNode;
  showTitle?: boolean;
}) {
  const [riwayatRange, setRiwayatRange] = useState<RiwayatRange>(6);
  const [report, setReport] = useState<DebtorNpfReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedKol, setSelectedKol] =
    useState<NpfKolektibilitasLevel | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await debiturService.getNpfReport();
        if (!ignore) setReport(result);
      } catch (error) {
        if (!ignore) {
          setReport(null);
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat laporan NPF",
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

  const kolektibilitasData = useMemo(() => mapKolektibilitas(report), [report]);
  const nasabahKolektibilitasData = useMemo<KolektibilitasNasabahItem[]>(
    () =>
      (report?.details ?? [])
        .map((item) => {
          const level = normalizeKolLevel(item.level);
          if (!level) return null;

          return {
            nama: item.debtor_name,
            noKontrak: item.contract_number,
            outstandingPokok: item.outstanding,
            sisaBulan: item.remaining_months,
            kolektibilitas: level,
          };
        })
        .filter((item): item is KolektibilitasNasabahItem => item !== null),
    [report],
  );
  const riwayatNPFData = useMemo(() => mapRiwayat(report), [report]);
  const totalOutstandingBermasalah = report?.numerator ?? 0;
  const totalNasabahBermasalah = (report?.breakdown_per_kol ?? [])
    .filter((item) => item.is_npf)
    .reduce((total, item) => total + item.contract_count, 0);
  const currentRatio = report?.percentage ?? 0;
  const hasNpfData =
    kolektibilitasData.some(
      (item) => item.jumlahNasabah > 0 || item.outstandingPokok > 0,
    ) || riwayatNPFData.length > 0;
  const hasChartData = kolektibilitasData.some(
    (item) => item.outstandingPokok > 0,
  );
  const visibleRiwayat = [...riwayatNPFData]
    .sort((left, right) => {
      if (left.tahun !== right.tahun) {
        return right.tahun - left.tahun;
      }

      return right.bulan - left.bulan;
    })
    .slice(0, riwayatRange);
  const selectedRiwayatLabel =
    riwayatRangeOptions.find((option) => option.value === riwayatRange)
      ?.label ?? riwayatRangeOptions[0].label;

  const status =
    isLoading
      ? {
          icon: AlertTriangle,
          label: "Memuat",
          tone: "gray" as SetupStatusTone,
          text: "Memuat data NPF",
        }
      : errorMessage
        ? {
            icon: XCircle,
            label: "Gagal",
            tone: "red" as SetupStatusTone,
            text: errorMessage,
          }
        : !hasNpfData
      ? {
          icon: AlertTriangle,
          label: "Belum Diterapkan",
          tone: "gray" as SetupStatusTone,
          text: "Belum ada data NPF",
        }
        : currentRatio < 5
          ? {
              icon: CheckCircle,
              label: "Aman",
              tone: "emerald" as SetupStatusTone,
              text: "NPF dalam batas aman",
            }
          : currentRatio <= 10
            ? {
                icon: AlertTriangle,
                label: "Perhatian",
                tone: "amber" as SetupStatusTone,
                text: "NPF mendekati batas perhatian",
              }
            : {
                icon: XCircle,
                label: "Melewati Batas",
                tone: "red" as SetupStatusTone,
                text: "NPF melewati batas maksimum",
              };

  return (
    <section className="animate-fade-in">
      {showTitle ? (
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <TrendingDown className="h-6 w-6 text-gray-600" aria-hidden="true" />
            {widget?.name ?? "Laporan NPF"}
          </h2>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Kolektibilitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {hasChartData ? (
              <>
                <DonutNPFChart
                  data={kolektibilitasData.map((item) => {
                    const kol = item.kol as NpfKolektibilitasLevel;

                    return {
                      ...item,
                      color: COLLECTIBILITY_CHART_COLORS[kol] ?? "#64748b",
                    };
                  })}
                  ratio={currentRatio}
                  onSegmentClick={(kol) =>
                    setSelectedKol(kol as NpfKolektibilitasLevel)
                  }
                />
                <KolektibilitasTable
                  rows={kolektibilitasData}
                  nasabah={nasabahKolektibilitasData}
                  selectedKol={selectedKol}
                  onSelectedKolChange={setSelectedKol}
                />
              </>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  {isLoading
                    ? "Memuat distribusi kolektibilitas..."
                    : errorMessage
                      ? "Data NPF belum dapat dimuat"
                      : "Belum ada distribusi kolektibilitas"}
                </p>
                <p className="mt-1 max-w-md text-sm text-gray-500">
                  Donut NPF akan tampil otomatis setelah data outstanding dan
                  kolektibilitas tersedia dari import pembiayaan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-sm shadow-blue-500/10">
                  <TrendingDown
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex min-h-11 items-center">
                  <CardTitle>Ringkasan NPF</CardTitle>
                </div>
              </div>

              <div className="w-full sm:w-[13.125rem]">
                <SetupSelect
                  value={riwayatRange}
                  onChange={(event) =>
                    setRiwayatRange(Number(event.target.value) as RiwayatRange)
                  }
                  className="border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
                  aria-label="Pilih periode riwayat NPF"
                >
                  {riwayatRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SetupSelect>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <SetupStatusBadge
                status={status.label}
                label={status.text}
                tone={status.tone}
                icon={status.icon}
                wrap
                className="justify-start"
              />
            </div>

            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-500">
                  Total Nasabah Bermasalah (Kol 3-5)
                </span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(totalNasabahBermasalah)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-500">
                  Total Outstanding Bermasalah
                </span>
                <span className="font-semibold text-gray-900">
                  {formatRupiah(totalOutstandingBermasalah)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-500">Rasio NPF saat ini</span>
                <span
                  className={`font-semibold ${
                    hasNpfData ? getRatioTone(currentRatio) : "text-gray-500"
                  }`}
                >
                  {formatRatio(currentRatio)}%
                </span>
              </div>
            </div>

            <div className="h-px w-full bg-gray-200" />

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-900">
                  Riwayat NPF - {selectedRiwayatLabel}
                </h3>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div
                  className={
                    riwayatRange === 12 ? "max-h-[22.5rem] overflow-y-auto" : undefined
                  }
                >
                  <SetupDataTable variant="report" density="compact" className="text-sm">
                    <SetupDataTableHead className="bg-gray-50">
                      <SetupDataTableRow>
                        <SetupDataTableHeaderCell className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Bulan Tahun
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Rasio NPF
                        </SetupDataTableHeaderCell>
                      </SetupDataTableRow>
                    </SetupDataTableHead>
                    <SetupDataTableBody className="divide-y divide-gray-100">
                      {visibleRiwayat.length > 0 ? (
                        visibleRiwayat.map((item) => (
                        <SetupDataTableRow
                          key={`${item.tahun}-${item.bulan}`}
                          className="transition-colors hover:bg-gray-50"
                        >
                          <SetupDataTableCell className="px-4 py-3 text-gray-700">
                            {item.namaBulan} {item.tahun}
                          </SetupDataTableCell>
                          <SetupDataTableCell
                            className={`px-4 py-3 text-right font-semibold ${getRatioTone(item.rasioNPF)}`}
                          >
                            {formatRatio(item.rasioNPF)}%
                          </SetupDataTableCell>
                        </SetupDataTableRow>
                        ))
                      ) : (
                        <SetupDataTableEmptyRow
                          colSpan={2}
                          tone="debitur"
                          description="Riwayat rasio NPF akan tampil setelah periode berikutnya tersedia."
                        >
                          Belum ada riwayat NPF.
                        </SetupDataTableEmptyRow>
                      )}
                    </SetupDataTableBody>
                  </SetupDataTable>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
