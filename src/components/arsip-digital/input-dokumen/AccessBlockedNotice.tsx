"use client";

import { AlertCircle } from "lucide-react";

export default function AccessBlockedNotice() {
  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" aria-hidden="true" />
      <div>
        <p className="font-semibold">Akses input belum aktif</p>
        <p className="mt-1">
          Role Anda dapat membuka menu ini, tetapi belum memiliki izin membuat
          dokumen arsip digital.
        </p>
      </div>
    </div>
  );
}
