import { Printer } from "lucide-react";

import CetakDokumenClient from "@/components/manajemen-surat/CetakDokumenClient";
import FeatureHeader from "@/components/ui/FeatureHeader";

export const metadata = {
  title: "Cetak Dokumen Persuratan",
};

export default function CetakDokumenPage() {
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Cetak Dokumen"
        subtitle="Pilih jenis dokumen persuratan, cek detail, lalu preview atau cetak dokumennya."
        icon={<Printer />}
      />

      <CetakDokumenClient />
    </div>
  );
}
