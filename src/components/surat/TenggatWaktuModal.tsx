"use client";

import { useState } from "react";
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
  targetKirimAt?: string;
  responseDueDate?: string;
};

type TenggatWaktuMode = "disposition" | "outgoing";

type TenggatWaktuModalProps = {
  isOpen: boolean;
  onSave: (payload: TenggatWaktuPayload) => void;
  onSkip: () => void;
  disposisi?: string[];
  mode?: TenggatWaktuMode;
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
  mode = "disposition",
  title = "Tenggat Waktu",
  subtitle = "Tenggat bersifat opsional dan dapat dilewati.",
  noteLabel = "Catatan tindak lanjut",
  notePlaceholder = "Tambahkan instruksi, catatan tindak lanjut, atau alasan tenggat...",
  showNoteField = true,
}: TenggatWaktuModalProps) {
  const [tenggatWaktu, setTenggatWaktu] = useState("");
  const [targetKirimAt, setTargetKirimAt] = useState("");
  const [responseDueDate, setResponseDueDate] = useState("");
  const [keteranganTenggat, setKeteranganTenggat] = useState("");
  const isOutgoing = mode === "outgoing";

  const handleSave = () => {
    const trimmedNote = keteranganTenggat.trim();

    onSave({
      tenggatWaktu: tenggatWaktu || undefined,
      targetKirimAt: targetKirimAt || undefined,
      responseDueDate: responseDueDate || undefined,
      keteranganTenggat: trimmedNote || undefined,
    });
  };

  return (
    <DashboardModal
      isOpen={isOpen}
      title={title}
      description={subtitle}
      onClose={onSkip}
      maxWidth="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onSkip}
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
      <div className="space-y-5">
        {disposisi.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tujuan awal
            </p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              {disposisi.join(", ")}
            </p>
          </div>
        ) : null}

        {isOutgoing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Target Pengiriman
              </label>
              <BasicDateInput
                value={targetKirimAt}
                onChange={setTargetKirimAt}
                placeholder="Pilih tanggal target..."
              />
              <p className="mt-2 text-xs text-slate-500">
                Gunakan jika tanggal target berbeda dari tanggal pengiriman.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Batas Follow-up Balasan
              </label>
              <BasicDateInput
                value={responseDueDate}
                onChange={setResponseDueDate}
                placeholder="Pilih tanggal follow-up..."
              />
              <p className="mt-2 text-xs text-slate-500">
                Gunakan jika surat keluar perlu dipantau sampai ada balasan.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tenggat Tindak Lanjut
            </label>
            <BasicDateInput
              value={tenggatWaktu}
              onChange={setTenggatWaktu}
              placeholder="Pilih tanggal tenggat..."
            />
            <p className="mt-2 text-xs text-slate-500">
              Kosongkan jika surat atau memorandum ini tidak membutuhkan batas waktu.
            </p>
          </div>
        )}

        {showNoteField ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {noteLabel}
            </label>
            <SetupTextarea
              rows={3}
              className="resize-none"
              placeholder={notePlaceholder}
              value={keteranganTenggat}
              onChange={(event) => setKeteranganTenggat(event.target.value)}
            />
          </div>
        ) : null}
      </div>
    </DashboardModal>
  );
}
