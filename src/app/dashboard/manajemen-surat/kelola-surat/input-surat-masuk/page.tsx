"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Inbox, Send, UploadCloud } from "lucide-react";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { validatePersuratanFile } from "@/lib/utils/file";
import { toApiDateTime } from "@/services/api.utils";
import { divisionService } from "@/services/division.service";
import { letterPriorityService } from "@/services/letter-priority.service";
import { suratMasukService } from "@/services/surat-masuk.service";

type DivisionOption = {
  id: string;
  name: string;
};

export default function InputSuratMasukPage() {
  const { showToast } = useAppToast();
  const [formData, setFormData] = useState({
    namaPengirim: "",
    alamatPengirim: "",
    namaSurat: "",
    perihalSurat: "",
    keteranganSurat: "",
    tanggalPenerimaan: "",
    sifatSurat: "",
    divisionIds: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [divisionOptions, setDivisionOptions] = useState<DivisionOption[]>([]);
  const [letterPriorities, setLetterPriorities] = useState<
    { id: string; name: string }[]
  >([]);
  const [isMasterLoading, setIsMasterLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadMasterData() {
      setIsMasterLoading(true);
      try {
        const [priorities, divisions] = await Promise.all([
          letterPriorityService.getAll(),
          divisionService.getAll(),
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
      divisionIds: [],
    });
    setFile(null);
  };

  const submitSuratMasuk = async () => {
    setIsLoading(true);

    try {
      await suratMasukService.createWithDisposition({
        letter_prioritie_id: formData.sifatSurat,
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

    if (!formData.tanggalPenerimaan) {
      showToast("Tanggal penerimaan wajib diisi!", "error");
      return;
    }

    if (!formData.sifatSurat) {
      showToast("Sifat surat wajib dipilih!", "error");
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
                <input
                  id="namaPengirim"
                  type="text"
                  name="namaPengirim"
                  value={formData.namaPengirim}
                  onChange={handleChange}
                  className="input"
                  placeholder="Contoh: PT Amanah Sejahtera"
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
                <DatePickerInput
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
              <textarea
                id="alamatPengirim"
                name="alamatPengirim"
                value={formData.alamatPengirim}
                onChange={handleChange}
                rows={2}
                className="textarea resize-none"
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
                <input
                  id="namaSurat"
                  type="text"
                  name="namaSurat"
                  value={formData.namaSurat}
                  onChange={handleChange}
                  className="input"
                  placeholder="Contoh: 001/INV/2023"
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
                <select
                  id="sifatSurat"
                  name="sifatSurat"
                  value={formData.sifatSurat}
                  onChange={handleChange}
                  className="select"
                  disabled={isMasterLoading || letterPriorities.length === 0}
                  required
                >
                  <option value="">Pilih Sifat Surat</option>
                  {letterPriorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Pilih sifat surat yang sesuai.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label
                  htmlFor="keteranganSurat"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Keterangan Surat <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="keteranganSurat"
                  name="keteranganSurat"
                  value={formData.keteranganSurat}
                  onChange={handleChange}
                  rows={3}
                  className="textarea resize-none"
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
                <textarea
                  id="perihalSurat"
                  name="perihalSurat"
                  value={formData.perihalSurat}
                  onChange={handleChange}
                  rows={3}
                  className="textarea resize-none"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload File <span className="text-red-500">*</span>
              </label>
              <div
                className={[
                  "file-upload",
                  "flex flex-col items-center justify-center",
                  dragOver ? "dragover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <UploadCloud className="w-8 h-8" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      <span className="text-primary-600 font-bold">
                        Klik untuk upload
                      </span>{" "}
                      atau drag & drop
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      PDF, DOC, XLS, Gambar (Max 10MB)
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Upload file suratnya dulu sebelum simpan.
              </p>
            </div>

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

                    return (
                      <label
                        key={division.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                          isChecked
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isMasterLoading || isLoading}
                          onChange={() => handleToggleDivision(division.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#157ec3] focus:ring-[#157ec3]"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {division.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Surat akan didisposisikan ke Manager aktif pada divisi ini.
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              {formData.divisionIds.length === 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  Pilih minimal satu divisi tujuan disposisi.
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Disposisi awal akan masuk ke Manager aktif pada setiap divisi yang dipilih.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-outline"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                isMasterLoading ||
                formData.divisionIds.length === 0 ||
                letterPriorities.length === 0 ||
                divisionOptions.length === 0
              }
              className="btn btn-primary"
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
