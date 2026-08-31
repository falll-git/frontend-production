"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Store,
  Trash2,
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
  SetupTableCode,
} from "@/components/ui/SetupDataTable";
import DashboardModal from "@/components/ui/DashboardModal";
import useSeputarJaminanModalScrollLock from "@/components/seputar-jaminan/useSeputarJaminanModalScrollLock";
import MultiFileUploadField from "@/components/ui/MultiFileUploadField";
import Pagination from "@/components/ui/Pagination";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupState from "@/components/ui/SetupState";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupViewButton from "@/components/ui/SetupViewButton";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { arsipService } from "@/services/arsip.service";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { Dokumen } from "@/types/arsip.types";
import type {
  SjAssetCategory,
  SjContact,
  SjEligibleCollateral,
  SjMediaDraft,
  SjProfile,
  SjPublication,
  SjPublicationDraftPayload,
  SjSourceType,
  SjTaxonomy,
} from "@/types/seputar-jaminan.types";
import {
  ATTRIBUTE_LABEL,
  CATEGORY_LABEL,
  PUBLICATION_STATE_LABEL,
  SJ_CATALOG,
  SjPageHeader,
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

const REVIEW_ACTION_LABEL: Record<string, string> = {
  SUBMITTED: "Diajukan untuk pemeriksaan",
  REVISION_REQUESTED: "Diminta untuk diperbaiki",
  APPROVED: "Disetujui",
  PUBLISH_REQUESTED: "Diajukan untuk ditayangkan",
  UNPUBLISHED: "Diturunkan dari katalog publik",
  RECONFIRMED: "Ketersediaan dikonfirmasi",
  ARCHIVED: "Diarsipkan",
};

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
    return "Pilih agunan yang menjadi sumber katalog.";
  }
  if (!sourceIsLocked && form.source_type === "MANUAL") {
    if (!form.manual_evidence_document_id) return "Pilih dokumen bukti untuk input manual.";
    if (form.manual_reason.trim().length < 10) {
      return "Jelaskan alasan input manual sedikitnya 10 karakter.";
    }
  }
  if (!form.taxonomy_item_id) return "Pilih jenis aset.";
  if (form.title.trim().length < 5) return "Judul katalog harus berisi sedikitnya 5 karakter.";
  if (form.description.trim().length < 20) {
    return "Deskripsi publik harus berisi sedikitnya 20 karakter.";
  }
  if (form.city_regency.trim().length < 2) return "Isi kota atau kabupaten aset.";
  if (form.province.trim().length < 2) return "Isi provinsi aset.";
  if (!form.whatsapp_contact_version_id) return "Pilih kontak WhatsApp untuk katalog ini.";
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
    "Pilih agunan yang menjadi sumber katalog.": "sj-publication-source-collateral",
    "Pilih dokumen bukti untuk input manual.": "sj-publication-manual-evidence",
    "Jelaskan alasan input manual sedikitnya 10 karakter.": "sj-publication-manual-reason",
    "Pilih jenis aset.": "sj-publication-taxonomy",
    "Judul katalog harus berisi sedikitnya 5 karakter.": "sj-publication-title",
    "Deskripsi publik harus berisi sedikitnya 20 karakter.": "sj-publication-description",
    "Isi kota atau kabupaten aset.": "sj-publication-city",
    "Isi provinsi aset.": "sj-publication-province",
    "Pilih kontak WhatsApp untuk katalog ini.": "sj-publication-whatsapp-contact",
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
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<SjPublication | null>(null);
  const [editing, setEditing] = useState<SjPublication | null>(null);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [taxonomy, setTaxonomy] = useState<SjTaxonomy | null>(null);
  const [profile, setProfile] = useState<SjProfile | null>(null);
  const [contacts, setContacts] = useState<SjContact[]>([]);
  const [collaterals, setCollaterals] = useState<SjEligibleCollateral[]>([]);
  const [documents, setDocuments] = useState<Dokumen[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaUploadFiles, setMediaUploadFiles] = useState<File[]>([]);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaUploadProgress, setMediaUploadProgress] = useState({ completed: 0, total: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  useSeputarJaminanModalScrollLock(formOpen || Boolean(detail));
  const formTriggerRef = useRef<HTMLElement | null>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const { showToast } = useAppToast();
  const access = useProtectedAction();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await seputarJaminanService.getPublications({
        page,
        limit: 20,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(stateFilter ? { state: stateFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
      });
      setItems(result.items);
      setTotal(result.pagination.total);
      setLastPage(Math.max(1, result.pagination.total_pages));
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page, search, stateFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (formOpen || !formTriggerRef.current) return;
    const trigger = formTriggerRef.current;
    requestAnimationFrame(() => {
      if (document.contains(trigger)) trigger.focus();
    });
  }, [formOpen]);

  useEffect(() => {
    if (detail || !detailTriggerRef.current) return;
    const trigger = detailTriggerRef.current;
    requestAnimationFrame(() => {
      if (document.contains(trigger)) trigger.focus();
    });
  }, [detail]);

  const loadDependencies = useCallback(async () => {
    const [nextTaxonomy, nextProfile, nextContacts, collateralPage, documentPage] = await Promise.all([
      seputarJaminanService.getTaxonomy(),
      seputarJaminanService.getProfile(),
      seputarJaminanService.getContacts(),
      seputarJaminanService.getEligibleCollaterals({ page: 1, limit: 100 }),
      arsipService.getPage({ page: 1, limit: 100 }),
    ]);
    setTaxonomy(nextTaxonomy);
    setProfile(nextProfile);
    setContacts(nextContacts);
    setCollaterals(collateralPage.items);
    setDocuments(documentPage.items);
    return { nextTaxonomy, nextProfile, nextContacts };
  }, []);

  const openCreate = async () => {
    if (!access.ensureCapability(SJ_CATALOG, "create")) return;
    formTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSaving(true);
    try {
      const deps = await loadDependencies();
      const verifiedContacts = deps.nextContacts.filter((contact) => contact.state === "VERIFIED" && contact.current_version_id);
      if (deps.nextProfile?.state !== "VERIFIED" || !deps.nextProfile.current_version_id) {
        showToast("Profil BPRS harus disetujui sebelum membuat katalog.", "warning");
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
        whatsapp_contact_version_id: verifiedContacts.find((item) => item.is_default)?.current_version_id ?? verifiedContacts[0].current_version_id ?? "",
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
    formTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const version = publication.current_version;
    if (!version) return;
    setSaving(true);
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
          deps.nextTaxonomy.categories.flatMap((entry) => entry.items).find((item) => item.code === version.subcategory)?.id ?? "",
        title: version.title,
        description: version.description,
        city_regency: version.city_regency,
        province: version.province,
        whatsapp_contact_version_id: version.whatsapp_contact?.version_id ?? "",
        profile_version_id: version.profile_version_id,
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
  const verifiedContacts = contacts.filter((contact) => contact.state === "VERIFIED" && contact.current_version_id);

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
    if (files.length === 0) return;
    if (form.media.length + files.length > 10) {
      showToast("Maksimal 10 gambar untuk satu katalog.", "warning");
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

  const save = async () => {
    const validationMessage = validateForm(form, Boolean(editing));
    if (validationMessage) {
      showToast(validationMessage, "warning");
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
    try {
      const payload = toPayload(form);
      if (editing) {
        await seputarJaminanService.updatePublication(editing.id, {
          ...editablePayload(payload),
          expected_version: editing.lock_version,
        });
        showToast("Draf katalog berhasil diperbarui.", "success");
      } else {
        await seputarJaminanService.createPublication(payload);
        showToast("Draf katalog berhasil dibuat.", "success");
      }
      setFormOpen(false);
      await load();
    } catch (saveError) {
      showToast(readableError(saveError), "error");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (publication: SjPublication) => {
    detailTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActionLoading(true);
    try {
      setDetail(await seputarJaminanService.getPublication(publication.id));
    } catch (detailError) {
      showToast(readableError(detailError), "error");
    } finally {
      setActionLoading(false);
    }
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

  const runCommand = async (publication: SjPublication, command: "submit" | "reconfirm" | "archive") => {
    const feature = command === "reconfirm" ? "sj_reconfirm" : command === "archive" ? "sj_archive" : null;
    if (feature ? !access.ensureFeature("/dashboard/seputar-jaminan", feature) : !access.ensureCapability(SJ_CATALOG, "update")) return;
    setActionLoading(true);
    try {
      await seputarJaminanService.publicationCommand(publication.id, command, publication.lock_version);
      showToast(
        command === "submit" ? "Katalog diajukan untuk diperiksa." : command === "reconfirm" ? "Ketersediaan aset sudah dikonfirmasi." : "Katalog berhasil diarsipkan.",
        "success",
      );
      setDetail(null);
      await load();
    } catch (commandError) {
      showToast(readableError(commandError), "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardPageShell spacing="lg" animated>
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Katalog aset"
        description="Kelola draf dan status katalog. Harga, dokumen internal, serta identitas nasabah tidak pernah ditampilkan di website publik."
        icon={Store}
        action={<SjPrimaryButton loading={saving} onClick={() => void openCreate()}><Plus className="size-4" aria-hidden="true" />Buat katalog</SjPrimaryButton>}
      />

      <SjSection
        title="Daftar katalog"
        description={`${total} katalog ditemukan`}
        action={(
          <SjSecondaryButton
            className="self-start px-3 py-2 text-sm"
            onClick={() => void load()}
            loading={loading}
            aria-label="Muat ulang daftar katalog"
          >
            {!loading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
            Muat ulang
          </SjSecondaryButton>
        )}
      >
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(280px,1fr)_220px_220px] lg:p-5" aria-label="Filter daftar katalog">
          <SetupSearchInput containerClassName="col-span-2 lg:col-span-1" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari judul atau kode katalog…" aria-label="Cari katalog" />
          <SetupSelect value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }} aria-label="Filter status">
            <option value="">Semua status</option>
            {Object.entries(PUBLICATION_STATE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SetupSelect>
          <SetupSelect value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SetupSelect>
        </div>

        <SetupDataTable variant="crud" density="compact" className="[table-layout:fixed]" aria-label="Daftar publikasi Seputar Jaminan">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[13%]" />
            <SetupDataTableCol className="w-[13%]" />
            <SetupDataTableCol className="w-[22%]" />
            <SetupDataTableCol className="w-[16%]" />
            <SetupDataTableCol className="w-[18%]" />
            <SetupDataTableCol className="w-[18%]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow>
              <SetupDataTableHeaderCell>Kode</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kategori</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Judul</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Lokasi</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className="text-center">Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {loading ? (
              <SetupDataTableEmptyRow colSpan={6} state="loading" loadingRows={3} loadingColumns={6}>
                Memuat katalog…
              </SetupDataTableEmptyRow>
            ) : error ? (
              <SetupDataTableEmptyRow colSpan={6} state="error" description={error}>
                Katalog belum dapat dimuat
              </SetupDataTableEmptyRow>
            ) : items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={6}
                icon={Store}
                isFiltered={Boolean(search.trim() || stateFilter || categoryFilter)}
                description={
                  search.trim() || stateFilter || categoryFilter
                    ? "Ubah kata kunci atau filter untuk melihat katalog lain."
                    : "Buat katalog pertama setelah profil BPRS dan kontak WhatsApp selesai diverifikasi."
                }
              >
                {search.trim() || stateFilter || categoryFilter ? "Katalog tidak ditemukan" : "Belum ada katalog"}
              </SetupDataTableEmptyRow>
            ) : items.map((publication) => (
              <SetupDataTableRow key={publication.id}>
                <SetupDataTableCell>
                  <SetupTableCode>{publication.reference_code}</SetupTableCode>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <span className="text-sm font-semibold text-slate-700">{CATEGORY_LABEL[publication.asset_category]}</span>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <h3 className="setup-table-primary-text">{publication.title ?? "Draf tanpa judul"}</h3>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <span className="setup-table-secondary-text block">
                    {[publication.city_regency, publication.province].filter(Boolean).join(", ") || "Lokasi belum diisi"}
                  </span>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <SjStatusBadge state={publication.state} />
                    <SjStatusBadge state={publication.sync_state} kind="sync" />
                  </div>
                </SetupDataTableCell>
                <SetupDataTableCell className="text-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    {publication.state !== "ARCHIVED" ? (
                      <SjSecondaryButton onClick={() => void openEdit(publication)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        Ubah
                      </SjSecondaryButton>
                    ) : null}
                    <SetupViewButton disabled={actionLoading} label="Lihat detail" onClick={() => void openDetail(publication)} />
                  </div>
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={page} lastPage={lastPage} total={total} limit={20} isLoading={loading} onPageChange={setPage} />
      </SjSection>

      <DashboardModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        closeDisabled={saving || uploading}
        maxWidth="5xl"
        title={editing ? "Perbarui draf katalog" : "Buat katalog baru"}
        description="Isi hanya informasi yang aman dilihat masyarakat. Kolom bertanda wajib harus dilengkapi."
        footer={<><SjSecondaryButton disabled={saving || uploading} onClick={() => setFormOpen(false)}>Batal</SjSecondaryButton><SjPrimaryButton loading={saving} disabled={uploading} onClick={() => void save()}>Simpan draf</SjPrimaryButton></>}
      >
        <div className="space-y-5">
          <SetupFormSection
            title="Sumber data"
            description="Tentukan asal informasi katalog. Sumber yang sudah tersimpan tidak dapat diganti."
          >
            {editing ? (
              <div className="md:col-span-2">
                <p className="font-semibold text-slate-950">
                  {editing.source_type === "COLLATERAL"
                    ? "Agunan yang sudah ada di Ruwang"
                    : "Input manual dengan dokumen bukti"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Sumber dikunci setelah katalog dibuat agar riwayat pemeriksaan tetap utuh.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="sj-publication-source-type" className="space-y-2 text-sm font-semibold text-slate-700">
                  Sumber data
                  <SetupSelect
                    id="sj-publication-source-type"
                    value={form.source_type}
                    onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value as SjSourceType }))}
                  >
                    <option value="COLLATERAL">Agunan yang sudah ada di Ruwang</option>
                    <option value="MANUAL">Input manual dengan dokumen bukti</option>
                  </SetupSelect>
                </label>
                {form.source_type === "COLLATERAL" ? (
                  <label htmlFor="sj-publication-source-collateral" className="space-y-2 text-sm font-semibold text-slate-700">
                    Pilih agunan <span className="text-rose-600">*</span>
                    <SetupSelect
                      id="sj-publication-source-collateral"
                      required
                      value={form.source_collateral_id}
                      onChange={(event) => setForm((current) => ({ ...current, source_collateral_id: event.target.value }))}
                    >
                      <option value="">Pilih agunan…</option>
                      {collaterals.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.collateral_number || "Tanpa nomor"} — {item.collateral_type || item.description || "Agunan"}
                        </option>
                      ))}
                    </SetupSelect>
                  </label>
                ) : (
                  <label htmlFor="sj-publication-manual-evidence" className="space-y-2 text-sm font-semibold text-slate-700">
                    Dokumen bukti <span className="text-rose-600">*</span>
                    <SetupSelect
                      id="sj-publication-manual-evidence"
                      required
                      value={form.manual_evidence_document_id}
                      onChange={(event) => setForm((current) => ({ ...current, manual_evidence_document_id: event.target.value }))}
                    >
                      <option value="">Pilih dokumen Ruwang…</option>
                      {documents.map((document) => (
                        <option key={document.id} value={document.id}>{document.kode} — {document.namaDokumen}</option>
                      ))}
                    </SetupSelect>
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
                      onChange={(event) => setForm((current) => ({ ...current, manual_reason: event.target.value }))}
                    />
                  </label>
                ) : null}
              </>
            )}
          </SetupFormSection>

          <SetupFormSection
            title="Informasi publik"
            description="Informasi ini akan dibaca masyarakat pada website Seputar Jaminan."
          >
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
                onChange={(event) => setForm((current) => ({ ...current, taxonomy_item_id: event.target.value }))}
              >
                <option value="">Pilih jenis aset…</option>
                {categoryItems.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </SetupSelect>
            </label>
            <label htmlFor="sj-publication-title" className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              Judul katalog <span className="text-rose-600">*</span>
              <SetupTextInput
                id="sj-publication-title"
                required
                minLength={5}
                maxLength={160}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
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
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
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
                onChange={(event) => setForm((current) => ({ ...current, city_regency: event.target.value }))}
              />
            </label>
            <label htmlFor="sj-publication-province" className="space-y-2 text-sm font-semibold text-slate-700">
              Provinsi <span className="text-rose-600">*</span>
              <SetupTextInput
                id="sj-publication-province"
                required
                value={form.province}
                onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))}
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
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        attributes: { ...current.attributes, [field.key]: event.target.value },
                      }))}
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
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        attributes: { ...current.attributes, [field.key]: event.target.value },
                      }))}
                    />
                  )}
                </label>
              );
            })}
          </SetupFormSection>

          <SetupFormSection
            title="Kontak marketing"
            description="Pilih nomor terverifikasi yang boleh digunakan oleh satu atau beberapa katalog."
          >
            <label htmlFor="sj-publication-whatsapp-contact" className="space-y-2 text-sm font-semibold text-slate-700">
              Kontak WhatsApp <span className="text-rose-600">*</span>
              <SetupSelect
                id="sj-publication-whatsapp-contact"
                required
                value={form.whatsapp_contact_version_id}
                onChange={(event) => setForm((current) => ({ ...current, whatsapp_contact_version_id: event.target.value }))}
              >
                {verifiedContacts.map((contact) => (
                  <option key={contact.id} value={contact.current_version_id ?? ""}>
                    {contact.label} · berakhir {contact.phone_e164.slice(-4)}{contact.is_default ? " · utama" : ""}
                  </option>
                ))}
              </SetupSelect>
            </label>
            <div className="flex items-start gap-3 pt-1 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-900">Profil BPRS terhubung</p>
                <p className="mt-1 leading-6">{profile?.display_name ?? "Profil belum tersedia"}</p>
              </div>
            </div>
          </SetupFormSection>

          <SetupFormSection
            title="Media publik"
            description="Tambahkan 1–10 gambar yang aman dipublikasikan, maksimal 10 MB per gambar. Data lokasi foto otomatis dibersihkan."
            contentClassName="md:grid-cols-1"
          >
            <MultiFileUploadField
              id="sj-publication-add-media"
              accept={SJ_PUBLIC_IMAGE_ACCEPT}
              label="Gambar publik"
              required={false}
              disabled={uploading || form.media.length >= 10}
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
                  aria-label="Kemajuan unggah gambar katalog"
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
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          media: current.media.map((item) => item.id === media.id ? { ...item, alt_text: event.target.value } : item),
                        }))}
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
                          aria-label={`Hapus ${media.fileName} dari katalog`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Hapus dari katalog
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SetupFormSection>
        </div>
      </DashboardModal>

      <DashboardModal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        maxWidth="3xl"
        title={detail?.title ?? "Detail katalog"}
        description={detail ? `${detail.reference_code} · ${CATEGORY_LABEL[detail.asset_category]}` : undefined}
        footer={detail ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            {["DRAFT", "REVISION_REQUIRED"].includes(detail.state) ? (
              <SjSecondaryButton onClick={() => void openEdit(detail)}>
                <Pencil className="size-4" aria-hidden="true" />
                Perbarui draf
              </SjSecondaryButton>
            ) : null}
            {detail.state === "DRAFT" ? (
              <SjPrimaryButton loading={actionLoading} onClick={() => void runCommand(detail, "submit")}>
                <Send className="size-4" aria-hidden="true" />
                Ajukan pemeriksaan
              </SjPrimaryButton>
            ) : null}
            {detail.state === "PUBLISHED" ? (
              <SjSecondaryButton loading={actionLoading} onClick={() => void runCommand(detail, "reconfirm")}>
                {!actionLoading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
                Konfirmasi tersedia
              </SjSecondaryButton>
            ) : null}
            {["UNPUBLISHED", "REVISION_REQUIRED"].includes(detail.state) ? (
              <button
                type="button"
                className="uiverse-modal-button uiverse-modal-button--danger"
                disabled={actionLoading}
                aria-busy={actionLoading || undefined}
                onClick={() => void runCommand(detail, "archive")}
              >
                {actionLoading ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
                Arsipkan katalog
              </button>
            ) : null}
          </div>
        ) : undefined}
      >
        {detail ? (
          <div className="space-y-5">
            <dl
              data-ui="sj-publication-detail-records"
              className="divide-y divide-slate-200 border-y border-slate-200"
            >
              <div className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="flex min-w-0 flex-wrap gap-2">
                  <SjStatusBadge state={detail.state} />
                  <SjStatusBadge state={detail.sync_state} kind="sync" />
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Lokasi publik</dt>
                <dd className="break-words text-sm font-semibold leading-6 text-slate-900">
                  {[detail.city_regency, detail.province].filter(Boolean).join(", ") || "Belum dilengkapi"}
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Sumber</dt>
                <dd className="break-words text-sm font-semibold leading-6 text-slate-900">
                  {detail.source_type === "COLLATERAL" ? "Agunan Ruwang" : "Input manual terverifikasi"}
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Deskripsi publik</dt>
                <dd className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {detail.current_version?.description?.trim() || "Belum ada deskripsi."}
                </dd>
              </div>
            </dl>

            {detail.current_version?.rejection_reason ? (
              <SetupState
                variant="error"
                title="Perlu diperbaiki"
                description={detail.current_version.rejection_reason}
              />
            ) : null}

            {detail.reviews?.length ? (
              <section aria-labelledby="sj-publication-review-history-title">
                <h3 id="sj-publication-review-history-title" className="text-sm font-bold text-slate-900">
                  Riwayat pemeriksaan
                </h3>
                <ol
                  data-ui="sj-publication-review-history"
                  className="mt-3 divide-y divide-slate-200 border-y border-slate-200"
                >
                  {detail.reviews.map((review) => (
                    <li key={review.id} className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] gap-3 py-4">
                      <FileText className="mt-0.5 size-5 text-sky-600" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="text-sm font-bold leading-5 text-slate-900">
                            {REVIEW_ACTION_LABEL[review.action] ?? review.action}
                          </p>
                          <time className="text-xs leading-5 text-slate-500" dateTime={review.created_at}>
                            {REVIEW_DATE_FORMATTER.format(new Date(review.created_at))}
                          </time>
                        </div>
                        {review.reason ? (
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                            {review.reason}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        ) : null}
      </DashboardModal>
    </DashboardPageShell>
  );
}
