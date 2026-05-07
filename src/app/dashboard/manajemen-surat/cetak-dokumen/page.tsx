import Link from "next/link";
import { Printer } from "lucide-react";

import CetakDokumenClient from "@/components/manajemen-surat/CetakDokumenClient";
import FeatureHeader from "@/components/ui/FeatureHeader";

export const metadata = {
  title: "Cetak Dokumen Persuratan",
};

export default function CetakDokumenPage() {
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard" className="btn btn-outline btn-sm">
          Kembali ke Dashboard
        </Link>
      </div>

      <FeatureHeader
        title="Cetak Dokumen"
        subtitle="Pilih jenis dokumen persuratan, cek detail, lalu preview atau cetak dokumennya."
        icon={<Printer />}
      />

      <CetakDokumenClient />
    </div>
  );
}
