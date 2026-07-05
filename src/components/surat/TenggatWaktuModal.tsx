"use client";

import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import SetupTextarea from "@/components/ui/SetupTextarea";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_PRIMARY_BUTTON_CLASS,
} from "@/components/ui/setupPageStyles";

export type TenggatWaktuPayload = {
  tenggatWaktu?: string;
  keteranganTenggat?: string;
};

type TenggatWaktuModalProps = {
  isOpen: boolean;
  onSave: (payload: TenggatWaktuPayload) => void;
  onSkip: () => void;
  disposisi?: string[];
  title?: string;
  subtitle?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  showNoteField?: boolean;
};

export default function TenggatWaktuModal({
  isOpen,
  onSave,
  onSkip,
  disposisi = [],
  title = "Tenggat Waktu",
  subtitle = "Tenggat bersifat opsional dan dapat dilewati.",
  noteLabel = "Catatan tindak lanjut",
  notePlaceholder = "Tambahkan instruksi, catatan tindak lanjut, atau alasan tenggat...",
  showNoteField = true,
}: TenggatWaktuModalProps) {
  const [tenggatWaktu, setTenggatWaktu] = useState("");
  const [keteranganTenggat, setKeteranganTenggat] = useState("");

  const resetFields = () => {
    setTenggatWaktu("");
    setKeteranganTenggat("");
  };

  const handleSkip = () => {
    resetFields();
    onSkip();
  };

  const handleSave = () => {
    const trimmedNote = keteranganTenggat.trim();

    onSave({
      tenggatWaktu: tenggatWaktu || undefined,
      keteranganTenggat: trimmedNote || undefined,
    });
    resetFields();
  };

  return (
    <DashboardModal
      isOpen={isOpen}
      title={title}
      description={subtitle}
      onClose={handleSkip}
      maxWidth="3xl"
      bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
      footerClassName="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row sm:justify-end"
      footer={
        <>
          <button
            type="button"
            onClick={handleSkip}
            className={SETUP_PAGE_BACK_BUTTON_CLASS}
          >
            Simpan tanpa tenggat
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={SETUP_PAGE_PRIMARY_BUTTON_CLASS}
          >
            Simpan dengan tenggat
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Konfirmasi Disposisi Awal
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Simpan dokumen sekarang, lalu tentukan apakah alur awal perlu
              batas waktu tindak lanjut.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sky-600">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Tujuan Awal
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Disposisi pertama dikirim ke penerima aktif pada divisi yang
                    dipilih.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Divisi Tujuan
                </p>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
                  {disposisi.length > 0 ? disposisi.join(", ") : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Masa Tindak Lanjut
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Kosongkan jika tidak membutuhkan tenggat.
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tenggat Tindak Lanjut
              </label>
              <BasicDateInput
                value={tenggatWaktu}
                onChange={setTenggatWaktu}
                placeholder="Pilih tanggal tenggat..."
              />
            </div>
          </div>
        </section>

        {showNoteField ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {noteLabel}
            </label>
            <SetupTextarea
              rows={4}
              className="resize-none"
              placeholder={notePlaceholder}
              value={keteranganTenggat}
              onChange={(event) => setKeteranganTenggat(event.target.value)}
            />
          </section>
        ) : null}
      </div>
    </DashboardModal>
  );
}
