"use client";

import { ServerCog } from "lucide-react";
import SetupTextInput from "@/components/ui/SetupTextInput";

export default function SystemGeneratedCodeField() {
  return (
    <div>
      <label
        htmlFor="kodeDokumen"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Kode Dokumen
      </label>
      <div className="relative">
        <SetupTextInput
          id="kodeDokumen"
          value="Dibuat otomatis setelah dokumen disimpan"
          className="pr-28 text-gray-500"
          readOnly
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-900">
            <ServerCog
              className="-ms-1 me-1.5 size-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <span className="whitespace-nowrap">Sistem</span>
          </span>
        </div>
      </div>
    </div>
  );
}
