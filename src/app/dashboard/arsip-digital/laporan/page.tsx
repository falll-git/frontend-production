"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, BookOpen, FileText, MapPinned, ShieldCheck } from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  arsipService,
  type ArsipDigitalReportSummary,
} from "@/services/arsip.service";

const REPORT_LINKS = [
  {
    title: "List Dokumen",
    description: "Daftar dokumen digital yang dapat diakses akun saat ini.",
    href: "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
    icon: FileText,
  },
  {
    title: "Tempat Penyimpanan",
    description: "Ringkasan dokumen berdasarkan kantor, lemari, dan rak.",
    href: "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
    icon: MapPinned,
  },
  {
    title: "Laporan Peminjaman",
    description: "Status pinjam, penyerahan, estimasi, dan pengembalian fisik.",
    href: "/dashboard/arsip-digital/peminjaman/laporan",
    icon: BookOpen,
  },
];

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
        value: summary?.documents.total ?? 0,
        icon: FileText,
        tone: "text-[#157ec3] bg-sky-50 border-sky-100",
      },
      {
        label: "Dokumen Terbatas",
        value: summary?.documents.restricted ?? 0,
        icon: ShieldCheck,
        tone: "text-amber-700 bg-amber-50 border-amber-100",
      },
      {
        label: "Peminjaman Aktif",
        value:
          (summary?.loans.handed_over ?? 0) + (summary?.loans.borrowed ?? 0),
        icon: BookOpen,
        tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
      },
      {
        label: "Rak Terpakai",
        value: summary?.storage.used_racks ?? 0,
        icon: MapPinned,
        tone: "text-violet-700 bg-violet-50 border-violet-100",
      },
    ],
    [summary],
  );

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <FeatureHeader
        title="Laporan Arsip Digital"
        subtitle="Akses ringkasan laporan dokumen dan penyimpanan arsip digital."
        icon={<Archive />}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {isLoading ? "-" : item.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {REPORT_LINKS.map((item) => {
          const Icon = item.icon;

          return (
            <ProtectedLink
              key={item.href}
              href={item.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-[#157ec3]/30 hover:bg-sky-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#157ec3]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
            </ProtectedLink>
          );
        })}
      </div>
    </div>
  );
}
