import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import LaporanPersuratanClient from "@/components/manajemen-surat/LaporanPersuratanClient";
import FeatureHeader from "@/components/ui/FeatureHeader";

export const metadata = {
  title: "Laporan Persuratan",
};

export default function LaporanPersuratanPage() {
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard" className="btn btn-outline btn-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
      </div>

      <FeatureHeader
        title="Laporan Persuratan"
        subtitle="Rekap surat masuk, surat keluar, dan memorandum internal."
        icon={<Mail />}
      />

      <LaporanPersuratanClient />
    </div>
  );
}
