"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Send } from "lucide-react";
import BasicDateInput from "@/components/ui/BasicDateInput";
import FileUploadField from "@/components/ui/FileUploadField";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import PhysicalStorageSelect from "@/components/manajemen-surat/PhysicalStorageSelect";
import TenggatWaktuModal, {
  type TenggatWaktuPayload,
} from "@/components/surat/TenggatWaktuModal";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_PRIMARY_BUTTON_CLASS,
} from "@/components/ui/setupPageStyles";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { validatePersuratanFile } from "@/lib/utils/file";
import { toApiDateTime } from "@/services/api.utils";
import { divisionService } from "@/services/division.service";
import { storageService } from "@/services/storage.service";
import { memorandumService } from "@/services/memorandum.service";
import type { Storage } from "@/types/master.types";

const MEMORANDUM_MENU_URL =
  "/dashboard/manajemen-surat/kelola-surat/input-memorandum";

type DivisionOption = {
  id: string;
  name: string;
};

const INITIAL_FORM_DATA = {
  noMemo: "",
  perihalMemo: "",
  tanggalMemo: "",
  originDivisionId: "",
  storageId: "",
  targetDivisionIds: [] as string[],
  pembuatMemo: "",
  keteranganMemo: "",
};

export default function InputMemorandumPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability, status } = useProtectedAction();
  const canCreateMemorandum = hasCapability(MEMORANDUM_MENU_URL, "create");
  const showCreateBlockedNotice =
    status === "authenticated" && !canCreateMemorandum;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [divisionOptions, setDivisionOptions] = useState<DivisionOption[]>([]);
  const [storageOptions, setStorageOptions] = useState<Storage[]>([]);
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
        const [divisions, storages] = await Promise.all([
          divisionService.getAll(),
          storageService.getAll(),
        ]);

        if (ignore) return;

        setDivisionOptions(
          [...divisions]
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((item) => ({
              id: item.id,
              name: item.name,
            })),
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
    if (!canCreateMemorandum) return;

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

    if (!canCreateMemorandum) return;

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

    if (!ensureCapability(MEMORANDUM_MENU_URL, "create")) return;

    if (!formData.originDivisionId) {
      showToast("Divisi asal memorandum wajib dipilih.", "error");
      return;
    }

    if (formData.targetDivisionIds.length === 0) {
      showToast("Pilih minimal satu divisi tujuan memorandum.", "error");
      return;
    }

    if (!formData.storageId) {
      showToast("Tempat penyimpanan fisik wajib dipilih.", "error");
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

    setIsDeadlineModalOpen(true);
  };

  const handleReset = () => {
    setIsDeadlineModalOpen(false);
    setFormData({
      ...INITIAL_FORM_DATA,
      pembuatMemo: user?.name ?? "",
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitMemorandum = async (deadline?: TenggatWaktuPayload) => {
    if (!ensureCapability(MEMORANDUM_MENU_URL, "create")) return;

    setIsLoading(true);
    setIsDeadlineModalOpen(false);

    try {
      const memoDate = toApiDateTime(formData.tanggalMemo);

      await memorandumService.createWithDisposition({
        origin_division_id: formData.originDivisionId,
        storage_id: formData.storageId,
        target_division_ids: formData.targetDivisionIds,
        regarding: formData.perihalMemo.trim(),
        memo_date: memoDate,
        received_date: memoDate,
        memo_number: formData.noMemo.trim(),
        description: formData.keteranganMemo.trim(),
        due_date: deadline?.tenggatWaktu
          ? toApiDateTime(deadline.tenggatWaktu)
          : undefined,
        note: deadline?.keteranganTenggat,
        file: file ?? undefined,
      });

      showToast("Memorandum berhasil disimpan!", "success");
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

  const selectedTargetDivisionNames = divisionOptions
    .filter((item) => formData.targetDivisionIds.includes(item.id))
    .map((item) => item.name);

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Input Memorandum"
        subtitle="Buat dan distribusikan memorandum internal"
        icon={<FileText />}
      />

      {showCreateBlockedNotice && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" />
          <div>
            <p className="font-semibold">Akses input belum aktif</p>
            <p className="mt-1">
              Role Anda dapat membuka menu ini, tetapi belum memiliki izin
              membuat memorandum.
            </p>
          </div>
        </div>
      )}

      <div className="app-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="originDivisionId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Divisi Asal <span className="text-red-500">*</span>
              </label>
              <SetupSelect
                id="originDivisionId"
                name="originDivisionId"
                value={formData.originDivisionId}
                onChange={handleChange}
                required
                disabled={isMasterLoading || isLoading || !canCreateMemorandum}
              >
                <option value="">
                  {isMasterLoading ? "Memuat divisi..." : "Pilih Divisi Asal"}
                </option>
                {divisionOptions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </SetupSelect>
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
              <SetupTextInput
                id="noMemo"
                name="noMemo"
                value={formData.noMemo}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="tabular-nums"
                placeholder="Masukkan nomor memorandum"
              />
            </div>

            <div>
              <label
                htmlFor="tanggalMemo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tanggal Memo <span className="text-red-500">*</span>
              </label>
              <BasicDateInput
                id="tanggalMemo"
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

            <PhysicalStorageSelect
              id="storageId"
              name="storageId"
              value={formData.storageId}
              storages={storageOptions}
              isLoading={isMasterLoading}
              disabled={isLoading || !canCreateMemorandum}
              onChange={handleChange}
            />

            <div>
              <label
                htmlFor="pembuatMemo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Pembuat Memo <span className="text-red-500">*</span>
              </label>
              <SetupTextInput
                id="pembuatMemo"
                name="pembuatMemo"
                value={formData.pembuatMemo}
                required
                readOnly
                disabled={isLoading}
                className="!cursor-default !bg-white !text-gray-700"
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
                    const isDisabled =
                      isMasterLoading || isLoading || !canCreateMemorandum;

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
                            Memorandum akan masuk lebih dulu ke penerima disposisi aktif pada divisi ini.
                          </p>
                        </div>
                      </div>
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
            <SetupTextInput
              id="perihalMemo"
              name="perihalMemo"
              value={formData.perihalMemo}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Masukkan perihal memorandum"
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
            <SetupTextarea
              id="keteranganMemo"
              name="keteranganMemo"
              value={formData.keteranganMemo}
              onChange={handleChange}
              required
              disabled={isLoading}
              rows={4}
              placeholder="Jelaskan detail memorandum secara lengkap..."
            />
            <p className="mt-2 text-xs text-slate-500">
              Isi penjelasan memo dengan jelas.
            </p>
          </div>

          <FileUploadField
            id="memorandum-file-input"
            file={file}
            inputRef={fileInputRef}
            disabled={isLoading || !canCreateMemorandum}
            isDragActive={dragOver}
            title={file ? "Ganti file memorandum" : "Pilih file memorandum"}
            helperText="Upload file memo sebelum simpan."
            onChange={handleFileChange}
            onClear={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              if (isLoading || !canCreateMemorandum) return;
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          />

          <div className="pt-2 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className={SETUP_PAGE_BACK_BUTTON_CLASS}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                isMasterLoading ||
                !canCreateMemorandum ||
                !formData.originDivisionId ||
                formData.targetDivisionIds.length === 0 ||
                storageOptions.length === 0 ||
                !formData.storageId
              }
              className={SETUP_PAGE_PRIMARY_BUTTON_CLASS}
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
        isOpen={isDeadlineModalOpen}
        title="Tenggat Tindak Lanjut Memorandum"
        subtitle="Atur batas waktu disposisi awal jika memorandum perlu tindak lanjut."
        disposisi={selectedTargetDivisionNames}
        onSkip={() => void submitMemorandum()}
        onSave={(deadline) => void submitMemorandum(deadline)}
      />
    </DashboardPageShell>
  );
}
