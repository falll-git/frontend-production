"use client";

import { useEffect, useState } from "react";
import { BarChart3, FileSpreadsheet, FileText, Scale, Shield, TrendingUp, Upload, Wallet } from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { legalService, type LegalSummaryReport } from "@/services/legal.service";

function StatCard({ label, value, icon, colorClass }: { label: string; value: number | string; icon: React.ReactNode; colorClass: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
    </div>
  );
}

export default function LegalPage() {
  const { showToast } = useAppToast();
  const [report, setReport] = useState<LegalSummaryReport>({});
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadSummary() {
      try {
        setIsFetching(true);
        const data = await legalService.getSummaryReport();
        if (!ignore) setReport(data);
      } catch {
        if (!ignore) showToast("Gagal memuat ringkasan legal", "error");
      } finally {
        if (!ignore) setIsFetching(false);
      }
    }
    void loadSummary();
    return () => { ignore = true; };
  }, [showToast]);

  const v = (key: keyof LegalSummaryReport) => isFetching ? "..." : (report[key] ?? 0);

  const stats = [
    { label: "Template Dokumen", value: v("templates"), icon: <FileText className="w-6 h-6 text-indigo-600" />, colorClass: "bg-indigo-50" },
    { label: "Upload IDEB", value: v("ideb"), icon: <Upload className="w-6 h-6 text-violet-600" />, colorClass: "bg-violet-50" },
    { label: "Progress Notaris", value: v("notary"), icon: <TrendingUp className="w-6 h-6 text-emerald-600" />, colorClass: "bg-emerald-50" },
    { label: "Progress Asuransi", value: v("insurance"), icon: <Shield className="w-6 h-6 text-amber-600" />, colorClass: "bg-amber-50" },
    { label: "Klaim Asuransi", value: v("claims"), icon: <BarChart3 className="w-6 h-6 text-rose-600" />, colorClass: "bg-rose-50" },
    { label: "Dana Titipan", value: v("deposits"), icon: <Wallet className="w-6 h-6 text-teal-600" />, colorClass: "bg-teal-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Manajemen Legal" subtitle="Ringkasan dan navigasi modul legal." icon={<Scale />} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} colorClass={stat.colorClass} />
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Laporan</h2>
        <div className="space-y-3">
          <a href="/dashboard/legal/laporan/pihak-ketiga/dokumen" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Laporan Dokumen Pihak Ketiga</p>
              <p className="text-xs text-gray-500">Notaris, asuransi, dan klaim</p>
            </div>
          </a>
          <a href="/dashboard/legal/laporan/pihak-ketiga/dana-titipan" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">Laporan Dana Titipan Pihak Ketiga</p>
              <p className="text-xs text-gray-500">Rekap dana titipan per tipe dan status</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
