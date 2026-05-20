"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Send } from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import BasicDateInput from "@/components/ui/BasicDateInput";
import FileUploadField from "@/components/ui/FileUploadField";
import PhysicalStorageSelect from "@/components/manajemen-surat/PhysicalStorageSelect";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_PRIMARY_BUTTON_CLASS,
} from "@/components/ui/setupPageStyles";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { validatePersuratanFile } from "@/lib/utils/file";
import { letterPriorityService } from "@/services/letter-priority.service";
import { toApiDateTime } from "@/services/api.utils";
import { storageService } from "@/services/storage.service";
import { suratKeluarService } from "@/services/surat-keluar.service";
import type { Storage } from "@/types/master.types";

const SURAT_KELUAR_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-surat-keluar";

type SuratKeluarFormState = {
  namaPenerima: string;
  alamatPenerima: string;
  namaSurat: string;
  tanggalPengiriman: string;
  mediaPengiriman: string;
  sifatSurat: string;
  storageId: string;
};

const INITIAL_FORM_STATE: SuratKeluarFormState = {
  namaPenerima: "",
  alamatPenerima: "",
  namaSurat: "",
  tanggalPengiriman: "",
  mediaPengiriman: "",
  sifatSurat: "",
  storageId: "",
};

function normalizeMediaValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "langsung / tangan") return "langsung";
  return normalized;
}

export default function InputSuratKeluarPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability, status } = useProtectedAction();
  const canCreateSuratKeluar = hasCapability(SURAT_KELUAR_MENU_URL, "create");
  const showCreateBlockedNotice =
    status === "authenticated" && !canCreateSuratKeluar;
  const [formData, setFormData] =
    useState<SuratKeluarFormState>(INITIAL_FORM_STATE);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [letterPriorities, setLetterPriorities] = useState<
    { id: string; name: string }[]
  >([]);
  const [storageOptions, setStorageOptions] = useState<Storage[]>([]);
  const [isMasterLoading, setIsMasterLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadMasterData() {
      setIsMasterLoading(true);

      try {
        const [priorities, storages] = await Promise.all([
          letterPriorityService.getAll(),
          storageService.getAll(),
        ]);
        if (!ignore) {
          setLetterPriorities(
            priorities.map((item) => ({ id: item.id, name: item.name })),
          );
          setStorageOptions(
            storages
              .filter((item) => item.status === "Aktif")
              .sort((left, right) =>
                `${left.kodeKantor}${left.kodeLemari}${left.rak}`.localeCompare(
                  `${right.kodeKantor}${right.kodeLemari}${right.rak}`,
                ),
              ),
          );
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat prioritas surat",
            "error",
          );
        }
      } finally {
        if (!ignore) {
          setIsMasterLoading(false);
        }
      }
    }

    void loadMasterData();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCreateSuratKeluar) return;

    if (e.target.files && e.target.files[0]) {
      const nextFile = e.target.files[0];
      const validationMessage = validatePersuratanFile(nextFile);

      if (validationMessage) {
        e.target.value = "";
        setFile(null);
        showToast(validationMessage, "error");
        return;
      }

      setFile(nextFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (!canCreateSuratKeluar) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const nextFile = e.dataTransfer.files[0];
      const validationMessage = validatePersuratanFile(nextFile);

      if (validationMessage) {
        setFile(null);
        showToast(validationMessage, "error");
        return;
      }

      setFile(nextFile);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_STATE);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ensureCapability(SURAT_KELUAR_MENU_URL, "create")) return;

    if (!formData.tanggalPengiriman) {
      showToast("Tanggal pengiriman wajib diisi!", "error");
      return;
    }

    if (!formData.sifatSurat) {
      showToast("Sifat surat wajib dipilih!", "error");
      return;
    }

    if (!formData.storageId) {
      showToast("Tempat penyimpanan fisik wajib dipilih.", "error");
      return;
    }

    if (!file) {
      showToast("File arsip wajib diupload!", "error");
      return;
    }

    const fileValidationMessage = validatePersuratanFile(file);
    if (fileValidationMessage) {
      showToast(fileValidationMessage, "error");
      return;
    }

    setIsLoading(true);

    try {
      await suratKeluarService.create({
        letter_prioritie_id: formData.sifatSurat,
        storage_id: formData.storageId,
        delivery_media: normalizeMediaValue(formData.mediaPengiriman),
        send_date: toApiDateTime(formData.tanggalPengiriman),
        mail_number: formData.namaSurat.trim(),
        name: formData.namaPenerima.trim(),
        file: file ?? undefined,
        address: formData.alamatPenerima.trim(),
      });

      showToast("Surat keluar berhasil disimpan!", "success");
      handleReset();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan surat keluar",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <FeatureHeader
        title="Input Surat Keluar"
        subtitle="Catat dan arsipkan surat keluar yang dikirim."
        icon={<Send />}
      />

      {showCreateBlockedNotice && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" />
          <div>
            <p className="font-semibold">Akses input belum aktif</p>
            <p className="mt-1">
              Role Anda dapat membuka menu ini, tetapi belum memiliki izin
              membuat surat keluar.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label
                  htmlFor="namaPenerima"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nama Penerima <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  id="namaPenerima"
                  name="namaPenerima"
                  value={formData.namaPenerima}
                  onChange={handleChange}
                  placeholder="Masukkan nama penerima"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="tanggalPengiriman"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tanggal Pengiriman <span className="text-red-500">*</span>
                </label>
                <BasicDateInput
                  id="tanggalPengiriman"
                  value={formData.tanggalPengiriman}
                  onChange={(nextValue) =>
                    setFormData((prev) => ({
                      ...prev,
                      tanggalPengiriman: nextValue,
                    }))
                  }
                />
                <p className="mt-2 text-xs text-slate-500">
                  Isi sesuai tanggal surat dikirim.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="alamatPenerima"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Alamat Penerima <span className="text-red-500">*</span>
              </label>
              <SetupTextarea
                id="alamatPenerima"
                name="alamatPenerima"
                value={formData.alamatPenerima}
                onChange={handleChange}
                rows={2}
                className="resize-none"
                placeholder="Alamat lengkap penerima..."
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label
                  htmlFor="namaSurat"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nama/Nomor Surat <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  id="namaSurat"
                  name="namaSurat"
                  value={formData.namaSurat}
                  onChange={handleChange}
                  placeholder="Masukkan nomor surat"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="mediaPengiriman"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Media Pengiriman <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  id="mediaPengiriman"
                  name="mediaPengiriman"
                  value={formData.mediaPengiriman}
                  onChange={handleChange}
                  required
                >
                  <option value="">Pilih Media</option>
                  <option value="email">Email</option>
                  <option value="kurir">Kurir</option>
                  <option value="langsung">Langsung / Tangan</option>
                  <option value="pos">Pos</option>
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Pilih cara surat ini dikirim.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label
                  htmlFor="sifatSurat"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sifat Surat <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  id="sifatSurat"
                  name="sifatSurat"
                  value={formData.sifatSurat}
                  onChange={handleChange}
                  disabled={isMasterLoading}
                  required
                >
                  <option value="">
                    {isMasterLoading
                      ? "Memuat Sifat Surat..."
                      : "Pilih Sifat Surat"}
                  </option>
                  {letterPriorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Pilih sifat surat yang sesuai.
                </p>
              </div>

              <PhysicalStorageSelect
                id="storageId"
                name="storageId"
                value={formData.storageId}
                storages={storageOptions}
                isLoading={isMasterLoading}
                disabled={isLoading || !canCreateSuratKeluar}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <FileUploadField
            id="surat-keluar-file-input"
            file={file}
            inputRef={fileInputRef}
            disabled={!canCreateSuratKeluar || isLoading}
            isDragActive={dragOver}
            title={file ? "Ganti file surat keluar" : "Pilih file surat keluar"}
            helperText="Upload file surat keluar sebelum simpan."
            onChange={handleFileChange}
            onClear={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              if (!canCreateSuratKeluar || isLoading) return;
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          />

          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              className={SETUP_PAGE_BACK_BUTTON_CLASS}
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={
                !canCreateSuratKeluar ||
                isLoading ||
                isMasterLoading ||
                letterPriorities.length === 0 ||
                storageOptions.length === 0 ||
                !formData.storageId
              }
              className={SETUP_PAGE_PRIMARY_BUTTON_CLASS}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Simpan Surat Keluar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
