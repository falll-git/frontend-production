"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Download,
  Eye,
  FileText,
  ShieldCheck,
  Upload,
  User,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DashboardModal from "@/components/ui/DashboardModal";
import SetupActionMenu, {
  type SetupActionMenuItem,
} from "@/components/ui/SetupActionMenu";
import MultiFileUploadField from "@/components/ui/MultiFileUploadField";
import SetupAddButton from "@/components/ui/SetupAddButton";
import SetupCollectibilityBadge from "@/components/ui/SetupCollectibilityBadge";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupFilePreviewGroup from "@/components/ui/SetupFilePreviewGroup";
import VisitLocationDetails, {
  VisitLocationStatusBadge,
} from "@/components/ui/VisitLocationDetails";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCard,
  SetupTableCode,
  SetupTableSecondaryText,
  SetupTableScroll,
} from "@/components/ui/SetupDataTable";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_PANEL_CLASS,
} from "@/components/ui/setupPageStyles";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { formatDateOnly } from "@/lib/utils/date";
import {
  deriveDocumentFileName,
  detectDocumentFileType,
  toPreviewableFileUrl,
  validateDomainUploadFile,
} from "@/lib/utils/file";
import { hasDashboardCapability } from "@/lib/rbac";
import {
  getIdebFacilityFilterLabel,
  IDEB_FACILITY_FILTERS,
  type IdebFacilityFilter,
} from "@/lib/ideb-facility-filter";
import { debiturService } from "@/services/debitur.service";
import {
  createParameterMasterService,
  type ParameterMasterRecord,
} from "@/services/parameter-master.service";
import type {
  DebtorActivityLog,
  DebtorCollateral,
  DebtorContract,
  DebtorDocument,
  DebtorDocumentChecklistStatus,
  DebtorFileMeta,
  DebtorIdebComparison,
  DebtorMarketingTimelineEntry,
  DebtorWarningLetter,
  DebtorWorkflow,
  DebtorWorkflowClaim,
  DebtorWorkflowCollectibility,
  DebtorWorkflowDeposit,
  DebtorWorkflowDepositTransaction,
  DebtorWorkflowIdebUpload,
  DebtorWorkflowLegalProgress,
  DebtorDocumentPayload,
  DebtorWarningLetterPayload,
} from "@/types/debitur.types";

type TabType =
  | "info"
  | "summary"
  | "audit"
  | "ideb"
  | "historis"
  | "dokumen"
  | "agunan"
  | "notaris"
  | "sp"
  | "claim"
  | "titipan";

type TabConfig = {
  id: TabType;
  label: string;
  legal?: boolean;
  permissions?: string[];
};

const DEBTOR_LIST_URL = "/dashboard/informasi-debitur";
const DEBTOR_MASTER_URL = "/dashboard/informasi-debitur/master-debitur";
const collateralTypeService = createParameterMasterService("/collateral-types");
const DOUBLE_ROW_ACTIVATION_DELAY_MS = 420;
const DOUBLE_ROW_ACTIVATION_SUPPRESS_MS = 250;

type DoubleRowActivationState = {
  key: string;
  clickAt: number;
  activatedAt: number;
};

const TABS: TabConfig[] = [
  { id: "info", label: "Data Utama" },
  { id: "summary", label: "Laporan Summary" },
  { id: "audit", label: "Audit Log" },
  {
    id: "ideb",
    label: "Hasil IDEB",
    permissions: [
      "/dashboard/informasi-debitur/admin/upload-ideb",
      "/dashboard/informasi-debitur/laporan-ideb",
    ],
  },
  { id: "historis", label: "Historis Kol" },
  { id: "dokumen", label: "Dokumen" },
  { id: "agunan", label: "Agunan" },
  { id: "notaris", label: "Notaris & KJPP", legal: true },
  {
    id: "sp",
    label: "Surat Peringatan",
    permissions: [DEBTOR_LIST_URL, DEBTOR_MASTER_URL],
  },
  { id: "claim", label: "Asuransi & Klaim", legal: true },
  { id: "titipan", label: "Dana Titipan", legal: true },
];

const TIMELINE_ROW_META: Record<
  string,
  {
    label: string;
    description: string;
    chipClassName: string;
    lineClassName: string;
    emptyClassName: string;
  }
> = {
  "action-plan": {
    label: "Action Plan",
    description: "Rencana tindak lanjut",
    chipClassName: "border-sky-200 bg-sky-50 text-sky-900",
    lineClassName: "bg-sky-100",
    emptyClassName: "text-sky-300",
  },
  "hasil-kunjungan": {
    label: "Hasil Kunjungan",
    description: "Ringkasan hasil lapangan",
    chipClassName: "border-amber-200 bg-amber-50 text-amber-900",
    lineClassName: "bg-amber-100",
    emptyClassName: "text-amber-300",
  },
  "langkah-penanganan": {
    label: "Langkah Penanganan",
    description: "Eksekusi penanganan",
    chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-900",
    lineClassName: "bg-emerald-100",
    emptyClassName: "text-emerald-300",
  },
};

type DebtorDocumentUploadMode = "checklist" | "other";

type DebtorDocumentUploadFormState = {
  contract_id: string;
  document_checklist_id: string;
  document_type: string;
  category: "AWAL" | "LAINNYA";
  description: string;
  file: File | null;
  files: File[];
};

type DebtorWarningLetterUploadFormState = {
  contract_id: string;
  letter_type: string;
  issued_at: string;
  sent_at: string;
  delivery_status: string;
  description: string;
  file: File | null;
  files: File[];
};

const WARNING_LETTER_DELIVERY_STATUS_OPTIONS = [
  { value: "BELUM_DIKIRIM", label: "Belum Dikirim" },
  { value: "DIKIRIM", label: "Dikirim" },
  { value: "DITERIMA", label: "Diterima" },
];

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatOptionalCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatCurrency(value);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

function formatOptionalPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(value))}%`;
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function comparableDisplay(value: string | number | null | undefined) {
  return display(value)
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function hasDisplayValue(value: string | number | null | undefined) {
  const normalized = comparableDisplay(value);
  return normalized !== "" && normalized !== "-";
}

function hasContactValue(value: string | number | null | undefined) {
  const normalized = comparableDisplay(value);
  return normalized !== "" && normalized !== "-" && normalized !== "0";
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

function sameNumberValue(
  first: number | null | undefined,
  second: number | null | undefined,
) {
  if (first === null || first === undefined || second === null || second === undefined) {
    return false;
  }
  return Number(first) === Number(second);
}

function hasNonZeroNumber(value: number | null | undefined) {
  return value !== null && value !== undefined && Number(value) !== 0;
}

function numericValue(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
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

function slikDisplay(
  displayValue: string | number | null | undefined,
  rawValue: string | number | null | undefined,
) {
  if (displayValue === null || displayValue === undefined || displayValue === "") {
    return display(rawValue);
  }
  return String(displayValue);
}

function compactPairDisplay(
  firstLabel: string,
  firstValue: string | number | null | undefined,
  secondLabel: string,
  secondValue: string | number | null | undefined,
  sameLabel: string,
) {
  const firstDisplay = display(firstValue);
  const secondDisplay = display(secondValue);

  if (firstDisplay === "-" && secondDisplay === "-") return "-";
  if (sameDisplayValue(firstDisplay, secondDisplay)) {
    return `${firstDisplay} (${sameLabel})`;
  }

  return [
    firstDisplay !== "-" ? `${firstLabel}: ${firstDisplay}` : null,
    secondDisplay !== "-" ? `${secondLabel}: ${secondDisplay}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function collateralDisplay(collateral: DebtorCollateral | null | undefined) {
  if (!collateral) return "-";
  const type =
    collateral.collateral_type_display ||
    collateral.collateral_type_label ||
    collateral.collateral_type ||
    "Agunan";
  return [
    collateral.collateral_number,
    type,
    collateral.owner_name ? `a.n. ${collateral.owner_name}` : null,
    collateral.proof_number,
  ]
    .filter(Boolean)
    .join(" - ");
}

function getParameterText(record: ParameterMasterRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function createParameterLookup(records: ParameterMasterRecord[]) {
  const entries: Array<[string, string]> = [];

  for (const record of records) {
    const code = getParameterText(record, "code", "kode");
    const name = getParameterText(record, "name", "label", "nama");
    const label = code && name ? `${code} - ${name}` : name || code;
    if (!label) continue;
    if (code) entries.push([code.toUpperCase(), label]);
    if (name) entries.push([name.toUpperCase(), label]);
  }

  return new Map(entries);
}

function parameterDisplay(
  value: string | number | null | undefined,
  lookup: Map<string, string>,
) {
  const raw = display(value);
  if (raw === "-") return raw;
  return lookup.get(raw.toUpperCase()) ?? raw;
}

function statusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (["ACTIVE", "AKTIF", "BERJALAN"].includes(normalized)) return "Aktif";
  if (["INACTIVE", "NONAKTIF"].includes(normalized)) return "Nonaktif";
  if (["CLOSED", "LUNAS", "SELESAI", "DONE"].includes(normalized)) return "Selesai";
  if (["PENDING", "MENUNGGU"].includes(normalized)) return "Menunggu";
  if (["IN_PROGRESS", "PROGRESS", "PROSES", "DALAM_PROSES"].includes(normalized)) {
    return "Dalam Proses";
  }
  if (["CANCELLED", "BATAL"].includes(normalized)) return "Dibatalkan";
  if (["TERUPLOAD", "UPLOADED"].includes(normalized)) return "Terupload";
  if (["GAGAL", "FAILED"].includes(normalized)) return "Gagal";
  if (["PENGAJUAN"].includes(normalized)) return "Pengajuan";
  if (["VERIFIKASI"].includes(normalized)) return "Verifikasi";
  if (["DISETUJUI"].includes(normalized)) return "Disetujui";
  if (["DITOLAK"].includes(normalized)) return "Ditolak";
  if (["CAIR"].includes(normalized)) return "Cair";
  if (["DIKIRIM", "SENT"].includes(normalized)) return "Dikirim";
  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
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

function collectibilityLabel(collectibility: DebtorContract["latest_collectibility"]) {
  if (!collectibility) return null;
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
  return name || rawName || null;
}

function contractNumber(contract: DebtorContract | null | undefined) {
  return contract?.no_kontrak || "-";
}

function facilityNumber(contract: DebtorContract | null | undefined) {
  return contract?.latest_slik_snapshot?.facility_number || "-";
}

function contractFacilityMatchNumber(contract: DebtorContract | null | undefined) {
  return contract?.latest_slik_snapshot?.facility_number || contract?.no_kontrak || "-";
}

function contractProductAkad(contract: DebtorContract | null | undefined) {
  if (!contract) return "-";
  const snapshot = contract.latest_slik_snapshot;
  return (
    [
      snapshot?.credit_type_display ?? contract.product?.name,
      snapshot?.financing_scheme_display ?? contract.akad_type?.name,
    ]
      .filter(Boolean)
      .join(" / ") || "-"
  );
}

function contractCollectibilityDisplay(contract: DebtorContract | null | undefined) {
  if (!contract) return "-";
  const snapshot = contract.latest_slik_snapshot;
  return (
    snapshot?.collectibility_display ??
    snapshot?.collectibility_code ??
    collectibilityLabel(contract.latest_collectibility) ??
    "-"
  );
}

function contractPlafondAmount(contract: DebtorContract | null | undefined) {
  if (!contract) return 0;
  return numericValue(contract.latest_slik_snapshot?.plafond ?? contract.plafond);
}

function contractBakiDebetAmount(contract: DebtorContract | null | undefined) {
  if (!contract) return 0;
  return numericValue(contract.latest_slik_snapshot?.baki_debet ?? contract.outstanding_pokok);
}

function contractPeriodSortValue(contract: DebtorContract | null | undefined) {
  const rawPeriod = contract?.latest_slik_snapshot?.period_month;
  if (!rawPeriod) return 0;
  const normalized = /^\d{4}-\d{2}$/.test(rawPeriod)
    ? `${rawPeriod}-01T00:00:00Z`
    : rawPeriod;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isActiveSlikFacility(contract: DebtorContract | null | undefined) {
  if (!contract) return false;
  const snapshot = contract.latest_slik_snapshot;
  const conditionCode = String(snapshot?.condition_code ?? "").trim();
  const conditionDisplay = comparableDisplay(snapshot?.condition_display);
  const contractStatus = comparableDisplay(contract.status);

  return (
    conditionCode === "00" ||
    conditionDisplay.includes("FASILITAS AKTIF") ||
    contractStatus === "ACTIVE" ||
    contractStatus === "AKTIF"
  );
}

function getPreferredActiveContractId(
  contracts: DebtorContract[],
  fallbackContract: DebtorContract | null | undefined,
) {
  if (!contracts.length) return fallbackContract?.id ?? null;

  const [preferredContract] = contracts
    .map((contract, index) => ({ contract, index }))
    .sort((first, second) => {
      const activeDelta =
        Number(isActiveSlikFacility(second.contract)) -
        Number(isActiveSlikFacility(first.contract));
      if (activeDelta !== 0) return activeDelta;

      const periodDelta =
        contractPeriodSortValue(second.contract) -
        contractPeriodSortValue(first.contract);
      if (periodDelta !== 0) return periodDelta;

      const bakiDebetDelta =
        contractBakiDebetAmount(second.contract) -
        contractBakiDebetAmount(first.contract);
      if (bakiDebetDelta !== 0) return bakiDebetDelta;

      return first.index - second.index;
    });

  return preferredContract?.contract.id ?? fallbackContract?.id ?? null;
}

function resolveMainContract(
  contracts: DebtorContract[],
  selectedContractId: string | null,
  fallbackContract: DebtorContract | null | undefined,
) {
  const preferredContractId = getPreferredActiveContractId(contracts, fallbackContract);
  return (
    contracts.find((contract) => contract.id === selectedContractId) ??
    contracts.find((contract) => contract.id === preferredContractId) ??
    fallbackContract ??
    null
  );
}

function contractOptionLabel(contract: DebtorContract) {
  const snapshot = contract.latest_slik_snapshot;
  const f01FacilityNumber = facilityNumber(contract);
  return [
    `No Kontrak ${contractNumber(contract)}`,
    f01FacilityNumber !== "-" ? `F01 ${f01FacilityNumber}` : null,
    contractProductAkad(contract),
    contractCollectibilityDisplay(contract),
    formatOptionalCurrency(snapshot?.baki_debet ?? contract.outstanding_pokok),
    periodLabel(snapshot?.period_month),
  ]
    .filter((value) => value && value !== "-")
    .join(" | ");
}

function isCollateralLinkedToContract(
  collateral: DebtorCollateral,
  contract: DebtorContract | null | undefined,
) {
  if (!contract) return false;
  const facilityNumber = contractFacilityMatchNumber(contract);
  return (
    collateral.contract_id === contract.id ||
    collateral.contract?.id === contract.id ||
    (facilityNumber !== "-" && collateral.facility_number === facilityNumber)
  );
}

function getContractCollaterals(
  contract: DebtorContract | null | undefined,
  collaterals: DebtorCollateral[],
) {
  if (!contract) return [];
  return collaterals.filter((collateral) =>
    isCollateralLinkedToContract(collateral, contract),
  );
}

function documentTypeLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "AKAD") return "Akad";
  if (normalized === "HAFTSHEET") return "Haftsheet";
  if (normalized === "SURAT_PERINGATAN") return "Surat Peringatan";
  if (normalized === "FORMULIR_ASURANSI") return "Dokumen Lainnya";
  if (normalized === "SURAT_PENGANTAR") return "Surat Pengantar";
  if (normalized === "SKL") return "Keterangan Lunas";
  if (normalized === "SAMSAT") return "Samsat";
  if (normalized === "DOKUMEN_LAINNYA") return "Dokumen Lainnya";
  return display(value);
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

function periodSortValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return Number.NEGATIVE_INFINITY;
  return Number(match[1]) * 100 + Number(match[2]);
}

function sortSlikSnapshotsByPeriod<T extends { period_month: string | null | undefined }>(
  items: T[],
  direction: "desc" | "asc",
) {
  return [...items].sort((left, right) => {
    const leftValue = periodSortValue(left.period_month);
    const rightValue = periodSortValue(right.period_month);
    return direction === "desc" ? rightValue - leftValue : leftValue - rightValue;
  });
}

function hasAnyMenuCapability(
  role: string | null,
  roleId: string | null | undefined,
  paths: string[],
) {
  return paths.some((path) => hasDashboardCapability(path, role, roleId, "read"));
}

function hasDebtorMasterCapability(
  role: string | null,
  roleId: string | null | undefined,
  capability: "create" | "update" | "delete",
) {
  return hasDashboardCapability(DEBTOR_MASTER_URL, role, roleId, capability);
}

function emptyDocumentUploadForm(
  contractId = "",
): DebtorDocumentUploadFormState {
  return {
    contract_id: contractId,
    document_checklist_id: "",
    document_type: "",
    category: "LAINNYA",
    description: "",
    file: null,
    files: [],
  };
}

function documentUploadFormFromChecklist(
  item: DebtorDocumentChecklistStatus,
  contractId = "",
): DebtorDocumentUploadFormState {
  return {
    contract_id: contractId,
    document_checklist_id: item.id,
    document_type: item.document_type || item.name,
    category: normalizeDocumentCategory(item.category, item.is_required),
    description: item.description ?? "",
    file: null,
    files: [],
  };
}

function normalizeDocumentCategory(
  category: string | null | undefined,
  isRequired = false,
): "AWAL" | "LAINNYA" {
  const normalized = String(category ?? "").trim().toUpperCase();
  if (normalized === "AWAL") return "AWAL";
  if (normalized === "LAINNYA") return "LAINNYA";
  return isRequired ? "AWAL" : "LAINNYA";
}

function buildDocumentUploadPayload(
  form: DebtorDocumentUploadFormState,
): DebtorDocumentPayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  if (files.length === 0) throw new Error("File dokumen wajib dipilih");
  return {
    contract_id: form.contract_id || null,
    document_checklist_id: form.document_checklist_id || null,
    document_type: form.document_type.trim(),
    category: form.category,
    description: form.description.trim() || null,
    file: files[0] ?? null,
    files,
  };
}

function validateDocumentUploadForm(form: DebtorDocumentUploadFormState) {
  if (!form.document_type.trim()) return "Jenis dokumen wajib diisi";
  if (form.files.length === 0 && !form.file) return "File dokumen wajib dipilih";
  return null;
}

function emptyWarningLetterUploadForm(
  contractId = "",
): DebtorWarningLetterUploadFormState {
  return {
    contract_id: contractId,
    letter_type: "",
    issued_at: "",
    sent_at: "",
    delivery_status: "BELUM_DIKIRIM",
    description: "",
    file: null,
    files: [],
  };
}

function buildWarningLetterUploadPayload(
  debtorId: string,
  form: DebtorWarningLetterUploadFormState,
): DebtorWarningLetterPayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  if (files.length === 0) throw new Error("File surat peringatan wajib dipilih");
  return {
    debtor_id: debtorId,
    contract_id: form.contract_id || null,
    letter_type: form.letter_type.trim(),
    issued_at: form.issued_at,
    sent_at: form.sent_at || null,
    delivery_status: form.delivery_status,
    description: form.description.trim() || null,
    file: files[0] ?? null,
    files,
  };
}

function validateWarningLetterUploadForm(
  form: DebtorWarningLetterUploadFormState,
  contractCount: number,
) {
  if (contractCount > 0 && !form.contract_id) {
    return "Kontrak surat peringatan wajib dipilih";
  }
  if (!form.letter_type.trim()) return "Jenis surat peringatan wajib diisi";
  if (!form.issued_at) return "Tanggal terbit wajib diisi";
  if (form.files.length === 0 && !form.file) {
    return "File surat peringatan wajib dipilih";
  }
  return null;
}

function InfoItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode | null | undefined;
  wide?: boolean;
}) {
  const displayValue =
    typeof value === "string" || typeof value === "number"
      ? display(value)
      : value || "-";

  return (
    <div
      className={`min-w-0 rounded-lg border border-gray-200 bg-white/80 p-3 shadow-sm sm:p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      <div className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-gray-900">
        {displayValue}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={SETUP_PAGE_PANEL_CLASS}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-600">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <SetupEmptyState
      title={children}
      tone="debitur"
      variant="panel"
      description="Data akan tampil otomatis setelah import atau input operasional terkait debitur ini."
    />
  );
}

function LegalShortcutLink({ href, label }: { href: string; label: string }) {
  return (
    <ProtectedLink
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
      title={label}
    >
      <span>{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </ProtectedLink>
  );
}

function LegalShortcutGroup({
  links,
}: {
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((item) => (
        <LegalShortcutLink key={item.href} href={item.href} label={item.label} />
      ))}
    </div>
  );
}

function FormFieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-2 block text-sm font-medium text-gray-700">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function DebtorDocumentUploadModal({
  isOpen,
  mode,
  form,
  checklist,
  contracts,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  mode: DebtorDocumentUploadMode;
  form: DebtorDocumentUploadFormState;
  checklist: DebtorDocumentChecklistStatus | null;
  contracts: DebtorContract[];
  isSaving: boolean;
  onChange: (patch: Partial<DebtorDocumentUploadFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isChecklistMode = mode === "checklist";

  return (
    <DashboardModal
      isOpen={isOpen}
      title={isChecklistMode ? "Upload Dokumen Wajib" : "Tambah Dokumen Lainnya"}
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="3xl"
      bodyClassName="space-y-4 p-6"
      footer={
        <>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            disabled={isSaving}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--primary"
            disabled={isSaving}
            onClick={onSave}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{isSaving ? "Mengupload..." : "Upload"}</span>
          </button>
        </>
      }
    >
      <SetupFormSection title="Relasi Dokumen">
        <div>
          <FormFieldLabel>Kontrak</FormFieldLabel>
          <SetupSelect
            value={form.contract_id}
            onChange={(event) => onChange({ contract_id: event.target.value })}
          >
            <option value="">Tanpa kontrak khusus</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.no_kontrak}
              </option>
            ))}
          </SetupSelect>
        </div>
        {isChecklistMode ? (
          <>
            <InfoItem label="Checklist" value={checklist?.name ?? form.document_type} />
            <InfoItem label="Jenis Dokumen" value={documentTypeLabel(form.document_type)} />
          </>
        ) : (
          <div>
            <FormFieldLabel required>Jenis Dokumen</FormFieldLabel>
            <SetupTextInput
              value={form.document_type}
              placeholder="Masukkan jenis dokumen"
              onChange={(event) => onChange({ document_type: event.target.value })}
            />
          </div>
        )}
      </SetupFormSection>
      <SetupFormSection title="File dan Keterangan" contentClassName="md:grid-cols-1">
        <div>
          <FormFieldLabel>Keterangan</FormFieldLabel>
          <SetupTextarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
        <MultiFileUploadField
          id="debtor-detail-document-file"
          files={form.files.length > 0 ? form.files : form.file ? [form.file] : []}
          label="File Dokumen"
          validateFile={validateDomainUploadFile}
          helperText="Tambah satu atau beberapa file dokumen untuk debitur ini."
          onChange={(files) => onChange({ files, file: files[0] ?? null })}
        />
      </SetupFormSection>
    </DashboardModal>
  );
}

function FileButton({
  file,
  files,
  label = "Preview",
  onOpen,
}: {
  file: DebtorFileMeta | null | undefined;
  files?: DebtorFileMeta[] | null | undefined;
  label?: string;
  onOpen: (file: DebtorFileMeta) => void;
}) {
  return (
    <SetupFilePreviewGroup
      file={file}
      files={files}
      label={label}
      onOpen={onOpen}
    />
  );
}

function HeaderActions({
  collectibility,
}: {
  collectibility: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <ProtectedLink
        href="/dashboard/informasi-debitur"
        className={SETUP_PAGE_BACK_BUTTON_CLASS}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Kembali</span>
      </ProtectedLink>
      {collectibility ? (
        <SetupCollectibilityBadge
          value={collectibility}
          size="md"
          className="shadow-sm"
        />
      ) : null}
    </div>
  );
}

function DataUtamaTab({
  workflow,
  selectedContractId,
  onSelectContract,
  onOpenAgunanTab,
}: {
  workflow: DebtorWorkflow;
  selectedContractId: string | null;
  onSelectContract: (contractId: string) => void;
  onOpenAgunanTab: () => void;
}) {
  const debtor = workflow.debtor;
  const facilityRowActivationRef = useRef<DoubleRowActivationState | null>(null);
  const mainContract = resolveMainContract(
    workflow.contracts,
    selectedContractId,
    debtor.latest_contract,
  );
  const latestSnapshot = mainContract?.latest_slik_snapshot ?? null;
  const activeContractCollaterals = getContractCollaterals(
    mainContract,
    workflow.collaterals,
  );
  const hasMultipleContracts = workflow.contracts.length > 1;
  const activeContractIndex = workflow.contracts.findIndex(
    (contract) => contract.id === mainContract?.id,
  );
  const activeContractPosition =
    activeContractIndex >= 0 ? activeContractIndex + 1 : null;
  const totalPlafondAllContracts = workflow.contracts.reduce(
    (total, contract) => total + contractPlafondAmount(contract),
    0,
  );
  const totalBakiDebetAllContracts = workflow.contracts.reduce(
    (total, contract) => total + contractBakiDebetAmount(contract),
    0,
  );
  const individualProfile =
    debtor.customer_type === "INDIVIDUAL" ? debtor.individual_profile : null;
  const legalEntityProfile =
    debtor.customer_type === "LEGAL_ENTITY" ? debtor.legal_entity_profile : null;
  const cifType = customerTypeLabel(
    debtor.customer_type,
    debtor.customer_type_label,
    debtor.slik_status_code,
  );
  const segmentSummary = [
    debtor.slik_segment,
    debtor.slik_status_code ? `Status CIF ${debtor.slik_status_code}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
  const hasStructuredCollateralForMainContract = activeContractCollaterals.length > 0;
  const showManualCollateral =
    hasDisplayValue(mainContract?.agunan) && !hasStructuredCollateralForMainContract;
  const showIndividualIdentityName =
    individualProfile &&
    !sameDisplayValue(individualProfile.name_as_identity, debtor.name);
  const showIndividualFullName =
    individualProfile &&
    !sameDisplayValue(individualProfile.full_name, debtor.name) &&
    !sameDisplayValue(individualProfile.full_name, individualProfile.name_as_identity);
  const individualContactItems = [
    hasContactValue(individualProfile?.mobile_phone) &&
    !sameDisplayValue(individualProfile?.mobile_phone, debtor.phone)
      ? `Seluler: ${individualProfile?.mobile_phone}`
      : null,
    hasContactValue(individualProfile?.phone) &&
    !sameDisplayValue(individualProfile?.phone, debtor.phone)
      ? `Telepon: ${individualProfile?.phone}`
      : null,
  ].filter(Boolean);
  const showIndividualContact = individualContactItems.length > 0;
  const individualContact = individualContactItems.join(" / ");
  const showIndividualAddress =
    individualProfile &&
    !sameDisplayValue(individualProfile.address_detail, debtor.address);
  const showLegalBusinessName =
    legalEntityProfile &&
    !sameDisplayValue(legalEntityProfile.business_name, debtor.name);
  const showLegalAddress =
    legalEntityProfile &&
    !sameDisplayValue(legalEntityProfile.address_detail, debtor.address);
  const akadNumberSummary = compactPairDisplay(
    "Awal",
    latestSnapshot?.initial_akad_number,
    "Akhir",
    latestSnapshot?.final_akad_number,
    "awal/akhir sama",
  );
  const akadDateSummary = compactPairDisplay(
    "Awal",
    formatDateOnly(latestSnapshot?.initial_akad_date ?? mainContract?.tanggal_akad),
    "Akhir",
    formatDateOnly(latestSnapshot?.final_akad_date),
    "awal/akhir sama",
  );
  const creditStartSummary = compactPairDisplay(
    "Awal kredit",
    formatDateOnly(latestSnapshot?.credit_start_date),
    "Mulai",
    formatDateOnly(latestSnapshot?.start_date),
    "awal/mulai sama",
  );
  const displayedPlafond = latestSnapshot?.plafond ?? mainContract?.plafond;
  const showInitialPlafond =
    latestSnapshot?.initial_plafond !== null &&
    latestSnapshot?.initial_plafond !== undefined &&
    !sameNumberValue(latestSnapshot.initial_plafond, displayedPlafond);
  const showFinancingComposition =
    Boolean(mainContract) &&
    (hasNonZeroNumber(mainContract?.margin) ||
      !sameNumberValue(mainContract?.pokok, displayedPlafond));
  const financingComposition = mainContract
    ? [
        `Pokok: ${formatCurrency(mainContract.pokok)}`,
        `Margin: ${formatCurrency(mainContract.margin)}`,
      ].join(" / ")
    : "-";
  const hasArrearsData = Boolean(
    latestSnapshot &&
      ((latestSnapshot.principal_arrears !== null &&
        latestSnapshot.principal_arrears !== undefined) ||
        (latestSnapshot.margin_arrears !== null &&
          latestSnapshot.margin_arrears !== undefined)),
  );
  const arrearsSummary = [
    `Pokok: ${formatOptionalCurrency(latestSnapshot?.principal_arrears)}`,
    `Margin: ${formatOptionalCurrency(latestSnapshot?.margin_arrears)}`,
  ].join(" / ");
  const restructuringFrequency = latestSnapshot?.restructuring_frequency;
  const hasRestructuringDetails = Boolean(
    latestSnapshot &&
      ((restructuringFrequency !== null &&
        restructuringFrequency !== undefined &&
        restructuringFrequency > 0) ||
        hasDisplayValue(latestSnapshot.initial_restructuring_date) ||
        hasDisplayValue(latestSnapshot.final_restructuring_date) ||
        hasDisplayValue(latestSnapshot.restructuring_method_display) ||
        hasDisplayValue(latestSnapshot.restructuring_method_code)),
  );
  const restructuringPeriodSummary = compactPairDisplay(
    "Awal",
    formatDateOnly(latestSnapshot?.initial_restructuring_date),
    "Akhir",
    formatDateOnly(latestSnapshot?.final_restructuring_date),
    "awal/akhir sama",
  );
  const restructuringStatusLabel = hasRestructuringDetails ? "Pernah Restruk" : "Tidak Ada";
  const historicalSlikSnapshots = sortSlikSnapshotsByPeriod(
    mainContract?.slik_snapshots ?? [],
    "desc",
  );
  const historicalPeriodOptions = historicalSlikSnapshots
    .map((snapshot) => snapshot.period_month)
    .filter((value): value is string => Boolean(value));
  const [historicalSortDirection, setHistoricalSortDirection] = useState<"desc" | "asc">("desc");
  const [historicalPeriodFilter, setHistoricalPeriodFilter] = useState("ALL");
  const effectiveHistoricalPeriodFilter =
    historicalPeriodFilter === "ALL" || historicalPeriodOptions.includes(historicalPeriodFilter)
      ? historicalPeriodFilter
      : "ALL";
  const filteredHistoricalSlikSnapshots = sortSlikSnapshotsByPeriod(
    (effectiveHistoricalPeriodFilter === "ALL"
      ? historicalSlikSnapshots
      : historicalSlikSnapshots.filter(
          (snapshot) => snapshot.period_month === effectiveHistoricalPeriodFilter,
        )) ?? [],
    historicalSortDirection,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Informasi Nasabah">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem label="No Debitur" value={debtor.debtor_number} />
          <InfoItem label="No Identitas" value={debtor.identity_number} />
          <InfoItem label="Nama Nasabah" value={debtor.name} />
          <InfoItem
            label="Jenis CIF"
            value={cifType}
          />
          <InfoItem label="Segmen SLIK" value={segmentSummary} />
          <InfoItem
            label="Operasi CIF"
            value={slikDisplay(debtor.slik_operation_display, debtor.slik_operation_code)}
          />
          <InfoItem label="Telepon" value={debtor.phone} />
          <InfoItem label="Cabang" value={debtor.branch?.name} />
          <InfoItem
            label="Marketing"
            value={
              debtor.marketing_user?.division_name
                ? `${debtor.marketing_user.name} / ${debtor.marketing_user.division_name}`
                : debtor.marketing_user?.name
            }
          />
          <InfoItem label="Status" value={statusLabel(debtor.status)} />
          <InfoItem label="Jumlah Dokumen" value={debtor.documents_count} />
          <InfoItem label="Alamat" value={debtor.address} wide />
          <InfoItem label="Keterangan" value={debtor.description} wide />
        </div>
      </SectionCard>

      {individualProfile ? (
        <SectionCard title="CIF Perorangan">
          <div className="grid gap-4 md:grid-cols-2">
            {showIndividualIdentityName ? (
              <InfoItem
                label="Nama Sesuai Identitas SLIK"
                value={individualProfile.name_as_identity}
              />
            ) : null}
            {showIndividualFullName ? (
              <InfoItem label="Nama Lengkap SLIK" value={individualProfile.full_name} />
            ) : null}
            <InfoItem
              label="Jenis Identitas"
              value={slikDisplay(
                individualProfile.identity_type_display,
                individualProfile.identity_type_code,
              )}
            />
            <InfoItem
              label="Jenis Kelamin"
              value={slikDisplay(individualProfile.gender_display, individualProfile.gender)}
            />
            <InfoItem
              label="Pendidikan/Gelar"
              value={slikDisplay(
                individualProfile.education_degree_display,
                individualProfile.education_degree_code,
              )}
            />
            <InfoItem
              label="Pekerjaan"
              value={slikDisplay(
                individualProfile.occupation_display,
                individualProfile.occupation_code,
              )}
            />
            <InfoItem
              label="Status Perkawinan"
              value={slikDisplay(
                individualProfile.marital_status_display,
                individualProfile.marital_status_code,
              )}
            />
            <InfoItem label="Tempat Lahir" value={individualProfile.birth_place} />
            <InfoItem
              label="Tanggal Lahir"
              value={formatDateOnly(individualProfile.birth_date)}
            />
            <InfoItem label="NPWP" value={individualProfile.tax_number} />
            {showIndividualContact ? (
              <InfoItem label="Kontak SLIK" value={individualContact} />
            ) : null}
            <InfoItem label="Email" value={individualProfile.email} />
            <InfoItem
              label="DATI II/Kota"
              value={slikDisplay(individualProfile.city_display, individualProfile.city_code)}
            />
            <InfoItem
              label="Negara Domisili"
              value={slikDisplay(
                individualProfile.domicile_country_display,
                individualProfile.domicile_country_code,
              )}
            />
            <InfoItem
              label="Sumber Penghasilan"
              value={slikDisplay(
                individualProfile.income_source_display,
                individualProfile.income_source_code,
              )}
            />
            <InfoItem
              label="Bidang Usaha Tempat Kerja"
              value={slikDisplay(
                individualProfile.workplace_business_field_display,
                individualProfile.workplace_business_field_code,
              )}
            />
            <InfoItem
              label="Golongan Debitur"
              value={slikDisplay(
                individualProfile.debtor_group_display,
                individualProfile.debtor_group_code,
              )}
            />
            <InfoItem
              label="Nama Ibu Kandung"
              value={individualProfile.mother_maiden_name}
            />
            {showIndividualAddress ? (
              <InfoItem
                label="Alamat Sesuai SLIK"
                value={individualProfile.address_detail}
                wide
              />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {legalEntityProfile ? (
        <SectionCard title="CIF Badan Hukum/Yayasan">
          <div className="grid gap-4 md:grid-cols-2">
            {showLegalBusinessName ? (
              <InfoItem
                label="Nama Badan Usaha SLIK"
                value={legalEntityProfile.business_name}
              />
            ) : null}
            <InfoItem
              label="Bentuk Badan Usaha"
              value={slikDisplay(
                legalEntityProfile.legal_form_display,
                legalEntityProfile.legal_form_code,
              )}
            />
            <InfoItem
              label="Tempat Pendirian"
              value={legalEntityProfile.establishment_place}
            />
            <InfoItem
              label="No Akta Pendirian"
              value={legalEntityProfile.establishment_deed_number}
            />
            <InfoItem
              label="Tanggal Akta Pendirian"
              value={formatDateOnly(legalEntityProfile.establishment_deed_date)}
            />
            <InfoItem label="Email" value={legalEntityProfile.email} />
            <InfoItem
              label="Bidang Usaha"
              value={slikDisplay(
                legalEntityProfile.business_field_display,
                legalEntityProfile.business_field_code,
              )}
            />
            <InfoItem
              label="DATI II/Kota"
              value={slikDisplay(legalEntityProfile.city_display, legalEntityProfile.city_code)}
            />
            <InfoItem
              label="Negara Domisili"
              value={slikDisplay(
                legalEntityProfile.domicile_country_display,
                legalEntityProfile.domicile_country_code,
              )}
            />
            <InfoItem
              label="Golongan Debitur"
              value={slikDisplay(
                legalEntityProfile.debtor_group_display,
                legalEntityProfile.debtor_group_code,
              )}
            />
            <InfoItem
              label="Hubungan Dengan Pelapor"
              value={slikDisplay(
                legalEntityProfile.relationship_with_reporter_display,
                legalEntityProfile.relationship_with_reporter_code,
              )}
            />
            <InfoItem
              label="Go Public"
              value={slikDisplay(legalEntityProfile.go_public_display, legalEntityProfile.go_public)}
            />
            <InfoItem
              label="Nama Grup Debitur"
              value={legalEntityProfile.debtor_group_name}
            />
            {showLegalAddress ? (
              <InfoItem
                label="Alamat Badan Usaha SLIK"
                value={legalEntityProfile.address_detail}
                wide
              />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {hasMultipleContracts && mainContract ? (
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                Fasilitas Aktif
              </p>
              <div className="mt-2">
                <SetupSelect
                  value={mainContract.id}
                  onChange={(event) => onSelectContract(event.target.value)}
                >
                  {workflow.contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contractOptionLabel(contract)}
                    </option>
                  ))}
                </SetupSelect>
              </div>
              <p className="mt-2 min-w-0 break-words text-xs font-medium text-gray-500">
                Menampilkan kontrak {contractNumber(mainContract)}
                {facilityNumber(mainContract) !== "-"
                  ? ` / F01 ${facilityNumber(mainContract)}`
                  : ""}
                {activeContractPosition
                  ? ` dari ${formatNumber(workflow.contracts.length)} fasilitas`
                  : ""}
                .
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Nomor Kontrak
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {contractNumber(mainContract)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Nomor Fasilitas F01
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {facilityNumber(mainContract)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Total Fasilitas
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {formatNumber(workflow.contracts.length)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Agunan Terkait
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {formatNumber(activeContractCollaterals.length)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Total Plafon Semua Fasilitas
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {formatCurrency(totalPlafondAllContracts)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Total Baki Debet Semua Fasilitas
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {formatCurrency(totalBakiDebetAllContracts)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Periode SLIK
                </p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {periodLabel(latestSnapshot?.period_month)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  KOL Aktif
                </p>
                <div className="mt-1">
                  <SetupCollectibilityBadge
                    value={contractCollectibilityDisplay(mainContract)}
                  />
                </div>
              </div>
            </div>
          </div>
          {activeContractCollaterals.length > 0 ? (
            <div className="mt-3 flex justify-end">
              <SetupViewButton
                onClick={onOpenAgunanTab}
                label="Lihat Agunan Fasilitas Ini"
                title="Lihat agunan A01 untuk fasilitas aktif"
                className="px-3 py-2 text-xs"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="lg:col-span-2">
        <SectionCard
          title={
            mainContract
              ? `Informasi Pembiayaan - Kontrak ${contractNumber(mainContract)}`
              : "Informasi Pembiayaan"
          }
        >
          {mainContract ? (
            <>
              {hasMultipleContracts ? (
                <p className="mb-4 text-xs font-medium text-gray-500">
                  Detail di bawah mengikuti fasilitas aktif yang dipilih dari daftar F01.
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="No Rekening Fasilitas"
                  value={facilityNumber(mainContract)}
                />
                <InfoItem
                  label="Periode Data"
                  value={periodLabel(latestSnapshot?.period_month ?? null)}
                />
                <InfoItem
                  label="Agunan A01 Terkait"
                  value={`${formatNumber(activeContractCollaterals.length)} agunan A01`}
                />
                <InfoItem
                  label="Produk"
                  value={slikDisplay(
                    latestSnapshot?.credit_type_display,
                    latestSnapshot?.credit_type_code ?? mainContract.product?.name,
                  )}
                />
                <InfoItem
                  label="Jenis Akad"
                  value={slikDisplay(
                    latestSnapshot?.financing_scheme_display,
                    latestSnapshot?.financing_scheme_code ?? mainContract.akad_type?.name,
                  )}
                />
                <InfoItem
                  label="Sektor Ekonomi"
                  value={slikDisplay(
                    latestSnapshot?.economic_sector_display,
                    latestSnapshot?.economic_sector_code,
                  )}
                />
                <InfoItem
                  label="Lokasi Proyek"
                  value={slikDisplay(
                    latestSnapshot?.project_location_city_display,
                    latestSnapshot?.project_location_city_code,
                  )}
                />
                <InfoItem
                  label="Jenis Penggunaan"
                  value={slikDisplay(
                    latestSnapshot?.usage_type_display,
                    latestSnapshot?.usage_type_code,
                  )}
                />
                <InfoItem
                  label="No Akad"
                  value={akadNumberSummary}
                />
                <InfoItem
                  label="Tanggal Akad"
                  value={akadDateSummary}
                />
                <InfoItem
                  label="Awal/Mulai Kredit"
                  value={creditStartSummary}
                />
                <InfoItem
                  label="Jatuh Tempo"
                  value={formatDateOnly(
                    latestSnapshot?.due_date ?? mainContract.tanggal_jatuh_tempo,
                  )}
                />
                <InfoItem
                  label="Tenor"
                  value={mainContract.tenor ? `${mainContract.tenor} Bulan` : "-"}
                />
                {showInitialPlafond ? (
                  <InfoItem
                    label="Plafon Awal"
                    value={formatOptionalCurrency(latestSnapshot?.initial_plafond)}
                  />
                ) : null}
                <InfoItem
                  label="Plafon Fasilitas Terpilih"
                  value={formatOptionalCurrency(latestSnapshot?.plafond ?? mainContract.plafond)}
                />
                {showFinancingComposition ? (
                  <InfoItem label="Pokok / Margin" value={financingComposition} />
                ) : null}
                <InfoItem
                  label="Baki Debet Fasilitas Terpilih"
                  value={formatOptionalCurrency(
                    latestSnapshot?.baki_debet ?? mainContract.outstanding_pokok,
                  )}
                />
                {hasArrearsData ? (
                  <InfoItem label="Tunggakan" value={arrearsSummary} />
                ) : null}
                <InfoItem
                  label="Kolektibilitas"
                  value={
                    latestSnapshot?.collectibility_display ??
                    latestSnapshot?.collectibility_code ??
                    collectibilityLabel(mainContract.latest_collectibility) ??
                    "-"
                  }
                />
                <InfoItem
                  label="DPD"
                  value={
                    latestSnapshot?.days_past_due === null ||
                    latestSnapshot?.days_past_due === undefined
                      ? "-"
                      : `${formatNumber(latestSnapshot.days_past_due)} hari`
                  }
                />
                <InfoItem
                  label="Kondisi"
                  value={slikDisplay(
                    latestSnapshot?.condition_display,
                    latestSnapshot?.condition_code,
                  )}
                />
                <InfoItem
                  label="Tanggal Kondisi"
                  value={formatDateOnly(latestSnapshot?.condition_date)}
                />
                <InfoItem
                  label="Kode Cabang SLIK"
                  value={latestSnapshot?.branch_code}
                />
                <InfoItem
                  label="Operasi Fasilitas F01"
                  value={slikDisplay(
                    latestSnapshot?.operation_display,
                    latestSnapshot?.operation_code,
                  )}
                />
                <InfoItem
                  label="Keterangan F01"
                  value={latestSnapshot?.description ?? mainContract.objek_pembiayaan}
                  wide
                />
                {showManualCollateral ? (
                  <InfoItem label="Agunan Manual" value={mainContract.agunan} wide />
                ) : null}
              </div>

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                      Informasi Restrukturisasi F01
                    </p>
                    <p className="mt-1 text-sm text-amber-900">
                      Ringkasan restrukturisasi mengikuti fasilitas aktif yang dipilih dari daftar
                      F01.
                    </p>
                  </div>
                  <SetupStatusBadge
                    status={restructuringStatusLabel}
                    tone={hasRestructuringDetails ? "amber" : "gray"}
                    showIcon={false}
                  />
                </div>

                {hasRestructuringDetails ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <InfoItem
                      label="Frekuensi Restrukturisasi F01"
                      value={
                        restructuringFrequency === null || restructuringFrequency === undefined
                          ? "-"
                          : `${formatNumber(restructuringFrequency)} kali`
                      }
                    />
                    <InfoItem
                      label="Periode Restrukturisasi F01"
                      value={restructuringPeriodSummary}
                    />
                    <InfoItem
                      label="Cara Restrukturisasi F01"
                      value={slikDisplay(
                        latestSnapshot?.restructuring_method_display,
                        latestSnapshot?.restructuring_method_code,
                      )}
                    />
                    <InfoItem
                      label="Keterangan F01"
                      value={latestSnapshot?.description ?? mainContract.objek_pembiayaan}
                      wide
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-amber-200 bg-white px-4 py-3 text-sm text-gray-600">
                    Tidak ada restrukturisasi pada data F01 periode ini.
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState>Belum ada kontrak pembiayaan untuk debitur ini.</EmptyState>
          )}
        </SectionCard>
      </div>

      <div className="lg:col-span-2">
        <SectionCard title="Daftar Fasilitas F01">
          {workflow.contracts.length > 0 ? (
            <SetupTableScroll>
              <SetupDataTable variant="portfolio" density="compact" className="min-w-[1420px]">
                <SetupDataTableHead>
                  <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                    <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Produk / Akad</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Sektor / Lokasi Proyek</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Plafon</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Baki Debet</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>KOL</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Kondisi</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell>Jatuh Tempo</SetupDataTableHeaderCell>
                    <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                      Aksi
                    </SetupDataTableHeaderCell>
                  </SetupDataTableRow>
                </SetupDataTableHead>
                <SetupDataTableBody>
                  {workflow.contracts.map((contract) => {
                    const snapshot = contract.latest_slik_snapshot;
                    const isActive = contract.id === mainContract?.id;
                    const activateContract = () => onSelectContract(contract.id);
                    const actionItems: SetupActionMenuItem[] = [
                      {
                        key: "select",
                        label: isActive ? "Fasilitas Aktif" : "Pilih Fasilitas",
                        icon: Eye,
                        tone: "blue",
                        onClick: activateContract,
                      },
                    ];

                    return (
                      <SetupDataTableRow
                        key={contract.id}
                        className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                          isActive
                            ? "bg-[#157ec3]/5 ring-1 ring-inset ring-[#157ec3]/20"
                            : "cursor-pointer hover:bg-[#157ec3]/5"
                        }`}
                        role={isActive ? undefined : "button"}
                        tabIndex={isActive ? undefined : 0}
                        title={isActive ? undefined : "Klik dua kali untuk melihat detail fasilitas"}
                        onClick={
                          isActive
                            ? undefined
                            : () =>
                                handleDoubleRowClick(
                                  facilityRowActivationRef,
                                  contract.id,
                                  activateContract,
                                )
                        }
                        onDoubleClick={
                          isActive
                            ? undefined
                            : () =>
                                triggerDoubleRowActivation(
                                  facilityRowActivationRef,
                                  contract.id,
                                  activateContract,
                                )
                        }
                        onKeyDown={
                          isActive
                            ? undefined
                            : (event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                triggerDoubleRowActivation(
                                  facilityRowActivationRef,
                                  contract.id,
                                  activateContract,
                                );
                              }
                        }
                      >
                        <SetupDataTableCell className="font-semibold tabular-nums">
                          <div className="space-y-1">
                            <SetupTableCode>{facilityNumber(contract)}</SetupTableCode>
                            <SetupTableSecondaryText>
                              Kontrak: {contractNumber(contract)}
                            </SetupTableSecondaryText>
                          </div>
                        </SetupDataTableCell>
                        <SetupDataTableCell>
                          {contractProductAkad(contract)}
                        </SetupDataTableCell>
                        <SetupDataTableCell>
                          <div className="space-y-1">
                            <p>
                              {slikDisplay(
                                snapshot?.economic_sector_display,
                                snapshot?.economic_sector_code,
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {slikDisplay(
                                snapshot?.project_location_city_display,
                                snapshot?.project_location_city_code,
                              )}
                            </p>
                          </div>
                        </SetupDataTableCell>
                        <SetupDataTableCell>{periodLabel(snapshot?.period_month)}</SetupDataTableCell>
                        <SetupDataTableCell>
                          {formatOptionalCurrency(snapshot?.plafond ?? contract.plafond)}
                        </SetupDataTableCell>
                        <SetupDataTableCell>
                          {formatOptionalCurrency(snapshot?.baki_debet ?? contract.outstanding_pokok)}
                        </SetupDataTableCell>
                        <SetupDataTableCell>
                          <SetupCollectibilityBadge
                            value={contractCollectibilityDisplay(contract)}
                          />
                        </SetupDataTableCell>
                        <SetupDataTableCell>
                          {slikDisplay(snapshot?.condition_display, snapshot?.condition_code)}
                        </SetupDataTableCell>
                        <SetupDataTableCell>
                          {formatDateOnly(snapshot?.due_date ?? contract.tanggal_jatuh_tempo)}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                          <div
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <SetupActionMenu
                              label="Aksi fasilitas"
                              menuLabel="Aksi fasilitas F01"
                              items={actionItems}
                            />
                          </div>
                        </SetupDataTableCell>
                      </SetupDataTableRow>
                    );
                  })}
                </SetupDataTableBody>
              </SetupDataTable>
            </SetupTableScroll>
          ) : (
            <EmptyState>Belum ada fasilitas F01 untuk debitur ini.</EmptyState>
          )}
        </SectionCard>
      </div>

      <div className="lg:col-span-2">
        <SectionCard title="Historical SLIK F01">
          {mainContract ? (
            <>
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Riwayat audit untuk fasilitas {facilityNumber(mainContract)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Menampilkan histori snapshot F01 kontrak {contractNumber(mainContract)}.
                    Upload bulan terbaru akan menjadi kondisi aktif, sementara bulan sebelumnya tetap
                    tersimpan di bagian ini.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-[220px]">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Filter Bulan / Tahun
                    </p>
                    <SetupSelect
                      value={effectiveHistoricalPeriodFilter}
                      onChange={(event) => setHistoricalPeriodFilter(event.target.value)}
                    >
                      <option value="ALL">Semua Periode</option>
                      {historicalPeriodOptions.map((period) => (
                        <option key={period} value={period}>
                          {periodLabel(period)}
                        </option>
                      ))}
                    </SetupSelect>
                  </div>
                  <div className="min-w-[180px]">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Urutan
                    </p>
                    <SetupSelect
                      value={historicalSortDirection}
                      onChange={(event) =>
                        setHistoricalSortDirection(event.target.value === "asc" ? "asc" : "desc")
                      }
                    >
                      <option value="desc">Terbaru ke Terlama</option>
                      <option value="asc">Terlama ke Terbaru</option>
                    </SetupSelect>
                  </div>
                </div>
              </div>

              {filteredHistoricalSlikSnapshots.length > 0 ? (
                <SetupTableScroll>
                  <SetupDataTable variant="nested" density="compact" className="min-w-[1520px]">
                    <SetupDataTableHead>
                      <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                        <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>No Fasilitas F01</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Plafon</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Baki Debet</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>KOL</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>DPD</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Kondisi</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Jatuh Tempo</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Restrukturisasi</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Keterangan F01</SetupDataTableHeaderCell>
                      </SetupDataTableRow>
                    </SetupDataTableHead>
                    <SetupDataTableBody>
                      {filteredHistoricalSlikSnapshots.map((snapshot) => {
                        const snapshotHasRestructuring = Boolean(
                          (snapshot.restructuring_frequency ?? 0) > 0 ||
                            hasDisplayValue(snapshot.initial_restructuring_date) ||
                            hasDisplayValue(snapshot.final_restructuring_date) ||
                            hasDisplayValue(snapshot.restructuring_method_display) ||
                            hasDisplayValue(snapshot.restructuring_method_code),
                        );

                        return (
                          <SetupDataTableRow
                            key={snapshot.id}
                            className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                          >
                            <SetupDataTableCell>{periodLabel(snapshot.period_month)}</SetupDataTableCell>
                            <SetupDataTableCell className="font-semibold tabular-nums">
                              <div className="space-y-1">
                                <SetupTableCode>{display(snapshot.facility_number)}</SetupTableCode>
                                <SetupTableSecondaryText>
                                  Kontrak: {contractNumber(mainContract)}
                                </SetupTableSecondaryText>
                              </div>
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              {formatOptionalCurrency(snapshot.plafond)}
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              {formatOptionalCurrency(snapshot.baki_debet)}
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              <SetupCollectibilityBadge
                                value={
                                  snapshot.collectibility_display ??
                                  snapshot.collectibility_code ??
                                  "-"
                                }
                              />
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              {snapshot.days_past_due === null || snapshot.days_past_due === undefined
                                ? "-"
                                : `${formatNumber(snapshot.days_past_due)} hari`}
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              {slikDisplay(snapshot.condition_display, snapshot.condition_code)}
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              {formatDateOnly(snapshot.due_date)}
                            </SetupDataTableCell>
                            <SetupDataTableCell>
                              {snapshotHasRestructuring ? (
                                <div className="space-y-1">
                                  <SetupStatusBadge
                                    status="Pernah Restruk"
                                    tone="amber"
                                    showIcon={false}
                                  />
                                  <SetupTableSecondaryText>
                                    Frekuensi:{" "}
                                    {snapshot.restructuring_frequency === null ||
                                    snapshot.restructuring_frequency === undefined
                                      ? "-"
                                      : `${formatNumber(snapshot.restructuring_frequency)} kali`}
                                  </SetupTableSecondaryText>
                                  <SetupTableSecondaryText>
                                    {compactPairDisplay(
                                      "Awal",
                                      formatDateOnly(snapshot.initial_restructuring_date),
                                      "Akhir",
                                      formatDateOnly(snapshot.final_restructuring_date),
                                      "awal/akhir sama",
                                    )}
                                  </SetupTableSecondaryText>
                                </div>
                              ) : (
                                <SetupStatusBadge
                                  status="Tidak Ada"
                                  tone="gray"
                                  showIcon={false}
                                />
                              )}
                            </SetupDataTableCell>
                            <SetupDataTableCell className="max-w-[360px] align-top">
                              <div className="space-y-1">
                                <p
                                  className="line-clamp-2 text-sm text-gray-900"
                                  title={snapshot.description ?? undefined}
                                >
                                  {display(snapshot.description)}
                                </p>
                                {snapshotHasRestructuring ? (
                                  <SetupTableSecondaryText>
                                    {slikDisplay(
                                      snapshot.restructuring_method_display,
                                      snapshot.restructuring_method_code,
                                    )}
                                  </SetupTableSecondaryText>
                                ) : null}
                              </div>
                            </SetupDataTableCell>
                          </SetupDataTableRow>
                        );
                      })}
                    </SetupDataTableBody>
                  </SetupDataTable>
                </SetupTableScroll>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-600">
                  Belum ada historical SLIK F01 untuk fasilitas ini.
                </div>
              )}
            </>
          ) : (
            <EmptyState>Pilih fasilitas terlebih dahulu untuk melihat historical SLIK F01.</EmptyState>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DebtorWarningLetterUploadModal({
  isOpen,
  form,
  contracts,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  form: DebtorWarningLetterUploadFormState;
  contracts: DebtorContract[];
  isSaving: boolean;
  onChange: (patch: Partial<DebtorWarningLetterUploadFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DashboardModal
      isOpen={isOpen}
      title="Upload Surat Peringatan"
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="3xl"
      bodyClassName="space-y-4 p-6"
      footer={
        <>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            disabled={isSaving}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--primary"
            disabled={isSaving}
            onClick={onSave}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{isSaving ? "Mengupload..." : "Upload"}</span>
          </button>
        </>
      }
    >
      <SetupFormSection title="Data Surat" contentClassName="md:grid-cols-2">
        <div>
          <FormFieldLabel required>Jenis Surat Peringatan</FormFieldLabel>
          <SetupTextInput
            value={form.letter_type}
            placeholder="Contoh: SP 1"
            onChange={(event) => onChange({ letter_type: event.target.value })}
          />
        </div>
        <div>
          <FormFieldLabel required={contracts.length > 0}>Kontrak</FormFieldLabel>
          <SetupSelect
            value={form.contract_id}
            onChange={(event) => onChange({ contract_id: event.target.value })}
          >
            <option value="">
              {contracts.length > 0 ? "Pilih kontrak" : "Tanpa kontrak khusus"}
            </option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.no_kontrak}
              </option>
            ))}
          </SetupSelect>
        </div>
        <div>
          <FormFieldLabel required>Tanggal Terbit</FormFieldLabel>
          <SetupTextInput
            type="date"
            value={form.issued_at}
            onChange={(event) => onChange({ issued_at: event.target.value })}
          />
        </div>
        <div>
          <FormFieldLabel>Tanggal Kirim</FormFieldLabel>
          <SetupTextInput
            type="date"
            value={form.sent_at}
            onChange={(event) => onChange({ sent_at: event.target.value })}
          />
        </div>
        <div>
          <FormFieldLabel>Status Pengiriman</FormFieldLabel>
          <SetupSelect
            value={form.delivery_status}
            onChange={(event) => onChange({ delivery_status: event.target.value })}
          >
            {WARNING_LETTER_DELIVERY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SetupSelect>
        </div>
        <div className="md:col-span-2">
          <FormFieldLabel>Keterangan</FormFieldLabel>
          <SetupTextarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
      </SetupFormSection>
      <SetupFormSection title="File Surat" contentClassName="md:grid-cols-1">
        <MultiFileUploadField
          id="debtor-warning-letter-file"
          files={form.files.length > 0 ? form.files : form.file ? [form.file] : []}
          label="File Surat Peringatan"
          validateFile={validateDomainUploadFile}
          helperText="Upload file surat peringatan yang sudah terbit atau sudah dikirim."
          onChange={(files) => onChange({ files, file: files[0] ?? null })}
        />
      </SetupFormSection>
    </DashboardModal>
  );
}

function SummaryTab({
  workflow,
  onOpenFile,
}: {
  workflow: DebtorWorkflow;
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const [selectedEntry, setSelectedEntry] = useState<DebtorMarketingTimelineEntry | null>(null);
  const timeline = workflow.marketing.timeline;
  const rows = timeline.rows.length
    ? timeline.rows
    : [
        {
          id: "action-plan",
          label: "Action Plan",
          description: "Rencana tindak lanjut",
        },
        {
          id: "hasil-kunjungan",
          label: "Hasil Kunjungan",
          description: "Ringkasan hasil lapangan",
        },
        {
          id: "langkah-penanganan",
          label: "Langkah Penanganan",
          description: "Eksekusi penanganan",
        },
      ];
  const dates = timeline.dates;

  const getRowMeta = (rowId: string) => {
    const row = rows.find((item) => item.id === rowId);
    return (
      TIMELINE_ROW_META[rowId] ?? {
        label: row?.label ?? "Aktivitas",
        description: row?.description ?? "Aktivitas marketing",
        chipClassName: "border-slate-200 bg-slate-50 text-slate-900",
        lineClassName: "bg-slate-100",
        emptyClassName: "text-slate-300",
      }
    );
  };

  const entriesByCell = new Map<string, DebtorMarketingTimelineEntry[]>();
  const timelineColumnTemplate = dates
    .map(() => "minmax(16rem, 16rem)")
    .join(" ");

  for (const entry of timeline.entries) {
    if (!entry.date) continue;
    const key = `${entry.row_id}:${entry.date}`;
    entriesByCell.set(key, [...(entriesByCell.get(key) ?? []), entry]);
  }

  const findLinkedLangkah = (entry: DebtorMarketingTimelineEntry) => {
    if (!entry.timeline_group_id) return null;
    return (
      timeline.entries.find(
        (candidate) =>
          candidate.row_id === "langkah-penanganan" &&
          candidate.timeline_group_id === entry.timeline_group_id &&
          candidate.id !== entry.id,
      ) ?? null
    );
  };

  const findLinkedAction = (entry: DebtorMarketingTimelineEntry) => {
    if (!entry.timeline_group_id) return null;
    return (
      timeline.entries.find(
        (candidate) =>
          candidate.row_id === "action-plan" &&
          candidate.timeline_group_id === entry.timeline_group_id &&
          candidate.id !== entry.id,
      ) ?? null
    );
  };

  const renderTimelineCard = (entry: DebtorMarketingTimelineEntry) => {
    const meta = getRowMeta(entry.row_id);
    const linkedLangkah =
      entry.row_id === "action-plan" ? findLinkedLangkah(entry) : null;
    const linkedAction =
      entry.row_id === "langkah-penanganan" ? findLinkedAction(entry) : null;
    const isLatest = entry.date === dates[dates.length - 1];

    return (
      <button
        key={entry.id}
        type="button"
        onClick={() => setSelectedEntry(entry)}
        onDoubleClick={() => setSelectedEntry(entry)}
        title={`${entry.summary} - ${entry.detail}`}
        className={`w-full min-w-0 rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.chipClassName} ${
          isLatest ? "ring-2 ring-[#157ec3]/15 ring-offset-1" : ""
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          {formatDateOnly(entry.date)}
        </p>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-6">
          {entry.summary}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SetupStatusBadge status={statusLabel(entry.status)} />
          {entry.row_id === "hasil-kunjungan" ? (
            <VisitLocationStatusBadge
              latitude={entry.visit_latitude}
              longitude={entry.visit_longitude}
            />
          ) : null}
          {entry.row_id === "action-plan" && linkedLangkah?.date ? (
            <span className="text-xs font-semibold text-sky-700">
              Realisasi {formatDateOnly(linkedLangkah.date)}
            </span>
          ) : null}
          {entry.row_id === "langkah-penanganan" && linkedAction?.date ? (
            <span className="text-xs font-semibold text-emerald-700">
              Terkait {formatDateOnly(linkedAction.date)}
            </span>
          ) : null}
          {entry.target_date ? (
            <span className="text-xs font-semibold text-gray-500">
              Target {formatDateOnly(entry.target_date)}
            </span>
          ) : null}
        </div>
      </button>
    );
  };

  if (timeline.entries.length === 0 || dates.length === 0) {
    return <EmptyState>Belum ada aktivitas marketing untuk debitur ini.</EmptyState>;
  }

  return (
    <>
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Laporan Summary</h2>
          <p className="mt-1 text-sm text-gray-500">
            Timeline progres penanganan debitur dari action plan sampai realisasi terakhir.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[14rem_minmax(0,1fr)] overflow-hidden">
            <div className="border-r border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-white px-5 py-4 shadow-[8px_0_16px_-16px_rgba(15,23,42,0.3)]">
                <p className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Aktivitas
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const meta = getRowMeta(row.id);

                  return (
                    <div
                      key={row.id}
                      className="flex min-h-[188px] items-start bg-white px-5 py-5 shadow-[8px_0_16px_-16px_rgba(15,23,42,0.3)]"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {meta.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-max">
                <div
                  className="grid border-b border-gray-200 bg-gray-50"
                  style={{ gridTemplateColumns: timelineColumnTemplate }}
                >
                  {dates.map((date) => (
                    <div
                      key={date}
                      className="border-r border-gray-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 last:border-r-0"
                    >
                      {formatDateOnly(date)}
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const meta = getRowMeta(row.id);

                    return (
                      <div
                        key={row.id}
                        className="grid min-h-[188px]"
                        style={{ gridTemplateColumns: timelineColumnTemplate }}
                      >
                        {dates.map((date) => {
                          const cellEntries =
                            entriesByCell.get(`${row.id}:${date}`) ?? [];

                          return (
                            <div
                              key={`${row.id}-${date}`}
                              className="relative border-r border-gray-100 bg-white px-5 py-5 last:border-r-0"
                            >
                              <span
                                className={`pointer-events-none absolute inset-x-5 top-1/2 h-px -translate-y-1/2 ${meta.lineClassName}`}
                                aria-hidden="true"
                              />

                              <div className="relative z-10 space-y-3">
                                {cellEntries.length > 0 ? (
                                  cellEntries.map(renderTimelineCard)
                                ) : (
                                  <span
                                    className={`inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-medium ${meta.emptyClassName}`}
                                  >
                                    -
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DashboardModal
        isOpen={selectedEntry !== null}
        title={selectedEntry?.title ?? "Detail Aktivitas"}
        description={
          selectedEntry
            ? `${getRowMeta(selectedEntry.row_id).label} - ${formatDateOnly(selectedEntry.date)}`
            : undefined
        }
        onClose={() => setSelectedEntry(null)}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] overflow-y-auto p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setSelectedEntry(null)}
          >
            Tutup
          </button>
        }
      >
        {selectedEntry ? (
          <div className="space-y-6">
            <section>
              <div className="mb-4 space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Target Aktivitas
                </h3>
                <p className="text-sm leading-6 text-gray-500">
                  Relasi aktivitas marketing terhadap debitur, kontrak, dan status tindak lanjut.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <InfoItem label="Jenis Aktivitas" value={getRowMeta(selectedEntry.row_id).label} />
                <InfoItem
                  label="Status"
                  value={<SetupStatusBadge status={statusLabel(selectedEntry.status)} />}
                />
                <InfoItem label="Dibuat Oleh" value={selectedEntry.created_by} />
                <InfoItem label="Kontrak" value={selectedEntry.contract?.no_kontrak} />
                <InfoItem label="Tanggal Aktivitas" value={formatDateOnly(selectedEntry.date)} />
                <InfoItem label="Target Tanggal" value={formatDateOnly(selectedEntry.target_date)} />
                <InfoItem label="Tipe Aktivitas" value={selectedEntry.activity_type?.name} />
              </div>
            </section>

            <section>
              <div className="mb-4 space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
                  Isi Aktivitas
                </h3>
                <p className="text-sm leading-6 text-gray-500">
                  Ringkasan dan catatan detail aktivitas yang tersimpan di timeline.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="Ringkasan" value={selectedEntry.summary} wide />
                <InfoItem label="Detail" value={selectedEntry.detail} wide />
              </div>
            </section>

            {selectedEntry.row_id === "hasil-kunjungan" ? (
              <section>
                <div className="mb-4 space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Lokasi Kunjungan
                  </h3>
                  <p className="text-sm leading-6 text-gray-500">
                    Alamat manual dan geotag yang direkam saat kunjungan.
                  </p>
                </div>
                <VisitLocationDetails location={selectedEntry} />
              </section>
            ) : null}

            <section>
              <div className="mb-4 space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
                  File Pendukung
                </h3>
                <p className="text-sm leading-6 text-gray-500">
                  Lampiran aktivitas marketing jika ada.
                </p>
              </div>
              <div className="flex justify-start">
                <FileButton file={selectedEntry.file} files={selectedEntry.files} onOpen={onOpenFile} />
              </div>
            </section>
          </div>
        ) : null}
      </DashboardModal>
    </>
  );
}

type IdebRecord = Record<string, unknown>;

function idebRecord(value: unknown): IdebRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as IdebRecord;
}

function idebArray(value: unknown): IdebRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => idebRecord(item))
    .filter((item): item is IdebRecord => item !== null);
}

function idebText(record: IdebRecord | null | undefined, keys: string[]) {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return null;
}

function idebNumber(record: IdebRecord | null | undefined, keys: string[]) {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") continue;

    const normalized = value
      .trim()
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    if (!normalized) continue;

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function idebDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return formatDateOnly(String(value));
}

function idebPeriod(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "-";

  const normalized =
    /^\d{6}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4)}` : text;
  const match = /^(\d{4})-(\d{2})$/.exec(normalized);
  if (!match) return text;

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

function getIdebUploadPeriod(item: DebtorWorkflowIdebUpload) {
  if (item.summary_detail?.period_month) return item.summary_detail.period_month;
  if (item.year && item.month) {
    return `${item.year}-${String(item.month).padStart(2, "0")}`;
  }
  return null;
}

function getIdebSummaryRecord(item: DebtorWorkflowIdebUpload) {
  return idebRecord(item.summary_detail?.summary);
}

function getIdebIdentityRecord(item: DebtorWorkflowIdebUpload) {
  return idebRecord(item.summary_detail?.identity);
}

function getIdebFacilities(item: DebtorWorkflowIdebUpload) {
  return idebArray(item.summary_detail?.facilities);
}

function getIdebMonthlyHistory(item: DebtorWorkflowIdebUpload) {
  return idebArray(item.summary_detail?.monthly_collectibility_history);
}

function getIdebRawHeaderRecord(item: DebtorWorkflowIdebUpload) {
  const resultSummary = idebRecord(item.result_summary);
  const raw = idebRecord(resultSummary?.raw);
  return idebRecord(raw?.header) ?? idebRecord(resultSummary?.header);
}

function getIdebReporterCount(
  summary: IdebRecord | null,
  facilities: IdebRecord[],
) {
  const explicitCount =
    (idebNumber(summary, ["bank_creditor_count"]) ?? 0) +
    (idebNumber(summary, ["bpr_bprs_creditor_count"]) ?? 0) +
    (idebNumber(summary, ["lp_creditor_count"]) ?? 0) +
    (idebNumber(summary, ["other_creditor_count"]) ?? 0);
  if (explicitCount > 0) return explicitCount;

  const reporters = new Set(
    facilities
      .map((facility) =>
        idebText(facility, ["reporter_name", "reporter_code", "ljk", "bank"]),
      )
      .filter(Boolean),
  );
  return reporters.size;
}

function getIdebReporterNames(facilities: IdebRecord[]) {
  const names = new Map<string, string>();

  for (const facility of facilities) {
    const name =
      idebText(facility, ["reporter_name", "reporter_code", "ljk", "bank"]) ?? "-";
    const key = comparableDisplay(name);
    if (key && key !== "-" && !names.has(key)) names.set(key, name);
  }

  return Array.from(names.values());
}

function getIdebTotalPlafond(summary: IdebRecord | null, facilities: IdebRecord[]) {
  return (
    idebNumber(summary, ["total_plafond", "effective_plafond_credit"]) ??
    facilities.reduce(
      (total, facility) =>
        total + (idebNumber(facility, ["plafond", "initial_plafond"]) ?? 0),
      0,
    )
  );
}

function getIdebFacilityOutstanding(facility: IdebRecord) {
  return idebNumber(facility, ["outstanding", "baki_debet", "outstanding_pokok"]) ?? 0;
}

function getIdebFacilityPlafond(facility: IdebRecord) {
  return idebNumber(facility, ["plafond", "initial_plafond", "plafon", "plafon_awal"]) ?? 0;
}

function getIdebFacilityArrears(facility: IdebRecord) {
  return (
    (idebNumber(facility, ["principal_arrears", "tunggakan_pokok"]) ?? 0) +
    (idebNumber(facility, ["interest_arrears", "tunggakan_bunga"]) ?? 0) +
    (idebNumber(facility, ["penalty", "denda"]) ?? 0)
  );
}

function getIdebFacilityDaysPastDue(facility: IdebRecord) {
  const value =
    idebNumber(facility, ["days_past_due", "dpd", "jumlah_hari_tunggakan"]) ?? 0;
  return value > 0 ? value : null;
}

function isIdebPaidOffFacility(facility: IdebRecord) {
  const code = display(idebText(facility, ["condition_code"])).toUpperCase();
  const condition = display(idebText(facility, ["condition", "status"])).toUpperCase();
  return (
    code === "02" ||
    condition === "02" ||
    condition.startsWith("02 ") ||
    condition.includes("LUNAS")
  );
}

function isIdebWriteOffFacility(facility: IdebRecord) {
  const code = display(idebText(facility, ["condition_code"])).toUpperCase();
  const condition = display(idebText(facility, ["condition", "status"])).toUpperCase();
  const compact = condition.replace(/[^A-Z0-9]/g, "");
  return (
    code === "03" ||
    condition === "03" ||
    condition.startsWith("03 ") ||
    compact.includes("HAPUSBUKU") ||
    compact.includes("DIHAPUSBUKUKAN")
  );
}

function getIdebCollectibilityLevel(value: unknown) {
  const text = String(value ?? "").trim();
  const match = /(?:^|\D)([1-5])(?:\D|$)/.exec(text);
  return match ? Number(match[1]) : null;
}

function getIdebFacilityRiskSortValue(facility: IdebRecord) {
  return {
    collectibility: getIdebCollectibilityLevel(getIdebFacilityCollectibility(facility)) ?? 0,
    dpd: getIdebFacilityDaysPastDue(facility) ?? 0,
    arrears: getIdebFacilityArrears(facility),
    outstanding: getIdebFacilityOutstanding(facility),
    plafond: getIdebFacilityPlafond(facility),
  };
}

function sortIdebFacilitiesByRisk(facilities: IdebRecord[]) {
  return [...facilities].sort((left, right) => {
    const leftRisk = getIdebFacilityRiskSortValue(left);
    const rightRisk = getIdebFacilityRiskSortValue(right);
    return (
      rightRisk.collectibility - leftRisk.collectibility ||
      rightRisk.dpd - leftRisk.dpd ||
      rightRisk.arrears - leftRisk.arrears ||
      rightRisk.outstanding - leftRisk.outstanding ||
      rightRisk.plafond - leftRisk.plafond ||
      display(idebText(left, ["reporter_name", "reporter_code"])).localeCompare(
        display(idebText(right, ["reporter_name", "reporter_code"])),
      )
    );
  });
}

function filterIdebFacilities(facilities: IdebRecord[], filter: IdebFacilityFilter) {
  if (filter === "ACTIVE") {
    return sortIdebFacilitiesByRisk(
      facilities.filter(
        (facility) => !isIdebPaidOffFacility(facility) && !isIdebWriteOffFacility(facility),
      ),
    );
  }
  if (filter === "PAID_OFF") return sortIdebFacilitiesByRisk(facilities.filter(isIdebPaidOffFacility));
  if (filter === "PROBLEM") {
    return sortIdebFacilitiesByRisk(
      facilities.filter(
        (facility) =>
          isIdebWriteOffFacility(facility) ||
          getIdebCollectibilityLevel(getIdebFacilityCollectibility(facility)) === 5,
      ),
    );
  }
  if (filter === "ARREARS") {
    return sortIdebFacilitiesByRisk(
      facilities.filter((facility) => getIdebFacilityArrears(facility) > 0),
    );
  }
  return sortIdebFacilitiesByRisk(facilities);
}

function getIdebPriorityFacilities(facilities: IdebRecord[], limit = 10) {
  return sortIdebFacilitiesByRisk(facilities).slice(0, limit);
}

function getIdebWorstCollectibility(
  item: DebtorWorkflowIdebUpload,
  summary: IdebRecord | null,
  facilities: IdebRecord[],
) {
  const explicit =
    item.summary_detail?.current_collectibility ??
    idebText(summary, ["worst_collectibility", "worst_collectibility_code"]);
  const explicitLevel = getIdebCollectibilityLevel(explicit);

  const worstLevel = facilities.reduce<number | null>((current, facility) => {
    const level = getIdebCollectibilityLevel(getIdebFacilityCollectibility(facility));
    if (level === null) return current;
    return current === null ? level : Math.max(current, level);
  }, null);

  if (worstLevel !== null && (explicitLevel === null || worstLevel > explicitLevel)) {
    return worstLevel;
  }

  if (explicit !== null && explicit !== undefined && String(explicit).trim()) {
    return explicit;
  }

  return worstLevel;
}

function getIdebOfficerName(item: DebtorWorkflowIdebUpload) {
  return (
    item.summary_detail?.officer_name ??
    idebText(getIdebRawHeaderRecord(item), [
      "dibuatOleh",
      "officer_name",
      "petugas",
      "created_by_name",
    ])
  );
}

function getIdebSortableTime(item: DebtorWorkflowIdebUpload) {
  const candidates = [
    item.summary_detail?.result_date,
    item.summary_detail?.processed_at,
    item.created_at,
    getIdebUploadPeriod(item),
  ];

  for (const value of candidates) {
    if (!value) continue;
    const timestamp = Date.parse(String(value));
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return 0;
}

function getLatestIdebItem(items: DebtorWorkflowIdebUpload[]) {
  return [...items].sort((first, second) => {
    const byTime = getIdebSortableTime(second) - getIdebSortableTime(first);
    if (byTime !== 0) return byTime;
    return String(second.created_at ?? "").localeCompare(String(first.created_at ?? ""));
  })[0] ?? null;
}

function getIdebResume(item: DebtorWorkflowIdebUpload) {
  const summary = getIdebSummaryRecord(item);
  const reportSummary = item.report_summary;
  const facilities = sortIdebFacilitiesByRisk(getIdebFacilities(item));
  const activeFacilities = facilities.filter(
    (facility) => !isIdebPaidOffFacility(facility) && !isIdebWriteOffFacility(facility),
  );
  const paidOffFacilities = facilities.filter(isIdebPaidOffFacility);
  const writeOffFacilities = facilities.filter(isIdebWriteOffFacility);
  const calculatedActiveOutstanding = activeFacilities.reduce(
    (total, facility) => total + getIdebFacilityOutstanding(facility),
    0,
  );
  const calculatedPaidOffPlafond = paidOffFacilities.reduce(
    (total, facility) => total + getIdebFacilityPlafond(facility),
    0,
  );
  const calculatedWriteOffOutstanding = writeOffFacilities.reduce(
    (total, facility) => total + getIdebFacilityOutstanding(facility),
    0,
  );
  const calculatedWriteOffPlafond = writeOffFacilities.reduce(
    (total, facility) => total + getIdebFacilityPlafond(facility),
    0,
  );
  const calculatedWriteOffArrears = writeOffFacilities.reduce(
    (total, facility) => total + getIdebFacilityArrears(facility),
    0,
  );
  const calculatedTotalArrears = facilities.reduce(
    (total, facility) => total + getIdebFacilityArrears(facility),
    0,
  );
  const calculatedActiveArrears = activeFacilities.reduce(
    (total, facility) => total + getIdebFacilityArrears(facility),
    0,
  );
  const calculatedWorstDaysPastDue = facilities.reduce<number | null>((current, facility) => {
    const value = getIdebFacilityDaysPastDue(facility);
    if (value === null || value === undefined) return current;
    return current === null ? value : Math.max(current, value);
  }, null);
  const canonicalReporterNames = reportSummary?.priority_reporters
    .map((reporter) => reporter.reporter_name)
    .filter(Boolean) ?? [];
  const reporterNames = canonicalReporterNames.length > 0
    ? canonicalReporterNames
    : getIdebReporterNames(facilities);
  const activeFacilitySummaries = reportSummary?.priority_reporters?.length
    ? reportSummary.priority_reporters
        .filter((reporter) => reporter.active_facility_count > 0)
        .map((reporter) => ({
          key: reporter.key,
          reporter: reporter.reporter_name,
          outstanding: reporter.active_outstanding,
          collectibility: reporter.active_worst_collectibility,
        }))
    : getIdebPriorityFacilities(activeFacilities, 10).map((facility) => {
        const reporter = idebText(facility, ["reporter_name", "reporter_code"]) ?? "-";
        const outstanding = getIdebFacilityOutstanding(facility);
        const kol = getIdebFacilityCollectibility(facility);
        return {
          key: `${reporter}-${getIdebFacilityAccount(facility)}-${kol}`,
          reporter,
          outstanding,
          collectibility: kol,
        };
      });

  return {
    summary,
    facilities,
    activeFacilities,
    paidOffFacilities,
    writeOffFacilities,
    activeFacilitiesCount: reportSummary?.active_facilities_count ?? activeFacilities.length,
    paidOffFacilitiesCount: reportSummary?.paid_off_facilities_count ?? paidOffFacilities.length,
    writeOffFacilitiesCount: reportSummary?.write_off_facilities_count ?? writeOffFacilities.length,
    activeOutstanding: reportSummary?.active_outstanding ?? calculatedActiveOutstanding,
    paidOffPlafond: reportSummary?.paid_off_plafond ?? calculatedPaidOffPlafond,
    writeOffOutstanding:
      reportSummary?.write_off_outstanding ?? calculatedWriteOffOutstanding,
    writeOffPlafond: reportSummary?.write_off_plafond ?? calculatedWriteOffPlafond,
    writeOffArrears: reportSummary?.write_off_arrears ?? calculatedWriteOffArrears,
    totalPlafond:
      reportSummary?.total_plafond ?? getIdebTotalPlafond(summary, facilities),
    totalArrears: reportSummary?.total_arrears ?? calculatedTotalArrears,
    activeArrears: reportSummary?.active_arrears ?? calculatedActiveArrears,
    worstDaysPastDue:
      reportSummary?.highest_days_past_due ?? calculatedWorstDaysPastDue,
    reporterCount:
      reportSummary?.reporter_count ?? getIdebReporterCount(summary, facilities),
    reporterNames,
    worstCollectibility:
      reportSummary?.worst_collectibility ??
      getIdebWorstCollectibility(item, summary, facilities),
    activeWorstCollectibility: reportSummary?.active_worst_collectibility ?? null,
    officerName: getIdebOfficerName(item),
    activeFacilitySummaries,
  };
}

function getIdebFacilityCollectibility(facility: IdebRecord) {
  return (
    idebText(facility, ["collectibility", "collectibility_code", "kol"]) ?? "-"
  );
}

function getIdebFacilityAccount(facility: IdebRecord) {
  return (
    idebText(facility, ["account_number", "no_rekening", "noRekening"]) ?? "-"
  );
}

function getIdebFacilityCreditDisplay(facility: IdebRecord) {
  const creditType = idebText(facility, ["credit_type", "credit_type_code"]);
  const scheme = idebText(facility, ["financing_scheme", "financing_scheme_code"]);
  return [creditType, scheme].filter(Boolean).join(" / ") || "-";
}

function getIdebFacilityAkadDate(facility: IdebRecord) {
  return (
    idebDate(
      idebText(facility, [
        "final_akad_date",
        "initial_akad_date",
        "akad_date",
        "tanggal_akad",
      ]),
    ) || "-"
  );
}

function getIdebFacilityCollateralSummary(facility: IdebRecord) {
  const collaterals = idebArray(facility.collaterals);
  if (collaterals.length > 0) {
    const visible = collaterals
      .slice(0, 3)
      .map((record) => {
        const type = idebText(record, [
          "jenisAgunanKet",
          "jenis_agunan",
          "jenisAgunan",
          "collateral_type",
          "jenis",
          "type",
          "description",
          "keterangan",
          "agunanKet",
        ]);
        const proof = idebText(record, [
          "buktiKepemilikan",
          "bukti_kepemilikan",
          "ownership_proof",
          "proof_number",
        ]);
        return [type, proof].filter(Boolean).join(" - ");
      })
      .filter(Boolean)
      .join("; ");
    const remainder = collaterals.length - 3;
    return `${visible || "-"}${remainder > 0 ? `; +${remainder} agunan lainnya` : ""}`;
  }

  return display(
    idebText(facility, [
      "collateral_summary",
      "collateral",
      "jaminan",
      "agunan",
      "guarantee",
    ]),
  );
}

function getIdebFacilitiesWorstCollectibility(facilities: IdebRecord[]) {
  return facilities.reduce<string | number | null>((current, facility) => {
    const value = getIdebFacilityCollectibility(facility);
    const level = getIdebCollectibilityLevel(value);
    const currentLevel = getIdebCollectibilityLevel(current);
    if (level === null) return current;
    return currentLevel === null || level > currentLevel ? value : current;
  }, null);
}

function getIdebFacilitiesCollateralCount(facilities: IdebRecord[]) {
  return facilities.reduce(
    (total, facility) => total + idebArray(facility.collaterals).length,
    0,
  );
}

function getIdebFacilityRowsWithNested(
  facilities: IdebRecord[],
  key: "collaterals" | "guarantors",
) {
  return facilities.flatMap((facility) =>
    idebArray(facility[key]).map((record) => ({ facility, record })),
  );
}

function IdebMetricCard({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold leading-6 text-gray-900">
        {children}
      </div>
      {hint ? <p className="mt-1 text-xs leading-5 text-gray-500">{hint}</p> : null}
    </div>
  );
}

function IdebModalInfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode | null | undefined;
}) {
  const displayValue =
    typeof value === "string" || typeof value === "number"
      ? display(value)
      : value || "-";

  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold leading-6 text-slate-900">
        {displayValue}
      </div>
    </div>
  );
}

function IdebModalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function IdebCreditMetricCard({
  label,
  children,
  hint,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "blue";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-600"
          : tone === "blue"
            ? "text-blue-700"
            : "text-slate-900";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className={`mt-3 text-2xl font-bold ${valueClass}`}>
        {children}
      </div>
      {hint ? <div className="mt-2 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </div>
  );
}

function idebKolMetricTone(value: unknown): "default" | "success" | "warning" | "danger" {
  const level = getIdebCollectibilityLevel(value);
  if (level === 1 || level === 2) return "success";
  if (level === 3 || level === 4) return "warning";
  if (level === 5) return "danger";
  return "default";
}

function idebReporterSummaryText(reporterNames: string[], reporterCount: number) {
  const visibleReporters = reporterNames.slice(0, 10);
  if (visibleReporters.length === 0) return "-";
  const extraCount = Math.max(reporterCount - visibleReporters.length, 0);
  return `${visibleReporters.map((name, index) => `${index + 1}) ${name}`).join("  ")}${
    extraCount > 0 ? `  +${formatNumber(extraCount)} lembaga lainnya` : ""
  }`;
}

function IdebReporterBreakdown({ resume }: { resume: ReturnType<typeof getIdebResume> }) {
  const reporterSummary = idebReporterSummaryText(
    resume.reporterNames,
    resume.reporterCount,
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <span className="font-semibold text-slate-900">
        Jumlah Lembaga Pembuat Pelaporan/Kreditur:
      </span>{" "}
      {resume.reporterCount > 0 ? (
        <>
          {formatNumber(resume.reporterCount)} lembaga
          <span className="mx-2 text-slate-300">|</span>
        </>
      ) : null}
      {reporterSummary}
    </div>
  );
}

function IdebCreditPositionTable({
  facilities,
  facilityFilter,
  onFacilityFilterChange,
}: {
  facilities: IdebRecord[];
  facilityFilter: IdebFacilityFilter;
  onFacilityFilterChange: (value: IdebFacilityFilter) => void;
}) {
  const visibleFacilities = facilities.slice(0, 200);
  const totalPlafond = facilities.reduce(
    (total, facility) => total + getIdebFacilityPlafond(facility),
    0,
  );
  const totalOutstanding = facilities.reduce(
    (total, facility) => total + getIdebFacilityOutstanding(facility),
    0,
  );
  const totalArrears = facilities.reduce(
    (total, facility) => total + getIdebFacilityArrears(facility),
    0,
  );
  const worstCollectibility = getIdebFacilitiesWorstCollectibility(facilities);
  const highestDaysPastDue = facilities.reduce(
    (highest, facility) => Math.max(highest, getIdebFacilityDaysPastDue(facility) ?? 0),
    0,
  );
  const collateralCount = getIdebFacilitiesCollateralCount(facilities);
  const filterLabel = getIdebFacilityFilterLabel(facilityFilter);

  return (
    <IdebModalSection title="Ringkasan Posisi Fasilitas Kredit">
      <div className="mb-3 flex flex-wrap gap-2">
        {IDEB_FACILITY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              facilityFilter === filter.value
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => onFacilityFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm font-semibold leading-6 text-slate-500">
        Daftar diurutkan dari risiko tertinggi berdasarkan KOL, DPD, tunggakan,
        dan baki debet. Filter aktif juga digunakan pada bagian posisi fasilitas
        di PDF; bagian laporan lainnya tetap menampilkan data lengkap.
      </p>
      <SetupTableCard variant="nested">
        <SetupDataTable variant="nested" density="compact" className="min-w-[1120px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell>Pelapor</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Kredit / Pembiayaan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal Akad</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Plafon
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Baki Debet
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                KOL
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                DPD
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Tunggakan
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jaminan / Agunan</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {visibleFacilities.map((facility, index) => {
              const reporter = idebText(facility, ["reporter_name", "reporter_code"]) ?? "-";
              const branch = idebText(facility, ["branch_name", "branch_code"]);
              const accountNumber = getIdebFacilityAccount(facility);
              const daysPastDue = getIdebFacilityDaysPastDue(facility);

              return (
                <SetupDataTableRow
                  key={`${accountNumber}-${index}`}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <p className="line-clamp-2 font-semibold text-slate-900">{reporter}</p>
                    <p className="mt-1 text-xs text-slate-500">{display(branch)}</p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <p className="line-clamp-2">
                      {getIdebFacilityCreditDisplay(facility)}
                    </p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    {getIdebFacilityAkadDate(facility)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(getIdebFacilityPlafond(facility))}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(getIdebFacilityOutstanding(facility))}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupCollectibilityBadge
                      value={getIdebFacilityCollectibility(facility)}
                      wrap
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    {daysPastDue === null ? "-" : `${formatNumber(daysPastDue)} hari`}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(getIdebFacilityArrears(facility))}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <p className="line-clamp-2">
                      {getIdebFacilityCollateralSummary(facility)}
                    </p>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              );
            })}
            {facilities.length > 0 ? (
              <SetupDataTableRow className="bg-slate-100 font-bold text-slate-900">
                <SetupDataTableCell colSpan={3} className={SETUP_PAGE_MODERN_CELL_CLASS}>
                  {facilityFilter === "ALL" ? "Total keseluruhan" : `Total filter ${filterLabel}`}
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {formatCurrency(totalPlafond)}
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {formatCurrency(totalOutstanding)}
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupCollectibilityBadge value={worstCollectibility} wrap />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  {highestDaysPastDue > 0
                    ? `${formatNumber(highestDaysPastDue)} hari`
                    : "-"}
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {formatCurrency(totalArrears)}
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                  {collateralCount > 0
                    ? `${formatNumber(collateralCount)} agunan`
                    : "-"}
                </SetupDataTableCell>
              </SetupDataTableRow>
            ) : (
              <SetupDataTableEmptyRow colSpan={9}>
                Belum ada fasilitas IDEB pada filter ini.
              </SetupDataTableEmptyRow>
            )}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
      {facilities.length > 200 ? (
        <p className="mt-2 text-xs text-slate-500">
          Menampilkan 200 baris pertama dari {formatNumber(facilities.length)} fasilitas.
          Gunakan filter untuk mempersempit tampilan.
        </p>
      ) : null}
    </IdebModalSection>
  );
}

function IdebCreditReviewSummary({ item }: { item: DebtorWorkflowIdebUpload }) {
  const resume = getIdebResume(item);
  const profileFields = getIdebProfileFields(item);

  return (
    <div className="space-y-5">
      <IdebModalSection title="Profil Pokok Debitur">
        <div className="grid gap-3 md:grid-cols-2">
          {profileFields.map((field) => (
            <IdebModalInfoItem
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </div>
      </IdebModalSection>

      <IdebModalSection title="Resume Hasil IDEB">
        <div className="grid gap-3 md:grid-cols-2">
          <IdebModalInfoItem
            label="Tanggal Pengecekan IDEB"
            value={idebDate(item.summary_detail?.result_date ?? item.summary_detail?.processed_at)}
          />
          <IdebModalInfoItem label="Petugas IDEB" value={resume.officerName} />
          <IdebModalInfoItem label="Diunggah Oleh" value={item.uploader?.name} />
          <IdebModalInfoItem
            label="Jumlah Lembaga / PJK"
            value={formatNumber(resume.reporterCount)}
          />
          <IdebModalInfoItem
            label="Kualitas Terburuk"
            value={String(resume.worstCollectibility ?? "-")}
          />
          <IdebModalInfoItem
            label="Kualitas Terburuk Aktif"
            value={String(resume.activeWorstCollectibility ?? "-")}
          />
          <IdebModalInfoItem
            label="DPD Tertinggi"
            value={`${formatNumber(resume.worstDaysPastDue ?? 0)} hari`}
          />
          <IdebModalInfoItem
            label="Tunggakan Aktif"
            value={formatCurrency(resume.activeArrears)}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IdebCreditMetricCard
            label="KOL Terburuk"
            tone={idebKolMetricTone(resume.worstCollectibility)}
          >
            <SetupCollectibilityBadge value={resume.worstCollectibility} size="md" wrap />
          </IdebCreditMetricCard>
          <IdebCreditMetricCard
            label="Total Baki Debet Aktif"
            tone="success"
            hint={`${formatNumber(resume.activeFacilitiesCount)} fasilitas aktif`}
          >
            {formatCurrency(resume.activeOutstanding)}
          </IdebCreditMetricCard>
          <IdebCreditMetricCard
            label="Total Plafon Lunas"
            tone="blue"
            hint={`${formatNumber(resume.paidOffFacilitiesCount)} fasilitas lunas`}
          >
            {formatCurrency(resume.paidOffPlafond)}
          </IdebCreditMetricCard>
          <IdebCreditMetricCard
            label="Pembiayaan Hapus Buku"
            tone="danger"
            hint={`${formatNumber(resume.writeOffFacilitiesCount)} fasilitas`}
          >
            {formatCurrency(resume.writeOffOutstanding)}
          </IdebCreditMetricCard>
        </div>

        <div className="mt-4">
          <IdebReporterBreakdown resume={resume} />
        </div>

        {(item.report_summary?.data_quality_warnings.length ?? 0) > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Catatan validasi data</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {item.report_summary?.data_quality_warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </IdebModalSection>
    </div>
  );
}

function getIdebProfileFields(item: DebtorWorkflowIdebUpload) {
  const identity = getIdebIdentityRecord(item);
  const birthInfo = [
    idebText(identity, ["birth_place"]),
    idebDate(idebText(identity, ["birth_date"])),
  ]
    .filter((value) => value && value !== "-")
    .join(" / ");
  const address = [
    idebText(identity, ["address"]),
    idebText(identity, ["village"]),
    idebText(identity, ["district"]),
    idebText(identity, ["city", "city_code"]),
    idebText(identity, ["postal_code"]),
  ]
    .filter(Boolean)
    .join(", ");

  return [
    {
      label: "Nama Lengkap",
      value:
        idebText(identity, ["name"]) ??
        item.summary_detail?.debtor_name ??
        item.debtor?.name,
    },
    {
      label: "Sektor Usaha",
      value: idebText(identity, ["business_field", "business_field_code"]),
    },
    { label: "Tempat / Tanggal Lahir", value: birthInfo || "-" },
    { label: "Alamat Terakhir", value: address || "-" },
    {
      label: "Pekerjaan Utama",
      value: idebText(identity, ["occupation", "occupation_code", "workplace"]),
    },
    {
      label: "Nomor Telp",
      value: idebText(identity, [
        "phone",
        "mobile_phone",
        "telephone",
        "phone_number",
        "nomor_telp",
        "nomorTelp",
      ]),
    },
    {
      label: "NIK",
      value:
        idebText(identity, ["identity_number"]) ??
        item.summary_detail?.identity_number ??
        item.debtor?.identity_number,
    },
    { label: "Jenis Kelamin", value: idebText(identity, ["gender"]) },
  ];
}

function IdebProfileSection({ item }: { item: DebtorWorkflowIdebUpload }) {
  const profileFields = getIdebProfileFields(item);

  return (
    <SectionCard title="Profil Pokok Debitur">
      <div className="grid gap-4 md:grid-cols-2">
        {profileFields.map((field) => (
          <InfoItem key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </SectionCard>
  );
}

function IdebResumeSection({ item }: { item: DebtorWorkflowIdebUpload }) {
  const resume = getIdebResume(item);
  const reporterSummary = idebReporterSummaryText(
    resume.reporterNames,
    resume.reporterCount,
  );

  return (
    <SectionCard title="Resume Hasil IDEB">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IdebMetricCard label="Tanggal IDEB Terakhir">
          {idebDate(item.summary_detail?.result_date ?? item.summary_detail?.processed_at)}
        </IdebMetricCard>
        <IdebMetricCard label="Petugas IDEB">
          {display(resume.officerName)}
        </IdebMetricCard>
        <IdebMetricCard label="Diunggah Oleh">
          {display(item.uploader?.name)}
        </IdebMetricCard>
        <IdebMetricCard label="Jumlah Lembaga / PJK">
          {formatNumber(resume.reporterCount)}
        </IdebMetricCard>
        <IdebMetricCard label="Kualitas Terburuk">
          <SetupCollectibilityBadge
            value={resume.worstCollectibility}
            size="md"
            wrap
          />
        </IdebMetricCard>
        <IdebMetricCard label="Fasilitas Aktif">
          {formatNumber(resume.activeFacilitiesCount)}
        </IdebMetricCard>
        <IdebMetricCard label="Sisa Baki Debet">
          {formatCurrency(resume.activeOutstanding)}
        </IdebMetricCard>
        <IdebMetricCard label="Total Plafon">
          {formatCurrency(resume.totalPlafond)}
        </IdebMetricCard>
        <IdebMetricCard label="Total Tunggakan">
          {formatCurrency(resume.totalArrears)}
        </IdebMetricCard>
        <IdebMetricCard label="Tunggakan Aktif">
          {formatCurrency(resume.activeArrears)}
        </IdebMetricCard>
        <IdebMetricCard label="Kualitas Terburuk Aktif">
          <SetupCollectibilityBadge
            value={resume.activeWorstCollectibility}
            size="md"
            wrap
          />
        </IdebMetricCard>
        <IdebMetricCard label="DPD Tertinggi">
          {resume.worstDaysPastDue === null
            ? "-"
            : `${formatNumber(resume.worstDaysPastDue)} hari`}
        </IdebMetricCard>
      </div>

      {(item.report_summary?.data_quality_warnings.length ?? 0) > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Catatan validasi data</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {item.report_summary?.data_quality_warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            Jumlah Lembaga
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
            {reporterSummary}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            Fasilitas Aktif
          </p>
          {resume.activeFacilitySummaries.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {resume.activeFacilitySummaries.map((facility) => (
                <div
                  key={facility.key}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-gray-900">
                    {facility.reporter}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                    <span>{formatCurrency(facility.outstanding)}</span>
                    <SetupCollectibilityBadge value={facility.collectibility} wrap />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-gray-900">
              Tidak ada fasilitas aktif.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function IdebHistoryMatrix({ history }: { history: IdebRecord[] }) {
  const rows = Array.from(
    history.reduce(
      (map, entry, index) => {
        const periodValue = idebText(entry, [
          "period_month",
          "period",
          "month_label",
          "label",
        ]);
        const monthIndex =
          idebNumber(entry, ["month_index", "monthIndex"]) ?? 0;
        const period =
          periodValue ||
          (monthIndex > 0
            ? `Bulan ${formatNumber(monthIndex)}`
            : `Periode ${index + 1}`);
        const collectibility =
          idebText(entry, ["collectibility", "collectibility_code", "kol"]) ?? "-";
        const daysPastDue =
          idebNumber(entry, ["days_past_due", "dpd", "jumlah_hari_tunggakan"]) ?? 0;
        const sourceCount = Math.max(
          1,
          idebNumber(entry, ["source_count", "facility_count", "reporter_count"]) ?? 0,
        );
        const rank = getIdebCollectibilityLevel(collectibility) ?? 0;
        const key =
          periodValue ||
          (monthIndex > 0
            ? `INDEX:${String(monthIndex).padStart(2, "0")}`
            : `ROW:${index + 1}`);
        const current = map.get(key);
        const order = periodValue && /^\d{4}-\d{2}$/.test(periodValue)
          ? periodValue
          : String(monthIndex || index + 1).padStart(2, "0");

        if (!current) {
          map.set(key, {
            key,
            period,
            order,
            collectibility,
            daysPastDue,
            sourceCount,
            rank,
          });
        } else {
          if (rank > current.rank) {
            current.collectibility = collectibility;
            current.rank = rank;
          }
          current.daysPastDue = Math.max(current.daysPastDue, daysPastDue);
          current.sourceCount += sourceCount;
        }
        return map;
      },
      new Map<
        string,
        {
          key: string;
          period: string;
          order: string;
          collectibility: string;
          daysPastDue: number;
          sourceCount: number;
          rank: number;
        }
      >(),
    ).values(),
  ).sort((a, b) => a.order.localeCompare(b.order));

  return (
    <SetupTableCard variant="nested">
      <SetupDataTable variant="nested" density="compact" className="min-w-[760px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              KOL Tertinggi
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              DPD Tertinggi
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              Sumber Data
            </SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {rows.map((row) => (
            <SetupDataTableRow key={row.key} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <p className="font-semibold text-slate-900">{idebPeriod(row.period)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Rekap seluruh pelapor dan fasilitas bulan ini
                </p>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupCollectibilityBadge value={row.collectibility} wrap />
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                {row.daysPastDue > 0 ? `${formatNumber(row.daysPastDue)} hari` : "-"}
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                {row.sourceCount > 0 ? `${formatNumber(row.sourceCount)} data` : "-"}
              </SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {rows.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={4}>
              Belum ada histori KOL bulanan di hasil IDEB ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </SetupTableCard>
  );
}

function IdebCollateralTable({
  facilities,
  collaterals = [],
}: {
  facilities: IdebRecord[];
  collaterals?: IdebRecord[];
}) {
  const rows = collaterals.length > 0
    ? collaterals.map((record) => ({
        facility: {
          account_number:
            idebText(record, ["account_number", "facility_number", "no_rekening"]) ?? "-",
          reporter_name:
            idebText(record, ["reporter_name", "reporter_code"]) ??
            (idebText(record, ["source"]) === "A01" ? "Data Internal A01" : "-"),
        },
        record,
      }))
    : getIdebFacilityRowsWithNested(facilities, "collaterals");

  return (
    <div className="space-y-2">
      <SetupTableCard variant="nested">
        <SetupDataTable variant="nested" density="compact" className="min-w-[760px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell>Fasilitas</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Jenis / Bukti</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              Nilai
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Lokasi</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {rows.slice(0, 50).map(({ facility, record }, index) => (
            <SetupDataTableRow
              key={`${getIdebFacilityAccount(facility)}-collateral-${index}`}
              className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
            >
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <p className="font-semibold text-slate-900">
                  {display(idebText(facility, ["reporter_name", "reporter_code"]))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {display(getIdebFacilityAccount(facility))}
                </p>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <p className="line-clamp-2">
                  {[
                    idebText(record, [
                      "jenisAgunanKet",
                      "jenis_agunan",
                      "jenisAgunan",
                      "collateral_type",
                      "jenis",
                      "type",
                      "description",
                      "keterangan",
                      "agunanKet",
                    ]),
                    idebText(record, [
                      "buktiKepemilikan",
                      "bukti_kepemilikan",
                      "ownership_proof",
                      "proof_number",
                    ]),
                  ].filter(Boolean).join(" - ") || "-"}
                </p>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {formatCurrency(
                  idebNumber(record, [
                    "nilaiAgunan",
                    "nilai_agunan",
                    "value",
                    "nilai",
                    "independent_appraisal_value",
                    "appraisal_value",
                    "market_value",
                  ]) ?? 0,
                )}
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <p className="line-clamp-2">
                  {display(
                    idebText(record, ["location", "alamat", "address", "lokasi"]),
                  )}
                </p>
              </SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {rows.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={4}>
              Data agunan tidak tersedia.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
      {rows.length > 50 ? (
        <p className="text-xs leading-5 text-slate-500">
          Menampilkan 50 data pertama dari {rows.length}. Seluruh data tetap disertakan pada export
          PDF.
        </p>
      ) : null}
    </div>
  );
}

function IdebGuarantorTable({ facilities }: { facilities: IdebRecord[] }) {
  const rows = getIdebFacilityRowsWithNested(facilities, "guarantors");

  return (
    <div className="space-y-2">
      <SetupTableCard variant="nested">
        <SetupDataTable variant="nested" density="compact" className="min-w-[680px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell>Fasilitas</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Penjamin</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>No Identitas</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Alamat</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {rows.slice(0, 50).map(({ facility, record }, index) => (
            <SetupDataTableRow
              key={`${getIdebFacilityAccount(facility)}-guarantor-${index}`}
              className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
            >
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <p className="font-semibold text-slate-900">
                  {display(idebText(facility, ["reporter_name", "reporter_code"]))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {display(getIdebFacilityAccount(facility))}
                </p>
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                {display(
                  idebText(record, [
                    "name",
                    "nama",
                    "guarantor_name",
                    "nama_penjamin",
                    "namaPenjamin",
                  ]),
                )}
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                {display(
                  idebText(record, [
                    "identity_number",
                    "no_identitas",
                    "noIdentitas",
                    "nik",
                    "npwp",
                  ]),
                )}
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <p className="line-clamp-2">
                  {display(idebText(record, ["address", "alamat"]))}
                </p>
              </SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {rows.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={4}>
              Data penjamin tidak tersedia pada file IDEB ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
      {rows.length > 50 ? (
        <p className="text-xs leading-5 text-slate-500">
          Menampilkan 50 data pertama dari {rows.length}. Seluruh data tetap disertakan pada export
          PDF.
        </p>
      ) : null}
    </div>
  );
}

function idebComparisonStatusLabel(status: string) {
  if (status === "MATCHED") return "Cocok";
  if (status === "DIFFERENT") return "Beda Data";
  if (status === "EXTERNAL_ONLY") return "Fasilitas Eksternal";
  if (status === "INTERNAL_ONLY") return "Internal Tidak Muncul";
  return status;
}

function IdebComparisonTable({
  comparison,
  isLoading,
  error,
}: {
  comparison: DebtorIdebComparison | null;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <SetupTableCard variant="nested">
      <SetupDataTable variant="nested" density="compact" className="min-w-[1040px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Fasilitas IDEB</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>F01 Internal</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              KOL
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              Baki Debet
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Perbedaan</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {comparison?.items.map((item, index) => {
            const external = item.external;
            const internal = item.internal;
            const differences =
              item.differences.length > 0
                ? item.differences.map((difference) => difference.label).join(", ")
                : "Sesuai";

            return (
              <SetupDataTableRow
                key={`${item.status}-${item.match_key ?? index}`}
                className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
              >
                <SetupDataTableCell>
                  <SetupStatusBadge
                    status={item.status_label || idebComparisonStatusLabel(item.status)}
                    showIcon={false}
                  />
                </SetupDataTableCell>
                <SetupDataTableCell>
                  {external ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        {display(external.reporter)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {display(external.account_number)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                        {display(external.product)}
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </SetupDataTableCell>
                <SetupDataTableCell>
                  {internal ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        {display(internal.no_kontrak)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {display(internal.facility_number)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                        {display(internal.product)}
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <div className="flex flex-col items-center gap-1">
                    {external ? (
                      <SetupCollectibilityBadge value={external.collectibility} wrap />
                    ) : null}
                    {internal ? (
                      <SetupCollectibilityBadge value={internal.collectibility} wrap />
                    ) : null}
                    {!external && !internal ? "-" : null}
                  </div>
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  <div className="space-y-1">
                    <p>{formatCurrency(external?.outstanding)}</p>
                    <p className="text-xs text-slate-500">
                      Internal: {formatCurrency(internal?.outstanding)}
                    </p>
                  </div>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <span className="line-clamp-2 text-sm text-slate-700" title={differences}>
                    {differences}
                  </span>
                </SetupDataTableCell>
              </SetupDataTableRow>
            );
          })}
          {isLoading ? (
            <SetupDataTableEmptyRow colSpan={6}>
              Memuat perbandingan IDEB dengan F01 internal...
            </SetupDataTableEmptyRow>
          ) : null}
          {!isLoading && error ? (
            <SetupDataTableEmptyRow colSpan={6}>{error}</SetupDataTableEmptyRow>
          ) : null}
          {!isLoading && !error && (!comparison || comparison.items.length === 0) ? (
            <SetupDataTableEmptyRow colSpan={6}>
              Belum ada data yang bisa dibandingkan.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </SetupTableCard>
  );
}

function IdebTab({
  debtorId,
  items,
}: {
  debtorId: string;
  items: DebtorWorkflowIdebUpload[];
}) {
  const [selectedIdeb, setSelectedIdeb] = useState<DebtorWorkflowIdebUpload | null>(null);
  const [comparison, setComparison] = useState<DebtorIdebComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [exportingIdebId, setExportingIdebId] = useState<string | null>(null);
  const [facilityFilter, setFacilityFilter] = useState<IdebFacilityFilter>("ALL");
  const idebRowActivationRef = useRef<DoubleRowActivationState | null>(null);
  const { showToast } = useAppToast();
  const latestIdeb = useMemo(() => getLatestIdebItem(items), [items]);
  const selectedFacilities = useMemo(
    () => (selectedIdeb ? getIdebFacilities(selectedIdeb) : []),
    [selectedIdeb],
  );
  const filteredFacilities = useMemo(
    () => filterIdebFacilities(selectedFacilities, facilityFilter),
    [facilityFilter, selectedFacilities],
  );
  const selectedHistory = useMemo(
    () => (selectedIdeb ? getIdebMonthlyHistory(selectedIdeb) : []),
    [selectedIdeb],
  );

  const openIdebDetail = (item: DebtorWorkflowIdebUpload) => {
    setFacilityFilter("ALL");
    setSelectedIdeb(item);
  };

  useEffect(() => {
    let ignore = false;

    async function loadComparison() {
      if (!selectedIdeb) {
        setComparison(null);
        setComparisonError(null);
        return;
      }

      setIsLoadingComparison(true);
      setComparisonError(null);
      try {
        const result = await debiturService.getIdebComparison(debtorId, selectedIdeb.id);
        if (!ignore) setComparison(result);
      } catch (error) {
        if (!ignore) {
          setComparison(null);
          setComparisonError(
            error instanceof Error
              ? error.message
              : "Perbandingan IDEB belum tersedia.",
          );
        }
      } finally {
        if (!ignore) setIsLoadingComparison(false);
      }
    }

    void loadComparison();

    return () => {
      ignore = true;
    };
  }, [debtorId, selectedIdeb]);

  const exportResumePdf = async (
    item: DebtorWorkflowIdebUpload,
    selectedFilter: IdebFacilityFilter = facilityFilter,
  ) => {
    setExportingIdebId(item.id);
    try {
      const result = await debiturService.downloadIdebResumePdf(item.id, selectedFilter);
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

  if (items.length === 0) {
    return <EmptyState>Belum ada hasil IDEB untuk debitur ini.</EmptyState>;
  }

  return (
    <>
      {latestIdeb ? (
        <div className="space-y-6">
          <IdebProfileSection item={latestIdeb} />
          <IdebResumeSection item={latestIdeb} />
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="text-lg font-bold text-gray-900">List Historis IDEB</h2>
      </div>
      <SetupTableCard variant="nested">
        <SetupDataTable variant="report" density="compact" className="min-w-[1280px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tgl Upload / Tgl IDEB</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Jumlah Bank/PJK
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Fasilitas Aktif
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Baki Debet Aktif
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Fasilitas Lunas
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Plafon Lunas
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Total Plafon
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                KOL Terburuk
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Petugas</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Aksi
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => {
              const resume = getIdebResume(item);
              const activateRow = () => openIdebDetail(item);
              const actionItems: SetupActionMenuItem[] = [
                {
                  key: "detail",
                  label: "Detail",
                  icon: Eye,
                  tone: "blue",
                  onClick: activateRow,
                },
                {
                  key: "export",
                  label: "Export PDF",
                  icon: Download,
                  tone: "emerald",
                  disabled: exportingIdebId === item.id,
                  onClick: () => void exportResumePdf(item, "ALL"),
                },
              ];

              return (
                <SetupDataTableRow
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  title="Double-click untuk melihat detail pengecekan IDEB"
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200`}
                  onClick={() =>
                    handleDoubleRowClick(idebRowActivationRef, item.id, activateRow)
                  }
                  onDoubleClick={() =>
                    triggerDoubleRowActivation(idebRowActivationRef, item.id, activateRow)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    triggerDoubleRowActivation(idebRowActivationRef, item.id, activateRow);
                  }}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <p className="font-semibold text-gray-900">
                      {formatDateOnly(item.created_at)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      IDEB {idebDate(item.summary_detail?.result_date)}
                    </p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatNumber(resume.reporterCount)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatNumber(resume.activeFacilities.length)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(resume.activeOutstanding)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatNumber(resume.paidOffFacilities.length)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(resume.paidOffPlafond)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(resume.totalPlafond)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupCollectibilityBadge value={resume.worstCollectibility} wrap />
                  </SetupDataTableCell>
                  <SetupDataTableCell>
                    <p className="line-clamp-2 font-semibold text-gray-900">
                      {display(resume.officerName)}
                    </p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                    >
                      <SetupActionMenu
                        label="Aksi IDEB"
                        menuLabel="Aksi historis IDEB"
                        items={actionItems}
                      />
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              );
            })}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>

      <DashboardModal
        isOpen={selectedIdeb !== null}
        title={
          selectedIdeb
            ? `Detail Pengecekan IDEB - ${selectedIdeb.summary_detail?.debtor_name ?? selectedIdeb.debtor?.name ?? "Debitur"}`
            : "Detail Pengecekan IDEB"
        }
        description={
          selectedIdeb
            ? idebPeriod(getIdebUploadPeriod(selectedIdeb))
            : undefined
        }
        onClose={() => setSelectedIdeb(null)}
        maxWidth="5xl"
        footer={
          selectedIdeb ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="uiverse-modal-button uiverse-modal-button--neutral"
                onClick={() => setSelectedIdeb(null)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="uiverse-modal-button uiverse-modal-button--primary"
                disabled={exportingIdebId === selectedIdeb.id}
                onClick={() => void exportResumePdf(selectedIdeb)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>
                  {exportingIdebId === selectedIdeb.id
                    ? "Mengexport..."
                    : facilityFilter === "ALL"
                      ? "Export Resume PDF"
                      : `Export PDF - ${getIdebFacilityFilterLabel(facilityFilter)}`}
                </span>
              </button>
            </div>
          ) : null
        }
      >
        {selectedIdeb ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SetupStatusBadge
                status={selectedIdeb.debtor_id ? "Terhubung" : "Belum Terhubung"}
              />
              <div className="text-sm font-semibold text-slate-500">
                {idebDate(
                  selectedIdeb.summary_detail?.result_date ??
                    selectedIdeb.summary_detail?.processed_at,
                )}
              </div>
            </div>
            <IdebCreditReviewSummary item={selectedIdeb} />

            <IdebCreditPositionTable
              facilities={filteredFacilities}
              facilityFilter={facilityFilter}
              onFacilityFilterChange={setFacilityFilter}
            />

            <IdebModalSection title="Histori KOL">
              <IdebHistoryMatrix history={selectedHistory} />
            </IdebModalSection>

            <IdebModalSection title="Perbandingan dengan F01 Internal">
              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <IdebCreditMetricCard label="Cocok">
                  {formatNumber(comparison?.summary.matched ?? 0)}
                </IdebCreditMetricCard>
                <IdebCreditMetricCard label="Beda Data">
                  {formatNumber(comparison?.summary.different ?? 0)}
                </IdebCreditMetricCard>
                <IdebCreditMetricCard label="Fasilitas Eksternal">
                  {formatNumber(comparison?.summary.external_only ?? 0)}
                </IdebCreditMetricCard>
                <IdebCreditMetricCard label="Internal Tidak Muncul">
                  {formatNumber(comparison?.summary.internal_only ?? 0)}
                </IdebCreditMetricCard>
              </div>
              <IdebComparisonTable
                comparison={comparison}
                isLoading={isLoadingComparison}
                error={comparisonError}
              />
            </IdebModalSection>

            <IdebModalSection title="Agunan">
              <IdebCollateralTable
                facilities={selectedFacilities}
                collaterals={selectedIdeb.report_summary?.collaterals ?? []}
              />
            </IdebModalSection>

            <IdebModalSection title="Penjamin">
              <IdebGuarantorTable facilities={selectedFacilities} />
            </IdebModalSection>

            <IdebModalSection title="Kesimpulan">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-900">
                {selectedIdeb.summary_detail?.conclusion ?? "-"}
              </div>
            </IdebModalSection>

          </div>
        ) : null}
      </DashboardModal>
    </>
  );
}

function HistorisKolTab({ items }: { items: DebtorWorkflowCollectibility[] }) {
  return (
    <SetupTableCard variant="nested">
      <SetupDataTable variant="portfolio" density="compact" className="min-w-[980px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kol</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>OS Pokok</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>OS Margin</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>DPD</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {items.map((item, index) => (
            <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell>{periodLabel(item.period_month)}</SetupDataTableCell>
              <SetupDataTableCell>{item.contract_number}</SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                <SetupCollectibilityBadge
                  value={item.code ?? item.name ?? "-"}
                  label={item.name ?? item.code ?? "-"}
                />
              </SetupDataTableCell>
              <SetupDataTableCell>{formatCurrency(item.outstanding_pokok)}</SetupDataTableCell>
              <SetupDataTableCell>{formatCurrency(item.outstanding_margin)}</SetupDataTableCell>
              <SetupDataTableCell>{display(item.dpd)}</SetupDataTableCell>
              <SetupDataTableCell>{display(item.notes)}</SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {items.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={8}>
              Belum ada historis kolektibilitas untuk debitur ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </SetupTableCard>
  );
}

function DokumenTab({
  items,
  checklist,
  canUpload,
  onOpenFile,
  onUploadChecklist,
  onUploadOther,
}: {
  items: DebtorDocument[];
  checklist: DebtorDocumentChecklistStatus[];
  canUpload: boolean;
  onOpenFile: (file: DebtorFileMeta) => void;
  onUploadChecklist: (item: DebtorDocumentChecklistStatus) => void;
  onUploadOther: () => void;
}) {
  const requiredChecklist = useMemo(
    () => checklist.filter((item) => item.is_required),
    [checklist],
  );
  const optionalChecklist = useMemo(
    () => checklist.filter((item) => !item.is_required),
    [checklist],
  );
  const activeChecklistIds = useMemo(
    () => new Set(checklist.map((item) => item.id)),
    [checklist],
  );
  const standaloneDocuments = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.document_checklist_id ||
          !activeChecklistIds.has(item.document_checklist_id),
      ),
    [activeChecklistIds, items],
  );
  const otherRowsCount = optionalChecklist.length + standaloneDocuments.length;

  return (
    <div className="space-y-5">
      <SectionCard title="Dokumen Wajib">
        <SetupTableCard variant="nested">
          <SetupDataTable variant="portfolio" density="compact" className="min-w-[920px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Dokumen</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {requiredChecklist.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">{item.name}</SetupDataTableCell>
                  <SetupDataTableCell>{documentTypeLabel(item.document_type)}</SetupDataTableCell>
                  <SetupDataTableCell>
                    {item.document?.description ?? item.description ?? "-"}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge
                      status={item.status === "ADA" ? "Ada" : "Belum Ada"}
                      showIcon={false}
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <DocumentTableAction
                      document={item.document}
                      canUpload={canUpload}
                      onOpenFile={onOpenFile}
                      onUpload={() => onUploadChecklist(item)}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {requiredChecklist.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={6}>
                  Belum ada checklist dokumen wajib aktif.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </SectionCard>

      <SectionCard
        title="Dokumen Lainnya"
        actions={
          canUpload ? (
            <SetupAddButton
              label="Tambah Dokumen Lainnya"
              icon={<Upload className="uiverse-add-user-button__svg" aria-hidden="true" />}
              onClick={onUploadOther}
            />
          ) : null
        }
      >
        <SetupTableCard variant="nested">
          <SetupDataTable variant="portfolio" density="compact" className="min-w-[920px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Dokumen</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {optionalChecklist.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">{item.name}</SetupDataTableCell>
                  <SetupDataTableCell>{documentTypeLabel(item.document_type)}</SetupDataTableCell>
                  <SetupDataTableCell>
                    {item.document?.description ?? item.description ?? "-"}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge
                      status={item.status === "ADA" ? "Ada" : "Belum Ada"}
                      showIcon={false}
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <DocumentTableAction
                      document={item.document}
                      canUpload={canUpload}
                      onOpenFile={onOpenFile}
                      onUpload={() => onUploadChecklist(item)}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {standaloneDocuments.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {optionalChecklist.length + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">
                    {item.document_checklist?.name ?? item.document_type}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{documentTypeLabel(item.document_type)}</SetupDataTableCell>
                  <SetupDataTableCell>{display(item.description)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status="Ada" showIcon={false} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} files={item.files} label="Lihat File" onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {otherRowsCount === 0 ? (
                <SetupDataTableEmptyRow colSpan={6}>
                  Belum ada dokumen lainnya untuk debitur ini.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </SectionCard>
    </div>
  );
}

function DocumentTableAction({
  document,
  canUpload,
  onOpenFile,
  onUpload,
}: {
  document: DebtorDocument | null;
  canUpload: boolean;
  onOpenFile: (file: DebtorFileMeta) => void;
  onUpload: () => void;
}) {
  if (document?.file || (document?.files?.length ?? 0) > 0) {
    return <FileButton file={document?.file} files={document?.files} label="Lihat File" onOpen={onOpenFile} />;
  }

  if (!canUpload) return <span className="text-gray-400">-</span>;

  return (
    <button
      type="button"
      className="uiverse-modal-button uiverse-modal-button--primary"
      onClick={onUpload}
    >
      <Upload className="h-4 w-4" aria-hidden="true" />
      <span>Upload</span>
    </button>
  );
}

function DetailMetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="min-w-0">
        <p className="break-words text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
          {label}
        </p>
        <p className="mt-2 break-words text-xl font-semibold leading-tight text-gray-900 md:text-2xl">
          {value}
        </p>
        <p className="mt-1 break-words text-sm leading-5 text-gray-500">{description}</p>
      </div>
      <Icon className="mt-1 h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
    </div>
  );
}

function DebtorDetailSummary({
  workflow,
  mainContract,
  collectibility,
}: {
  workflow: DebtorWorkflow;
  mainContract: DebtorContract | null;
  collectibility: string | null;
}) {
  const debtor = workflow.debtor;
  const totalOutstanding = workflow.contracts.reduce(
    (total, contract) => total + Number(contract.total_outstanding ?? 0),
    0,
  );
  const customerLabel = customerTypeLabel(
    debtor.customer_type,
    debtor.customer_type_label,
    debtor.slik_status_code,
  );
  const mainContractSnapshot = mainContract?.latest_slik_snapshot ?? null;

  return (
    <section className={SETUP_PAGE_PANEL_CLASS}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SetupStatusBadge status={customerLabel} showIcon={false} />
            <SetupStatusBadge status={statusLabel(debtor.status)} />
            {collectibility ? (
              <SetupCollectibilityBadge value={collectibility} />
            ) : null}
          </div>
          <div>
            <h2 className="break-words text-2xl font-bold leading-tight text-gray-950 md:text-3xl">
              {debtor.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              CIF {display(debtor.debtor_number)} dengan identitas{" "}
              {display(debtor.identity_number)}. Ringkasan ini menggabungkan data
              CIF, fasilitas, agunan, dokumen, aktivitas, dan legal yang terhubung.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailMetricCard
              label="Kontrak"
              value={workflow.contracts.length}
              description="Fasilitas terhubung"
              icon={BriefcaseBusiness}
            />
            <DetailMetricCard
              label="Outstanding"
              value={formatCurrency(totalOutstanding)}
              description="Total OS kontrak"
              icon={WalletCards}
            />
            <DetailMetricCard
              label="Dokumen"
              value={workflow.documents.length}
              description="File debitur"
              icon={FileText}
            />
            <DetailMetricCard
              label="Agunan"
              value={workflow.collaterals.length}
              description="Agunan A01"
              icon={ShieldCheck}
            />
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            Kontrak Utama
          </p>
          <p className="mt-2 break-words text-lg font-bold text-gray-950">
            {mainContract?.no_kontrak ?? "-"}
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="grid grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-3 border-b border-gray-100 pb-3">
              <span className="min-w-0 break-words text-gray-500">Produk</span>
              <span className="min-w-0 break-words text-right font-semibold text-gray-900">
                {mainContractSnapshot?.credit_type_display ??
                  mainContract?.product?.name ??
                  mainContractSnapshot?.credit_type_code ??
                  "-"}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-3 border-b border-gray-100 pb-3">
              <span className="min-w-0 break-words text-gray-500">Akad</span>
              <span className="min-w-0 break-words text-right font-semibold text-gray-900">
                {mainContractSnapshot?.financing_scheme_display ??
                  mainContract?.akad_type?.name ??
                  mainContractSnapshot?.financing_scheme_code ??
                  "-"}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-3 border-b border-gray-100 pb-3">
              <span className="min-w-0 break-words text-gray-500">Jatuh Tempo</span>
              <span className="min-w-0 break-words text-right font-semibold text-gray-900">
                {formatDateOnly(mainContract?.tanggal_jatuh_tempo)}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-3">
              <span className="min-w-0 break-words text-gray-500">Cabang</span>
              <span className="min-w-0 break-words text-right font-semibold text-gray-900">
                {debtor.branch?.name ?? mainContract?.branch?.name ?? "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailTabNav({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabConfig[];
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex max-w-full overflow-x-auto border-b border-gray-100">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-h-[56px] shrink-0 border-b-2 px-5 py-3 text-sm font-semibold transition ${
                active
                  ? "border-[#157ec3] bg-[#157ec3]/10 text-[#157ec3]"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgunanDetailModal({
  item,
  collateralTypeLookup,
  onClose,
}: {
  item: DebtorCollateral | null;
  collateralTypeLookup: Map<string, string>;
  onClose: () => void;
}) {
  if (!item) return null;

  const collateralType =
    item.collateral_type_display ??
    parameterDisplay(item.collateral_type, collateralTypeLookup);
  const facilitySummary = [
    item.facility_number ? `F01 ${item.facility_number}` : null,
    item.contract?.no_kontrak ? `Kontrak ${item.contract.no_kontrak}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
  const bindingSummary =
    [
      slikDisplay(item.binding_type_display, item.binding_type_code),
      formatDateOnly(item.binding_date),
    ]
      .filter((value) => value && value !== "-")
      .join(" / ") || "-";

  return (
    <DashboardModal
      isOpen={Boolean(item)}
      title={`Detail Agunan - ${display(item.collateral_number)}`}
      description={facilitySummary || "Informasi agunan A01 hasil import SLIK"}
      onClose={onClose}
      maxWidth="4xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#157ec3]/45 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-[#157ec3]/5"
        >
          Tutup
        </button>
      }
    >
      <div className="space-y-5">
        <section>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-600">
                Identitas Agunan
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Ringkasan nomor agunan, jenis, status, pemilik, dan fasilitas terkait.
              </p>
            </div>
            <SetupStatusBadge
              status={slikDisplay(item.collateral_status_display, item.collateral_status_code)}
              showIcon={false}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoItem label="No Agunan" value={item.collateral_number} />
            <InfoItem label="Jenis Agunan" value={collateralType} />
            <InfoItem label="Fasilitas F01" value={item.facility_number} />
            <InfoItem label="Kontrak" value={item.contract?.no_kontrak} />
            <InfoItem label="Pemilik" value={item.owner_name} />
            <InfoItem label="Bukti Kepemilikan" value={item.proof_number} />
            <InfoItem
              label="Lokasi DATI II"
              value={slikDisplay(item.location_city_display, item.location_city_code)}
            />
            <InfoItem label="Alamat" value={item.address} wide />
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-600">
            Nilai dan Pengikatan
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Nilai agunan, penilaian, pengikatan, asuransi, dan paripasu.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoItem label="Nilai NJOP / Wajar" value={formatOptionalCurrency(item.market_value)} />
            <InfoItem
              label="Nilai Pelapor"
              value={formatOptionalCurrency(item.appraisal_value)}
            />
            <InfoItem
              label="Nilai Independen"
              value={formatOptionalCurrency(item.independent_appraisal_value)}
            />
            <InfoItem
              label="Penilai Independen"
              value={item.independent_appraiser_name}
            />
            <InfoItem
              label="Tanggal Penilaian Pelapor"
              value={formatDateOnly(item.reporter_appraisal_date)}
            />
            <InfoItem
              label="Tanggal Penilaian Independen"
              value={formatDateOnly(item.independent_appraisal_date)}
            />
            <InfoItem label="Pengikatan" value={bindingSummary} />
            <InfoItem
              label="Paripasu"
              value={[
                display(item.paripasu_status),
                formatOptionalPercent(item.paripasu_percentage),
              ]
                .filter((value) => value && value !== "-")
                .join(" / ") || "-"}
            />
            <InfoItem
              label="Kredit Bersama"
              value={display(item.joint_credit_status)}
            />
            <InfoItem
              label="Diasuransikan"
              value={slikDisplay(item.insured_status_display, item.insured_status)}
            />
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-600">
            Metadata SLIK A01
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Informasi periode import, operasi data, segment, rating, dan catatan A01.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoItem
              label="Periode Data"
              value={periodLabel(item.last_import_period_month ?? item.period_month)}
            />
            <InfoItem label="Kode Cabang SLIK" value={item.branch_code} />
            <InfoItem
              label="Operasi A01"
              value={slikDisplay(item.operation_display, item.operation_code)}
            />
            <InfoItem label="Segment Fasilitas" value={item.facility_segment_code} />
            <InfoItem label="Rating" value={item.rating} />
            <InfoItem label="Lembaga Rating" value={item.rating_agency_code} />
            <InfoItem label="Keterangan" value={item.description} wide />
          </div>
        </section>
      </div>
    </DashboardModal>
  );
}

function AgunanTab({
  items,
  collateralTypeLookup,
  activeContract,
}: {
  items: DebtorCollateral[];
  collateralTypeLookup: Map<string, string>;
  activeContract?: DebtorContract | null;
}) {
  const [selectedCollateral, setSelectedCollateral] = useState<DebtorCollateral | null>(null);
  const collateralRowActivationRef = useRef<DoubleRowActivationState | null>(null);
  const groups = items.reduce<Array<{ key: string; items: DebtorCollateral[] }>>(
    (result, item) => {
      const key = item.facility_number ?? item.contract?.no_kontrak ?? "Tanpa fasilitas";
      const existing = result.find((group) => group.key === key);
      if (existing) {
        existing.items.push(item);
      } else {
        result.push({ key, items: [item] });
      }
      return result;
    },
    [],
  );

  if (items.length === 0) {
    return (
      <SetupTableCard variant="nested">
        <SetupDataTable variant="nested" density="compact">
          <SetupDataTableBody>
            <SetupDataTableEmptyRow colSpan={14}>
              Belum ada agunan hasil import SLIK untuk debitur ini.
            </SetupDataTableEmptyRow>
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900">Agunan A01</h3>
        <p className="text-sm text-gray-500">Agunan dikelompokkan berdasarkan fasilitas F01.</p>
      </div>
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900">Fasilitas {group.key}</p>
                {group.items.some((item) =>
                  isCollateralLinkedToContract(item, activeContract),
                ) ? (
                  <SetupStatusBadge status="Fasilitas aktif" showIcon={false} />
                ) : null}
              </div>
              <p className="text-xs text-gray-500">{formatNumber(group.items.length)} agunan A01</p>
            </div>
          </div>
          <SetupTableCard variant="nested">
            <SetupDataTable variant="portfolio" density="compact" className="min-w-[1680px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                    No
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>No Agunan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Pemilik</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Bukti</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Lokasi DATI II</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Pengikatan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nilai NJOP/Wajar</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nilai Pelapor</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nilai Independen</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Diasuransikan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Update Terakhir</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                    Aksi
                  </SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {group.items.map((item, index) => {
                  const activateCollateral = () => setSelectedCollateral(item);
                  const actionItems: SetupActionMenuItem[] = [
                    {
                      key: "detail",
                      label: "Detail Agunan",
                      icon: Eye,
                      tone: "blue",
                      onClick: activateCollateral,
                    },
                  ];

                  return (
                    <SetupDataTableRow
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      title="Double-click untuk melihat detail agunan"
                      className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200`}
                      onClick={() =>
                        handleDoubleRowClick(
                          collateralRowActivationRef,
                          item.id,
                          activateCollateral,
                        )
                      }
                      onDoubleClick={() =>
                        triggerDoubleRowActivation(
                          collateralRowActivationRef,
                          item.id,
                          activateCollateral,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        triggerDoubleRowActivation(
                          collateralRowActivationRef,
                          item.id,
                          activateCollateral,
                        );
                      }}
                    >
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                        {index + 1}
                      </SetupDataTableCell>
                      <SetupDataTableCell className="font-semibold">
                        {item.collateral_number}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {item.collateral_type_display ??
                          parameterDisplay(item.collateral_type, collateralTypeLookup)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {slikDisplay(item.collateral_status_display, item.collateral_status_code)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>{display(item.owner_name)}</SetupDataTableCell>
                      <SetupDataTableCell>{display(item.proof_number)}</SetupDataTableCell>
                      <SetupDataTableCell>
                        {slikDisplay(item.location_city_display, item.location_city_code)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {[
                          slikDisplay(item.binding_type_display, item.binding_type_code),
                          formatDateOnly(item.binding_date),
                        ].filter((value) => value && value !== "-").join(" / ") || "-"}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {formatOptionalCurrency(item.market_value)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {formatOptionalCurrency(item.appraisal_value)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {formatOptionalCurrency(item.independent_appraisal_value)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {slikDisplay(item.insured_status_display, item.insured_status)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {periodLabel(item.last_import_period_month ?? item.period_month)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>{display(item.description)}</SetupDataTableCell>
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                        <div
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                        >
                          <SetupActionMenu
                            label="Aksi agunan"
                            menuLabel="Aksi agunan A01"
                            items={actionItems}
                          />
                        </div>
                      </SetupDataTableCell>
                    </SetupDataTableRow>
                  );
                })}
              </SetupDataTableBody>
            </SetupDataTable>
          </SetupTableCard>
        </div>
      ))}
      <AgunanDetailModal
        item={selectedCollateral}
        collateralTypeLookup={collateralTypeLookup}
        onClose={() => setSelectedCollateral(null)}
      />
    </div>
  );
}

function NotarisTab({
  items,
  onOpenFile,
}: {
  items: DebtorWorkflowLegalProgress[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  return (
    <SectionCard
      title="Progress Notaris"
      actions={
        <LegalShortcutLink
          href="/dashboard/legal/progress/notaris"
          label="Buka Progress Notaris"
        />
      }
    >
      <SetupTableCard variant="nested">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1180px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Akta</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Notaris</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Diterima</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Estimasi</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Selesai</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                File
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{display(item.deed_type)}</SetupDataTableCell>
                <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{collateralDisplay(item.collateral)}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.received_at)}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.estimated_completed_at)}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.completed_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.file} files={item.files} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={10}>
                Belum ada progress notaris untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
    </SectionCard>
  );
}

function SuratPeringatanTab({
  letters,
  canUpload,
  onOpenFile,
  onUpload,
}: {
  letters: DebtorWarningLetter[];
  canUpload: boolean;
  onOpenFile: (file: DebtorFileMeta) => void;
  onUpload: () => void;
}) {
  return (
    <SectionCard
      title="Arsip Surat Peringatan"
      actions={
        canUpload ? (
          <SetupAddButton
            label="Upload Surat Peringatan"
            icon={<Upload className="uiverse-add-user-button__svg" aria-hidden="true" />}
            onClick={onUpload}
          />
        ) : null
      }
    >
      <SetupTableCard variant="nested">
        <SetupDataTable variant="document" density="compact" className="min-w-[900px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal Terbit</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal Kirim</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                File
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {letters.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{item.letter_type}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.issued_at)}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.sent_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.delivery_status || item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell>{display(item.description ?? item.notes)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.file} files={item.files} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {letters.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={8}>
                Belum ada arsip surat peringatan untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
    </SectionCard>
  );
}

function ClaimTab({
  insuranceProgress,
  claims,
  onOpenFile,
}: {
  insuranceProgress: DebtorWorkflowLegalProgress[];
  claims: DebtorWorkflowClaim[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Progress Polis Asuransi"
        actions={
          <LegalShortcutLink
            href="/dashboard/legal/progress/asuransi"
            label="Buka Progress Asuransi"
          />
        }
      >
        <SetupTableCard variant="nested">
          <SetupDataTable variant="workflow" density="compact" className="min-w-[1220px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Asuransi</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Perusahaan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>No Polis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nilai Cover</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nilai Premi</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {insuranceProgress.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{display(item.insurance_type)}</SetupDataTableCell>
                  <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{collateralDisplay(item.collateral)}</SetupDataTableCell>
                  <SetupDataTableCell>{display(item.policy_number)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.coverage_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.premium_amount)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} files={item.files} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {insuranceProgress.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={10}>
                  Belum ada progress asuransi.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </SectionCard>

      <SectionCard
        title="Tracking Klaim Asuransi"
        actions={
          <LegalShortcutLink
            href="/dashboard/legal/progress/klaim"
            label="Buka Progress Klaim"
          />
        }
      >
        <SetupTableCard variant="nested">
          <SetupDataTable variant="workflow" density="compact" className="min-w-[1120px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Klaim</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal Pengajuan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nilai Klaim</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Disetujui</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pencairan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {claims.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.claim_type}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{collateralDisplay(item.collateral ?? item.insurance_progress?.collateral)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.submitted_at)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.claim_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.approved_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.disbursed_amount)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} files={item.files} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {claims.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={10}>
                  Belum ada klaim asuransi.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </SetupTableCard>
      </SectionCard>
    </div>
  );
}

function depositLedgerTotal(item: DebtorWorkflowDeposit) {
  return item.total_deposit_amount ?? item.nominal;
}

function depositLedgerPayment(item: DebtorWorkflowDeposit) {
  return item.total_payment_amount ?? item.paid_amount;
}

function depositLedgerRefund(item: DebtorWorkflowDeposit) {
  return item.total_refund_amount ?? item.processed_amount;
}

function depositLedgerBalance(item: DebtorWorkflowDeposit) {
  return item.balance_amount ?? item.remaining_amount;
}

function depositTransactionLabel(action: string | null | undefined) {
  const value = String(action ?? "").trim().toUpperCase();
  if (value === "TITIPAN") return "Titipan";
  if (value === "PEMBAYARAN" || value === "BAYAR" || value === "PAID") return "Pembayaran";
  if (value === "REFUND" || value === "KEMBALI") return "Refund";
  return action ?? "-";
}

function TitipanTab({
  deposits,
  onOpenFile,
}: {
  deposits: DebtorWorkflowDeposit[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const depositRowActivationRef = useRef<DoubleRowActivationState | null>(null);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);

  const totalDeposit = deposits.reduce((total, item) => total + depositLedgerTotal(item), 0);
  const totalPayment = deposits.reduce((total, item) => total + depositLedgerPayment(item), 0);
  const totalRefund = deposits.reduce((total, item) => total + depositLedgerRefund(item), 0);
  const totalBalance = deposits.reduce((total, item) => total + depositLedgerBalance(item), 0);
  const totalTransactions = deposits.reduce(
    (total, item) => total + item.transactions.length,
    0,
  );
  const selectedDeposit =
    deposits.find((item) => item.id === selectedDepositId) ??
    (deposits.length === 1 ? deposits[0] : null);
  const selectedTransactions: DebtorWorkflowDepositTransaction[] = selectedDeposit
    ? [...selectedDeposit.transactions].sort((left, right) => {
        const leftValue = left.transaction_date ?? left.created_at ?? "";
        const rightValue = right.transaction_date ?? right.created_at ?? "";
        return rightValue.localeCompare(leftValue);
      })
    : [];
  const selectedDepositLabel = selectedDeposit
    ? selectedDeposit.deposit_type?.name ?? selectedDeposit.type
    : null;
  const historyTitle = selectedDepositLabel
    ? `Riwayat Transaksi - ${selectedDepositLabel}`
    : "Riwayat Transaksi Titipan";

  return (
    <div className="space-y-5">
      <SectionCard
        title="Ringkasan Dana Titipan"
        actions={
          <LegalShortcutGroup
            links={[
              {
                href: "/dashboard/legal/titipan/notaris",
                label: "Titipan Notaris",
              },
              {
                href: "/dashboard/legal/titipan/asuransi",
                label: "Titipan Asuransi",
              },
              {
                href: "/dashboard/legal/titipan/angsuran",
                label: "Titipan Angsuran",
              },
              {
                href: "/dashboard/legal/titipan/lainnya",
                label: "Titipan Lainnya",
              },
            ]}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <InfoItem label="Total Titipan" value={formatCurrency(totalDeposit)} />
          <InfoItem label="Total Pembayaran" value={formatCurrency(totalPayment)} />
          <InfoItem label="Total Refund" value={formatCurrency(totalRefund)} />
          <InfoItem label="Saldo Akhir" value={formatCurrency(totalBalance)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoItem label="Jumlah Kantong" value={formatNumber(deposits.length)} />
          <InfoItem label="Jumlah Transaksi" value={formatNumber(totalTransactions)} />
        </div>
      </SectionCard>

      <SetupTableCard variant="nested">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1180px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Total Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pembayaran</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Refund</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Saldo Akhir</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {deposits.map((item, index) => (
              (() => {
                const isActive = item.id === selectedDeposit?.id;
                const activateRow = () => setSelectedDepositId(item.id);

                return (
                  <SetupDataTableRow
                    key={item.id}
                    role={isActive ? undefined : "button"}
                    tabIndex={isActive ? undefined : 0}
                    title={isActive ? undefined : "Klik dua kali untuk melihat riwayat transaksi titipan"}
                    className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                      isActive
                        ? "bg-[#157ec3]/5 ring-1 ring-inset ring-[#157ec3]/20"
                        : "cursor-pointer hover:bg-[#157ec3]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                    }`}
                    onClick={
                      isActive
                        ? undefined
                        : () =>
                            handleDoubleRowClick(
                              depositRowActivationRef,
                              item.id,
                              activateRow,
                            )
                    }
                    onDoubleClick={
                      isActive
                        ? undefined
                        : () =>
                            triggerDoubleRowActivation(
                              depositRowActivationRef,
                              item.id,
                              activateRow,
                            )
                    }
                    onKeyDown={
                      isActive
                        ? undefined
                        : (event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            triggerDoubleRowActivation(
                              depositRowActivationRef,
                              item.id,
                              activateRow,
                            );
                          }
                    }
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {index + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell>{item.deposit_type?.name ?? item.type}</SetupDataTableCell>
                    <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                    <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                    <SetupDataTableCell>{formatCurrency(depositLedgerTotal(item))}</SetupDataTableCell>
                    <SetupDataTableCell>{formatCurrency(depositLedgerPayment(item))}</SetupDataTableCell>
                    <SetupDataTableCell>{formatCurrency(depositLedgerRefund(item))}</SetupDataTableCell>
                    <SetupDataTableCell>{formatCurrency(depositLedgerBalance(item))}</SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge status={statusLabel(item.status)} />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                );
              })()
            ))}
            {deposits.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={9}>
                Belum ada dana titipan untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>

      <SectionCard title={historyTitle}>
        {deposits.length === 0 ? (
          <SetupEmptyState
            title="Belum ada transaksi titipan."
            description="Transaksi titipan, pembayaran, dan refund akan muncul di sini setelah dicatat."
          />
        ) : !selectedDeposit ? (
          <SetupEmptyState
            title="Pilih titipan terlebih dahulu."
            description="Klik dua kali salah satu kantong titipan di tabel atas untuk melihat riwayat transaksinya."
          />
        ) : selectedTransactions.length > 0 ? (
          <SetupTableCard variant="nested">
            <SetupDataTable variant="workflow" density="compact" className="min-w-[1240px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                    No
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Catatan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                    File
                  </SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {selectedTransactions.map((transaction, index) => (
                  <SetupDataTableRow
                    key={transaction.id}
                    className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {index + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell>{formatDateOnly(transaction.transaction_date ?? transaction.created_at)}</SetupDataTableCell>
                    <SetupDataTableCell>{depositTransactionLabel(transaction.raw_action ?? transaction.action)}</SetupDataTableCell>
                    <SetupDataTableCell>{selectedDeposit.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                    <SetupDataTableCell>{selectedDeposit.deposit_type?.name ?? selectedDeposit.type}</SetupDataTableCell>
                    <SetupDataTableCell>{formatCurrency(transaction.amount)}</SetupDataTableCell>
                    <SetupDataTableCell>{transaction.notes ?? "-"}</SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <FileButton file={transaction.file} files={transaction.files} onOpen={onOpenFile} />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}
              </SetupDataTableBody>
            </SetupDataTable>
          </SetupTableCard>
        ) : (
          <SetupEmptyState
            title="Belum ada transaksi titipan."
            description="Transaksi titipan, pembayaran, dan refund akan muncul di sini setelah dicatat."
          />
        )}
      </SectionCard>
    </div>
  );
}

function auditActionLabel(action: string | null | undefined) {
  const normalized = String(action ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  const labels: Record<string, string> = {
    CREATE: "Input Data",
    UPDATE: "Ubah Data",
    DELETE: "Hapus / Nonaktifkan",
    UPLOAD_DOCUMENT: "Upload Dokumen",
    UPLOAD_WARNING_LETTER: "Upload Surat Peringatan",
    UPDATE_WARNING_LETTER: "Ubah Surat Peringatan",
    DELETE_WARNING_LETTER: "Hapus Surat Peringatan",
    IMPORT_QUEUED: "Import Dijadwalkan",
    IMPORT_PROCESSING: "Import Diproses",
    IMPORT_COMPLETED: "Import Selesai",
    IMPORT_COMPLETED_WITH_ERRORS: "Import Selesai Dengan Catatan",
    IMPORT_FAILED: "Import Gagal",
    IMPORT_RETRY: "Import Diulang",
    UPLOAD_IDEB: "Upload IDEB",
    RESOLVE_IDEB: "Hubungkan IDEB",
  };
  return labels[normalized] ?? statusLabel(normalized);
}

function auditEntityLabel(entityType: string | null | undefined) {
  const normalized = String(entityType ?? "").trim();
  const labels: Record<string, string> = {
    digital_debtors: "Debitur",
    debtor_contracts: "Kontrak / F01",
    debtor_documents: "Dokumen Debitur",
    debtor_marketing_activities: "Aktivitas Marketing",
    debtor_warning_letters: "Surat Peringatan",
    debtor_import_jobs: "Import",
    debtor_ideb_uploads: "IDEB",
  };
  return labels[normalized] ?? display(normalized);
}

function auditSourceLabel(source: string | null | undefined) {
  const normalized = String(source ?? "").trim().toUpperCase();
  if (normalized === "MANUAL") return "Manual";
  if (normalized === "SLIK_IMPORT") return "Import SLIK";
  if (normalized === "IDEB_IMPORT") return "Import IDEB";
  return statusLabel(normalized);
}

function AuditLogTab({ items }: { items: DebtorActivityLog[] }) {
  return (
    <SectionCard title="Audit Log">
      <p className="mb-4 text-sm text-gray-600">
        Riwayat aktivitas terakhir yang tercatat untuk debitur ini.
      </p>
      <SetupTableCard variant="nested">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[920px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Waktu</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Aktivitas</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>User</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Sumber</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Entitas</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell>
                  <div className="space-y-1">
                    <SetupStatusBadge status={auditActionLabel(item.action)} />
                    <SetupTableSecondaryText>
                      {item.title ?? auditActionLabel(item.action)}
                    </SetupTableSecondaryText>
                  </div>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-900">
                      {item.actor?.name ?? "Sistem"}
                    </span>
                    <SetupTableSecondaryText>
                      {item.actor?.username ?? item.actor?.email ?? item.actor_id ?? "-"}
                    </SetupTableSecondaryText>
                  </div>
                </SetupDataTableCell>
                <SetupDataTableCell>{auditSourceLabel(item.source)}</SetupDataTableCell>
                <SetupDataTableCell>
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-900">
                      {auditEntityLabel(item.entity_type)}
                    </span>
                    <SetupTableSecondaryText>{item.entity_id ?? "-"}</SetupTableSecondaryText>
                  </div>
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={6}>
                Belum ada audit log untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
    </SectionCard>
  );
}

function KJPPSection({
  items,
  onOpenFile,
}: {
  items: DebtorWorkflowLegalProgress[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  return (
    <SectionCard
      title="Progress KJPP"
      actions={
        <LegalShortcutLink
          href="/dashboard/legal/progress/kjpp"
          label="Buka Progress KJPP"
        />
      }
    >
      <SetupTableCard variant="nested">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1100px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Appraisal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>KJPP</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>No Laporan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nilai Appraisal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                File
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{display(item.appraisal_type)}</SetupDataTableCell>
                <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{collateralDisplay(item.collateral)}</SetupDataTableCell>
                <SetupDataTableCell>{display(item.report_number)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.appraisal_value)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.file} files={item.files} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={9}>
                Belum ada progress KJPP untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>
    </SectionCard>
  );
}

export default function DebtorWorkflowDetailClient({ debtorId }: { debtorId: string }) {
  const { role, user } = useAuth();
  const { showToast } = useAppToast();
  const { openPreview } = useDocumentPreviewContext();
  const [workflow, setWorkflow] = useState<DebtorWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [documentUploadForm, setDocumentUploadForm] =
    useState<DebtorDocumentUploadFormState>(emptyDocumentUploadForm);
  const [documentUploadMode, setDocumentUploadMode] =
    useState<DebtorDocumentUploadMode>("other");
  const [documentUploadChecklist, setDocumentUploadChecklist] =
    useState<DebtorDocumentChecklistStatus | null>(null);
  const [isDocumentUploadModalOpen, setIsDocumentUploadModalOpen] = useState(false);
  const [isSavingDocumentUpload, setIsSavingDocumentUpload] = useState(false);
  const [warningLetterUploadForm, setWarningLetterUploadForm] =
    useState<DebtorWarningLetterUploadFormState>(emptyWarningLetterUploadForm);
  const [isWarningLetterUploadModalOpen, setIsWarningLetterUploadModalOpen] =
    useState(false);
  const [isSavingWarningLetterUpload, setIsSavingWarningLetterUpload] = useState(false);
  const [collateralTypes, setCollateralTypes] = useState<ParameterMasterRecord[]>([]);

  const canUploadDocument = hasDebtorMasterCapability(role, user?.role_id, "create");

  const canViewLegal = hasAnyMenuCapability(role, user?.role_id, [
    "/dashboard/legal/progress/notaris",
    "/dashboard/legal/progress/asuransi",
    "/dashboard/legal/progress/kjpp",
    "/dashboard/legal/progress/klaim",
    "/dashboard/legal/titipan/asuransi",
    "/dashboard/legal/titipan/notaris",
    "/dashboard/legal/titipan/angsuran",
  ]);

  const visibleTabs = useMemo(
    () =>
      TABS.filter((tab) => {
        if (tab.legal && !canViewLegal) return false;
        if (tab.permissions?.length) {
          return hasAnyMenuCapability(role, user?.role_id, tab.permissions);
        }
        return true;
      }),
    [canViewLegal, role, user?.role_id],
  );

  const visibleTabIds = useMemo(
    () => new Set(visibleTabs.map((tab) => tab.id)),
    [visibleTabs],
  );

  const resolvedActiveTab = visibleTabIds.has(activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? "info";

  const loadWorkflow = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setWorkflow(await debiturService.getDebtorWorkflow(debtorId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat detail debitur",
      );
      setWorkflow(null);
    } finally {
      setIsLoading(false);
    }
  }, [debtorId]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  useEffect(() => {
    if (!workflow) {
      setSelectedContractId(null);
      return;
    }

    const fallbackContractId = getPreferredActiveContractId(
      workflow.contracts,
      workflow.debtor.latest_contract,
    );

    if (!fallbackContractId) {
      setSelectedContractId(null);
      return;
    }

    const selectedContractStillExists =
      workflow.contracts.some((contract) => contract.id === selectedContractId) ||
      workflow.debtor.latest_contract?.id === selectedContractId;

    if (!selectedContractId || !selectedContractStillExists) {
      setSelectedContractId(fallbackContractId);
    }
  }, [selectedContractId, workflow]);

  useEffect(() => {
    let ignore = false;

    async function loadParameterLookups() {
      try {
        const nextCollateralTypes = await collateralTypeService.getAll({
          is_active: true,
        });

        if (!ignore) {
          setCollateralTypes(nextCollateralTypes);
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat parameter debitur",
            "error",
          );
        }
      }
    }

    void loadParameterLookups();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const collateralTypeLookup = useMemo(
    () => createParameterLookup(collateralTypes),
    [collateralTypes],
  );

  const openFile = useCallback(
    (file: DebtorFileMeta) => {
      const url = toPreviewableFileUrl(file.url, file.name);
      if (!url) return;
      const fileName = deriveDocumentFileName(file.name ?? url, "dokumen-debitur");
      openPreview(url, fileName, detectDocumentFileType(url, fileName));
    },
    [openPreview],
  );

  const getDefaultDocumentContractId = () => {
    if (!workflow || workflow.contracts.length !== 1) return "";
    return workflow.contracts[0]?.id ?? "";
  };

  const openChecklistDocumentUpload = (item: DebtorDocumentChecklistStatus) => {
    if (!canUploadDocument) return;
    setDocumentUploadMode("checklist");
    setDocumentUploadChecklist(item);
    setDocumentUploadForm(
      documentUploadFormFromChecklist(item, getDefaultDocumentContractId()),
    );
    setIsDocumentUploadModalOpen(true);
  };

  const openOtherDocumentUpload = () => {
    if (!canUploadDocument) return;
    setDocumentUploadMode("other");
    setDocumentUploadChecklist(null);
    setDocumentUploadForm(emptyDocumentUploadForm(getDefaultDocumentContractId()));
    setIsDocumentUploadModalOpen(true);
  };

  const openWarningLetterUpload = () => {
    if (!canUploadDocument) return;
    setWarningLetterUploadForm(
      emptyWarningLetterUploadForm(getDefaultDocumentContractId()),
    );
    setIsWarningLetterUploadModalOpen(true);
  };

  const closeDocumentUploadModal = () => {
    setIsDocumentUploadModalOpen(false);
    setDocumentUploadMode("other");
    setDocumentUploadChecklist(null);
    setDocumentUploadForm(emptyDocumentUploadForm());
  };

  const closeWarningLetterUploadModal = () => {
    setIsWarningLetterUploadModalOpen(false);
    setWarningLetterUploadForm(emptyWarningLetterUploadForm());
  };

  const saveDocumentUpload = async () => {
    const validation = validateDocumentUploadForm(documentUploadForm);
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSavingDocumentUpload(true);
    try {
      await debiturService.createDebtorDocument(
        debtorId,
        buildDocumentUploadPayload(documentUploadForm),
      );
      showToast("Dokumen debitur berhasil diupload", "success");
      closeDocumentUploadModal();
      await loadWorkflow();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal upload dokumen debitur",
        "error",
      );
    } finally {
      setIsSavingDocumentUpload(false);
    }
  };

  const saveWarningLetterUpload = async () => {
    const validation = validateWarningLetterUploadForm(
      warningLetterUploadForm,
      workflow?.contracts.length ?? 0,
    );
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSavingWarningLetterUpload(true);
    try {
      await debiturService.createWarningLetter(
        buildWarningLetterUploadPayload(debtorId, warningLetterUploadForm),
      );
      showToast("Surat peringatan berhasil diupload", "success");
      closeWarningLetterUploadModal();
      await loadWorkflow();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal upload surat peringatan",
        "error",
      );
    } finally {
      setIsSavingWarningLetterUpload(false);
    }
  };

  const mainContract: DebtorContract | null = workflow
    ? resolveMainContract(
        workflow.contracts,
        selectedContractId,
        workflow.debtor.latest_contract,
      )
    : null;

  const headerCollectibility =
    mainContract && contractCollectibilityDisplay(mainContract) !== "-"
      ? contractCollectibilityDisplay(mainContract)
      : null;

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title={workflow?.debtor.name ?? "Detail Debitur"}
        subtitle={
          mainContract?.no_kontrak ??
          workflow?.debtor.debtor_number ??
          "Workflow informasi debitur"
        }
        icon={<User />}
        actions={
          <HeaderActions collectibility={headerCollectibility} />
        }
      />

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500 shadow-sm">
          Memuat detail debitur...
        </div>
      ) : errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : workflow ? (
        <>
          <DebtorDetailSummary
            workflow={workflow}
            mainContract={mainContract}
            collectibility={headerCollectibility}
          />

          <DetailTabNav
            tabs={visibleTabs}
            activeTab={resolvedActiveTab}
            onChange={setActiveTab}
          />

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            {resolvedActiveTab === "info" ? (
              <DataUtamaTab
                workflow={workflow}
                selectedContractId={selectedContractId}
                onSelectContract={setSelectedContractId}
                onOpenAgunanTab={() => setActiveTab("agunan")}
              />
            ) : null}
            {resolvedActiveTab === "summary" ? (
              <SummaryTab workflow={workflow} onOpenFile={openFile} />
            ) : null}
            {resolvedActiveTab === "audit" ? (
              <AuditLogTab items={workflow.activity_logs} />
            ) : null}
            {resolvedActiveTab === "ideb" ? (
              <IdebTab
                debtorId={workflow.debtor.id}
                items={workflow.ideb_uploads}
              />
            ) : null}
            {resolvedActiveTab === "historis" ? (
              <HistorisKolTab items={workflow.collectibilities} />
            ) : null}
            {resolvedActiveTab === "dokumen" ? (
              <DokumenTab
                items={workflow.documents}
                checklist={workflow.document_checklist_status}
                canUpload={canUploadDocument}
                onOpenFile={openFile}
                onUploadChecklist={openChecklistDocumentUpload}
                onUploadOther={openOtherDocumentUpload}
              />
            ) : null}
            {resolvedActiveTab === "agunan" ? (
              <AgunanTab
                items={workflow.collaterals}
                collateralTypeLookup={collateralTypeLookup}
                activeContract={mainContract}
              />
            ) : null}
            {resolvedActiveTab === "notaris" && canViewLegal ? (
              <div className="space-y-5">
                <NotarisTab
                  items={workflow.legal.notary_progress}
                  onOpenFile={openFile}
                />
                <KJPPSection
                  items={workflow.legal.kjpp_progress}
                  onOpenFile={openFile}
                />
              </div>
            ) : null}
            {resolvedActiveTab === "sp" ? (
              <SuratPeringatanTab
                letters={workflow.legal.warning_letters}
                canUpload={canUploadDocument}
                onOpenFile={openFile}
                onUpload={openWarningLetterUpload}
              />
            ) : null}
            {resolvedActiveTab === "claim" && canViewLegal ? (
              <ClaimTab
                insuranceProgress={workflow.legal.insurance_progress}
                claims={workflow.legal.claims}
                onOpenFile={openFile}
              />
            ) : null}
            {resolvedActiveTab === "titipan" && canViewLegal ? (
              <TitipanTab deposits={workflow.legal.deposits} onOpenFile={openFile} />
            ) : null}
          </div>
        </>
      ) : null}
      <DebtorDocumentUploadModal
        isOpen={isDocumentUploadModalOpen}
        mode={documentUploadMode}
        form={documentUploadForm}
        checklist={documentUploadChecklist}
        contracts={workflow?.contracts ?? []}
        isSaving={isSavingDocumentUpload}
        onChange={(patch) =>
          setDocumentUploadForm((prev) => ({ ...prev, ...patch }))
        }
        onClose={closeDocumentUploadModal}
        onSave={() => void saveDocumentUpload()}
      />
      <DebtorWarningLetterUploadModal
        isOpen={isWarningLetterUploadModalOpen}
        form={warningLetterUploadForm}
        contracts={workflow?.contracts ?? []}
        isSaving={isSavingWarningLetterUpload}
        onChange={(patch) =>
          setWarningLetterUploadForm((prev) => ({ ...prev, ...patch }))
        }
        onClose={closeWarningLetterUploadModal}
        onSave={() => void saveWarningLetterUpload()}
      />
    </DashboardPageShell>
  );
}
