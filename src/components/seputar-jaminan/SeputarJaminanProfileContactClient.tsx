"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Star,
} from "lucide-react";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTablePrimaryText,
  SetupTableSecondaryText,
} from "@/components/ui/SetupDataTable";
import DashboardModal from "@/components/ui/DashboardModal";
import useSeputarJaminanModalScrollLock from "@/components/seputar-jaminan/useSeputarJaminanModalScrollLock";
import FileUploadField from "@/components/ui/FileUploadField";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupState from "@/components/ui/SetupState";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { SjContact, SjMedia, SjProfile } from "@/types/seputar-jaminan.types";
import {
  SJ_PROFILE,
  SjPageHeader,
  SjPrimaryButton,
  SjSecondaryButton,
  SjSection,
  SjStatusBadge,
  readableError,
} from "./SeputarJaminanUI";
import {
  formatSjMediaMeta,
  SJ_PUBLIC_IMAGE_ACCEPT,
  SjMediaPreview,
  validateSjPublicImage,
} from "./SeputarJaminanMedia";

type ProfileForm = {
  display_name: string;
  public_slug: string;
  city_regency: string;
  province: string;
  short_description: string;
  logo_media_id: string;
  logo_file_name: string;
  logo_ready: boolean;
  website_url: string;
};

type ContactForm = {
  label: string;
  phone_e164: string;
};

const EMPTY_PROFILE: ProfileForm = {
  display_name: "",
  public_slug: "",
  city_regency: "",
  province: "",
  short_description: "",
  logo_media_id: "",
  logo_file_name: "",
  logo_ready: false,
  website_url: "",
};

const EMPTY_CONTACT: ContactForm = { label: "", phone_e164: "+62" };

function profileForm(profile: SjProfile | null): ProfileForm {
  if (!profile) return EMPTY_PROFILE;
  return {
    display_name: profile.display_name,
    public_slug: profile.public_slug,
    city_regency: profile.city_regency,
    province: profile.province,
    short_description: profile.short_description,
    logo_media_id: profile.logo_media_id,
    logo_file_name: profile.logo_media_id ? "Logo BPRS tersimpan" : "",
    logo_ready: profile.logo_ready,
    website_url: profile.website_url ?? "",
  };
}

function validateProfile(form: ProfileForm) {
  if (form.display_name.trim().length < 3) return "Nama publik BPRS harus berisi sedikitnya 3 karakter.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.public_slug)) return "Alamat profil hanya boleh memakai huruf kecil, angka, dan tanda hubung.";
  if (form.city_regency.trim().length < 2) return "Isi kota atau kabupaten kantor BPRS.";
  if (form.province.trim().length < 2) return "Isi provinsi kantor BPRS.";
  if (form.short_description.trim().length < 20) return "Deskripsi singkat harus berisi sedikitnya 20 karakter.";
  if (!form.logo_media_id) return "Unggah logo BPRS untuk website publik.";
  if (form.website_url && !/^https:\/\//i.test(form.website_url)) return "Alamat website harus diawali https://";
  return null;
}

function validateContact(form: ContactForm) {
  if (form.label.trim().length < 2) return "Nama kontak harus berisi sedikitnya 2 karakter.";
  if (!/^\+[1-9][0-9]{7,14}$/.test(form.phone_e164.trim())) return "Nomor WhatsApp harus memakai format internasional, misalnya +6281234567890.";
  return null;
}

export default function SeputarJaminanProfileContactClient() {
  const [profile, setProfile] = useState<SjProfile | null>(null);
  const [contacts, setContacts] = useState<SjContact[]>([]);
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState<SjContact | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<"profile-save" | "profile-submit" | "contact-save" | null>(null);
  const saving = savingAction !== null;
  const [uploading, setUploading] = useState(false);
  useSeputarJaminanModalScrollLock(contactModalOpen);
  const [logoMedia, setLogoMedia] = useState<SjMedia | null>(null);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useAppToast();
  const access = useProtectedAction();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextContacts, availableLogos] = await Promise.all([
        seputarJaminanService.getProfile(),
        seputarJaminanService.getContacts(),
        seputarJaminanService.getMedia("BPRS_PUBLIC_MARK").catch(() => []),
      ]);
      setProfile(nextProfile);
      setForm(profileForm(nextProfile));
      setContacts(nextContacts);
      setLogoMedia(
        nextProfile
          ? availableLogos.find((media) => media.id === nextProfile.logo_media_id) ?? null
          : null,
      );
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadLogo = async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;
    setLogoUploadFile(file);
    setLogoUploadError(null);
    setUploading(true);
    try {
      const media = await seputarJaminanService.uploadMedia(file, "BPRS_PUBLIC_MARK");
      setForm((current) => ({
        ...current,
        logo_media_id: media.id,
        logo_file_name: media.file_name,
        logo_ready: media.central_ready,
      }));
      setLogoMedia(media);
      setLogoUploadFile(null);
      showToast("Logo berhasil disimpan dan akan diperiksa oleh sistem.", "success");
    } catch (uploadError) {
      const message = readableError(uploadError);
      setLogoUploadError(message);
      showToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!access.ensureCapability(SJ_PROFILE, "update")) return;
    const validationMessage = validateProfile(form);
    if (validationMessage) {
      showToast(validationMessage, "warning");
      return;
    }
    setSavingAction("profile-save");
    try {
      await seputarJaminanService.saveProfile({
        ...(profile ? { expected_version: profile.lock_version } : {}),
        display_name: form.display_name.trim(),
        public_slug: form.public_slug.trim(),
        city_regency: form.city_regency.trim(),
        province: form.province.trim(),
        short_description: form.short_description.trim(),
        logo_media_id: form.logo_media_id,
        website_url: form.website_url.trim() || null,
      });
      showToast("Draf profil BPRS berhasil disimpan.", "success");
      await load();
    } catch (saveError) {
      showToast(readableError(saveError), "error");
    } finally {
      setSavingAction(null);
    }
  };

  const submitProfile = async () => {
    if (!profile || !access.ensureCapability(SJ_PROFILE, "update")) return;
    setSavingAction("profile-submit");
    try {
      await seputarJaminanService.profileCommand("submit", profile.lock_version);
      showToast("Profil BPRS diajukan untuk diperiksa.", "success");
      await load();
    } catch (submitError) {
      showToast(readableError(submitError), "error");
    } finally {
      setSavingAction(null);
    }
  };

  const openContact = (contact?: SjContact) => {
    const capability = contact ? "update" : "create";
    if (!access.ensureCapability(SJ_PROFILE, capability)) return;
    setEditingContact(contact ?? null);
    setContactForm(contact ? { label: contact.label, phone_e164: contact.phone_e164 } : EMPTY_CONTACT);
    setContactModalOpen(true);
  };

  const saveContact = async () => {
    const validationMessage = validateContact(contactForm);
    if (validationMessage) {
      showToast(validationMessage, "warning");
      return;
    }
    setSavingAction("contact-save");
    try {
      if (editingContact) {
        await seputarJaminanService.updateContact(editingContact.id, {
          expected_version: editingContact.lock_version,
          label: contactForm.label.trim(),
          phone_e164: contactForm.phone_e164.trim(),
        });
        showToast("Draf kontak berhasil diperbarui.", "success");
      } else {
        await seputarJaminanService.createContact({
          label: contactForm.label.trim(),
          phone_e164: contactForm.phone_e164.trim(),
        });
        showToast("Kontak WhatsApp berhasil dibuat.", "success");
      }
      setContactModalOpen(false);
      await load();
    } catch (saveError) {
      showToast(readableError(saveError), "error");
    } finally {
      setSavingAction(null);
    }
  };

  const contactCommand = async (contact: SjContact, command: "submit" | "set-default") => {
    if (!access.ensureCapability(SJ_PROFILE, "update")) return;
    setBusyContactId(contact.id);
    try {
      await seputarJaminanService.contactCommand(contact.id, command, contact.lock_version);
      showToast(command === "submit" ? "Kontak diajukan untuk diperiksa." : "Kontak utama berhasil dipilih.", "success");
      await load();
    } catch (commandError) {
      showToast(readableError(commandError), "error");
    } finally {
      setBusyContactId(null);
    }
  };

  return (
    <DashboardPageShell spacing="lg" animated>
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Profil BPRS & kontak"
        description="Atur identitas publik BPRS dan daftar nomor WhatsApp marketing. Satu nomor dapat digunakan oleh beberapa katalog."
        icon={Building2}
        action={<SjSecondaryButton loading={loading} onClick={() => void load()}>{!loading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}Muat ulang</SjSecondaryButton>}
      />

      {loading ? <SetupState variant="loading" title="Memuat profil dan kontak…" /> : error ? <SetupState variant="error" title="Profil dan kontak belum dapat dimuat" description={error} /> : (
        <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
          <SjSection title="Identitas publik BPRS" description="Informasi ini akan muncul pada halaman BPRS di Seputar Jaminan.">
            <div className="space-y-6 p-5 sm:p-6">
              <SetupFormSection
                title="Logo publik BPRS"
                description="Gunakan logo resmi dengan latar bersih agar mudah dikenali pada katalog publik."
                contentClassName="md:grid-cols-[9rem_minmax(0,1fr)] md:items-start"
              >
                {form.logo_media_id ? (
                  <figure className="min-w-0 space-y-3">
                    <SjMediaPreview
                      mediaId={form.logo_media_id}
                      alt={`Logo publik ${form.display_name || "BPRS"}`}
                      fit="contain"
                      className="aspect-square w-full border border-slate-200 bg-white"
                    />
                    <figcaption className="min-w-0">
                      <p className="break-all text-sm font-bold leading-5 text-slate-950">
                        {logoMedia?.file_name || form.logo_file_name}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        {logoMedia
                          ? formatSjMediaMeta(logoMedia)
                          : form.logo_ready
                            ? "Gambar · siap digunakan"
                            : "Gambar · menunggu pemeriksaan dan sinkronisasi"}
                      </p>
                    </figcaption>
                  </figure>
                ) : null}

                <div className={`min-w-0 space-y-4 ${form.logo_media_id ? "" : "md:col-span-2"}`}>
                  <FileUploadField
                    id="sj-profile-logo-upload"
                    accept={SJ_PUBLIC_IMAGE_ACCEPT}
                    disabled={uploading}
                    required
                    file={logoUploadFile}
                    fileName={logoUploadFile?.name ?? logoMedia?.file_name ?? (form.logo_file_name || null)}
                    fileMeta={
                      uploading
                        ? "Sedang menyimpan logo…"
                        : logoMedia
                          ? formatSjMediaMeta(logoMedia)
                          : "JPG, PNG, atau WebP · maksimal 10 MB"
                    }
                    label="Pilih file logo"
                    title={form.logo_media_id ? "Ganti logo" : "Pilih logo"}
                    description="Klik area ini atau drag & drop logo JPG, PNG, atau WebP"
                    validateFile={validateSjPublicImage}
                    onValidationError={setLogoUploadError}
                    onChange={(event) => {
                      setLogoUploadError(null);
                      void uploadLogo(event.target.files);
                    }}
                  />

                  {uploading ? (
                    <div className="space-y-2" aria-live="polite">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                        <span>Menyimpan logo</span>
                        <span>Mohon tunggu</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Kemajuan unggah logo BPRS">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-600 motion-reduce:animate-none" />
                      </div>
                    </div>
                  ) : null}

                  {logoUploadError ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                      <div>
                        <p className="text-sm font-bold text-rose-900">Logo belum berhasil diunggah</p>
                        <p className="mt-1 text-sm leading-6 text-rose-800">{logoUploadError}</p>
                      </div>
                      {logoUploadFile ? (
                        <SjSecondaryButton
                          disabled={uploading}
                          onClick={() => void uploadLogo([logoUploadFile])}
                        >
                          <RefreshCw className="size-4" aria-hidden="true" />
                          Coba lagi
                        </SjSecondaryButton>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </SetupFormSection>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-700">Nama publik BPRS <span className="text-rose-600">*</span><SetupTextInput minLength={3} maxLength={160} value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} /></label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Alamat profil <span className="text-rose-600">*</span><SetupTextInput maxLength={120} value={form.public_slug} onChange={(event) => setForm((current) => ({ ...current, public_slug: event.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="contoh-bprs" /><span className="block text-sm font-normal leading-5 text-slate-500">Akan digunakan pada alamat halaman BPRS.</span></label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Kota/Kabupaten <span className="text-rose-600">*</span><SetupTextInput maxLength={120} value={form.city_regency} onChange={(event) => setForm((current) => ({ ...current, city_regency: event.target.value }))} /></label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Provinsi <span className="text-rose-600">*</span><SetupTextInput maxLength={120} value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} /></label>
              </div>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">Deskripsi singkat <span className="text-rose-600">*</span><SetupTextarea rows={5} minLength={20} maxLength={500} value={form.short_description} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} placeholder="Ceritakan profil singkat dan wilayah layanan BPRS tanpa informasi internal." /></label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">Website resmi <span className="font-normal text-slate-600">(opsional)</span><SetupTextInput type="url" maxLength={500} value={form.website_url} onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value }))} placeholder="https://…" /></label>

              {profile?.rejection_reason ? <SetupState variant="error" title="Profil perlu diperbaiki" description={profile.rejection_reason} /> : null}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2">{profile ? <SjStatusBadge state={profile.state} /> : null}{profile ? <SjStatusBadge state={profile.sync_state} kind="sync" /> : null}</div><div className="flex flex-wrap gap-2">{profile?.state === "DRAFT" ? <SjSecondaryButton loading={savingAction === "profile-save"} disabled={uploading || saving} onClick={() => void saveProfile()}><Pencil className="size-4" aria-hidden="true" />Simpan draf</SjSecondaryButton> : <SjPrimaryButton loading={savingAction === "profile-save"} disabled={uploading || saving || profile?.state === "IN_REVIEW"} onClick={() => void saveProfile()}><Pencil className="size-4" aria-hidden="true" />Simpan draf</SjPrimaryButton>}{profile && profile.state === "DRAFT" ? <SjPrimaryButton loading={savingAction === "profile-submit"} disabled={saving} onClick={() => void submitProfile()}><Send className="size-4" aria-hidden="true" />Ajukan pemeriksaan</SjPrimaryButton> : null}</div></div>
            </div>
          </SjSection>

          <SjSection title="Kontak WhatsApp marketing" description="Pilih kontak berbeda untuk setiap katalog atau gunakan satu kontak pada beberapa katalog." action={<SjPrimaryButton onClick={() => openContact()}><Plus className="size-4" aria-hidden="true" />Tambah kontak</SjPrimaryButton>}>
            <SetupDataTable variant="crud" density="compact" className="[table-layout:fixed]" aria-label="Daftar kontak WhatsApp marketing">
              <SetupDataTableColGroup>
                <SetupDataTableCol className="w-[32%]" />
                <SetupDataTableCol className="w-[22%]" />
                <SetupDataTableCol className="w-[20%]" />
                <SetupDataTableCol className="w-[26%]" />
              </SetupDataTableColGroup>
              <SetupDataTableHead>
                <SetupDataTableRow>
                  <SetupDataTableHeaderCell>Kontak</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nomor</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className="text-center">Aksi</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {contacts.length === 0 ? (
                  <SetupDataTableEmptyRow
                    colSpan={4}
                    icon={MessageCircle}
                    description="Tambahkan nomor marketing sebelum membuat katalog."
                  >
                    Belum ada kontak WhatsApp
                  </SetupDataTableEmptyRow>
                ) : contacts.map((contact) => (
                  <SetupDataTableRow key={contact.id}>
                    <SetupDataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <SetupTablePrimaryText>{contact.label}</SetupTablePrimaryText>
                        {contact.is_default ? <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700"><Star className="size-3.5 fill-current" aria-hidden="true" />Utama</span> : null}
                      </div>
                      <SetupTableSecondaryText className="mt-1">Dapat digunakan pada beberapa katalog</SetupTableSecondaryText>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <span className="text-sm font-semibold text-slate-700">Berakhir {contact.phone_e164.slice(-4)}</span>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <SjStatusBadge state={contact.state} />
                      {contact.rejection_reason ? <p className="mt-2 text-sm leading-5 text-rose-700">{contact.rejection_reason}</p> : null}
                    </SetupDataTableCell>
                    <SetupDataTableCell className="text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <SjSecondaryButton disabled={contact.state === "IN_REVIEW" || busyContactId === contact.id} onClick={() => openContact(contact)}><Pencil className="size-4" aria-hidden="true" />Ubah</SjSecondaryButton>
                        {contact.state === "DRAFT" ? <SjPrimaryButton loading={busyContactId === contact.id} onClick={() => void contactCommand(contact, "submit")}><Send className="size-4" aria-hidden="true" />Ajukan</SjPrimaryButton> : null}
                        {contact.state === "VERIFIED" && !contact.is_default ? <SjSecondaryButton disabled={busyContactId === contact.id} onClick={() => void contactCommand(contact, "set-default")}><CheckCircle2 className="size-4" aria-hidden="true" />Jadikan utama</SjSecondaryButton> : null}
                      </div>
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}
              </SetupDataTableBody>
            </SetupDataTable>
          </SjSection>
        </div>
      )}

      <DashboardModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        closeDisabled={saving}
        maxWidth="md"
        title={editingContact ? "Perbarui kontak WhatsApp" : "Tambah kontak WhatsApp"}
        description="Nomor yang sama dapat dipilih pada beberapa katalog setelah selesai diverifikasi."
        footer={<><SjSecondaryButton disabled={saving} onClick={() => setContactModalOpen(false)}>Batal</SjSecondaryButton><SjPrimaryButton loading={savingAction === "contact-save"} disabled={saving} onClick={() => void saveContact()}>Simpan draf</SjPrimaryButton></>}
      >
        <div className="space-y-5">
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Nama kontak <span className="text-rose-600">*</span><SetupTextInput minLength={2} maxLength={80} value={contactForm.label} onChange={(event) => setContactForm((current) => ({ ...current, label: event.target.value }))} placeholder="Contoh: Marketing Bandung" /></label>
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Nomor WhatsApp <span className="text-rose-600">*</span><SetupTextInput inputMode="tel" value={contactForm.phone_e164} onChange={(event) => setContactForm((current) => ({ ...current, phone_e164: event.target.value.replace(/[\s()-]/g, "") }))} placeholder="+6281234567890" /><span className="block text-sm font-normal leading-5 text-slate-500">Gunakan kode negara. Untuk Indonesia, ganti angka 0 di depan dengan +62.</span></label>
        </div>
      </DashboardModal>
    </DashboardPageShell>
  );
}
