import { Mail } from "lucide-react";

import LaporanPersuratanClient from "@/components/manajemen-surat/LaporanPersuratanClient";
import FeatureHeader from "@/components/ui/FeatureHeader";

export const metadata = {
  title: "Laporan Persuratan",
};

export default function LaporanPersuratanPage() {
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Laporan Persuratan"
        subtitle="Rekap surat masuk, surat keluar, dan memorandum internal."
        icon={<Mail />}
      />

      <LaporanPersuratanClient />
    </div>
  );
}
