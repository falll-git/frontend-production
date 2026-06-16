"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Download,
  Eye,
  FileArchive,
  FileCheck2,
  FolderInput,
  FolderOpen,
  Pencil,
  PieChart,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useAppToast } from "@/components/ui/AppToastProvider";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import FileUploadField from "@/components/ui/FileUploadField";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupAddButton from "@/components/ui/SetupAddButton";
import SetupCollectibilityBadge from "@/components/ui/SetupCollectibilityBadge";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
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
  SetupTableCard,
  SetupTableCode,
  SetupTableMoney,
  SetupTableNumber,
  SetupTablePrimaryText,
  SetupTableSecondaryText,
} from "@/components/ui/SetupDataTable";
import SearchableSelect from "@/components/ui/SearchableSelect";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupTextInput from "@/components/ui/SetupTextInput";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_GROUP_CLASS,
} from "@/components/ui/setupPageStyles";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { validateDomainUploadFile } from "@/lib/utils/file";
import {
  createParameterMasterService,
  type ParameterMasterRecord,
} from "@/services/parameter-master.service";
import { userService } from "@/services/user.service";
import { debiturService } from "@/services/debitur.service";
import type { PaginationMeta } from "@/types/api.types";
import type { UserRecord } from "@/types/auth.types";
import type {
  DebtorCollateral,
  DebtorCollateralReport,
  DebtorCompletenessReport,
  DebtorContract,
  DebtorContractPayload,
  DebtorFacilityReport,
  DebtorImportJob,
  DebtorImportPayload,
  DebtorImportType,
  DebtorIdebPendingUpload,
  DebtorIdebResolvePayload,
  DebtorMarketingActivity,
  DebtorMarketingKind,
  DebtorMarketingPayload,
  DebtorMarketingReport,
  DebtorNpfReport,
  DebtorPayload,
  DebtorPortfolioReport,
  DebtorRecord,
  DebtorReportQuery,
} from "@/types/debitur.types";

type Option = {
  value: string;
  label: string;
};

type DebtorListView = "cif" | "financing" | "collateral";
type DebtorReportKind = "portfolio" | "facilities" | "collaterals" | "completeness";

type DebtorReportDefinition = {
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  ctaLabel: string;
  searchPlaceholder: string;
};

type DebtorReportOverview = {
  portfolio: DebtorPortfolioReport["summary"] | null;
  facilities: DebtorFacilityReport["summary"] | null;
  collaterals: DebtorCollateralReport["summary"] | null;
  completeness: DebtorCompletenessReport["summary"] | null;
};

const SLIK_IMPORT_MAX_FILE_SIZE_MB = 500;
const SLIK_IMPORT_MAX_FILE_SIZE_BYTES = SLIK_IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024;
const DOUBLE_ROW_ACTIVATION_DELAY_MS = 420;
const DOUBLE_ROW_ACTIVATION_SUPPRESS_MS = 250;

type DoubleRowActivationState = {
  key: string;
  clickAt: number;
  activatedAt: number;
};

type DebtorFormState = {
  debtor_number: string;
  identity_number: string;
  name: string;
  address: string;
  phone: string;
  branch_id: string;
  marketing_user_id: string;
  financing_number: string;
  customer_type: string;
  individual_profile: {
    name_as_identity: string;
    full_name: string;
    gender: string;
    birth_place: string;
    birth_date: string;
    tax_number: string;
    mobile_phone: string;
    email: string;
    mother_maiden_name: string;
  };
  legal_entity_profile: {
    business_name: string;
    legal_form_code: string;
    establishment_place: string;
    establishment_deed_number: string;
    establishment_deed_date: string;
    email: string;
    business_field_code: string;
    debtor_group_name: string;
  };
  status: string;
  description: string;
};

type ContractFormState = {
  no_kontrak: string;
  debtor_id: string;
  product_id: string;
  akad_type_id: string;
  branch_id: string;
  marketing_user_id: string;
  tanggal_akad: string;
  tanggal_jatuh_tempo: string;
  plafond: string;
  pokok: string;
  margin: string;
  tenor: string;
  outstanding_pokok: string;
  outstanding_margin: string;
  status: string;
  objek_pembiayaan: string;
  agunan: string;
};

type MarketingFormState = {
  debtor_id: string;
  contract_id: string;
  activity_date: string;
  target_date: string;
  status: string;
  action_plan: string;
  visit_address: string;
  visit_result: string;
  conclusion: string;
  handling_step: string;
  handling_result: string;
  notes: string;
  file: File | null;
};

type ImportFormState = {
  file: File | null;
  files: File[];
  import_segment: "D01" | "D02" | "F01" | "A01";
  debtor_id: string;
  contract_id: string;
  period_month: string;
  raw_reference: string;
  total_rows: string;
};

type IdebResolveFormState = {
  debtor_id: string;
  contract_id: string;
};

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: SETUP_TABLE_PAGE_SIZE,
  lastPage: 1,
};

const debtorStatusOptions: Option[] = [
  { value: "", label: "Semua" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Nonaktif" },
];

const customerTypeFilterOptions: Option[] = [
  { value: "", label: "Semua Status/Jenis Nasabah" },
  { value: "INDIVIDUAL", label: "Perorangan (I)" },
  { value: "LEGAL_ENTITY", label: "Badan Hukum/Yayasan (B)" },
];

const customerTypeFormOptions: Option[] = customerTypeFilterOptions.filter(
  (option) => option.value,
);

const contractStatusOptions: Option[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "CLOSED", label: "Selesai" },
  { value: "INACTIVE", label: "Nonaktif" },
];

const contractStatusFilterOptions: Option[] = [
  { value: "", label: "Semua Status" },
  ...contractStatusOptions,
];

const collectibilityLevelOptions: Option[] = [
  { value: "", label: "Semua KOL" },
  { value: "1", label: "KOL 1 - Lancar" },
  { value: "2", label: "KOL 2 - Dalam Perhatian Khusus" },
  { value: "3", label: "KOL 3 - Kurang Lancar" },
  { value: "4", label: "KOL 4 - Diragukan" },
  { value: "5", label: "KOL 5 - Macet" },
];

const collateralLinkStatusOptions: Option[] = [
  { value: "", label: "Semua Link" },
  { value: "linked", label: "Terhubung" },
  { value: "unlinked", label: "Belum Terhubung" },
];

const completenessIssueOptions: Option[] = [
  { value: "", label: "Semua Isu" },
  { value: "REQUIRED_DOCUMENTS_INCOMPLETE", label: "Dokumen wajib belum lengkap" },
  { value: "DEBTOR_WITHOUT_FACILITY", label: "Debitur tanpa F01" },
  { value: "FACILITY_WITHOUT_COLLATERAL", label: "Fasilitas tanpa A01" },
  { value: "UNLINKED_COLLATERAL", label: "Agunan belum link" },
  { value: "MISSING_SLIK_PERIOD", label: "Tanpa periode SLIK" },
];

const debtorReportOrder: DebtorReportKind[] = [
  "portfolio",
  "facilities",
  "collaterals",
  "completeness",
];

const debtorReportDefinitions: Record<DebtorReportKind, DebtorReportDefinition> = {
  portfolio: {
    title: "Portfolio CIF",
    shortTitle: "Portfolio",
    description: "Daftar CIF gabungan beserta fasilitas, agunan, outstanding, KOL terakhir, dan periode SLIK.",
    icon: Users,
    ctaLabel: "Lihat Portfolio",
    searchPlaceholder: "Cari nama, CIF, identitas, kontrak, cabang, atau PIC...",
  },
  facilities: {
    title: "Fasilitas Pembiayaan",
    shortTitle: "Fasilitas",
    description: "Daftar fasilitas pembiayaan dengan produk, akad, sektor, baki debet, KOL, kondisi, dan jatuh tempo.",
    icon: BriefcaseBusiness,
    ctaLabel: "Lihat Fasilitas",
    searchPlaceholder: "Cari no fasilitas, nama debitur, CIF, atau identitas...",
  },
  collaterals: {
    title: "Agunan",
    shortTitle: "Agunan",
    description: "Daftar agunan terstruktur A01 yang terhubung ke debitur dan fasilitas pembiayaan.",
    icon: FileArchive,
    ctaLabel: "Lihat Agunan",
    searchPlaceholder: "Cari nomor agunan, fasilitas, pemilik, bukti, lokasi, atau debitur...",
  },
  completeness: {
    title: "Kelengkapan SLIK",
    shortTitle: "Kelengkapan",
    description: "Daftar isu relasi D01/D02, F01, dan A01 yang perlu dicek setelah import SLIK.",
    icon: ClipboardList,
    ctaLabel: "Lihat Kelengkapan",
    searchPlaceholder: "Cari nama debitur, CIF, fasilitas, agunan, cabang, atau PIC...",
  },
};

const activityStatusOptions: Option[] = [
  { value: "", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "IN_PROGRESS", label: "Dalam Proses" },
  { value: "DONE", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const branchService = createParameterMasterService("/branches");
const productService = createParameterMasterService("/financing-products");
const contractTypeService = createParameterMasterService("/contract-types");
const collateralTypeService = createParameterMasterService("/collateral-types");

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function downloadBrowserFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function periodLabel(value: string | null | undefined) {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

function normalizeDisplay(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function requiredDocumentsTone(status: string | null | undefined): SetupStatusTone {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "COMPLETE") return "emerald";
  if (normalized === "INCOMPLETE") return "amber";
  return "gray";
}

function requiredDocumentsLabel(item: DebtorRecord) {
  const status = String(item.required_documents_status ?? "").trim().toUpperCase();
  if (status === "COMPLETE") return "Lengkap";
  if (status === "INCOMPLETE") return "Belum Lengkap";
  if (status === "NO_CHECKLIST") return "Tidak Ada Checklist";
  return item.required_documents_display ? "Dokumen Wajib" : "Dokumen";
}

function requiredDocumentsDisplay(item: DebtorRecord) {
  return item.required_documents_display || `${formatNumber(item.documents_count)} dokumen`;
}

function slikCompletenessTone(status: string | null | undefined): SetupStatusTone {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "COMPLETE") return "emerald";
  if (normalized === "NO_F01") return "red";
  if (normalized === "NO_PERIOD" || normalized === "NO_A01") return "amber";
  return "gray";
}

function slikCompletenessLabel(item: DebtorRecord) {
  return item.slik_completeness_label || "-";
}

function triggerDoubleRowActivation(
  stateRef: MutableRefObject<DoubleRowActivationState | null>,
  key: string,
  activate: () => void,
) {
  const now = Date.now();
  const previous = stateRef.current;

  if (
    previous?.key === key &&
    previous.activatedAt > 0 &&
    now - previous.activatedAt < DOUBLE_ROW_ACTIVATION_SUPPRESS_MS
  ) {
    return;
  }

  stateRef.current = { key, clickAt: now, activatedAt: now };
  activate();
}

function handleDoubleRowClick(
  stateRef: MutableRefObject<DoubleRowActivationState | null>,
  key: string,
  activate: () => void,
) {
  const now = Date.now();
  const previous = stateRef.current;

  if (
    previous?.key === key &&
    now - previous.clickAt <= DOUBLE_ROW_ACTIVATION_DELAY_MS
  ) {
    triggerDoubleRowActivation(stateRef, key, activate);
    return;
  }

  stateRef.current = {
    key,
    clickAt: now,
    activatedAt: previous?.activatedAt ?? 0,
  };
}

function comparableDisplay(value: string | number | null | undefined) {
  return normalizeDisplay(value)
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function hasContactValue(value: string | number | null | undefined) {
  const normalized = comparableDisplay(value);
  return normalized !== "" && normalized !== "-" && normalized !== "0";
}

function sameDisplayValue(
  first: string | number | null | undefined,
  second: string | number | null | undefined,
) {
  const normalizedFirst = comparableDisplay(first);
  const normalizedSecond = comparableDisplay(second);
  return (
    normalizedFirst !== "" &&
    normalizedFirst !== "-" &&
    normalizedFirst === normalizedSecond
  );
}

function slikDisplay(
  displayValue: string | number | null | undefined,
  rawValue: string | number | null | undefined,
) {
  return displayValue || normalizeDisplay(rawValue);
}

function getRecordText(record: ParameterMasterRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function toParameterOptions(records: ParameterMasterRecord[]) {
  return records.map<Option>((record) => {
    const code = getRecordText(record, "code", "kode");
    const name = getRecordText(record, "name", "label", "nama") || record.id;
    return {
      value: record.id,
      label: code ? `${code} - ${name}` : name,
    };
  });
}

function toUserOptions(users: UserRecord[]) {
  return users.map<Option>((user) => ({
    value: user.id,
    label: user.division_name ? `${user.name} / ${user.division_name}` : user.name,
  }));
}

function toDebtorOptions(debtors: DebtorRecord[]) {
  return debtors.map<Option>((debtor) => ({
    value: debtor.id,
    label: debtor.debtor_number
      ? `${debtor.debtor_number} - ${debtor.name}`
      : debtor.name,
  }));
}

function toContractOptions(contracts: DebtorContract[]) {
  return contracts.map<Option>((contract) => ({
    value: contract.id,
    label: `${contract.no_kontrak} - ${contract.debtor?.name ?? "Debitur"}`,
  }));
}

function toParameterCodeOptions(records: ParameterMasterRecord[], emptyLabel: string) {
  return [
    { value: "", label: emptyLabel },
    ...records.map<Option>((record) => {
      const code = getRecordText(record, "code", "kode");
      const name = getRecordText(record, "name", "label", "nama") || code || record.id;
      return {
        value: code || name,
        label: code ? `${code} - ${name}` : name,
      };
    }),
  ];
}

function parameterLabelMap(records: ParameterMasterRecord[]) {
  const entries: Array<[string, string]> = [];

  for (const record of records) {
    const code = getRecordText(record, "code", "kode");
    const name = getRecordText(record, "name", "label", "nama");
    const label = code && name ? `${code} - ${name}` : name || code;
    if (!label) continue;
    if (code) entries.push([code.toUpperCase(), label]);
    if (name) entries.push([name.toUpperCase(), label]);
  }

  return new Map(entries);
}

async function loadDebtorSearchOptions(query: string) {
  const result = await debiturService.getDebtorsPage({
    page: 1,
    limit: 20,
    search: query,
    status: "ACTIVE",
    sort_by: "name",
    sort_order: "asc",
  });

  return toDebtorOptions(result.items);
}

async function loadContractSearchOptions(query: string, debtorId?: string) {
  const result = await debiturService.getContractsPage({
    page: 1,
    limit: 20,
    search: query,
    debtor_id: debtorId || undefined,
    status: "ACTIVE",
    sort_by: "no_kontrak",
    sort_order: "asc",
  });

  return toContractOptions(result.items);
}

function statusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (["ACTIVE", "AKTIF", "BERJALAN"].includes(normalized)) return "Aktif";
  if (["INACTIVE", "NONAKTIF"].includes(normalized)) return "Nonaktif";
  if (["CLOSED", "LUNAS", "SELESAI", "DONE"].includes(normalized)) return "Selesai";
  if (["PENDING", "MENUNGGU"].includes(normalized)) return "Menunggu";
  if (["IN_PROGRESS", "PROGRESS", "DALAM_PROSES"].includes(normalized)) {
    return "Dalam Proses";
  }
  if (["CANCELLED", "BATAL"].includes(normalized)) return "Dibatalkan";
  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function collectibilityLabel(
  collectibility: DebtorContract["latest_collectibility"] | null | undefined,
) {
  if (!collectibility) return "-";
  const level = Number(collectibility.level ?? collectibility.code);
  const rawName = String(collectibility.name ?? "").trim();
  const normalizedName = rawName
    .replace(/^kol\s*\d+\s*[-/]?\s*/i, "")
    .trim();
  const name =
    normalizedName ||
    (level === 1
      ? "Lancar"
      : level === 2
        ? "Dalam Perhatian Khusus"
        : level === 3
          ? "Kurang Lancar"
          : level === 4
            ? "Diragukan"
            : level === 5
              ? "Macet"
              : rawName);

  if (Number.isFinite(level)) return `KOL ${level} - ${name || "-"}`;
  return name || rawName || "-";
}

function activityKindLabel(kind: string) {
  const normalized = kind.trim().toUpperCase();
  if (normalized === "ACTION_PLAN") return "Action Plan";
  if (normalized === "VISIT_RESULT") return "Hasil Kunjungan";
  if (normalized === "HANDLING_STEP") return "Langkah Penanganan";
  return statusLabel(kind);
}

function customerTypeLabel(
  customerType: string | null | undefined,
  fallback?: string | null,
  statusCode?: string | null,
) {
  const normalized = String(customerType ?? "").trim().toUpperCase();
  const normalizedStatus = String(statusCode ?? "").trim().toUpperCase();
  const code =
    normalizedStatus === "I" || normalizedStatus === "B"
      ? normalizedStatus
      : normalized === "INDIVIDUAL" || normalized === "I"
        ? "I"
        : normalized === "LEGAL_ENTITY" || normalized === "B"
          ? "B"
          : null;

  if (fallback) {
    return code && !fallback.includes(`(${code})`)
      ? `${fallback} (${code})`
      : fallback;
  }
  if (normalized === "INDIVIDUAL" || normalized === "I") return "Perorangan (I)";
  if (normalized === "LEGAL_ENTITY" || normalized === "B") {
    return "Badan Hukum/Yayasan (B)";
  }
  return "-";
}

function marketingMainText(item: DebtorMarketingActivity) {
  return (
    item.action_plan ??
    item.visit_result ??
    item.handling_step ??
    item.notes ??
    "-"
  );
}

function emptyIndividualProfileForm(): DebtorFormState["individual_profile"] {
  return {
    name_as_identity: "",
    full_name: "",
    gender: "",
    birth_place: "",
    birth_date: "",
    tax_number: "",
    mobile_phone: "",
    email: "",
    mother_maiden_name: "",
  };
}

function emptyLegalEntityProfileForm(): DebtorFormState["legal_entity_profile"] {
  return {
    business_name: "",
    legal_form_code: "",
    establishment_place: "",
    establishment_deed_number: "",
    establishment_deed_date: "",
    email: "",
    business_field_code: "",
    debtor_group_name: "",
  };
}

function emptyDebtorForm(): DebtorFormState {
  return {
    debtor_number: "",
    identity_number: "",
    name: "",
    address: "",
    phone: "",
    branch_id: "",
    marketing_user_id: "",
    financing_number: "",
    customer_type: "",
    individual_profile: emptyIndividualProfileForm(),
    legal_entity_profile: emptyLegalEntityProfileForm(),
    status: "ACTIVE",
    description: "",
  };
}

function debtorToForm(debtor: DebtorRecord): DebtorFormState {
  const individualProfile = debtor.individual_profile;
  const legalEntityProfile = debtor.legal_entity_profile;

  return {
    debtor_number: debtor.debtor_number ?? "",
    identity_number: debtor.identity_number ?? "",
    name: debtor.name,
    address: debtor.address ?? "",
    phone: debtor.phone ?? "",
    branch_id: debtor.branch_id ?? "",
    marketing_user_id: debtor.marketing_user_id ?? "",
    financing_number: debtor.financing_number ?? "",
    customer_type: debtor.customer_type ?? "",
    individual_profile: {
      name_as_identity: individualProfile?.name_as_identity ?? "",
      full_name: individualProfile?.full_name ?? "",
      gender: individualProfile?.gender ?? "",
      birth_place: individualProfile?.birth_place ?? "",
      birth_date: individualProfile?.birth_date?.slice(0, 10) ?? "",
      tax_number: individualProfile?.tax_number ?? "",
      mobile_phone: individualProfile?.mobile_phone ?? "",
      email: individualProfile?.email ?? "",
      mother_maiden_name: individualProfile?.mother_maiden_name ?? "",
    },
    legal_entity_profile: {
      business_name: legalEntityProfile?.business_name ?? "",
      legal_form_code: legalEntityProfile?.legal_form_code ?? "",
      establishment_place: legalEntityProfile?.establishment_place ?? "",
      establishment_deed_number: legalEntityProfile?.establishment_deed_number ?? "",
      establishment_deed_date:
        legalEntityProfile?.establishment_deed_date?.slice(0, 10) ?? "",
      email: legalEntityProfile?.email ?? "",
      business_field_code: legalEntityProfile?.business_field_code ?? "",
      debtor_group_name: legalEntityProfile?.debtor_group_name ?? "",
    },
    status: debtor.status || "ACTIVE",
    description: debtor.description ?? "",
  };
}

function buildDebtorPayload(form: DebtorFormState): DebtorPayload {
  const customerType = form.customer_type || null;

  return {
    debtor_number: form.debtor_number || null,
    identity_number: form.identity_number || null,
    name: form.name,
    address: form.address || null,
    phone: form.phone || null,
    branch_id: form.branch_id || null,
    marketing_user_id: form.marketing_user_id || null,
    financing_number: form.financing_number || null,
    customer_type: customerType,
    individual_profile:
      customerType === "INDIVIDUAL"
        ? {
            name_as_identity: form.individual_profile.name_as_identity || null,
            full_name: form.individual_profile.full_name || null,
            gender: form.individual_profile.gender || null,
            birth_place: form.individual_profile.birth_place || null,
            birth_date: form.individual_profile.birth_date || null,
            tax_number: form.individual_profile.tax_number || null,
            mobile_phone: form.individual_profile.mobile_phone || null,
            email: form.individual_profile.email || null,
            mother_maiden_name:
              form.individual_profile.mother_maiden_name || null,
          }
        : null,
    legal_entity_profile:
      customerType === "LEGAL_ENTITY"
        ? {
            business_name: form.legal_entity_profile.business_name || null,
            legal_form_code: form.legal_entity_profile.legal_form_code || null,
            establishment_place:
              form.legal_entity_profile.establishment_place || null,
            establishment_deed_number:
              form.legal_entity_profile.establishment_deed_number || null,
            establishment_deed_date:
              form.legal_entity_profile.establishment_deed_date || null,
            email: form.legal_entity_profile.email || null,
            business_field_code:
              form.legal_entity_profile.business_field_code || null,
            debtor_group_name:
              form.legal_entity_profile.debtor_group_name || null,
          }
        : null,
    status: form.status || "ACTIVE",
    description: form.description || null,
  };
}

function emptyContractForm(debtorId = ""): ContractFormState {
  return {
    no_kontrak: "",
    debtor_id: debtorId,
    product_id: "",
    akad_type_id: "",
    branch_id: "",
    marketing_user_id: "",
    tanggal_akad: "",
    tanggal_jatuh_tempo: "",
    plafond: "0",
    pokok: "0",
    margin: "0",
    tenor: "",
    outstanding_pokok: "0",
    outstanding_margin: "0",
    status: "ACTIVE",
    objek_pembiayaan: "",
    agunan: "",
  };
}

function contractToForm(contract: DebtorContract): ContractFormState {
  return {
    no_kontrak: contract.no_kontrak,
    debtor_id: contract.debtor_id,
    product_id: contract.product_id ?? "",
    akad_type_id: contract.akad_type_id ?? "",
    branch_id: contract.branch_id ?? "",
    marketing_user_id: contract.marketing_user_id ?? "",
    tanggal_akad: contract.tanggal_akad?.slice(0, 10) ?? "",
    tanggal_jatuh_tempo: contract.tanggal_jatuh_tempo?.slice(0, 10) ?? "",
    plafond: String(contract.plafond ?? 0),
    pokok: String(contract.pokok ?? 0),
    margin: String(contract.margin ?? 0),
    tenor: String(contract.tenor ?? ""),
    outstanding_pokok: String(contract.outstanding_pokok ?? 0),
    outstanding_margin: String(contract.outstanding_margin ?? 0),
    status: contract.status || "ACTIVE",
    objek_pembiayaan: contract.objek_pembiayaan ?? "",
    agunan: contract.agunan ?? "",
  };
}

function toNumberInput(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildContractPayload(form: ContractFormState): DebtorContractPayload {
  return {
    no_kontrak: form.no_kontrak,
    debtor_id: form.debtor_id,
    product_id: form.product_id,
    akad_type_id: form.akad_type_id,
    branch_id: form.branch_id || null,
    marketing_user_id: form.marketing_user_id || null,
    tanggal_akad: form.tanggal_akad,
    tanggal_jatuh_tempo: form.tanggal_jatuh_tempo || null,
    plafond: toNumberInput(form.plafond),
    pokok: toNumberInput(form.pokok),
    margin: toNumberInput(form.margin),
    tenor: toNumberInput(form.tenor),
    outstanding_pokok: toNumberInput(form.outstanding_pokok),
    outstanding_margin: toNumberInput(form.outstanding_margin),
    status: form.status || "ACTIVE",
    objek_pembiayaan: form.objek_pembiayaan || null,
    agunan: form.agunan || null,
  };
}

function emptyMarketingForm(): MarketingFormState {
  return {
    debtor_id: "",
    contract_id: "",
    activity_date: "",
    target_date: "",
    status: "PENDING",
    action_plan: "",
    visit_address: "",
    visit_result: "",
    conclusion: "",
    handling_step: "",
    handling_result: "",
    notes: "",
    file: null,
  };
}

function marketingToForm(item: DebtorMarketingActivity): MarketingFormState {
  return {
    debtor_id: item.debtor_id,
    contract_id: item.contract_id ?? "",
    activity_date: item.activity_date?.slice(0, 10) ?? "",
    target_date: item.target_date?.slice(0, 10) ?? "",
    status: item.status || "PENDING",
    action_plan: item.action_plan ?? "",
    visit_address: item.visit_address ?? "",
    visit_result: item.visit_result ?? "",
    conclusion: item.conclusion ?? "",
    handling_step: item.handling_step ?? "",
    handling_result: item.handling_result ?? "",
    notes: item.notes ?? "",
    file: null,
  };
}

function buildMarketingPayload(form: MarketingFormState): DebtorMarketingPayload {
  return {
    debtor_id: form.debtor_id,
    contract_id: form.contract_id || null,
    activity_date: form.activity_date || null,
    target_date: form.target_date || null,
    status: form.status || "PENDING",
    action_plan: form.action_plan || null,
    visit_address: form.visit_address || null,
    visit_result: form.visit_result || null,
    conclusion: form.conclusion || null,
    handling_step: form.handling_step || null,
    handling_result: form.handling_result || null,
    notes: form.notes || null,
    file: form.file,
  };
}

function emptyImportForm(): ImportFormState {
  return {
    file: null,
    files: [],
    import_segment: "D01",
    debtor_id: "",
    contract_id: "",
    period_month: "",
    raw_reference: "",
    total_rows: "",
  };
}

function emptyIdebResolveForm(): IdebResolveFormState {
  return {
    debtor_id: "",
    contract_id: "",
  };
}

function buildIdebResolvePayload(form: IdebResolveFormState): DebtorIdebResolvePayload {
  return {
    debtor_id: form.debtor_id,
    contract_id: form.contract_id || null,
  };
}

function idebExternalStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "MATCHED") return "Terhubung";
  if (normalized === "MATCH_PENDING") return "Belum Terhubung";
  return statusLabel(normalized || status);
}

function getFileExtension(fileName: string) {
  return fileName.trim().toLowerCase().split(".").pop() ?? "";
}

function validateDebtorImportFile(type: DebtorImportType, file: File) {
  const extension = getFileExtension(file.name);
  if (type === "IDEB" && !["json", "txt"].includes(extension)) {
    return "Import IDEB hanya menerima file TXT atau JSON.";
  }
  return validateDomainUploadFile(file);
}

function buildImportPayload(form: ImportFormState): DebtorImportPayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  if (files.length === 0) throw new Error("File import wajib dipilih");
  return {
    file: files[0] ?? null,
    files,
    import_segment: form.import_segment,
    debtor_id: form.debtor_id || null,
    contract_id: form.contract_id || null,
    period_month: form.period_month || null,
    raw_reference: form.raw_reference || null,
    total_rows: form.total_rows ? toNumberInput(form.total_rows) : undefined,
  };
}

function validateDebtorForm(form: DebtorFormState) {
  if (!form.name.trim()) return "Nama debitur wajib diisi";
  return null;
}

function validateContractForm(form: ContractFormState) {
  if (!form.no_kontrak.trim()) return "Nomor kontrak wajib diisi";
  if (!form.debtor_id) return "Debitur wajib dipilih";
  if (!form.product_id) return "Produk pembiayaan wajib dipilih";
  if (!form.akad_type_id) return "Jenis akad wajib dipilih";
  if (!form.tanggal_akad) return "Tanggal akad wajib diisi";
  if (!Number.isFinite(Number(form.tenor)) || Number(form.tenor) < 1) {
    return "Tenor wajib diisi minimal 1";
  }
  return null;
}

function getMarketingRequiredField(kind: DebtorMarketingKind) {
  if (kind === "visit-results") return "visit_result";
  if (kind === "handling-steps") return "handling_step";
  return "action_plan";
}

function validateMarketingForm(kind: DebtorMarketingKind, form: MarketingFormState) {
  if (!form.debtor_id) return "Debitur wajib dipilih";
  const requiredField = getMarketingRequiredField(kind);
  if (!String(form[requiredField]).trim()) return "Keterangan utama wajib diisi";
  return null;
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-2 block text-sm font-medium text-gray-700">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  includeEmpty = true,
  emptyLabel,
  searchable = false,
  loadOptions,
  searchPlaceholder,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  includeEmpty?: boolean;
  emptyLabel?: string;
  searchable?: boolean;
  loadOptions?: (query: string) => Promise<Option[]>;
  searchPlaceholder?: string;
}) {
  const placeholder = emptyLabel ?? `Pilih ${label.toLowerCase()}`;

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      {searchable ? (
        <SearchableSelect
          value={value}
          options={options}
          loadOptions={loadOptions}
          onChange={(nextValue) => onChange(nextValue)}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder ?? `Cari ${label.toLowerCase()}...`}
          emptyLabel={`${label} tidak ditemukan`}
          loadingLabel={`Memuat ${label.toLowerCase()}...`}
          required={required}
          clearable={includeEmpty}
        />
      ) : (
      <SetupSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {includeEmpty ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SetupSelect>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <SetupTextInput
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="md:col-span-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <SetupTextarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <BasicDateInput value={value} onChange={onChange} />
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
          {label}
        </p>
        <p className="mt-2 break-words text-2xl font-semibold leading-tight text-gray-900">
          {value}
        </p>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
      {Icon ? (
        <Icon className="h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
      ) : null}
    </div>
  );
}

function DetailItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900">
        {normalizeDisplay(value)}
      </p>
    </div>
  );
}

function ModalFooter({
  onClose,
  onSave,
  isSaving,
  saveLabel = "Simpan",
}: {
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveLabel?: string;
}) {
  return (
    <>
      <button
        type="button"
        className="uiverse-modal-button uiverse-modal-button--neutral"
        onClick={onClose}
        disabled={isSaving}
      >
        Batal
      </button>
      <button
        type="button"
        className="uiverse-modal-button uiverse-modal-button--primary"
        onClick={onSave}
        disabled={isSaving}
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        <span>{isSaving ? "Menyimpan..." : saveLabel}</span>
      </button>
    </>
  );
}

function useMasterOptions() {
  const { showToast } = useAppToast();
  const [branches, setBranches] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [contractTypes, setContractTypes] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        setIsLoading(true);
        const [
          branchRows,
          productRows,
          contractTypeRows,
          userRows,
        ] = await Promise.all([
          branchService.getAll({ is_active: true }),
          productService.getAll({ is_active: true }),
          contractTypeService.getAll({ is_active: true }),
          userService.getAll(),
        ]);

        if (ignore) return;
        setBranches(toParameterOptions(branchRows));
        setProducts(toParameterOptions(productRows));
        setContractTypes(toParameterOptions(contractTypeRows));
        setUsers(toUserOptions(userRows.filter((user) => user.is_active)));
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat master data Informasi Debitur",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadOptions();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  return {
    branches,
    products,
    contractTypes,
    users,
    isLoading,
  };
}

function useDebtorContractOptions() {
  const { showToast } = useAppToast();
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [contracts, setContracts] = useState<DebtorContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [debtorResult, contractResult] = await Promise.all([
        debiturService.getDebtorsPage({
          page: 1,
          limit: 20,
          status: "ACTIVE",
          sort_by: "name",
          sort_order: "asc",
        }),
        debiturService.getContractsPage({
          page: 1,
          limit: 20,
          status: "ACTIVE",
          sort_by: "no_kontrak",
          sort_order: "asc",
        }),
      ]);
      setDebtors(debtorResult.items);
      setContracts(contractResult.items);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat opsi debitur dan kontrak",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    debtors,
    debtorOptions: toDebtorOptions(debtors),
    contracts,
    contractOptions: toContractOptions(contracts),
    isLoading,
    reload: load,
  };
}

function DebtorDetailModal({
  debtor,
  isOpen,
  onClose,
}: {
  debtor: DebtorRecord | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const individualProfile =
    debtor?.customer_type === "INDIVIDUAL" ? debtor.individual_profile : null;
  const legalEntityProfile =
    debtor?.customer_type === "LEGAL_ENTITY" ? debtor.legal_entity_profile : null;
  const cifType = debtor
    ? customerTypeLabel(debtor.customer_type, debtor.customer_type_label, debtor.slik_status_code)
    : "-";
  const segmentSummary = debtor
    ? [
        debtor.slik_segment,
        debtor.slik_status_code ? `Status CIF ${debtor.slik_status_code}` : null,
      ]
        .filter(Boolean)
        .join(" / ")
    : "-";
  const showIndividualIdentityName =
    debtor &&
    individualProfile &&
    !sameDisplayValue(individualProfile.name_as_identity, debtor.name);
  const showIndividualFullName =
    debtor &&
    individualProfile &&
    !sameDisplayValue(individualProfile.full_name, debtor.name) &&
    !sameDisplayValue(individualProfile.full_name, individualProfile.name_as_identity);
  const individualContactItems = [
    hasContactValue(individualProfile?.mobile_phone) &&
    !sameDisplayValue(individualProfile?.mobile_phone, debtor?.phone)
      ? `Seluler: ${individualProfile?.mobile_phone}`
      : null,
    hasContactValue(individualProfile?.phone) &&
    !sameDisplayValue(individualProfile?.phone, debtor?.phone)
      ? `Telepon: ${individualProfile?.phone}`
      : null,
  ].filter(Boolean);
  const showIndividualContact = individualContactItems.length > 0;
  const individualContact = individualContactItems.join(" / ");
  const showIndividualAddress =
    debtor &&
    individualProfile &&
    !sameDisplayValue(individualProfile.address_detail, debtor.address);
  const showLegalBusinessName =
    debtor &&
    legalEntityProfile &&
    !sameDisplayValue(legalEntityProfile.business_name, debtor.name);
  const showLegalAddress =
    debtor &&
    legalEntityProfile &&
    !sameDisplayValue(legalEntityProfile.address_detail, debtor.address);

  return (
    <DashboardModal
      isOpen={isOpen && debtor !== null}
      title="Detail Debitur"
      description={debtor?.debtor_number ?? debtor?.identity_number ?? undefined}
      onClose={onClose}
      maxWidth="5xl"
      bodyClassName="max-h-[70vh] overflow-y-auto p-6"
      footer={
        <button
          type="button"
          className="uiverse-modal-button uiverse-modal-button--neutral"
          onClick={onClose}
        >
          Tutup
        </button>
      }
    >
      {debtor ? (
        <div className="space-y-6">
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Informasi Debitur
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DetailItem label="Nama Debitur" value={debtor.name} />
              <DetailItem label="Nomor Debitur" value={debtor.debtor_number} />
              <DetailItem label="Nomor Identitas" value={debtor.identity_number} />
              <DetailItem
                label="Jenis CIF"
                value={cifType}
              />
              <DetailItem label="Segmen SLIK" value={segmentSummary} />
              <DetailItem
                label="Operasi CIF"
                value={slikDisplay(debtor.slik_operation_display, debtor.slik_operation_code)}
              />
              <DetailItem label="Cabang" value={debtor.branch?.name} />
              <DetailItem
                label="PIC / Marketing"
                value={
                  debtor.marketing_user?.division_name
                    ? `${debtor.marketing_user.name} / ${debtor.marketing_user.division_name}`
                    : debtor.marketing_user?.name
                }
              />
              <DetailItem label="Status" value={statusLabel(debtor.status)} />
              <DetailItem label="Telepon" value={debtor.phone} />
              <DetailItem label="Nomor Pembiayaan" value={debtor.financing_number} />
              <DetailItem label="Jumlah Dokumen" value={debtor.documents_count} />
              <DetailItem label="Alamat" value={debtor.address} wide />
              <DetailItem label="Keterangan" value={debtor.description} wide />
            </div>
          </section>

          {individualProfile ? (
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
                CIF Perorangan
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {showIndividualIdentityName ? (
                  <DetailItem
                    label="Nama Sesuai Identitas SLIK"
                    value={individualProfile.name_as_identity}
                  />
                ) : null}
                {showIndividualFullName ? (
                  <DetailItem label="Nama Lengkap SLIK" value={individualProfile.full_name} />
                ) : null}
                <DetailItem
                  label="Jenis Identitas"
                  value={slikDisplay(
                    individualProfile.identity_type_display,
                    individualProfile.identity_type_code,
                  )}
                />
                <DetailItem
                  label="Jenis Kelamin"
                  value={slikDisplay(individualProfile.gender_display, individualProfile.gender)}
                />
                <DetailItem
                  label="Pendidikan/Gelar"
                  value={slikDisplay(
                    individualProfile.education_degree_display,
                    individualProfile.education_degree_code,
                  )}
                />
                <DetailItem
                  label="Pekerjaan"
                  value={slikDisplay(
                    individualProfile.occupation_display,
                    individualProfile.occupation_code,
                  )}
                />
                <DetailItem label="Tempat Lahir" value={individualProfile.birth_place} />
                <DetailItem
                  label="Tanggal Lahir"
                  value={formatDateOnly(individualProfile.birth_date)}
                />
                <DetailItem label="NPWP" value={individualProfile.tax_number} />
                {showIndividualContact ? (
                  <DetailItem label="Kontak SLIK" value={individualContact} />
                ) : null}
                <DetailItem label="Email" value={individualProfile.email} />
                <DetailItem
                  label="DATI II/Kota"
                  value={slikDisplay(individualProfile.city_display, individualProfile.city_code)}
                />
                <DetailItem
                  label="Bidang Usaha Tempat Kerja"
                  value={slikDisplay(
                    individualProfile.workplace_business_field_display,
                    individualProfile.workplace_business_field_code,
                  )}
                />
                <DetailItem
                  label="Golongan Debitur"
                  value={slikDisplay(
                    individualProfile.debtor_group_display,
                    individualProfile.debtor_group_code,
                  )}
                />
                <DetailItem
                  label="Nama Ibu Kandung"
                  value={individualProfile.mother_maiden_name}
                />
                {showIndividualAddress ? (
                  <DetailItem
                    label="Alamat Sesuai SLIK"
                    value={individualProfile.address_detail}
                    wide
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {legalEntityProfile ? (
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
                CIF Badan Hukum/Yayasan
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {showLegalBusinessName ? (
                  <DetailItem
                    label="Nama Badan Usaha SLIK"
                    value={legalEntityProfile.business_name}
                  />
                ) : null}
                <DetailItem
                  label="Bentuk Badan Usaha"
                  value={slikDisplay(
                    legalEntityProfile.legal_form_display,
                    legalEntityProfile.legal_form_code,
                  )}
                />
                <DetailItem
                  label="Tempat Pendirian"
                  value={legalEntityProfile.establishment_place}
                />
                <DetailItem
                  label="No Akta Pendirian"
                  value={legalEntityProfile.establishment_deed_number}
                />
                <DetailItem
                  label="Tanggal Akta Pendirian"
                  value={formatDateOnly(legalEntityProfile.establishment_deed_date)}
                />
                <DetailItem label="Email" value={legalEntityProfile.email} />
                <DetailItem
                  label="Bidang Usaha"
                  value={slikDisplay(
                    legalEntityProfile.business_field_display,
                    legalEntityProfile.business_field_code,
                  )}
                />
                <DetailItem
                  label="DATI II/Kota"
                  value={slikDisplay(legalEntityProfile.city_display, legalEntityProfile.city_code)}
                />
                <DetailItem
                  label="Golongan Debitur"
                  value={slikDisplay(
                    legalEntityProfile.debtor_group_display,
                    legalEntityProfile.debtor_group_code,
                  )}
                />
                <DetailItem
                  label="Nama Grup Debitur"
                  value={legalEntityProfile.debtor_group_name}
                />
                {showLegalAddress ? (
                  <DetailItem
                    label="Alamat Badan Usaha SLIK"
                    value={legalEntityProfile.address_detail}
                    wide
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Kontrak Terkait
            </h3>
            <SetupTableCard variant="nested">
              <SetupDataTable variant="nested" density="compact" className="min-w-[840px]">
                <SetupDataTableColGroup>
                  <SetupDataTableCol className="w-[56px]" />
                  <SetupDataTableCol className="w-[170px]" />
                  <SetupDataTableCol className="w-[150px]" />
                  <SetupDataTableCol className="w-[150px]" />
                  <SetupDataTableCol className="w-[150px]" />
                  <SetupDataTableCol className="w-[120px]" />
                </SetupDataTableColGroup>
                <SetupDataTableHead>
                  <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                    <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                      No
                    </SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Nomor Kontrak</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Produk</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Outstanding</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Kolektibilitas</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                      Status
                    </SetupDataTableHeaderCell>
                  </SetupDataTableRow>
                </SetupDataTableHead>
                <SetupDataTableBody>
                  {debtor.contracts.map((contract, index) => (
                    <SetupDataTableRow
                      key={contract.id}
                      className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                    >
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                        {index + 1}
                      </SetupDataTableCell>
                      <SetupDataTableCell>{contract.no_kontrak}</SetupDataTableCell>
                      <SetupDataTableCell>
                        {contract.product?.name ?? "-"}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {formatCurrency(contract.total_outstanding)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupCollectibilityBadge
                          value={collectibilityLabel(contract.latest_collectibility)}
                        />
                      </SetupDataTableCell>
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                        <SetupStatusBadge status={statusLabel(contract.status)} />
                      </SetupDataTableCell>
                    </SetupDataTableRow>
                  ))}
                  {debtor.contracts.length === 0 ? (
                    <SetupDataTableEmptyRow colSpan={6}>
                      Belum ada kontrak untuk debitur ini.
                    </SetupDataTableEmptyRow>
                  ) : null}
                </SetupDataTableBody>
              </SetupDataTable>
            </SetupTableCard>
          </section>
        </div>
      ) : null}
    </DashboardModal>
  );
}

function DebtorFormModal({
  isOpen,
  title,
  form,
  branches,
  users,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  title: string;
  form: DebtorFormState;
  branches: Option[];
  users: Option[];
  isSaving: boolean;
  onChange: (patch: Partial<DebtorFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DashboardModal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="4xl"
      bodyClassName="space-y-4 p-6"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      }
    >
      <SetupFormSection title="Identitas Debitur">
        <TextField label="Nomor Debitur" value={form.debtor_number} onChange={(value) => onChange({ debtor_number: value })} />
        <TextField label="Nomor Identitas" value={form.identity_number} onChange={(value) => onChange({ identity_number: value })} />
        <TextField label="Nama Debitur" value={form.name} onChange={(value) => onChange({ name: value })} required />
        <SelectField
          label="Jenis CIF"
          value={form.customer_type}
          options={customerTypeFormOptions}
          emptyLabel="Pilih jenis CIF"
          onChange={(value) =>
            onChange({
              customer_type: value,
              individual_profile:
                value === "INDIVIDUAL"
                  ? form.individual_profile
                  : emptyIndividualProfileForm(),
              legal_entity_profile:
                value === "LEGAL_ENTITY"
                  ? form.legal_entity_profile
                  : emptyLegalEntityProfileForm(),
            })
          }
        />
        <TextField label="Telepon" value={form.phone} onChange={(value) => onChange({ phone: value })} />
      </SetupFormSection>
      <SetupFormSection title="Relasi Internal">
        <SelectField label="Cabang" value={form.branch_id} options={branches} onChange={(value) => onChange({ branch_id: value })} />
        <SelectField label="PIC / Marketing" value={form.marketing_user_id} options={users} onChange={(value) => onChange({ marketing_user_id: value })} searchable searchPlaceholder="Cari nama PIC atau divisi..." />
        <TextField label="Nomor Pembiayaan" value={form.financing_number} onChange={(value) => onChange({ financing_number: value })} />
        <SelectField label="Status" value={form.status} options={debtorStatusOptions.filter((option) => option.value)} includeEmpty={false} onChange={(value) => onChange({ status: value })} />
      </SetupFormSection>
      {form.customer_type === "INDIVIDUAL" ? (
        <SetupFormSection title="CIF Perorangan">
          <TextField
            label="Nama Sesuai Identitas"
            value={form.individual_profile.name_as_identity}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  name_as_identity: value,
                },
              })
            }
          />
          <TextField
            label="Nama Lengkap"
            value={form.individual_profile.full_name}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  full_name: value,
                },
              })
            }
          />
          <TextField
            label="Jenis Kelamin"
            value={form.individual_profile.gender}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  gender: value,
                },
              })
            }
          />
          <TextField
            label="Tempat Lahir"
            value={form.individual_profile.birth_place}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  birth_place: value,
                },
              })
            }
          />
          <DateField
            label="Tanggal Lahir"
            value={form.individual_profile.birth_date}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  birth_date: value,
                },
              })
            }
          />
          <TextField
            label="NPWP"
            value={form.individual_profile.tax_number}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  tax_number: value,
                },
              })
            }
          />
          <TextField
            label="Seluler"
            value={form.individual_profile.mobile_phone}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  mobile_phone: value,
                },
              })
            }
          />
          <TextField
            label="Email"
            value={form.individual_profile.email}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  email: value,
                },
              })
            }
          />
          <TextField
            label="Nama Ibu Kandung"
            value={form.individual_profile.mother_maiden_name}
            onChange={(value) =>
              onChange({
                individual_profile: {
                  ...form.individual_profile,
                  mother_maiden_name: value,
                },
              })
            }
          />
        </SetupFormSection>
      ) : null}
      {form.customer_type === "LEGAL_ENTITY" ? (
        <SetupFormSection title="CIF Badan Hukum/Yayasan">
          <TextField
            label="Nama Badan Usaha"
            value={form.legal_entity_profile.business_name}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  business_name: value,
                },
              })
            }
          />
          <TextField
            label="Bentuk Badan Usaha"
            value={form.legal_entity_profile.legal_form_code}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  legal_form_code: value,
                },
              })
            }
          />
          <TextField
            label="Tempat Pendirian"
            value={form.legal_entity_profile.establishment_place}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  establishment_place: value,
                },
              })
            }
          />
          <TextField
            label="No Akta Pendirian"
            value={form.legal_entity_profile.establishment_deed_number}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  establishment_deed_number: value,
                },
              })
            }
          />
          <DateField
            label="Tanggal Akta Pendirian"
            value={form.legal_entity_profile.establishment_deed_date}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  establishment_deed_date: value,
                },
              })
            }
          />
          <TextField
            label="Email"
            value={form.legal_entity_profile.email}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  email: value,
                },
              })
            }
          />
          <TextField
            label="Bidang Usaha"
            value={form.legal_entity_profile.business_field_code}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  business_field_code: value,
                },
              })
            }
          />
          <TextField
            label="Nama Grup Debitur"
            value={form.legal_entity_profile.debtor_group_name}
            onChange={(value) =>
              onChange({
                legal_entity_profile: {
                  ...form.legal_entity_profile,
                  debtor_group_name: value,
                },
              })
            }
          />
        </SetupFormSection>
      ) : null}
      <SetupFormSection title="Alamat dan Catatan" contentClassName="md:grid-cols-1">
        <TextareaField label="Alamat" value={form.address} onChange={(value) => onChange({ address: value })} />
        <TextareaField label="Keterangan" value={form.description} onChange={(value) => onChange({ description: value })} />
      </SetupFormSection>
    </DashboardModal>
  );
}

function ContractFormModal({
  isOpen,
  title,
  form,
  debtors,
  branches,
  products,
  contractTypes,
  users,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  title: string;
  form: ContractFormState;
  debtors: Option[];
  branches: Option[];
  products: Option[];
  contractTypes: Option[];
  users: Option[];
  isSaving: boolean;
  onChange: (patch: Partial<ContractFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DashboardModal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="5xl"
      bodyClassName="max-h-[70vh] space-y-4 overflow-y-auto p-6"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      }
    >
      <SetupFormSection title="Identitas Kontrak" contentClassName="md:grid-cols-3">
        <SelectField label="Debitur" value={form.debtor_id} options={debtors} onChange={(value) => onChange({ debtor_id: value })} required searchable loadOptions={loadDebtorSearchOptions} searchPlaceholder="Cari nama atau nomor debitur..." />
        <TextField label="Nomor Kontrak" value={form.no_kontrak} onChange={(value) => onChange({ no_kontrak: value })} required />
        <SelectField label="Produk Pembiayaan" value={form.product_id} options={products} onChange={(value) => onChange({ product_id: value })} required />
        <SelectField label="Jenis Akad" value={form.akad_type_id} options={contractTypes} onChange={(value) => onChange({ akad_type_id: value })} required />
        <SelectField label="Cabang" value={form.branch_id} options={branches} onChange={(value) => onChange({ branch_id: value })} />
        <SelectField label="PIC / Marketing" value={form.marketing_user_id} options={users} onChange={(value) => onChange({ marketing_user_id: value })} searchable searchPlaceholder="Cari nama PIC atau divisi..." />
      </SetupFormSection>
      <SetupFormSection title="Tanggal dan Status" contentClassName="md:grid-cols-3">
        <DateField label="Tanggal Akad" value={form.tanggal_akad} onChange={(value) => onChange({ tanggal_akad: value })} required />
        <DateField label="Tanggal Jatuh Tempo" value={form.tanggal_jatuh_tempo} onChange={(value) => onChange({ tanggal_jatuh_tempo: value })} />
        <SelectField label="Status" value={form.status} options={contractStatusOptions} includeEmpty={false} onChange={(value) => onChange({ status: value })} />
      </SetupFormSection>
      <SetupFormSection title="Nilai Pembiayaan" contentClassName="md:grid-cols-3">
        <TextField label="Plafond" value={form.plafond} type="number" onChange={(value) => onChange({ plafond: value })} />
        <TextField label="Pokok" value={form.pokok} type="number" onChange={(value) => onChange({ pokok: value })} />
        <TextField label="Margin" value={form.margin} type="number" onChange={(value) => onChange({ margin: value })} />
        <TextField label="Tenor" value={form.tenor} type="number" onChange={(value) => onChange({ tenor: value })} required />
        <TextField label="Outstanding Pokok" value={form.outstanding_pokok} type="number" onChange={(value) => onChange({ outstanding_pokok: value })} />
        <TextField label="Outstanding Margin" value={form.outstanding_margin} type="number" onChange={(value) => onChange({ outstanding_margin: value })} />
      </SetupFormSection>
      <SetupFormSection title="Objek dan Agunan" contentClassName="md:grid-cols-1">
        <TextareaField label="Objek Pembiayaan" value={form.objek_pembiayaan} onChange={(value) => onChange({ objek_pembiayaan: value })} />
        <TextareaField label="Agunan" value={form.agunan} onChange={(value) => onChange({ agunan: value })} />
      </SetupFormSection>
    </DashboardModal>
  );
}

function useDebtorTable() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<DebtorRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await debiturService.getDebtorsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search: query,
        status,
        customer_type: customerType,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat data debitur",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [customerType, page, query, showToast, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [customerType, query, status]);

  return {
    items,
    meta,
    query,
    setQuery,
    status,
    setStatus,
    customerType,
    setCustomerType,
    page,
    setPage,
    isLoading,
    reload: load,
  };
}

function useContractTable() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<DebtorContract[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await debiturService.getContractsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search: query,
        status,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat data kontrak",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, query, showToast, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  return {
    items,
    meta,
    query,
    setQuery,
    status,
    setStatus,
    page,
    setPage,
    isLoading,
    reload: load,
  };
}

function useFinancingListTable(enabled: boolean) {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<DebtorContract[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [query, setQuery] = useState("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [collectibilityLevel, setCollectibilityLevel] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setIsLoading(true);
      const result = await debiturService.getContractsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search: query,
        period_month: periodMonth,
        collectibility_level: collectibilityLevel,
        sort_by: periodMonth ? "no_kontrak" : "created_at",
        sort_order: periodMonth ? "asc" : "desc",
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat data pembiayaan",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [collectibilityLevel, enabled, page, periodMonth, query, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [collectibilityLevel, periodMonth, query]);

  return {
    items,
    meta,
    query,
    setQuery,
    periodMonth,
    setPeriodMonth,
    collectibilityLevel,
    setCollectibilityLevel,
    page,
    setPage,
    isLoading,
    reload: load,
  };
}

function useCollateralTable(enabled: boolean) {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<DebtorCollateral[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [query, setQuery] = useState("");
  const [collateralType, setCollateralType] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setIsLoading(true);
      const result = await debiturService.getCollateralsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search: query,
        collateral_type: collateralType,
        link_status: linkStatus,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat data jaminan",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [collateralType, enabled, linkStatus, page, query, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [collateralType, linkStatus, query]);

  return {
    items,
    meta,
    query,
    setQuery,
    collateralType,
    setCollateralType,
    linkStatus,
    setLinkStatus,
    page,
    setPage,
    isLoading,
    reload: load,
  };
}

function DebtorTable({
  items,
  meta,
  isLoading,
  isFiltered = false,
  emptyAction,
  canUpdate = false,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
  onAddContract,
}: {
  items: DebtorRecord[];
  meta: PaginationMeta;
  isLoading: boolean;
  isFiltered?: boolean;
  emptyAction?: ReactNode;
  canUpdate?: boolean;
  canDelete?: boolean;
  onView: (debtor: DebtorRecord) => void;
  onEdit?: (debtor: DebtorRecord) => void;
  onDelete?: (debtor: DebtorRecord) => void;
  onAddContract?: (debtor: DebtorRecord) => void;
}) {
  const showActions = Boolean(onEdit || onDelete || onAddContract);
  const colSpan = showActions ? 13 : 12;

  return (
    <SetupDataTable variant="portfolio" density="compact" className="min-w-[1760px]">
      <SetupDataTableColGroup>
        <SetupDataTableCol className="w-[56px]" />
        <SetupDataTableCol className="w-[260px]" />
        <SetupDataTableCol className="w-[160px]" />
        <SetupDataTableCol className="w-[180px]" />
        <SetupDataTableCol className="w-[120px]" />
        <SetupDataTableCol className="w-[110px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[130px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[140px]" />
        <SetupDataTableCol className="w-[110px]" />
        {showActions ? <SetupDataTableCol className="w-[88px]" /> : null}
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Jenis CIF</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Cabang / PIC</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Jumlah Fasilitas</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Total OS</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Kolektibilitas</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Periode SLIK</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Dokumen
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            SLIK
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status
          </SetupDataTableHeaderCell>
          {showActions ? (
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              Aksi
            </SetupDataTableHeaderCell>
          ) : null}
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {items.map((item, index) => (
          <SetupDataTableRow
            key={item.id}
            className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
            onDoubleClick={() => onView(item)}
          >
            <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
              {(meta.page - 1) * meta.limit + index + 1}
            </SetupDataTableCell>
            <SetupDataTableCell>
              <div className="space-y-1">
                <SetupTablePrimaryText>{item.name}</SetupTablePrimaryText>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <SetupTableCode>
                    {item.debtor_number ?? "-"}
                  </SetupTableCode>
                  {item.identity_number ? (
                    <SetupTableCode className="bg-white text-slate-500">
                      {item.identity_number}
                    </SetupTableCode>
                  ) : null}
                </div>
              </div>
            </SetupDataTableCell>
            <SetupDataTableCell>
              <SetupStatusBadge
                status={customerTypeLabel(
                  item.customer_type,
                  item.customer_type_label,
                  item.slik_status_code,
                )}
              />
            </SetupDataTableCell>
            <SetupDataTableCell>
              <div className="space-y-1">
                <SetupTablePrimaryText className="font-medium">
                  {item.branch?.name ?? "-"}
                </SetupTablePrimaryText>
                <SetupTableSecondaryText>
                  {item.marketing_user
                    ? item.marketing_user.division_name
                      ? `${item.marketing_user.name} / ${item.marketing_user.division_name}`
                      : item.marketing_user.name
                    : "-"}
                </SetupTableSecondaryText>
              </div>
            </SetupDataTableCell>
            <SetupDataTableCell>
              <div className="space-y-1">
                <SetupTableNumber>{formatNumber(item.contracts_count)}</SetupTableNumber>
                <SetupTableSecondaryText>
                  {item.latest_contract?.no_kontrak
                    ? `Kontrak terakhir: ${item.latest_contract.no_kontrak}`
                    : "Belum ada kontrak"}
                </SetupTableSecondaryText>
              </div>
            </SetupDataTableCell>
            <SetupDataTableCell className="tabular-nums">
              <SetupTableNumber>{formatNumber(item.collaterals_count)}</SetupTableNumber>
            </SetupDataTableCell>
            <SetupDataTableCell className="font-semibold tabular-nums">
              <SetupTableMoney>{formatCurrency(item.total_outstanding)}</SetupTableMoney>
            </SetupDataTableCell>
            <SetupDataTableCell>
              <SetupCollectibilityBadge
                value={
                  item.latest_collectibility_display ??
                  collectibilityLabel(item.latest_contract?.latest_collectibility) ??
                  "-"
                }
              />
            </SetupDataTableCell>
            <SetupDataTableCell>
              {periodLabel(
                item.latest_slik_period_month ??
                  item.latest_contract?.latest_slik_snapshot?.period_month,
              )}
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  {requiredDocumentsDisplay(item)}
                </span>
                <SetupStatusBadge
                  status={requiredDocumentsLabel(item)}
                  tone={requiredDocumentsTone(item.required_documents_status)}
                  showIcon={false}
                />
              </div>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupStatusBadge
                status={slikCompletenessLabel(item)}
                tone={slikCompletenessTone(item.slik_completeness_status)}
                showIcon={false}
              />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupStatusBadge status={statusLabel(item.status)} />
            </SetupDataTableCell>
            {showActions ? (
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupActionMenu
                  label={`Aksi ${item.name}`}
                  menuLabel={`Aksi untuk ${item.name}`}
                  items={[
                    {
                      key: "view",
                      label: "Lihat",
                      icon: Eye,
                      onClick: () => onView(item),
                    },
                    {
                      key: "edit",
                      label: "Edit",
                      icon: Pencil,
                      tone: "blue",
                      disabled: !canUpdate || !onEdit,
                      onClick: () => onEdit?.(item),
                    },
                    {
                      key: "contract",
                      label: "Tambah Kontrak",
                      icon: FileCheck2,
                      tone: "emerald",
                      disabled: !canUpdate || !onAddContract,
                      onClick: () => onAddContract?.(item),
                    },
                    {
                      key: "delete",
                      label: "Hapus",
                      icon: Trash2,
                      tone: "red",
                      disabled: !canDelete || !onDelete,
                      onClick: () => onDelete?.(item),
                    },
                  ]}
                />
              </SetupDataTableCell>
            ) : null}
          </SetupDataTableRow>
        ))}
        {isLoading ? (
          <SetupDataTableEmptyRow colSpan={colSpan}>
            Memuat data debitur...
          </SetupDataTableEmptyRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={colSpan}
            tone="debitur"
            isFiltered={isFiltered}
            description={
              isFiltered
                ? "Coba ubah kata kunci, status, atau jenis nasabah."
                : "Import SLIK D01/D02 untuk mengisi CIF, atau tambah debitur manual jika diperlukan."
            }
            action={!isFiltered ? emptyAction : undefined}
          >
            {isFiltered ? "Tidak ada debitur yang cocok." : "Belum ada data debitur."}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function FinancingTable({
  items,
  meta,
  isLoading,
  isFiltered = false,
  emptyAction,
  onViewDebtor,
}: {
  items: DebtorContract[];
  meta: PaginationMeta;
  isLoading: boolean;
  isFiltered?: boolean;
  emptyAction?: ReactNode;
  onViewDebtor: (debtorId: string) => void;
}) {
  return (
    <SetupDataTable variant="portfolio" density="compact" className="min-w-[1240px]">
      <SetupDataTableColGroup>
        <SetupDataTableCol className="w-[56px]" />
        <SetupDataTableCol className="w-[170px]" />
        <SetupDataTableCol className="w-[200px]" />
        <SetupDataTableCol className="w-[180px]" />
        <SetupDataTableCol className="w-[140px]" />
        <SetupDataTableCol className="w-[140px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[160px]" />
        <SetupDataTableCol className="w-[140px]" />
        <SetupDataTableCol className="w-[88px]" />
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Nama Nasabah</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Produk / Akad</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Plafon</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>OS Pokok</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>OS Margin</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>KOL</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Jatuh Tempo</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {items.map((item, index) => {
          const snapshot = item.latest_slik_snapshot;
          const debtorId = item.debtor_id || item.debtor?.id;

          return (
            <SetupDataTableRow
              key={item.id}
              className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${debtorId ? "cursor-pointer" : ""}`}
              onDoubleClick={() => debtorId && onViewDebtor(debtorId)}
            >
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {(meta.page - 1) * meta.limit + index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell>
                <div className="space-y-1">
                  <SetupTableCode>{snapshot?.facility_number ?? "-"}</SetupTableCode>
                  <SetupTableSecondaryText>
                    Kontrak: {item.no_kontrak ?? "-"}
                  </SetupTableSecondaryText>
                </div>
              </SetupDataTableCell>
              <SetupDataTableCell className="font-semibold">
                <SetupTablePrimaryText>{item.debtor?.name ?? "-"}</SetupTablePrimaryText>
              </SetupDataTableCell>
              <SetupDataTableCell>
                {[
                  snapshot?.credit_type_display ?? item.product?.name,
                  snapshot?.financing_scheme_display ?? item.akad_type?.name,
                ].filter(Boolean).join(" / ") || "-"}
              </SetupDataTableCell>
              <SetupDataTableCell>{periodLabel(snapshot?.period_month)}</SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableMoney>
                  {formatCurrency(snapshot?.plafond ?? item.plafond)}
                </SetupTableMoney>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableMoney>
                  {formatCurrency(snapshot?.baki_debet ?? item.outstanding_pokok)}
                </SetupTableMoney>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableMoney>
                  {formatCurrency(snapshot?.margin_arrears ?? item.outstanding_margin)}
                </SetupTableMoney>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupCollectibilityBadge
                  value={
                    snapshot?.collectibility_display ??
                    collectibilityLabel(item.latest_collectibility) ??
                    "-"
                  }
                />
              </SetupDataTableCell>
              <SetupDataTableCell>
                {formatDateOnly(snapshot?.due_date ?? item.tanggal_jatuh_tempo)}
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupActionMenu
                  label={`Aksi pembiayaan ${item.no_kontrak}`}
                  menuLabel={`Aksi untuk ${item.no_kontrak}`}
                  items={[
                    {
                      key: "view",
                      label: "Detail Debitur",
                      icon: Eye,
                      disabled: !debtorId,
                      onClick: () => {
                        if (debtorId) onViewDebtor(debtorId);
                      },
                    },
                  ]}
                />
              </SetupDataTableCell>
            </SetupDataTableRow>
          );
        })}
        {isLoading ? (
          <SetupDataTableEmptyRow colSpan={11}>
            Memuat data pembiayaan...
          </SetupDataTableEmptyRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={11}
            tone="debitur"
            isFiltered={isFiltered}
            description={
              isFiltered
                ? "Coba ubah periode, KOL, atau kata kunci fasilitas."
                : "Import F01 untuk melihat fasilitas, outstanding, dan KOL per periode."
            }
            action={!isFiltered ? emptyAction : undefined}
          >
            {isFiltered ? "Tidak ada pembiayaan yang cocok." : "Belum ada data pembiayaan F01."}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function CollateralTable({
  items,
  meta,
  isLoading,
  isFiltered = false,
  emptyAction,
  onViewDebtor,
  collateralTypeLabels,
}: {
  items: DebtorCollateral[];
  meta: PaginationMeta;
  isLoading: boolean;
  isFiltered?: boolean;
  emptyAction?: ReactNode;
  onViewDebtor: (debtorId: string) => void;
  collateralTypeLabels: Map<string, string>;
}) {
  return (
    <SetupDataTable variant="portfolio" density="compact" className="min-w-[1240px]">
      <SetupDataTableColGroup>
        <SetupDataTableCol className="w-[56px]" />
        <SetupDataTableCol className="w-[170px]" />
        <SetupDataTableCol className="w-[170px]" />
        <SetupDataTableCol className="w-[200px]" />
        <SetupDataTableCol className="w-[160px]" />
        <SetupDataTableCol className="w-[180px]" />
        <SetupDataTableCol className="w-[180px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[260px]" />
        <SetupDataTableCol className="w-[88px]" />
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>No / Kode Jaminan</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Nama Nasabah</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Jenis Agunan</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Pemilik</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Bukti Kepemilikan</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Nilai</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Alamat / Keterangan</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {items.map((item, index) => {
          const debtorId = item.debtor_id || item.debtor?.id || item.contract?.debtor_id || "";

          return (
            <SetupDataTableRow
              key={item.id}
              className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${debtorId ? "cursor-pointer" : ""}`}
              onDoubleClick={() => debtorId && onViewDebtor(debtorId)}
            >
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {(meta.page - 1) * meta.limit + index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableCode>
                  {item.collateral_number}
                </SetupTableCode>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <div className="space-y-1">
                  <SetupTableCode>{item.facility_number ?? "-"}</SetupTableCode>
                  <SetupTableSecondaryText>
                    Kontrak: {item.contract?.no_kontrak ?? "-"}
                  </SetupTableSecondaryText>
                </div>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTablePrimaryText>{item.debtor?.name ?? "-"}</SetupTablePrimaryText>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTablePrimaryText>
                  {item.collateral_type_display ??
                    (item.collateral_type
                    ? collateralTypeLabels.get(item.collateral_type.toUpperCase()) ??
                      item.collateral_type
                    : "-")}
                </SetupTablePrimaryText>
              </SetupDataTableCell>
              <SetupDataTableCell>{item.owner_name ?? "-"}</SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableCode className="bg-white">
                  {item.proof_number ?? "-"}
                </SetupTableCode>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableMoney>
                  {formatCurrency(item.market_value ?? item.appraisal_value)}
                </SetupTableMoney>
              </SetupDataTableCell>
              <SetupDataTableCell>
                <SetupTableSecondaryText as="div" className="whitespace-normal">
                  {item.address ?? item.description ?? "-"}
                </SetupTableSecondaryText>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupActionMenu
                  label={`Aksi jaminan ${item.collateral_number}`}
                  menuLabel={`Aksi untuk ${item.collateral_number}`}
                  items={[
                    {
                      key: "view",
                      label: "Detail Debitur",
                      icon: Eye,
                      disabled: !debtorId,
                      onClick: () => {
                        if (debtorId) onViewDebtor(debtorId);
                      },
                    },
                  ]}
                />
              </SetupDataTableCell>
            </SetupDataTableRow>
          );
        })}
        {isLoading ? (
          <SetupDataTableEmptyRow colSpan={10}>
            Memuat data jaminan...
          </SetupDataTableEmptyRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <SetupDataTableEmptyRow
            colSpan={10}
            tone="debitur"
            isFiltered={isFiltered}
            description={
              isFiltered
                ? "Coba ubah jenis agunan, status link, atau kata kunci."
                : "Import A01 untuk melihat jaminan dan relasinya ke fasilitas."
            }
            action={!isFiltered ? emptyAction : undefined}
          >
            {isFiltered ? "Tidak ada jaminan yang cocok." : "Belum ada data jaminan A01."}
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function ContractTable({
  items,
  meta,
  isLoading,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  items: DebtorContract[];
  meta: PaginationMeta;
  isLoading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (contract: DebtorContract) => void;
  onDelete: (contract: DebtorContract) => void;
}) {
  return (
    <SetupDataTable variant="portfolio" density="compact" className="min-w-[1180px]">
      <SetupDataTableColGroup>
        <SetupDataTableCol className="w-[56px]" />
        <SetupDataTableCol className="w-[170px]" />
        <SetupDataTableCol className="w-[190px]" />
        <SetupDataTableCol className="w-[160px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[120px]" />
        <SetupDataTableCol className="w-[88px]" />
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Nomor Kontrak</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Produk</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Tgl Akad</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Jatuh Tempo</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Outstanding</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Aksi
          </SetupDataTableHeaderCell>
        </SetupDataTableRow>
      </SetupDataTableHead>
      <SetupDataTableBody>
        {items.map((item, index) => (
          <SetupDataTableRow
            key={item.id}
            className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
          >
            <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
              {(meta.page - 1) * meta.limit + index + 1}
            </SetupDataTableCell>
            <SetupDataTableCell>
              <SetupTableCode>
                {item.no_kontrak}
              </SetupTableCode>
            </SetupDataTableCell>
            <SetupDataTableCell>
              <SetupTablePrimaryText>{item.debtor?.name ?? "-"}</SetupTablePrimaryText>
            </SetupDataTableCell>
            <SetupDataTableCell>{item.product?.name ?? "-"}</SetupDataTableCell>
            <SetupDataTableCell>{formatDateOnly(item.tanggal_akad)}</SetupDataTableCell>
            <SetupDataTableCell>{formatDateOnly(item.tanggal_jatuh_tempo)}</SetupDataTableCell>
            <SetupDataTableCell>
              <SetupTableMoney>{formatCurrency(item.total_outstanding)}</SetupTableMoney>
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupStatusBadge status={statusLabel(item.status)} />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupActionMenu
                label={`Aksi kontrak ${item.no_kontrak}`}
                menuLabel={`Aksi untuk ${item.no_kontrak}`}
                items={[
                  {
                    key: "edit",
                    label: "Edit",
                    icon: Pencil,
                    tone: "blue",
                    disabled: !canUpdate,
                    onClick: () => onEdit(item),
                  },
                  {
                    key: "delete",
                    label: "Hapus",
                    icon: Trash2,
                    tone: "red",
                    disabled: !canDelete,
                    onClick: () => onDelete(item),
                  },
                ]}
              />
            </SetupDataTableCell>
          </SetupDataTableRow>
        ))}
        {isLoading ? (
          <SetupDataTableEmptyRow colSpan={9}>
            Memuat data kontrak...
          </SetupDataTableEmptyRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <SetupDataTableEmptyRow colSpan={9} tone="debitur">
            Belum ada data kontrak.
          </SetupDataTableEmptyRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function DebtorSearchPanel({
  query,
  status,
  customerType,
  onQueryChange,
  onStatusChange,
  onCustomerTypeChange,
}: {
  query: string;
  status: string;
  customerType: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCustomerTypeChange: (value: string) => void;
}) {
  return (
    <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_220px_240px]`}>
      <SetupSearchInput
        label="Cari Debitur"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cari nama, nomor debitur, identitas, atau kontrak..."
      />
      <div>
        <FieldLabel>Jenis CIF</FieldLabel>
        <SetupSelect
          value={customerType}
          onChange={(event) => onCustomerTypeChange(event.target.value)}
        >
          {customerTypeFilterOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
      <div>
        <FieldLabel>Status</FieldLabel>
        <SetupSelect value={status} onChange={(event) => onStatusChange(event.target.value)}>
          {debtorStatusOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
    </div>
  );
}

function DebtorListScopeNote() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
      <p className="font-semibold text-gray-900">List gabungan per nasabah</p>
      <p className="mt-1">
        Fasilitas, agunan, kolektibilitas, outstanding, dan periode SLIK ditarik
        sebagai ringkasan per CIF. Detail relasi tetap dibuka dari baris debitur.
      </p>
    </div>
  );
}

function FinancingSearchPanel({
  query,
  periodMonth,
  collectibilityLevel,
  onQueryChange,
  onPeriodMonthChange,
  onCollectibilityLevelChange,
}: {
  query: string;
  periodMonth: string;
  collectibilityLevel: string;
  onQueryChange: (value: string) => void;
  onPeriodMonthChange: (value: string) => void;
  onCollectibilityLevelChange: (value: string) => void;
}) {
  return (
    <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_180px_240px]`}>
      <SetupSearchInput
        label="Cari Pembiayaan"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cari nomor fasilitas, nama nasabah, CIF, atau identitas..."
      />
      <div>
        <FieldLabel>Periode Data</FieldLabel>
        <SetupTextInput
          type="month"
          value={periodMonth}
          onChange={(event) => onPeriodMonthChange(event.target.value)}
        />
      </div>
      <div>
        <FieldLabel>Kolektibilitas</FieldLabel>
        <SetupSelect
          value={collectibilityLevel}
          onChange={(event) => onCollectibilityLevelChange(event.target.value)}
        >
          {collectibilityLevelOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
    </div>
  );
}

function CollateralSearchPanel({
  query,
  collateralType,
  linkStatus,
  collateralTypeOptions,
  onQueryChange,
  onCollateralTypeChange,
  onLinkStatusChange,
}: {
  query: string;
  collateralType: string;
  linkStatus: string;
  collateralTypeOptions: Option[];
  onQueryChange: (value: string) => void;
  onCollateralTypeChange: (value: string) => void;
  onLinkStatusChange: (value: string) => void;
}) {
  return (
    <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_220px_220px]`}>
      <SetupSearchInput
        label="Cari Jaminan"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cari nomor jaminan, fasilitas, pemilik, bukti, atau nasabah..."
      />
      <div>
        <FieldLabel>Jenis Agunan</FieldLabel>
        <SetupSelect
          value={collateralType}
          onChange={(event) => onCollateralTypeChange(event.target.value)}
        >
          {collateralTypeOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
      <div>
        <FieldLabel>Status Link</FieldLabel>
        <SetupSelect
          value={linkStatus}
          onChange={(event) => onLinkStatusChange(event.target.value)}
        >
          {collateralLinkStatusOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
    </div>
  );
}

function DebtorListSummaryCards({
  items,
  meta,
}: {
  items: DebtorRecord[];
  meta: PaginationMeta;
}) {
  const individualCount = items.filter(
    (item) => item.customer_type === "INDIVIDUAL" || item.slik_status_code === "I",
  ).length;
  const legalEntityCount = items.filter(
    (item) => item.customer_type === "LEGAL_ENTITY" || item.slik_status_code === "B",
  ).length;
  const activeContracts = items.filter(
    (item) => item.latest_contract?.status === "ACTIVE",
  ).length;
  const npfCount = items.filter(
    (item) => item.latest_contract?.latest_collectibility?.is_npf,
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total CIF"
        value={formatNumber(meta.total)}
        description="Sesuai filter aktif"
        icon={Users}
      />
      <StatCard
        label="Perorangan / Badan"
        value={`${formatNumber(individualCount)} / ${formatNumber(legalEntityCount)}`}
        description="Data pada halaman ini"
        icon={Building2}
      />
      <StatCard
        label="Kontrak Aktif"
        value={formatNumber(activeContracts)}
        description="Kontrak terakhir halaman ini"
        icon={BriefcaseBusiness}
      />
      <StatCard
        label="Indikasi NPF"
        value={formatNumber(npfCount)}
        description="Berdasarkan kol terakhir halaman ini"
        icon={PieChart}
      />
    </div>
  );
}

export function DebtorListClient() {
  const [activeView] = useState<DebtorListView>("cif");
  const { showToast } = useAppToast();
  const { hasCapability } = useProtectedAction();
  const table = useDebtorTable();
  const financingTable = useFinancingListTable(activeView === "financing");
  const collateralTable = useCollateralTable(activeView === "collateral");
  const [collateralTypes, setCollateralTypes] = useState<ParameterMasterRecord[]>([]);
  const router = useRouter();
  const collateralTypeOptions = useMemo(
    () => toParameterCodeOptions(collateralTypes, "Semua Jenis Agunan"),
    [collateralTypes],
  );
  const collateralTypeLabels = useMemo(
    () => parameterLabelMap(collateralTypes),
    [collateralTypes],
  );
  const selectedCollateralTypeLabel =
    collateralTypeOptions.find(
      (option) => option.value === collateralTable.collateralType,
    )?.label ?? collateralTable.collateralType;

  useEffect(() => {
    let ignore = false;

    async function loadCollateralTypes() {
      try {
        const rows = await collateralTypeService.getAll({ is_active: true });
        if (!ignore) setCollateralTypes(rows);
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat parameter jenis agunan",
            "error",
          );
        }
      }
    }

    void loadCollateralTypes();

    return () => {
      ignore = true;
    };
  }, [showToast]);
  const openDetail = (debtor: DebtorRecord) => {
    router.push(`/dashboard/informasi-debitur/${debtor.id}`);
  };
  const openDetailById = (debtorId: string) => {
    router.push(`/dashboard/informasi-debitur/${debtorId}`);
  };
  const canImportSlik = hasCapability(
    "/dashboard/informasi-debitur/admin/upload-slik",
    "create",
  );
  const canCreateMaster = hasCapability(
    "/dashboard/informasi-debitur/master-debitur",
    "create",
  );
  const importSlikAction = canImportSlik ? (
    <SetupAddButton
      label="Import SLIK"
      icon={<Upload className="uiverse-add-user-button__svg" aria-hidden="true" />}
      onClick={() => router.push("/dashboard/informasi-debitur/admin/upload-slik")}
    />
  ) : null;
  const createDebtorAction = canCreateMaster ? (
    <button
      type="button"
      className="uiverse-modal-button uiverse-modal-button--neutral"
      onClick={() => router.push("/dashboard/informasi-debitur/master-debitur")}
    >
      Tambah Manual
    </button>
  ) : null;
  const cifEmptyAction =
    canImportSlik || canCreateMaster ? (
      <>
        {importSlikAction}
        {createDebtorAction}
      </>
    ) : undefined;
  const isCifFiltered = Boolean(
    table.query.trim() || table.status || table.customerType,
  );
  const isFinancingFiltered = Boolean(
    financingTable.query.trim() ||
      financingTable.periodMonth ||
      financingTable.collectibilityLevel,
  );
  const isCollateralFiltered = Boolean(
    collateralTable.query.trim() ||
      collateralTable.collateralType ||
      collateralTable.linkStatus,
  );

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="List Debitur"
        subtitle="Eksplorasi data CIF, pembiayaan F01, dan jaminan A01 hasil import SLIK."
        icon={<Users />}
      />
      <DebtorListScopeNote />
      {activeView === "cif" ? (
        <>
          <DebtorSearchPanel
            query={table.query}
            status={table.status}
            customerType={table.customerType}
            onQueryChange={table.setQuery}
            onStatusChange={table.setStatus}
            onCustomerTypeChange={table.setCustomerType}
          />
          <DebtorListSummaryCards items={table.items} meta={table.meta} />
        </>
      ) : null}
      {activeView === "financing" ? (
        <>
          <FinancingSearchPanel
            query={financingTable.query}
            periodMonth={financingTable.periodMonth}
            collectibilityLevel={financingTable.collectibilityLevel}
            onQueryChange={financingTable.setQuery}
            onPeriodMonthChange={financingTable.setPeriodMonth}
            onCollectibilityLevelChange={financingTable.setCollectibilityLevel}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total Pembiayaan"
              value={formatNumber(financingTable.meta.total)}
              description="Sesuai filter aktif"
              icon={BriefcaseBusiness}
            />
            <StatCard
              label="Periode Dipilih"
              value={periodLabel(financingTable.periodMonth)}
              description="F01 menyimpan posisi OS per periode"
              icon={BarChart3}
            />
            <StatCard
              label="Filter KOL"
              value={
                collectibilityLevelOptions.find(
                  (option) => option.value === financingTable.collectibilityLevel,
                )?.label ?? "Semua KOL"
              }
              description="Kolektibilitas fasilitas"
              icon={PieChart}
            />
          </div>
        </>
      ) : null}
      {activeView === "collateral" ? (
        <>
          <CollateralSearchPanel
            query={collateralTable.query}
            collateralType={collateralTable.collateralType}
            linkStatus={collateralTable.linkStatus}
            collateralTypeOptions={collateralTypeOptions}
            onQueryChange={collateralTable.setQuery}
            onCollateralTypeChange={collateralTable.setCollateralType}
            onLinkStatusChange={collateralTable.setLinkStatus}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total Jaminan"
              value={formatNumber(collateralTable.meta.total)}
              description="Sesuai filter aktif"
              icon={FileArchive}
            />
            <StatCard
              label="Jenis Agunan"
              value={collateralTable.collateralType ? selectedCollateralTypeLabel : "Semua"}
              description="Filter A01"
              icon={FolderOpen}
            />
            <StatCard
              label="Status Link"
              value={
                collateralLinkStatusOptions.find(
                  (option) => option.value === collateralTable.linkStatus,
                )?.label ?? "Semua Link"
              }
              description="Relasi ke CIF atau fasilitas"
              icon={FileCheck2}
            />
          </div>
        </>
      ) : null}
      <SetupTableCard variant="portfolio">
        {activeView === "cif" ? (
          <>
            <DebtorTable
              items={table.items}
              meta={table.meta}
              isLoading={table.isLoading}
              isFiltered={isCifFiltered}
              emptyAction={cifEmptyAction}
              onView={openDetail}
            />
            <Pagination
              page={table.meta.page}
              lastPage={table.meta.lastPage}
              total={table.meta.total}
              limit={table.meta.limit}
              isLoading={table.isLoading}
              onPageChange={table.setPage}
            />
          </>
        ) : null}
        {activeView === "financing" ? (
          <>
            <FinancingTable
              items={financingTable.items}
              meta={financingTable.meta}
              isLoading={financingTable.isLoading}
              isFiltered={isFinancingFiltered}
              emptyAction={importSlikAction ?? undefined}
              onViewDebtor={openDetailById}
            />
            <Pagination
              page={financingTable.meta.page}
              lastPage={financingTable.meta.lastPage}
              total={financingTable.meta.total}
              limit={financingTable.meta.limit}
              isLoading={financingTable.isLoading}
              onPageChange={financingTable.setPage}
            />
          </>
        ) : null}
        {activeView === "collateral" ? (
          <>
            <CollateralTable
              items={collateralTable.items}
              meta={collateralTable.meta}
              isLoading={collateralTable.isLoading}
              isFiltered={isCollateralFiltered}
              emptyAction={importSlikAction ?? undefined}
              collateralTypeLabels={collateralTypeLabels}
              onViewDebtor={openDetailById}
            />
            <Pagination
              page={collateralTable.meta.page}
              lastPage={collateralTable.meta.lastPage}
              total={collateralTable.meta.total}
              limit={collateralTable.meta.limit}
              isLoading={collateralTable.isLoading}
              onPageChange={collateralTable.setPage}
            />
          </>
        ) : null}
      </SetupTableCard>
    </DashboardPageShell>
  );
}

export function DebtorMasterClient() {
  const pathname = usePathname() ?? "/dashboard/informasi-debitur/master-debitur";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const options = useMasterOptions();
  const debtorContracts = useDebtorContractOptions();
  const table = useDebtorTable();
  const contractTable = useContractTable();
  const canCreate = hasCapability(pathname, "create");
  const canUpdate = hasCapability(pathname, "update");
  const canDelete = hasCapability(pathname, "delete");
  const [activeMasterTab, setActiveMasterTab] = useState<"debtors" | "contracts">(
    "debtors",
  );

  const [detail, setDetail] = useState<DebtorRecord | null>(null);
  const [editingDebtor, setEditingDebtor] = useState<DebtorRecord | null>(null);
  const [debtorForm, setDebtorForm] = useState<DebtorFormState>(emptyDebtorForm);
  const [isDebtorModalOpen, setIsDebtorModalOpen] = useState(false);
  const [isSavingDebtor, setIsSavingDebtor] = useState(false);
  const [deleteDebtor, setDeleteDebtor] = useState<DebtorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingContract, setEditingContract] = useState<DebtorContract | null>(null);
  const [deleteContract, setDeleteContract] = useState<DebtorContract | null>(null);
  const [contractForm, setContractForm] = useState<ContractFormState>(
    emptyContractForm,
  );
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [isDeletingContract, setIsDeletingContract] = useState(false);

  const openCreateDebtor = () => {
    if (!ensureCapability(pathname, "create")) return;
    setEditingDebtor(null);
    setDebtorForm(emptyDebtorForm());
    setIsDebtorModalOpen(true);
  };

  const openEditDebtor = (debtor: DebtorRecord) => {
    if (!ensureCapability(pathname, "update")) return;
    setEditingDebtor(debtor);
    setDebtorForm(debtorToForm(debtor));
    setIsDebtorModalOpen(true);
  };

  const closeDebtorModal = () => {
    setIsDebtorModalOpen(false);
    setEditingDebtor(null);
    setDebtorForm(emptyDebtorForm());
  };

  const saveDebtor = async () => {
    const validation = validateDebtorForm(debtorForm);
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSavingDebtor(true);
    try {
      if (editingDebtor) {
        await debiturService.updateDebtor(
          editingDebtor.id,
          buildDebtorPayload(debtorForm),
        );
        showToast("Data debitur diperbarui", "success");
      } else {
        await debiturService.createDebtor(buildDebtorPayload(debtorForm));
        showToast("Data debitur ditambahkan", "success");
      }
      closeDebtorModal();
      await Promise.all([table.reload(), debtorContracts.reload(), contractTable.reload()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan debitur",
        "error",
      );
    } finally {
      setIsSavingDebtor(false);
    }
  };

  const confirmDeleteDebtor = async () => {
    if (!deleteDebtor) return;
    if (!ensureCapability(pathname, "delete")) return;

    setIsDeleting(true);
    try {
      await debiturService.removeDebtor(deleteDebtor.id);
      showToast("Data debitur dihapus", "success");
      setDeleteDebtor(null);
      await Promise.all([table.reload(), debtorContracts.reload(), contractTable.reload()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus debitur",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddContract = (debtor?: DebtorRecord) => {
    if (!ensureCapability(pathname, "create")) return;
    setEditingContract(null);
    setContractForm(emptyContractForm(debtor?.id ?? ""));
    setIsContractModalOpen(true);
  };

  const openEditContract = (contract: DebtorContract) => {
    if (!ensureCapability(pathname, "update")) return;
    setEditingContract(contract);
    setContractForm(contractToForm(contract));
    setIsContractModalOpen(true);
  };

  const closeContractModal = () => {
    setIsContractModalOpen(false);
    setEditingContract(null);
    setContractForm(emptyContractForm());
  };

  const saveContract = async () => {
    const validation = validateContractForm(contractForm);
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSavingContract(true);
    try {
      if (editingContract) {
        await debiturService.updateContract(
          editingContract.id,
          buildContractPayload(contractForm),
        );
        showToast("Kontrak diperbarui", "success");
      } else {
        await debiturService.createContract(buildContractPayload(contractForm));
        showToast("Kontrak ditambahkan", "success");
      }
      closeContractModal();
      await Promise.all([table.reload(), debtorContracts.reload(), contractTable.reload()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan kontrak",
        "error",
      );
    } finally {
      setIsSavingContract(false);
    }
  };

  const confirmDeleteContract = async () => {
    if (!deleteContract) return;
    if (!ensureCapability(pathname, "delete")) return;

    setIsDeletingContract(true);
    try {
      await debiturService.removeContract(deleteContract.id);
      showToast("Kontrak dihapus", "success");
      setDeleteContract(null);
      await Promise.all([table.reload(), debtorContracts.reload(), contractTable.reload()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus kontrak",
        "error",
      );
    } finally {
      setIsDeletingContract(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Master Debitur & Kontrak"
        subtitle="Kelola data debitur, kontrak pembiayaan, dan dokumen pendukung."
        icon={<BriefcaseBusiness />}
        actions={
          canCreate ? (
            <div className="flex flex-wrap justify-end gap-3">
              <SetupAddButton label="Tambah Debitur" onClick={openCreateDebtor} />
              <SetupAddButton
                label="Tambah Kontrak"
                icon={<FileCheck2 className="uiverse-add-user-button__svg" />}
                onClick={() => openAddContract()}
              />
            </div>
          ) : null
        }
      />
      <div className={`${SETUP_PAGE_SEGMENTED_GROUP_CLASS} w-full flex-wrap`}>
        <button
          type="button"
          onClick={() => setActiveMasterTab("debtors")}
          className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} flex min-w-[220px] flex-1 flex-col items-start whitespace-normal text-left ${
            activeMasterTab === "debtors"
              ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
              : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
          }`}
        >
          <span className="block text-sm font-bold">Data Debitur</span>
          <span className={`mt-1 block break-words text-xs leading-5 ${
            activeMasterTab === "debtors" ? "text-white/80" : "text-gray-500"
          }`}>
            CIF D01/D02, PIC, cabang, dokumen.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMasterTab("contracts")}
          className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} flex min-w-[220px] flex-1 flex-col items-start whitespace-normal text-left ${
            activeMasterTab === "contracts"
              ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
              : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
          }`}
        >
          <span className="block text-sm font-bold">Kontrak / Pembiayaan</span>
          <span className={`mt-1 block break-words text-xs leading-5 ${
            activeMasterTab === "contracts" ? "text-white/80" : "text-gray-500"
          }`}>
            Fasilitas, akad, OS, tenor, parameter.
          </span>
        </button>
      </div>

      {activeMasterTab === "debtors" ? (
        <>
          <DebtorSearchPanel
            query={table.query}
            status={table.status}
            customerType={table.customerType}
            onQueryChange={table.setQuery}
            onStatusChange={table.setStatus}
            onCustomerTypeChange={table.setCustomerType}
          />
          <DebtorListSummaryCards items={table.items} meta={table.meta} />
          <SetupTableCard variant="portfolio">
            <DebtorTable
              items={table.items}
              meta={table.meta}
              isLoading={table.isLoading || options.isLoading}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onView={setDetail}
              onEdit={openEditDebtor}
              onDelete={setDeleteDebtor}
              onAddContract={openAddContract}
            />
            <Pagination
              page={table.meta.page}
              lastPage={table.meta.lastPage}
              total={table.meta.total}
              limit={table.meta.limit}
              isLoading={table.isLoading}
              onPageChange={table.setPage}
            />
          </SetupTableCard>
        </>
      ) : null}

      {activeMasterTab === "contracts" ? (
        <section className="space-y-4">
          <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_240px]`}>
            <SetupSearchInput
              label="Cari Kontrak"
              value={contractTable.query}
              onChange={(event) => contractTable.setQuery(event.target.value)}
              placeholder="Cari nomor kontrak, nama debitur, atau identitas..."
            />
            <div>
              <FieldLabel>Status</FieldLabel>
              <SetupSelect
                value={contractTable.status}
                onChange={(event) => contractTable.setStatus(event.target.value)}
              >
                <option value="">Semua</option>
                {contractStatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SetupSelect>
            </div>
          </div>
          <SetupTableCard variant="portfolio">
            <ContractTable
              items={contractTable.items}
              meta={contractTable.meta}
              isLoading={contractTable.isLoading}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEditContract}
              onDelete={setDeleteContract}
            />
            <Pagination
              page={contractTable.meta.page}
              lastPage={contractTable.meta.lastPage}
              total={contractTable.meta.total}
              limit={contractTable.meta.limit}
              isLoading={contractTable.isLoading}
              onPageChange={contractTable.setPage}
            />
          </SetupTableCard>
        </section>
      ) : null}

      <DebtorDetailModal
        debtor={detail}
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
      />
      <DebtorFormModal
        isOpen={isDebtorModalOpen}
        title={editingDebtor ? "Edit Debitur" : "Tambah Debitur"}
        form={debtorForm}
        branches={options.branches}
        users={options.users}
        isSaving={isSavingDebtor}
        onChange={(patch) => setDebtorForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeDebtorModal}
        onSave={() => void saveDebtor()}
      />
      <ContractFormModal
        isOpen={isContractModalOpen}
        title={editingContract ? "Edit Kontrak" : "Tambah Kontrak"}
        form={contractForm}
        debtors={debtorContracts.debtorOptions}
        branches={options.branches}
        products={options.products}
        contractTypes={options.contractTypes}
        users={options.users}
        isSaving={isSavingContract}
        onChange={(patch) => setContractForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeContractModal}
        onSave={() => void saveContract()}
      />
      <DeleteConfirmModal
        isOpen={deleteDebtor !== null}
        title="Hapus Debitur?"
        entityLabel="debitur"
        itemName={deleteDebtor?.name ?? ""}
        onClose={() => setDeleteDebtor(null)}
        onConfirm={() => void confirmDeleteDebtor()}
        isLoading={isDeleting}
      />
      <DeleteConfirmModal
        isOpen={deleteContract !== null}
        title="Hapus Kontrak?"
        entityLabel="kontrak"
        itemName={deleteContract?.no_kontrak ?? ""}
        onClose={() => setDeleteContract(null)}
        onConfirm={() => void confirmDeleteContract()}
        isLoading={isDeletingContract}
      />
    </DashboardPageShell>
  );
}

function getMarketingConfig(kind: DebtorMarketingKind): {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  primaryLabel: string;
  primaryKey: keyof MarketingFormState;
  secondaryFields: Array<keyof MarketingFormState>;
} {
  if (kind === "visit-results") {
    return {
      title: "Hasil Kunjungan",
      subtitle: "Catat hasil kunjungan dan kesimpulan aktivitas marketing.",
      icon: FileCheck2,
      primaryLabel: "Hasil Kunjungan",
      primaryKey: "visit_result",
      secondaryFields: ["visit_address", "conclusion"],
    };
  }

  if (kind === "handling-steps") {
    return {
      title: "Langkah Penanganan",
      subtitle: "Kelola langkah dan hasil penanganan debitur.",
      icon: ClipboardList,
      primaryLabel: "Langkah Penanganan",
      primaryKey: "handling_step",
      secondaryFields: ["handling_result"],
    };
  }

  return {
    title: "Action Plan",
    subtitle: "Rencana tindak lanjut aktivitas marketing debitur.",
    icon: BarChart3,
    primaryLabel: "Action Plan",
    primaryKey: "action_plan",
    secondaryFields: [],
  };
}

function MarketingFormModal({
  isOpen,
  kind,
  form,
  debtors,
  contracts,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  kind: DebtorMarketingKind;
  form: MarketingFormState;
  debtors: Option[];
  contracts: DebtorContract[];
  isSaving: boolean;
  onChange: (patch: Partial<MarketingFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const config = getMarketingConfig(kind);
  const contractOptions = toContractOptions(
    form.debtor_id
      ? contracts.filter((contract) => contract.debtor_id === form.debtor_id)
      : contracts,
  );

  return (
    <DashboardModal
      isOpen={isOpen}
      title={config.title}
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="4xl"
      bodyClassName="max-h-[70vh] space-y-4 overflow-y-auto p-6"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      }
    >
      <SetupFormSection title="Target Aktivitas">
        <SelectField label="Debitur" value={form.debtor_id} options={debtors} onChange={(value) => onChange({ debtor_id: value, contract_id: "" })} required searchable loadOptions={loadDebtorSearchOptions} searchPlaceholder="Cari nama atau nomor debitur..." />
        <SelectField label="Kontrak" value={form.contract_id} options={contractOptions} onChange={(value) => onChange({ contract_id: value })} emptyLabel="Tanpa kontrak khusus" searchable loadOptions={(query) => loadContractSearchOptions(query, form.debtor_id)} searchPlaceholder="Cari nomor kontrak atau nama debitur..." />
        <SelectField label="Status" value={form.status} options={activityStatusOptions.filter((option) => option.value)} includeEmpty={false} onChange={(value) => onChange({ status: value })} />
        <DateField label="Tanggal Aktivitas" value={form.activity_date} onChange={(value) => onChange({ activity_date: value })} />
        <DateField label="Target Tanggal" value={form.target_date} onChange={(value) => onChange({ target_date: value })} />
      </SetupFormSection>
      <SetupFormSection title="Keterangan Aktivitas" contentClassName="md:grid-cols-1">
        <TextareaField label={config.primaryLabel} value={String(form[config.primaryKey] ?? "")} onChange={(value) => onChange({ [config.primaryKey]: value })} required />
        {config.secondaryFields.includes("visit_address") ? <TextareaField label="Alamat Kunjungan" value={form.visit_address} onChange={(value) => onChange({ visit_address: value })} /> : null}
        {config.secondaryFields.includes("conclusion") ? <TextareaField label="Kesimpulan" value={form.conclusion} onChange={(value) => onChange({ conclusion: value })} /> : null}
        {config.secondaryFields.includes("handling_result") ? <TextareaField label="Hasil Penanganan" value={form.handling_result} onChange={(value) => onChange({ handling_result: value })} /> : null}
        <TextareaField label="Catatan" value={form.notes} onChange={(value) => onChange({ notes: value })} />
        <FileUploadField id={`debtor-marketing-file-${kind}`} file={form.file} label="File Pendukung" required={false} validateFile={validateDomainUploadFile} onChange={(event) => onChange({ file: event.target.files?.[0] ?? null })} onClear={() => onChange({ file: null })} />
      </SetupFormSection>
    </DashboardModal>
  );
}

export function DebtorMarketingClient({ kind }: { kind: DebtorMarketingKind }) {
  const pathname = usePathname() ?? "";
  const config = getMarketingConfig(kind);
  const Icon = config.icon;
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const debtorContracts = useDebtorContractOptions();
  const canCreate = hasCapability(pathname, "create");
  const canUpdate = hasCapability(pathname, "update");
  const canDelete = hasCapability(pathname, "delete");

  const [items, setItems] = useState<DebtorMarketingActivity[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<MarketingFormState>(emptyMarketingForm);
  const [editing, setEditing] = useState<DebtorMarketingActivity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<DebtorMarketingActivity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await debiturService.getMarketingPage(kind, {
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search: query,
        status,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : `Gagal memuat ${config.title}`,
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [config.title, kind, page, query, showToast, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  const openCreate = () => {
    if (!ensureCapability(pathname, "create")) return;
    setEditing(null);
    setForm(emptyMarketingForm());
    setIsModalOpen(true);
  };

  const openEdit = (item: DebtorMarketingActivity) => {
    if (!ensureCapability(pathname, "update")) return;
    setEditing(item);
    setForm(marketingToForm(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(emptyMarketingForm());
  };

  const saveMarketing = async () => {
    const validation = validateMarketingForm(kind, form);
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await debiturService.updateMarketing(kind, editing.id, buildMarketingPayload(form));
        showToast(`${config.title} diperbarui`, "success");
      } else {
        await debiturService.createMarketing(kind, buildMarketingPayload(form));
        showToast(`${config.title} ditambahkan`, "success");
      }
      closeModal();
      await load();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : `Gagal menyimpan ${config.title}`,
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (!ensureCapability(pathname, "delete")) return;
    setIsDeleting(true);
    try {
      await debiturService.removeMarketing(kind, deleting.id);
      showToast(`${config.title} dihapus`, "success");
      setDeleting(null);
      await load();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : `Gagal menghapus ${config.title}`,
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={<Icon />}
        actions={
          canCreate ? (
            <SetupAddButton label={`Tambah ${config.title}`} onClick={openCreate} />
          ) : null
        }
      />
      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_240px]`}>
        <SetupSearchInput
          label="Cari Data"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari debitur, kontrak, catatan, atau aktivitas..."
        />
        <div>
          <FieldLabel>Status</FieldLabel>
          <SetupSelect value={status} onChange={(event) => setStatus(event.target.value)}>
            {activityStatusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </SetupSelect>
        </div>
      </div>
      <SetupTableCard variant="workflow">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1100px]">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[56px]" />
            <SetupDataTableCol className="w-[200px]" />
            <SetupDataTableCol className="w-[170px]" />
            <SetupDataTableCol className="w-[180px]" />
            <SetupDataTableCol className="w-[140px]" />
            <SetupDataTableCol className="w-[140px]" />
            <SetupDataTableCol className="w-[120px]" />
            <SetupDataTableCol className="w-[88px]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tgl Aktivitas</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Target</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Aksi
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow
                key={item.id}
                className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
              >
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {(meta.page - 1) * meta.limit + index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell className="font-semibold">
                  {item.debtor?.name ?? "-"}
                </SetupDataTableCell>
                <SetupDataTableCell>
                  {item.contract?.no_kontrak ?? "-"}
                </SetupDataTableCell>
                <SetupDataTableCell title={marketingMainText(item)}>
                  {marketingMainText(item)}
                </SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.activity_date)}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.target_date)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    label={`Aksi ${config.title}`}
                    items={[
                      {
                        key: "edit",
                        label: "Edit",
                        icon: Pencil,
                        tone: "blue",
                        disabled: !canUpdate,
                        onClick: () => openEdit(item),
                      },
                      {
                        key: "delete",
                        label: "Hapus",
                        icon: Trash2,
                        tone: "red",
                        disabled: !canDelete,
                        onClick: () => setDeleting(item),
                      },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? (
              <SetupDataTableEmptyRow colSpan={8}>
                Memuat data {config.title}...
              </SetupDataTableEmptyRow>
            ) : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={8}>
                Belum ada data {config.title.toLowerCase()} yang sesuai.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination
          page={meta.page}
          lastPage={meta.lastPage}
          total={meta.total}
          limit={meta.limit}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </SetupTableCard>
      <MarketingFormModal
        isOpen={isModalOpen}
          kind={kind}
          form={form}
          debtors={debtorContracts.debtorOptions}
          contracts={debtorContracts.contracts}
          isSaving={isSaving}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeModal}
        onSave={() => void saveMarketing()}
      />
      <DeleteConfirmModal
        isOpen={deleting !== null}
        title={`Hapus ${config.title}?`}
        entityLabel={config.title}
        itemName={deleting ? marketingMainText(deleting) : ""}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}

function getImportConfig(type: DebtorImportType) {
  switch (type) {
    case "SLIK":
      return {
        title: "Import SLIK",
        subtitle: "Upload TXT per jenis data: CIF D01/D02, pembiayaan F01, atau jaminan A01.",
        icon: FolderInput,
      };
    case "IDEB":
      return {
        title: "Import IDEB",
        subtitle:
          "Upload file IDEB .txt / .json berisi JSON valid. Hasil yang cocok akan masuk ke debitur existing, yang belum cocok tetap tampil di Laporan IDEB.",
        icon: FolderOpen,
      };
    default:
      return {
        title: "Import Data Debitur",
        subtitle: "Upload file data debitur.",
        icon: FolderInput,
      };
  }
}

function formatImportFileNames(item: DebtorImportJob) {
  const names = item.files
    .map((file) => file.name)
    .filter((name): name is string => Boolean(name));
  const fallbackName = item.file?.name ?? "";
  const fileNames = names.length > 0 ? names : fallbackName ? [fallbackName] : [];
  if (fileNames.length === 0) return "-";
  if (fileNames.length === 1) return compactFileName(fileNames[0]);
  return `${compactFileName(fileNames[0])} + ${fileNames.length - 1} file`;
}

function getImportFileNamesTitle(item: DebtorImportJob) {
  const names = item.files
    .map((file) => file.name)
    .filter((name): name is string => Boolean(name));
  const fallbackName = item.file?.name ?? "";
  const fileNames = names.length > 0 ? names : fallbackName ? [fallbackName] : [];
  return fileNames.length > 0 ? fileNames.join(", ") : "-";
}

function compactFileName(name: string) {
  if (name.length <= 28) return name;

  const extensionIndex = name.lastIndexOf(".");
  const extension = extensionIndex > 0 ? name.slice(extensionIndex) : "";
  const base = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  const head = base.slice(0, 12);
  const tail = base.slice(-6);

  return `${head}...${tail}${extension}`;
}

function formatImportSegmentLabel(segment?: string | null, cifStatus?: string | null) {
  if (segment === "D01") return cifStatus === "I" ? "D01 - CIF Perorangan (I)" : "D01 - CIF Perorangan";
  if (segment === "D02") return cifStatus === "B" ? "D02 - CIF Badan Usaha/Yayasan (B)" : "D02 - CIF Badan Usaha/Yayasan";
  if (segment === "F01") return "F01 - Pembiayaan";
  if (segment === "A01") return "A01 - Jaminan";
  return "-";
}

function formatImportSegments(item: DebtorImportJob) {
  if (item.import_segment) {
    return formatImportSegmentLabel(item.import_segment, item.cif_status);
  }
  const segments = Array.isArray(item.segments)
    ? item.segments
        .map((segment) => segment.segment)
        .filter((segment): segment is string => Boolean(segment))
    : [];
  return segments.length > 0 ? Array.from(new Set(segments)).join(", ") : "-";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function SlikImportModeCards({
  value,
  onChange,
}: {
  value: ImportFormState["import_segment"];
  onChange: (segment: ImportFormState["import_segment"]) => void;
}) {
  const modes: Array<{
    value: ImportFormState["import_segment"];
    title: string;
    description: string;
    icon: LucideIcon;
  }> = [
    {
      value: "D01",
      title: "CIF D01",
      description: "Debitur perorangan. Status otomatis I.",
      icon: Users,
    },
    {
      value: "D02",
      title: "CIF D02",
      description: "Debitur badan usaha/yayasan. Status otomatis B.",
      icon: Building2,
    },
    {
      value: "F01",
      title: "Pembiayaan F01",
      description: "Snapshot OS dan kolektibilitas per periode.",
      icon: BriefcaseBusiness,
    },
    {
      value: "A01",
      title: "Jaminan A01",
      description: "Data jaminan terbaru dari file agunan.",
      icon: FileArchive,
    },
  ];
  const selectedMode = modes.find((mode) => mode.value === value) ?? modes[0];

  return (
    <div className="md:col-span-full">
      <FieldLabel required>Jenis Data TXT</FieldLabel>
      <div className={`${SETUP_PAGE_SEGMENTED_GROUP_CLASS} flex-wrap`}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} inline-flex min-w-[180px] flex-1 items-center gap-2 ${
                isActive
                  ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
                  : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
              }`}
              onClick={() => onChange(mode.value)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{mode.title}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
        <span className="font-semibold text-gray-900">{selectedMode.title}:</span>{" "}
        {selectedMode.description}
      </div>
    </div>
  );
}

function formatImportErrorSummary(item: DebtorImportJob) {
  if (item.status === "PROCESSING" && isPlainRecord(item.processing_summary)) {
    const processedRows =
      typeof item.processing_summary.processed_rows === "number"
        ? item.processing_summary.processed_rows
        : item.success_rows + item.failed_rows;
    const totalRows =
      typeof item.processing_summary.total_rows === "number"
        ? item.processing_summary.total_rows
        : item.total_rows;
    const currentFile =
      typeof item.processing_summary.current_file === "string"
        ? item.processing_summary.current_file
        : "";
    const label = totalRows > 0
      ? `${formatNumber(processedRows)} / ${formatNumber(totalRows)} baris`
      : `${formatNumber(processedRows)} baris`;
    return currentFile ? `Memproses ${currentFile}: ${label}` : `Memproses ${label}`;
  }

  const summary = item.error_summary;
  if (!summary) return item.failed_rows > 0 ? "Ada baris gagal" : "-";
  if (typeof summary === "string") return summary;
  if (!isPlainRecord(summary)) return item.failed_rows > 0 ? "Ada baris gagal" : "-";

  const message = summary.message;
  if (typeof message === "string" && message.trim()) return message.trim();

  const samples = Array.isArray(summary.samples) ? summary.samples : [];
  const firstSample = samples.find(isPlainRecord);
  const firstMessage =
    typeof firstSample?.message === "string" ? firstSample.message.trim() : "";
  const total = typeof summary.total === "number" ? summary.total : samples.length;

  if (firstMessage && total > 0) return `${formatNumber(total)} error: ${firstMessage}`;
  if (total > 0) return `${formatNumber(total)} error`;
  return item.failed_rows > 0 ? "Ada baris gagal" : "-";
}

function SlikMultiFileField({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    for (const file of selectedFiles) {
      if (file.size <= 0) {
        event.target.value = "";
        event.target.setCustomValidity("File yang dipilih kosong atau rusak.");
        event.target.reportValidity();
        event.target.setCustomValidity("");
        return;
      }
      if (file.size > SLIK_IMPORT_MAX_FILE_SIZE_BYTES) {
        event.target.value = "";
        event.target.setCustomValidity(
          `Ukuran file Import SLIK maksimal ${SLIK_IMPORT_MAX_FILE_SIZE_MB} MB.`,
        );
        event.target.reportValidity();
        event.target.setCustomValidity("");
        return;
      }
      const extension = file.name.trim().toLowerCase().split(".").pop();
      if (extension !== "txt") {
        event.target.value = "";
        event.target.setCustomValidity("Import SLIK hanya menerima file TXT.");
        event.target.reportValidity();
        event.target.setCustomValidity("");
        return;
      }
    }
    onChange(selectedFiles);
  };

  return (
    <div className="md:col-span-full">
      <FieldLabel required>File TXT SLIK</FieldLabel>
      <input
        id="debtor-import-slik-files"
        type="file"
        multiple
        accept=".txt"
        className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-100"
        onChange={handleChange}
      />
      <p className="mt-2 text-xs text-slate-500">
        Upload TXT yang berisi satu jenis segmen sesuai pilihan. Nama file, header, dan jumlah field akan divalidasi backend.
      </p>
      {files.length > 0 ? (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            File Dipilih
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="break-words">
                {file.name} ({formatNumber(Math.ceil(file.size / 1024))} KB)
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral mt-3 min-h-[34px] px-3 text-xs"
            onClick={() => onChange([])}
          >
            Bersihkan pilihan
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IdebMultiFileField({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    for (const file of selectedFiles) {
      const error = validateDebtorImportFile("IDEB", file);
      if (error) {
        event.target.value = "";
        event.target.setCustomValidity(error);
        event.target.reportValidity();
        event.target.setCustomValidity("");
        return;
      }
    }
    onChange(selectedFiles);
  };

  return (
    <div className="md:col-span-full">
      <FieldLabel required>File IDEB .txt / .json</FieldLabel>
      <input
        id="debtor-import-ideb-files"
        type="file"
        multiple
        accept=".txt,.json"
        className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-100"
        onChange={handleChange}
      />
      <p className="mt-2 text-xs text-slate-500">
        Jika hasil IDEB terbagi menjadi beberapa bagian, upload semua file bagian dalam satu kali submit.
      </p>
      {files.length > 0 ? (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            File Dipilih
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="break-words">
                {file.name} ({formatNumber(Math.ceil(file.size / 1024))} KB)
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral mt-3 min-h-[34px] px-3 text-xs"
            onClick={() => onChange([])}
          >
            Bersihkan pilihan
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IdebResolvePreviewItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold leading-6 text-gray-900">
        {value || "-"}
      </div>
    </div>
  );
}

function IdebResolveModal({
  isOpen,
  item,
  form,
  debtorOptions,
  contractOptions,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  item: DebtorIdebPendingUpload | null;
  form: IdebResolveFormState;
  debtorOptions: Option[];
  contractOptions: Option[];
  isSaving: boolean;
  onChange: (patch: Partial<IdebResolveFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const facilitiesCount = Array.isArray(item?.summary_detail?.facilities)
    ? item.summary_detail.facilities.length
    : 0;

  return (
    <DashboardModal
      isOpen={isOpen}
      title="Hubungkan IDEB"
      description="Pilih debitur target supaya hasil IDEB tampil di detail debitur."
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="3xl"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
          saveLabel="Hubungkan"
        />
      }
    >
      {item ? (
        <div className="space-y-5">
          <SetupFormSection title="Preview IDEB">
            <IdebResolvePreviewItem label="Nama Debitur" value={item.debtor_name ?? item.summary_detail?.debtor_name ?? "-"} />
            <IdebResolvePreviewItem label="No Identitas" value={item.identity_number ?? item.summary_detail?.identity_number ?? "-"} />
            <IdebResolvePreviewItem label="Periode" value={item.period_month ?? item.summary_detail?.period_month ?? "-"} />
            <IdebResolvePreviewItem label="Format" value={item.source_format ?? item.summary_detail?.source_format ?? "-"} />
            <IdebResolvePreviewItem label="KOL" value={<SetupCollectibilityBadge value={item.current_collectibility ?? item.summary_detail?.current_collectibility} wrap />} />
            <IdebResolvePreviewItem label="Baki Debet" value={formatCurrency(item.outstanding_pokok ?? item.summary_detail?.outstanding_pokok)} />
            <IdebResolvePreviewItem label="Jumlah Fasilitas" value={formatNumber(facilitiesCount)} />
            <IdebResolvePreviewItem label="File" value={item.file?.name ?? "-"} />
          </SetupFormSection>

          <SetupFormSection title="Target Debitur">
            <SelectField
              label="Debitur Target"
              value={form.debtor_id}
              options={debtorOptions}
              onChange={(value) => onChange({ debtor_id: value, contract_id: "" })}
              required
              searchable
              loadOptions={loadDebtorSearchOptions}
              searchPlaceholder="Cari nama atau nomor debitur..."
            />
            <SelectField
              label="Kontrak Target"
              value={form.contract_id}
              options={contractOptions}
              onChange={(value) => onChange({ contract_id: value })}
              emptyLabel="Tanpa target kontrak"
              searchable
              loadOptions={(query) => loadContractSearchOptions(query, form.debtor_id)}
              searchPlaceholder="Cari nomor kontrak atau nama debitur..."
            />
          </SetupFormSection>
        </div>
      ) : null}
    </DashboardModal>
  );
}

type DebtorImportClientMode = "upload" | "monitoring";

export function DebtorImportClient({
  type = "SLIK",
  mode = "upload",
}: {
  type?: DebtorImportType;
  mode?: DebtorImportClientMode;
}) {
  const pathname = usePathname() ?? "";
  const isMonitoringMode = mode === "monitoring";
  const config = isMonitoringMode
    ? {
        title: "Monitoring Import",
        subtitle:
          "Pantau status job import SLIK dan IDEB beserta jumlah baris berhasil/gagal.",
        icon: RefreshCw,
      }
    : getImportConfig(type);
  const Icon = config.icon;
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const router = useRouter();
  const debtorContracts = useDebtorContractOptions();
  const canCreate = !isMonitoringMode && hasCapability(pathname, "create");
  const canOpenSlikImport = hasCapability(
    "/dashboard/informasi-debitur/admin/upload-slik",
    "create",
  );
  const [items, setItems] = useState<DebtorImportJob[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [pendingIdebItems, setPendingIdebItems] = useState<DebtorIdebPendingUpload[]>([]);
  const [pendingIdebMeta, setPendingIdebMeta] = useState<PaginationMeta>(EMPTY_META);
  const [pendingIdebPage, setPendingIdebPage] = useState(1);
  const [isLoadingPendingIdeb, setIsLoadingPendingIdeb] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ImportFormState>(emptyImportForm);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPendingIdeb, setSelectedPendingIdeb] =
    useState<DebtorIdebPendingUpload | null>(null);
  const [resolveForm, setResolveForm] = useState<IdebResolveFormState>(
    emptyIdebResolveForm,
  );
  const [isResolvingIdeb, setIsResolvingIdeb] = useState(false);
  const [exportingIdebId, setExportingIdebId] = useState<string | null>(null);
  const isMountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const pendingIdebRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      loadRequestIdRef.current += 1;
      pendingIdebRequestIdRef.current += 1;
    };
  }, []);

  const load = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      if (isMountedRef.current) setIsLoading(true);
      const result = await debiturService.getImportJobs({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        ...(isMonitoringMode ? {} : { type }),
      });
      if (!isMountedRef.current || loadRequestIdRef.current !== requestId) return;
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      if (isMountedRef.current && loadRequestIdRef.current === requestId) {
        showToast(
          error instanceof Error ? error.message : "Gagal memuat riwayat import",
          "error",
        );
      }
    } finally {
      if (isMountedRef.current && loadRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [isMonitoringMode, page, showToast, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPendingIdeb = useCallback(async () => {
    if (!isMonitoringMode) return;
    const requestId = pendingIdebRequestIdRef.current + 1;
    pendingIdebRequestIdRef.current = requestId;

    try {
      if (isMountedRef.current) setIsLoadingPendingIdeb(true);
      const result = await debiturService.getPendingIdebUploads({
        page: pendingIdebPage,
        limit: SETUP_TABLE_PAGE_SIZE,
      });
      if (!isMountedRef.current || pendingIdebRequestIdRef.current !== requestId) return;
      setPendingIdebItems(result.items);
      setPendingIdebMeta(result.meta);
    } catch (error) {
      if (isMountedRef.current && pendingIdebRequestIdRef.current === requestId) {
        showToast(
          error instanceof Error ? error.message : "Gagal memuat IDEB pending",
          "error",
        );
      }
    } finally {
      if (isMountedRef.current && pendingIdebRequestIdRef.current === requestId) {
        setIsLoadingPendingIdeb(false);
      }
    }
  }, [isMonitoringMode, pendingIdebPage, showToast]);

  useEffect(() => {
    void loadPendingIdeb();
  }, [loadPendingIdeb]);

  const openUpload = () => {
    if (isMonitoringMode) return;
    if (!ensureCapability(pathname, "create")) return;
    setForm(emptyImportForm());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyImportForm());
  };

  const openResolveIdeb = (item: DebtorIdebPendingUpload) => {
    setSelectedPendingIdeb(item);
    setResolveForm({
      debtor_id: item.debtor_id ?? "",
      contract_id: item.contract_id ?? "",
    });
  };

  const closeResolveIdeb = () => {
    setSelectedPendingIdeb(null);
    setResolveForm(emptyIdebResolveForm());
  };

  const saveResolveIdeb = async () => {
    if (!selectedPendingIdeb) return;
    if (!resolveForm.debtor_id) {
      showToast("Debitur target wajib dipilih", "warning");
      return;
    }

    setIsResolvingIdeb(true);
    try {
      await debiturService.resolveIdebUpload(
        selectedPendingIdeb.id,
        buildIdebResolvePayload(resolveForm),
      );
      showToast("Hasil IDEB berhasil dihubungkan", "success");
      closeResolveIdeb();
      await Promise.all([loadPendingIdeb(), load()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghubungkan IDEB",
        "error",
      );
    } finally {
      setIsResolvingIdeb(false);
    }
  };

  const exportIdebResumePdf = async (item: DebtorIdebPendingUpload) => {
    setExportingIdebId(item.id);
    try {
      const result = await debiturService.downloadIdebResumePdf(item.id);
      downloadBrowserFile(result.blob, result.fileName);
      showToast("Resume IDEB berhasil diexport", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal export resume IDEB",
        "error",
      );
    } finally {
      setExportingIdebId(null);
    }
  };

  const saveImport = async () => {
    if (isMonitoringMode) return;
    setIsSaving(true);
    try {
      if (type === "SLIK" && form.import_segment === "F01" && !form.period_month.trim()) {
        throw new Error("Periode Data wajib diisi untuk import F01.");
      }
      const selectedFiles = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
      for (const selectedFile of selectedFiles) {
        const fileError = validateDebtorImportFile(type, selectedFile);
        if (fileError) throw new Error(fileError);
      }
      await debiturService.createImportJob(type, buildImportPayload(form));
      showToast("File import tersimpan", "success");
      closeModal();
      await load();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal upload file import",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const showTargetFields = type === "IDEB";
  const isSlikImport = type === "SLIK";
  const filteredContractOptions = toContractOptions(
    form.debtor_id
      ? debtorContracts.contracts.filter((contract) => contract.debtor_id === form.debtor_id)
      : debtorContracts.contracts,
  );
  const resolveContractOptions = toContractOptions(
    resolveForm.debtor_id
      ? debtorContracts.contracts.filter((contract) => contract.debtor_id === resolveForm.debtor_id)
      : debtorContracts.contracts,
  );

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={<Icon />}
        actions={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="uiverse-modal-button uiverse-modal-button--neutral"
              onClick={() => void load()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Refresh</span>
            </button>
            {canCreate ? <SetupAddButton label="Upload File" onClick={openUpload} /> : null}
          </div>
        }
      />
      {isMonitoringMode ? (
        <SetupTableCard variant="workflow">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-600">
                IDEB Belum Terhubung
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Hasil IDEB yang belum otomatis cocok ke debitur bisa dihubungkan manual dari sini.
              </p>
            </div>
            <button
              type="button"
              className="uiverse-modal-button uiverse-modal-button--neutral min-h-[36px] px-3 text-xs"
              onClick={() => void loadPendingIdeb()}
              disabled={isLoadingPendingIdeb}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Refresh Pending</span>
            </button>
          </div>
          <SetupDataTable variant="workflow" density="compact" className="min-w-[1120px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Debitur IDEB</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Identitas</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Format</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  KOL
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  Baki Debet
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {pendingIdebItems.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(pendingIdebMeta.page - 1) * pendingIdebMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTablePrimaryText>
                      {item.debtor_name ?? item.summary_detail?.debtor_name ?? "-"}
                    </SetupTablePrimaryText>
                    <SetupTableSecondaryText>
                      {item.contract_number ?? item.summary_detail?.contract_number ?? "-"}
                    </SetupTableSecondaryText>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <SetupTableCode>
                      {item.identity_number ?? item.summary_detail?.identity_number ?? "-"}
                    </SetupTableCode>
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {item.period_month ?? item.summary_detail?.period_month ?? "-"}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    {item.source_format ?? item.summary_detail?.source_format ?? "-"}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupCollectibilityBadge
                      value={item.current_collectibility ?? item.summary_detail?.current_collectibility}
                      wrap
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(item.outstanding_pokok ?? item.summary_detail?.outstanding_pokok)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={idebExternalStatusLabel(item.external_status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className="uiverse-modal-button uiverse-modal-button--neutral min-h-[34px] px-3 text-xs"
                        disabled={exportingIdebId === item.id}
                        onClick={() => void exportIdebResumePdf(item)}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {exportingIdebId === item.id ? "Export..." : "PDF"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="uiverse-modal-button uiverse-modal-button--neutral min-h-[34px] px-3 text-xs"
                        onClick={() => openResolveIdeb(item)}
                      >
                        Hubungkan IDEB
                      </button>
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {isLoadingPendingIdeb ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Memuat IDEB pending...
                </SetupDataTableEmptyRow>
              ) : null}
              {!isLoadingPendingIdeb && pendingIdebItems.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Tidak ada IDEB yang perlu dihubungkan manual.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
          <Pagination
            page={pendingIdebMeta.page}
            lastPage={pendingIdebMeta.lastPage}
            total={pendingIdebMeta.total}
            limit={pendingIdebMeta.limit}
            isLoading={isLoadingPendingIdeb}
            onPageChange={setPendingIdebPage}
          />
        </SetupTableCard>
      ) : null}
      <SetupTableCard variant="report">
        <SetupDataTable variant="report" density="compact" className="min-w-[1120px]">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[52px]" />
            <SetupDataTableCol className="w-[96px]" />
            <SetupDataTableCol className="w-[112px]" />
            <SetupDataTableCol className="w-[120px]" />
            <SetupDataTableCol className="w-[220px]" />
            <SetupDataTableCol className="w-[112px]" />
            <SetupDataTableCol className="w-[88px]" />
            <SetupDataTableCol className="w-[88px]" />
            <SetupDataTableCol className="w-[88px]" />
            <SetupDataTableCol className="w-[180px]" />
            <SetupDataTableCol className="w-[120px]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tipe</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Periode Data</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nama File</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Segmen</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Total Baris</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Berhasil</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Gagal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Catatan Error</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Dibuat</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow
                key={item.id}
                className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
              >
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {(meta.page - 1) * meta.limit + index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{item.type}</SetupDataTableCell>
                <SetupDataTableCell>{item.period_month ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <span
                    className="block max-w-[220px] truncate font-medium text-gray-900"
                    title={getImportFileNamesTitle(item)}
                  >
                    {formatImportFileNames(item)}
                  </span>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <span className="block max-w-[112px] truncate" title={formatImportSegments(item)}>
                    {formatImportSegments(item)}
                  </span>
                </SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.total_rows)}</SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.success_rows)}</SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.failed_rows)}</SetupDataTableCell>
                <SetupDataTableCell>
                  <span
                    className="block max-w-[180px] truncate text-sm text-slate-600"
                    title={formatImportErrorSummary(item)}
                  >
                    {formatImportErrorSummary(item)}
                  </span>
                </SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? (
              <SetupDataTableEmptyRow colSpan={11}>
                Memuat riwayat import...
              </SetupDataTableEmptyRow>
            ) : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={11}
                tone="import"
                description={
                  isMonitoringMode
                    ? "Mulai dari Import SLIK atau Import IDEB untuk membuat riwayat job."
                    : "Upload file sesuai format supaya job import tercatat dan bisa dipantau di Monitoring Import."
                }
                action={
                  isMonitoringMode && canOpenSlikImport ? (
                    <SetupAddButton
                      label="Import SLIK"
                      icon={<Upload className="uiverse-add-user-button__svg" aria-hidden="true" />}
                      onClick={() =>
                        router.push("/dashboard/informasi-debitur/admin/upload-slik")
                      }
                    />
                  ) : canCreate ? (
                    <SetupAddButton
                      label="Upload File"
                      icon={<Upload className="uiverse-add-user-button__svg" aria-hidden="true" />}
                      onClick={openUpload}
                    />
                  ) : undefined
                }
              >
                {isMonitoringMode
                  ? "Belum ada riwayat import."
                  : "Belum ada riwayat import untuk tipe ini."}
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination
          page={meta.page}
          lastPage={meta.lastPage}
          total={meta.total}
          limit={meta.limit}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </SetupTableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={config.title}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="space-y-4 p-6"
        footer={
          <ModalFooter
            onClose={closeModal}
            onSave={() => void saveImport()}
            isSaving={isSaving}
            saveLabel="Upload"
          />
        }
      >
        {isSlikImport ? (
          <SetupFormSection title="File dan Periode SLIK">
            <SlikImportModeCards
              value={form.import_segment}
              onChange={(segment) =>
                setForm((prev) => ({
                  ...prev,
                  import_segment: segment,
                  period_month: segment === "F01" ? prev.period_month : "",
                }))
              }
            />
            {["D01", "D02"].includes(form.import_segment) ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">Status otomatis</span>
                  <SetupStatusBadge
                    status={
                      form.import_segment === "D01"
                        ? "I - Perorangan"
                        : "B - Badan Usaha/Yayasan"
                    }
                    tone="slate"
                    showIcon={false}
                  />
                </div>
                <p className="mt-2">
                  Status ditentukan oleh jenis TXT, bukan input manual.
                </p>
              </div>
            ) : null}
            {form.import_segment === "F01" ? (
              <TextField
                label="Periode Data"
                value={form.period_month}
                placeholder="YYYY-MM"
                required
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, period_month: value }))
                }
              />
            ) : null}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
              {form.import_segment === "F01"
                ? "Urutan import: D01/D02 lebih dulu, lalu F01. F01 menambah atau mengupdate posisi pembiayaan sesuai Periode Data."
                : form.import_segment === "A01"
                  ? "Urutan import: D01/D02 dan F01 lebih dulu, lalu A01. Jika F01 belum ada, agunan akan ditandai menunggu relasi."
                  : "Urutan import: D01/D02 untuk membuat CIF, lalu F01 untuk fasilitas, lalu A01 untuk agunan."}
            </div>
            <SlikMultiFileField files={form.files} onChange={(files) => setForm((prev) => ({ ...prev, files, file: files[0] ?? null }))} />
          </SetupFormSection>
        ) : showTargetFields ? (
          <SetupFormSection title="Target IDEB">
            <SelectField label="Debitur Target" value={form.debtor_id} options={debtorContracts.debtorOptions} onChange={(value) => setForm((prev) => ({ ...prev, debtor_id: value, contract_id: "" }))} emptyLabel="Tanpa target debitur" searchable loadOptions={loadDebtorSearchOptions} searchPlaceholder="Cari nama atau nomor debitur..." />
            <SelectField label="Kontrak Target" value={form.contract_id} options={filteredContractOptions} onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))} emptyLabel="Tanpa target kontrak" searchable loadOptions={(query) => loadContractSearchOptions(query, form.debtor_id)} searchPlaceholder="Cari nomor kontrak atau nama debitur..." />
            <TextField label="Periode Data" value={form.period_month} placeholder="YYYY-MM" onChange={(value) => setForm((prev) => ({ ...prev, period_month: value }))} />
            <TextField label="Referensi" value={form.raw_reference} onChange={(value) => setForm((prev) => ({ ...prev, raw_reference: value }))} />
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600">
              <p className="mb-2 text-sm font-semibold text-gray-900">Format IDEB yang didukung</p>
              <p className="mb-2 text-xs text-gray-500">
                Upload file IDEB .txt atau .json berisi JSON valid. Jika file terbagi menjadi beberapa bagian, pilih semua bagian sekaligus agar digabung menjadi satu hasil pengecekan.
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3">
{`{
  "schema_version": "ideb-v1",
  "periode": "2026-04",
  "debitur": { "nama": "Nama Nasabah", "no_identitas": "3201..." },
  "ringkasan": { "kolektibilitas_terburuk": "1", "kesimpulan": "Aman" },
  "fasilitas": [{ "pelapor": "BPRS", "no_rekening": "PB/2026/0001", "kol": "1" }]
}`}
              </pre>
            </div>
          </SetupFormSection>
        ) : (
          <SetupFormSection title="Informasi Import">
            <TextField label="Total Baris" value={form.total_rows} type="number" onChange={(value) => setForm((prev) => ({ ...prev, total_rows: value }))} />
          </SetupFormSection>
        )}
        {!isSlikImport ? (
          <SetupFormSection title="File Upload" contentClassName="md:grid-cols-1">
            {type === "IDEB" ? (
              <IdebMultiFileField
                files={form.files.length > 0 ? form.files : form.file ? [form.file] : []}
                onChange={(files) =>
                  setForm((prev) => ({ ...prev, files, file: files[0] ?? null }))
                }
              />
            ) : (
              <FileUploadField
                id={`debtor-import-${type}`}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png"
                label="File Upload"
                file={form.file}
                validateFile={(file) => validateDebtorImportFile(type, file)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null, files: [] }))
                }
                onClear={() => setForm((prev) => ({ ...prev, file: null, files: [] }))}
              />
            )}
          </SetupFormSection>
        ) : null}
      </DashboardModal>
      <IdebResolveModal
        isOpen={selectedPendingIdeb !== null}
        item={selectedPendingIdeb}
        form={resolveForm}
        debtorOptions={debtorContracts.debtorOptions}
        contractOptions={resolveContractOptions}
        isSaving={isResolvingIdeb}
        onChange={(patch) => setResolveForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeResolveIdeb}
        onSave={() => void saveResolveIdeb()}
      />
    </DashboardPageShell>
  );
}

export function DebtorCompletenessAuditReportClient() {
  const { showToast } = useAppToast();
  const router = useRouter();
  const options = useMasterOptions();
  const reportRowActivationRef = useRef<DoubleRowActivationState | null>(null);
  const [data, setData] = useState<DebtorCompletenessReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [marketingUserId, setMarketingUserId] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [collectibilityLevel, setCollectibilityLevel] = useState("");
  const [issueType, setIssueType] = useState("");

  const summary = data?.summary;
  const meta = data?.meta ?? EMPTY_META;
  const scopeLabel = useMemo(() => {
    const scope = summary?.scope ?? null;
    if (!scope) return "Scope mengikuti akses user";
    if (scope.can_report_all) return "Semua Data";
    if (scope.can_view_division) return "Data Divisi";
    return "Data Saya";
  }, [summary]);

  const buildQuery = useCallback(
    (targetPage = page, targetLimit = SETUP_TABLE_PAGE_SIZE): DebtorReportQuery => ({
      page: targetPage,
      limit: targetLimit,
      search: search.trim(),
      branch_id: branchId,
      marketing_user_id: marketingUserId,
      customer_type: customerType,
      period_month: periodMonth,
      collectibility_level: collectibilityLevel,
      issue_type: issueType,
    }),
    [
      branchId,
      collectibilityLevel,
      customerType,
      issueType,
      marketingUserId,
      page,
      periodMonth,
      search,
    ],
  );

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const openDebtorDetail = (debtorId: string | null | undefined) => {
    if (!debtorId) return;
    router.push(`/dashboard/informasi-debitur/${debtorId}`);
  };

  const loadReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await debiturService.getCompletenessReport(buildQuery());
      setData(result);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat audit kelengkapan SLIK",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, showToast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const auditCards = [
    {
      label: "Total Isu",
      value: formatNumber(summary?.total_issues ?? 0),
      description: "Semua gap kelengkapan dalam scope akses saat ini.",
      icon: ClipboardList,
    },
    {
      label: "Dokumen Wajib",
      value: formatNumber(summary?.required_documents_incomplete ?? 0),
      description: "Debitur dengan checklist dokumen wajib belum lengkap.",
      icon: FileCheck2,
    },
    {
      label: "Tanpa F01",
      value: formatNumber(summary?.debtors_without_facilities ?? 0),
      description: "CIF sudah ada, tetapi belum punya fasilitas F01.",
      icon: Users,
    },
    {
      label: "Fasilitas Tanpa A01",
      value: formatNumber(summary?.facilities_without_collaterals ?? 0),
      description: "Fasilitas belum punya agunan A01 terstruktur.",
      icon: BriefcaseBusiness,
    },
    {
      label: "Agunan Belum Link",
      value: formatNumber(summary?.unlinked_collaterals ?? 0),
      description: "A01 belum terhubung ke debitur atau fasilitas.",
      icon: FileArchive,
    },
    {
      label: "Tanpa Periode SLIK",
      value: formatNumber(summary?.missing_slik_period ?? 0),
      description: "Fasilitas belum punya snapshot atau periode SLIK.",
      icon: BarChart3,
    },
  ];

  const issueTone = (severity: string | null | undefined): SetupStatusTone => {
    const normalized = String(severity ?? "").trim().toLowerCase();
    if (normalized === "high") return "red";
    if (normalized === "medium") return "amber";
    return "slate";
  };

  const issueDebtor = (item: DebtorCompletenessReport["items"][number]) =>
    item.debtor ?? item.contract?.debtor ?? item.collateral?.debtor ?? null;

  const issueDebtorId = (item: DebtorCompletenessReport["items"][number]) => {
    const debtor = issueDebtor(item);
    return item.debtor_id ?? debtor?.id ?? item.contract?.debtor_id ?? item.collateral?.debtor_id ?? item.collateral?.contract?.debtor_id ?? null;
  };

  const issueContractNumber = (item: DebtorCompletenessReport["items"][number]) =>
    item.contract?.no_kontrak ??
    item.collateral?.contract?.no_kontrak ??
    "-";

  const issueFacilityNumber = (item: DebtorCompletenessReport["items"][number]) =>
    item.contract?.latest_slik_snapshot?.facility_number ??
    item.collateral?.facility_number ??
    "-";

  const issuePeriod = (item: DebtorCompletenessReport["items"][number]) =>
    item.period_month ??
    item.contract?.latest_slik_snapshot?.period_month ??
    item.contract?.latest_collectibility?.period_month ??
    item.debtor?.latest_slik_period_month ??
    null;

  const documentDisplay = (item: DebtorCompletenessReport["items"][number]) => {
    const debtor = issueDebtor(item);
    if (!debtor) return "-";
    return requiredDocumentsDisplay(debtor);
  };

  const exportAuditRows = async () => {
    const exportLimit = 100;
    const rows: Record<string, unknown>[] = [];
    const today = new Date().toISOString().slice(0, 10);

    setIsExporting(true);
    try {
      for (let exportPage = 1; ; exportPage += 1) {
        const result = await debiturService.getCompletenessReport(
          buildQuery(exportPage, exportLimit),
        );
        rows.push(
          ...result.items.map((item, index) => {
            const debtor = issueDebtor(item);
            return {
              no: (exportPage - 1) * exportLimit + index + 1,
              jenis_isu: item.issue_label,
              debitur: debtor?.name ?? "-",
              no_debitur: debtor?.debtor_number ?? "-",
              kontrak: issueContractNumber(item),
              fasilitas_f01: issueFacilityNumber(item),
              agunan: item.collateral?.collateral_number ?? "-",
              periode_slik: periodLabel(issuePeriod(item)),
              status_dokumen_wajib: documentDisplay(item),
              dampak: item.impact,
              rekomendasi: item.recommendation,
            };
          }),
        );
        if (exportPage >= result.meta.lastPage) break;
      }

      await exportToExcel({
        filename: `audit-kelengkapan-slik-${today}`,
        sheetName: "Audit Kelengkapan SLIK",
        title: "Audit Kelengkapan SLIK Debitur",
        columns: [
          { key: "no", header: "NO", width: 8 },
          { key: "jenis_isu", header: "JENIS ISU", width: 28 },
          { key: "debitur", header: "DEBITUR", width: 32 },
          { key: "no_debitur", header: "NO DEBITUR", width: 18 },
          { key: "kontrak", header: "NOMOR KONTRAK", width: 24 },
          { key: "fasilitas_f01", header: "NO FASILITAS F01", width: 24 },
          { key: "agunan", header: "AGUNAN", width: 24 },
          { key: "periode_slik", header: "PERIODE SLIK", width: 18 },
          { key: "status_dokumen_wajib", header: "DOKUMEN WAJIB", width: 22 },
          { key: "dampak", header: "DAMPAK", width: 42 },
          { key: "rekomendasi", header: "REKOMENDASI", width: 46 },
        ],
        data: rows,
      });
      showToast("Export audit kelengkapan SLIK selesai", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal export audit kelengkapan SLIK",
        "error",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Laporan Debitur"
        subtitle="Audit kelengkapan data SLIK dan dokumen wajib berdasarkan data debitur, F01, A01, dan checklist dokumen."
        icon={<ClipboardList />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
        <div>
          <p className="font-semibold text-gray-900">Workspace audit kelengkapan SLIK</p>
          <p className="mt-1">
            Gunakan halaman ini untuk menemukan gap data yang perlu ditindaklanjuti, bukan sebagai pengganti Master Debitur.
          </p>
        </div>
        <SetupStatusBadge status={scopeLabel} tone="slate" showIcon={false} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {auditCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            description={card.description}
            icon={card.icon}
          />
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-slate-700" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black text-slate-900">Daftar Isu Kelengkapan</h2>
              <p className="text-sm leading-5 text-slate-500">
                Setiap baris menjelaskan jenis isu, dampak, dan tindakan yang perlu dilakukan.
              </p>
            </div>
          </div>
          <SetupExcelButton
            loading={isExporting}
            onClick={() => void exportAuditRows()}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-4 border-b border-gray-200 px-5 py-4 lg:grid-cols-[minmax(240px,1fr)_180px_180px_180px] xl:grid-cols-[minmax(280px,1fr)_180px_180px_180px_220px_160px_140px]">
          <SetupSearchInput
            label="Cari Isu"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari debitur, CIF, fasilitas, agunan, cabang, atau PIC..."
          />
          <div>
            <FieldLabel>Cabang</FieldLabel>
            <SetupSelect
              value={branchId}
              onChange={(event) => resetPage(setBranchId)(event.target.value)}
              disabled={options.isLoading}
            >
              <option value="">Semua Cabang</option>
              {options.branches.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>PIC</FieldLabel>
            <SetupSelect
              value={marketingUserId}
              onChange={(event) => resetPage(setMarketingUserId)(event.target.value)}
              disabled={options.isLoading}
            >
              <option value="">Semua PIC</option>
              {options.users.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>Jenis CIF</FieldLabel>
            <SetupSelect
              value={customerType}
              onChange={(event) => resetPage(setCustomerType)(event.target.value)}
            >
              {customerTypeFilterOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>Jenis Isu</FieldLabel>
            <SetupSelect
              value={issueType}
              onChange={(event) => resetPage(setIssueType)(event.target.value)}
            >
              {completenessIssueOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>Periode SLIK</FieldLabel>
            <SetupTextInput
              type="month"
              value={periodMonth}
              onChange={(event) => resetPage(setPeriodMonth)(event.target.value)}
            />
          </div>
          <div>
            <FieldLabel>KOL</FieldLabel>
            <SetupSelect
              value={collectibilityLevel}
              onChange={(event) => resetPage(setCollectibilityLevel)(event.target.value)}
            >
              {collectibilityLevelOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
        </div>

        <SetupTableCard variant="report" className="border-0 shadow-none">
          <SetupDataTable variant="report" density="compact" className="min-w-[1420px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Isu</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Periode SLIK</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Dokumen Wajib</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Dampak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Rekomendasi</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {(data?.items ?? []).map((item, index) => {
                const debtor = issueDebtor(item);
                const debtorId = issueDebtorId(item);
                const rowKey = item.id || `${item.issue_type}-${index}`;

                return (
                  <SetupDataTableRow
                    key={rowKey}
                    className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                      debtorId ? "cursor-pointer hover:bg-[#157ec3]/5" : ""
                    }`}
                    role={debtorId ? "button" : undefined}
                    tabIndex={debtorId ? 0 : undefined}
                    title={debtorId ? "Klik dua kali untuk melihat detail debitur" : undefined}
                    onClick={
                      debtorId
                        ? () =>
                            handleDoubleRowClick(
                              reportRowActivationRef,
                              `audit-${rowKey}`,
                              () => openDebtorDetail(debtorId),
                            )
                        : undefined
                    }
                    onDoubleClick={
                      debtorId
                        ? () =>
                            triggerDoubleRowActivation(
                              reportRowActivationRef,
                              `audit-${rowKey}`,
                              () => openDebtorDetail(debtorId),
                            )
                        : undefined
                    }
                    onKeyDown={
                      debtorId
                        ? (event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            triggerDoubleRowActivation(
                              reportRowActivationRef,
                              `audit-${rowKey}`,
                              () => openDebtorDetail(debtorId),
                            );
                          }
                        : undefined
                    }
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(meta.page - 1) * meta.limit + index + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <SetupStatusBadge
                        status={item.issue_label}
                        tone={issueTone(item.severity)}
                        showIcon={false}
                        wrap
                      />
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <SetupTablePrimaryText>{debtor?.name ?? "-"}</SetupTablePrimaryText>
                      <SetupTableSecondaryText>{debtor?.debtor_number ?? "-"}</SetupTableSecondaryText>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <SetupTableCode>{issueFacilityNumber(item)}</SetupTableCode>
                      <SetupTableSecondaryText>
                        Kontrak: {issueContractNumber(item)}
                      </SetupTableSecondaryText>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      {item.collateral?.collateral_number ? (
                        <SetupTableCode>{item.collateral.collateral_number}</SetupTableCode>
                      ) : (
                        "-"
                      )}
                    </SetupDataTableCell>
                    <SetupDataTableCell>{periodLabel(issuePeriod(item))}</SetupDataTableCell>
                    <SetupDataTableCell>
                      {debtor ? (
                        <div className="space-y-1">
                          <SetupTablePrimaryText>{requiredDocumentsDisplay(debtor)}</SetupTablePrimaryText>
                          <SetupStatusBadge
                            status={requiredDocumentsLabel(debtor)}
                            tone={requiredDocumentsTone(debtor.required_documents_status)}
                            size="sm"
                            showIcon={false}
                          />
                        </div>
                      ) : (
                        "-"
                      )}
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <span className="line-clamp-2 text-sm text-slate-600" title={item.impact}>
                        {item.impact}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell>
                      <span className="line-clamp-2 text-sm text-slate-600" title={item.recommendation}>
                        {item.recommendation}
                      </span>
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                );
              })}
              {isLoading ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Memuat audit kelengkapan SLIK...
                </SetupDataTableEmptyRow>
              ) : null}
              {!isLoading && (data?.items.length ?? 0) === 0 ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Belum ada isu kelengkapan sesuai filter.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>

        <div className="border-t border-gray-200 px-5 py-4">
          <Pagination
            page={meta.page}
            lastPage={meta.lastPage}
            total={meta.total}
            limit={meta.limit}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </div>
      </section>
    </DashboardPageShell>
  );
}

export function DebtorReportClient() {
  const { showToast } = useAppToast();
  const router = useRouter();
  const options = useMasterOptions();
  const reportRowActivationRef = useRef<DoubleRowActivationState | null>(null);
  const [activeReport, setActiveReport] = useState<DebtorReportKind>("portfolio");
  const [overview, setOverview] = useState<DebtorReportOverview>({
    portfolio: null,
    facilities: null,
    collaterals: null,
    completeness: null,
  });
  const [portfolio, setPortfolio] = useState<DebtorPortfolioReport | null>(null);
  const [facilities, setFacilities] = useState<DebtorFacilityReport | null>(null);
  const [collaterals, setCollaterals] = useState<DebtorCollateralReport | null>(null);
  const [completeness, setCompleteness] = useState<DebtorCompletenessReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [marketingUserId, setMarketingUserId] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [status, setStatus] = useState("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [collectibilityLevel, setCollectibilityLevel] = useState("");
  const [collateralType, setCollateralType] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  const [issueType, setIssueType] = useState("");
  const definition = debtorReportDefinitions[activeReport];
  const ActiveReportIcon = definition.icon;
  const currentMeta =
    activeReport === "portfolio"
      ? portfolio?.meta
      : activeReport === "facilities"
        ? facilities?.meta
        : activeReport === "collaterals"
          ? collaterals?.meta
          : completeness?.meta;
  const scopeLabel = useMemo(() => {
    const scope =
      portfolio?.summary.scope ??
      facilities?.summary.scope ??
      collaterals?.summary.scope ??
      completeness?.summary.scope ??
      overview.portfolio?.scope ??
      overview.facilities?.scope ??
      overview.collaterals?.scope ??
      overview.completeness?.scope ??
      null;
    if (!scope) return "Scope mengikuti akses user";
    if (scope.can_report_all) return "Semua Data";
    if (scope.can_view_division) return "Data Divisi";
    return "Data Saya";
  }, [collaterals, completeness, facilities, overview, portfolio]);

  const buildActiveQuery = useCallback(
    (targetPage = page, targetLimit = SETUP_TABLE_PAGE_SIZE): DebtorReportQuery => {
      const base: DebtorReportQuery = {
        page: targetPage,
        limit: targetLimit,
        search: search.trim(),
        branch_id: branchId,
        marketing_user_id: marketingUserId,
        customer_type: customerType,
        period_month: periodMonth,
        collectibility_level: collectibilityLevel,
      };

      if (activeReport === "portfolio") {
        return { ...base, status };
      }
      if (activeReport === "facilities") {
        return { ...base, status };
      }
      if (activeReport === "collaterals") {
        return {
          ...base,
          collateral_type: collateralType,
          link_status: linkStatus,
        };
      }
      if (activeReport === "completeness") {
        return {
          ...base,
          issue_type: issueType,
        };
      }
      return base;
    },
    [
      activeReport,
      branchId,
      collateralType,
      collectibilityLevel,
      customerType,
      issueType,
      linkStatus,
      marketingUserId,
      page,
      periodMonth,
      search,
      status,
    ],
  );

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const openDebtorDetail = (debtorId: string | null | undefined) => {
    if (!debtorId) return;
    router.push(`/dashboard/informasi-debitur/${debtorId}`);
  };

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [portfolioResult, facilityResult, collateralResult, completenessResult] =
          await Promise.all([
            debiturService.getPortfolioReport({ page: 1, limit: 1 }),
            debiturService.getFacilityReport({ page: 1, limit: 1 }),
            debiturService.getCollateralReport({ page: 1, limit: 1 }),
            debiturService.getCompletenessReport({ page: 1, limit: 1 }),
          ]);
        if (!ignore) {
          setOverview({
            portfolio: portfolioResult.summary,
            facilities: facilityResult.summary,
            collaterals: collateralResult.summary,
            completeness: completenessResult.summary,
          });
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat ringkasan laporan debitur",
            "error",
          );
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        const query = buildActiveQuery();
        if (activeReport === "portfolio") {
          const result = await debiturService.getPortfolioReport(query);
          if (!ignore) setPortfolio(result);
        } else if (activeReport === "facilities") {
          const result = await debiturService.getFacilityReport(query);
          if (!ignore) setFacilities(result);
        } else if (activeReport === "collaterals") {
          const result = await debiturService.getCollateralReport(query);
          if (!ignore) setCollaterals(result);
        } else {
          const result = await debiturService.getCompletenessReport(query);
          if (!ignore) setCompleteness(result);
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat laporan debitur",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [activeReport, buildActiveQuery, showToast]);

  const buildReportCards = () => ({
    portfolio: {
      totalLabel: "TOTAL DEBITUR",
      totalValue: overview.portfolio?.total_debtors ?? 0,
      rows: [
        { label: "Aktif", value: formatNumber(overview.portfolio?.active_debtors ?? 0) },
        {
          label: "Fasilitas",
          value: formatNumber(overview.portfolio?.total_facilities ?? 0),
        },
        {
          label: "Total OS",
          value: formatCurrency(overview.portfolio?.total_outstanding ?? 0),
        },
      ],
    },
    facilities: {
      totalLabel: "TOTAL FASILITAS",
      totalValue: overview.facilities?.total_facilities ?? 0,
      rows: [
        {
          label: "Aktif",
          value: formatNumber(overview.facilities?.active_facilities ?? 0),
        },
        {
          label: "KOL 3-5",
          value: formatNumber(overview.facilities?.npf_facilities ?? 0),
        },
        {
          label: "Baki Debet",
          value: formatCurrency(overview.facilities?.total_outstanding ?? 0),
        },
      ],
    },
    collaterals: {
      totalLabel: "TOTAL AGUNAN",
      totalValue: overview.collaterals?.total_collaterals ?? 0,
      rows: [
        {
          label: "Terhubung",
          value: formatNumber(overview.collaterals?.linked_collaterals ?? 0),
        },
        {
          label: "Belum Link",
          value: formatNumber(overview.collaterals?.unlinked_collaterals ?? 0),
        },
        {
          label: "Nilai Pasar",
          value: formatCurrency(overview.collaterals?.total_market_value ?? 0),
        },
      ],
    },
    completeness: {
      totalLabel: "TOTAL ISU",
      totalValue: overview.completeness?.total_issues ?? 0,
      rows: [
        {
          label: "Debitur tanpa F01",
          value: formatNumber(overview.completeness?.debtors_without_facilities ?? 0),
        },
        {
          label: "Fasilitas tanpa A01",
          value: formatNumber(overview.completeness?.facilities_without_collaterals ?? 0),
        },
        {
          label: "Agunan belum link",
          value: formatNumber(overview.completeness?.unlinked_collaterals ?? 0),
        },
        {
          label: "Tanpa periode",
          value: formatNumber(overview.completeness?.missing_slik_period ?? 0),
        },
      ],
    },
  });

  const reportCards = buildReportCards();

  const exportRowsForActiveReport = async () => {
    const exportLimit = 100;
    const rows: Record<string, unknown>[] = [];
    const today = new Date().toISOString().slice(0, 10);

    setIsExporting(true);
    try {
      if (activeReport === "portfolio") {
        for (let exportPage = 1; ; exportPage += 1) {
          const result = await debiturService.getPortfolioReport(
            buildActiveQuery(exportPage, exportLimit),
          );
          rows.push(
            ...result.items.map((item, index) => ({
              no: (exportPage - 1) * exportLimit + index + 1,
              debitur: item.name,
              no_debitur: item.debtor_number ?? "-",
              identitas: item.identity_number ?? "-",
              jenis_cif: customerTypeLabel(
                item.customer_type,
                item.customer_type_label,
                item.slik_status_code,
              ),
              cabang: item.branch?.name ?? "-",
              pic: item.marketing_user?.name ?? "-",
              fasilitas: item.contracts_count,
              agunan: item.collaterals_count ?? 0,
              total_os: formatCurrency(item.total_outstanding),
              kol_terakhir: item.latest_collectibility_display ?? "-",
              periode_slik: periodLabel(item.latest_slik_period_month),
              dokumen: item.documents_count,
              status: statusLabel(item.status),
            })),
          );
          if (exportPage >= result.meta.lastPage) break;
        }
      } else if (activeReport === "facilities") {
        for (let exportPage = 1; ; exportPage += 1) {
          const result = await debiturService.getFacilityReport(
            buildActiveQuery(exportPage, exportLimit),
          );
          rows.push(
            ...result.items.map((item, index) => {
              const snapshot = item.latest_slik_snapshot;
              return {
                no: (exportPage - 1) * exportLimit + index + 1,
                debitur: item.debtor?.name ?? "-",
                no_debitur: item.debtor?.debtor_number ?? "-",
                kontrak: item.no_kontrak ?? "-",
                fasilitas_f01: snapshot?.facility_number ?? "-",
                produk: snapshot?.credit_type_display ?? item.product?.name ?? "-",
                akad: snapshot?.financing_scheme_display ?? item.akad_type?.name ?? "-",
                sektor: snapshot?.economic_sector_display ?? "-",
                lokasi: snapshot?.project_location_city_display ?? "-",
                plafon: formatCurrency(snapshot?.plafond ?? item.plafond),
                baki_debet: formatCurrency(snapshot?.baki_debet ?? item.total_outstanding),
                kol: snapshot?.collectibility_display ?? collectibilityLabel(item.latest_collectibility) ?? "-",
                kondisi: snapshot?.condition_display ?? statusLabel(item.status),
                jatuh_tempo: formatDateOnly(snapshot?.due_date ?? item.tanggal_jatuh_tempo),
              };
            }),
          );
          if (exportPage >= result.meta.lastPage) break;
        }
      } else if (activeReport === "collaterals") {
        for (let exportPage = 1; ; exportPage += 1) {
          const result = await debiturService.getCollateralReport(
            buildActiveQuery(exportPage, exportLimit),
          );
          rows.push(
            ...result.items.map((item, index) => ({
              no: (exportPage - 1) * exportLimit + index + 1,
              debitur: item.debtor?.name ?? "-",
              kontrak: item.contract?.no_kontrak ?? "-",
              fasilitas_f01: item.facility_number ?? "-",
              no_agunan: item.collateral_number,
              jenis_agunan: item.collateral_type_display ?? item.collateral_type ?? "-",
              pengikatan: item.binding_type_display ?? item.binding_type_code ?? "-",
              nilai_pasar: formatCurrency(item.market_value),
              nilai_appraisal: formatCurrency(item.appraisal_value),
              lokasi: item.location_city_display ?? item.location_city_code ?? "-",
              status_link: item.debtor_id || item.contract_id ? "Terhubung" : "Belum Terhubung",
            })),
          );
          if (exportPage >= result.meta.lastPage) break;
        }
      } else {
        for (let exportPage = 1; ; exportPage += 1) {
          const result = await debiturService.getCompletenessReport(
            buildActiveQuery(exportPage, exportLimit),
          );
          rows.push(
            ...result.items.map((item, index) => ({
              no: (exportPage - 1) * exportLimit + index + 1,
              jenis_isu: item.issue_label,
              debitur: item.debtor?.name ?? item.contract?.debtor?.name ?? item.collateral?.debtor?.name ?? "-",
              no_debitur: item.debtor?.debtor_number ?? item.contract?.debtor?.debtor_number ?? item.collateral?.debtor?.debtor_number ?? "-",
              kontrak: item.contract?.no_kontrak ?? item.collateral?.contract?.no_kontrak ?? "-",
              fasilitas_f01: item.contract?.latest_slik_snapshot?.facility_number ?? item.collateral?.facility_number ?? "-",
              agunan: item.collateral?.collateral_number ?? "-",
              periode_slik: periodLabel(item.period_month),
              dampak: item.impact,
              rekomendasi: item.recommendation,
            })),
          );
          if (exportPage >= result.meta.lastPage) break;
        }
      }

      await exportToExcel({
        filename: `laporan-debitur-${activeReport}-${today}`,
        sheetName: definition.shortTitle.replace(/[\\/?*:\[\]]/g, " "),
        title: `Laporan Debitur - ${definition.title}`,
        columns: Object.keys(rows[0] ?? { no: "" }).map((key) => ({
          key,
          header: key.replace(/_/g, " ").toUpperCase(),
          width:
            key === "debitur" ||
            key === "kontrak" ||
            key === "fasilitas_f01"
              ? 28
              : 18,
        })),
        data: rows,
      });
      showToast("Export laporan debitur selesai", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal export laporan debitur",
        "error",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Laporan Debitur"
        subtitle="Portofolio data SLIK debitur, fasilitas F01, agunan A01, dan kelengkapan relasinya."
        icon={<BarChart3 />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
        <div>
          <p className="font-semibold text-gray-900">Workspace laporan operasional</p>
          <p className="mt-1">
            Data ditarik dari relasi D01/D02, F01, dan A01 tanpa mengubah raw code SLIK.
          </p>
        </div>
        <SetupStatusBadge status={scopeLabel} tone="slate" showIcon={false} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {debtorReportOrder.map((kind) => {
          const config = debtorReportDefinitions[kind];
          const Icon = config.icon;
          const card = reportCards[kind];
          const isActive = activeReport === kind;

          return (
            <button
              key={kind}
              type="button"
              onClick={() => {
                setActiveReport(kind);
                setPage(1);
              }}
              className={`group flex min-h-[210px] flex-col rounded-lg border bg-white p-5 text-left shadow-sm transition ${
                isActive
                  ? "border-blue-200 ring-2 ring-blue-100"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-7 w-7 text-slate-700" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                      {card.totalLabel}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {typeof card.totalValue === "number"
                        ? formatNumber(card.totalValue)
                        : card.totalValue}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{config.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                  {config.description}
                </p>
                <div className="mt-3 space-y-2">
                  {card.rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-slate-500">{row.label}</span>
                      <span className="max-w-[62%] truncate font-bold text-slate-900">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <span className="mt-auto pt-4 text-sm font-bold text-blue-700">
                {config.ctaLabel}
              </span>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <ActiveReportIcon className="h-8 w-8 text-slate-700" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black text-slate-900">{definition.title}</h2>
              <p className="text-sm leading-5 text-slate-500">{definition.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <SetupExcelButton
              loading={isExporting}
              onClick={() => void exportRowsForActiveReport()}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid gap-4 border-b border-gray-200 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
          {activeReport === "portfolio" ? (
            <>
              <StatCard label="Total Debitur" value={formatNumber(portfolio?.summary.total_debtors ?? 0)} />
              <StatCard label="Debitur Aktif" value={formatNumber(portfolio?.summary.active_debtors ?? 0)} />
              <StatCard label="Total Fasilitas" value={formatNumber(portfolio?.summary.total_facilities ?? 0)} />
              <StatCard label="Total OS" value={formatCurrency(portfolio?.summary.total_outstanding ?? 0)} />
            </>
          ) : null}
          {activeReport === "facilities" ? (
            <>
              <StatCard label="Total Fasilitas" value={formatNumber(facilities?.summary.total_facilities ?? 0)} />
              <StatCard label="Fasilitas Aktif" value={formatNumber(facilities?.summary.active_facilities ?? 0)} />
              <StatCard label="Fasilitas KOL 3-5" value={formatNumber(facilities?.summary.npf_facilities ?? 0)} />
              <StatCard label="Baki Debet" value={formatCurrency(facilities?.summary.total_outstanding ?? 0)} />
            </>
          ) : null}
          {activeReport === "collaterals" ? (
            <>
              <StatCard label="Total Agunan" value={formatNumber(collaterals?.summary.total_collaterals ?? 0)} />
              <StatCard label="Terhubung" value={formatNumber(collaterals?.summary.linked_collaterals ?? 0)} />
              <StatCard label="Belum Link" value={formatNumber(collaterals?.summary.unlinked_collaterals ?? 0)} />
              <StatCard label="Nilai Pasar" value={formatCurrency(collaterals?.summary.total_market_value ?? 0)} />
            </>
          ) : null}
          {activeReport === "completeness" ? (
            <>
              <StatCard label="Total Isu" value={formatNumber(completeness?.summary.total_issues ?? 0)} />
              <StatCard label="Debitur tanpa F01" value={formatNumber(completeness?.summary.debtors_without_facilities ?? 0)} />
              <StatCard label="Fasilitas tanpa A01" value={formatNumber(completeness?.summary.facilities_without_collaterals ?? 0)} />
              <StatCard label="Agunan belum link" value={formatNumber(completeness?.summary.unlinked_collaterals ?? 0)} />
              <StatCard label="Tanpa periode SLIK" value={formatNumber(completeness?.summary.missing_slik_period ?? 0)} />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 border-b border-gray-200 px-5 py-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px] xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px_180px_180px]">
          <SetupSearchInput
            label="Cari Data"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={definition.searchPlaceholder}
          />
          <div>
            <FieldLabel>Cabang</FieldLabel>
            <SetupSelect value={branchId} onChange={(event) => resetPage(setBranchId)(event.target.value)}>
              <option value="">Semua Cabang</option>
              {options.branches.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>PIC</FieldLabel>
            <SetupSelect value={marketingUserId} onChange={(event) => resetPage(setMarketingUserId)(event.target.value)}>
              <option value="">Semua PIC</option>
              {options.users.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>Jenis CIF</FieldLabel>
            <SetupSelect value={customerType} onChange={(event) => resetPage(setCustomerType)(event.target.value)}>
              {customerTypeFilterOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
          <div>
            <FieldLabel>
              {activeReport === "collaterals"
                ? "Status Link"
                : activeReport === "completeness"
                  ? "Jenis Isu"
                  : "Status"}
            </FieldLabel>
            {activeReport === "collaterals" ? (
              <SetupSelect value={linkStatus} onChange={(event) => resetPage(setLinkStatus)(event.target.value)}>
                {collateralLinkStatusOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SetupSelect>
            ) : activeReport === "completeness" ? (
              <SetupSelect value={issueType} onChange={(event) => resetPage(setIssueType)(event.target.value)}>
                {completenessIssueOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SetupSelect>
            ) : (
              <SetupSelect value={status} onChange={(event) => resetPage(setStatus)(event.target.value)}>
                {(activeReport === "facilities" ? contractStatusFilterOptions : debtorStatusOptions).map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SetupSelect>
            )}
          </div>
          <div>
            <FieldLabel>Periode SLIK</FieldLabel>
            <SetupTextInput
              type="month"
              value={periodMonth}
              onChange={(event) => resetPage(setPeriodMonth)(event.target.value)}
            />
          </div>
          {activeReport === "collaterals" ? (
            <div>
              <FieldLabel>Jenis Agunan</FieldLabel>
              <SetupTextInput
                value={collateralType}
                onChange={(event) => resetPage(setCollateralType)(event.target.value)}
                placeholder="Kode atau nama jenis agunan"
              />
            </div>
          ) : activeReport !== "completeness" ? (
            <div>
              <FieldLabel>KOL</FieldLabel>
              <SetupSelect value={collectibilityLevel} onChange={(event) => resetPage(setCollectibilityLevel)(event.target.value)}>
                {collectibilityLevelOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SetupSelect>
            </div>
          ) : null}
        </div>

        <SetupTableCard variant="report" className="border-0 shadow-none">
          {activeReport === "portfolio" ? (
            <SetupDataTable variant="report" density="compact" className="min-w-[1390px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis CIF</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Cabang / PIC</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jumlah Fasilitas</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jumlah Agunan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Total OS</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>KOL Terakhir</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Periode SLIK</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {(portfolio?.items ?? []).map((item, index) => {
                  return (
                    <SetupDataTableRow
                      key={item.id}
                      className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer hover:bg-[#157ec3]/5`}
                      role="button"
                      tabIndex={0}
                      title="Klik dua kali untuk melihat detail debitur"
                      onClick={() =>
                        handleDoubleRowClick(
                          reportRowActivationRef,
                          `portfolio-${item.id}`,
                          () => openDebtorDetail(item.id),
                        )
                      }
                      onDoubleClick={() =>
                        triggerDoubleRowActivation(
                          reportRowActivationRef,
                          `portfolio-${item.id}`,
                          () => openDebtorDetail(item.id),
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        triggerDoubleRowActivation(
                          reportRowActivationRef,
                          `portfolio-${item.id}`,
                          () => openDebtorDetail(item.id),
                        );
                      }}
                    >
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                        {((portfolio?.meta.page ?? 1) - 1) * (portfolio?.meta.limit ?? SETUP_TABLE_PAGE_SIZE) + index + 1}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <div className="space-y-1">
                          <SetupTablePrimaryText>{item.name}</SetupTablePrimaryText>
                          <div className="flex flex-wrap gap-1.5">
                            <SetupTableCode>{item.debtor_number ?? "-"}</SetupTableCode>
                            {item.identity_number ? <SetupTableCode>{item.identity_number}</SetupTableCode> : null}
                          </div>
                        </div>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupStatusBadge status={customerTypeLabel(item.customer_type, item.customer_type_label, item.slik_status_code)} showIcon={false} />
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTablePrimaryText>{item.branch?.name ?? "-"}</SetupTablePrimaryText>
                        <SetupTableSecondaryText>{item.marketing_user?.name ?? "-"}</SetupTableSecondaryText>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTableNumber>{formatNumber(item.contracts_count)}</SetupTableNumber>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTableNumber>
                          {formatNumber(item.collaterals_count ?? 0)}
                        </SetupTableNumber>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTableMoney>{formatCurrency(item.total_outstanding)}</SetupTableMoney>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupCollectibilityBadge
                          value={item.latest_collectibility_display ?? "-"}
                        />
                      </SetupDataTableCell>
                      <SetupDataTableCell>{periodLabel(item.latest_slik_period_month)}</SetupDataTableCell>
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                    </SetupDataTableRow>
                  );
                })}
                {isLoading ? <SetupDataTableEmptyRow colSpan={10}>Memuat laporan portfolio...</SetupDataTableEmptyRow> : null}
                {!isLoading && (portfolio?.items.length ?? 0) === 0 ? <SetupDataTableEmptyRow colSpan={10}>Belum ada data portfolio sesuai filter.</SetupDataTableEmptyRow> : null}
              </SetupDataTableBody>
            </SetupDataTable>
          ) : null}

          {activeReport === "facilities" ? (
            <SetupDataTable variant="report" density="compact" className="min-w-[1430px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Produk / Akad</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Sektor / Lokasi</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Plafon</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Baki Debet</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>KOL</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Kondisi</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jatuh Tempo</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {(facilities?.items ?? []).map((item, index) => {
                  const snapshot = item.latest_slik_snapshot;

                  return (
                    <SetupDataTableRow
                      key={item.id}
                      className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                        item.debtor_id ? "cursor-pointer hover:bg-[#157ec3]/5" : ""
                      }`}
                      role={item.debtor_id ? "button" : undefined}
                      tabIndex={item.debtor_id ? 0 : undefined}
                      title={item.debtor_id ? "Klik dua kali untuk melihat detail debitur" : undefined}
                      onClick={
                        item.debtor_id
                          ? () =>
                              handleDoubleRowClick(
                                reportRowActivationRef,
                                `facility-${item.id}`,
                                () => openDebtorDetail(item.debtor_id),
                              )
                          : undefined
                      }
                      onDoubleClick={
                        item.debtor_id
                          ? () =>
                              triggerDoubleRowActivation(
                                reportRowActivationRef,
                                `facility-${item.id}`,
                                () => openDebtorDetail(item.debtor_id),
                              )
                          : undefined
                      }
                      onKeyDown={
                        item.debtor_id
                          ? (event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              triggerDoubleRowActivation(
                                reportRowActivationRef,
                                `facility-${item.id}`,
                                () => openDebtorDetail(item.debtor_id),
                              );
                            }
                          : undefined
                      }
                    >
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                        {((facilities?.meta.page ?? 1) - 1) * (facilities?.meta.limit ?? SETUP_TABLE_PAGE_SIZE) + index + 1}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTablePrimaryText>{item.debtor?.name ?? "-"}</SetupTablePrimaryText>
                        <SetupTableSecondaryText>{item.debtor?.debtor_number ?? "-"}</SetupTableSecondaryText>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <div className="space-y-1">
                          <SetupTableCode>{snapshot?.facility_number ?? "-"}</SetupTableCode>
                          <SetupTableSecondaryText>
                            Kontrak: {item.no_kontrak ?? "-"}
                          </SetupTableSecondaryText>
                        </div>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTablePrimaryText>{snapshot?.credit_type_display ?? item.product?.name ?? "-"}</SetupTablePrimaryText>
                        <SetupTableSecondaryText>{snapshot?.financing_scheme_display ?? item.akad_type?.name ?? "-"}</SetupTableSecondaryText>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTablePrimaryText>{snapshot?.economic_sector_display ?? "-"}</SetupTablePrimaryText>
                        <SetupTableSecondaryText>{snapshot?.project_location_city_display ?? "-"}</SetupTableSecondaryText>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTableMoney>
                          {formatCurrency(snapshot?.plafond ?? item.plafond)}
                        </SetupTableMoney>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTableMoney>
                          {formatCurrency(snapshot?.baki_debet ?? item.total_outstanding)}
                        </SetupTableMoney>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupCollectibilityBadge
                          value={
                            snapshot?.collectibility_display ??
                            collectibilityLabel(item.latest_collectibility) ??
                            "-"
                          }
                        />
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupStatusBadge
                          status={snapshot?.condition_display ?? statusLabel(item.status)}
                          showIcon={false}
                        />
                      </SetupDataTableCell>
                      <SetupDataTableCell>{formatDateOnly(snapshot?.due_date ?? item.tanggal_jatuh_tempo)}</SetupDataTableCell>
                    </SetupDataTableRow>
                  );
                })}
                {isLoading ? <SetupDataTableEmptyRow colSpan={10}>Memuat laporan fasilitas...</SetupDataTableEmptyRow> : null}
                {!isLoading && (facilities?.items.length ?? 0) === 0 ? <SetupDataTableEmptyRow colSpan={10}>Belum ada data fasilitas sesuai filter.</SetupDataTableEmptyRow> : null}
              </SetupDataTableBody>
            </SetupDataTable>
          ) : null}

          {activeReport === "collaterals" ? (
            <SetupDataTable variant="report" density="compact" className="min-w-[1390px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>No Agunan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis Agunan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Pengikatan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nilai Pasar</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nilai Appraisal</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Lokasi</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Status Link</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {(collaterals?.items ?? []).map((item, index) => {
                  const debtorId = item.debtor_id ?? item.contract?.debtor_id;

                  return (
                    <SetupDataTableRow
                      key={item.id}
                      className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                        debtorId ? "cursor-pointer hover:bg-[#157ec3]/5" : ""
                      }`}
                      role={debtorId ? "button" : undefined}
                      tabIndex={debtorId ? 0 : undefined}
                      title={debtorId ? "Klik dua kali untuk melihat detail debitur" : undefined}
                      onClick={
                        debtorId
                          ? () =>
                              handleDoubleRowClick(
                                reportRowActivationRef,
                                `collateral-${item.id}`,
                                () => openDebtorDetail(debtorId),
                              )
                          : undefined
                      }
                      onDoubleClick={
                        debtorId
                          ? () =>
                              triggerDoubleRowActivation(
                                reportRowActivationRef,
                                `collateral-${item.id}`,
                                () => openDebtorDetail(debtorId),
                              )
                          : undefined
                      }
                      onKeyDown={
                        debtorId
                          ? (event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              triggerDoubleRowActivation(
                                reportRowActivationRef,
                                `collateral-${item.id}`,
                                () => openDebtorDetail(debtorId),
                              );
                            }
                          : undefined
                      }
                    >
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                        {((collaterals?.meta.page ?? 1) - 1) * (collaterals?.meta.limit ?? SETUP_TABLE_PAGE_SIZE) + index + 1}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTablePrimaryText>{item.debtor?.name ?? "-"}</SetupTablePrimaryText>
                        <SetupTableSecondaryText>{item.debtor?.debtor_number ?? "-"}</SetupTableSecondaryText>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <div className="space-y-1">
                          <SetupTableCode>{item.facility_number ?? "-"}</SetupTableCode>
                          <SetupTableSecondaryText>
                            Kontrak: {item.contract?.no_kontrak ?? "-"}
                          </SetupTableSecondaryText>
                        </div>
                      </SetupDataTableCell>
                      <SetupDataTableCell><SetupTableCode>{item.collateral_number}</SetupTableCode></SetupDataTableCell>
                      <SetupDataTableCell>{item.collateral_type_display ?? item.collateral_type ?? "-"}</SetupDataTableCell>
                      <SetupDataTableCell>{item.binding_type_display ?? item.binding_type_code ?? "-"}</SetupDataTableCell>
                      <SetupDataTableCell><SetupTableMoney>{formatCurrency(item.market_value)}</SetupTableMoney></SetupDataTableCell>
                      <SetupDataTableCell><SetupTableMoney>{formatCurrency(item.appraisal_value)}</SetupTableMoney></SetupDataTableCell>
                      <SetupDataTableCell>{item.location_city_display ?? item.location_city_code ?? "-"}</SetupDataTableCell>
                      <SetupDataTableCell><SetupStatusBadge status={debtorId ? "Terhubung" : "Belum Terhubung"} /></SetupDataTableCell>
                    </SetupDataTableRow>
                  );
                })}
                {isLoading ? <SetupDataTableEmptyRow colSpan={10}>Memuat laporan agunan...</SetupDataTableEmptyRow> : null}
                {!isLoading && (collaterals?.items.length ?? 0) === 0 ? <SetupDataTableEmptyRow colSpan={10}>Belum ada data agunan sesuai filter.</SetupDataTableEmptyRow> : null}
              </SetupDataTableBody>
            </SetupDataTable>
          ) : null}

          {activeReport === "completeness" ? (
            <SetupDataTable variant="report" density="compact" className="min-w-[1230px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis Isu</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Dampak</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Rekomendasi</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {(completeness?.items ?? []).map((item, index) => {
                  const debtor = item.debtor ?? item.contract?.debtor ?? item.collateral?.debtor ?? null;
                  const debtorId = item.debtor_id ?? debtor?.id ?? item.contract?.debtor_id ?? item.collateral?.debtor_id ?? null;
                  const contractNumber =
                    item.contract?.no_kontrak ??
                    item.collateral?.contract?.no_kontrak ??
                    "-";
                  const facilityNumber =
                    item.contract?.latest_slik_snapshot?.facility_number ??
                    item.collateral?.facility_number ??
                    "-";
                  const rowKey = item.id || `${item.issue_type}-${index}`;

                  return (
                    <SetupDataTableRow
                      key={rowKey}
                      className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                        debtorId ? "cursor-pointer hover:bg-[#157ec3]/5" : ""
                      }`}
                      role={debtorId ? "button" : undefined}
                      tabIndex={debtorId ? 0 : undefined}
                      title={debtorId ? "Klik dua kali untuk melihat detail debitur" : undefined}
                      onClick={
                        debtorId
                          ? () =>
                              handleDoubleRowClick(
                                reportRowActivationRef,
                                `completeness-${rowKey}`,
                                () => openDebtorDetail(debtorId),
                              )
                          : undefined
                      }
                      onDoubleClick={
                        debtorId
                          ? () =>
                              triggerDoubleRowActivation(
                                reportRowActivationRef,
                                `completeness-${rowKey}`,
                                () => openDebtorDetail(debtorId),
                              )
                          : undefined
                      }
                      onKeyDown={
                        debtorId
                          ? (event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              triggerDoubleRowActivation(
                                reportRowActivationRef,
                                `completeness-${rowKey}`,
                                () => openDebtorDetail(debtorId),
                              );
                            }
                          : undefined
                      }
                    >
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                        {((completeness?.meta.page ?? 1) - 1) * (completeness?.meta.limit ?? SETUP_TABLE_PAGE_SIZE) + index + 1}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupStatusBadge
                          status={item.issue_label}
                          tone={item.severity === "high" ? "red" : "amber"}
                          showIcon={false}
                        />
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupTablePrimaryText>{debtor?.name ?? "-"}</SetupTablePrimaryText>
                        <SetupTableSecondaryText>{debtor?.debtor_number ?? "-"}</SetupTableSecondaryText>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <div className="space-y-1">
                          <SetupTableCode>{facilityNumber}</SetupTableCode>
                          <SetupTableSecondaryText>
                            Kontrak: {contractNumber}
                          </SetupTableSecondaryText>
                        </div>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {item.collateral?.collateral_number ? <SetupTableCode>{item.collateral.collateral_number}</SetupTableCode> : "-"}
                      </SetupDataTableCell>
                      <SetupDataTableCell>{periodLabel(item.period_month)}</SetupDataTableCell>
                      <SetupDataTableCell>
                        <span className="line-clamp-2 text-sm text-slate-600" title={item.impact}>
                          {item.impact}
                        </span>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <span className="line-clamp-2 text-sm text-slate-600" title={item.recommendation}>
                          {item.recommendation}
                        </span>
                      </SetupDataTableCell>
                    </SetupDataTableRow>
                  );
                })}
                {isLoading ? <SetupDataTableEmptyRow colSpan={8}>Memuat laporan kelengkapan SLIK...</SetupDataTableEmptyRow> : null}
                {!isLoading && (completeness?.items.length ?? 0) === 0 ? <SetupDataTableEmptyRow colSpan={8}>Belum ada isu kelengkapan sesuai filter.</SetupDataTableEmptyRow> : null}
              </SetupDataTableBody>
            </SetupDataTable>
          ) : null}
        </SetupTableCard>

        <div className="border-t border-gray-200 px-5 py-4">
          <Pagination
            page={currentMeta?.page ?? 1}
            lastPage={currentMeta?.lastPage ?? 1}
            total={currentMeta?.total ?? 0}
            limit={currentMeta?.limit ?? SETUP_TABLE_PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </div>
      </section>
    </DashboardPageShell>
  );
}

export function DebtorNpfReportClient() {
  const { showToast } = useAppToast();
  const [data, setData] = useState<DebtorNpfReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        const result = await debiturService.getNpfReport();
        if (!ignore) setData(result);
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat laporan NPF",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Laporan NPF"
        subtitle="Rasio NPF berdasarkan outstanding kontrak aktif."
        icon={<PieChart />}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Rasio NPF"
          value={isLoading ? "-" : `${formatNumber(data?.percentage ?? 0)}%`}
        />
        <StatCard
          label="Outstanding NPF"
          value={isLoading ? "-" : formatCurrency(data?.numerator ?? 0)}
        />
        <StatCard
          label="Total Outstanding"
          value={isLoading ? "-" : formatCurrency(data?.denominator ?? 0)}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className="min-w-[560px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell>Kolektibilitas</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Outstanding</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  NPF
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {(data?.breakdown_per_kol ?? []).map((item) => (
                <SetupDataTableRow key={`${item.level}-${item.code}`}>
                  <SetupDataTableCell>{item.name}</SetupDataTableCell>
                  <SetupDataTableCell>{formatNumber(item.contract_count)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.outstanding)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={item.is_npf ? "Ya" : "Tidak"} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {!isLoading && (data?.breakdown_per_kol.length ?? 0) === 0 ? (
                <SetupDataTableEmptyRow colSpan={4}>
                  Belum ada data kolektibilitas.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
        <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className="min-w-[520px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>NPF</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Total</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Rasio</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {(data?.trend ?? []).map((item) => (
                <SetupDataTableRow key={item.period_month}>
                  <SetupDataTableCell>{item.period_month}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.numerator)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.denominator)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatNumber(item.percentage)}%</SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {!isLoading && (data?.trend.length ?? 0) === 0 ? (
                <SetupDataTableEmptyRow colSpan={4}>
                  Belum ada riwayat NPF.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </div>
      <SetupTableCard variant="report">
        <SetupDataTable variant="report" density="compact" className="min-w-[960px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kolektibilitas</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Outstanding</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Sisa Bulan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                NPF
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {(data?.details ?? []).map((item) => (
              <SetupDataTableRow key={`${item.contract_id}-${item.level ?? "na"}`}>
                <SetupDataTableCell>{item.debtor_name}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract_number}</SetupDataTableCell>
                <SetupDataTableCell>
                  {item.level ? `KOL ${item.level} - ${item.name}` : item.name}
                </SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.outstanding)}</SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.remaining_months)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={item.is_npf ? "Ya" : "Tidak"} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {!isLoading && (data?.details.length ?? 0) === 0 ? (
              <SetupDataTableEmptyRow colSpan={6}>
                Belum ada detail nasabah kolektibilitas.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
    </DashboardPageShell>
  );
}

export function DebtorMarketingReportClient() {
  const { showToast } = useAppToast();
  const [data, setData] = useState<DebtorMarketingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        const result = await debiturService.getMarketingReport();
        if (!ignore) setData(result);
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan aktivitas marketing",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Laporan Aktivitas Marketing"
        subtitle="Ringkasan aktivitas marketing debitur."
        icon={<BarChart3 />}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className="min-w-[560px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell>Jenis Aktivitas</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Total</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {(data?.summary ?? []).map((item) => (
                <SetupDataTableRow key={`${item.activity_kind}-${item.status}`}>
                  <SetupDataTableCell>
                    {activityKindLabel(item.activity_kind)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell>{formatNumber(item.total)}</SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {!isLoading && (data?.summary.length ?? 0) === 0 ? (
                <SetupDataTableEmptyRow colSpan={3}>
                  Belum ada ringkasan aktivitas marketing.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
        <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className="min-w-[720px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {(data?.recent_activities ?? []).map((item) => (
                <SetupDataTableRow key={item.id}>
                  <SetupDataTableCell>{item.debtor?.name ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{activityKindLabel(item.activity_kind)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.activity_date)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {!isLoading && (data?.recent_activities.length ?? 0) === 0 ? (
                <SetupDataTableEmptyRow colSpan={4}>
                  Belum ada aktivitas marketing terbaru.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </div>
    </DashboardPageShell>
  );
}
