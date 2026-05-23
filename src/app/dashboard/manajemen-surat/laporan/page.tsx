import DashboardPageShell from "@/components/dashboard/DashboardPageShell";

import { Mail } from "lucide-react";

import LaporanPersuratanClient from "@/components/manajemen-surat/LaporanPersuratanClient";
import FeatureHeader from "@/components/ui/FeatureHeader";

export const metadata = {
  title: "Laporan Persuratan",
};

export default function LaporanPersuratanPage() {
  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Laporan Persuratan"
        subtitle="Rekap surat masuk, surat keluar, dan memorandum internal."
        icon={<Mail />}
      />

      <LaporanPersuratanClient />
    </DashboardPageShell>
  );
}
