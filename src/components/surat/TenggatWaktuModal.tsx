"use client";

import { useState } from "react";
import BasicDateInput from "@/components/ui/BasicDateInput";
import SetupTextarea from "@/components/ui/SetupTextarea";

type TenggatWaktuPayload = {
  tenggatWaktu?: string;
  keteranganTenggat?: string;
};

type TenggatWaktuModalProps = {
  isOpen: boolean;
  onSave: (payload: TenggatWaktuPayload) => void;
  onSkip: () => void;
  disposisi: string[];
  title?: string;
  subtitle?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  showNoteField?: boolean;
};

type TenggatWaktuModalContentProps = Omit<TenggatWaktuModalProps, "isOpen">;

function TenggatWaktuModalContent({
  onSave,
  onSkip,
  title = "Tenggat Waktu & Keterangan",
  subtitle = "Opsional - dapat dilewati",
  noteLabel = "Keterangan",
  notePlaceholder = "Tambahkan keterangan atau catatan tindak lanjut...",
  showNoteField = true,
}: TenggatWaktuModalContentProps) {
  const [tenggatWaktu, setTenggatWaktu] = useState("");
  const [keteranganTenggat, setKeteranganTenggat] = useState("");

  const handleSave = () => {
    const trimmedKeterangan = keteranganTenggat.trim();

    onSave({
      tenggatWaktu: tenggatWaktu || undefined,
      keteranganTenggat: trimmedKeterangan || undefined,
    });
  };

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-60 flex items-center justify-center animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onSkip}
        aria-hidden="true"
      />
      <div
        className="relative mx-4 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-100 bg-gray-50/70 px-7 py-5">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">
            {subtitle}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
          className="space-y-4 p-7"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Tenggat Waktu
            </label>
            <BasicDateInput
              value={tenggatWaktu}
              onChange={setTenggatWaktu}
              placeholder="Pilih tanggal..."
            />
            <p className="mt-2 text-xs text-gray-600">
              Notifikasi WhatsApp akan dikirim ke penerima
            </p>
          </div>

          {showNoteField ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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

          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onSkip}
              className="uiverse-modal-button uiverse-modal-button--neutral h-11 px-4"
            >
              Lewati
            </button>
            <button
              type="submit"
              className="uiverse-modal-button uiverse-modal-button--primary h-11 px-4"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TenggatWaktuModal({
  isOpen,
  onSave,
  onSkip,
  disposisi,
  title,
  subtitle,
  noteLabel,
  notePlaceholder,
  showNoteField,
}: TenggatWaktuModalProps) {
  if (!isOpen) return null;

  return (
    <TenggatWaktuModalContent
      onSave={onSave}
      onSkip={onSkip}
      disposisi={disposisi}
      title={title}
      subtitle={subtitle}
      noteLabel={noteLabel}
      notePlaceholder={notePlaceholder}
      showNoteField={showNoteField}
    />
  );
}
