"use client";
import SeputarJaminanObservation from './SeputarJaminanObservation';
import { SjContactContext, SjContactDetails, SjProfilePreparation } from './SeputarJaminanProfileContext';
import { SjProfileVersions, SjWorkflowSummary } from './SeputarJaminanWorkflow';
import { sjAction, sjEntryAction, sjEntryButton } from './actionAvailability';
import SjRecordActions from './SjRecordActions';
import useDiscardChanges from './useDiscardChanges';
import useSjSaveOperation from './useSjSaveOperation';
import useSjListQuery from './useSjListQuery';
import SetupSearchInput from '@/components/ui/SetupSearchInput';

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Star,
} from "lucide-react";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import DashboardNotice from "@/components/ui/DashboardNotice";
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
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupState from "@/components/ui/SetupState";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { SjContact, SjMedia, SjProfile, SjSettings } from "@/types/seputar-jaminan.types";
import {
  SJ_CONTACTS,
  SJ_PROFILE,
  SjPageHeader,
  SjPrimaryButton,
  SjSecondaryButton,
  SjSection,
  readableError,
} from "./SeputarJaminanUI";
import {
  formatSjMediaMeta,
  SJ_PUBLIC_IMAGE_ACCEPT,
  SjMediaPreview,
  validateSjPublicImage,
} from "./SeputarJaminanMedia";
import SeputarJaminanChangeRequestModal, {
  type SjChangeRequestTarget,
} from "./SeputarJaminanChangeRequestModal";

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

function invalidProfileField(form: ProfileForm) {
  if (form.display_name.trim().length < 3) return 'name';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.public_slug)) return 'slug';
  if (form.city_regency.trim().length < 2) return 'city';
  if (form.province.trim().length < 2) return 'province';
  if (form.short_description.trim().length < 20) return 'description';
  if (!form.logo_media_id) return 'logo-upload';
  return 'website';
}

function validateContact(form: ContactForm) {
  if (form.label.trim().length < 2) return "Nama kontak harus berisi sedikitnya 2 karakter.";
  if (!/^\+[1-9][0-9]{7,14}$/.test(form.phone_e164.trim())) return "Nomor WhatsApp harus memakai format internasional, misalnya +6281234567890.";
  return null;
}

export default function SeputarJaminanProfileContactClient({
  view,
}: {
  view: "profile" | "contacts";
}) {
  const [profile, setProfile] = useState<SjProfile | null>(null);
  const [contacts, setContacts] = useState<SjContact[]>([]);
  const [contactCursor,setContactCursor]=useState<string|null>(null);
  const [loadingMore,setLoadingMore]=useState(false);
  const [moreError,setMoreError]=useState<string|null>(null);
  const [settings, setSettings] = useState<SjSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(view === 'contacts');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settledContactSearch, setSettledContactSearch] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState<SjContact | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const {params: query, update: updateQuery} = useSjListQuery();
  const detailContactId = view === 'contacts' ? query.get('detail') : null;
  const contactSearch = view === 'contacts' ? query.get('search') ?? '' : '';
  const setDetailContactId = (id: string | null) => updateQuery({detail: id ?? '', edit: ''});
  const [contactDetail, setContactDetail] = useState<SjContact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<{title: string; description: string; retry: boolean} | null>(null);
  const [detailReload, setDetailReload] = useState(0);
  const detailContact = contactDetail?.id === detailContactId && !detailLoading && !detailError ? contactDetail : null;
  const wantsContactEdit = query.get('edit') === '1';
  const openedRevision = useRef<string | null>(null);
  const [changeRequestTarget, setChangeRequestTarget] = useState<SjChangeRequestTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<"profile-save" | "profile-submit" | "contact-save" | null>(null);
  const saving = savingAction !== null;
  const [submittingForm,setSubmittingForm] = useState(false);
  const saveOperation = useSjSaveOperation();
  const focusSaveError = useRef(false);
  useEffect(() => {
    if (!saving && editorError && focusSaveError.current) {
      const errorElement = document.getElementById('sj-save-error');
      if (errorElement) {
        focusSaveError.current = false;
        errorElement.focus();
        errorElement.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      }
    }
  }, [saving, editorError]);
  const [uploading, setUploading] = useState(false);
  useSeputarJaminanModalScrollLock(contactModalOpen || detailContactId !== null);
  const [logoMedia, setLogoMedia] = useState<SjMedia | null>(null);
  const savedLogoMedia = useRef<SjMedia | null>(null);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const settingsSequence = useRef(0);
  const moreSequence = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contactReadStarted = useRef(false);
  const activeView = useRef<'profile' | 'contacts' | null>(view);
  const contactsPending = view === 'contacts' && (loading || settledContactSearch !== contactSearch);
  const contactActionsReady = !settingsLoading && settings !== null;
  const profileActionsRef = useRef<HTMLDivElement>(null);
  const wasProfileEditing = useRef(false);
  const { showToast } = useAppToast();
  const access = useProtectedAction();
  const contactGuard = useDiscardChanges(contactModalOpen, contactForm, () => setContactModalOpen(false), saving || saveOperation.uncertain);
  const profileGuard = useDiscardChanges(profileEditing, form, () => setProfileEditing(false), saving || uploading || saveOperation.uncertain);
  const canSubmitForm = (path:string) => (view !== 'contacts' || contactActionsReady) && access.hasCapability(path,'update') && Boolean(settings?.review_enabled)
    && (settings?.review_authority !== 'central' || Boolean(settings.review_submission_ready));
  useEffect(() => {
    if (!detailContactId) { openedRevision.current = null; return; }
    let cancelled = false;
    const read = async () => {
      setDetailLoading(true); setDetailError(null); setContactDetail(null);
      try {
        const contact = await seputarJaminanService.getContact(detailContactId);
        if (cancelled) return;
        setContactDetail(contact);
        if (wantsContactEdit && openedRevision.current !== detailContactId && sjAction(contact, 'edit_draft').available) {
          openedRevision.current = detailContactId;
          setEditingContact(contact);
          setContactForm({label: contact.label, phone_e164: contact.phone_e164});
          setEditorError(null); setContactModalOpen(true);
        }
      } catch (failure) {
        if (cancelled) return;
        const status = (failure as {statusCode?: number; response?: {status?: number}})?.statusCode
          ?? (failure as {response?: {status?: number}})?.response?.status;
        setDetailError(status === 404
          ? {title: 'Kontak tidak ditemukan', description: 'Kontak tidak ada atau tidak dapat diakses dengan akun ini.', retry: false}
          : status === 403 ? {title: 'Akses kontak dibatasi', description: 'Akun ini belum memiliki izin untuk membuka kontak.', retry: false}
            : {title: 'Kontak belum dapat dimuat', description: readableError(failure), retry: true});
      } finally { if (!cancelled) setDetailLoading(false); }
    };
    void read();
    return () => { cancelled = true; };
  }, [detailContactId, detailReload, wantsContactEdit]);
  useEffect(() => {
    if (profileEditing) {
      document.getElementById('sj-profile-name')?.focus();
      wasProfileEditing.current = true;
    } else if (wasProfileEditing.current && !loading) {
      profileActionsRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      wasProfileEditing.current = false;
    }
  }, [profileEditing, loading]);
  const ensureAction = (subject: SjProfile | SjContact, name: string) => {
    const action = sjAction(subject, name);
    if (!action.available) showToast(action.reason || 'Tindakan belum tersedia.', 'warning');
    return action.available;
  };

  const loadContactSettings = useCallback(async () => {
    const sequence = ++settingsSequence.current;
    setSettingsLoading(true);
    setSettings(null);
    setSettingsError(null);
    try {
      const nextSettings = await seputarJaminanService.getSettings();
      if (sequence === settingsSequence.current && activeView.current === 'contacts') setSettings(nextSettings);
    } catch (failure) {
      if (sequence === settingsSequence.current && activeView.current === 'contacts') setSettingsError(readableError(failure));
    } finally {
      if (sequence === settingsSequence.current && activeView.current === 'contacts') setSettingsLoading(false);
    }
  }, []);

  const load = useCallback(async (options: {refreshSettings?: boolean; search?: string} = {}) => {
    if (activeView.current !== view) return;
    const refreshSettings = options.refreshSettings !== false;
    const search = options.search ?? new URLSearchParams(window.location.search).get('search') ?? '';
    if (refreshSettings && searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    const sequence = ++loadSequence.current;
    ++moreSequence.current;
    setLoadingMore(false);
    setLoading(true);
    setError(null);
    if (refreshSettings) setActionError(null);
    setMoreError(null);
    const settingsRead = view === 'contacts' && refreshSettings ? loadContactSettings() : Promise.resolve();
    try {
      if (view === "profile") {
        const [nextProfile, nextSettings] = await Promise.all([
          seputarJaminanService.getProfile(),
          seputarJaminanService.getSettings(),
        ]);
        const currentLogo=nextProfile?.logo_media_id?await seputarJaminanService.getMediaRecord(nextProfile.logo_media_id):null;
        if (sequence !== loadSequence.current) return;
        setProfile(nextProfile);
        setForm(profileForm(nextProfile));
        setSettings(nextSettings);
        setLogoMedia(currentLogo);
        savedLogoMedia.current = currentLogo;
      } else {
        setContactCursor(null);
        const nextContacts = await seputarJaminanService.getContactPage({limit:20, ...(search ? {search} : {})});
        if (sequence !== loadSequence.current) return;
        setContacts(nextContacts.items);
        setContactCursor(nextContacts.page_info.next_cursor);
        setSettledContactSearch(search);
      }
    } catch (loadError) {
      if (sequence !== loadSequence.current) return;
      setError(readableError(loadError));
      if (view === 'contacts') setSettledContactSearch(search);
    } finally {
      await settingsRead;
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [view, loadContactSettings]);
  const loadMoreContacts=async()=>{
    if(!contactCursor||loadingMore||contactsPending||error)return;
    const sequence=loadSequence.current, append=++moreSequence.current;
    setLoadingMore(true);setMoreError(null);
    try{const page=await seputarJaminanService.getContactPage({limit:20,cursor:contactCursor,...(contactSearch?{search:contactSearch}:{})});
      if(sequence===loadSequence.current&&append===moreSequence.current){setContacts(rows=>[...rows,...page.items.filter(item=>!rows.some(old=>old.id===item.id))]);setContactCursor(page.page_info.next_cursor);}
    }catch(e){if(sequence===loadSequence.current&&append===moreSequence.current)setMoreError(readableError(e));}
    finally{if(sequence===loadSequence.current&&append===moreSequence.current)setLoadingMore(false);}
  };

  const invalidateLoad = useCallback(() => { ++loadSequence.current; ++moreSequence.current; }, []);
  const invalidateSettings = useCallback(() => { ++settingsSequence.current; }, []);
  useEffect(() => {
    activeView.current = view;
    if (view === 'contacts') void loadContactSettings();
    return () => {
      activeView.current = null;
      invalidateSettings();
      invalidateLoad();
    };
  }, [view, loadContactSettings, invalidateLoad, invalidateSettings]);
  useEffect(() => {
    if (view === 'profile') {
      contactReadStarted.current = false;
      void load();
    } else if (!contactReadStarted.current) {
      contactReadStarted.current = true;
      void load({refreshSettings:false,search:contactSearch});
    } else {
      searchTimer.current = setTimeout(() => {
        searchTimer.current = null;
        void load({refreshSettings:false,search:contactSearch});
      }, 250);
    }
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = null;
      invalidateLoad();
    };
  }, [load, view, contactSearch, invalidateLoad]);

  const uploadLogo = async (files: FileList | File[] | null) => {
    if (saving || uploading) return;
    const allowed=sjEntryAction(settings,'upload_media');
    if(!allowed.available){showToast(allowed.reason!, 'warning');return;}
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

    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (submit = false) => {
    if (saving || uploading || saveOperation.isRunning()) return;
    setEditorError(null);
    if (!access.ensureCapability(SJ_PROFILE, "update")) return;
    if (!profile && !sjEntryAction(settings,'create_profile').available) return;
    if (profile && !ensureAction(profile, 'edit_draft')) return;
    if (submit && !canSubmitForm(SJ_PROFILE)) return;
    const validationMessage = validateProfile(form);
    if (validationMessage) {
      setEditorError(validationMessage);
      document.getElementById(`sj-profile-${invalidProfileField(form)}`)?.focus();
      return;
    }
    setSavingAction("profile-save");
    setSubmittingForm(submit);
    try {
      const result = await saveOperation.run({kind:'PROFILE',intent:submit ? 'SAVE_AND_SUBMIT' : 'SAVE_DRAFT',draft:{
        ...(profile ? { expected_version: profile.lock_version } : {}),
        display_name: form.display_name.trim(),
        public_slug: form.public_slug.trim(),
        city_regency: form.city_regency.trim(),
        province: form.province.trim(),
        short_description: form.short_description.trim(),
        logo_media_id: form.logo_media_id,
        website_url: form.website_url.trim() || null,
      }});
      if (!result) return;
      showToast(result.intent === 'SAVE_AND_SUBMIT' ? 'Profil disimpan dan diajukan untuk diperiksa.' : "Draf profil BPRS berhasil disimpan.", "success");
      await load();
      setProfileEditing(false);
    } catch (saveError) {
      focusSaveError.current = true;
      setEditorError(readableError(saveError));
    } finally {
      setSavingAction(null);
      setSubmittingForm(false);
    }
  };

  const submitProfile = async () => {
    if (saving) return;
    setActionError(null);
    if (!profile || !access.ensureCapability(SJ_PROFILE, "update")) return;
    if (!ensureAction(profile, 'submit')) return;
    if (settings?.review_authority === "central" && !settings.review_submission_ready) {
      showToast("Penerima pemeriksaan pusat belum siap. Pengajuan belum dapat dikirim.", "warning");
      return;
    }
    setSavingAction("profile-submit");
    try {
      await seputarJaminanService.profileCommand("submit", profile.lock_version);
      showToast("Profil BPRS diajukan untuk diperiksa.", "success");
      await load();
    } catch (submitError) {
      setActionError(readableError(submitError));

    } finally {
      setSavingAction(null);
    }
  };

  const openContact = (contact?: SjContact) => {
    if (saving || busyContactId || !contactActionsReady) return;
    setEditorError(null);
    const capability = contact ? "update" : "create";
    if (!access.ensureCapability(SJ_CONTACTS, capability)) return;
    if (!contact && !sjEntryAction(settings,'create_contact').available) return;
    if (contact && !ensureAction(contact, 'edit_draft')) return;
    setEditingContact(contact ?? null);
    setContactForm(contact ? { label: contact.label, phone_e164: contact.phone_e164 } : EMPTY_CONTACT);
    setContactModalOpen(true);
  };

  const saveContact = async (submit = false) => {
    if (saving || saveOperation.isRunning() || !contactActionsReady) return;
    setEditorError(null);
    if (!access.ensureCapability(SJ_CONTACTS, editingContact ? 'update' : 'create')) return;
    if (!editingContact && !sjEntryAction(settings,'create_contact').available) return;
    if (editingContact && !ensureAction(editingContact, 'edit_draft')) return;
    if (submit && !canSubmitForm(SJ_CONTACTS)) return;
    const validationMessage = validateContact(contactForm);
    if (validationMessage) {
      setEditorError(validationMessage);
      document.getElementById(contactForm.label.trim().length < 2 ? "sj-contact-label" : "sj-contact-phone")?.focus();
      return;
    }
    setSavingAction("contact-save");
    setSubmittingForm(submit);
    try {
      const result = await saveOperation.run({kind:'CONTACT',intent:submit ? 'SAVE_AND_SUBMIT' : 'SAVE_DRAFT',
        ...(editingContact ? {resource_id:editingContact.id} : {}),draft:{
          ...(editingContact ? {expected_version:editingContact.lock_version} : {}),
          label:contactForm.label.trim(),phone_e164:contactForm.phone_e164.trim(),
        }});
      if (!result) return;
      showToast(result.intent === 'SAVE_AND_SUBMIT' ? 'Kontak disimpan dan diajukan untuk diperiksa.' : 'Draf kontak berhasil disimpan.', 'success');
      setContactModalOpen(false);
      setDetailReload(value => value + 1);
      await load();
    } catch (saveError) {
      focusSaveError.current = true;
      setEditorError(readableError(saveError));
    } finally {
      setSavingAction(null);
      setSubmittingForm(false);
    }
  };

  const contactCommand = async (contact: SjContact, command: "submit" | "set-default") => {
    if (saving || busyContactId || !contactActionsReady) return;
    setActionError(null);
    if (!access.ensureCapability(SJ_CONTACTS, "update")) return;
    if (!ensureAction(contact, command === 'set-default' ? 'set_default' : command)) return;
    if (
      command === "submit" &&
      settings?.review_authority === "central" &&
      !settings.review_submission_ready
    ) {
      showToast("Penerima pemeriksaan pusat belum siap. Pengajuan belum dapat dikirim.", "warning");
      return;
    }
    setBusyContactId(contact.id);
    try {
      await seputarJaminanService.contactCommand(contact.id, command, contact.lock_version);
      showToast(command === "submit" ? "Kontak diajukan untuk diperiksa." : "Kontak utama berhasil dipilih.", "success");
      setDetailReload(value => value + 1);
      await load();
    } catch (commandError) {
      setActionError(readableError(commandError));

    } finally {
      setBusyContactId(null);
    }
  };

  const beginProfileEdit = () => {
    setEditorError(null);
    setLogoUploadError(null);
    setLogoUploadFile(null);
    setLogoMedia(savedLogoMedia.current);
    if (!access.ensureCapability(SJ_PROFILE, "update")) return;
    if (!profile && !sjEntryAction(settings,'create_profile').available) return;
    if (profile && !ensureAction(profile, 'edit_draft')) return;
    setForm(profileForm(profile));
    setProfileEditing(true);
  };

  const updateProfileField = (key: keyof ProfileForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const openRemovalRequest = (target: SjChangeRequestTarget) => {
    if (target.kind === 'contact' && !contactActionsReady) return;
    const subject = target.kind === 'profile' ? profile : detailContact?.id === target.id ? detailContact : contacts.find(c => c.id === target.id);
    const actionName = target.kind === 'profile' ? 'request_hide' : 'revoke';
    if (!subject || !ensureAction(subject, actionName)) return;
    if (sjAction(subject, actionName).mode !== 'REQUEST_CONTROL') return;
    if (!settings?.review_submission_ready) {
      showToast("Penerima pemeriksaan pusat belum siap. Permintaan belum dapat dikirim.", "warning");
      return;
    }
    setChangeRequestTarget(target);
  };

  return (
    <DashboardPageShell spacing="lg" animated className="[overflow-wrap:anywhere]">
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title={view === "profile" ? "Profil BPRS" : "Kontak WhatsApp"}
        description={view === "profile"
          ? "Kelola identitas yang diajukan untuk tampil pada profil publik BPRS."
          : "Kelola kontak WhatsApp yang dipilih untuk setiap publikasi."}
        icon={view === "profile" ? Building2 : MessageCircle}
        action={<><SjSecondaryButton loading={loading || contactsPending || (view === 'contacts' && settingsLoading)} disabled={profileEditing || contactModalOpen || saving || uploading || loadingMore} title={profileEditing || contactModalOpen ? 'Tutup editor terlebih dahulu agar isian Anda tidak hilang.' : undefined} onClick={() => void load()}>{!loading && !contactsPending ? <RefreshCw className="size-4" aria-hidden="true" /> : null}Muat ulang</SjSecondaryButton>{view === "contacts" && sjEntryAction(settings,"create_contact").reason_code!=='PERMISSION_DENIED' ? <SjPrimaryButton {...sjEntryButton(settings,"create_contact")} onClick={() => openContact()}><Plus className="size-4" aria-hidden="true" />Tambah kontak</SjPrimaryButton> : null}</>}
      />
      {actionError && !detailContactId ? <SetupState compact variant="error" title="Tindakan belum selesai" description={actionError} /> : null}

      {view === "profile" ? (loading ? <SetupState variant="loading" title="Memuat profil BPRS…" /> : error ? <SetupState variant="error" title="Profil BPRS belum dapat dimuat" description={error} /> : (
        <>
          {profile && !profileEditing ? <SjWorkflowSummary state={profile.state} syncState={profile.sync_state} /> : null}
          <SjSection title={profileEditing ? profile?.state === 'REVISION_REQUIRED' ? 'Perbaiki profil' : 'Edit profil BPRS' : 'Profil kerja'} description={profileEditing ? 'Simpan sebagai draf atau langsung ajukan untuk diperiksa.' : 'Pratinjau data yang disiapkan di bank. Bukan bukti sudah tampil di SJ.'}>
            {!profile && !profileEditing ? (
              <div className="p-5 sm:p-6">
                <SetupState
                  title="Profil BPRS belum dibuat"
                  description="Buat draf identitas BPRS, lalu ajukan untuk diperiksa."
                  icon={Building2}
                />
                <div ref={profileActionsRef} className="mt-4 flex justify-center">
                  {sjEntryAction(settings,'create_profile').reason_code!=='PERMISSION_DENIED'?<SjPrimaryButton {...sjEntryButton(settings,'create_profile')} onClick={beginProfileEdit}>
                    <Plus className="size-4" aria-hidden="true" />
                    Buat profil
                  </SjPrimaryButton>:null}
                </div>
                {!sjEntryAction(settings,'create_profile').available&&sjEntryAction(settings,'create_profile').reason_code!=='PERMISSION_DENIED'?<p className="mt-3 text-center text-sm text-slate-600">{sjEntryAction(settings,'create_profile').reason}</p>:null}
              </div>
            ) : profile && !profileEditing ? (
              <div className="space-y-5 p-5 sm:p-6">
                {profile.state === 'REVISION_REQUIRED' && profile.rejection_reason ? (
                  <DashboardNotice
                    tone="amber"
                    title="Profil perlu diperbaiki"
                    description={profile.rejection_reason}
                  />
                ) : null}
                {settings?.review_authority === "central" && !settings.review_submission_ready ? (
                  <DashboardNotice
                    tone="amber"
                    title="Pemeriksaan pusat belum siap menerima pengajuan"
                    description="Draf tetap bisa disimpan. Pengajuan dapat dikirim setelah koneksi siap."
                  />
                ) : null}
                {profile.pending_version && profile.current_version_id ? (
                  <DashboardNotice
                    tone="sky"
                    title="Ada perubahan yang belum selesai"
                    description={`Perubahan versi ${profile.pending_version.version_number} belum menggantikan versi yang disetujui. Hasil pengecekan publik ditampilkan terpisah di bawah.`}
                  />
                ) : null}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  {profile.logo_media_id ? <SjMediaPreview
                    thumbnail
                    mediaId={profile.logo_media_id}
                    alt={`Logo publik ${profile.display_name}`}
                    fit="contain"
                    className="aspect-square w-32 shrink-0 border border-slate-200 bg-white"
                  /> : <div className="flex size-32 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600"><Building2 aria-hidden="true" className="size-8" /><span>Logo belum diisi</span></div>}
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pratinjau</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 max-w-full text-xl font-bold text-slate-950 [overflow-wrap:anywhere]">{profile.display_name || 'Nama BPRS belum diisi'}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{profile.short_description}</p>
                  </div>
                </div>
                <SetupRecordDetailSection title="Identitas profil" rows={[
                  { label: "Alamat profil", value: profile.public_slug },
                  { label: "Kota/Kabupaten", value: profile.city_regency },
                  { label: "Provinsi", value: profile.province },
                  { label: "Website resmi", value: profile.website_url || "Belum dicantumkan" },
                ].map(row => ({ ...row, valueClassName: "[overflow-wrap:anywhere]" }))} />
                {profile.state !== 'VERIFIED' || !profile.logo_ready ? <SjProfilePreparation profile={profile} /> : null}
                <div ref={profileActionsRef}>
                <SjRecordActions subject={profile} busy={saving} label="Aksi profil" actions={[
                  ...(profile.state==='DRAFT'?[{name:'submit',label:'Ajukan',icon:Send,primary:true,onClick:()=>void submitProfile()}]:[]),
                  ...(['DRAFT','REVISION_REQUIRED','VERIFIED','HIDDEN'].includes(profile.state)?[{name:'edit_draft',label:profile.state==='REVISION_REQUIRED'?'Perbaiki profil':profile.state==='VERIFIED'?'Ajukan perubahan':profile.state==='HIDDEN'?'Siapkan perubahan':'Lanjutkan edit',icon:Pencil,primary:true,onClick:beginProfileEdit}]:[]),
                  ...(profile.state==='VERIFIED'&&settings?.review_authority==='central'?[{name:'request_hide',label:'Ajukan sembunyikan profil',icon:EyeOff,destructive:true,onClick:()=>openRemovalRequest({kind:'profile',id:profile.id,label:profile.display_name,version:profile.lock_version})}]:[]),
                ]}/>
                </div>
              </div>
            ) : (
            <div>
            {saveOperation.uncertain ? <div id="sj-save-error" tabIndex={-1} className="p-5" role="alert"><p className="mb-3 text-sm">Hasil penyimpanan belum bisa dipastikan. Isian tidak diubah.</p><SjPrimaryButton loading={saving} onClick={() => void saveProfile()}>Periksa penyimpanan</SjPrimaryButton></div> : null}
            <fieldset disabled={saving || uploading || saveOperation.uncertain} className="min-w-0 space-y-6 p-5 sm:p-6">
              <legend className="sr-only">Formulir profil BPRS</legend>
              {profile?.state === 'REVISION_REQUIRED' && profile.rejection_reason ? <DashboardNotice tone="amber" title="Catatan pemeriksa" description={profile.rejection_reason} /> : null}
              {profile?.current_version_id ? <p className="text-sm text-slate-600">Mengedit draf tidak langsung mengubah profil publik.</p> : null}
              {editorError && !saveOperation.uncertain ? <div id="sj-save-error" tabIndex={-1}><SetupState variant="error" title="Perubahan belum disimpan" description={editorError} /></div> : null}
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
                    <figcaption className="text-sm text-slate-600">Pratinjau logo tersimpan</figcaption>
                  </figure>
                ) : null}

                <div className={`min-w-0 space-y-4 ${form.logo_media_id ? "" : "md:col-span-2"}`}>
                  <FileUploadField
                    id="sj-profile-logo-upload"
                    accept={SJ_PUBLIC_IMAGE_ACCEPT}
                    disabled={saving || uploading || !sjEntryAction(settings,'upload_media').available}
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
                          disabled={uploading || !sjEntryAction(settings,'upload_media').available}
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
                <label className="space-y-2 text-sm font-semibold text-slate-700">Nama publik BPRS <span className="text-rose-600">*</span><SetupTextInput id="sj-profile-name" minLength={3} maxLength={160} value={form.display_name} onChange={(event) => updateProfileField('display_name', event.target.value)} /></label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Alamat profil <span className="text-rose-600">*</span><SetupTextInput id="sj-profile-slug" maxLength={120} value={form.public_slug} onChange={(event) => updateProfileField('public_slug', event.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="contoh-bprs" /><span className="block text-sm font-normal leading-5 text-slate-500">Akan digunakan pada alamat halaman BPRS.</span></label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Kota/Kabupaten <span className="text-rose-600">*</span><SetupTextInput id="sj-profile-city" maxLength={120} value={form.city_regency} onChange={(event) => updateProfileField('city_regency', event.target.value)} /></label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Provinsi <span className="text-rose-600">*</span><SetupTextInput id="sj-profile-province" maxLength={120} value={form.province} onChange={(event) => updateProfileField('province', event.target.value)} /></label>
              </div>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">Deskripsi singkat <span className="text-rose-600">*</span><SetupTextarea id="sj-profile-description" rows={5} minLength={20} maxLength={500} value={form.short_description} onChange={(event) => updateProfileField('short_description', event.target.value)} placeholder="Ceritakan profil singkat dan wilayah layanan BPRS tanpa informasi internal." /></label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">Website resmi <span className="font-normal text-slate-600">(opsional)</span><SetupTextInput id="sj-profile-website" type="url" maxLength={500} value={form.website_url} onChange={(event) => updateProfileField('website_url', event.target.value)} placeholder="https://…" /></label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                <SjSecondaryButton disabled={uploading || saving} onClick={profileGuard.requestClose}>
                  Batal
                </SjSecondaryButton>
                <SjSecondaryButton loading={savingAction === "profile-save" && !submittingForm} disabled={uploading || saving} onClick={() => void saveProfile()}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Simpan draf
                </SjSecondaryButton>
                {access.hasCapability(SJ_PROFILE,'update') ? <SjPrimaryButton loading={savingAction === 'profile-save' && submittingForm} disabled={uploading || saving || !canSubmitForm(SJ_PROFILE) || !form.logo_ready} onClick={() => void saveProfile(true)}>{profile?.state === 'REVISION_REQUIRED' ? 'Simpan dan ajukan ulang' : 'Simpan dan ajukan'}</SjPrimaryButton> : null}
              </div>
              {!canSubmitForm(SJ_PROFILE) ? <p className="text-sm text-slate-600">Pengajuan belum tersedia. Anda masih bisa menyimpan draf.</p> : !form.logo_ready ? <p className="text-sm text-slate-600">Logo harus selesai diperiksa sebelum profil diajukan.</p> : null}
            </fieldset>
            </div>
            )}
          </SjSection>
          {profile && !profileEditing ? <>
            <SjProfileVersions profile={profile} />
            {profile.current_version_id ? <SeputarJaminanObservation key={`${profile.id}-${profile.public_slug}`} kind="profile" id={profile.id} profile={profile} /> : null}
          </> : null}
        </>
      )) : (
        <div className="space-y-5">
          {settingsError ? <SetupState compact variant="error" title="Tindakan kontak belum dapat diperiksa" description={settingsError} /> : null}
          {settings?.review_authority === "central" && !settings.review_submission_ready ? (
            <DashboardNotice
              tone="amber"
              title="Pemeriksaan pusat belum siap menerima pengajuan"
              description="Kontak dapat disimpan sebagai draf, tetapi belum dapat diajukan sampai sambungan operasional tersedia."
            />
          ) : null}
          <SjSection title="Kontak WhatsApp" description="Kontak yang belum dicabut. Pilih kontak saat menyiapkan publikasi.">
            <div className="border-b border-slate-200 p-4"><SetupSearchInput value={contactSearch} maxLength={120} onChange={event=>updateQuery({search:event.target.value,detail:''},true)} aria-label="Cari nama kontak" placeholder="Cari nama kontak…" /></div>
            {!settingsLoading&&!settingsError&&!sjEntryAction(settings,'create_contact').available?<p className="px-5 py-3 text-sm text-slate-600">{sjEntryAction(settings,'create_contact').reason}</p>:null}
            <SetupDataTable variant="crud" density="compact" style={{ tableLayout: "fixed" }} aria-label="Daftar kontak WhatsApp marketing" aria-busy={contactsPending}>
              <SetupDataTableColGroup>
                <SetupDataTableCol className="w-[30%]" />
                <SetupDataTableCol className="w-[16%]" />
                <SetupDataTableCol className="w-[32%]" />
                <SetupDataTableCol className="w-[22%]" />
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
                {contactsPending ? <SetupDataTableEmptyRow colSpan={4} state="loading">Memuat kontak WhatsApp…</SetupDataTableEmptyRow> : error ? <SetupDataTableEmptyRow colSpan={4} state="error" description={error}>Kontak WhatsApp belum dapat dimuat</SetupDataTableEmptyRow> : contacts.length === 0 ? (
                  <SetupDataTableEmptyRow
                    colSpan={4}
                    icon={MessageCircle}
                    description={contactSearch ? 'Coba nama lain atau kosongkan pencarian.' : 'Tambahkan kontak untuk dihubungkan dengan publikasi.'}
                  >
                    {contactSearch ? 'Tidak ada kontak yang cocok' : 'Belum ada kontak WhatsApp'}
                  </SetupDataTableEmptyRow>
                ) : contacts.map((contact) => (
                  <SetupDataTableRow key={contact.id}>
                    <SetupDataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <SetupTablePrimaryText className="min-w-0 max-w-full" style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>{contact.label}</SetupTablePrimaryText>
                        {contact.is_default ? <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700"><Star className="size-3.5 fill-current" aria-hidden="true" />Utama</span> : null}
                      </div>
                      <SetupTableSecondaryText className="mt-1" style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                        {contact.current_version_id && contact.state !== "VERIFIED"
                          ? "Versi yang disetujui sebelumnya tetap tersimpan di bank"
                          : null}
                      </SetupTableSecondaryText>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <span className="text-sm font-semibold text-slate-700">Berakhir {contact.phone_e164.slice(-4)}</span>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <SjContactContext contact={contact} compact />
                    </SetupDataTableCell>
                    <SetupDataTableCell className="text-center">
                      <SetupActionMenu label={`Aksi kontak ${contact.label}`} menuLabel={`Aksi kontak ${contact.label}`} showDisabledItems items={[
                        {key:'detail',label:'Lihat detail',icon:Eye,onClick:()=>setDetailContactId(contact.id)},
                        {key:'edit_draft',label:contact.state==='REJECTED'?'Perbaiki kontak':'Ubah',icon:Pencil,onClick:()=>openContact(contact)},
                        ...(contact.state === 'DRAFT' ? [{key:'submit',label:'Ajukan',icon:Send,onClick:()=>void contactCommand(contact,'submit')}] : []),
                        ...(contact.state === 'VERIFIED' && !contact.is_default ? [{key:'set_default',label:'Jadikan utama',icon:CheckCircle2,onClick:()=>void contactCommand(contact,'set-default')}] : []),
                        ...(contact.state === 'VERIFIED' && settings?.review_authority === 'central' ? [{key:'revoke',label:'Ajukan pencabutan',icon:EyeOff,onClick:()=>openRemovalRequest({kind:'contact',id:contact.id,label:contact.label,version:contact.lock_version})}] : []),
                      ].filter(item=>item.key==='detail'||sjAction(contact,item.key).reason_code!=='PERMISSION_DENIED').map(item=>item.key === 'detail' ? item : ({...item,disabled:busyContactId===contact.id || !contactActionsReady || !sjAction(contact,item.key).available,disabledReason:busyContactId===contact.id ? 'Tunggu proses kontak selesai.' : !contactActionsReady ? 'Muat ulang untuk memeriksa tindakan yang tersedia.' : sjAction(contact,item.key).reason || undefined}))} />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}
              </SetupDataTableBody>
            </SetupDataTable>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
              <p className="text-sm text-slate-600">{contactsPending ? 'Memuat kontak…' : error ? 'Kontak belum dapat dimuat.' : `${contacts.length} kontak dimuat · urutan terbaru`}</p>
              {!contactsPending&&!error&&contactCursor?<SjSecondaryButton loading={loadingMore} onClick={()=>void loadMoreContacts()}>Muat kontak berikutnya</SjSecondaryButton>:null}
              {!contactsPending&&moreError?<p role="alert" className="w-full text-sm text-rose-700">{moreError}</p>:null}
            </div>
          </SjSection>
        </div>
      )}

      <DashboardModal isOpen={detailContactId !== null && !contactModalOpen && !changeRequestTarget} onClose={() => setDetailContactId(null)} title="Detail kontak WhatsApp" maxWidth="2xl"
        description="Identitas dan hasil pemeriksaan kontak."
        footer={<><SjSecondaryButton onClick={() => setDetailContactId(null)}>Tutup</SjSecondaryButton>{detailContact ? <SjRecordActions subject={detailContact} busy={busyContactId===detailContact.id || !contactActionsReady} label="Aksi kontak" actions={[
          ...(detailContact.state==='DRAFT'?[{name:'submit',label:'Ajukan',icon:Send,primary:true,onClick:()=>void contactCommand(detailContact,'submit')}]:[]),
          {name:'edit_draft',label:detailContact.state==='REJECTED'?'Perbaiki kontak':'Ubah kontak',icon:Pencil,primary:true,onClick:()=>openContact(detailContact)},
          ...(detailContact.state==='VERIFIED'&&!detailContact.is_default?[{name:'set_default',label:'Jadikan utama',icon:CheckCircle2,onClick:()=>void contactCommand(detailContact,'set-default')}]:[]),
          ...(detailContact.state==='VERIFIED'&&settings?.review_authority==='central'?[{name:'revoke',label:'Ajukan pencabutan',icon:EyeOff,destructive:true,onClick:()=>openRemovalRequest({kind:'contact',id:detailContact.id,label:detailContact.label,version:detailContact.lock_version})}]:[]),
        ]}/>:null}</>}>
        {detailContact ? <div className="space-y-5">
          {actionError?<p role="alert" className="text-sm text-rose-700">{actionError}</p>:null}
          <SetupRecordDetailSection title="Identitas kontak" rows={[
            {label:'Nama kontak',value:detailContact.label,wide:true,valueClassName:'[overflow-wrap:anywhere]'},
            {label:'Nomor WhatsApp',value:`Berakhir ${detailContact.phone_e164.slice(-4)}`},
            {label:'Kontak utama',value:detailContact.is_default ? 'Ya' : 'Tidak'},
          ]} />
          <SjContactContext contact={detailContact} showUsageReason={false} />
          {detailContact.rejection_reason ? <p className="text-sm text-rose-700">{detailContact.rejection_reason}</p> : null}
          <SjContactDetails contact={detailContact} />
        </div> : detailError ? <div className="space-y-3"><SetupState variant="error" title={detailError.title} description={detailError.description} />{detailError.retry ? <SjSecondaryButton onClick={()=>setDetailReload(value=>value+1)}>Coba lagi</SjSecondaryButton> : null}</div> : <SetupState variant="loading" title="Memuat kontak…" />}
      </DashboardModal>

      <DashboardModal
        isOpen={contactModalOpen}
        onClose={contactGuard.requestClose}
        closeDisabled={saving || saveOperation.uncertain}
        maxWidth="md"
        title={editingContact?.state === 'REJECTED' ? 'Perbaiki kontak WhatsApp' : editingContact ? "Perbarui kontak WhatsApp" : "Tambah kontak WhatsApp"}
        description="Simpan sebagai draf atau langsung ajukan untuk diperiksa."
        footer={saveOperation.uncertain ? <SjPrimaryButton loading={saving} onClick={() => void saveContact()}>Periksa penyimpanan</SjPrimaryButton> : <><SjSecondaryButton disabled={saving} onClick={contactGuard.requestClose}>Batal</SjSecondaryButton><SjSecondaryButton loading={savingAction === "contact-save" && !submittingForm} disabled={saving} onClick={() => void saveContact()}>Simpan draf</SjSecondaryButton>{access.hasCapability(SJ_CONTACTS,'update') ? <SjPrimaryButton loading={savingAction === 'contact-save' && submittingForm} disabled={saving || !canSubmitForm(SJ_CONTACTS)} onClick={() => void saveContact(true)}>{editingContact?.state === 'REJECTED' ? 'Simpan dan ajukan ulang' : 'Simpan dan ajukan'}</SjPrimaryButton> : null}</>}
      >
        {editorError ? <div id="sj-save-error" tabIndex={-1} className="mb-5"><SetupState variant="error" title={saveOperation.uncertain ? 'Hasil penyimpanan belum pasti' : 'Perubahan belum disimpan'} description={editorError} /></div> : null}
        <fieldset disabled={saving || saveOperation.uncertain} className="min-w-0 space-y-5">
          <legend className="sr-only">Formulir kontak WhatsApp</legend>
          {editingContact?.rejection_reason ? <DashboardNotice tone="amber" title="Catatan pemeriksa" description={editingContact.rejection_reason} /> : null}
          {!canSubmitForm(SJ_CONTACTS) ? <p className="text-sm text-slate-600">Pengajuan belum tersedia. Anda masih bisa menyimpan draf.</p> : null}
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Nama kontak <span className="text-rose-600">*</span><SetupTextInput id="sj-contact-label" aria-invalid={Boolean(editorError) && contactForm.label.trim().length < 2} minLength={2} maxLength={80} value={contactForm.label} onChange={(event) => {const label=event.target.value;setContactForm(current=>({...current,label}));}} placeholder="Contoh: Marketing Bandung" /></label>
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Nomor WhatsApp <span className="text-rose-600">*</span><SetupTextInput id="sj-contact-phone" aria-invalid={Boolean(editorError) && !/^\+[1-9][0-9]{7,14}$/.test(contactForm.phone_e164.trim())} inputMode="tel" maxLength={16} value={contactForm.phone_e164} onChange={(event) => {const phone_e164=event.target.value.replace(/[\s()-]/g, '');setContactForm(current=>({...current,phone_e164}));}} placeholder="+6281234567890" /><span className="block text-sm font-normal leading-5 text-slate-500">Ganti angka 0 di depan dengan +62 untuk nomor Indonesia.</span></label>
        </fieldset>
      </DashboardModal>

      {contactGuard.confirmation}
      {profileGuard.confirmation}
      <SeputarJaminanChangeRequestModal
        open={Boolean(changeRequestTarget)}
        target={changeRequestTarget}
        actions={changeRequestTarget?.kind === "profile" ? ["HIDE_PROFILE"] : ["REVOKE_CONTACT"]}
        onClose={() => setChangeRequestTarget(null)}
        onSubmitted={() => load()}
      />
    </DashboardPageShell>
  );
}
