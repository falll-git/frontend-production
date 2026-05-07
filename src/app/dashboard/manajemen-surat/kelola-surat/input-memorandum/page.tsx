"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Send, UploadCloud } from "lucide-react";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import TenggatWaktuModal from "@/components/surat/TenggatWaktuModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { validatePersuratanFile } from "@/lib/utils/file";
import { toApiDateTime } from "@/services/api.utils";
import { divisionService } from "@/services/division.service";
import { memorandumService } from "@/services/memorandum.service";

type DivisionOption = {
  id: string;
  name: string;
};

type MemorandumDraft = {
  noMemo: string;
  perihalMemo: string;
  tanggalMemo: string;
  originDivisionId: string;
  targetDivisionIds: string[];
  pembuatMemo: string;
  keteranganMemo: string;
  fileName?: string;
};

const INITIAL_FORM_DATA = {
  noMemo: "",
  perihalMemo: "",
  tanggalMemo: "",
  originDivisionId: "",
  targetDivisionIds: [] as string[],
  pembuatMemo: "",
  keteranganMemo: "",
};

export default function InputMemorandumPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [savedMemo, setSavedMemo] = useState<MemorandumDraft | null>(null);
  const [isTenggatModalOpen, setIsTenggatModalOpen] = useState(false);
  const [divisionOptions, setDivisionOptions] = useState<DivisionOption[]>([]);
  const [isMasterLoading, setIsMasterLoading] = useState(true);

  useEffect(() => {
    if (!user?.name) return;

    setFormData((prev) =>
      prev.pembuatMemo ? prev : { ...prev, pembuatMemo: user.name },
    );
  }, [user?.name]);

  useEffect(() => {
    let ignore = false;

    async function loadMasterData() {
      setIsMasterLoading(true);

      try {
        const divisions = await divisionService.getAll();

        if (ignore) return;

        setDivisionOptions(
          [...divisions]
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((item) => ({
              id: item.id,
              name: item.name,
            })),
        );
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat master memorandum",
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

  const handleToggleDivision = (divisionId: string) => {
    setFormData((prev) => ({
      ...prev,
      targetDivisionIds: prev.targetDivisionIds.includes(divisionId)
        ? prev.targetDivisionIds.filter((item) => item !== divisionId)
        : [...prev.targetDivisionIds, divisionId],
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.originDivisionId) {
      showToast("Divisi asal memorandum wajib dipilih.", "error");
      return;
    }

    if (formData.targetDivisionIds.length === 0) {
      showToast("Pilih minimal satu divisi tujuan memorandum.", "error");
      return;
    }

    if (!formData.noMemo.trim()) {
      showToast("Nomor memo wajib diisi.", "error");
      return;
    }

    if (!formData.tanggalMemo) {
      showToast("Tanggal memo wajib diisi.", "error");
      return;
    }

    if (!formData.pembuatMemo.trim()) {
      showToast("Pembuat memo wajib tersedia.", "error");
      return;
    }

    if (!formData.perihalMemo.trim()) {
      showToast("Perihal memo wajib diisi.", "error");
      return;
    }

    if (!formData.keteranganMemo.trim()) {
      showToast("Keterangan memo wajib diisi.", "error");
      return;
    }

    if (!file) {
      showToast("File memorandum wajib diupload!", "error");
      return;
    }

    const fileValidationMessage = validatePersuratanFile(file);
    if (fileValidationMessage) {
      showToast(fileValidationMessage, "error");
      return;
    }

    setSavedMemo({
      ...formData,
      fileName: file?.name ?? "",
    });
    setIsTenggatModalOpen(true);
  };

  const handleReset = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      pembuatMemo: user?.name ?? "",
    });
    setFile(null);
    setSavedMemo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitMemorandum = async (payload: {
    tenggatWaktu?: string;
    keteranganTenggat?: string;
  }) => {
    if (!savedMemo) {
      setIsTenggatModalOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const memoDate = toApiDateTime(savedMemo.tanggalMemo);
      const dueDate = payload.tenggatWaktu
        ? toApiDateTime(payload.tenggatWaktu)
        : undefined;

      await memorandumService.createWithDisposition({
        origin_division_id: savedMemo.originDivisionId,
        target_division_ids: savedMemo.targetDivisionIds,
        regarding: savedMemo.perihalMemo.trim(),
        memo_date: memoDate,
        received_date: memoDate,
        due_date: dueDate,
        memo_number: savedMemo.noMemo.trim(),
        description: savedMemo.keteranganMemo.trim(),
        file: file ?? undefined,
      });

      showToast("Memorandum berhasil disimpan!", "success");
      setIsTenggatModalOpen(false);
      handleReset();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan memorandum",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenggatSave = (payload: {
    tenggatWaktu?: string;
    keteranganTenggat?: string;
  }) => {
    void submitMemorandum(payload);
  };

  const handleTenggatSkip = () => {
    void submitMemorandum({});
  };

  const selectedOriginDivisionName =
    divisionOptions.find((item) => item.id === formData.originDivisionId)?.name ??
    "";
  const selectedTargetDivisionNames = divisionOptions
    .filter((item) => formData.targetDivisionIds.includes(item.id))
    .map((item) => item.name);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Input Memorandum"
        subtitle="Buat dan distribusikan memorandum internal"
        icon={<FileText />}
      />

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="originDivisionId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Divisi Asal <span className="text-red-500">*</span>
              </label>
              <select
                id="originDivisionId"
                name="originDivisionId"
                value={formData.originDivisionId}
                onChange={handleChange}
                required
                disabled={isMasterLoading || isLoading}
                className="select"
              >
                <option value="">
                  {isMasterLoading ? "Memuat divisi..." : "Pilih Divisi Asal"}
                </option>
                {divisionOptions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Pilih divisi yang menerbitkan atau memiliki memorandum ini.
              </p>
            </div>

            <div>
              <label
                htmlFor="noMemo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                No Memo <span className="text-red-500">*</span>
              </label>
              <input
                id="noMemo"
                type="text"
                name="noMemo"
                value={formData.noMemo}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="input tabular-nums"
                placeholder="Contoh: MEMO/001/HRD/2026"
              />
            </div>

            <div>
              <label
                htmlFor="tanggalMemo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tanggal Memo <span className="text-red-500">*</span>
              </label>
              <DatePickerInput
                value={formData.tanggalMemo}
                onChange={(nextValue) =>
                  setFormData((prev) => ({
                    ...prev,
                    tanggalMemo: nextValue,
                  }))
                }
              />
              <p className="mt-2 text-xs text-slate-500">
                Isi sesuai tanggal memo dibuat.
              </p>
            </div>

            <div>
              <label
                htmlFor="pembuatMemo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Pembuat Memo <span className="text-red-500">*</span>
              </label>
              <input
                id="pembuatMemo"
                type="text"
                name="pembuatMemo"
                value={formData.pembuatMemo}
                required
                readOnly
                disabled={isLoading}
                className="input !cursor-default !bg-white !text-gray-700"
                placeholder="Nama pembuat memo"
              />
              <p className="mt-2 text-xs text-slate-500">
                Terisi otomatis dari akun yang sedang login.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Divisi Tujuan Awal <span className="text-red-500">*</span>
              </label>
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                  {isMasterLoading
                    ? "Memuat daftar divisi..."
                    : selectedTargetDivisionNames.length > 0
                      ? `${selectedTargetDivisionNames.length} divisi dipilih`
                      : "Belum ada divisi yang dipilih"}
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto px-4 py-3">
                  {divisionOptions.map((division) => {
                    const isChecked = formData.targetDivisionIds.includes(
                      division.id,
                    );

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
                            Memorandum akan masuk lebih dulu ke Manager aktif pada divisi ini.
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Pilih satu atau lebih divisi tujuan untuk disposisi awal memorandum.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="perihalMemo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Perihal Memo <span className="text-red-500">*</span>
            </label>
            <input
              id="perihalMemo"
              type="text"
              name="perihalMemo"
              value={formData.perihalMemo}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="input"
              placeholder="Contoh: Evaluasi Kinerja Karyawan"
            />
            <p className="mt-2 text-xs text-slate-500">
              Tulis judul memo dengan singkat.
            </p>
          </div>

          <div>
            <label
              htmlFor="keteranganMemo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Keterangan Memo <span className="text-red-500">*</span>
            </label>
            <textarea
              id="keteranganMemo"
              name="keteranganMemo"
              value={formData.keteranganMemo}
              onChange={handleChange}
              required
              disabled={isLoading}
              rows={4}
              className="textarea"
              placeholder="Jelaskan detail memorandum secara lengkap..."
            />
            <p className="mt-2 text-xs text-slate-500">
              Isi penjelasan memo dengan jelas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                onClick={() => {
                  if (!isLoading) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isLoading) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  disabled={isLoading}
                />
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <UploadCloud className="w-8 h-8" aria-hidden="true" />
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
                Upload file memo sebelum simpan.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Ringkasan Alur Awal
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Divisi Asal
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {selectedOriginDivisionName || "Pilih divisi asal dulu"}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tujuan Awal
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {selectedTargetDivisionNames.length > 0
                    ? selectedTargetDivisionNames.join(", ")
                    : "Pilih divisi tujuan dulu"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Disposisi awal akan masuk ke Manager aktif pada setiap divisi yang dipilih.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="btn btn-outline"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                isMasterLoading ||
                !formData.originDivisionId ||
                formData.targetDivisionIds.length === 0
              }
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <div
                    className="button-spinner"
                    style={
                      {
                        ["--spinner-size"]: "18px",
                        ["--spinner-border"]: "2px",
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Simpan Memorandum</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <TenggatWaktuModal
        isOpen={isTenggatModalOpen}
        onSave={handleTenggatSave}
        onSkip={handleTenggatSkip}
        disposisi={selectedTargetDivisionNames}
        title="Tenggat Waktu Memorandum"
        subtitle="Opsional - dapat dilewati"
        showNoteField={false}
      />
    </div>
  );
}
