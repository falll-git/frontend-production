"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { RotateCcw, Save, UploadCloud } from "lucide-react";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import AccessBlockedNotice from "@/components/arsip-digital/input-dokumen/AccessBlockedNotice";
import InputDokumenSectionTitle from "@/components/arsip-digital/input-dokumen/InputDokumenSectionTitle";
import RelatedUsersPicker from "@/components/arsip-digital/input-dokumen/RelatedUsersPicker";
import SystemGeneratedCodeField from "@/components/arsip-digital/input-dokumen/SystemGeneratedCodeField";
import FileUploadField from "@/components/ui/FileUploadField";
import FeatureHeader from "@/components/ui/FeatureHeader";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { validateDigitalArchiveFile } from "@/lib/utils/file";
import { debiturService } from "@/services/debitur.service";
import { divisionService } from "@/services/division.service";
import { userService } from "@/services/user.service";
import type { UserRecord } from "@/types/auth.types";
import type { DebtorRecord } from "@/types/debitur.types";
import type { Division } from "@/types/master.types";

const INPUT_DOKUMEN_MENU_URL = "/dashboard/arsip-digital/input-dokumen";
const DEBTOR_READ_MENU_URLS = [
  "/dashboard/informasi-debitur",
  "/dashboard/informasi-debitur/master-debitur",
  "/dashboard/informasi-debitur/marketing/action-plan",
  "/dashboard/informasi-debitur/marketing/hasil-kunjungan",
  "/dashboard/informasi-debitur/marketing/langkah-penanganan",
  "/dashboard/informasi-debitur/laporan",
  "/dashboard/informasi-debitur/laporan/npf",
  "/dashboard/informasi-debitur/laporan/aktivitas-marketing",
];

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
  debtorId: string;
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
  debtorId: "",
};

export default function InputDokumenPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability, status } = useProtectedAction();
  const { tempatPenyimpanan, jenisDokumen } = useArsipDigitalMasterData();
  const { createDokumen } = useArsipDigitalWorkflow();
  const canCreateDokumen = hasCapability(INPUT_DOKUMEN_MENU_URL, "create");
  const canReadDebtors = DEBTOR_READ_MENU_URLS.some((menuUrl) =>
    hasCapability(menuUrl, "read"),
  );
  const showCreateBlockedNotice =
    status === "authenticated" && !canCreateDokumen;
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [isOwnershipLoading, setIsOwnershipLoading] = useState(true);
  const [isDebtorLoading, setIsDebtorLoading] = useState(false);

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

  useEffect(() => {
    let ignore = false;

    if (!canReadDebtors) {
      setDebtors([]);
      setFormData((prev) =>
        prev.debtorId ? { ...prev, debtorId: "" } : prev,
      );
      return () => {
        ignore = true;
      };
    }

    async function loadDebtorOptions() {
      setIsDebtorLoading(true);
      try {
        const rows = await debiturService.getAllDebtors({
          status: "ACTIVE",
          sort_by: "name",
          sort_order: "asc",
        });

        if (ignore) return;

        setDebtors(
          rows
            .filter((item) => item.status !== "INACTIVE")
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
      } catch (error) {
        if (!ignore) {
          setDebtors([]);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat data debitur.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsDebtorLoading(false);
      }
    }

    void loadDebtorOptions();

    return () => {
      ignore = true;
    };
  }, [canReadDebtors, showToast]);

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
    if (!canCreateDokumen) return;

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

    if (!canCreateDokumen) return;

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!ensureCapability(INPUT_DOKUMEN_MENU_URL, "create")) return;

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
        debtor_id: formData.debtorId || undefined,
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
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Input Dokumen Digital"
        subtitle="Masukkan dokumen baru beserta lokasi fisik dan hak aksesnya."
        icon={<UploadCloud />}
      />

      {showCreateBlockedNotice ? <AccessBlockedNotice /> : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8"
      >
        <div className="space-y-8">
          <section className="space-y-6">
            <InputDokumenSectionTitle
              title="Informasi Arsip"
              description="Tentukan lokasi penyimpanan fisik, jenis dokumen, dan status akses dokumen."
            />

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="tempatPenyimpanan"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tempat Penyimpanan <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  id="tempatPenyimpanan"
                  name="tempatPenyimpananId"
                  value={formData.tempatPenyimpananId}
                  onChange={handleChange}
                  required
                  disabled={!canCreateDokumen || isLoading}
                >
                  <option value="">Pilih tempat penyimpanan</option>
                  {tempatPenyimpananList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kodeKantor} - {item.namaKantor} | {item.kodeLemari}{" "}
                      ({item.rak})
                    </option>
                  ))}
                </SetupSelect>
              </div>

              <div>
                <label
                  htmlFor="jenisDokumen"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Jenis Dokumen <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  id="jenisDokumen"
                  name="jenisDokumenId"
                  value={formData.jenisDokumenId}
                  onChange={handleChange}
                  required
                  disabled={!canCreateDokumen || isLoading}
                >
                  <option value="">Pilih jenis dokumen</option>
                  {jenisDokumenList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} ({item.kode})
                    </option>
                  ))}
                </SetupSelect>
              </div>

              <div>
                <label
                  htmlFor="restrict"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Dokumen Restrict
                </label>
                <SetupSelect
                  id="restrict"
                  name="restrict"
                  value={formData.restrict}
                  onChange={handleChange}
                  disabled={!canCreateDokumen || isLoading}
                >
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Aktifkan jika dokumen hanya boleh dilihat user tertentu.
                </p>
              </div>

              <SystemGeneratedCodeField />
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section className="space-y-6">
            <InputDokumenSectionTitle
              title="Kepemilikan dan Akses"
              description="Pilih PIC jika dokumen ini milik user lain. User terkait bisa melihat dokumen tanpa pengajuan akses."
            />

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="ownerUserId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  PIC Dokumen
                </label>
                <SetupSelect
                  id="ownerUserId"
                  name="ownerUserId"
                  value={formData.ownerUserId}
                  onChange={(event) => handleOwnerUserChange(event.target.value)}
                  disabled={!canCreateDokumen || isLoading || isOwnershipLoading}
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
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Kosongkan jika dokumen milik akun yang sedang menginput.
                </p>
              </div>

              <div>
                <label
                  htmlFor="ownerDivisionId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Divisi Pemilik
                </label>
                <SetupSelect
                  id="ownerDivisionId"
                  name="ownerDivisionId"
                  value={formData.ownerDivisionId}
                  onChange={handleChange}
                  disabled={
                    !canCreateDokumen ||
                    isLoading ||
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
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Jika PIC dipilih, divisi mengikuti data user tersebut.
                </p>
              </div>
            </div>

            <RelatedUsersPicker
              selectedIds={formData.relatedUserIds}
              excludeUserId={formData.ownerUserId}
              disabled={!canCreateDokumen || isLoading}
              isLoading={isOwnershipLoading}
              onToggle={handleRelatedUserToggle}
            />
          </section>

          <div className="border-t border-gray-100" />

          <section className="space-y-6">
            <InputDokumenSectionTitle
              title="Detail Dokumen"
              description="Isi identitas dokumen yang akan tampil di daftar arsip digital."
            />

            <div>
              <label
                htmlFor="namaDokumen"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nama Dokumen <span className="text-red-500">*</span>
              </label>
              <SetupTextInput
                id="namaDokumen"
                name="namaDokumen"
                value={formData.namaDokumen}
                onChange={handleChange}
                placeholder="Masukkan nama dokumen"
                required
                disabled={!canCreateDokumen || isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="keterangan"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Keterangan
              </label>
              <SetupTextarea
                id="keterangan"
                name="keterangan"
                value={formData.keterangan}
                onChange={handleChange}
                rows={4}
                placeholder="Tambahkan catatan singkat jika diperlukan"
                className="resize-none"
                disabled={!canCreateDokumen || isLoading}
              />
            </div>

            {canReadDebtors ? (
              <div>
                <label
                  htmlFor="debtorId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Debitur Terkait
                </label>
                <SetupSelect
                  id="debtorId"
                  name="debtorId"
                  value={formData.debtorId}
                  onChange={handleChange}
                  disabled={!canCreateDokumen || isLoading || isDebtorLoading}
                >
                  <option value="">
                    {isDebtorLoading
                      ? "Memuat debitur..."
                      : "Tidak dikaitkan dengan debitur"}
                  </option>
                  {debtors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.debtor_number ? ` (${item.debtor_number})` : ""}
                      {item.branch?.name ? ` - ${item.branch.name}` : ""}
                    </option>
                  ))}
                </SetupSelect>
              </div>
            ) : null}
          </section>

          <div className="border-t border-gray-100" />

          <FileUploadField
            id="arsip-digital-file-input"
            label="File Dokumen"
            file={file}
            inputRef={fileInputRef}
            disabled={!canCreateDokumen || isLoading}
            isDragActive={dragOver}
            title={file ? "Ganti file dokumen" : "Pilih file dokumen"}
            helperText="Pilih file dokumen sebelum menyimpan data arsip."
            onChange={handleFileChange}
            onClear={() => {
              setFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!canCreateDokumen || isLoading) return;
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          />

          <div className="border-t border-gray-100 pt-6 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              className="uiverse-modal-button uiverse-modal-button--neutral"
              onClick={resetForm}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset Form</span>
            </button>
            <button
              type="submit"
              disabled={isLoading || !file || !canCreateDokumen}
              className="uiverse-modal-button uiverse-modal-button--primary"
            >
              {isLoading ? (
                <>
                  <div
                    className="button-spinner uiverse-modal-button__spinner"
                    style={
                      {
                        ["--spinner-size"]: "18px",
                        ["--spinner-border"]: "2px",
                    } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Simpan Dokumen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </DashboardPageShell>
  );
}
