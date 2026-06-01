"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle,
  ChevronRight,
  Clock,
  FileSignature,
  HeartPulse,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import { legalService } from "@/services/legal.service";
import type { LegalDepositFundsReport } from "@/types/legal.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type JenisTitipan = "NOTARIS" | "ASURANSI" | "ANGSURAN";

type TitipanSummaryItem = {
  jenisTitipan: JenisTitipan;
  totalTitipan: number;
  saldoTerbayar: number;
  sisaSaldo: number;
  jumlahTitipan: number;
};

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

const jenisMeta: Record<
  JenisTitipan,
  {
    icon: LucideIcon;
    title: string;
    accentColor: string;
  }
> = {
  NOTARIS: {
    icon: FileSignature,
    title: "Titipan Notaris",
    accentColor: "#157ec3",
  },
  ASURANSI: {
    icon: HeartPulse,
    title: "Titipan Asuransi",
    accentColor: "#0f766e",
  },
  ANGSURAN: {
    icon: Banknote,
    title: "Titipan Angsuran",
    accentColor: "#d97706",
  },
};

const jenisOrder: JenisTitipan[] = ["NOTARIS", "ASURANSI", "ANGSURAN"];

function normalizeJenisTitipan(value: string): JenisTitipan | null {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "NOTARIS" ||
    normalized === "ASURANSI" ||
    normalized === "ANGSURAN"
  ) {
    return normalized;
  }

  return null;
}

function createEmptySummary(jenisTitipan: JenisTitipan): TitipanSummaryItem {
  return {
    jenisTitipan,
    totalTitipan: 0,
    saldoTerbayar: 0,
    sisaSaldo: 0,
    jumlahTitipan: 0,
  };
}

function mapDepositSummary(rows: LegalDepositFundsReport[]): TitipanSummaryItem[] {
  const summaries = new Map<JenisTitipan, TitipanSummaryItem>(
    jenisOrder.map((jenisTitipan) => [
      jenisTitipan,
      createEmptySummary(jenisTitipan),
    ]),
  );

  rows.forEach((row) => {
    const jenisTitipan = normalizeJenisTitipan(row.type);
    if (!jenisTitipan) return;

    const summary = summaries.get(jenisTitipan)!;
    summary.totalTitipan += row.nominal;
    summary.saldoTerbayar += row.paid_amount;
    summary.sisaSaldo += row.remaining_amount;
    summary.jumlahTitipan += row.total_records;
  });

  return jenisOrder.map((jenisTitipan) => summaries.get(jenisTitipan)!);
}

export default function LaporanTitipanSection({
  widget,
}: {
  widget?: DashboardMenuNode;
}) {
  const [rows, setRows] = useState<LegalDepositFundsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detailUrl =
    widget?.url ?? "/dashboard/legal/laporan/pihak-ketiga/dana-titipan";

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await legalService.getThirdPartyDepositFundsReport();
        if (!ignore) setRows(result);
      } catch (error) {
        if (!ignore) {
          setRows([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan dana titipan",
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

  const titipanSummary = useMemo(() => mapDepositSummary(rows), [rows]);

  return (
    <section className="animate-fade-in">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Wallet className="h-6 w-6 text-gray-600" aria-hidden="true" />
          {widget?.name ?? "Laporan Pihak Ketiga - Dana Titipan"}
        </h2>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {titipanSummary.map((item, index) => {
          const meta = jenisMeta[item.jenisTitipan];
          const SummaryIcon = meta.icon;

          return (
            <ProtectedLink
              href={detailUrl}
              key={item.jenisTitipan}
              className="group animate-slide-up rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${index * 0.1}s` }}
              title={`Lihat ${meta.title}`}
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
                    <SummaryIcon
                      className="h-7 w-7"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900">
                      {meta.title}
                    </p>
                  </div>
                </div>

                <div className="flex w-[7.375rem] shrink-0 flex-col items-end text-right">
                  <span className="mb-1 text-xs font-semibold uppercase leading-tight tracking-wider text-gray-400">
                    Jumlah Titipan
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-gray-800">
                    {isLoading ? "-" : formatNumber(item.jumlahTitipan)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Wallet
                      className="h-4 w-4 text-gray-500"
                      aria-hidden="true"
                    />
                    Total Titipan
                  </span>
                  <span className="font-semibold text-gray-800">
                    {isLoading ? "-" : formatRupiah(item.totalTitipan)}
                  </span>
                </div>
                <div className="my-3 h-px w-full bg-gray-200" />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <CheckCircle
                      className="h-4 w-4 text-slate-900"
                      aria-hidden="true"
                    />
                    Saldo Terbayar
                  </span>
                  <span className="font-semibold text-gray-800">
                    {isLoading ? "-" : formatRupiah(item.saldoTerbayar)}
                  </span>
                </div>
                <div className="my-3 h-px w-full bg-gray-200" />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <Clock
                      className="h-4 w-4 text-slate-900"
                      aria-hidden="true"
                    />
                    Sisa Saldo
                  </span>
                  <span className="font-semibold text-gray-800">
                    {isLoading
                      ? "-"
                      : item.sisaSaldo > 0
                        ? formatRupiah(item.sisaSaldo)
                        : "Lunas"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between font-medium text-gray-900 transition-transform group-hover:translate-x-1">
                <span className="text-sm">Lihat Nasabah</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </div>
            </ProtectedLink>
          );
        })}
      </div>
    </section>
  );
}
