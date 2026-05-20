"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Inbox, Send } from "lucide-react";
import FeatureHeader from "@/components/ui/FeatureHeader";
import BasicDateInput from "@/components/ui/BasicDateInput";
import FileUploadField from "@/components/ui/FileUploadField";
import PhysicalStorageSelect from "@/components/manajemen-surat/PhysicalStorageSelect";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_PRIMARY_BUTTON_CLASS,
} from "@/components/ui/setupPageStyles";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { validatePersuratanFile } from "@/lib/utils/file";
import { toApiDateTime } from "@/services/api.utils";
import { divisionService } from "@/services/division.service";
import { letterPriorityService } from "@/services/letter-priority.service";
import { storageService } from "@/services/storage.service";
import { suratMasukService } from "@/services/surat-masuk.service";
import type { Storage } from "@/types/master.types";

const SURAT_MASUK_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-surat-masuk";

type DivisionOption = {
  id: string;
  name: string;
};

export default function InputSuratMasukPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability, status } = useProtectedAction();
  const canCreateSuratMasuk = hasCapability(SURAT_MASUK_MENU_URL, "create");
  const showCreateBlockedNotice =
    status === "authenticated" && !canCreateSuratMasuk;
  const [formData, setFormData] = useState({
    namaPengirim: "",
    alamatPengirim: "",
    namaSurat: "",
    perihalSurat: "",
    keteranganSurat: "",
    tanggalPenerimaan: "",
    sifatSurat: "",
    storageId: "",
    divisionIds: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [divisionOptions, setDivisionOptions] = useState<DivisionOption[]>([]);
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
        const [priorities, divisions, storages] = await Promise.all([
          letterPriorityService.getAll(),
          divisionService.getAll(),
          storageService.getAll(),
        ]);

        if (ignore) return;

        setLetterPriorities(
          priorities.map((item) => ({ id: item.id, name: item.name })),
        );
        setDivisionOptions(
          [...divisions]
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((item) => ({ id: item.id, name: item.name })),
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
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat master surat masuk",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsMasterLoading(false);
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

  const handleToggleDivision = (divisionId: string) => {
    setFormData((prev) => ({
      ...prev,
      divisionIds: prev.divisionIds.includes(divisionId)
        ? prev.divisionIds.filter((item) => item !== divisionId)
        : [...prev.divisionIds, divisionId],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCreateSuratMasuk) return;

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

    if (!canCreateSuratMasuk) return;

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
    setFormData({
      namaPengirim: "",
      alamatPengirim: "",
      namaSurat: "",
      perihalSurat: "",
      keteranganSurat: "",
      tanggalPenerimaan: "",
      sifatSurat: "",
      storageId: "",
      divisionIds: [],
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitSuratMasuk = async () => {
    if (!ensureCapability(SURAT_MASUK_MENU_URL, "create")) return;

    setIsLoading(true);

    try {
      await suratMasukService.createWithDisposition({
        letter_prioritie_id: formData.sifatSurat,
        storage_id: formData.storageId,
        target_division_ids: formData.divisionIds,
        regarding: formData.perihalSurat.trim(),
        receive_date: toApiDateTime(formData.tanggalPenerimaan),
        mail_number: formData.namaSurat.trim(),
        name: formData.namaPengirim.trim(),
        description: formData.keteranganSurat.trim() || undefined,
        address: formData.alamatPengirim.trim(),
        file: file ?? undefined,
      });

      showToast("Surat masuk berhasil disimpan!", "success");
      handleReset();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan surat masuk",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ensureCapability(SURAT_MASUK_MENU_URL, "create")) return;

    if (!formData.tanggalPenerimaan) {
      showToast("Tanggal penerimaan wajib diisi!", "error");
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

    if (formData.divisionIds.length === 0) {
      showToast("Pilih minimal satu divisi tujuan disposisi.", "error");
      return;
    }

    if (!file) {
      showToast("File scan wajib diupload!", "error");
      return;
    }

    const fileValidationMessage = validatePersuratanFile(file);
    if (fileValidationMessage) {
      showToast(fileValidationMessage, "error");
      return;
    }

    void submitSuratMasuk();
  };

  const selectedDivisionNames = divisionOptions
    .filter((division) => formData.divisionIds.includes(division.id))
    .map((division) => division.name);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <FeatureHeader
        title="Input Surat Masuk"
        subtitle="Form pencatatan dan pendisposisian surat masuk."
        icon={<Inbox />}
      />

      {showCreateBlockedNotice && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" />
          <div>
            <p className="font-semibold">Akses input belum aktif</p>
            <p className="mt-1">
              Role Anda dapat membuka menu ini, tetapi belum memiliki izin
              membuat surat masuk.
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
                  htmlFor="namaPengirim"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nama Pengirim <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  id="namaPengirim"
                  name="namaPengirim"
                  value={formData.namaPengirim}
                  onChange={handleChange}
                  placeholder="Masukkan nama pengirim"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="tanggalPenerimaan"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tanggal Penerimaan <span className="text-red-500">*</span>
                </label>
                <BasicDateInput
                  id="tanggalPenerimaan"
                  value={formData.tanggalPenerimaan}
                  onChange={(nextValue) =>
                    setFormData((prev) => ({
                      ...prev,
                      tanggalPenerimaan: nextValue,
                    }))
                  }
                />
                <p className="mt-2 text-xs text-slate-500">
                  Isi sesuai tanggal surat diterima.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="alamatPengirim"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Alamat Pengirim <span className="text-red-500">*</span>
              </label>
              <SetupTextarea
                id="alamatPengirim"
                name="alamatPengirim"
                value={formData.alamatPengirim}
                onChange={handleChange}
                rows={2}
                className="resize-none"
                placeholder="Alamat lengkap instansi/pengirim..."
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
                  disabled={isMasterLoading || letterPriorities.length === 0}
                  required
                >
                  <option value="">Pilih Sifat Surat</option>
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
                disabled={isLoading || !canCreateSuratMasuk}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label
                  htmlFor="keteranganSurat"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Keterangan Surat <span className="text-red-500">*</span>
                </label>
                <SetupTextarea
                  id="keteranganSurat"
                  name="keteranganSurat"
                  value={formData.keteranganSurat}
                  onChange={handleChange}
                  rows={3}
                  className="resize-none"
                  placeholder="Tambahkan keterangan utama untuk surat ini..."
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Isi catatan singkat kalau perlu.
                </p>
              </div>

              <div>
                <label
                  htmlFor="perihalSurat"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Perihal Surat <span className="text-red-500">*</span>
                </label>
                <SetupTextarea
                  id="perihalSurat"
                  name="perihalSurat"
                  value={formData.perihalSurat}
                  onChange={handleChange}
                  rows={3}
                  className="resize-none"
                  placeholder="Ringkasan perihal atau isi surat..."
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Tulis perihal surat dengan singkat.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FileUploadField
              id="surat-masuk-file-input"
              file={file}
              inputRef={fileInputRef}
              disabled={!canCreateSuratMasuk || isLoading}
              isDragActive={dragOver}
              title={file ? "Ganti file surat masuk" : "Pilih file surat masuk"}
              helperText="Upload file suratnya dulu sebelum simpan."
              onChange={handleFileChange}
              onClear={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                if (!canCreateSuratMasuk || isLoading) return;
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Divisi Tujuan Disposisi <span className="text-red-500">*</span>
              </label>
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                  {isMasterLoading
                    ? "Memuat daftar divisi..."
                    : selectedDivisionNames.length > 0
                      ? `${selectedDivisionNames.length} divisi dipilih`
                      : "Belum ada divisi yang dipilih"}
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto px-4 py-3">
                  {divisionOptions.map((division) => {
                    const isChecked = formData.divisionIds.includes(division.id);
                    const isDisabled =
                      isMasterLoading || isLoading || !canCreateSuratMasuk;

                    return (
                      <div
                        key={division.id}
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-disabled={isDisabled}
                        tabIndex={isDisabled ? -1 : 0}
                        onClick={() => {
                          if (!isDisabled) handleToggleDivision(division.id);
                        }}
                        onKeyDown={(event) => {
                          if (isDisabled) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleDivision(division.id);
                          }
                        }}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                          isChecked
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div
                          className="mt-0.5"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <UiverseCheckbox
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={() =>
                              handleToggleDivision(division.id)
                            }
                            ariaLabel={`Pilih ${division.name}`}
                            size={18}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {division.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Surat akan didisposisikan ke penerima disposisi aktif pada divisi ini.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {formData.divisionIds.length === 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-slate-900" />
                  Pilih minimal satu divisi tujuan disposisi.
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Disposisi awal akan masuk ke penerima disposisi aktif pada setiap divisi yang dipilih.
              </p>
            </div>
          </div>

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
                !canCreateSuratMasuk ||
                isLoading ||
                isMasterLoading ||
                formData.divisionIds.length === 0 ||
                letterPriorities.length === 0 ||
                divisionOptions.length === 0 ||
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
                  Simpan Surat Masuk
                </>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
