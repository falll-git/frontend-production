"use client";

import { Construction } from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";

export default function ModuleSkeletonPage({
  title,
  subtitle = "Halaman ini mengikuti struktur menu backend dan belum diaktifkan pada versi saat ini.",
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <FeatureHeader
        title={title}
        subtitle={subtitle}
        icon={<Construction />}
      />

      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Fitur Belum Diaktifkan
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Menu sudah tersedia agar akses dapat diatur dari RBAC backend.
          Konten modul akan ditampilkan setelah fiturnya siap digunakan.
        </p>
      </div>
    </div>
  );
}
