"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Image as ImageIcon,
  Layers3,
  RotateCcw,
  Save,
  Stamp,
  Type,
} from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import FileUploadField from "@/components/ui/FileUploadField";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { SetupSkeletonBlock } from "@/components/ui/SetupSkeleton";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { watermarkService } from "@/services/watermark.service";
import {
  SETUP_PAGE_WIDTH_XL_CLASS,
  SETUP_PARAMETER_PAGE_WIDTH_XL_CLASS,
} from "@/components/ui/setupPageStyles";
import type {
  WatermarkOption,
  WatermarkOptions,
  WatermarkSettings,
  WatermarkSettingsPayload,
} from "@/types/watermark.types";

const PAGE_URL = "/dashboard/parameter/watermark-dokumen";
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const EMPTY_OPTIONS: WatermarkOptions = {
  watermark_types: [],
  positions: [],
  target_modules: [],
  template_tokens: [],
};

type FormState = {
  is_enabled: boolean;
  target_modules: string[];
  watermark_type: string;
  text_template: string;
  text_color: string;
  text_opacity: number;
  font_family: string;
  font_size: number;
  image_opacity: number;
  image_scale: number;
  position: string;
  repeat_pattern: boolean;
  rotation: number;
  spacing_x: number;
  spacing_y: number;
};

const EMPTY_FORM: FormState = {
  is_enabled: false,
  target_modules: [],
  watermark_type: "TEXT",
  text_template: "",
  text_color: "#1F2937",
  text_opacity: 0.16,
  font_family: "Arial",
  font_size: 42,
  image_opacity: 0.16,
  image_scale: 0.35,
  position: "CENTER",
  repeat_pattern: true,
  rotation: -35,
  spacing_x: 280,
  spacing_y: 180,
};

function formFromSettings(settings: WatermarkSettings): FormState {
  return {
    is_enabled: settings.is_enabled,
    target_modules: settings.target_modules,
    watermark_type: settings.watermark_type,
    text_template: settings.text_template ?? "",
    text_color: settings.text_color,
    text_opacity: settings.text_opacity,
    font_family: settings.font_family,
    font_size: settings.font_size,
    image_opacity: settings.image_opacity,
    image_scale: settings.image_scale,
    position: settings.position,
    repeat_pattern: settings.repeat_pattern,
    rotation: settings.rotation,
    spacing_x: settings.spacing_x,
    spacing_y: settings.spacing_y,
  };
}

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

type PreviewContext = {
  username: string;
  division: string;
  date: string;
  time: string;
};

function formatPreviewDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPreviewTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTokenPreview(
  template: string,
  context: PreviewContext,
): string {
  const fallback = "{document_name} - {username} - {date}";
  const source = template.trim() || fallback;

  return source
    .replace(/\{document_name\}/g, "Nama Dokumen")
    .replace(/\{document_number\}/g, "Nomor Dokumen")
    .replace(/\{username\}/g, context.username)
    .replace(/\{division\}/g, context.division)
    .replace(/\{date\}/g, context.date)
    .replace(/\{time\}/g, context.time);
}

function isImageWatermark(type: string): boolean {
  return type === "IMAGE" || type === "TEXT_IMAGE";
}

function isTextWatermark(type: string): boolean {
  return type === "TEXT" || type === "TEXT_IMAGE";
}

function fieldLabel(option: WatermarkOption): string {
  return option.label || option.key;
}

function toCssBackgroundImage(url: string): string {
  return `url("${url.replace(/"/g, '\\"')}")`;
}

export default function SetupWatermarkDokumenPage() {
  const { showToast } = useAppToast();
  const { user } = useAuth();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isApplyingExisting, setIsApplyingExisting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<
    string | null
  >(null);

  const canUpdate = hasCapability(PAGE_URL, "update");
  const options = settings?.options ?? EMPTY_OPTIONS;
  const previewImageUrl = selectedImagePreviewUrl ?? settings?.image_url ?? null;
  const previewContext = useMemo(() => {
    const now = new Date();
    return {
      username: user?.name || user?.username || "Nama User",
      division: user?.division_name || "Divisi",
      date: formatPreviewDate(now),
      time: formatPreviewTime(now),
    };
  }, [user]);
  const previewText = useMemo(
    () => renderTokenPreview(form.text_template, previewContext),
    [form.text_template, previewContext],
  );

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      try {
        setIsFetching(true);
        const nextSettings = await watermarkService.getSettings();
        if (!ignore) {
          setSettings(nextSettings);
          setForm(formFromSettings(nextSettings));
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat konfigurasi watermark",
            "error",
          );
        }
      } finally {
        if (!ignore) {
          setIsFetching(false);
        }
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreviewUrl(null);
      return undefined;
    }

    const nextUrl = URL.createObjectURL(selectedImage);
    setSelectedImagePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [selectedImage]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function toggleTargetModule(key: string, checked: boolean) {
    setForm((prev) => {
      const current = new Set(prev.target_modules);
      if (checked) {
        current.add(key);
      } else {
        current.delete(key);
      }

      return {
        ...prev,
        target_modules: Array.from(current),
      };
    });
  }

  function appendTemplateToken(token: string) {
    if (!canUpdate) return;
    setForm((prev) => ({
      ...prev,
      text_template: [prev.text_template.trim(), token]
        .filter(Boolean)
        .join(" "),
    }));
  }

  async function handleSave() {
    if (
      !ensureCapability(PAGE_URL, "update", {
        message: "Role Anda belum memiliki izin update konfigurasi watermark.",
      })
    ) {
      return;
    }

    if (form.target_modules.length === 0) {
      showToast("Pilih minimal satu target modul.", "warning");
      return;
    }

    if (isTextWatermark(form.watermark_type) && !form.text_template.trim()) {
      showToast("Template teks watermark wajib diisi.", "warning");
      return;
    }

    if (isUploading || isDeletingImage) {
      showToast("Tunggu proses gambar watermark selesai.", "warning");
      return;
    }

    if (isImageWatermark(form.watermark_type) && !settings?.image_url) {
      showToast("Pilih gambar watermark dulu.", "warning");
      return;
    }

    const payload: WatermarkSettingsPayload = {
      is_enabled: form.is_enabled,
      target_modules: form.target_modules,
      watermark_type: form.watermark_type,
      text_template: form.text_template.trim() || null,
      text_color: form.text_color,
      text_opacity: form.text_opacity,
      font_family: form.font_family.trim() || "Arial",
      font_size: form.font_size,
      image_opacity: form.image_opacity,
      image_scale: form.image_scale,
      position: form.position,
      repeat_pattern: form.repeat_pattern,
      rotation: form.rotation,
      spacing_x: form.spacing_x,
      spacing_y: form.spacing_y,
    };

    setIsSaving(true);
    try {
      const updated = await watermarkService.updateSettings(payload);
      setSettings(updated);
      setForm(formFromSettings(updated));
      showToast("Konfigurasi watermark disimpan.", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan konfigurasi watermark",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApplyExistingFiles() {
    if (
      !ensureCapability(PAGE_URL, "update", {
        message: "Role Anda belum memiliki izin update konfigurasi watermark.",
      })
    ) {
      return;
    }

    setIsApplyingExisting(true);
    try {
      const result = await watermarkService.applyExistingFiles();
      showToast(
        `${result.scheduled_count} file existing masuk antrian watermark.`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memproses watermark file existing",
        "error",
      );
    } finally {
      setIsApplyingExisting(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setSelectedImage(null);
      event.target.value = "";
      showToast("Format gambar harus PNG, JPG, atau JPEG.", "warning");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setSelectedImage(null);
      event.target.value = "";
      showToast("Ukuran gambar maksimal 2MB.", "warning");
      return;
    }

    if (
      !ensureCapability(PAGE_URL, "update", {
        message: "Role Anda belum memiliki izin update konfigurasi watermark.",
      })
    ) {
      return;
    }

    setSelectedImage(file);
    setIsUploading(true);
    try {
      const updated = await watermarkService.uploadImage(file);
      setSettings(updated);
      setForm(formFromSettings(updated));
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast("Gambar watermark disimpan.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal upload gambar watermark",
        "error",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteImage() {
    if (
      !ensureCapability(PAGE_URL, "update", {
        message: "Role Anda belum memiliki izin update konfigurasi watermark.",
      })
    ) {
      return;
    }

    setIsDeletingImage(true);
    try {
      const updated = await watermarkService.deleteImage();
      setSettings(updated);
      setForm(formFromSettings(updated));
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast("Gambar watermark dihapus.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus gambar watermark",
        "error",
      );
    } finally {
      setIsDeletingImage(false);
    }
  }

  function resetForm() {
    if (!settings) return;
    setForm(formFromSettings(settings));
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClearImage() {
    if (selectedImage) {
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (settings?.image_url) {
      void handleDeleteImage();
    }
  }

  const previewItems = form.repeat_pattern
    ? Array.from({ length: 9 }, (_, index) => index)
    : [0];
  const imageFileName =
    selectedImage?.name ?? settings?.image_original_name ?? null;
  const imageFileMeta = isUploading
    ? "Mengupload gambar..."
    : isDeletingImage
      ? "Menghapus gambar..."
      : selectedImage
        ? formatBytes(selectedImage.size)
        : settings?.image_url
          ? formatBytes(settings.image_size_bytes ?? null)
          : "PNG atau JPG maksimal 2 MB";
  const imageUploadTitle =
    selectedImage || settings?.image_url
      ? "Ganti gambar watermark"
      : "Pilih gambar watermark";
  const imageUploadDescription = isUploading
    ? "Gambar sedang diupload"
    : "Klik area ini untuk memilih file";

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Watermark Dokumen"
        subtitle="Konfigurasi watermark file dokumen."
        icon={<Stamp />}
        className={SETUP_PAGE_WIDTH_XL_CLASS}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={
                isFetching ||
                isUploading ||
                isDeletingImage ||
                isApplyingExisting ||
                !settings
              }
              className="uiverse-modal-button uiverse-modal-button--neutral w-full justify-center sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => void handleApplyExistingFiles()}
              disabled={
                !canUpdate ||
                isFetching ||
                isSaving ||
                isUploading ||
                isDeletingImage ||
                isApplyingExisting
              }
              className="uiverse-modal-button uiverse-modal-button--neutral w-full justify-center sm:w-auto"
            >
              {isApplyingExisting ? (
                <div
                  className="button-spinner uiverse-modal-button__spinner"
                  style={
                    {
                      ["--spinner-size"]: "18px",
                      ["--spinner-border"]: "2px",
                    } as React.CSSProperties
                  }
                  aria-hidden="true"
                />
              ) : (
                <Layers3 className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Proses File Existing</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                !canUpdate ||
                isFetching ||
                isSaving ||
                isUploading ||
                isDeletingImage ||
                isApplyingExisting
              }
              className="uiverse-modal-button uiverse-modal-button--primary w-full justify-center sm:w-auto"
            >
              {isSaving ? (
                <>
                  <div
                    className="button-spinner uiverse-modal-button__spinner"
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
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Simpan</span>
                </>
              )}
            </button>
          </div>
        }
      />

      <div
        className={`grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px] ${SETUP_PARAMETER_PAGE_WIDTH_XL_CLASS}`}
      >
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <UiverseCheckbox
                  checked={form.is_enabled}
                  disabled={!canUpdate || isFetching}
                  onCheckedChange={(checked) =>
                    updateForm("is_enabled", checked)
                  }
                  label={
                    <span className="text-sm font-semibold text-gray-900">
                      Watermark aktif
                    </span>
                  }
                />
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-900">
                  Tipe Watermark
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.watermark_types.map((option) => {
                    const isActive = form.watermark_type === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        disabled={!canUpdate || isFetching}
                        onClick={() => updateForm("watermark_type", option.key)}
                        aria-pressed={isActive}
                        className={`uiverse-modal-button watermark-type-button ${
                          isActive
                            ? "watermark-type-button--active"
                            : "uiverse-modal-button--neutral"
                        }`}
                      >
                        {fieldLabel(option)}
                      </button>
                    );
                  })}
                  {options.watermark_types.length === 0 && (
                    isFetching ? (
                      <>
                        <SetupSkeletonBlock className="h-11 w-28" />
                        <SetupSkeletonBlock className="h-11 w-32" />
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Tipe belum tersedia.
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-slate-900" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">Target Modul</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {options.target_modules.map((option) => (
                <div
                  key={option.key}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <UiverseCheckbox
                    checked={form.target_modules.includes(option.key)}
                    disabled={!canUpdate || isFetching}
                    onCheckedChange={(checked) =>
                      toggleTargetModule(option.key, checked)
                    }
                    label={
                      <span className="text-sm font-semibold text-gray-900">
                        {fieldLabel(option)}
                      </span>
                    }
                  />
                </div>
              ))}
              {options.target_modules.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 md:col-span-2">
                  {isFetching ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <SetupSkeletonBlock className="h-5 w-48" />
                      <SetupSkeletonBlock className="h-5 w-40" />
                    </div>
                  ) : (
                    "Target modul belum tersedia."
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Type className="h-5 w-5 text-slate-900" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">Teks</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Template Teks
                </label>
                <SetupTextarea
                  value={form.text_template}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("text_template", event.target.value)
                  }
                  className="min-h-24 resize-none"
                />
                {options.template_tokens.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {options.template_tokens.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        disabled={!canUpdate || isFetching}
                        onClick={() => appendTemplateToken(option.key)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                      >
                        {option.key}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Warna Teks
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.text_color}
                    disabled={!canUpdate || isFetching}
                    onChange={(event) =>
                      updateForm("text_color", event.target.value)
                    }
                    className="h-11 w-14 rounded-lg border border-gray-200 bg-white p-1"
                  />
                  <SetupTextInput
                    value={form.text_color}
                    disabled={!canUpdate || isFetching}
                    onChange={(event) =>
                      updateForm("text_color", event.target.value)
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Font
                </label>
                <SetupTextInput
                  value={form.font_family}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("font_family", event.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Opacity Teks: {Math.round(form.text_opacity * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.text_opacity}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("text_opacity", Number(event.target.value))
                  }
                  className="w-full accent-[#1773B0]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Ukuran Font
                </label>
                <SetupTextInput
                  type="number"
                  min={8}
                  max={200}
                  value={form.font_size}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("font_size", Number(event.target.value))
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-slate-900" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">Gambar</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-lg border border-gray-200 p-4">
                <FileUploadField
                  id="watermark-image-upload"
                  label={null}
                  required={false}
                  inputRef={fileInputRef}
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  disabled={!canUpdate || isFetching || isUploading || isDeletingImage}
                  onChange={handleImageChange}
                  onClear={handleClearImage}
                  fileName={imageFileName}
                  fileMeta={imageFileMeta}
                  title={imageUploadTitle}
                  description={imageUploadDescription}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
                  {previewImageUrl ? (
                    <div
                      aria-label="Watermark"
                      className="h-20 w-full bg-contain bg-center bg-no-repeat"
                      style={{
                        backgroundImage: toCssBackgroundImage(previewImageUrl),
                      }}
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-gray-900">
                  {selectedImage?.name ||
                    settings?.image_original_name ||
                    "Belum ada gambar"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedImage
                    ? formatBytes(selectedImage.size)
                    : formatBytes(settings?.image_size_bytes ?? null)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Opacity Gambar: {Math.round(form.image_opacity * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.image_opacity}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("image_opacity", Number(event.target.value))
                  }
                  className="w-full accent-[#1773B0]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Skala Gambar: {Math.round(form.image_scale * 100)}%
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={2}
                  step={0.01}
                  value={form.image_scale}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("image_scale", Number(event.target.value))
                  }
                  className="w-full accent-[#1773B0]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-slate-900" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">Posisi</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <label className="block w-full max-w-[320px]">
                <span className="text-sm font-medium text-gray-700">
                  Posisi
                </span>
                <SetupSelect
                  value={form.position}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) => updateForm("position", event.target.value)}
                  className="mt-0.5"
                >
                  {options.positions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {fieldLabel(option)}
                    </option>
                  ))}
                </SetupSelect>
              </label>

              <div className="rounded-lg border border-gray-200 p-4">
                <UiverseCheckbox
                  checked={form.repeat_pattern}
                  disabled={!canUpdate || isFetching}
                  onCheckedChange={(checked) =>
                    updateForm("repeat_pattern", checked)
                  }
                  label={
                    <span className="text-sm font-semibold text-gray-900">
                      Pola berulang
                    </span>
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Rotasi: {form.rotation} derajat
                </label>
                <input
                  type="range"
                  min={-360}
                  max={360}
                  step={1}
                  value={form.rotation}
                  disabled={!canUpdate || isFetching}
                  onChange={(event) =>
                    updateForm("rotation", Number(event.target.value))
                  }
                  className="w-full accent-[#1773B0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Jarak X
                  </label>
                  <SetupTextInput
                    type="number"
                    min={80}
                    max={1200}
                    value={form.spacing_x}
                    disabled={!canUpdate || isFetching}
                    onChange={(event) =>
                      updateForm("spacing_x", Number(event.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Jarak Y
                  </label>
                  <SetupTextInput
                    type="number"
                    min={80}
                    max={1200}
                    value={form.spacing_y}
                    disabled={!canUpdate || isFetching}
                    onChange={(event) =>
                      updateForm("spacing_y", Number(event.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Preview</h2>
              <SetupStatusBadge status={form.is_enabled ? "Aktif" : "Nonaktif"} />
            </div>
            <div className="relative h-[520px] overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="absolute inset-0 bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] bg-[size:32px_32px]" />
              <div className="absolute inset-x-8 top-8 space-y-4 text-gray-800">
                <div className="h-5 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-11/12 rounded bg-gray-100" />
                <div className="h-3 w-4/5 rounded bg-gray-100" />
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="h-24 rounded border border-gray-100 bg-gray-50" />
                  <div className="h-24 rounded border border-gray-100 bg-gray-50" />
                </div>
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-10/12 rounded bg-gray-100" />
              </div>

              <div
                className={`absolute inset-0 ${
                  form.repeat_pattern
                    ? "grid grid-cols-3 grid-rows-3 place-items-center"
                    : "flex items-center justify-center"
                }`}
              >
                {previewItems.map((item) => (
                  <div
                    key={item}
                    className="flex max-w-[240px] flex-col items-center justify-center gap-2 text-center"
                    style={{
                      transform: `rotate(${form.rotation}deg)`,
                    }}
                  >
                    {isImageWatermark(form.watermark_type) &&
                      previewImageUrl && (
                        <span
                          aria-hidden="true"
                          className="block bg-contain bg-center bg-no-repeat"
                          style={{
                            width: `${Math.max(24, form.image_scale * 160)}px`,
                            height: `${Math.max(24, form.image_scale * 160)}px`,
                            opacity: form.image_opacity,
                            backgroundImage: toCssBackgroundImage(
                              previewImageUrl,
                            ),
                          }}
                        />
                      )}
                    {isTextWatermark(form.watermark_type) && (
                      <span
                        className="break-words font-bold"
                        style={{
                          color: form.text_color,
                          fontFamily: form.font_family,
                          fontSize: `${Math.min(form.font_size, 48)}px`,
                          opacity: form.text_opacity,
                        }}
                      >
                        {previewText}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </DashboardPageShell>
  );
}
