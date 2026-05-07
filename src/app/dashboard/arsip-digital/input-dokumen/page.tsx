"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, UploadCloud } from "lucide-react";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { validateDigitalArchiveFile } from "@/lib/utils/file";
import { divisionService } from "@/services/division.service";
import { userService } from "@/services/user.service";
import type { UserRecord } from "@/types/auth.types";
import type { Division } from "@/types/master.types";

type RestrictOption = "Ya" | "Tidak";

type FormState = {
  tempatPenyimpananId: string;
  jenisDokumenId: string;
  namaDokumen: string;
  keterangan: string;
  restrict: RestrictOption;
  ownerUserId: string;
  ownerDivisionId: string;
  relatedUserIds: string[];
  documentDate: string;
  dueDate: string;
};

const INITIAL_FORM_STATE: FormState = {
  tempatPenyimpananId: "",
  jenisDokumenId: "",
  namaDokumen: "",
  keterangan: "",
  restrict: "Tidak",
  ownerUserId: "",
  ownerDivisionId: "",
  relatedUserIds: [],
  documentDate: "",
  dueDate: "",
};

export default function InputDokumenPage() {
  const { showToast } = useAppToast();
  const { tempatPenyimpanan, jenisDokumen } = useArsipDigitalMasterData();
  const { createDokumen } = useArsipDigitalWorkflow();
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isOwnershipLoading, setIsOwnershipLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadOwnershipOptions() {
      setIsOwnershipLoading(true);
      try {
        const [userRows, divisionRows] = await Promise.all([
          userService.getAll(),
          divisionService.getAll(),
        ]);

        if (ignore) return;

        setUsers(
          userRows
            .filter((item) => item.is_active)
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        setDivisions(
          [...divisionRows].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat data PIC dokumen.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsOwnershipLoading(false);
      }
    }

    void loadOwnershipOptions();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const tempatPenyimpananList = useMemo(() => {
    return tempatPenyimpanan
      .filter((item) => item.status === "Aktif")
      .map((item) => ({
        id: String(item.id),
        kodeKantor: item.kodeKantor,
        namaKantor: item.namaKantor,
        kodeLemari: item.kodeLemari,
        rak: item.rak,
      }));
  }, [tempatPenyimpanan]);

  const jenisDokumenList = useMemo(() => {
    return jenisDokumen
      .filter((item) => item.status === "Aktif")
      .map((item) => ({
        id: String(item.id),
        kode: item.kode,
        nama: item.nama,
        keterangan: item.keterangan,
      }));
  }, [jenisDokumen]);

  const selectedOwnerUser = useMemo(
    () => users.find((item) => item.id === formData.ownerUserId) ?? null,
    [formData.ownerUserId, users],
  );

  const relatedUserOptions = useMemo(
    () => users.filter((item) => item.id !== formData.ownerUserId),
    [formData.ownerUserId, users],
  );

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOwnerUserChange = (value: string) => {
    const owner = users.find((item) => item.id === value);
    setFormData((prev) => ({
      ...prev,
      ownerUserId: value,
      ownerDivisionId: owner?.division_id ?? prev.ownerDivisionId,
      relatedUserIds: prev.relatedUserIds.filter((id) => id !== value),
    }));
  };

  const handleRelatedUserToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      relatedUserIds: prev.relatedUserIds.includes(userId)
        ? prev.relatedUserIds.filter((item) => item !== userId)
        : [...prev.relatedUserIds, userId],
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      const validationMessage = validateDigitalArchiveFile(selectedFile);

      if (validationMessage) {
        showToast(validationMessage, "error");
        event.target.value = "";
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const selectedFile = event.dataTransfer.files[0];
      const validationMessage = validateDigitalArchiveFile(selectedFile);

      if (validationMessage) {
        showToast(validationMessage, "error");
        return;
      }

      setFile(selectedFile);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setFile(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.tempatPenyimpananId ||
      !formData.jenisDokumenId ||
      !formData.namaDokumen.trim()
    ) {
      showToast("Mohon lengkapi field yang wajib dulu.", "warning");
      return;
    }

    if (formData.namaDokumen.trim().length < 3) {
      showToast("Nama dokumen minimal 3 karakter.", "warning");
      return;
    }

    if (!file) {
      showToast("File dokumen belum dipilih.", "warning");
      return;
    }

    if (
      formData.documentDate &&
      formData.dueDate &&
      new Date(formData.dueDate).getTime() <
        new Date(formData.documentDate).getTime()
    ) {
      showToast(
        "Tanggal jatuh tempo tidak boleh lebih awal dari tanggal dokumen.",
        "warning",
      );
      return;
    }

    const selectedTempat = tempatPenyimpananList.find(
      (item) => item.id === formData.tempatPenyimpananId,
    );
    const selectedJenis = jenisDokumenList.find(
      (item) => item.id === formData.jenisDokumenId,
    );

    if (!selectedTempat || !selectedJenis) {
      showToast(
        "Jenis dokumen atau tempat penyimpanan belum valid.",
        "warning",
      );
      return;
    }

    setIsLoading(true);
    try {
      await createDokumen({
        storage_id: selectedTempat.id,
        document_type_id: selectedJenis.id,
        document_name: formData.namaDokumen.trim(),
        description: formData.keterangan.trim(),
        is_restricted: formData.restrict === "Ya",
        owner_user_id: formData.ownerUserId || undefined,
        owner_division_id: formData.ownerDivisionId || undefined,
        related_user_ids: formData.relatedUserIds,
        document_date: formData.documentDate || undefined,
        due_date: formData.dueDate || undefined,
        file,
      });

      showToast("Dokumen berhasil disimpan.", "success");
      resetForm();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Dokumen gagal disimpan.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <FeatureHeader
        title="Input Dokumen Digital"
        subtitle="Masukkan data dokumen baru ke dalam sistem arsip digital."
        icon={<UploadCloud />}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Klasifikasi Arsip */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label
                  htmlFor="tempatPenyimpanan"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tempat Penyimpanan <span className="text-red-500">*</span>
                </label>
                <select
                  id="tempatPenyimpanan"
                  name="tempatPenyimpananId"
                  value={formData.tempatPenyimpananId}
                  onChange={handleChange}
                  className="select"
                  required
                >
                  <option value="">-- Pilih Tempat Penyimpanan --</option>
                  {tempatPenyimpananList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kodeKantor} - {item.namaKantor} | {item.kodeLemari}{" "}
                      ({item.rak})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="jenisDokumen"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Jenis Dokumen <span className="text-red-500">*</span>
                </label>
                <select
                  id="jenisDokumen"
                  name="jenisDokumenId"
                  value={formData.jenisDokumenId}
                  onChange={handleChange}
                  className="select"
                  required
                >
                  <option value="">-- Pilih Jenis Dokumen --</option>
                  {jenisDokumenList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} ({item.kode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="restrict"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Dokumen Restrict
                </label>
                <select
                  id="restrict"
                  name="restrict"
                  value={formData.restrict}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Dokumen restrict hanya bisa diakses oleh pengguna tertentu.
                </p>
              </div>

              <div>
                <label
                  htmlFor="kodeDokumen"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Kode Dokumen
                </label>
                <div className="relative">
                  <input
                    id="kodeDokumen"
                    type="text"
                    value="Dibuat otomatis setelah dokumen disimpan"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm"
                    readOnly
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md border border-blue-100">
                      Sistem
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Kepemilikan dan Akses
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Jika dokumen diinput untuk user lain, pilih PIC dokumen agar
                hak akses dokumen mengikuti pemilik yang benar.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="ownerUserId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  PIC Dokumen
                </label>
                <select
                  id="ownerUserId"
                  name="ownerUserId"
                  value={formData.ownerUserId}
                  onChange={(event) => handleOwnerUserChange(event.target.value)}
                  className="select"
                  disabled={isOwnershipLoading}
                >
                  <option value="">
                    {isOwnershipLoading
                      ? "Memuat user..."
                      : "Ikuti akun penginput"}
                  </option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.username})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Kosongkan jika dokumen ini memang milik akun yang menginput.
                </p>
              </div>

              <div>
                <label
                  htmlFor="ownerDivisionId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Divisi Pemilik
                </label>
                <select
                  id="ownerDivisionId"
                  name="ownerDivisionId"
                  value={formData.ownerDivisionId}
                  onChange={handleChange}
                  className="select"
                  disabled={
                    isOwnershipLoading ||
                    !formData.ownerUserId ||
                    Boolean(selectedOwnerUser)
                  }
                >
                  <option value="">
                    {isOwnershipLoading
                      ? "Memuat divisi..."
                      : "Ikuti divisi PIC/penginput"}
                  </option>
                  {divisions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Jika PIC dipilih, divisi akan mengikuti data user tersebut.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Dokumen
                </label>
                <DatePickerInput
                  value={formData.documentDate}
                  onChange={(nextValue) =>
                    setFormData((prev) => ({
                      ...prev,
                      documentDate: nextValue,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Jatuh Tempo
                </label>
                <DatePickerInput
                  value={formData.dueDate}
                  onChange={(nextValue) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: nextValue,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Terkait
              </label>
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                  {isOwnershipLoading
                    ? "Memuat daftar user..."
                    : formData.relatedUserIds.length > 0
                      ? `${formData.relatedUserIds.length} user dipilih`
                      : "Belum ada user tambahan"}
                </div>
                <div className="grid max-h-64 gap-2 overflow-y-auto px-4 py-3 md:grid-cols-2">
                  {relatedUserOptions.map((item) => {
                    const checked = formData.relatedUserIds.includes(item.id);

                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                          checked
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isOwnershipLoading}
                          onChange={() => handleRelatedUserToggle(item.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#157ec3] focus:ring-[#157ec3]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-800">
                            {item.name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {item.division_name ?? "-"} • {item.role_name ?? "-"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                User terkait bisa melihat dokumen tanpa perlu pengajuan akses.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Detail Dokumen */}
          <div className="space-y-6">
            <div>
              <label
                htmlFor="namaDokumen"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nama Dokumen <span className="text-red-500">*</span>
              </label>
              <input
                id="namaDokumen"
                type="text"
                name="namaDokumen"
                value={formData.namaDokumen}
                onChange={handleChange}
                placeholder="Contoh: Akta Pendirian PT..."
                className="input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="keterangan"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Keterangan
              </label>
              <textarea
                id="keterangan"
                name="keterangan"
                value={formData.keterangan}
                onChange={handleChange}
                rows={3}
                placeholder="Tambahkan keterangan singkat dokumen di sini..."
                className="textarea resize-none"
              />
              <p className="mt-2 text-xs text-slate-500">
                Isi catatan singkat kalau perlu.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Upload File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              File Dokumen <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                "file-upload",
                "flex flex-col items-center justify-center",
                dragOver ? "dragover" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  file
                    ? "bg-green-100 text-green-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {file ? (
                  <Check className="w-8 h-8" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-2">
                    File siap diupload
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    <span className="text-primary-600 font-bold">
                      Klik untuk upload
                    </span>{" "}
                    atau drag & drop
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PDF, DOC, XLS, Gambar (Max 15MB)
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Upload file dokumennya dulu sebelum simpan.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={resetForm}
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="btn btn-primary"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Simpan Dokumen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
