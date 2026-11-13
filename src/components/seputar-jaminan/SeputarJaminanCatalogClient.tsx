"use client";
import SeputarJaminanObservation from './SeputarJaminanObservation';
import SjPublicationContent, { SjPublicationThumbnail, SjPublicationListObservation } from './SeputarJaminanPublicationContent';
import { SjPublicationVersions, SjWorkflowSummary } from './SeputarJaminanWorkflow';

import useSjListQuery from "./useSjListQuery";
import useDiscardChanges from "./useDiscardChanges";
import { sjAction, sjEntryAction, sjEntryButton, sjMediaAction } from './actionAvailability';
import SjRecordActions from './SjRecordActions';
import SjCursorNavigation from './SjCursorNavigation';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSjSaveOperation from './useSjSaveOperation';
import {
  Archive,
  CheckCircle2,
  EyeOff,
  Eye,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Store,
  Trash2,
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
  SetupTableCode,
  SetupTableScroll,
} from "@/components/ui/SetupDataTable";
import DashboardModal from "@/components/ui/DashboardModal";
import useSeputarJaminanModalScrollLock from "@/components/seputar-jaminan/useSeputarJaminanModalScrollLock";
import MultiFileUploadField from "@/components/ui/MultiFileUploadField";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import SetupState from "@/components/ui/SetupState";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { arsipService } from "@/services/arsip.service";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type {
  SjAssetCategory,
  SjContact,
  SjMedia,
  SjMediaDraft,
  SjProfile,
  SjPublication,
  SjPublicationDraftPayload,
  SjSettings,
  SjSourceType,
  SjTaxonomy,
} from "@/types/seputar-jaminan.types";
import {
  ATTRIBUTE_LABEL,
  CATEGORY_LABEL,
  PUBLICATION_STATE_LABEL,
  SJ_CATALOG,
  SJ_SUBMISSIONS,
  SJ_SUMMARY,
  SjPageHeader,
  SJ_TABLE_LOADING_CLASS,
  SjPrimaryButton,
  SjSecondaryButton,
  SjSection,
  SjStatusBadge,
  VOCABULARY_LABEL,
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
import type { SjChangeRequestAction } from "@/types/seputar-jaminan.types";

type FormMedia = SjMediaDraft & {
  id: string;
  fileName: string;
  state: string;
  centralReady: boolean;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

type CatalogForm = {
  source_type: SjSourceType;
  source_collateral_id: string;
  manual_reason: string;
  manual_evidence_document_id: string;
  asset_category: SjAssetCategory;
  taxonomy_item_id: string;
  title: string;
  description: string;
  city_regency: string;
  province: string;
  whatsapp_contact_version_id: string;
  profile_version_id: string;
  attributes: Record<string, string>;
  media: FormMedia[];
};

type AttributeDefinition = {
  key: string;
  kind: "number" | "text" | "vocabulary";
  vocabulary?: keyof SjTaxonomy["vocabularies"];
  required?: boolean;
};

const ATTRIBUTE_FIELDS: Record<SjAssetCategory, AttributeDefinition[]> = {
  LAND: [
    { key: "land_area_m2", kind: "number", required: true },
    { key: "contour", kind: "vocabulary", vocabulary: "contour" },
    { key: "road_access", kind: "vocabulary", vocabulary: "road_access" },
  ],
  BUILDING: [
    { key: "land_area_m2", kind: "number" },
    { key: "building_area_m2", kind: "number", required: true },
    { key: "floor_count", kind: "number" },
    { key: "public_usage", kind: "vocabulary", vocabulary: "public_usage" },
  ],
  MACHINE_EQUIPMENT: [
    { key: "brand_or_manufacturer", kind: "text" },
    { key: "model_or_type", kind: "text", required: true },
    { key: "manufacture_year", kind: "number" },
    { key: "public_capacity", kind: "text" },
    { key: "public_condition", kind: "vocabulary", vocabulary: "public_condition", required: true },
  ],
  VEHICLE: [
    { key: "brand", kind: "text", required: true },
    { key: "model_or_type", kind: "text", required: true },
    { key: "manufacture_year", kind: "number" },
    { key: "transmission", kind: "vocabulary", vocabulary: "transmission" },
    { key: "fuel_type", kind: "vocabulary", vocabulary: "fuel_type" },
    { key: "mileage_km", kind: "number" },
    { key: "public_condition", kind: "vocabulary", vocabulary: "public_condition", required: true },
  ],
};

const EMPTY_FORM: CatalogForm = {
  source_type: "COLLATERAL",
  source_collateral_id: "",
  manual_reason: "",
  manual_evidence_document_id: "",
  asset_category: "LAND",
  taxonomy_item_id: "",
  title: "",
  description: "",
  city_regency: "",
  province: "",
  whatsapp_contact_version_id: "",
  profile_version_id: "",
  attributes: {},
  media: [],
};

function numericAttribute(key: string, value: string) {
  const parsed = Number(value);
  if (["floor_count", "manufacture_year"].includes(key)) return Math.trunc(parsed);
  return parsed;
}

function toPayload(form: CatalogForm): SjPublicationDraftPayload {
  const attributes = Object.fromEntries(
    ATTRIBUTE_FIELDS[form.asset_category]
      .filter((field) => form.attributes[field.key]?.trim())
      .map((field) => [
        field.key,
        field.kind === "number"
          ? numericAttribute(field.key, form.attributes[field.key])
          : form.attributes[field.key].trim(),
      ]),
  );
  return {
    source_type: form.source_type,
    ...(form.source_type === "COLLATERAL"
      ? { source_collateral_id: form.source_collateral_id }
      : {
          manual_reason: form.manual_reason.trim(),
          manual_evidence_document_id: form.manual_evidence_document_id,
        }),
    asset_category: form.asset_category,
    taxonomy_item_id: form.taxonomy_item_id,
    title: form.title.trim(),
    description: form.description.trim(),
    city_regency: form.city_regency.trim(),
    province: form.province.trim(),
    whatsapp_contact_version_id: form.whatsapp_contact_version_id,
    profile_version_id: form.profile_version_id,
    attributes,
    media: form.media.map(({ media_asset_id, sort_order, is_cover, alt_text }) => ({
      media_asset_id,
      sort_order,
      is_cover,
      alt_text: alt_text.trim(),
    })),
  };
}

function validateForm(form: CatalogForm, sourceIsLocked: boolean) {
  if (!sourceIsLocked && form.source_type === "COLLATERAL" && !form.source_collateral_id) {
    return "Pilih agunan yang menjadi sumber publikasi.";
  }
  if (!sourceIsLocked && form.source_type === "MANUAL") {
    if (!form.manual_evidence_document_id) return "Pilih dokumen bukti untuk input manual.";
    if (form.manual_reason.trim().length < 10) {
      return "Jelaskan alasan input manual sedikitnya 10 karakter.";
    }
  }
  if (!form.taxonomy_item_id) return "Pilih jenis aset.";
  if (form.title.trim().length < 5) return "Judul publikasi harus berisi sedikitnya 5 karakter.";
  if (form.description.trim().length < 20) {
    return "Deskripsi publik harus berisi sedikitnya 20 karakter.";
  }
  if (form.city_regency.trim().length < 2) return "Isi kota atau kabupaten aset.";
  if (form.province.trim().length < 2) return "Isi provinsi aset.";
  if (!form.whatsapp_contact_version_id) return "Pilih kontak WhatsApp untuk publikasi ini.";
  if (!form.profile_version_id) return "Profil BPRS terverifikasi belum tersedia.";

  const missingAttribute = ATTRIBUTE_FIELDS[form.asset_category].find(
    (field) => field.required && !form.attributes[field.key]?.trim(),
  );
  if (missingAttribute) return `Isi ${ATTRIBUTE_LABEL[missingAttribute.key].toLowerCase()}.`;

  const invalidNumber = ATTRIBUTE_FIELDS[form.asset_category].find((field) => {
    const rawValue = form.attributes[field.key]?.trim();
    if (field.kind !== "number" || !rawValue) return false;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return true;
    if (field.key === "manufacture_year") return value < 1900 || value > 2200 || !Number.isInteger(value);
    if (field.key === "floor_count") return value < 1 || value > 200 || !Number.isInteger(value);
    if (field.key === "mileage_km") return value < 0;
    return value <= 0;
  });
  if (invalidNumber) return `${ATTRIBUTE_LABEL[invalidNumber.key]} belum valid.`;

  if (form.media.length === 0) return "Tambahkan sedikitnya satu gambar publik.";
  if (form.media.filter((media) => media.is_cover).length !== 1) {
    return "Pilih tepat satu gambar utama.";
  }
  if (form.media.some((media) => media.alt_text.trim().length < 3)) {
    return "Isi keterangan setiap gambar sedikitnya 3 karakter.";
  }
  return null;
}

function validationTargetId(message: string) {
  const directTargets: Record<string, string> = {
    "Pilih agunan yang menjadi sumber publikasi.": "sj-publication-source-collateral",
    "Pilih dokumen bukti untuk input manual.": "sj-publication-manual-evidence",
    "Jelaskan alasan input manual sedikitnya 10 karakter.": "sj-publication-manual-reason",
    "Pilih jenis aset.": "sj-publication-taxonomy",
    "Judul publikasi harus berisi sedikitnya 5 karakter.": "sj-publication-title",
    "Deskripsi publik harus berisi sedikitnya 20 karakter.": "sj-publication-description",
    "Isi kota atau kabupaten aset.": "sj-publication-city",
    "Isi provinsi aset.": "sj-publication-province",
    "Pilih kontak WhatsApp untuk publikasi ini.": "sj-publication-whatsapp-contact",
    "Profil BPRS terverifikasi belum tersedia.": "sj-publication-whatsapp-contact",
    "Tambahkan sedikitnya satu gambar publik.": "sj-publication-add-media",
    "Pilih tepat satu gambar utama.": "sj-publication-cover-0",
    "Isi keterangan setiap gambar sedikitnya 3 karakter.": "sj-publication-media-alt-0",
  };
  if (directTargets[message]) return directTargets[message];

  const attribute = Object.entries(ATTRIBUTE_LABEL).find(([, label]) => (
    message === `Isi ${label.toLowerCase()}.` || message === `${label} belum valid.`
  ));
  return attribute ? `sj-publication-attribute-${attribute[0]}` : null;
}

function editablePayload(payload: SjPublicationDraftPayload) {
  return {
    asset_category: payload.asset_category,
    taxonomy_item_id: payload.taxonomy_item_id,
    title: payload.title,
    description: payload.description,
    city_regency: payload.city_regency,
    province: payload.province,
    whatsapp_contact_version_id: payload.whatsapp_contact_version_id,
    profile_version_id: payload.profile_version_id,
    attributes: payload.attributes,
    media: payload.media,
  };
}

export default function SeputarJaminanCatalogClient() {
  const [items, setItems] = useState<SjPublication[]>([]);
  const { params: listQuery, update: updateListQuery } = useSjListQuery();
  const cursor = listQuery.get('cursor') ?? '';
  const detailId = listQuery.get('detail') ?? '';
  const sort = listQuery.get('sort') ?? 'created_desc';
  const legacyPage = listQuery.get('page');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const search = listQuery.get("search") ?? "";
  const setSearch = (value: string) => updateListQuery({search: value, page: '', cursor: ''}, true);
  const stateFilter = listQuery.get("state") ?? "";
  const setStateFilter = (value: string) => updateListQuery({state: value, page: '', cursor: ''});
  const categoryFilter = listQuery.get("category") ?? "";
  const confirmation = listQuery.get('confirmation') ?? '';
  const setCategoryFilter = (value: string) => updateListQuery({category: value, page: '', cursor: ''});
  const requestKey = JSON.stringify([categoryFilter, confirmation, cursor, legacyPage, search, stateFilter, sort]);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loading = refreshing || loadedRequest !== requestKey;
  const [requestError, setRequestError] = useState<{key: string; message: string} | null>(null);
  const error = requestError?.key === requestKey ? requestError.message : null;
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<SjPublication | null>(null);
  const [detailBusy,setDetailBusy]=useState(Boolean(detailId));
  const [detailError,setDetailError]=useState<string|null>(null);
  const [savedSubmissionNotice,setSavedSubmissionNotice]=useState<{id:string;message:string}|null>(null);
  const [detailReload,setDetailReload]=useState(0);
  const [formError,setFormError]=useState<string|null>(null);
  const [commandError,setCommandError]=useState<string|null>(null);
  const detailEntry=useRef<string|null>(null);
  const [editing, setEditing] = useState<SjPublication | null>(null);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [taxonomy, setTaxonomy] = useState<SjTaxonomy | null>(null);
  const [profile, setProfile] = useState<SjProfile | null>(null);
  const [contacts, setContacts] = useState<SjContact[]>([]);
  const [contactCursor,setContactCursor]=useState<string|null>(null);
  const [contactMoreBusy,setContactMoreBusy]=useState(false);
  const [contactMoreError,setContactMoreError]=useState<string|null>(null);
  const contactLoadSequence=useRef(0);
  const [settings, setSettings] = useState<SjSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [submittingForm,setSubmittingForm] = useState(false);
  const saveOperation = useSjSaveOperation();
  const focusSaveError = useRef(false);
  useEffect(() => {
    if (!saving && formError && focusSaveError.current) {
      const errorElement = document.getElementById('sj-publication-save-error');
      if (errorElement) {
        focusSaveError.current = false;
        errorElement.focus();
        errorElement.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      }
    }
  }, [saving, formError]);
  const [uploading, setUploading] = useState(false);
  const [mediaUploadFiles, setMediaUploadFiles] = useState<File[]>([]);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaUploadProgress, setMediaUploadProgress] = useState({ completed: 0, total: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [unpublishConfirm, setUnpublishConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const detailIdentity = `${detailId}:${detailReload}`;
  const [storedDetailIdentity, setStoredDetailIdentity] = useState(detailIdentity);
  if (storedDetailIdentity !== detailIdentity) {
    setStoredDetailIdentity(detailIdentity);
    setDetail(null); setDetailError(null); setCommandError(null);
    setUnpublishConfirm(false); setArchiveConfirm(false); setDetailBusy(Boolean(detailId));
  }
  const [changeRequest, setChangeRequest] = useState<{
    target: SjChangeRequestTarget;
    actions: SjChangeRequestAction[];
  } | null>(null);
  useSeputarJaminanModalScrollLock(formOpen || Boolean(detailId));
  const formTriggerRef = useRef<HTMLElement | null>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const loadRequestRef = useRef(0);
  const { showToast } = useAppToast();
  const access = useProtectedAction();
  const ensureAction = (publication: SjPublication, name: string) => {
    const action = sjAction(publication, name);
    if (!action.available) showToast(action.reason || 'Tindakan belum tersedia.', 'warning');
    return action.available;
  };

  const load = useCallback(() => {
    const requestId = ++loadRequestRef.current;
    const readPage = () => {
      if(sort!=='created_desc')throw new Error('Urutan pada tautan ini tidak didukung. Atur ulang untuk memakai urutan terbaru dibuat.');
      if (legacyPage !== null && legacyPage !== '1') throw new Error('Tautan halaman lama tidak dapat dipakai. Ubah filter atau hapus nomor halaman untuk mulai dari awal.');
      return Promise.all([
        seputarJaminanService.getPublicationPage({
          ...(cursor ? {cursor} : {}),
          limit: 20,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(stateFilter ? { state: stateFilter } : {}),
          ...(categoryFilter ? { category: categoryFilter } : {}),
          ...(confirmation ? { confirmation } : {}),
        }),
        seputarJaminanService.getSettings(),
      ] as const);
    };
    let request: ReturnType<typeof readPage>;
    try { request = readPage(); } catch (failure) { request = Promise.reject(failure); }
    return request.then(([result, nextSettings]) => {
      if (requestId !== loadRequestRef.current) return;
      setRequestError(null);
      setItems(result.items);
      setNextCursor(result.page_info.next_cursor);
      setSettings(nextSettings);
    }).catch((loadError) => {
      if (requestId !== loadRequestRef.current) return;
      setRequestError({key: requestKey, message: readableError(loadError)});
    }).finally(() => {
      if (requestId === loadRequestRef.current) { setRefreshing(false); setLoadedRequest(requestKey); }
    });
  }, [categoryFilter, confirmation, cursor, legacyPage, search, stateFilter, sort, requestKey, setNextCursor]);
  const reload = async () => { setRefreshing(true); setRequestError(null); await load(); };

  useEffect(() => {
    const sequence=loadRequestRef;
    void load();
    return () => { ++sequence.current; };
  }, [load]);

  useEffect(()=>{
    let active=true;
    if(!detailId)return;
    void (async()=>{
      try{
        if(!/^[a-zA-Z0-9-]{1,64}$/.test(detailId))throw new Error('Identitas publikasi pada tautan tidak valid.');
        const row=await seputarJaminanService.getPublication(detailId);
        if(row.id!==detailId)throw new Error('Jawaban detail tidak sesuai publikasi yang diminta.');
        if(active)setDetail(row);
      }catch(e){if(active)setDetailError(readableError(e));}
      finally{if(active)setDetailBusy(false);}
    })();
    return()=>{active=false;};
  },[detailId,detailReload]);

  const closeDetail=()=>{
    setUnpublishConfirm(false);setArchiveConfirm(false);setDetail(null);
    if(detailEntry.current===window.location.search){window.history.back();}
    else updateListQuery({detail:''},true);
  };

  useEffect(() => {
    if (formOpen || !formTriggerRef.current) return;
    const trigger = formTriggerRef.current;
    requestAnimationFrame(() => {
      if (document.contains(trigger)) trigger.focus();
    });
  }, [formOpen]);

  useEffect(() => {
    if (detailId || !detailTriggerRef.current) return;
    const trigger = detailTriggerRef.current;
    requestAnimationFrame(() => {
      if (document.contains(trigger)) trigger.focus({preventScroll:true});
    });
  }, [detailId]);

  const loadDependencies = useCallback(async () => {
    const sequence=++contactLoadSequence.current;
    const [nextTaxonomy, nextProfile, nextContacts] = await Promise.all([
      seputarJaminanService.getTaxonomy(),
      seputarJaminanService.getProfile(),
      seputarJaminanService.getContactPage({state:'VERIFIED',limit:20}),
    ]);
    setTaxonomy(nextTaxonomy);
    setProfile(nextProfile);
    if(sequence===contactLoadSequence.current){setContacts(nextContacts.items);setContactCursor(nextContacts.page_info.next_cursor);setContactMoreError(null);}
    return { nextTaxonomy, nextProfile, nextContacts:nextContacts.items };
  }, []);
  const loadCollateralPage = useCallback(async (query: string, page: number) => {
    const result = await seputarJaminanService.getEligibleCollaterals({ page, limit: 20, search: query.trim() || undefined });
    return { options: result.items.map(item => ({ value: item.id, label: `${item.collateral_number || "Tanpa nomor"} — ${item.collateral_type || item.description || "Agunan"}` })), nextPage: page < result.pagination.total_pages ? page + 1 : null };
  }, []);
  const loadDocumentPage = useCallback(async (query: string, page: number) => {
    const result = await arsipService.getPage({ page, limit: 20, search: query.trim() || undefined });
    return { options: result.items.map(item => ({ value: item.id, label: `${item.kode} — ${item.namaDokumen}` })), nextPage: page < result.meta.lastPage ? page + 1 : null };
  }, []);
  const loadMoreContactOptions=async()=>{
    if(!contactCursor||contactMoreBusy)return;
    const sequence=contactLoadSequence.current;setContactMoreBusy(true);setContactMoreError(null);
    try{const page=await seputarJaminanService.getContactPage({state:'VERIFIED',limit:20,cursor:contactCursor});
      if(sequence===contactLoadSequence.current){setContacts(rows=>[...rows,...page.items.filter(item=>!rows.some(old=>old.id===item.id))]);setContactCursor(page.page_info.next_cursor);}
    }catch(e){if(sequence===contactLoadSequence.current)setContactMoreError(readableError(e));}
    finally{setContactMoreBusy(false);}
  };

  const formGuard = useDiscardChanges(formOpen, form, () => setFormOpen(false), saving || uploading || saveOperation.uncertain);
  const canSubmitForm = access.hasCapability(SJ_CATALOG,'update') && Boolean(settings?.review_enabled)
    && (settings?.review_authority !== 'central' || Boolean(settings.review_submission_ready));
  const openCreate = async () => {
    if (!access.ensureCapability(SJ_CATALOG, "create")) return;
    if (!sjEntryAction(settings,'create_publication').available) return;
    formTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSaving(true);
    setFormError(null);
    try {
      const deps = await loadDependencies();
      const verifiedContacts = deps.nextContacts.filter((contact) => contact.state === "VERIFIED" && !contact.revoked_at && contact.current_version_id);
      if (deps.nextProfile?.state !== "VERIFIED" || !deps.nextProfile.current_version_id) {
        showToast("Profil BPRS harus disetujui sebelum membuat publikasi.", "warning");
        return;
      }
      if (verifiedContacts.length === 0) {
        showToast("Siapkan sedikitnya satu kontak WhatsApp terverifikasi.", "warning");
        return;
      }
      const firstCategory = deps.nextTaxonomy.categories[0];
      setEditing(null);
      setMediaUploadFiles([]);
      setMediaUploadError(null);
      setMediaUploadProgress({ completed: 0, total: 0 });
      setForm({
        ...EMPTY_FORM,
        asset_category: firstCategory?.code ?? "LAND",
        taxonomy_item_id: firstCategory?.items[0]?.id ?? "",
        profile_version_id: deps.nextProfile.current_version_id,
        whatsapp_contact_version_id: verifiedContacts.find((item) => item.is_default)?.current_version_id ?? "",
      });
      setFormOpen(true);
    } catch (loadError) {
      showToast(readableError(loadError), "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (publication: SjPublication) => {
    if (!access.ensureCapability(SJ_CATALOG, "update")) return;
    if (!ensureAction(publication, 'edit_draft')) return;
    formTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const version = publication.current_version;
    if (!version) return;
    setSaving(true);
    setFormError(null);
    try {
      const deps = await loadDependencies();
      setEditing(publication);
      setMediaUploadFiles([]);
      setMediaUploadError(null);
      setMediaUploadProgress({ completed: 0, total: 0 });
      setForm({
        source_type: publication.source_type,
        source_collateral_id: publication.source_collateral_id ?? "",
        manual_reason: "",
        manual_evidence_document_id: "",
        asset_category: publication.asset_category,
        taxonomy_item_id:
          deps.nextTaxonomy.categories.find((entry) => entry.code === publication.asset_category)?.items.find((item) => item.code === version.subcategory)?.id ?? "",
        title: version.title,
        description: version.description,
        city_regency: version.city_regency,
        province: version.province,
        whatsapp_contact_version_id: version.whatsapp_contact?.version_id ?? "",
        // A new draft uses the profile displayed below, not the older profile
        // embedded in the immutable publication snapshot.
        profile_version_id: deps.nextProfile?.state === 'VERIFIED'
          ? deps.nextProfile.current_version_id ?? '' : '',
        attributes: Object.fromEntries(Object.entries(version.attributes).map(([key, value]) => [key, value == null ? "" : String(value)])),
        media: version.media.map((media, index) => ({
          id: media.id,
          media_asset_id: media.id,
          sort_order: media.sort_order ?? index,
          is_cover: Boolean(media.is_cover),
          alt_text: media.alt_text ?? "",
          fileName: media.file_name || `Gambar ${index + 1}`,
          state: media.state,
          centralReady: media.central_ready,
          mimeType: media.mime_type,
          sizeBytes: media.size_bytes,
          width: media.width,
          height: media.height,
        })),
      });
      setFormOpen(true);
    } catch (loadError) {
      showToast(readableError(loadError), "error");
    } finally {
      setSaving(false);
    }
  };

  const categoryItems = useMemo(
    () => taxonomy?.categories.find((entry) => entry.code === form.asset_category)?.items ?? [],
    [form.asset_category, taxonomy],
  );
  const verifiedContacts = contacts.filter((contact) => contact.state === "VERIFIED" && !contact.revoked_at && contact.current_version_id);

  const updateCategory = (category: SjAssetCategory) => {
    const categoryItems = taxonomy?.categories.find((entry) => entry.code === category)?.items ?? [];
    setForm((current) => ({
      ...current,
      asset_category: category,
      taxonomy_item_id: categoryItems[0]?.id ?? "",
      attributes: {},
    }));
  };

  const uploadImages = async (files: File[]) => {
    const allowed=sjEntryAction(settings,'upload_media');
    if(!allowed.available){showToast(allowed.reason!, 'warning');return;}
    if (files.length === 0) return;
    if (form.media.length + files.length > 10) {
      showToast("Maksimal 10 gambar untuk satu publikasi.", "warning");
      setMediaUploadFiles([]);
      return;
    }
    setMediaUploadFiles(files);
    setMediaUploadError(null);
    setMediaUploadProgress({ completed: 0, total: files.length });
    setUploading(true);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          const media = await seputarJaminanService.uploadMedia(file, "PUBLICATION_IMAGE");
          setForm((current) => ({
            ...current,
            media: [
              ...current.media,
              {
                id: media.id,
                media_asset_id: media.id,
                sort_order: current.media.length,
                is_cover: current.media.length === 0,
                alt_text: "",
                fileName: media.file_name,
                state: media.state,
                centralReady: media.central_ready,
                mimeType: media.mime_type,
                sizeBytes: media.size_bytes,
                width: media.width,
                height: media.height,
              },
            ],
          }));
          setMediaUploadProgress({ completed: index + 1, total: files.length });
          setMediaUploadFiles(files.slice(index + 1));
        } catch (uploadError) {
          const message = readableError(uploadError);
          setMediaUploadFiles(files.slice(index));
          setMediaUploadError(message);
          showToast(message, "error");
          return;
        }
      }
      setMediaUploadFiles([]);
      showToast(`${files.length} gambar berhasil disimpan.`, "success");
    } finally {
      setUploading(false);
    }
  };

  const save = async (submit = false) => {
    if (saving || uploading || saveOperation.isRunning()) return;
    if (!access.ensureCapability(SJ_CATALOG, editing ? 'update' : 'create')) return;
    if (!editing && !sjEntryAction(settings,'create_publication').available) return;
    if (editing && !ensureAction(editing, 'edit_draft')) return;
    if (submit && !canSubmitForm) return;
    const validationMessage = validateForm(form, Boolean(editing));
    if (validationMessage) {
      setFormError(validationMessage);
      const targetId = validationTargetId(validationMessage);
      if (targetId) {
        requestAnimationFrame(() => {
          const target = document.getElementById(targetId);
          if (!(target instanceof HTMLElement)) return;
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: "center" });
        });
      }
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      setSubmittingForm(submit);
      const payload = toPayload(form);
      const result = await saveOperation.run({kind:'PUBLICATION',intent:submit ? 'SAVE_AND_SUBMIT' : 'SAVE_DRAFT',
        ...(editing ? {resource_id:editing.id} : {}),draft:editing ? {...editablePayload(payload),expected_version:editing.lock_version} : payload});
      if (!result) return;
      if (result.intent === 'SAVE_AND_SUBMIT' && result.state === 'DRAFT') {
        setSavedSubmissionNotice({id:result.resource_id,message:result.submission_error!});
        setFormOpen(false);
        updateListQuery({detail:result.resource_id});
        setDetailReload(value=>value+1);
        await reload();
        return;
      }
      showToast(result.intent === 'SAVE_AND_SUBMIT' ? 'Publikasi disimpan dan diajukan untuk diperiksa.' : 'Draf publikasi berhasil disimpan.', 'success');
      setSavedSubmissionNotice(null);
      setFormOpen(false);
      setDetailReload(value=>value+1);
      await reload();
    } catch (saveError) {
      setFormError(readableError(saveError));
      focusSaveError.current = true;
    } finally {
      setSaving(false);
      setSubmittingForm(false);
    }
  };

  const openDetail = (publication: SjPublication) => {
    setUnpublishConfirm(false);setArchiveConfirm(false);
    detailTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    updateListQuery({detail:publication.id});
    detailEntry.current=window.location.search;
  };

  const removeMedia = (mediaId: string) => {
    setForm((current) => {
      const removedWasCover = current.media.some((item) => item.id === mediaId && item.is_cover);
      const remaining = current.media
        .filter((item) => item.id !== mediaId)
        .map((item, index) => ({ ...item, sort_order: index }));
      return {
        ...current,
        media: removedWasCover && remaining[0]
          ? remaining.map((item, index) => ({ ...item, is_cover: index === 0 }))
          : remaining,
      };
    });
  };

  const runCommand = async (publication: SjPublication, command: "submit" | "reconfirm" | "unpublish" | "archive") => {
    if (!ensureAction(publication, command)) return;
    if (sjAction(publication, command).mode !== 'DIRECT') return;
    const feature = command === "reconfirm"
      ? "sj_reconfirm"
      : command === "unpublish"
        ? "sj_unpublish"
        : command === "archive"
          ? "sj_archive"
          : null;
    const featurePath = command === "reconfirm" ? SJ_SUMMARY : SJ_SUBMISSIONS;
    if (feature ? !access.ensureFeature(featurePath, feature) : !access.ensureCapability(SJ_CATALOG, "update")) return;
    if (
      command === "submit" &&
      settings?.review_authority === "central" &&
      !settings.review_submission_ready
    ) {
      showToast("Penerima pemeriksaan pusat belum siap. Pengajuan belum dapat dikirim.", "warning");
      return;
    }
    setActionLoading(true);
    setCommandError(null);
    try {
      if (command === "unpublish") {
        await seputarJaminanService.unpublishPublication(publication.id, publication.lock_version, "OWNER_REQUEST");
      } else {
        await seputarJaminanService.publicationCommand(publication.id, command, publication.lock_version);
      }
      showToast(
        command === "submit"
          ? "Publikasi diajukan untuk diperiksa."
          : command === "reconfirm"
            ? "Ketersediaan aset sudah dikonfirmasi."
            : command === "unpublish"
              ? "Penarikan dicatat di bank dan masuk antrean pengiriman. Status di website belum bisa dipastikan."
              : "Publikasi berhasil diarsipkan.",
        "success",
      );
      setUnpublishConfirm(false);setArchiveConfirm(false);
      closeDetail();
      await reload();
    } catch (commandError) {
      setCommandError(readableError(commandError));
    } finally {
      setActionLoading(false);
    }
  };

  const openPublicationChangeRequest = (publication: SjPublication, actions: SjChangeRequestAction[]) => {
    if (!access.ensureCapability(SJ_CATALOG, "update")) return;
    const names: Partial<Record<SjChangeRequestAction, string>> = {
      UNPUBLISH_PUBLICATION: 'unpublish', ARCHIVE_PUBLICATION: 'archive', RECONFIRM_PUBLICATION: 'reconfirm',
    };
    const permitted = actions.filter(action => {
      const name = names[action];
      return name && sjAction(publication, name).available && sjAction(publication, name).mode === 'REQUEST_CONTROL';
    });
    if (!permitted.length) {
      const name = names[actions[0]];
      showToast(name ? sjAction(publication, name).reason || 'Tindakan belum tersedia.' : 'Tindakan belum tersedia.', 'warning');
      return;
    }
    if (!settings?.review_submission_ready) {
      showToast("Penerima pemeriksaan pusat belum siap. Permintaan belum dapat dikirim.", "warning");
      return;
    }
    setChangeRequest({
      target: { kind: "publication", id: publication.id, label: publication.title || publication.reference_code, version: publication.lock_version },
      actions: permitted,
    });
  };

  const openMediaChangeRequest = (media: SjMedia) => {
    if (!access.ensureCapability(SJ_CATALOG, "update")) return;
    const assessment=sjMediaAction({...media,action_availability:detail?.media_actions?.[media.id]},'request_revoke');
    if(!assessment.available||assessment.mode!=='REQUEST_CONTROL'){showToast(assessment.reason||'Pencabutan belum tersedia.', 'warning');return;}
    if (!settings?.review_submission_ready) {
      showToast("Penerima pemeriksaan pusat belum siap. Permintaan belum dapat dikirim.", "warning");
      return;
    }
    setChangeRequest({ target: { kind: "media", id: media.id, label: media.file_name }, actions: ["REVOKE_MEDIA"] });
  };

  return (
    <DashboardPageShell spacing="lg" animated>
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Daftar Publikasi"
        description="Kelola draf dan status publikasi. Harga, dokumen internal, serta identitas nasabah tidak pernah ditampilkan di website publik."
        icon={Store}
        action={<><SjSecondaryButton disabled={loading || formOpen || Boolean(detailId)} aria-busy={loading || undefined} onClick={() => void reload()} aria-label="Muat ulang daftar publikasi"><RefreshCw className={loading ? "size-4 motion-safe:animate-spin" : "size-4"} aria-hidden="true" />Muat ulang</SjSecondaryButton>{sjEntryAction(settings,'create_publication').reason_code!=='PERMISSION_DENIED'?<SjPrimaryButton {...sjEntryButton(settings,'create_publication')} loading={saving} onClick={() => void openCreate()}><Plus className="size-4" aria-hidden="true" />Buat publikasi</SjPrimaryButton>:null}</>}
      />

      <SjSection
        title="Publikasi BPRS"
        description={loading ? "Memuat publikasi…" : error ? "Jumlah publikasi belum dapat dimuat." : `${items.length} publikasi pada halaman ini`}
      >
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(0,1fr)_180px_180px] lg:p-5" aria-label="Filter daftar publikasi">
          <SetupSearchInput containerClassName="col-span-2 xl:col-span-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul atau kode publikasi…" aria-label="Cari publikasi" />
          <SetupSelect value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} aria-label="Filter status">
            <option value="">Semua status</option>
            {Object.entries(PUBLICATION_STATE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SetupSelect>
          <SetupSelect value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SetupSelect>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-600" aria-label="Filter aktif dan urutan">
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={Boolean(confirmation)} onChange={e=>updateListQuery({confirmation:e.target.checked?'soon':'',cursor:'',page:''})}/>Konfirmasi ≤ 7 hari atau lewat tenggat</label>
          <span className="mr-auto">Urutan: terbaru dibuat</span>
{([{key:'search',value:search,label:`Pencarian: ${search}`},{key:'state',value:stateFilter,label:PUBLICATION_STATE_LABEL[stateFilter]||stateFilter},{key:'category',value:categoryFilter,label:CATEGORY_LABEL[categoryFilter as SjAssetCategory]||categoryFilter}]).filter(item=>item.value).map(item=><button key={item.key} type="button" aria-label={`Hapus filter ${item.label}`} onClick={()=>updateListQuery({[item.key]:'',cursor:'',page:''})} className="min-h-11 max-w-full break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-700 hover:border-sky-500 focus-visible:outline-2 focus-visible:outline-sky-600">{item.label} <span aria-hidden="true">×</span></button>)}
          {search||stateFilter||categoryFilter||confirmation||cursor||legacyPage||sort!=='created_desc'?<SjSecondaryButton onClick={()=>updateListQuery({search:'',state:'',category:'',confirmation:'',cursor:'',page:'',sort:''})}>Atur ulang</SjSecondaryButton>:null}
        </div>

        <SetupTableScroll aria-label="Gulir tabel publikasi">
        <SetupDataTable variant="crud" density="compact" className="lg:min-w-[960px]" style={{tableLayout:'fixed'}} aria-label="Daftar publikasi Seputar Jaminan">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[34%]" />
            <SetupDataTableCol className="w-[14%]" />
            <SetupDataTableCol className="w-[18%]" />
            <SetupDataTableCol className="w-[24%]" />
            <SetupDataTableCol className="w-[10%]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow>
              <SetupDataTableHeaderCell>Aset / versi kerja</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kategori</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pengajuan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Penayangan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className="text-center">Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {loading ? (
              <SetupDataTableEmptyRow colSpan={5} state="loading" className={`${SJ_TABLE_LOADING_CLASS} [&>div]:min-h-16`} loadingRows={20} loadingColumns={5}>
                Memuat publikasi…
              </SetupDataTableEmptyRow>
            ) : error ? (
              <SetupDataTableEmptyRow colSpan={5} state="error" description={error}>
                Publikasi belum dapat dimuat
              </SetupDataTableEmptyRow>
            ) : items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={5}
                icon={Store}
                isFiltered={Boolean(search.trim() || stateFilter || categoryFilter || confirmation)}
                description={
                  search.trim() || stateFilter || categoryFilter || confirmation
                    ? "Ubah kata kunci atau filter untuk melihat publikasi lain."
                    : "Buat publikasi pertama setelah profil BPRS dan kontak WhatsApp selesai diverifikasi."
                }
              >
                {search.trim() || stateFilter || categoryFilter || confirmation ? "Publikasi tidak ditemukan" : "Belum ada publikasi"}
              </SetupDataTableEmptyRow>
            ) : items.map((publication) => (
              <SetupDataTableRow key={publication.id}>
                <SetupDataTableCell>
                  <div className="flex min-w-0 items-start gap-3"><SjPublicationThumbnail publication={publication}/><div className="min-w-0 space-y-1">
                  <div><SetupTableCode>{publication.reference_code}</SetupTableCode></div>
                  <button
                    type="button"
                    style={{whiteSpace:'normal',overflowWrap:'anywhere'}}
                    className="setup-table-primary-text inline-flex min-h-11 items-center text-left break-words [overflow-wrap:anywhere] underline-offset-4 hover:text-sky-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30"
                    onClick={() => void openDetail(publication)}
                  >
                    {publication.title ?? "Draf tanpa judul"}
                  </button>
                  <span className="setup-table-secondary-text block">
                    {[publication.city_regency, publication.province].filter(Boolean).join(", ") || "Lokasi belum diisi"}
                  </span>
                  </div></div>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <span className="text-sm font-semibold text-slate-700">{CATEGORY_LABEL[publication.asset_category]}</span>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <div className="space-y-2">
                    <SjStatusBadge state={publication.state} />
                    {['FAILED','QUARANTINED','RETRYING'].includes(publication.sync_state)?<div><SjStatusBadge state={publication.sync_state} kind="sync" /></div>:null}
                  </div>
                </SetupDataTableCell>
                <SetupDataTableCell>
                    <SjPublicationListObservation publication={publication} onInspect={() => openDetail(publication)}/>
                </SetupDataTableCell>
                <SetupDataTableCell className="text-center">
                  <SetupActionMenu label={`Aksi publikasi ${publication.reference_code}`} menuLabel={`Aksi publikasi ${publication.reference_code}`} showDisabledItems items={[
                    {key:'detail',label:'Lihat detail',icon:Eye,disabled:actionLoading,disabledReason:'Tunggu proses yang sedang berjalan.',onClick:()=>void openDetail(publication)},
                    ...(["DRAFT", "REVISION_REQUIRED", "APPROVED", "PUBLISHED", "UNPUBLISHED"].includes(publication.state) && sjAction(publication,'edit_draft').reason_code!=='PERMISSION_DENIED' ? [{
                      key:'edit',label:publication.state === 'APPROVED' || publication.state === 'PUBLISHED' ? 'Ajukan perubahan' : 'Ubah',icon:Pencil,
                      disabled:saving || !sjAction(publication,'edit_draft').available,
                      disabledReason:saving ? 'Tunggu penyimpanan selesai.' : sjAction(publication,'edit_draft').reason || undefined,
                      onClick:()=>void openEdit(publication),
                    }] : []),
                  ]} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
        </SetupTableScroll>
        {!error ? <SjCursorNavigation key={`${search}:${stateFilter}:${categoryFilter}:${confirmation}`} busy={loading} label="publikasi" count={items.length} cursor={cursor} next={nextCursor} onNavigate={value => updateListQuery({cursor:value,page:''})} /> : null}
        {error && (cursor || legacyPage) ? <SjSecondaryButton onClick={() => updateListQuery({cursor:'',page:''})}>Kembali ke awal daftar</SjSecondaryButton> : null}
        {error?<div className="p-4"><SjSecondaryButton onClick={()=>void reload()}>Coba muat ulang daftar</SjSecondaryButton></div>:null}
      </SjSection>

      <DashboardModal
        isOpen={formOpen}
        onClose={formGuard.requestClose}
        closeDisabled={saving || uploading || saveOperation.uncertain}
        maxWidth="5xl"
        title={editing ? (editing.published_version ? "Ajukan perubahan publikasi" : "Perbarui draf publikasi") : "Buat publikasi baru"}
        description="Isi hanya informasi yang aman dilihat masyarakat. Kolom bertanda wajib harus dilengkapi."
        footer={saveOperation.uncertain ? <SjPrimaryButton loading={saving} onClick={() => void save()}>Periksa penyimpanan</SjPrimaryButton> : <><SjSecondaryButton disabled={saving || uploading} onClick={formGuard.requestClose}>Batal</SjSecondaryButton><SjSecondaryButton loading={saving && !submittingForm} disabled={saving || uploading} onClick={() => void save()}>Simpan draf</SjSecondaryButton>{access.hasCapability(SJ_CATALOG,'update') ? <SjPrimaryButton loading={saving && submittingForm} disabled={saving || uploading || !canSubmitForm} onClick={() => void save(true)}>{editing?.state === 'REVISION_REQUIRED' ? 'Simpan dan ajukan ulang' : 'Simpan dan ajukan'}</SjPrimaryButton> : null}</>}
      >
        {formError?<div id="sj-publication-save-error" tabIndex={-1} role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError} Isian tetap tersimpan di formulir ini.</div>:null}
        <fieldset disabled={saving || uploading || saveOperation.uncertain} className="min-w-0 space-y-5">
          {!canSubmitForm ? <p className="text-sm text-slate-600">Pengajuan belum tersedia. Anda masih bisa menyimpan draf.</p> : null}
          {editing?.current_version?.rejection_reason?<SetupState variant="error" title="Catatan perbaikan" description={editing.current_version.rejection_reason}/>:null}
          <SetupFormSection
            title="Data aset"
            description="Pilih sumber dan isi informasi yang boleh dilihat masyarakat."
          >
            {editing ? (
              <div className="md:col-span-2">
                <p className="font-semibold text-slate-950">
                  {editing.source_type === "COLLATERAL"
                    ? "Agunan yang sudah ada di Ruwang"
                    : "Input manual dengan dokumen bukti"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Sumber data tidak dapat diganti setelah publikasi dibuat.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="sj-publication-source-type" className="space-y-2 text-sm font-semibold text-slate-700">
                  Sumber data
                  <SetupSelect
                    id="sj-publication-source-type"
                    value={form.source_type}
                    onChange={(event) => { const value = event.target.value as SjSourceType; setForm((current) => ({ ...current, source_type: value })); }}
                  >
                    <option value="COLLATERAL">Agunan yang sudah ada di Ruwang</option>
                    <option value="MANUAL">Input manual dengan dokumen bukti</option>
                  </SetupSelect>
                </label>
                {form.source_type === "COLLATERAL" ? (
                  <label htmlFor="sj-publication-source-collateral" className="space-y-2 text-sm font-semibold text-slate-700">
                    Pilih agunan <span className="text-rose-600">*</span>
                    <SearchableSelect
                      id="sj-publication-source-collateral"
                      required
                      value={form.source_collateral_id}
                      onChange={(value) => setForm((current) => ({ ...current, source_collateral_id: value }))}
                      loadPage={loadCollateralPage}
                      placeholder="Pilih agunan…"
                      searchPlaceholder="Cari nomor atau keterangan agunan…"
                    />
                  </label>
                ) : (
                  <label htmlFor="sj-publication-manual-evidence" className="space-y-2 text-sm font-semibold text-slate-700">
                    Dokumen bukti <span className="text-rose-600">*</span>
                    <SearchableSelect
                      id="sj-publication-manual-evidence"
                      required
                      value={form.manual_evidence_document_id}
                      onChange={(value) => setForm((current) => ({ ...current, manual_evidence_document_id: value }))}
                      loadPage={loadDocumentPage}
                      placeholder="Pilih dokumen Ruwang…"
                      searchPlaceholder="Cari kode atau nama dokumen…"
                    />
                  </label>
                )}
                {form.source_type === "MANUAL" ? (
                  <label htmlFor="sj-publication-manual-reason" className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
                    Alasan input manual <span className="text-rose-600">*</span>
                    <SetupTextarea
                      id="sj-publication-manual-reason"
                      required
                      minLength={10}
                      rows={3}
                      value={form.manual_reason}
                      onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, manual_reason: value })); }}
                    />
                  </label>
                ) : null}
              </>
            )}

            <label htmlFor="sj-publication-category" className="space-y-2 text-sm font-semibold text-slate-700">
              Kategori <span className="text-rose-600">*</span>
              <SetupSelect
                id="sj-publication-category"
                value={form.asset_category}
                onChange={(event) => updateCategory(event.target.value as SjAssetCategory)}
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </SetupSelect>
            </label>
            <label htmlFor="sj-publication-taxonomy" className="space-y-2 text-sm font-semibold text-slate-700">
              Jenis aset <span className="text-rose-600">*</span>
              <SetupSelect
                id="sj-publication-taxonomy"
                required
                value={form.taxonomy_item_id}
                onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, taxonomy_item_id: value })); }}
              >
                <option value="">Pilih jenis aset…</option>
                {categoryItems.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </SetupSelect>
            </label>
            <label htmlFor="sj-publication-title" className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              Judul publikasi <span className="text-rose-600">*</span>
              <SetupTextInput
                id="sj-publication-title"
                required
                minLength={5}
                maxLength={160}
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((current) => ({ ...current, title }));
                }}
                placeholder="Contoh: Rumah tinggal dua lantai"
              />
            </label>
            <label htmlFor="sj-publication-description" className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              Deskripsi publik <span className="text-rose-600">*</span>
              <SetupTextarea
                id="sj-publication-description"
                required
                minLength={20}
                maxLength={5000}
                rows={5}
                value={form.description}
                onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, description: value })); }}
                placeholder="Jelaskan karakter aset dan lingkungan secara ringkas tanpa alamat lengkap atau data nasabah."
              />
            </label>
          </SetupFormSection>

          <SetupFormSection
            title="Lokasi dan spesifikasi"
            description="Gunakan lokasi umum dan spesifikasi yang aman untuk dipublikasikan."
          >
            <label htmlFor="sj-publication-city" className="space-y-2 text-sm font-semibold text-slate-700">
              Kota/Kabupaten <span className="text-rose-600">*</span>
              <SetupTextInput
                id="sj-publication-city"
                required
                value={form.city_regency}
                onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, city_regency: value })); }}
              />
            </label>
            <label htmlFor="sj-publication-province" className="space-y-2 text-sm font-semibold text-slate-700">
              Provinsi <span className="text-rose-600">*</span>
              <SetupTextInput
                id="sj-publication-province"
                required
                value={form.province}
                onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, province: value })); }}
              />
            </label>
            {ATTRIBUTE_FIELDS[form.asset_category].map((field) => {
              const inputId = `sj-publication-attribute-${field.key}`;
              return (
                <label key={field.key} htmlFor={inputId} className="space-y-2 text-sm font-semibold text-slate-700">
                  {ATTRIBUTE_LABEL[field.key]} {field.required ? <span className="text-rose-600">*</span> : <span className="font-normal text-slate-600">(opsional)</span>}
                  {field.kind === "vocabulary" && field.vocabulary ? (
                    <SetupSelect
                      id={inputId}
                      required={field.required}
                      value={form.attributes[field.key] ?? ""}
                      onChange={(event) => { const value=event.target.value; setForm((current) => ({...current,attributes:{...current.attributes,[field.key]:value}})); }}
                    >
                      <option value="">Pilih…</option>
                      {(taxonomy?.vocabularies[field.vocabulary] ?? []).map((value) => (
                        <option key={value} value={value}>{VOCABULARY_LABEL[value] ?? value}</option>
                      ))}
                    </SetupSelect>
                  ) : (
                    <SetupTextInput
                      id={inputId}
                      type={field.kind === "number" ? "number" : "text"}
                      min={field.kind === "number" ? 0 : undefined}
                      required={field.required}
                      value={form.attributes[field.key] ?? ""}
                      onChange={(event) => { const value=event.target.value; setForm((current) => ({...current,attributes:{...current.attributes,[field.key]:value}})); }}
                    />
                  )}
                </label>
              );
            })}
          </SetupFormSection>



          <SetupFormSection
            title="Foto"
            description="Tambahkan 1–10 gambar yang aman dipublikasikan, maksimal 10 MB per gambar. Data lokasi foto otomatis dibersihkan."
            contentClassName="md:grid-cols-1"
          >
            <MultiFileUploadField
              id="sj-publication-add-media"
              accept={SJ_PUBLIC_IMAGE_ACCEPT}
              label="Gambar publik"
              required={false}
              disabled={uploading || form.media.length >= 10 || !sjEntryAction(settings,'upload_media').available}
              files={mediaUploadFiles}
              maxFiles={Math.max(1, 10 - form.media.length)}
              title={
                uploading
                  ? "Mengunggah gambar…"
                  : form.media.length > 0
                    ? "Tambah gambar"
                    : "Pilih gambar"
              }
              description="Klik area ini atau drag & drop gambar JPG, PNG, atau WebP"
              emptyFileMeta={`${form.media.length}/10 gambar tersimpan · maksimal 10 MB per gambar`}
              helperText="Pilih satu gambar utama dan isi keterangan yang menjelaskan isi setiap gambar."
              validateFile={validateSjPublicImage}
              onValidationError={setMediaUploadError}
              onChange={(files) => {
                setMediaUploadError(null);
                setMediaUploadFiles(files);
                if (files.length > 0) void uploadImages(files);
              }}
            />
            {!sjEntryAction(settings,'upload_media').available?<p className="text-sm text-slate-600">{sjEntryAction(settings,'upload_media').reason}</p>:null}
            {uploading && mediaUploadProgress.total > 0 ? (
              <div className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                  <span>Menyimpan gambar</span>
                  <span className="tabular-nums">
                    {mediaUploadProgress.completed}/{mediaUploadProgress.total}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Kemajuan unggah gambar publikasi"
                  aria-valuemin={0}
                  aria-valuemax={mediaUploadProgress.total}
                  aria-valuenow={mediaUploadProgress.completed}
                >
                  <div
                    className="h-full rounded-full bg-sky-600 transition-[width] duration-200 motion-reduce:transition-none"
                    style={{ width: `${(mediaUploadProgress.completed / mediaUploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}
            {mediaUploadError ? (
              <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <div>
                  <p className="text-sm font-bold text-rose-900">Gambar belum berhasil diunggah</p>
                  <p className="mt-1 text-sm leading-6 text-rose-800">{mediaUploadError}</p>
                </div>
                {mediaUploadFiles.length > 0 ? (
                  <SjSecondaryButton
                    loading={uploading}
                    {...sjEntryButton(settings,'upload_media')}
                    onClick={() => void uploadImages(mediaUploadFiles)}
                  >
                    {!uploading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
                    Coba lagi
                  </SjSecondaryButton>
                ) : null}
              </div>
            ) : null}
            {form.media.length === 0 ? (
              <SetupState title="Belum ada gambar" description="Tambahkan sedikitnya satu gambar yang aman untuk dipublikasikan." icon={ImagePlus} />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {form.media.map((media, index) => (
                  <article key={media.id} className="grid min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                    <SjMediaPreview
                      mediaId={media.media_asset_id}
                      alt={media.alt_text || `Pratinjau ${media.fileName}`}
                      className="aspect-[4/3] w-full"
                    />
                    <div className="min-w-0 space-y-3">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm font-bold leading-5 text-slate-900">{media.fileName}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Gambar {index + 1} · {formatSjMediaMeta({
                              mime_type: media.mimeType,
                              size_bytes: media.sizeBytes,
                              width: media.width,
                              height: media.height,
                              central_ready: media.centralReady,
                            })}
                          </p>
                        </div>
                        <SjStatusBadge state={media.state} />
                      </div>
                      <SetupTextInput
                        id={`sj-publication-media-alt-${index}`}
                        aria-label={`Keterangan gambar ${index + 1} untuk aksesibilitas`}
                        required
                        minLength={3}
                        maxLength={240}
                        value={media.alt_text}
                        onChange={(event) => {const alt_text=event.target.value;setForm((current) => ({
                          ...current,
                          media: current.media.map((item) => item.id === media.id ? { ...item, alt_text } : item),
                        }));}}
                        placeholder="Jelaskan isi gambar"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {media.is_cover ? (
                          <SetupStatusBadge status="Gambar utama" label="Gambar utama" tone="emerald" showIcon />
                        ) : (
                          <SjSecondaryButton
                            id={`sj-publication-cover-${index}`}
                            onClick={() => setForm((current) => ({
                              ...current,
                              media: current.media.map((item) => ({ ...item, is_cover: item.id === media.id })),
                            }))}
                          >
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            Jadikan utama
                          </SjSecondaryButton>
                        )}
                        <button
                          type="button"
                          className="uiverse-modal-button uiverse-modal-button--danger"
                          onClick={() => removeMedia(media.id)}
                          aria-label={`Hapus ${media.fileName} dari publikasi`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Hapus dari publikasi
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SetupFormSection>
          <SetupFormSection
            title="Kontak"
            description="Pilih kontak WhatsApp untuk aset ini. Kontak utama dapat diganti."
          >
            <label htmlFor="sj-publication-whatsapp-contact" className="space-y-2 text-sm font-semibold text-slate-700">
              Kontak WhatsApp <span className="text-rose-600">*</span>
              <SetupSelect
                id="sj-publication-whatsapp-contact"
                required
                value={form.whatsapp_contact_version_id}
                onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, whatsapp_contact_version_id: value })); }}
              >
                <option value="">Pilih kontak…</option>
                {form.whatsapp_contact_version_id&&!verifiedContacts.some(c=>c.current_version_id===form.whatsapp_contact_version_id)?<option value={form.whatsapp_contact_version_id}>Kontak yang tersimpan pada versi ini</option>:null}
                {verifiedContacts.map((contact) => (
                  <option key={contact.id} value={contact.current_version_id ?? ""}>
                    {contact.label} · berakhir {contact.phone_e164.slice(-4)}{contact.is_default ? " · utama" : ""}
                  </option>
                ))}
              </SetupSelect>
            </label>
            {contactCursor?<SjSecondaryButton disabled={contactMoreBusy} onClick={()=>void loadMoreContactOptions()}>{contactMoreBusy?'Memuat kontak…':'Muat pilihan kontak berikutnya'}</SjSecondaryButton>:null}
            {contactMoreError?<p role="alert" className="text-sm text-rose-700">{contactMoreError}</p>:null}
            <div className="flex items-start gap-3 pt-1 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-900">Profil BPRS yang disetujui</p>
                <p className="mt-1 leading-6">{profile?.display_name ?? "Profil belum tersedia"}</p>
              </div>
            </div>
          </SetupFormSection>
        </fieldset>
      </DashboardModal>

      <DashboardModal
        isOpen={Boolean(detailId) && !formOpen && !changeRequest}
        onClose={closeDetail}
        closeDisabled={actionLoading}
        maxWidth="3xl"
        title={detail?.title ? detail.title.length>72?`${detail.title.slice(0,72)}…`:detail.title : "Detail publikasi"}
        ariaLabel={detail?.title ?? "Detail publikasi"}
        description={detail ? `${detail.reference_code} · ${CATEGORY_LABEL[detail.asset_category]}` : undefined}
        footer={detail ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            <SjSecondaryButton disabled={actionLoading} onClick={closeDetail}>Kembali ke daftar</SjSecondaryButton>
            {commandError?<p role="alert" className="w-full text-sm text-rose-700">{commandError} Muat ulang detail sebelum mencoba lagi.</p>:null}
            {commandError?<SjSecondaryButton disabled={actionLoading} onClick={()=>setDetailReload(value=>value+1)}>Muat ulang detail</SjSecondaryButton>:null}
            {settings?.review_authority === "local" && detail.workflow_eligibility?.withdrawal.eligible && unpublishConfirm ? (
              <>
                <p className="w-full text-sm leading-6 text-slate-600" role="status">
                  Penarikan versi yang sudah disetujui akan dikirim ke Seputar Jaminan. Draf perubahan tetap tersimpan. Ini belum memastikan publikasi sudah hilang dari website.
                </p>
                <SjSecondaryButton disabled={actionLoading} onClick={() => setUnpublishConfirm(false)}>
                  Batal
                </SjSecondaryButton>
                <button
                  type="button"
                  className="uiverse-modal-button uiverse-modal-button--danger"
                  disabled={actionLoading || !sjAction(detail, 'unpublish').available}
                  aria-busy={actionLoading || undefined}
                  onClick={() => void runCommand(detail, "unpublish")}
                >
                  {actionLoading ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                  Ya, tarik dari website
                </button>
              </>
            ) : null}
            {archiveConfirm&&settings?.review_authority==='local'?<>
              <p role="status" className="w-full text-sm text-slate-600">Publikasi dipindahkan ke arsip, bukan dihapus. Ini bukan tindakan penarikan dari website.</p>
              <SjSecondaryButton disabled={actionLoading} onClick={()=>setArchiveConfirm(false)}>Batal</SjSecondaryButton>
              <button type="button" className="uiverse-modal-button uiverse-modal-button--danger" disabled={actionLoading||!sjAction(detail,'archive').available} onClick={()=>void runCommand(detail,'archive')}>Ya, arsipkan publikasi</button>
            </>:null}
            {!unpublishConfirm && !archiveConfirm ? <SjRecordActions subject={detail} busy={actionLoading} label="Aksi publikasi" actions={[
              ...(detail.state==='DRAFT'?[{name:'submit',label:'Ajukan pemeriksaan',icon:Send,primary:true,onClick:()=>void runCommand(detail,'submit')}]:[]),
              ...(['DRAFT','REVISION_REQUIRED','APPROVED','PUBLISHED','UNPUBLISHED'].includes(detail.state)?[{name:'edit_draft',label:detail.state==='REVISION_REQUIRED'?'Perbaiki publikasi':detail.published_version?'Ajukan perubahan':'Perbarui draf',icon:Pencil,primary:true,onClick:()=>void openEdit(detail)}]:[]),
              ...(detail.state==='PUBLISHED'?[{name:'reconfirm',label:'Konfirmasi tersedia',icon:RefreshCw,onClick:()=>settings?.review_authority==='central'?openPublicationChangeRequest(detail,['RECONFIRM_PUBLICATION']):void runCommand(detail,'reconfirm')}]:[]),
              ...(detail.workflow_eligibility?.withdrawal.eligible?[{name:'unpublish',label:settings?.review_authority==='central'?'Ajukan penarikan':'Tarik dari website',icon:EyeOff,destructive:true,onClick:()=>settings?.review_authority==='central'?openPublicationChangeRequest(detail,['UNPUBLISH_PUBLICATION']):setUnpublishConfirm(true)}]:[]),
              ...((settings?.review_authority==='central'&&(Boolean(detail.published_version)||['PUBLISHED','UNPUBLISHED'].includes(detail.state)))||(settings?.review_authority==='local'&&['UNPUBLISHED','REVISION_REQUIRED'].includes(detail.state))?[{name:'archive',label:settings?.review_authority==='central'?'Ajukan arsip':'Arsipkan publikasi',icon:Archive,destructive:true,onClick:()=>settings?.review_authority==='central'?openPublicationChangeRequest(detail,['ARCHIVE_PUBLICATION']):setArchiveConfirm(true)}]:[]),
            ]}/> : null}
            {!unpublishConfirm && !archiveConfirm && !detail.workflow_eligibility?.withdrawal.eligible && detail.workflow_eligibility?.withdrawal.reason && sjAction(detail,'unpublish').reason_code!=='PERMISSION_DENIED' ? <p className="w-full text-sm text-slate-600">{detail.workflow_eligibility.withdrawal.reason}</p>:null}
          </div>
        ) : undefined}
      >
        {detailBusy?<SetupState variant="loading" title="Memuat detail publikasi…"/>:null}
        {savedSubmissionNotice?.id===detailId && (!detail || detail.state==='DRAFT') ? <DashboardNotice tone="amber" title="Draf tersimpan, tetapi belum diajukan" description={savedSubmissionNotice.message}/> : null}
        {detailError?<div className="space-y-3"><SetupState variant="error" title="Detail belum dapat dimuat" description={detailError}/><SjSecondaryButton onClick={()=>setDetailReload(value=>value+1)}>Coba lagi</SjSecondaryButton><SjSecondaryButton onClick={closeDetail}>Kembali ke daftar</SjSecondaryButton></div>:null}
        {detail ? (
          <div className="space-y-5">
            <SjWorkflowSummary state={detail.state} syncState={detail.sync_state} />
            <SeputarJaminanObservation key={detail.id} kind="publication" id={detail.id} subject={detail} />
            <SjPublicationContent publication={detail} mediaAction={settings?.review_authority === 'central' ? media => {
              const action=sjMediaAction({...media,action_availability:detail.media_actions?.[media.id]},'request_revoke');
              if(action.reason_code==='PERMISSION_DENIED')return null;
              return <div className="space-y-2"><SjSecondaryButton disabled={!action.available} title={action.reason||undefined} onClick={() => openMediaChangeRequest(media)}><Trash2 className="size-4" aria-hidden="true" />Ajukan pencabutan</SjSecondaryButton>{!action.available?<p className="text-sm text-slate-600">{action.reason}</p>:null}</div>;
            } : undefined}/>
            {detail.current_version&&detail.published_version&&detail.current_version.id!==detail.published_version.id?<SjPublicationVersions working={detail.current_version} approved={detail.published_version} />:null}
            {settings?.review_authority === "central" && !settings.review_submission_ready ? (
              <DashboardNotice
                tone="amber"
                title="Pengajuan belum dapat dikirim"
                description="Penerima pemeriksaan pusat belum siap. Draf tetap tersimpan dan dapat dilanjutkan setelah sambungan tersedia."
              />
            ) : null}
            {settings?.review_authority === "central" && ["PUBLISHED", "UNPUBLISHED"].includes(detail.state) ? (
              <DashboardNotice
                tone="sky"
                title="Penarikan dan arsip diputuskan melalui Control"
                description="Bank mengajukan alasan dan dampak yang diharapkan. Data tidak dihapus fisik dan keputusan diterapkan setelah pemeriksaan pusat."
              />
            ) : null}
            {detail.current_version?.rejection_reason ? (
              <SetupState
                variant="error"
                title="Perlu diperbaiki"
                description={detail.current_version.rejection_reason}
              />
            ) : null}


          </div>
        ) : null}
      </DashboardModal>

      {formGuard.confirmation}
      <SeputarJaminanChangeRequestModal
        open={Boolean(changeRequest)}
        target={changeRequest?.target ?? null}
        actions={changeRequest?.actions ?? []}
        onClose={() => setChangeRequest(null)}
        onSubmitted={async()=>{await reload();setDetailReload(value=>value+1);}}
      />
    </DashboardPageShell>
  );
}
