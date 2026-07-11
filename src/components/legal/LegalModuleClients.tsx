"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { usePathname } from "next/navigation";
import {
  Activity,
  Banknote,
  Building2,
  ChevronDown,
  ClipboardList,
  Eye,
  FileArchive,
  FileCheck2,
  FilePlus2,
  FileText,
  Landmark,
  Monitor,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useProtectedAction } from "@/hooks/useProtectedAction";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import {
  deriveDocumentFileName,
  toPreviewableFileUrl,
  validateDomainUploadFile,
} from "@/lib/utils/file";
import { useAppToast } from "@/components/ui/AppToastProvider";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import MultiFileUploadField from "@/components/ui/MultiFileUploadField";
import Pagination from "@/components/ui/Pagination";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupAddButton from "@/components/ui/SetupAddButton";
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
  SetupTableMoney,
  SetupTablePrimaryText,
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
import SetupFilePreviewGroup from "@/components/ui/SetupFilePreviewGroup";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import {
  createParameterMasterService,
  type ParameterMasterRecord,
} from "@/services/parameter-master.service";
import { debiturService } from "@/services/debitur.service";
import { legalService } from "@/services/legal.service";
import type { PaginationMeta } from "@/types/api.types";
import type {
  DebtorCollateral,
  DebtorContract,
  DebtorFileMeta,
  DebtorRecord,
} from "@/types/debitur.types";
import type {
  LegalActivityLog,
  LegalClaim,
  LegalClaimPayload,
  LegalDeposit,
  LegalDepositPayload,
  LegalDepositTransactionPayload,
  LegalInsurancePayload,
  LegalKjppPayload,
  LegalProgressRecord,
  LegalSummaryReport,
  LegalNotaryPayload,
} from "@/types/legal.types";

type Option = {
  value: string;
  label: string;
};

type LegalProgressType = "notary" | "insurance" | "kjpp";

type LegalFlowStep = {
  label: string;
  description: string;
  href: string;
  value: string | number;
  icon: LucideIcon;
};

type DetailRow = {
  label: string;
  value: ReactNode;
};

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}

type ProgressFormState = {
  contract_id: string;
  collateral_id: string;
  third_party_id: string;
  main_type: string;
  received_at: string;
  estimated_completed_at: string;
  completed_at: string;
  coverage_amount: string;
  premium_amount: string;
  period_start: string;
  period_end: string;
  policy_number: string;
  deed_number: string;
  report_number: string;
  collateral_object: string;
  appraisal_value: string;
  status: string;
  notes: string;
  file: File | null;
  files: File[];
};

type ClaimFormState = {
  contract_id: string;
  collateral_id: string;
  insurance_progress_id: string;
  policy_number: string;
  claim_type: string;
  claim_amount: string;
  submitted_at: string;
  status: string;
  approved_amount: string;
  disbursed_amount: string;
  disbursed_at: string;
  rejection_reason: string;
  notes: string;
  file: File | null;
  files: File[];
};

type DepositFormState = {
  contract_id: string;
  deposit_type_id: string;
  third_party_id: string;
  notes: string;
  opening_transaction_date: string;
  opening_transaction_amount: string;
  opening_transaction_notes: string;
  opening_transaction_file: File | null;
  opening_transaction_files: File[];
};

type DepositTransactionFormState = {
  transaction_date: string;
  action: string;
  amount: string;
  notes: string;
  file: File | null;
  files: File[];
};

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: SETUP_TABLE_PAGE_SIZE,
  lastPage: 1,
};

const NOTARY_STATUS_OPTIONS: Option[] = [
  { value: "PROSES", label: "Dalam Proses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "BERMASALAH", label: "Bermasalah" },
];

const INSURANCE_STATUS_OPTIONS: Option[] = [
  { value: "AKTIF", label: "Aktif" },
  { value: "EXPIRED", label: "Expired" },
  { value: "KLAIM", label: "Klaim" },
];

const KJPP_STATUS_OPTIONS: Option[] = [
  { value: "PROSES", label: "Dalam Proses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "BERMASALAH", label: "Bermasalah" },
];

const CLAIM_STATUS_OPTIONS: Option[] = [
  { value: "PENGAJUAN", label: "Pengajuan" },
  { value: "VERIFIKASI", label: "Verifikasi" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DITOLAK", label: "Ditolak" },
  { value: "CAIR", label: "Cair" },
];

const DEPOSIT_TRANSACTION_ACTION_OPTIONS: Option[] = [
  { value: "TITIPAN", label: "Titipan" },
  { value: "PEMBAYARAN", label: "Pembayaran" },
  { value: "REFUND", label: "Refund" },
];

const LEGAL_AUDIT_ACTION_OPTIONS: Option[] = [
  { value: "CREATE", label: "Tambah" },
  { value: "UPDATE", label: "Ubah" },
  { value: "DELETE", label: "Hapus" },
];

const LEGAL_AUDIT_ENTITY_OPTIONS: Option[] = [
  { value: "LEGAL_NOTARY_PROGRESS", label: "Progress Notaris" },
  { value: "LEGAL_INSURANCE_PROGRESS", label: "Progress Asuransi" },
  { value: "LEGAL_KJPP_PROGRESS", label: "Progress KJPP" },
  { value: "LEGAL_CLAIM", label: "Klaim Asuransi" },
  { value: "LEGAL_DEPOSIT", label: "Dana Titipan" },
  { value: "LEGAL_DEPOSIT_TRANSACTION", label: "Transaksi Titipan" },
];

const LEGAL_AUDIT_SOURCE_OPTIONS: Option[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "IMPORT", label: "Import" },
  { value: "SYSTEM", label: "Sistem" },
];

const thirdPartyService = createParameterMasterService("/third-parties");
const depositTypeService = createParameterMasterService("/deposit-types");
const legalProcessTypeService = createParameterMasterService("/legal-process-types");

function normalizeDisplay(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function toNumberInput(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return null;
  return toNumberInput(value);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDateOnly(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function optionLabel(options: Option[], value: string | null | undefined) {
  const normalized = String(value || "").toUpperCase();
  return options.find((option) => option.value === normalized)?.label || normalizeDisplay(value);
}

function getRecordText(record: ParameterMasterRecord | null | undefined, ...keys: string[]) {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function recordCategory(record: ParameterMasterRecord) {
  return getRecordText(record, "category").toUpperCase();
}

function toParameterOptions(records: ParameterMasterRecord[]) {
  return records.map<Option>((record) => {
    const code = getRecordText(record, "code", "kode", "document_type");
    const name = getRecordText(record, "name", "label", "nama", "title", "prefix_template") || record.id;
    return {
      value: record.id,
      label: code && code !== name ? `${code} - ${name}` : name,
    };
  });
}

function toDebtorOptions(debtors: DebtorRecord[]) {
  return debtors.map<Option>((debtor) => ({
    value: debtor.id,
    label: debtor.debtor_number ? `${debtor.debtor_number} - ${debtor.name}` : debtor.name,
  }));
}

function toContractOptions(contracts: DebtorContract[]) {
  return contracts.map<Option>((contract) => ({
    value: contract.id,
    label: `${contract.no_kontrak} - ${contract.debtor?.name ?? "Debitur"}`,
  }));
}

function collateralOptionLabel(collateral: DebtorCollateral) {
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

function toCollateralOptions(collaterals: DebtorCollateral[]) {
  return collaterals.map<Option>((collateral) => ({
    value: collateral.id,
    label: collateralOptionLabel(collateral),
  }));
}

function useContractCollateralOptions(contractId: string) {
  const { showToast } = useAppToast();
  const [collaterals, setCollaterals] = useState<DebtorCollateral[]>([]);

  useEffect(() => {
    let ignore = false;
    if (!contractId) {
      return;
    }

    debiturService
      .getCollateralsPage({
        page: 1,
        limit: MAX_TABLE_PAGE_SIZE,
        contract_id: contractId,
      })
      .then((result) => {
        if (!ignore) setCollaterals(result.items);
      })
      .catch((error) => {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat agunan kontrak",
            "error",
          );
        }
      })
      .finally(() => undefined);

    return () => {
      ignore = true;
    };
  }, [contractId, showToast]);

  const loadOptions = useCallback(
    async (query: string) => {
      if (!contractId) return [];
      const result = await debiturService.getCollateralsPage({
        page: 1,
        limit: 20,
        contract_id: contractId,
        search: query,
      });
      return toCollateralOptions(result.items);
    },
    [contractId],
  );

  return {
    collaterals: contractId ? collaterals : [],
    collateralOptions: contractId ? toCollateralOptions(collaterals) : [],
    loadOptions,
  };
}

function toLegalProcessOptions(
  records: ParameterMasterRecord[],
  category: string,
) {
  return records
    .filter((record) => recordCategory(record) === category)
    .map<Option>((record) => {
      const code = getRecordText(record, "code", "kode");
      const name = getRecordText(record, "name", "label", "nama") || code || record.id;
      return {
        value: name,
        label: code && code !== name ? `${code} - ${name}` : name,
      };
    });
}

async function loadContractSearchOptions(query: string) {
  const result = await debiturService.getContractsPage({
    page: 1,
    limit: 20,
    search: query,
    status: "ACTIVE",
    sort_by: "no_kontrak",
    sort_order: "asc",
  });

  return toContractOptions(result.items);
}

function depositTypeLabel(type: string | null | undefined) {
  const normalized = String(type ?? "").trim().toUpperCase();
  if (normalized === "NOTARIS") return "Titipan Notaris";
  if (normalized === "ASURANSI") return "Titipan Asuransi";
  if (normalized === "ANGSURAN") return "Titipan Angsuran";
  if (normalized === "LAINNYA") return "Titipan Lainnya";
  return normalizeDisplay(type);
}

function statusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (["AKTIF", "ACTIVE"].includes(normalized)) return "Aktif";
  if (["INACTIVE", "NONAKTIF"].includes(normalized)) return "Nonaktif";
  if (["PENDING", "PENGAJUAN"].includes(normalized)) return "Menunggu";
  if (["PROSES", "DIPROSES", "VERIFIKASI"].includes(normalized)) return "Dalam Proses";
  if (["SELESAI", "TERUPLOAD", "DISETUJUI", "DIBAYAR", "CAIR"].includes(normalized)) return "Selesai";
  if (["GAGAL", "DITOLAK", "BERMASALAH"].includes(normalized)) return "Ditolak";
  if (normalized === "EXPIRED") return "Expired";
  if (normalized === "KLAIM") return "Klaim";
  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function depositActionLabel(action: string | null | undefined) {
  const normalized = String(action ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (normalized === "TITIPAN") return "Titipan";
  if (["PEMBAYARAN", "BAYAR", "PAID"].includes(normalized)) return "Pembayaran";
  if (["REFUND", "PROSES", "PROCESS", "DIPROSES"].includes(normalized)) return "Refund";
  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function insuranceStatusValue(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (["AKTIF", "EXPIRED", "KLAIM"].includes(normalized)) return normalized;
  return "AKTIF";
}

type OpenDocumentPreview = (fileUrl: string, fileName: string) => void;

function resolvePreviewFiles(
  files?: DebtorFileMeta[] | null,
  file?: DebtorFileMeta | null,
) {
  const source = Array.isArray(files) && files.length > 0 ? files : file ? [file] : [];
  const seen = new Set<string>();
  const normalized: DebtorFileMeta[] = [];

  for (const entry of source) {
    if (!entry || (!entry.url && !entry.name)) continue;
    const key = [entry.url ?? "", entry.name ?? ""].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(entry);
  }

  return normalized;
}

function firstPreviewFile(
  files?: DebtorFileMeta[] | null,
  file?: DebtorFileMeta | null,
) {
  return resolvePreviewFiles(files, file).find((entry) => Boolean(entry.url)) ?? null;
}

function openFile(
  url: string | null | undefined,
  fileName?: string | null,
  openPreview?: OpenDocumentPreview,
) {
  const previewableUrl = toPreviewableFileUrl(url, fileName);
  if (!previewableUrl) return;

  const displayName = deriveDocumentFileName(
    fileName || previewableUrl,
    "dokumen-legal",
  );

  if (openPreview) {
    openPreview(previewableUrl, displayName);
    return;
  }

  if (typeof window === "undefined") return;
  window.open(previewableUrl, "_blank", "noopener,noreferrer");
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-2 block text-sm font-medium text-gray-700">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
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
    <div className="md:col-span-full">
      <FieldLabel required={required}>{label}</FieldLabel>
      <SetupTextarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
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
  disabled = false,
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
  disabled?: boolean;
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
          disabled={disabled}
          required={required}
          clearable={includeEmpty}
          onChange={(nextValue) => onChange(nextValue)}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder ?? `Cari ${label.toLowerCase()}...`}
          emptyLabel={`${label} tidak ditemukan`}
          loadingLabel={`Memuat ${label.toLowerCase()}...`}
        />
      ) : (
      <SetupSelect value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
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

function DateField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <BasicDateInput value={value} required={required} disabled={disabled} onChange={onChange} />
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
        {isSaving ? "Menyimpan..." : saveLabel}
      </button>
    </>
  );
}

function SearchCard({
  search,
  onSearch,
  right,
  label = "Cari Data",
  placeholder = "Cari data...",
}: {
  search: string;
  onSearch: (value: string) => void;
  right?: React.ReactNode;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end`}>
      <SetupSearchInput
        id="legal-search"
        label={label}
        value={search}
        placeholder={placeholder}
        onChange={(event) => onSearch(event.target.value)}
      />
      {right}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</p>
        <Icon className="h-6 w-6 shrink-0 text-slate-600" aria-hidden="true" />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function buildLegalFlowSteps(summary: LegalSummaryReport | null, isLoading: boolean): LegalFlowStep[] {
  const value = (count: number | undefined) => (isLoading ? "-" : count ?? 0);

  return [
    {
      label: "Pihak Ketiga Notaris",
      description: "Pantau akta, nomor akta, tanggal terima, dan selesai.",
      href: "/dashboard/legal/progress/notaris",
      value: value(summary?.notary),
      icon: Landmark,
    },
    {
      label: "Pihak Ketiga Asuransi",
      description: "Pantau polis, periode, nilai pertanggungan, dan status.",
      href: "/dashboard/legal/progress/asuransi",
      value: value(summary?.insurance),
      icon: ShieldCheck,
    },
    {
      label: "Pihak Ketiga KJPP",
      description: "Pantau penilaian agunan, laporan, dan nilai taksasi.",
      href: "/dashboard/legal/progress/kjpp",
      value: value(summary?.kjpp),
      icon: Building2,
    },
    {
      label: "Klaim Asuransi",
      description: "Tracking pengajuan, approval, pencairan, atau penolakan klaim.",
      href: "/dashboard/legal/progress/klaim",
      value: value(summary?.claims),
      icon: FileCheck2,
    },
    {
      label: "Dana Titipan",
      description: "Dana titipan notaris, asuransi, angsuran, dan transaksinya.",
      href: "/dashboard/legal/titipan/asuransi",
      value: value(summary?.deposits),
      icon: Banknote,
    },
  ];
}

function LegalFlowBoard({
  steps,
  title = "Flow Operasional Legal",
  subtitle = "Urutan kerja legal mengikuti progress pihak ketiga, klaim asuransi, dan dana titipan.",
}: {
  steps: LegalFlowStep[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <SetupStatusBadge status="Aktif" showIcon />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <ProtectedLink
              key={step.href}
              href={step.href}
              className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[rgba(21,126,195,0.42)] hover:bg-gray-50 hover:shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon
                    className="h-6 w-6 shrink-0 text-slate-600 transition-colors group-hover:text-[#157ec3]"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{step.value}</span>
              </div>
              <p className="font-semibold text-gray-900">{step.label}</p>
              <p className="mt-1 min-h-[40px] text-sm leading-5 text-gray-500">{step.description}</p>
            </ProtectedLink>
          );
        })}
      </div>
    </section>
  );
}

function LegalDetailGrid({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{row.label}</p>
          <div className="mt-2 text-sm font-semibold text-gray-900">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function LegalDetailSection({ title, rows }: { title: string; rows: DetailRow[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-500">{title}</h3>
      <LegalDetailGrid rows={rows} />
    </section>
  );
}

function useLegalLookups({ insurance = false } = {}) {
  const { showToast } = useAppToast();
  const [contracts, setContracts] = useState<DebtorContract[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [thirdParties, setThirdParties] = useState<ParameterMasterRecord[]>([]);
  const [depositTypes, setDepositTypes] = useState<ParameterMasterRecord[]>([]);
  const [legalProcessTypes, setLegalProcessTypes] = useState<ParameterMasterRecord[]>([]);
  const [insuranceProgress, setInsuranceProgress] = useState<LegalProgressRecord[]>([]);

  const fetchLookups = useCallback(async () => {
    const [
      contractRows,
      debtorRows,
      thirdPartyRows,
      depositTypeRows,
      legalProcessTypeRows,
      insuranceRows,
    ] = await Promise.all([
      debiturService.getContractsPage({
        page: 1,
        limit: 20,
        status: "ACTIVE",
        sort_by: "no_kontrak",
        sort_order: "asc",
      }),
      debiturService.getDebtorsPage({
        page: 1,
        limit: 20,
        status: "ACTIVE",
        sort_by: "name",
        sort_order: "asc",
      }),
      thirdPartyService.getAll({ is_active: true }),
      depositTypeService.getAll({ is_active: true }),
      legalProcessTypeService.getAll({ is_active: true }),
      insurance
        ? legalService.getInsurancePage({ page: 1, limit: MAX_TABLE_PAGE_SIZE }).then((page) => page.items)
        : Promise.resolve([]),
    ]);

    return {
        contractRows: contractRows.items,
      debtorRows: debtorRows.items,
      thirdPartyRows,
      depositTypeRows,
      legalProcessTypeRows,
      insuranceRows,
    };
  }, [insurance]);

  const load = useCallback(async () => {
    try {
      const result = await fetchLookups();
      setContracts(result.contractRows);
      setDebtors(result.debtorRows);
      setThirdParties(result.thirdPartyRows);
      setDepositTypes(result.depositTypeRows);
      setLegalProcessTypes(result.legalProcessTypeRows);
      setInsuranceProgress(result.insuranceRows);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat data pendukung legal", "error");
    }
  }, [fetchLookups, showToast]);

  useEffect(() => {
    let ignore = false;

    void fetchLookups()
      .then((result) => {
        if (ignore) return;
        setContracts(result.contractRows);
        setDebtors(result.debtorRows);
        setThirdParties(result.thirdPartyRows);
        setDepositTypes(result.depositTypeRows);
        setLegalProcessTypes(result.legalProcessTypeRows);
        setInsuranceProgress(result.insuranceRows);
      })
      .catch((error) => {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat data pendukung legal",
            "error",
          );
        }
      });

    return () => {
      ignore = true;
    };
  }, [fetchLookups, showToast]);

  const notaryOptions = useMemo(
    () => toParameterOptions(thirdParties.filter((item) => recordCategory(item) === "NOTARY")),
    [thirdParties],
  );
  const insuranceOptions = useMemo(
    () => toParameterOptions(thirdParties.filter((item) => recordCategory(item) === "INSURANCE")),
    [thirdParties],
  );
  const kjppOptions = useMemo(
    () => toParameterOptions(thirdParties.filter((item) => recordCategory(item) === "KJPP")),
    [thirdParties],
  );

  return {
    contracts,
    debtors,
    thirdParties,
    depositTypes,
    legalProcessTypes,
    insuranceProgress,
    contractOptions: toContractOptions(contracts),
    debtorOptions: toDebtorOptions(debtors),
    thirdPartyOptions: toParameterOptions(thirdParties),
    notaryOptions,
    insuranceOptions,
    kjppOptions,
    depositTypeOptions: toParameterOptions(depositTypes),
    notaryProcessOptions: toLegalProcessOptions(
      legalProcessTypes,
      "NOTARY_DEED",
    ),
    insuranceProcessOptions: toLegalProcessOptions(
      legalProcessTypes,
      "INSURANCE_TYPE",
    ),
    kjppProcessOptions: toLegalProcessOptions(
      legalProcessTypes,
      "KJPP_APPRAISAL",
    ),
    claimTypeOptions: toLegalProcessOptions(
      legalProcessTypes,
      "INSURANCE_CLAIM",
    ),
    reloadLookups: load,
  };
}

export function LegalOverviewClient() {
  const { showToast } = useAppToast();
  const [summary, setSummary] = useState<LegalSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        const data = await legalService.getSummaryReport();
        if (!ignore) setSummary(data);
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat ringkasan legal",
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

  const flowSteps = useMemo(
    () => buildLegalFlowSteps(summary, isLoading),
    [isLoading, summary],
  );

  const cards = [
    {
      label: "Progress Notaris",
      value: summary?.notary ?? 0,
      icon: Landmark,
      href: "/dashboard/legal/progress/notaris",
    },
    {
      label: "Progress Asuransi",
      value: summary?.insurance ?? 0,
      icon: ShieldCheck,
      href: "/dashboard/legal/progress/asuransi",
    },
    {
      label: "Klaim",
      value: summary?.claims ?? 0,
      icon: FileCheck2,
      href: "/dashboard/legal/progress/klaim",
    },
    {
      label: "Dana Titipan",
      value: summary?.deposits ?? 0,
      icon: Banknote,
      href: "/dashboard/legal/titipan/asuransi",
    },
  ];

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Manajemen Legal"
        subtitle="Progress pihak ketiga, tracking klaim asuransi, dan dana titipan."
        icon={<Landmark />}
      />
      <LegalFlowBoard steps={flowSteps} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <ProtectedLink
            key={card.label}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/30"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-semibold text-gray-900">{card.label}</p>
              <card.icon className="h-5 w-5 text-gray-900" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {isLoading ? "-" : card.value}
            </p>
          </ProtectedLink>
        ))}
      </div>
    </DashboardPageShell>
  );
}

function emptyProgressForm(status: string): ProgressFormState {
  return {
    contract_id: "",
    collateral_id: "",
    third_party_id: "",
    main_type: "",
    received_at: "",
    estimated_completed_at: "",
    completed_at: "",
    coverage_amount: "0",
    premium_amount: "0",
    period_start: "",
    period_end: "",
    policy_number: "",
    deed_number: "",
    report_number: "",
    collateral_object: "",
    appraisal_value: "",
    status,
    notes: "",
    file: null,
    files: [],
  };
}

function notaryToForm(item: LegalProgressRecord): ProgressFormState {
  return {
    ...emptyProgressForm(item.status || "PROSES"),
    contract_id: item.contract_id,
    collateral_id: item.collateral_id ?? "",
    third_party_id: item.third_party_id,
    main_type: item.deed_type ?? "",
    received_at: item.received_at?.slice(0, 10) ?? "",
    estimated_completed_at: item.estimated_completed_at?.slice(0, 10) ?? "",
    completed_at: item.completed_at?.slice(0, 10) ?? "",
    deed_number: item.deed_number ?? "",
    notes: item.notes ?? "",
  };
}

function insuranceToForm(item: LegalProgressRecord): ProgressFormState {
  return {
    ...emptyProgressForm(insuranceStatusValue(item.status)),
    contract_id: item.contract_id,
    collateral_id: item.collateral_id ?? "",
    third_party_id: item.third_party_id,
    main_type: item.insurance_type ?? "",
    coverage_amount: String(item.coverage_amount ?? 0),
    premium_amount: String(item.premium_amount ?? 0),
    period_start: item.period_start?.slice(0, 10) ?? "",
    period_end: item.period_end?.slice(0, 10) ?? "",
    policy_number: item.policy_number ?? "",
    notes: item.notes ?? "",
  };
}

function kjppToForm(item: LegalProgressRecord): ProgressFormState {
  return {
    ...emptyProgressForm(item.status || "PROSES"),
    contract_id: item.contract_id,
    collateral_id: item.collateral_id ?? "",
    third_party_id: item.third_party_id,
    main_type: item.appraisal_type ?? "",
    received_at: item.received_at?.slice(0, 10) ?? "",
    estimated_completed_at: item.estimated_completed_at?.slice(0, 10) ?? "",
    completed_at: item.completed_at?.slice(0, 10) ?? "",
    report_number: item.report_number ?? "",
    collateral_object: item.collateral_object ?? "",
    appraisal_value: item.appraisal_value === null || item.appraisal_value === undefined ? "" : String(item.appraisal_value),
    notes: item.notes ?? "",
  };
}

function buildNotaryPayload(form: ProgressFormState): LegalNotaryPayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  return {
    contract_id: form.contract_id,
    collateral_id: form.collateral_id || null,
    third_party_id: form.third_party_id,
    deed_type: form.main_type,
    received_at: form.received_at,
    estimated_completed_at: form.estimated_completed_at || null,
    completed_at: form.completed_at || null,
    status: form.status,
    deed_number: form.deed_number || null,
    notes: form.notes || null,
    file: files[0] ?? null,
    files,
  };
}

function buildKjppPayload(form: ProgressFormState): LegalKjppPayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  return {
    contract_id: form.contract_id,
    collateral_id: form.collateral_id || null,
    third_party_id: form.third_party_id,
    appraisal_type: form.main_type,
    received_at: form.received_at,
    estimated_completed_at: form.estimated_completed_at || null,
    completed_at: form.completed_at || null,
    status: form.status,
    report_number: form.report_number || null,
    collateral_object: form.collateral_object || null,
    appraisal_value: toOptionalNumber(form.appraisal_value),
    notes: form.notes || null,
    file: files[0] ?? null,
    files,
  };
}

function buildInsurancePayload(form: ProgressFormState): LegalInsurancePayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  return {
    contract_id: form.contract_id,
    collateral_id: form.collateral_id || null,
    third_party_id: form.third_party_id,
    insurance_type: form.main_type,
    coverage_amount: toNumberInput(form.coverage_amount),
    premium_amount: toNumberInput(form.premium_amount),
    period_start: form.period_start,
    period_end: form.period_end || null,
    policy_number: form.policy_number || null,
    status: form.status,
    notes: form.notes || null,
    file: files[0] ?? null,
    files,
  };
}

export function LegalProgressClient({ type }: { type: LegalProgressType }) {
  const { openPreview } = useDocumentPreviewContext();
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const isNotary = type === "notary";
  const isKjpp = type === "kjpp";
  const config = isNotary
    ? {
        title: "Progress Pihak Ketiga Notaris",
        subtitle: "Pantau progress pengurusan akta dan dokumen notaris.",
        icon: <Landmark />,
        typeLabel: "Jenis Akta",
        dateLabel: "Tanggal Terima",
      }
    : isKjpp
      ? {
          title: "Progress Pihak Ketiga KJPP",
          subtitle: "Pantau progress penilaian agunan dan laporan KJPP.",
          icon: <Building2 />,
          typeLabel: "Jenis Penilaian",
          dateLabel: "Tanggal Terima",
        }
      : {
          title: "Progress Pihak Ketiga Asuransi",
          subtitle: "Pantau polis, masa berlaku, dan status asuransi.",
          icon: <ShieldCheck />,
          typeLabel: "Jenis Asuransi",
          dateLabel: "Tanggal Mulai",
        };
  const title = config.title;
  const subtitle = config.subtitle;
  const defaultStatus = isNotary || isKjpp ? "PROSES" : "AKTIF";
  const isDocumentProgress = isNotary || isKjpp;
  const lookups = useLegalLookups();
  const canCreate = hasCapability(pathname, "create");
  const canUpdate = hasCapability(pathname, "update");
  const canDelete = hasCapability(pathname, "delete");
  const [items, setItems] = useState<LegalProgressRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<LegalProgressRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<LegalProgressRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegalProgressRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ProgressFormState>(() => emptyProgressForm(defaultStatus));
  const collateralLookup = useContractCollateralOptions(form.contract_id);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = { page, limit: SETUP_TABLE_PAGE_SIZE, search };
      const result = isNotary
        ? await legalService.getNotaryPage(query)
        : isKjpp
          ? await legalService.getKjppPage(query)
          : await legalService.getInsurancePage(query);
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat progress legal", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isKjpp, isNotary, page, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!ensureCapability(pathname, "create")) return;
    setSelected(null);
    setForm(emptyProgressForm(defaultStatus));
    setIsModalOpen(true);
  };

  const openEdit = (item: LegalProgressRecord) => {
    if (!ensureCapability(pathname, "update")) return;
    setSelected(item);
    setForm(isNotary ? notaryToForm(item) : isKjpp ? kjppToForm(item) : insuranceToForm(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setForm(emptyProgressForm(defaultStatus));
  };

  const save = async () => {
    const normalizedStatus = String(form.status || defaultStatus).toUpperCase();
    if (!form.contract_id || !form.third_party_id || !form.main_type.trim()) {
      showToast("Kontrak, pihak ketiga, dan jenis progress wajib diisi", "warning");
      return;
    }
    if (isNotary && !form.received_at) {
      showToast("Tanggal terima wajib diisi", "warning");
      return;
    }
    if (isKjpp && !form.received_at) {
      showToast("Tanggal terima wajib diisi", "warning");
      return;
    }
    if (!isNotary && !isKjpp && !form.period_start) {
      showToast("Tanggal mulai polis wajib diisi", "warning");
      return;
    }
    if (isDocumentProgress && normalizedStatus === "PROSES" && !form.estimated_completed_at) {
      showToast("Estimasi selesai wajib diisi saat status Dalam Proses", "warning");
      return;
    }
    if (isDocumentProgress && normalizedStatus === "SELESAI" && !form.completed_at) {
      showToast("Tanggal selesai wajib diisi saat status Selesai", "warning");
      return;
    }
    if (isDocumentProgress && normalizedStatus !== "SELESAI" && form.completed_at) {
      showToast("Tanggal selesai hanya boleh diisi saat status Selesai", "warning");
      return;
    }
    setIsSaving(true);
    try {
      if (isNotary) {
        if (selected) await legalService.updateNotary(selected.id, buildNotaryPayload(form));
        else await legalService.createNotary(buildNotaryPayload(form));
      } else if (isKjpp) {
        if (selected) await legalService.updateKjpp(selected.id, buildKjppPayload(form));
        else await legalService.createKjpp(buildKjppPayload(form));
      } else if (selected) {
        await legalService.updateInsurance(selected.id, buildInsurancePayload(form));
      } else {
        await legalService.createInsurance(buildInsurancePayload(form));
      }
      showToast("Progress legal tersimpan", "success");
      closeModal();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan progress legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      if (isNotary) await legalService.removeNotary(deleteTarget.id);
      else if (isKjpp) await legalService.removeKjpp(deleteTarget.id);
      else await legalService.removeInsurance(deleteTarget.id);
      showToast("Progress legal dihapus", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus progress legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const thirdPartyOptions = isNotary
    ? lookups.notaryOptions
    : isKjpp
      ? lookups.kjppOptions
      : lookups.insuranceOptions;
  const processTypeOptions = isNotary
    ? lookups.notaryProcessOptions
    : isKjpp
      ? lookups.kjppProcessOptions
      : lookups.insuranceProcessOptions;
  const statusOptions = isNotary
    ? NOTARY_STATUS_OPTIONS
    : isKjpp
      ? KJPP_STATUS_OPTIONS
      : INSURANCE_STATUS_OPTIONS;
  const normalizedProgressStatus = String(form.status || defaultStatus).toUpperCase();
  const isProcessStatus = isDocumentProgress && normalizedProgressStatus === "PROSES";
  const isDoneStatus = isDocumentProgress && normalizedProgressStatus === "SELESAI";
  const handleStatusChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      status: value,
      completed_at: isDocumentProgress && value !== "SELESAI" ? "" : prev.completed_at,
    }));
  };

  const progressSummary = useMemo(() => {
    const doneStatuses = new Set(["SELESAI", "TERUPLOAD", "CAIR"]);
    const riskStatuses = new Set(["GAGAL", "DITOLAK", "BERMASALAH", "EXPIRED", "KLAIM"]);
    const done = items.filter((item) => doneStatuses.has(String(item.status).toUpperCase())).length;
    const risk = items.filter((item) => riskStatuses.has(String(item.status).toUpperCase())).length;
    return {
      total: meta.total || items.length,
      active: Math.max((meta.total || items.length) - done - risk, 0),
      done,
      risk,
    };
  }, [items, meta.total]);
  const progressTableColSpan = isNotary || isKjpp ? 9 : 10;

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader title={title} subtitle={subtitle} icon={config.icon} actions={canCreate ? <SetupAddButton label="Tambah Progress" onClick={openCreate} /> : null} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Progress" value={isLoading ? "-" : progressSummary.total} icon={ClipboardList} />
        <StatCard label="Masih Berjalan" value={isLoading ? "-" : progressSummary.active} icon={FileText} />
        <StatCard label="Selesai" value={isLoading ? "-" : progressSummary.done} icon={FileCheck2} />
        <StatCard label="Perlu Tindak Lanjut" value={isLoading ? "-" : progressSummary.risk} icon={ShieldCheck} />
      </div>
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <SetupTableCard variant="workflow">
        <SetupDataTable variant="workflow" density="compact" className={isNotary || isKjpp ? "min-w-[1220px]" : "min-w-[1320px]"}>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>{config.typeLabel}</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              {!isNotary && !isKjpp ? <SetupDataTableHeaderCell>Premi</SetupDataTableHeaderCell> : null}
              <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow
                key={item.id}
                className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
                onDoubleClick={() => setDetailTarget(item)}
              >
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTableCode>{item.contract?.no_kontrak ?? "-"}</SetupTableCode>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTablePrimaryText>{item.contract?.debtor?.name ?? "-"}</SetupTablePrimaryText>
                </SetupDataTableCell>
                <SetupDataTableCell>{item.collateral ? collateralOptionLabel(item.collateral) : "-"}</SetupDataTableCell>
                <SetupDataTableCell>{getRecordText(item.third_party, "name") || "-"}</SetupDataTableCell>
                <SetupDataTableCell>{isNotary ? item.deed_type ?? "-" : isKjpp ? item.appraisal_type ?? "-" : item.insurance_type ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                {!isNotary && !isKjpp ? <SetupDataTableCell>{formatCurrency(item.premium_amount)}</SetupDataTableCell> : null}
                <SetupDataTableCell>{formatDateOnly(isNotary || isKjpp ? item.received_at : item.period_start)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
                      {
                        key: "detail",
                        label: "Detail",
                        icon: Eye,
                        onClick: () => setDetailTarget(item),
                      },
                      {
                        key: "file",
                        label: "Preview",
                        icon: FileArchive,
                        disabled: !firstPreviewFile(item.files, item.file)?.url,
                        onClick: () => {
                          const previewFile = firstPreviewFile(item.files, item.file);
                          if (!previewFile?.url) return;
                          openFile(previewFile.url, previewFile.name, openPreview);
                        },
                      },
                      {
                        key: "edit",
                        label: "Ubah",
                        icon: Pencil,
                        disabled: !canUpdate,
                        onClick: () => openEdit(item),
                      },
                      {
                        key: "delete",
                        label: "Hapus",
                        icon: Trash2,
                        tone: "red",
                        disabled: !canDelete,
                        onClick: () => setDeleteTarget(item),
                      },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={progressTableColSpan}>Memuat progress legal...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={progressTableColSpan}
                tone="legal"
                description="Catat progress pihak ketiga berdasarkan kontrak supaya muncul di detail debitur."
                action={
                  canCreate ? (
                    <SetupAddButton label="Tambah Progress" onClick={openCreate} />
                  ) : undefined
                }
              >
                Belum ada progress legal.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </SetupTableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? `Ubah ${title}` : `Tambah ${title}`}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="max-h-[70vh] space-y-4 overflow-y-auto p-6"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SetupFormSection title="Kontrak dan Pihak Ketiga">
          <SelectField
            label="Kontrak"
            value={form.contract_id}
            options={lookups.contractOptions}
            required
            searchable
            loadOptions={loadContractSearchOptions}
            searchPlaceholder="Cari nomor kontrak atau nama debitur..."
            onChange={(value) =>
              setForm((prev) => ({ ...prev, contract_id: value, collateral_id: "" }))
            }
          />
          <SelectField
            label="Agunan"
            value={form.collateral_id}
            options={collateralLookup.collateralOptions}
            emptyLabel={form.contract_id ? "Tidak spesifik agunan" : "Pilih kontrak dulu"}
            disabled={!form.contract_id}
            searchable
            loadOptions={collateralLookup.loadOptions}
            searchPlaceholder="Cari nomor agunan, pemilik, atau bukti..."
            onChange={(value) => setForm((prev) => ({ ...prev, collateral_id: value }))}
          />
          <SelectField label="Pihak Ketiga" value={form.third_party_id} options={thirdPartyOptions} required searchable searchPlaceholder="Cari nama pihak ketiga..." onChange={(value) => setForm((prev) => ({ ...prev, third_party_id: value }))} />
          <SelectField label={config.typeLabel} value={form.main_type} options={processTypeOptions} required onChange={(value) => setForm((prev) => ({ ...prev, main_type: value }))} />
          <SelectField label="Status" value={form.status} options={statusOptions} includeEmpty={false} onChange={handleStatusChange} />
        </SetupFormSection>
        <SetupFormSection title={isNotary || isKjpp ? "Progress Dokumen" : "Informasi Polis"}>
          {isNotary || isKjpp ? (
            <>
              <DateField label={config.dateLabel} value={form.received_at} required onChange={(value) => setForm((prev) => ({ ...prev, received_at: value }))} />
              <DateField label="Estimasi Selesai" value={form.estimated_completed_at} required={isProcessStatus} onChange={(value) => setForm((prev) => ({ ...prev, estimated_completed_at: value }))} />
              <DateField label="Tanggal Selesai" value={form.completed_at} required={isDoneStatus} onChange={(value) => setForm((prev) => ({ ...prev, completed_at: value }))} />
              {isKjpp ? (
                <>
                  <TextField label="Nomor Laporan" value={form.report_number} onChange={(value) => setForm((prev) => ({ ...prev, report_number: value }))} />
                  <TextField label="Objek Jaminan" value={form.collateral_object} onChange={(value) => setForm((prev) => ({ ...prev, collateral_object: value }))} />
                  <TextField label="Nilai Taksasi" value={form.appraisal_value} type="number" onChange={(value) => setForm((prev) => ({ ...prev, appraisal_value: value }))} />
                </>
              ) : (
                <TextField label="Nomor Akta" value={form.deed_number} onChange={(value) => setForm((prev) => ({ ...prev, deed_number: value }))} />
              )}
            </>
          ) : (
            <>
              <DateField label="Mulai Polis" value={form.period_start} required onChange={(value) => setForm((prev) => ({ ...prev, period_start: value }))} />
              <DateField label="Akhir Polis" value={form.period_end} onChange={(value) => setForm((prev) => ({ ...prev, period_end: value }))} />
              <TextField label="Nilai Pertanggungan" value={form.coverage_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, coverage_amount: value }))} />
              <TextField label="Nomor Polis" value={form.policy_number} onChange={(value) => setForm((prev) => ({ ...prev, policy_number: value }))} />
              <TextField label="Nilai Premi" value={form.premium_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, premium_amount: value }))} />
            </>
          )}
        </SetupFormSection>
        <SetupFormSection title="Catatan dan File" contentClassName="md:grid-cols-1">
          <TextareaField label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
          <MultiFileUploadField
            id={`legal-progress-${type}-file`}
            required={false}
            label="File Pendukung"
            files={form.files.length > 0 ? form.files : form.file ? [form.file] : []}
            validateFile={validateDomainUploadFile}
            helperText="Tambah satu atau beberapa file pendukung untuk progress pihak ketiga ini."
            onChange={(files) => setForm((prev) => ({ ...prev, files, file: files[0] ?? null }))}
          />
        </SetupFormSection>
      </DashboardModal>
      <DashboardModal
        isOpen={Boolean(detailTarget)}
        title={`Detail ${title}`}
        description={detailTarget?.contract?.no_kontrak ?? undefined}
        onClose={() => setDetailTarget(null)}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] space-y-5 overflow-y-auto p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setDetailTarget(null)}
          >
            Tutup
          </button>
        }
      >
        {detailTarget ? (
          <>
            <LegalDetailSection
              title="Kontrak dan Pihak Ketiga"
              rows={[
                { label: "Nomor Kontrak", value: detailTarget.contract?.no_kontrak ?? "-" },
                { label: "Debitur", value: detailTarget.contract?.debtor?.name ?? "-" },
                {
                  label: "Agunan",
                  value: detailTarget.collateral
                    ? collateralOptionLabel(detailTarget.collateral)
                    : "-",
                },
                { label: "Pihak Ketiga", value: getRecordText(detailTarget.third_party, "name") || "-" },
                { label: "Status", value: <SetupStatusBadge status={statusLabel(detailTarget.status)} /> },
              ]}
            />
            <LegalDetailSection
              title="Detail Progress"
              rows={[
                {
                  label: config.typeLabel,
                  value: isNotary
                    ? detailTarget.deed_type ?? "-"
                    : isKjpp
                      ? detailTarget.appraisal_type ?? "-"
                      : detailTarget.insurance_type ?? "-",
                },
                {
                  label: config.dateLabel,
                  value: formatDateOnly(isNotary || isKjpp ? detailTarget.received_at : detailTarget.period_start),
                },
                {
                  label: isNotary ? "Nomor Akta" : isKjpp ? "Nomor Laporan" : "Nomor Polis",
                  value: isNotary
                    ? detailTarget.deed_number ?? "-"
                    : isKjpp
                      ? detailTarget.report_number ?? "-"
                      : detailTarget.policy_number ?? "-",
                },
                {
                  label: isKjpp ? "Objek Jaminan" : "Tanggal Selesai",
                  value: isKjpp
                    ? detailTarget.collateral_object ?? "-"
                    : formatDateOnly(isNotary ? detailTarget.completed_at : detailTarget.period_end),
                },
                {
                  label: isKjpp ? "Nilai Taksasi" : "Nilai Pertanggungan",
                  value: isKjpp
                    ? formatCurrency(detailTarget.appraisal_value)
                    : isNotary
                      ? "-"
                      : formatCurrency(detailTarget.coverage_amount),
                },
                ...(isNotary || isKjpp
                  ? []
                  : [
                      {
                        label: "Nilai Premi",
                        value: formatCurrency(detailTarget.premium_amount),
                      },
                    ]),
                { label: "Catatan", value: detailTarget.notes || "-" },
              ]}
            />
            <LegalDetailSection
              title="Dokumen"
              rows={[
                {
                  label: "Jumlah File",
                  value: String(resolvePreviewFiles(detailTarget.files, detailTarget.file).length || 0),
                },
                {
                  label: "Aksi",
                  value: (
                    <SetupFilePreviewGroup
                      file={detailTarget.file}
                      files={detailTarget.files}
                      onOpen={(previewFile) =>
                        openFile(previewFile.url, previewFile.name, openPreview)
                      }
                      align="start"
                    />
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </DashboardModal>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus progress legal?"
        itemName={deleteTarget?.contract?.no_kontrak ?? ""}
        entityLabel="progress legal"
        isLoading={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </DashboardPageShell>
  );
}

function emptyClaimForm(): ClaimFormState {
  return {
    contract_id: "",
    collateral_id: "",
    insurance_progress_id: "",
    policy_number: "",
    claim_type: "",
    claim_amount: "0",
    submitted_at: "",
    status: "PENGAJUAN",
    approved_amount: "",
    disbursed_amount: "",
    disbursed_at: "",
    rejection_reason: "",
    notes: "",
    file: null,
    files: [],
  };
}

function claimToForm(item: LegalClaim): ClaimFormState {
  return {
    contract_id: item.contract_id,
    collateral_id: item.collateral_id ?? item.insurance_progress?.collateral_id ?? "",
    insurance_progress_id: item.insurance_progress_id ?? "",
    policy_number: item.policy_number ?? "",
    claim_type: item.claim_type,
    claim_amount: String(item.claim_amount ?? 0),
    submitted_at: item.submitted_at?.slice(0, 10) ?? "",
    status: item.status || "PENGAJUAN",
    approved_amount: item.approved_amount === null ? "" : String(item.approved_amount ?? ""),
    disbursed_amount: item.disbursed_amount === null ? "" : String(item.disbursed_amount ?? ""),
    disbursed_at: item.disbursed_at?.slice(0, 10) ?? "",
    rejection_reason: item.rejection_reason ?? "",
    notes: item.notes ?? "",
    file: null,
    files: [],
  };
}

function buildClaimPayload(form: ClaimFormState): LegalClaimPayload {
  const files = form.files.length > 0 ? form.files : form.file ? [form.file] : [];
  return {
    contract_id: form.contract_id,
    collateral_id: form.collateral_id || null,
    insurance_progress_id: form.insurance_progress_id || null,
    policy_number: form.policy_number || null,
    claim_type: form.claim_type,
    claim_amount: toNumberInput(form.claim_amount),
    submitted_at: form.submitted_at,
    status: form.status,
    approved_amount: toOptionalNumber(form.approved_amount),
    disbursed_amount: toOptionalNumber(form.disbursed_amount),
    disbursed_at: form.disbursed_at || null,
    rejection_reason: form.rejection_reason || null,
    notes: form.notes || null,
    file: files[0] ?? null,
    files,
  };
}

export function LegalClaimClient() {
  const { openPreview } = useDocumentPreviewContext();
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const lookups = useLegalLookups({ insurance: true });
  const canCreate = hasCapability(pathname, "create");
  const canUpdate = hasCapability(pathname, "update");
  const canDelete = hasCapability(pathname, "delete");
  const [items, setItems] = useState<LegalClaim[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<LegalClaim | null>(null);
  const [detailTarget, setDetailTarget] = useState<LegalClaim | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegalClaim | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ClaimFormState>(() => emptyClaimForm());
  const collateralLookup = useContractCollateralOptions(form.contract_id);

  const insuranceOptions = useMemo(
    () =>
      lookups.insuranceProgress
        .filter((item) => !form.contract_id || item.contract_id === form.contract_id)
        .map<Option>((item) => ({
          value: item.id,
          label: `${item.policy_number ?? item.insurance_type ?? "Polis"} - ${item.contract?.no_kontrak ?? "Kontrak"}`,
        })),
    [form.contract_id, lookups.insuranceProgress],
  );

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await legalService.getClaimsPage({ page, limit: SETUP_TABLE_PAGE_SIZE, search });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat klaim", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!ensureCapability(pathname, "create")) return;
    setSelected(null);
    setForm(emptyClaimForm());
    setIsModalOpen(true);
  };

  const openEdit = (item: LegalClaim) => {
    if (!ensureCapability(pathname, "update")) return;
    setSelected(item);
    setForm(claimToForm(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setForm(emptyClaimForm());
  };

  const save = async () => {
    if (!form.contract_id || !form.claim_type.trim() || !form.submitted_at) {
      showToast("Kontrak, jenis klaim, dan tanggal pengajuan wajib diisi", "warning");
      return;
    }
    setIsSaving(true);
    try {
      if (selected) await legalService.updateClaim(selected.id, buildClaimPayload(form));
      else await legalService.createClaim(buildClaimPayload(form));
      showToast("Klaim legal tersimpan", "success");
      closeModal();
      await Promise.all([load(), lookups.reloadLookups()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan klaim legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await legalService.removeClaim(deleteTarget.id);
      showToast("Klaim legal dihapus", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus klaim legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader title="Klaim Asuransi" subtitle="Kelola proses klaim asuransi untuk kontrak debitur." icon={<FileCheck2 />} actions={canCreate ? <SetupAddButton label="Tambah Klaim" onClick={openCreate} /> : null} />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <SetupTableCard variant="workflow">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1220px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Agunan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Klaim</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow
                key={item.id}
                className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
                onDoubleClick={() => setDetailTarget(item)}
              >
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTableCode>{item.contract?.no_kontrak ?? "-"}</SetupTableCode>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTablePrimaryText>{item.contract?.debtor?.name ?? "-"}</SetupTablePrimaryText>
                </SetupDataTableCell>
                <SetupDataTableCell>{item.collateral ? collateralOptionLabel(item.collateral) : "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.claim_type}</SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTableMoney>{formatCurrency(item.claim_amount)}</SetupTableMoney>
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.submitted_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
                      {
                        key: "detail",
                        label: "Detail",
                        icon: Eye,
                        onClick: () => setDetailTarget(item),
                      },
                      {
                        key: "view",
                        label: "Preview",
                        icon: FileText,
                        disabled: !firstPreviewFile(item.files, item.file)?.url,
                        onClick: () => {
                          const previewFile = firstPreviewFile(item.files, item.file);
                          if (!previewFile?.url) return;
                          openFile(previewFile.url, previewFile.name, openPreview);
                        },
                      },
                      { key: "edit", label: "Ubah", icon: Pencil, disabled: !canUpdate, onClick: () => openEdit(item) },
                      { key: "delete", label: "Hapus", icon: Trash2, tone: "red", disabled: !canDelete, onClick: () => setDeleteTarget(item) },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={9}>Memuat klaim legal...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={9}
                tone="legal"
                description="Input klaim asuransi yang terkait kontrak dan progress asuransi."
                action={
                  canCreate ? (
                    <SetupAddButton label="Tambah Klaim" onClick={openCreate} />
                  ) : undefined
                }
              >
                Belum ada klaim legal.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </SetupTableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? "Ubah Klaim Asuransi" : "Tambah Klaim Asuransi"}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] space-y-4 overflow-y-auto p-6"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SetupFormSection title="Kontrak dan Klaim">
          <SelectField
            label="Kontrak"
            value={form.contract_id}
            options={lookups.contractOptions}
            required
            searchable
            loadOptions={loadContractSearchOptions}
            searchPlaceholder="Cari nomor kontrak atau nama debitur..."
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                contract_id: value,
                collateral_id: "",
                insurance_progress_id: "",
              }))
            }
          />
          <SelectField
            label="Agunan"
            value={form.collateral_id}
            options={collateralLookup.collateralOptions}
            emptyLabel={form.contract_id ? "Tidak spesifik agunan" : "Pilih kontrak dulu"}
            disabled={!form.contract_id}
            searchable
            loadOptions={collateralLookup.loadOptions}
            searchPlaceholder="Cari nomor agunan, pemilik, atau bukti..."
            onChange={(value) => setForm((prev) => ({ ...prev, collateral_id: value }))}
          />
          <SelectField
            label="Progress Asuransi"
            value={form.insurance_progress_id}
            options={insuranceOptions}
            emptyLabel="Opsional"
            onChange={(value) =>
              setForm((prev) => {
                const progress = lookups.insuranceProgress.find((item) => item.id === value);
                return {
                  ...prev,
                  insurance_progress_id: value,
                  collateral_id: progress?.collateral_id ?? prev.collateral_id,
                  policy_number: prev.policy_number || progress?.policy_number || "",
                };
              })
            }
          />
          <TextField label="Nomor Polis" value={form.policy_number} onChange={(value) => setForm((prev) => ({ ...prev, policy_number: value }))} />
          <SelectField label="Jenis Klaim" value={form.claim_type} options={lookups.claimTypeOptions} required onChange={(value) => setForm((prev) => ({ ...prev, claim_type: value }))} />
          <TextField label="Nominal Klaim" value={form.claim_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, claim_amount: value }))} />
          <DateField label="Tanggal Pengajuan" value={form.submitted_at} required onChange={(value) => setForm((prev) => ({ ...prev, submitted_at: value }))} />
        </SetupFormSection>
        <SetupFormSection title="Status dan Realisasi">
          <SelectField label="Status" value={form.status} options={CLAIM_STATUS_OPTIONS} includeEmpty={false} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} />
          <TextField label="Nominal Disetujui" value={form.approved_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, approved_amount: value }))} />
          <TextField label="Nominal Cair" value={form.disbursed_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, disbursed_amount: value }))} />
          <DateField label="Tanggal Cair" value={form.disbursed_at} onChange={(value) => setForm((prev) => ({ ...prev, disbursed_at: value }))} />
        </SetupFormSection>
        <SetupFormSection title="Catatan dan File" contentClassName="md:grid-cols-1">
          <TextareaField label="Alasan Ditolak" value={form.rejection_reason} onChange={(value) => setForm((prev) => ({ ...prev, rejection_reason: value }))} />
          <TextareaField label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
          <MultiFileUploadField
            id="legal-claim-file"
            required={false}
            label="File Klaim"
            files={form.files.length > 0 ? form.files : form.file ? [form.file] : []}
            validateFile={validateDomainUploadFile}
            helperText="Tambah satu atau beberapa file pendukung klaim."
            onChange={(files) => setForm((prev) => ({ ...prev, files, file: files[0] ?? null }))}
          />
        </SetupFormSection>
      </DashboardModal>
      <DashboardModal
        isOpen={Boolean(detailTarget)}
        title="Detail Klaim Asuransi"
        description={detailTarget?.contract?.no_kontrak ?? undefined}
        onClose={() => setDetailTarget(null)}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] space-y-5 overflow-y-auto p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setDetailTarget(null)}
          >
            Tutup
          </button>
        }
      >
        {detailTarget ? (
          <>
            <LegalDetailSection
              title="Kontrak dan Klaim"
              rows={[
                { label: "Nomor Kontrak", value: detailTarget.contract?.no_kontrak ?? "-" },
                { label: "Debitur", value: detailTarget.contract?.debtor?.name ?? "-" },
                {
                  label: "Agunan",
                  value: detailTarget.collateral
                    ? collateralOptionLabel(detailTarget.collateral)
                    : "-",
                },
                {
                  label: "Progress Asuransi",
                  value:
                    detailTarget.insurance_progress?.policy_number ||
                    detailTarget.insurance_progress?.insurance_type ||
                    "-",
                },
                { label: "Nomor Polis", value: detailTarget.policy_number || "-" },
                { label: "Status", value: <SetupStatusBadge status={statusLabel(detailTarget.status)} /> },
              ]}
            />
            <LegalDetailSection
              title="Nilai dan Realisasi"
              rows={[
                { label: "Jenis Klaim", value: detailTarget.claim_type || "-" },
                { label: "Nominal Klaim", value: formatCurrency(detailTarget.claim_amount) },
                { label: "Tanggal Pengajuan", value: formatDateOnly(detailTarget.submitted_at) },
                { label: "Nominal Disetujui", value: formatCurrency(detailTarget.approved_amount) },
                { label: "Nominal Cair", value: formatCurrency(detailTarget.disbursed_amount) },
                { label: "Tanggal Cair", value: formatDateOnly(detailTarget.disbursed_at) },
              ]}
            />
            <LegalDetailSection
              title="Catatan dan File"
              rows={[
                { label: "Alasan Ditolak", value: detailTarget.rejection_reason || "-" },
                { label: "Catatan", value: detailTarget.notes || "-" },
                {
                  label: "Jumlah File",
                  value: String(resolvePreviewFiles(detailTarget.files, detailTarget.file).length || 0),
                },
                {
                  label: "Aksi File",
                  value: (
                    <SetupFilePreviewGroup
                      file={detailTarget.file}
                      files={detailTarget.files}
                      onOpen={(previewFile) =>
                        openFile(previewFile.url, previewFile.name, openPreview)
                      }
                      align="start"
                    />
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </DashboardModal>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus klaim legal?"
        itemName={deleteTarget?.claim_type ?? ""}
        entityLabel="klaim legal"
        isLoading={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </DashboardPageShell>
  );
}

function emptyDepositForm(): DepositFormState {
  return {
    contract_id: "",
    deposit_type_id: "",
    third_party_id: "",
    notes: "",
    opening_transaction_date: "",
    opening_transaction_amount: "",
    opening_transaction_notes: "",
    opening_transaction_file: null,
    opening_transaction_files: [],
  };
}

function depositToForm(item: LegalDeposit): DepositFormState {
  return {
    contract_id: item.contract_id,
    deposit_type_id: item.deposit_type_id ?? "",
    third_party_id: item.third_party_id ?? "",
    notes: item.notes ?? "",
    opening_transaction_date: "",
    opening_transaction_amount: "",
    opening_transaction_notes: "",
    opening_transaction_file: null,
    opening_transaction_files: [],
  };
}

function buildDepositPayload(
  form: DepositFormState,
  type: string,
  selected: LegalDeposit | null,
): LegalDepositPayload {
  const payload: LegalDepositPayload = {
    type,
    contract_id: form.contract_id,
    deposit_type_id: form.deposit_type_id || null,
    third_party_id: type === "ANGSURAN" ? null : form.third_party_id || null,
    notes: form.notes || null,
  };
  if (!selected) {
    const amount = toOptionalNumber(form.opening_transaction_amount);
    const openingFiles =
      form.opening_transaction_files.length > 0
        ? form.opening_transaction_files
        : form.opening_transaction_file
          ? [form.opening_transaction_file]
          : [];
    if (amount && amount > 0 && form.opening_transaction_date) {
      payload.opening_transaction = {
        transaction_date: form.opening_transaction_date,
        action: "TITIPAN",
        amount,
        notes: form.opening_transaction_notes || null,
      };
      payload.file = openingFiles[0] ?? null;
      payload.files = openingFiles;
    }
  }
  return payload;
}

function emptyDepositTransactionForm(): DepositTransactionFormState {
  return {
    transaction_date: "",
    action: "PEMBAYARAN",
    amount: "0",
    notes: "",
    file: null,
    files: [],
  };
}

export function LegalDepositClient({ type, title }: { type: "ASURANSI" | "NOTARIS" | "ANGSURAN" | "LAINNYA"; title: string }) {
  const { openPreview } = useDocumentPreviewContext();
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const lookups = useLegalLookups();
  const canCreate = hasCapability(pathname, "create");
  const canUpdate = hasCapability(pathname, "update");
  const canDelete = hasCapability(pathname, "delete");
  const [items, setItems] = useState<LegalDeposit[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<LegalDeposit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegalDeposit | null>(null);
  const [transactionTarget, setTransactionTarget] = useState<LegalDeposit | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LegalDeposit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<DepositFormState>(() => emptyDepositForm());
  const [transactionForm, setTransactionForm] = useState<DepositTransactionFormState>(() => emptyDepositTransactionForm());
  const depositTypeOptions = useMemo(
    () =>
      toParameterOptions(
        lookups.depositTypes.filter((item) => recordCategory(item) === type),
      ),
    [lookups.depositTypes, type],
  );
  const thirdPartyOptions = useMemo(() => {
    if (type === "NOTARIS") return lookups.notaryOptions;
    if (type === "ASURANSI") return lookups.insuranceOptions;
    if (type === "LAINNYA") return lookups.thirdPartyOptions;
    return [];
  }, [lookups.insuranceOptions, lookups.notaryOptions, lookups.thirdPartyOptions, type]);
  const canUseThirdParty = type !== "ANGSURAN";

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await legalService.getDepositsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search,
        type,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat dana titipan", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, showToast, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!ensureCapability(pathname, "create")) return;
    setSelected(null);
    setForm(emptyDepositForm());
    setIsModalOpen(true);
  };

  const openEdit = (item: LegalDeposit) => {
    if (!ensureCapability(pathname, "update")) return;
    setSelected(item);
    setForm({
      ...depositToForm(item),
      third_party_id: canUseThirdParty ? item.third_party_id ?? "" : "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setForm(emptyDepositForm());
  };

  const closeTransactionModal = () => {
    setTransactionTarget(null);
    setTransactionForm(emptyDepositTransactionForm());
  };

  const save = async () => {
    if (!form.contract_id) {
      showToast("Kontrak wajib dipilih", "warning");
      return;
    }
    if (!selected) {
      const openingAmount = toOptionalNumber(form.opening_transaction_amount);
      if (openingAmount && openingAmount > 0 && !form.opening_transaction_date) {
        showToast("Tanggal titipan awal wajib diisi jika nominal titipan awal diisi", "warning");
        return;
      }
      if (
        (form.opening_transaction_files.length > 0 || form.opening_transaction_file) &&
        (!openingAmount || openingAmount <= 0)
      ) {
        showToast("Nominal titipan awal wajib diisi jika mengunggah file pendukung", "warning");
        return;
      }
    }
    setIsSaving(true);
    try {
      if (selected) await legalService.updateDeposit(selected.id, buildDepositPayload(form, type, selected));
      else await legalService.createDeposit(buildDepositPayload(form, type, null));
      showToast("Dana titipan tersimpan", "success");
      closeModal();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan dana titipan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await legalService.removeDeposit(deleteTarget.id);
      showToast("Dana titipan dihapus", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus dana titipan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveTransaction = async () => {
    if (!transactionTarget || !transactionForm.transaction_date) {
      showToast("Tanggal transaksi wajib diisi", "warning");
      return;
    }
    if (toNumberInput(transactionForm.amount) <= 0) {
      showToast("Nominal transaksi wajib lebih dari 0", "warning");
      return;
    }
    const payload: LegalDepositTransactionPayload = {
      deposit_id: transactionTarget.id,
      transaction_date: transactionForm.transaction_date,
      action: transactionForm.action,
      amount: toNumberInput(transactionForm.amount),
      notes: transactionForm.notes || null,
      file:
        transactionForm.files.length > 0
          ? transactionForm.files[0] ?? null
          : transactionForm.file,
      files:
        transactionForm.files.length > 0
          ? transactionForm.files
          : transactionForm.file
            ? [transactionForm.file]
            : [],
    };
    setIsSaving(true);
    try {
      await legalService.createDepositTransaction(payload);
      showToast("Transaksi dana titipan tersimpan", "success");
      closeTransactionModal();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan transaksi dana titipan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader title={title} subtitle="Kelola dana titipan yang terhubung ke kontrak debitur." icon={<Banknote />} actions={canCreate ? <SetupAddButton label="Tambah Titipan" onClick={openCreate} /> : null} />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <SetupTableCard variant="workflow">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1240px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Total Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pembayaran</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Refund</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Saldo Akhir</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow
                key={item.id}
                className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
                onDoubleClick={() => setHistoryTarget(item)}
              >
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTableCode>{item.contract?.no_kontrak ?? "-"}</SetupTableCode>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTablePrimaryText>{item.contract?.debtor?.name ?? "-"}</SetupTablePrimaryText>
                </SetupDataTableCell>
                <SetupDataTableCell>{getRecordText(item.deposit_type, "name", "label") || depositTypeLabel(item.type)}</SetupDataTableCell>
                <SetupDataTableCell><SetupTableMoney>{formatCurrency(item.total_deposit_amount ?? item.nominal)}</SetupTableMoney></SetupDataTableCell>
                <SetupDataTableCell><SetupTableMoney>{formatCurrency(item.total_payment_amount ?? item.paid_amount)}</SetupTableMoney></SetupDataTableCell>
                <SetupDataTableCell><SetupTableMoney>{formatCurrency(item.total_refund_amount ?? item.processed_amount)}</SetupTableMoney></SetupDataTableCell>
                <SetupDataTableCell><SetupTableMoney>{formatCurrency(item.balance_amount ?? item.remaining_amount)}</SetupTableMoney></SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
                      { key: "detail", label: "Detail", icon: Eye, onClick: () => setHistoryTarget(item) },
                      {
                        key: "transaction",
                        label: "Transaksi",
                        icon: Banknote,
                        disabled: !canCreate,
                        onClick: () => {
                          setTransactionTarget(item);
                          setTransactionForm(emptyDepositTransactionForm());
                        },
                      },
                      { key: "edit", label: "Ubah", icon: Pencil, disabled: !canUpdate, onClick: () => openEdit(item) },
                      { key: "delete", label: "Hapus", icon: Trash2, tone: "red", disabled: !canDelete, onClick: () => setDeleteTarget(item) },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={10}>Memuat dana titipan...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableEmptyRow
                colSpan={10}
                tone="legal"
                description="Input titipan berdasarkan kontrak agar saldo dan transaksi bisa dipantau."
                action={
                  canCreate ? (
                    <SetupAddButton label="Tambah Titipan" onClick={openCreate} />
                  ) : undefined
                }
              >
                Belum ada dana titipan.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </SetupTableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? `Ubah ${title}` : `Tambah ${title}`}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="max-h-[70vh] space-y-4 overflow-y-auto p-6"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SetupFormSection title="Relasi Titipan">
          <SelectField label="Kontrak" value={form.contract_id} options={lookups.contractOptions} required searchable loadOptions={loadContractSearchOptions} searchPlaceholder="Cari nomor kontrak atau nama debitur..." onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))} />
          <SelectField label="Jenis Titipan" value={form.deposit_type_id} options={depositTypeOptions} emptyLabel="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, deposit_type_id: value }))} />
          {canUseThirdParty ? (
            <SelectField label="Pihak Ketiga" value={form.third_party_id} options={thirdPartyOptions} emptyLabel="Opsional" searchable searchPlaceholder="Cari nama pihak ketiga..." onChange={(value) => setForm((prev) => ({ ...prev, third_party_id: value }))} />
          ) : (
            <SelectField label="Pihak Ketiga" value="" options={[]} emptyLabel="Tidak dipakai untuk titipan angsuran" disabled onChange={() => undefined} />
          )}
        </SetupFormSection>
        {!selected ? (
          <SetupFormSection title="Transaksi Awal Titipan">
            <DateField label="Tanggal Titipan" value={form.opening_transaction_date} onChange={(value) => setForm((prev) => ({ ...prev, opening_transaction_date: value }))} />
            <TextField label="Nominal Titipan" value={form.opening_transaction_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, opening_transaction_amount: value }))} />
            <TextareaField label="Catatan Titipan Awal" value={form.opening_transaction_notes} onChange={(value) => setForm((prev) => ({ ...prev, opening_transaction_notes: value }))} />
            <MultiFileUploadField
              id="legal-deposit-opening-file"
              label="File Pendukung"
              required={false}
              files={
                form.opening_transaction_files.length > 0
                  ? form.opening_transaction_files
                  : form.opening_transaction_file
                    ? [form.opening_transaction_file]
                    : []
              }
              validateFile={validateDomainUploadFile}
              helperText="Tambah satu atau beberapa file pendukung titipan awal."
              onChange={(files) =>
                setForm((prev) => ({
                  ...prev,
                  opening_transaction_files: files,
                  opening_transaction_file: files[0] ?? null,
                }))
              }
            />
          </SetupFormSection>
        ) : null}
        <SetupFormSection title="Catatan" contentClassName="md:grid-cols-1">
          <TextareaField label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
        </SetupFormSection>
      </DashboardModal>
      <DashboardModal
        isOpen={Boolean(transactionTarget)}
        title="Tambah Transaksi Titipan"
        description={transactionTarget?.contract?.no_kontrak}
        onClose={closeTransactionModal}
        closeDisabled={isSaving}
        maxWidth="2xl"
        bodyClassName="p-6"
        footer={<ModalFooter onClose={closeTransactionModal} onSave={() => void saveTransaction()} isSaving={isSaving} />}
      >
        <SetupFormSection title="Detail Transaksi">
          <DateField label="Tanggal Transaksi" value={transactionForm.transaction_date} required onChange={(value) => setTransactionForm((prev) => ({ ...prev, transaction_date: value }))} />
          <SelectField label="Jenis Transaksi" value={transactionForm.action} options={DEPOSIT_TRANSACTION_ACTION_OPTIONS} includeEmpty={false} onChange={(value) => setTransactionForm((prev) => ({ ...prev, action: value }))} />
          <TextField label="Nominal" value={transactionForm.amount} type="number" required onChange={(value) => setTransactionForm((prev) => ({ ...prev, amount: value }))} />
          <TextareaField label="Catatan" value={transactionForm.notes} onChange={(value) => setTransactionForm((prev) => ({ ...prev, notes: value }))} />
          <MultiFileUploadField
            id="legal-deposit-transaction-file"
            label="File Pendukung"
            required={false}
            files={transactionForm.files.length > 0 ? transactionForm.files : transactionForm.file ? [transactionForm.file] : []}
            validateFile={validateDomainUploadFile}
            helperText="Tambah satu atau beberapa file bukti transaksi."
            onChange={(files) =>
              setTransactionForm((prev) => ({ ...prev, files, file: files[0] ?? null }))
            }
          />
        </SetupFormSection>
      </DashboardModal>
      <DashboardModal
        isOpen={Boolean(historyTarget)}
        title="Detail Dana Titipan"
        description={historyTarget?.contract?.no_kontrak ?? undefined}
        onClose={() => setHistoryTarget(null)}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] space-y-5 overflow-y-auto p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setHistoryTarget(null)}
          >
            Tutup
          </button>
        }
      >
        <LegalDetailSection
          title="Relasi Titipan"
          rows={[
            { label: "Nomor Kontrak", value: historyTarget?.contract?.no_kontrak ?? "-" },
            { label: "Debitur", value: historyTarget?.contract?.debtor?.name ?? "-" },
            {
              label: "Jenis Titipan",
              value:
                getRecordText(historyTarget?.deposit_type, "name", "label") ||
                depositTypeLabel(historyTarget?.type),
            },
            {
              label: "Pihak Ketiga",
              value: getRecordText(historyTarget?.third_party, "name") || "-",
            },
            { label: "Status", value: <SetupStatusBadge status={statusLabel(historyTarget?.status)} /> },
            { label: "Catatan", value: historyTarget?.notes || "-" },
          ]}
        />
        <div className="grid gap-3 md:grid-cols-4">
          <InfoItem label="Total Titipan" value={formatCurrency(historyTarget?.total_deposit_amount ?? historyTarget?.nominal)} />
          <InfoItem label="Pembayaran" value={formatCurrency(historyTarget?.total_payment_amount ?? historyTarget?.paid_amount)} />
          <InfoItem label="Refund" value={formatCurrency(historyTarget?.total_refund_amount ?? historyTarget?.processed_amount)} />
          <InfoItem label="Saldo Akhir" value={formatCurrency(historyTarget?.balance_amount ?? historyTarget?.remaining_amount)} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-gray-500">
            Riwayat Transaksi
          </h3>
          <SetupTableCard variant="nested">
            <SetupDataTable variant="nested" density="compact" className="min-w-[760px]">
              <SetupDataTableHead>
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Catatan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>File</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {(historyTarget?.transactions ?? []).map((transaction, index) => (
                  <SetupDataTableRow key={transaction.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{index + 1}</SetupDataTableCell>
                    <SetupDataTableCell>{formatDateOnly(transaction.transaction_date)}</SetupDataTableCell>
                    <SetupDataTableCell>{depositActionLabel(transaction.action)}</SetupDataTableCell>
                    <SetupDataTableCell><SetupTableMoney>{formatCurrency(transaction.amount)}</SetupTableMoney></SetupDataTableCell>
                    <SetupDataTableCell>{transaction.notes || "-"}</SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupFilePreviewGroup
                        file={transaction.file}
                        files={transaction.files}
                        label="Lihat File"
                        onOpen={(previewFile) =>
                          openFile(previewFile.url, previewFile.name, openPreview)
                        }
                      />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}
                {(historyTarget?.transactions ?? []).length === 0 ? (
                  <SetupDataTableEmptyRow colSpan={6}>
                    Belum ada transaksi pada dana titipan ini.
                  </SetupDataTableEmptyRow>
                ) : null}
              </SetupDataTableBody>
            </SetupDataTable>
          </SetupTableCard>
        </div>
      </DashboardModal>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus dana titipan?"
        itemName={deleteTarget?.contract?.no_kontrak ?? ""}
        entityLabel="dana titipan"
        isLoading={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </DashboardPageShell>
  );
}

type AuditActionMeta = {
  badgeLabel: string;
  modalSuffix: string;
  tone: SetupStatusTone;
  icon: LucideIcon;
};

type AuditDisplayEntry = {
  key: string;
  label: string;
  value: string;
};

type AuditChangeEntry = {
  key: string;
  label: string;
  before: string;
  after: string;
};

const AUDIT_FIELD_LABELS: Record<string, string> = {
  type: "Jenis Dana Titipan",
  status: "Status",
  action: "Jenis Transaksi",
  amount: "Nominal",
  nominal: "Nominal Titipan",
  paid_amount: "Total Pembayaran",
  processed_amount: "Total Diproses",
  remaining_amount: "Saldo Tersisa",
  transaction_date: "Tanggal Transaksi",
  notes: "Catatan",
  deed_type: "Jenis Akta",
  deed_number: "Nomor Akta",
  received_at: "Tanggal Diterima",
  estimated_completed_at: "Estimasi Selesai",
  completed_at: "Tanggal Selesai",
  insurance_type: "Jenis Asuransi",
  coverage_amount: "Nilai Pertanggungan",
  premium_amount: "Nilai Premi",
  period_start: "Periode Mulai",
  period_end: "Periode Berakhir",
  policy_number: "Nomor Polis",
  appraisal_type: "Jenis Penilaian",
  report_number: "Nomor Laporan",
  collateral_object: "Objek Agunan",
  appraisal_value: "Nilai Penilaian",
  claim_type: "Jenis Klaim",
  claim_amount: "Nilai Klaim",
  submitted_at: "Tanggal Pengajuan",
  approved_amount: "Nilai Disetujui",
  disbursed_amount: "Nilai Pencairan",
  disbursed_at: "Tanggal Pencairan",
  rejection_reason: "Alasan Penolakan",
  file_name: "File Pendukung",
};

const AUDIT_HIDDEN_FIELDS = new Set([
  "id",
  "file_name",
  "file_path",
  "contract_id",
  "collateral_id",
  "third_party_id",
  "deposit_id",
  "deposit_type_id",
  "insurance_progress_id",
]);

const AUDIT_CURRENCY_FIELDS = new Set([
  "amount",
  "nominal",
  "paid_amount",
  "processed_amount",
  "remaining_amount",
  "coverage_amount",
  "premium_amount",
  "appraisal_value",
  "claim_amount",
  "approved_amount",
  "disbursed_amount",
]);

const AUDIT_DATE_FIELDS = new Set([
  "transaction_date",
  "received_at",
  "estimated_completed_at",
  "completed_at",
  "period_start",
  "period_end",
  "submitted_at",
  "disbursed_at",
]);

function getAuditActionMeta(action: string | null | undefined): AuditActionMeta {
  switch (String(action || "").toUpperCase()) {
    case "CREATE":
      return {
        badgeLabel: "Data Ditambahkan",
        modalSuffix: "Dibuat",
        tone: "emerald",
        icon: FilePlus2,
      };
    case "UPDATE":
      return {
        badgeLabel: "Data Diubah",
        modalSuffix: "Diubah",
        tone: "blue",
        icon: Pencil,
      };
    case "DELETE":
      return {
        badgeLabel: "Data Dihapus",
        modalSuffix: "Dihapus",
        tone: "red",
        icon: Trash2,
      };
    default:
      return {
        badgeLabel: "Aktivitas Tercatat",
        modalSuffix: "Tercatat",
        tone: "slate",
        icon: Activity,
      };
  }
}

function getAuditEntityLabel(entityType: string | null | undefined) {
  return optionLabel(LEGAL_AUDIT_ENTITY_OPTIONS, entityType);
}

function getAuditSourceLabel(source: string | null | undefined) {
  return optionLabel(LEGAL_AUDIT_SOURCE_OPTIONS, source);
}

function getAuditText(data: Record<string, unknown> | null, key: string) {
  const value = data?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getAuditNumber(data: Record<string, unknown> | null, key: string) {
  const value = data?.[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function humanizeAuditCode(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAuditSnapshotValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (AUDIT_CURRENCY_FIELDS.has(key)) {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? formatCurrency(parsed) : "-";
  }
  if (AUDIT_DATE_FIELDS.has(key)) return formatDateOnly(String(value));
  if (key === "action") {
    return optionLabel(DEPOSIT_TRANSACTION_ACTION_OPTIONS, String(value));
  }
  if (key === "status" || key === "type") return humanizeAuditCode(value);
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function getAuditDisplayEntries(
  data: Record<string, unknown> | null,
): AuditDisplayEntry[] {
  return Object.entries(data ?? {})
    .filter(([key]) => !AUDIT_HIDDEN_FIELDS.has(key))
    .map(([key, value]) => ({
      key,
      label: AUDIT_FIELD_LABELS[key] ?? humanizeAuditCode(key),
      value: formatAuditSnapshotValue(key, value),
    }));
}

function getAuditChangeEntries(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChangeEntry[] {
  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  );

  return keys
    .filter((key) => !AUDIT_HIDDEN_FIELDS.has(key))
    .filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null))
    .map((key) => ({
      key,
      label: AUDIT_FIELD_LABELS[key] ?? humanizeAuditCode(key),
      before: formatAuditSnapshotValue(key, before?.[key]),
      after: formatAuditSnapshotValue(key, after?.[key]),
    }));
}

function getAuditFile(data: Record<string, unknown> | null): DebtorFileMeta | null {
  const url = getAuditText(data, "file_path");
  const name = getAuditText(data, "file_name");
  if (!url && !name) return null;
  return {
    name,
    url,
    mime_type: null,
    size_bytes: null,
  };
}

function buildAuditDescription(item: LegalActivityLog) {
  const actorName = item.actor?.name || item.actor?.username || "User sistem";
  const entityLabel = getAuditEntityLabel(item.entity_type).toLowerCase();
  const action = String(item.action || "").toUpperCase();
  const snapshot = item.after_data ?? item.before_data;
  const contractNumber = item.contract?.no_kontrak;
  const debtorName = item.contract?.debtor?.name;
  const context = contractNumber
    ? ` untuk kontrak ${contractNumber}${debtorName ? ` atas nama ${debtorName}` : ""}`
    : debtorName
      ? ` untuk nasabah ${debtorName}`
      : "";

  if (item.entity_type === "LEGAL_DEPOSIT_TRANSACTION" && action === "CREATE") {
    const transactionType = optionLabel(
      DEPOSIT_TRANSACTION_ACTION_OPTIONS,
      getAuditText(snapshot, "action"),
    ).toLowerCase();
    const amount = getAuditNumber(snapshot, "amount");
    return `${actorName} mencatat transaksi ${transactionType}${amount !== null ? ` sebesar ${formatCurrency(amount)}` : ""}${context}.`;
  }

  if (action === "UPDATE") {
    const beforeStatus = item.before_data?.status;
    const afterStatus = item.after_data?.status;
    if (beforeStatus !== afterStatus && afterStatus !== undefined) {
      return `${actorName} mengubah status ${entityLabel} dari ${formatAuditSnapshotValue("status", beforeStatus)} menjadi ${formatAuditSnapshotValue("status", afterStatus)}${context}.`;
    }
    return `${actorName} memperbarui ${entityLabel}${context}.`;
  }

  if (action === "DELETE") return `${actorName} menghapus ${entityLabel}${context}.`;
  if (action === "CREATE") return `${actorName} menambahkan ${entityLabel}${context}.`;
  return `${actorName} melakukan aktivitas pada ${entityLabel}${context}.`;
}

function buildAuditModalTitle(item: LegalActivityLog | null) {
  if (!item) return "Detail Audit Aktivitas";
  return `${getAuditEntityLabel(item.entity_type)} ${getAuditActionMeta(item.action).modalSuffix}`;
}

function parseAuditUserAgent(userAgent: string | null | undefined) {
  const value = String(userAgent || "");
  const version = (pattern: RegExp) => value.match(pattern)?.[1]?.split(".")[0] ?? "";
  const device = /iPad|Tablet/i.test(value)
    ? "Tablet"
    : /Mobile|iPhone|Android/i.test(value)
      ? "Mobile"
      : value
        ? "Desktop"
        : "-";
  const operatingSystem = /Windows NT/i.test(value)
    ? "Windows"
    : /Android[ /]([\d.]+)/i.test(value)
      ? `Android ${value.match(/Android[ /]([\d.]+)/i)?.[1] ?? ""}`.trim()
      : /iPhone OS ([\d_]+)/i.test(value)
        ? `iOS ${(value.match(/iPhone OS ([\d_]+)/i)?.[1] ?? "").replace(/_/g, ".")}`.trim()
        : /Mac OS X ([\d_]+)/i.test(value)
          ? `macOS ${(value.match(/Mac OS X ([\d_]+)/i)?.[1] ?? "").replace(/_/g, ".")}`.trim()
          : /Linux/i.test(value)
            ? "Linux"
            : value
              ? "Tidak teridentifikasi"
              : "-";

  let browserName = "-";
  if (/Edg\//i.test(value)) browserName = `Microsoft Edge ${version(/Edg\/([\d.]+)/i)}`.trim();
  else if (/OPR\//i.test(value)) browserName = `Opera ${version(/OPR\/([\d.]+)/i)}`.trim();
  else if (/Chrome\//i.test(value)) browserName = `Chrome ${version(/Chrome\/([\d.]+)/i)}`.trim();
  else if (/Firefox\//i.test(value)) browserName = `Firefox ${version(/Firefox\/([\d.]+)/i)}`.trim();
  else if (/Safari\//i.test(value)) browserName = `Safari ${version(/Version\/([\d.]+)/i)}`.trim();
  else if (value) browserName = "Tidak teridentifikasi";

  return { device, operatingSystem, browserName };
}

function AuditMetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function AuditActivityOverview({ item }: { item: LegalActivityLog }) {
  const actionMeta = getAuditActionMeta(item.action);
  const ActionIcon = actionMeta.icon;

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
            <ActionIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
              Ringkasan Aktivitas
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">
              {buildAuditDescription(item)}
            </p>
          </div>
        </div>
        <SetupStatusBadge
          status={actionMeta.badgeLabel}
          label={actionMeta.badgeLabel}
          tone={actionMeta.tone}
          icon={actionMeta.icon}
          wrap
        />
      </div>
      <dl className="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <AuditMetaItem
          label="Pelaku"
          value={
            <span>
              {item.actor?.name || item.actor?.username || "User sistem"}
              {item.actor?.username && item.actor.username !== item.actor.name ? (
                <span className="mt-0.5 block text-xs font-medium text-gray-500">
                  @{item.actor.username}
                </span>
              ) : null}
            </span>
          }
        />
        <AuditMetaItem label="Divisi" value={item.actor?.division_name || "-"} />
        <AuditMetaItem label="Waktu" value={formatDateTime(item.created_at)} />
        <AuditMetaItem label="Sumber" value={getAuditSourceLabel(item.source)} />
      </dl>
      <dl className="grid border-t border-gray-100 sm:grid-cols-2 lg:grid-cols-4">
        <AuditMetaItem label="Jenis Data" value={getAuditEntityLabel(item.entity_type)} />
        <AuditMetaItem label="Kontrak" value={item.contract?.no_kontrak || "-"} />
        <AuditMetaItem label="Nasabah" value={item.contract?.debtor?.name || "-"} />
        <AuditMetaItem
          label="Pihak Ketiga"
          value={getRecordText(item.third_party, "name") || "-"}
        />
      </dl>
    </section>
  );
}

function AuditSnapshotSection({
  title,
  description,
  data,
  onPreview,
}: {
  title: string;
  description: string;
  data: Record<string, unknown> | null;
  onPreview: (file: DebtorFileMeta) => void;
}) {
  const entries = getAuditDisplayEntries(data);
  const file = getAuditFile(data);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-600">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {entries.length > 0 || file ? (
        <dl className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className="grid gap-1 px-4 py-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start sm:gap-4"
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500">
                {entry.label}
              </dt>
              <dd className="break-words text-sm font-semibold text-gray-900">{entry.value}</dd>
            </div>
          ))}
          {file ? (
            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500">
                File Pendukung
              </dt>
              <dd>
                <SetupFilePreviewGroup file={file} align="start" onOpen={onPreview} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="px-4 py-5 text-sm font-medium text-gray-500">
          Tidak ada detail data yang dapat ditampilkan.
        </p>
      )}
    </section>
  );
}

function AuditChangeSection({
  item,
  onPreview,
}: {
  item: LegalActivityLog;
  onPreview: (file: DebtorFileMeta) => void;
}) {
  const changes = getAuditChangeEntries(item.before_data, item.after_data);
  const beforeFile = getAuditFile(item.before_data);
  const afterFile = getAuditFile(item.after_data);
  const fileChanged =
    beforeFile?.url !== afterFile?.url || beforeFile?.name !== afterFile?.name;

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-600">
          Perubahan Data
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Hanya field yang benar-benar berubah yang ditampilkan.
        </p>
      </div>
      {changes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-[0.06em] text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Sebelum</th>
                <th className="px-4 py-3 font-semibold">Sesudah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {changes.map((change) => (
                <tr key={change.key}>
                  <th className="px-4 py-3 font-semibold text-gray-700">{change.label}</th>
                  <td className="break-words px-4 py-3 text-gray-600">{change.before}</td>
                  <td className="break-words px-4 py-3 font-semibold text-gray-900">{change.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-5 text-sm font-medium text-gray-500">
          Tidak ada perubahan field utama yang tercatat.
        </p>
      )}
      {fileChanged ? (
        <div className="grid gap-2 border-t border-gray-100 px-4 py-3 sm:grid-cols-[190px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500">
            File Pendukung
          </p>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">
              Sebelum
            </p>
            <p className="break-words text-sm text-gray-600">{beforeFile?.name || "-"}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">
              Sesudah
            </p>
            {afterFile ? (
              <SetupFilePreviewGroup file={afterFile} align="start" onOpen={onPreview} />
            ) : (
              <p className="text-sm font-semibold text-gray-900">-</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AuditActionDataSection({
  item,
  onPreview,
}: {
  item: LegalActivityLog;
  onPreview: (file: DebtorFileMeta) => void;
}) {
  const action = String(item.action || "").toUpperCase();
  if (action === "CREATE") {
    return (
      <AuditSnapshotSection
        title="Data yang Ditambahkan"
        description="Data berikut tercatat otomatis saat aktivitas dilakukan."
        data={item.after_data}
        onPreview={onPreview}
      />
    );
  }
  if (action === "DELETE") {
    return (
      <AuditSnapshotSection
        title="Data Sebelum Dihapus"
        description="Snapshot terakhir sebelum data dihapus dari proses aktif."
        data={item.before_data}
        onPreview={onPreview}
      />
    );
  }
  return <AuditChangeSection item={item} onPreview={onPreview} />;
}

function AuditDeviceAndSystem({ item }: { item: LegalActivityLog }) {
  const device = parseAuditUserAgent(item.user_agent);
  const references = [
    { label: "ID Aktivitas", value: item.id },
    { label: "ID Data", value: item.entity_id },
    { label: "ID Dana Titipan", value: item.deposit_id },
    { label: "ID Transaksi", value: item.deposit_transaction_id },
  ].filter((entry) => Boolean(entry.value));

  return (
    <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-bold text-gray-800 marker:hidden">
        <Monitor className="h-5 w-5 text-sky-700" aria-hidden="true" />
        <span>Informasi Perangkat &amp; Sistem</span>
        <span className="ms-auto text-xs font-medium text-gray-400">Opsional</span>
        <ChevronDown
          className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-gray-100">
        <dl className="grid divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <AuditMetaItem label="Perangkat" value={device.device} />
          <AuditMetaItem label="Sistem Operasi" value={device.operatingSystem} />
          <AuditMetaItem label="Browser" value={device.browserName} />
        </dl>
        {references.length > 0 ? (
          <dl className="grid border-t border-gray-100 sm:grid-cols-2">
            {references.map((reference) => (
              <AuditMetaItem key={reference.label} label={reference.label} value={reference.value || "-"} />
            ))}
          </dl>
        ) : null}
      </div>
    </details>
  );
}

function LegalActivityLogSection() {
  const { showToast } = useAppToast();
  const { openPreview } = useDocumentPreviewContext();
  const [items, setItems] = useState<LegalActivityLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState<LegalActivityLog | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await legalService.getActivityLogsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search,
        action,
        entity_type: entityType,
        source,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat audit aktivitas legal", "error");
    } finally {
      setIsLoading(false);
    }
  }, [action, dateFrom, dateTo, entityType, page, search, showToast, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAuditFile = useCallback(
    (file: DebtorFileMeta) => openFile(file.url, file.name, openPreview),
    [openPreview],
  );

  const handleDateFromChange = (value: string) => {
    setPage(1);
    setDateFrom(value);
    if (value && dateTo && value > dateTo) setDateTo("");
  };

  const handleDateToChange = (value: string) => {
    if (value && dateFrom && value < dateFrom) {
      showToast("Tanggal akhir tidak boleh lebih awal dari tanggal mulai", "error");
      return;
    }
    setPage(1);
    setDateTo(value);
  };

  const selectFilters = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
          Aktivitas
        </p>
        <SetupSelect
          value={action}
          onChange={(event) => {
            setPage(1);
            setAction(event.target.value);
          }}
        >
          <option value="">Semua Aksi</option>
          {LEGAL_AUDIT_ACTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
          Jenis Data
        </p>
        <SetupSelect
          value={entityType}
          onChange={(event) => {
            setPage(1);
            setEntityType(event.target.value);
          }}
        >
          <option value="">Semua Data</option>
          {LEGAL_AUDIT_ENTITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
          Sumber
        </p>
        <SetupSelect
          value={source}
          onChange={(event) => {
            setPage(1);
            setSource(event.target.value);
          }}
        >
          <option value="">Semua Sumber</option>
          {LEGAL_AUDIT_SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SetupSelect>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} space-y-4`}>
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,1.4fr)_minmax(0,2fr)] xl:items-end">
          <SetupSearchInput
            id="legal-audit-search"
            label="Cari Audit"
            value={search}
            placeholder="Cari user, kontrak, debitur, pihak ketiga, atau ringkasan aktivitas..."
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
          {selectFilters}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:ml-auto xl:max-w-[560px]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                Dari Tanggal
              </p>
              <BasicDateInput
                value={dateFrom}
                placeholder="Pilih tanggal mulai"
                aria-label="Tanggal mulai audit"
                onChange={handleDateFromChange}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                Sampai Tanggal
              </p>
              <BasicDateInput
                value={dateTo}
                placeholder="Pilih tanggal akhir"
                aria-label="Tanggal akhir audit"
                onChange={handleDateToChange}
              />
            </div>
          </div>
        </div>
      </div>

      <SetupTableCard variant="workflow">
        <SetupDataTable variant="workflow" density="compact" className="min-w-[1040px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Waktu</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pelaku</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Aktivitas</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak / Nasabah</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Ringkasan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow
                key={item.id}
                className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer`}
                title="Double-click untuk melihat detail aktivitas"
                onDoubleClick={() => setDetailTarget(item)}
              >
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {(meta.page - 1) * meta.limit + index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{formatDateTime(item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTablePrimaryText>
                    {item.actor?.name || item.actor?.username || "-"}
                  </SetupTablePrimaryText>
                  <p className="mt-1 text-xs text-gray-500">
                    {[
                      item.actor?.username ? `@${item.actor.username}` : null,
                      item.actor?.division_name,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </p>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupStatusBadge
                    status={getAuditActionMeta(item.action).badgeLabel}
                    label={getAuditActionMeta(item.action).badgeLabel}
                    tone={getAuditActionMeta(item.action).tone}
                    icon={getAuditActionMeta(item.action).icon}
                  />
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    {getAuditEntityLabel(item.entity_type)}
                  </p>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTableCode>{item.contract?.no_kontrak ?? "-"}</SetupTableCode>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    {item.contract?.debtor?.name ?? "-"}
                  </p>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <p className="max-w-[360px] line-clamp-2 font-semibold leading-5 text-gray-900">
                    {buildAuditDescription(item)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {getRecordText(item.third_party, "name") || "Tanpa pihak ketiga"}
                  </p>
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
                      {
                        key: "detail",
                        label: "Detail",
                        icon: Eye,
                        onClick: () => setDetailTarget(item),
                      },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={7}>
                {isLoading ? "Memuat audit aktivitas legal..." : "Belum ada audit aktivitas legal."}
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
        isOpen={Boolean(detailTarget)}
        title={buildAuditModalTitle(detailTarget)}
        description={
          detailTarget
            ? `Tercatat otomatis pada ${formatDateTime(detailTarget.created_at)}`
            : undefined
        }
        maxWidth="3xl"
        onClose={() => setDetailTarget(null)}
        bodyClassName="max-h-[72dvh] overflow-y-auto p-5 sm:p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setDetailTarget(null)}
          >
            Tutup
          </button>
        }
      >
        {detailTarget ? (
          <div className="space-y-4">
            <AuditActivityOverview item={detailTarget} />
            <AuditActionDataSection item={detailTarget} onPreview={openAuditFile} />
            <AuditDeviceAndSystem item={detailTarget} />
          </div>
        ) : null}
      </DashboardModal>
    </section>
  );
}

export function LegalReportClient() {
  const { showToast } = useAppToast();
  const [data, setData] = useState<LegalSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setIsLoading(true);
        const result = await legalService.getSummaryReport();
        if (!ignore) setData(result);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat laporan legal", "error");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [showToast]);

  const reportSummary = [
    {
      label: "Notaris",
      value: data?.notary ?? 0,
      icon: Landmark,
    },
    {
      label: "Asuransi",
      value: data?.insurance ?? 0,
      icon: ShieldCheck,
    },
    {
      label: "KJPP",
      value: data?.kjpp ?? 0,
      icon: Building2,
    },
    {
      label: "Klaim",
      value: data?.claims ?? 0,
      icon: FileCheck2,
    },
    {
      label: "Dana Titipan",
      value: data?.deposits ?? 0,
      icon: Banknote,
    },
  ];

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Audit Aktivitas Legal"
        subtitle="Jejak perubahan data legal berdasarkan user, waktu, aksi, dan data yang terdampak."
        icon={<Activity />}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
              Ringkasan Data Legal
            </p>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Area data yang masuk pengawasan audit
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Progress pihak ketiga dan dana titipan tetap diakses dari shortcut dashboard. Halaman ini difokuskan untuk memeriksa jejak perubahan data legal.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6 min-[1800px]:grid-cols-5">
            {reportSummary.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`rounded-lg border border-gray-100 bg-white p-4 shadow-sm xl:col-span-2 min-[1800px]:col-span-1 ${
                    index === 3
                      ? "xl:col-start-2 min-[1800px]:col-start-auto"
                      : index === 4
                        ? "xl:col-start-4 min-[1800px]:col-start-auto"
                        : ""
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-900">
                        <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <p className="min-w-0 text-xs font-semibold uppercase leading-5 tracking-[0.08em] text-gray-500">
                        {item.label}
                      </p>
                    </div>
                    <p className="shrink-0 text-xl font-semibold tabular-nums text-gray-800">
                      {isLoading ? "-" : item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <LegalActivityLogSection />
    </DashboardPageShell>
  );
}
