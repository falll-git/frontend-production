"use client";

import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  ClipboardList,
  Eye,
  FileArchive,
  FileCheck2,
  FileText,
  FolderInput,
  Landmark,
  Pencil,
  Printer,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useProtectedAction } from "@/hooks/useProtectedAction";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { validateDomainUploadFile } from "@/lib/utils/file";
import { useAppToast } from "@/components/ui/AppToastProvider";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import FileUploadField from "@/components/ui/FileUploadField";
import Pagination from "@/components/ui/Pagination";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupAddButton from "@/components/ui/SetupAddButton";
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
} from "@/components/ui/SetupDataTable";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
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
  SETUP_PAGE_TABLE_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import {
  createParameterMasterService,
  type ParameterMasterRecord,
} from "@/services/parameter-master.service";
import { debiturService } from "@/services/debitur.service";
import { legalService } from "@/services/legal.service";
import type { PaginationMeta } from "@/types/api.types";
import type { DebtorContract, DebtorRecord } from "@/types/debitur.types";
import type {
  LegalClaim,
  LegalClaimPayload,
  LegalDeposit,
  LegalDepositPayload,
  LegalDepositTransactionPayload,
  LegalDocumentType,
  LegalIdebPayload,
  LegalIdebUpload,
  LegalInsurancePayload,
  LegalKjppPayload,
  LegalPrintHistory,
  LegalPrintPayload,
  LegalProgressRecord,
  LegalSummaryReport,
  LegalTemplate,
  LegalTemplatePayload,
  LegalThirdPartyDocumentsReport,
  LegalDepositFundsReport,
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

type TemplateFormState = {
  template_type: LegalDocumentType;
  version: string;
  title: string;
  content_template: string;
  is_active: string;
  file: File | null;
};

type PrintFormState = {
  contract_id: string;
  template_id: string;
  numbering_template_id: string;
  generated_number: string;
  file: File | null;
};

type IdebFormState = {
  debtor_id: string;
  contract_id: string;
  month: string;
  year: string;
  status: string;
  summary: string;
  file: File | null;
};

type ProgressFormState = {
  contract_id: string;
  third_party_id: string;
  main_type: string;
  received_at: string;
  estimated_completed_at: string;
  completed_at: string;
  coverage_amount: string;
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
};

type ClaimFormState = {
  contract_id: string;
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
};

type DepositFormState = {
  contract_id: string;
  deposit_type_id: string;
  third_party_id: string;
  nominal: string;
  paid_amount: string;
  processed_amount: string;
  remaining_amount: string;
  status: string;
  notes: string;
};

type DepositTransactionFormState = {
  transaction_date: string;
  action: string;
  amount: string;
  notes: string;
};

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: SETUP_TABLE_PAGE_SIZE,
  lastPage: 1,
};

const DOCUMENT_TYPE_OPTIONS: Array<{ value: LegalDocumentType; label: string }> = [
  { value: "AKAD", label: "Dokumen Akad" },
  { value: "HAFTSHEET", label: "Haftsheet" },
  { value: "SURAT_PERINGATAN", label: "Surat Peringatan" },
  { value: "FORMULIR_ASURANSI", label: "Formulir Asuransi" },
  { value: "SKL", label: "Surat Keterangan Lunas" },
  { value: "SAMSAT", label: "Surat Samsat" },
];

const TEMPLATE_STATUS_OPTIONS: Option[] = [
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

const IDEB_STATUS_OPTIONS: Option[] = [
  { value: "PENDING", label: "Menunggu" },
  { value: "TERUPLOAD", label: "Terupload" },
  { value: "SELESAI", label: "Selesai" },
  { value: "GAGAL", label: "Gagal" },
];

const NOTARY_STATUS_OPTIONS: Option[] = [
  { value: "PROSES", label: "Dalam Proses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "BERMASALAH", label: "Bermasalah" },
];

const INSURANCE_STATUS_OPTIONS: Option[] = [
  { value: "PROSES", label: "Dalam Proses" },
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

const DEPOSIT_STATUS_OPTIONS: Option[] = [
  { value: "PENDING", label: "Menunggu" },
  { value: "DIBAYAR", label: "Dibayar" },
  { value: "DIPROSES", label: "Diproses" },
  { value: "SELESAI", label: "Selesai" },
];

const DEPOSIT_TRANSACTION_ACTION_OPTIONS: Option[] = [
  { value: "BAYAR", label: "Bayar" },
  { value: "PROSES", label: "Proses" },
  { value: "KOREKSI", label: "Koreksi" },
];

const thirdPartyService = createParameterMasterService("/third-parties");
const depositTypeService = createParameterMasterService("/deposit-types");
const numberingTemplateService = createParameterMasterService("/numbering-templates");

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

function getRecordText(record: ParameterMasterRecord | null | undefined, ...keys: string[]) {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
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

function documentTypeLabel(type: string | null | undefined) {
  return DOCUMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? normalizeDisplay(type);
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

function openFile(url: string | null | undefined) {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
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
    <div className="md:col-span-2">
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
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  includeEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <SetupSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {includeEmpty ? <option value="">{emptyLabel ?? `Pilih ${label.toLowerCase()}`}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SetupSelect>
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

function TableCard({ children }: { children: React.ReactNode }) {
  return <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} !w-full`}>{children}</div>;
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
        <Icon className="h-5 w-5 text-gray-900" aria-hidden="true" />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function buildLegalFlowSteps(summary: LegalSummaryReport | null, isLoading: boolean): LegalFlowStep[] {
  const value = (count: number | undefined) => (isLoading ? "-" : count ?? 0);

  return [
    {
      label: "Setup Template",
      description: "Master dokumen dan penomoran legal sebelum proses cetak.",
      href: "/dashboard/legal/template-dokumen",
      value: value(summary?.templates),
      icon: FileArchive,
    },
    {
      label: "Cetak Dokumen",
      description: "Akad, haftsheet, surat peringatan, formulir, SKL, dan Samsat.",
      href: "/dashboard/legal/cetak/akad",
      value: value(summary?.prints),
      icon: Printer,
    },
    {
      label: "Upload IDEB",
      description: "File IDEB debitur tersimpan dan terhubung ke kontrak.",
      href: "/dashboard/legal/upload-ideb",
      value: value(summary?.ideb),
      icon: FolderInput,
    },
    {
      label: "PHK3 Notaris",
      description: "Pantau akta, nomor akta, tanggal terima, dan selesai.",
      href: "/dashboard/legal/progress/notaris",
      value: value(summary?.notary),
      icon: Landmark,
    },
    {
      label: "PHK3 Asuransi",
      description: "Pantau polis, periode, nilai pertanggungan, dan status.",
      href: "/dashboard/legal/progress/asuransi",
      value: value(summary?.insurance),
      icon: ShieldCheck,
    },
    {
      label: "PHK3 KJPP",
      description: "Pantau penilaian agunan, laporan, dan nilai taksasi.",
      href: "/dashboard/legal/progress/kjpp",
      value: value(summary?.kjpp),
      icon: Building2,
    },
    {
      label: "Claim Asuransi",
      description: "Tracking pengajuan, approval, pencairan, atau penolakan claim.",
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
  subtitle = "Urutan kerja legal mengikuti proses dokumen, IDEB, PHK3, claim, dan dana titipan.",
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
              className="group rounded-lg border border-gray-200 bg-gray-50/60 p-4 transition hover:border-[rgba(21,126,195,0.42)] hover:bg-white hover:shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-900" aria-hidden="true" />
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

function useLegalLookups({ templates = false, insurance = false } = {}) {
  const { showToast } = useAppToast();
  const [contracts, setContracts] = useState<DebtorContract[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [thirdParties, setThirdParties] = useState<ParameterMasterRecord[]>([]);
  const [depositTypes, setDepositTypes] = useState<ParameterMasterRecord[]>([]);
  const [numberingTemplates, setNumberingTemplates] = useState<ParameterMasterRecord[]>([]);
  const [legalTemplates, setLegalTemplates] = useState<LegalTemplate[]>([]);
  const [insuranceProgress, setInsuranceProgress] = useState<LegalProgressRecord[]>([]);

  const fetchLookups = useCallback(async () => {
    const [
      contractRows,
      debtorRows,
      thirdPartyRows,
      depositTypeRows,
      numberingTemplateRows,
      templateRows,
      insuranceRows,
    ] = await Promise.all([
      debiturService.getAllContracts(),
      debiturService.getAllDebtors(),
      thirdPartyService.getAll(),
      depositTypeService.getAll(),
      numberingTemplateService.getAll({ module: "LEGAL" }),
      templates ? legalService.getAllTemplates() : Promise.resolve([]),
      insurance
        ? legalService.getInsurancePage({ page: 1, limit: MAX_TABLE_PAGE_SIZE }).then((page) => page.items)
        : Promise.resolve([]),
    ]);

    return {
      contractRows,
      debtorRows,
      thirdPartyRows,
      depositTypeRows,
      numberingTemplateRows,
      templateRows,
      insuranceRows,
    };
  }, [insurance, templates]);

  const load = useCallback(async () => {
    try {
      const result = await fetchLookups();
      setContracts(result.contractRows);
      setDebtors(result.debtorRows);
      setThirdParties(result.thirdPartyRows);
      setDepositTypes(result.depositTypeRows);
      setNumberingTemplates(result.numberingTemplateRows);
      setLegalTemplates(result.templateRows);
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
        setNumberingTemplates(result.numberingTemplateRows);
        setLegalTemplates(result.templateRows);
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
    () => toParameterOptions(thirdParties.filter((item) => getRecordText(item, "category") === "NOTARY")),
    [thirdParties],
  );
  const insuranceOptions = useMemo(
    () => toParameterOptions(thirdParties.filter((item) => getRecordText(item, "category") === "INSURANCE")),
    [thirdParties],
  );
  const kjppOptions = useMemo(
    () => toParameterOptions(thirdParties.filter((item) => getRecordText(item, "category") === "KJPP")),
    [thirdParties],
  );

  return {
    contracts,
    debtors,
    thirdParties,
    depositTypes,
    numberingTemplates,
    legalTemplates,
    insuranceProgress,
    contractOptions: toContractOptions(contracts),
    debtorOptions: toDebtorOptions(debtors),
    thirdPartyOptions: toParameterOptions(thirdParties),
    notaryOptions,
    insuranceOptions,
    kjppOptions,
    depositTypeOptions: toParameterOptions(depositTypes),
    numberingTemplateOptions: toParameterOptions(numberingTemplates),
    reloadLookups: load,
  };
}

function emptyTemplateForm(type: LegalDocumentType = "AKAD"): TemplateFormState {
  return {
    template_type: type,
    version: "1",
    title: "",
    content_template: "",
    is_active: "true",
    file: null,
  };
}

function templateToForm(item: LegalTemplate): TemplateFormState {
  return {
    template_type: item.template_type as LegalDocumentType,
    version: String(item.version ?? 1),
    title: item.title,
    content_template: item.content_template ?? "",
    is_active: item.is_active ? "true" : "false",
    file: null,
  };
}

function buildTemplatePayload(form: TemplateFormState): LegalTemplatePayload {
  return {
    template_type: form.template_type,
    version: toNumberInput(form.version) || 1,
    title: form.title,
    content_template: form.content_template || null,
    is_active: form.is_active === "true",
    file: form.file,
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
          showToast(error instanceof Error ? error.message : "Gagal memuat ringkasan legal", "error");
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

  const flowSteps = useMemo(() => buildLegalFlowSteps(summary, isLoading), [isLoading, summary]);

  const cards = [
    { label: "Template", value: summary?.templates ?? 0, icon: FileArchive, href: "/dashboard/legal/template-dokumen" },
    { label: "Cetak Dokumen", value: summary?.prints ?? 0, icon: Printer, href: "/dashboard/legal/cetak/akad" },
    { label: "Upload IDEB", value: summary?.ideb ?? 0, icon: Upload, href: "/dashboard/legal/upload-ideb" },
    { label: "Progress Notaris", value: summary?.notary ?? 0, icon: Landmark, href: "/dashboard/legal/progress/notaris" },
    { label: "Progress Asuransi", value: summary?.insurance ?? 0, icon: ShieldCheck, href: "/dashboard/legal/progress/asuransi" },
    { label: "Claim", value: summary?.claims ?? 0, icon: FileCheck2, href: "/dashboard/legal/progress/klaim" },
    { label: "Dana Titipan", value: summary?.deposits ?? 0, icon: Banknote, href: "/dashboard/legal/titipan/asuransi" },
  ];

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title="Manajemen Legal"
        subtitle="Template, dokumen legal, IDEB, PHK3, dana titipan, claim, dan laporan legal."
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
            <p className="text-3xl font-bold text-gray-900">{isLoading ? "-" : card.value}</p>
          </ProtectedLink>
        ))}
      </div>
    </div>
  );
}

export function LegalTemplateClient() {
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const canCreate = hasCapability(pathname, "create");
  const canUpdate = hasCapability(pathname, "update");
  const canDelete = hasCapability(pathname, "delete");
  const [items, setItems] = useState<LegalTemplate[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<LegalTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegalTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(() => emptyTemplateForm());

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await legalService.getTemplatesPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat template legal", "error");
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
    setForm(emptyTemplateForm());
    setIsModalOpen(true);
  };

  const openEdit = (item: LegalTemplate) => {
    if (!ensureCapability(pathname, "update")) return;
    setSelected(item);
    setForm(templateToForm(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setForm(emptyTemplateForm());
  };

  const save = async () => {
    if (!form.title.trim()) {
      showToast("Judul template wajib diisi", "warning");
      return;
    }
    setIsSaving(true);
    try {
      if (selected) {
        await legalService.updateTemplate(selected.id, buildTemplatePayload(form));
        showToast("Template legal diperbarui", "success");
      } else {
        await legalService.createTemplate(buildTemplatePayload(form));
        showToast("Template legal dibuat", "success");
      }
      closeModal();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan template legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await legalService.removeTemplate(deleteTarget.id);
      showToast("Template legal dihapus", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus template legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title="Template Dokumen Legal"
        subtitle="Master template dokumen legal untuk cetak akad, surat, IDEB, dan dokumen pendukung."
        icon={<FileArchive />}
        actions={canCreate ? <SetupAddButton label="Tambah Template" onClick={openCreate} /> : null}
      />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <TableCard>
        <SetupDataTable className="min-w-[920px]">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[56px]" />
            <SetupDataTableCol className="w-[170px]" />
            <SetupDataTableCol className="w-[280px]" />
            <SetupDataTableCol className="w-[90px]" />
            <SetupDataTableCol className="w-[120px]" />
            <SetupDataTableCol className="w-[160px]" />
            <SetupDataTableCol className="w-[80px]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Judul</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Versi</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Dibuat</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{documentTypeLabel(item.template_type)}</SetupDataTableCell>
                <SetupDataTableCell className="font-semibold text-gray-900">{item.title}</SetupDataTableCell>
                <SetupDataTableCell>{item.version}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={item.is_active ? "Aktif" : "Nonaktif"} />
                </SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
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
            {isLoading ? <SetupDataTableEmptyRow colSpan={7}>Memuat template legal...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? <SetupDataTableEmptyRow colSpan={7}>Belum ada template legal.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? "Ubah Template Legal" : "Tambah Template Legal"}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SelectField
          label="Jenis Dokumen"
          value={form.template_type}
          options={DOCUMENT_TYPE_OPTIONS}
          includeEmpty={false}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, template_type: value as LegalDocumentType }))}
        />
        <TextField label="Versi" value={form.version} type="number" required onChange={(value) => setForm((prev) => ({ ...prev, version: value }))} />
        <TextField label="Judul" value={form.title} required onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
        <SelectField label="Status" value={form.is_active} options={TEMPLATE_STATUS_OPTIONS} includeEmpty={false} onChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))} />
        <TextareaField label="Isi Template" value={form.content_template} onChange={(value) => setForm((prev) => ({ ...prev, content_template: value }))} />
        <FileUploadField
          id="legal-template-file"
          className="md:col-span-2"
          required={false}
          label="File Template"
          file={form.file}
          validateFile={validateDomainUploadFile}
          onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
          onClear={() => setForm((prev) => ({ ...prev, file: null }))}
        />
      </DashboardModal>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus template legal?"
        itemName={deleteTarget?.title ?? ""}
        entityLabel="template legal"
        isLoading={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function emptyPrintForm(): PrintFormState {
  return {
    contract_id: "",
    template_id: "",
    numbering_template_id: "",
    generated_number: "",
    file: null,
  };
}

function buildPrintPayload(form: PrintFormState, documentType: LegalDocumentType): LegalPrintPayload {
  return {
    document_type: documentType,
    contract_id: form.contract_id,
    template_id: form.template_id || null,
    numbering_template_id: form.numbering_template_id || null,
    generated_number: form.generated_number || null,
    payload_snapshot: {},
    file: form.file,
  };
}

export function LegalPrintClient({ documentType, title }: { documentType: LegalDocumentType; title: string }) {
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const lookups = useLegalLookups({ templates: true });
  const canCreate = hasCapability(pathname, "create");
  const [items, setItems] = useState<LegalPrintHistory[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<PrintFormState>(() => emptyPrintForm());

  const templateOptions = useMemo(
    () =>
      lookups.legalTemplates
        .filter((item) => item.template_type === documentType && item.is_active)
        .map<Option>((item) => ({ value: item.id, label: `${item.title} v${item.version}` })),
    [documentType, lookups.legalTemplates],
  );

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await legalService.getPrintsPage({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        search,
        document_type: documentType,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat dokumen legal", "error");
    } finally {
      setIsLoading(false);
    }
  }, [documentType, page, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!ensureCapability(pathname, "create")) return;
    setForm(emptyPrintForm());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyPrintForm());
  };

  const save = async () => {
    if (!form.contract_id) {
      showToast("Kontrak wajib dipilih", "warning");
      return;
    }
    setIsSaving(true);
    try {
      await legalService.createPrint(buildPrintPayload(form, documentType));
      showToast("Dokumen legal tercatat", "success");
      closeModal();
      await Promise.all([load(), lookups.reloadLookups()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal mencetak dokumen legal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title={title}
        subtitle="Cetak dan arsipkan dokumen legal berdasarkan data kontrak pembiayaan."
        icon={<Printer />}
        actions={canCreate ? <SetupAddButton label="Cetak Dokumen" onClick={openCreate} /> : null}
      />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} placeholder="Cari nomor dokumen atau tipe..." />
      <TableCard>
        <SetupDataTable className="min-w-[980px]">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[56px]" />
            <SetupDataTableCol className="w-[190px]" />
            <SetupDataTableCol className="w-[220px]" />
            <SetupDataTableCol className="w-[220px]" />
            <SetupDataTableCol className="w-[180px]" />
            <SetupDataTableCol className="w-[150px]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nomor Dokumen</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal Cetak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>File</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell className="font-semibold text-gray-900">{item.generated_number}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.debtor?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.printed_at ?? item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  {item.generated_file?.url ? (
                    <button
                      type="button"
                      className="uiverse-modal-button uiverse-modal-button--neutral min-h-[36px] px-3 text-sm"
                      onClick={() => openFile(item.generated_file?.url)}
                    >
                      View
                    </button>
                  ) : (
                    "-"
                  )}
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={6}>Memuat dokumen legal...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? <SetupDataTableEmptyRow colSpan={6}>Belum ada dokumen legal.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={`Cetak ${title}`}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} saveLabel="Cetak" />}
      >
        <SelectField label="Kontrak" value={form.contract_id} options={lookups.contractOptions} required onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))} />
        <SelectField label="Template Dokumen" value={form.template_id} options={templateOptions} emptyLabel="Pakai template aktif default" onChange={(value) => setForm((prev) => ({ ...prev, template_id: value }))} />
        <SelectField label="Template Penomoran" value={form.numbering_template_id} options={lookups.numberingTemplateOptions} emptyLabel="Pakai setup penomoran aktif" onChange={(value) => setForm((prev) => ({ ...prev, numbering_template_id: value }))} />
        <TextField label="Nomor Manual" value={form.generated_number} placeholder="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, generated_number: value }))} />
        <FileUploadField
          id="legal-print-file"
          className="md:col-span-2"
          required={false}
          label="File Dokumen"
          file={form.file}
          validateFile={validateDomainUploadFile}
          onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
          onClear={() => setForm((prev) => ({ ...prev, file: null }))}
        />
      </DashboardModal>
    </div>
  );
}

function emptyIdebForm(): IdebFormState {
  return {
    debtor_id: "",
    contract_id: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    status: "PENDING",
    summary: "",
    file: null,
  };
}

function buildIdebPayload(form: IdebFormState): LegalIdebPayload {
  if (!form.file) throw new Error("File IDEB wajib dipilih");
  return {
    debtor_id: form.debtor_id || null,
    contract_id: form.contract_id || null,
    month: toNumberInput(form.month),
    year: toNumberInput(form.year),
    status: form.status,
    result_summary: form.summary ? { catatan: form.summary } : {},
    file: form.file,
  };
}

export function LegalIdebClient() {
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const lookups = useLegalLookups();
  const canCreate = hasCapability(pathname, "create");
  const [items, setItems] = useState<LegalIdebUpload[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<IdebFormState>(() => emptyIdebForm());

  const filteredContractOptions = useMemo(
    () => toContractOptions(form.debtor_id ? lookups.contracts.filter((item) => item.debtor_id === form.debtor_id) : lookups.contracts),
    [form.debtor_id, lookups.contracts],
  );

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await legalService.getIdebPage({ page, limit: SETUP_TABLE_PAGE_SIZE, search });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat upload IDEB", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!ensureCapability(pathname, "create")) return;
    setForm(emptyIdebForm());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyIdebForm());
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await legalService.createIdeb(buildIdebPayload(form));
      showToast("Upload IDEB tersimpan", "success");
      closeModal();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal upload IDEB", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title="Upload IDEB" subtitle="Simpan file IDEB dan hubungkan dengan debitur atau kontrak." icon={<FolderInput />} actions={canCreate ? <SetupAddButton label="Upload IDEB" onClick={openCreate} /> : null} />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} placeholder="Cari status atau nama file..." />
      <TableCard>
        <SetupDataTable className="min-w-[900px]">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[56px]" />
            <SetupDataTableCol className="w-[220px]" />
            <SetupDataTableCol className="w-[220px]" />
            <SetupDataTableCol className="w-[100px]" />
            <SetupDataTableCol className="w-[120px]" />
            <SetupDataTableCol className="w-[180px]" />
            <SetupDataTableCol className="w-[100px]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Dibuat</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>File</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{item.debtor?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{String(item.month).padStart(2, "0")}/{item.year}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  {item.file?.url ? (
                    <button type="button" className="uiverse-modal-button uiverse-modal-button--neutral min-h-[36px] px-3 text-sm" onClick={() => openFile(item.file?.url)}>View</button>
                  ) : "-"}
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={7}>Memuat upload IDEB...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? <SetupDataTableEmptyRow colSpan={7}>Belum ada upload IDEB.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title="Upload IDEB"
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} saveLabel="Upload" />}
      >
        <SelectField label="Debitur" value={form.debtor_id} options={lookups.debtorOptions} emptyLabel="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, debtor_id: value, contract_id: "" }))} />
        <SelectField label="Kontrak" value={form.contract_id} options={filteredContractOptions} emptyLabel="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))} />
        <TextField label="Bulan" value={form.month} type="number" required onChange={(value) => setForm((prev) => ({ ...prev, month: value }))} />
        <TextField label="Tahun" value={form.year} type="number" required onChange={(value) => setForm((prev) => ({ ...prev, year: value }))} />
        <SelectField label="Status" value={form.status} options={IDEB_STATUS_OPTIONS} includeEmpty={false} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} />
        <TextareaField label="Ringkasan" value={form.summary} onChange={(value) => setForm((prev) => ({ ...prev, summary: value }))} />
        <FileUploadField
          id="legal-ideb-file"
          className="md:col-span-2"
          label="File IDEB"
          file={form.file}
          validateFile={validateDomainUploadFile}
          onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
          onClear={() => setForm((prev) => ({ ...prev, file: null }))}
        />
      </DashboardModal>
    </div>
  );
}

function emptyProgressForm(status: string): ProgressFormState {
  return {
    contract_id: "",
    third_party_id: "",
    main_type: "",
    received_at: "",
    estimated_completed_at: "",
    completed_at: "",
    coverage_amount: "0",
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
  };
}

function notaryToForm(item: LegalProgressRecord): ProgressFormState {
  return {
    ...emptyProgressForm(item.status || "PROSES"),
    contract_id: item.contract_id,
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
    ...emptyProgressForm(item.status || "PROSES"),
    contract_id: item.contract_id,
    third_party_id: item.third_party_id,
    main_type: item.insurance_type ?? "",
    coverage_amount: String(item.coverage_amount ?? 0),
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
  return {
    contract_id: form.contract_id,
    third_party_id: form.third_party_id,
    deed_type: form.main_type,
    received_at: form.received_at,
    estimated_completed_at: form.estimated_completed_at || null,
    completed_at: form.completed_at || null,
    status: form.status,
    deed_number: form.deed_number || null,
    notes: form.notes || null,
    file: form.file,
  };
}

function buildKjppPayload(form: ProgressFormState): LegalKjppPayload {
  return {
    contract_id: form.contract_id,
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
    file: form.file,
  };
}

function buildInsurancePayload(form: ProgressFormState): LegalInsurancePayload {
  return {
    contract_id: form.contract_id,
    third_party_id: form.third_party_id,
    insurance_type: form.main_type,
    coverage_amount: toNumberInput(form.coverage_amount),
    period_start: form.period_start,
    period_end: form.period_end || null,
    policy_number: form.policy_number || null,
    status: form.status,
    notes: form.notes || null,
    file: form.file,
  };
}

export function LegalProgressClient({ type }: { type: LegalProgressType }) {
  const pathname = usePathname() ?? "";
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const isNotary = type === "notary";
  const isKjpp = type === "kjpp";
  const config = isNotary
    ? {
        title: "Progress PHK3 Notaris",
        subtitle: "Pantau progress pengurusan akta dan dokumen notaris.",
        icon: <Landmark />,
        typeLabel: "Jenis Akta",
        dateLabel: "Tanggal Terima",
      }
    : isKjpp
      ? {
          title: "Progress PHK3 KJPP",
          subtitle: "Pantau progress penilaian agunan dan laporan KJPP.",
          icon: <Building2 />,
          typeLabel: "Jenis Penilaian",
          dateLabel: "Tanggal Terima",
        }
      : {
          title: "Progress PHK3 Asuransi",
          subtitle: "Pantau polis, masa berlaku, dan status asuransi.",
          icon: <ShieldCheck />,
          typeLabel: "Jenis Asuransi",
          dateLabel: "Tanggal Mulai",
        };
  const title = config.title;
  const subtitle = config.subtitle;
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
  const [form, setForm] = useState<ProgressFormState>(() => emptyProgressForm("PROSES"));

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
    setForm(emptyProgressForm("PROSES"));
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
    setForm(emptyProgressForm("PROSES"));
  };

  const save = async () => {
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
  const statusOptions = isNotary
    ? NOTARY_STATUS_OPTIONS
    : isKjpp
      ? KJPP_STATUS_OPTIONS
      : INSURANCE_STATUS_OPTIONS;

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

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title={title} subtitle={subtitle} icon={config.icon} actions={canCreate ? <SetupAddButton label="Tambah Progress" onClick={openCreate} /> : null} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Progress" value={isLoading ? "-" : progressSummary.total} icon={ClipboardList} />
        <StatCard label="Masih Berjalan" value={isLoading ? "-" : progressSummary.active} icon={FileText} />
        <StatCard label="Selesai" value={isLoading ? "-" : progressSummary.done} icon={FileCheck2} />
        <StatCard label="Perlu Tindak Lanjut" value={isLoading ? "-" : progressSummary.risk} icon={ShieldCheck} />
      </div>
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <TableCard>
        <SetupDataTable className="min-w-[1080px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>{config.typeLabel}</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.debtor?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{getRecordText(item.third_party, "name") || "-"}</SetupDataTableCell>
                <SetupDataTableCell>{isNotary ? item.deed_type ?? "-" : isKjpp ? item.appraisal_type ?? "-" : item.insurance_type ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
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
                        label: "File",
                        icon: FileArchive,
                        disabled: !item.file?.url,
                        onClick: () => openFile(item.file?.url),
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
            {isLoading ? <SetupDataTableEmptyRow colSpan={8}>Memuat progress legal...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? <SetupDataTableEmptyRow colSpan={8}>Belum ada progress legal.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? `Ubah ${title}` : `Tambah ${title}`}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SelectField label="Kontrak" value={form.contract_id} options={lookups.contractOptions} required onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))} />
        <SelectField label="Pihak Ketiga" value={form.third_party_id} options={thirdPartyOptions} required onChange={(value) => setForm((prev) => ({ ...prev, third_party_id: value }))} />
        <TextField label={config.typeLabel} value={form.main_type} required onChange={(value) => setForm((prev) => ({ ...prev, main_type: value }))} />
        <SelectField label="Status" value={form.status} options={statusOptions} includeEmpty={false} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} />
        {isNotary || isKjpp ? (
          <>
            <DateField label={config.dateLabel} value={form.received_at} required onChange={(value) => setForm((prev) => ({ ...prev, received_at: value }))} />
            <DateField label="Estimasi Selesai" value={form.estimated_completed_at} onChange={(value) => setForm((prev) => ({ ...prev, estimated_completed_at: value }))} />
            <DateField label="Tanggal Selesai" value={form.completed_at} onChange={(value) => setForm((prev) => ({ ...prev, completed_at: value }))} />
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
            <TextField label="Nilai Pertanggungan" value={form.coverage_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, coverage_amount: value }))} />
            <DateField label="Mulai Polis" value={form.period_start} required onChange={(value) => setForm((prev) => ({ ...prev, period_start: value }))} />
            <DateField label="Akhir Polis" value={form.period_end} onChange={(value) => setForm((prev) => ({ ...prev, period_end: value }))} />
            <TextField label="Nomor Polis" value={form.policy_number} onChange={(value) => setForm((prev) => ({ ...prev, policy_number: value }))} />
          </>
        )}
        <TextareaField label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
        <FileUploadField
          id={`legal-progress-${type}-file`}
          className="md:col-span-2"
          required={false}
          label="File Pendukung"
          file={form.file}
          validateFile={validateDomainUploadFile}
          onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
          onClear={() => setForm((prev) => ({ ...prev, file: null }))}
        />
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
                { label: "Catatan", value: detailTarget.notes || "-" },
              ]}
            />
            <LegalDetailSection
              title="Dokumen"
              rows={[
                { label: "Nama File", value: detailTarget.file?.name ?? "-" },
                {
                  label: "Aksi",
                  value: detailTarget.file?.url ? (
                    <button
                      type="button"
                      className="uiverse-modal-button uiverse-modal-button--neutral min-h-[36px] px-3 text-sm"
                      onClick={() => openFile(detailTarget.file?.url)}
                    >
                      View
                    </button>
                  ) : (
                    "-"
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
    </div>
  );
}

function emptyClaimForm(): ClaimFormState {
  return {
    contract_id: "",
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
  };
}

function claimToForm(item: LegalClaim): ClaimFormState {
  return {
    contract_id: item.contract_id,
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
  };
}

function buildClaimPayload(form: ClaimFormState): LegalClaimPayload {
  return {
    contract_id: form.contract_id,
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
    file: form.file,
  };
}

export function LegalClaimClient() {
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
  const [deleteTarget, setDeleteTarget] = useState<LegalClaim | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ClaimFormState>(() => emptyClaimForm());

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
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title="Claim Asuransi" subtitle="Kelola proses klaim asuransi untuk kontrak debitur." icon={<FileCheck2 />} actions={canCreate ? <SetupAddButton label="Tambah Claim" onClick={openCreate} /> : null} />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <TableCard>
        <SetupDataTable className="min-w-[1080px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Claim</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.debtor?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.claim_type}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.claim_amount)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.submitted_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
                      { key: "view", label: "View", icon: FileText, disabled: !item.file?.url, onClick: () => openFile(item.file?.url) },
                      { key: "edit", label: "Ubah", icon: Pencil, disabled: !canUpdate, onClick: () => openEdit(item) },
                      { key: "delete", label: "Hapus", icon: Trash2, tone: "red", disabled: !canDelete, onClick: () => setDeleteTarget(item) },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={8}>Memuat claim legal...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? <SetupDataTableEmptyRow colSpan={8}>Belum ada claim legal.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? "Ubah Claim Asuransi" : "Tambah Claim Asuransi"}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="4xl"
        bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SelectField label="Kontrak" value={form.contract_id} options={lookups.contractOptions} required onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value, insurance_progress_id: "" }))} />
        <SelectField label="Progress Asuransi" value={form.insurance_progress_id} options={insuranceOptions} emptyLabel="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, insurance_progress_id: value }))} />
        <TextField label="Nomor Polis" value={form.policy_number} onChange={(value) => setForm((prev) => ({ ...prev, policy_number: value }))} />
        <TextField label="Jenis Claim" value={form.claim_type} required onChange={(value) => setForm((prev) => ({ ...prev, claim_type: value }))} />
        <TextField label="Nominal Claim" value={form.claim_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, claim_amount: value }))} />
        <DateField label="Tanggal Pengajuan" value={form.submitted_at} required onChange={(value) => setForm((prev) => ({ ...prev, submitted_at: value }))} />
        <SelectField label="Status" value={form.status} options={CLAIM_STATUS_OPTIONS} includeEmpty={false} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} />
        <TextField label="Nominal Disetujui" value={form.approved_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, approved_amount: value }))} />
        <TextField label="Nominal Cair" value={form.disbursed_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, disbursed_amount: value }))} />
        <DateField label="Tanggal Cair" value={form.disbursed_at} onChange={(value) => setForm((prev) => ({ ...prev, disbursed_at: value }))} />
        <TextareaField label="Alasan Ditolak" value={form.rejection_reason} onChange={(value) => setForm((prev) => ({ ...prev, rejection_reason: value }))} />
        <TextareaField label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
        <FileUploadField id="legal-claim-file" className="md:col-span-2" required={false} label="File Claim" file={form.file} validateFile={validateDomainUploadFile} onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))} onClear={() => setForm((prev) => ({ ...prev, file: null }))} />
      </DashboardModal>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus claim legal?"
        itemName={deleteTarget?.claim_type ?? ""}
        entityLabel="claim legal"
        isLoading={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function emptyDepositForm(): DepositFormState {
  return {
    contract_id: "",
    deposit_type_id: "",
    third_party_id: "",
    nominal: "0",
    paid_amount: "0",
    processed_amount: "0",
    remaining_amount: "",
    status: "PENDING",
    notes: "",
  };
}

function depositToForm(item: LegalDeposit): DepositFormState {
  return {
    contract_id: item.contract_id,
    deposit_type_id: item.deposit_type_id ?? "",
    third_party_id: item.third_party_id ?? "",
    nominal: String(item.nominal ?? 0),
    paid_amount: String(item.paid_amount ?? 0),
    processed_amount: String(item.processed_amount ?? 0),
    remaining_amount: String(item.remaining_amount ?? ""),
    status: item.status || "PENDING",
    notes: item.notes ?? "",
  };
}

function buildDepositPayload(form: DepositFormState, type: string): LegalDepositPayload {
  return {
    type,
    contract_id: form.contract_id,
    deposit_type_id: form.deposit_type_id || null,
    third_party_id: form.third_party_id || null,
    nominal: toNumberInput(form.nominal),
    paid_amount: toNumberInput(form.paid_amount),
    processed_amount: toNumberInput(form.processed_amount),
    remaining_amount: toOptionalNumber(form.remaining_amount),
    status: form.status,
    notes: form.notes || null,
  };
}

export function LegalDepositClient({ type, title }: { type: "ASURANSI" | "NOTARIS" | "ANGSURAN"; title: string }) {
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<DepositFormState>(() => emptyDepositForm());
  const [transactionForm, setTransactionForm] = useState<DepositTransactionFormState>(() => ({
    transaction_date: "",
    action: "BAYAR",
    amount: "0",
    notes: "",
  }));

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
    setForm(depositToForm(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setForm(emptyDepositForm());
  };

  const save = async () => {
    if (!form.contract_id) {
      showToast("Kontrak wajib dipilih", "warning");
      return;
    }
    setIsSaving(true);
    try {
      if (selected) await legalService.updateDeposit(selected.id, buildDepositPayload(form, type));
      else await legalService.createDeposit(buildDepositPayload(form, type));
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
    const payload: LegalDepositTransactionPayload = {
      deposit_id: transactionTarget.id,
      transaction_date: transactionForm.transaction_date,
      action: transactionForm.action,
      amount: toNumberInput(transactionForm.amount),
      notes: transactionForm.notes || null,
    };
    setIsSaving(true);
    try {
      await legalService.createDepositTransaction(payload);
      showToast("Transaksi dana titipan tersimpan", "success");
      setTransactionTarget(null);
      setTransactionForm({ transaction_date: "", action: "BAYAR", amount: "0", notes: "" });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan transaksi dana titipan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title={title} subtitle="Kelola dana titipan yang terhubung ke kontrak debitur." icon={<Banknote />} actions={canCreate ? <SetupAddButton label="Tambah Titipan" onClick={openCreate} /> : null} />
      <SearchCard search={search} onSearch={(value) => { setPage(1); setSearch(value); }} />
      <TableCard>
        <SetupDataTable className="min-w-[1120px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Terbayar</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Sisa</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{(meta.page - 1) * meta.limit + index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.debtor?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{getRecordText(item.deposit_type, "name", "label") || documentTypeLabel(item.type)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.nominal)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.paid_amount)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.remaining_amount)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupActionMenu
                    items={[
                      { key: "transaction", label: "Transaksi", icon: Banknote, disabled: !canCreate, onClick: () => setTransactionTarget(item) },
                      { key: "edit", label: "Ubah", icon: Pencil, disabled: !canUpdate, onClick: () => openEdit(item) },
                      { key: "delete", label: "Hapus", icon: Trash2, tone: "red", disabled: !canDelete, onClick: () => setDeleteTarget(item) },
                    ]}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={9}>Memuat dana titipan...</SetupDataTableEmptyRow> : null}
            {!isLoading && items.length === 0 ? <SetupDataTableEmptyRow colSpan={9}>Belum ada dana titipan.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
        <Pagination page={meta.page} lastPage={meta.lastPage} total={meta.total} limit={meta.limit} isLoading={isLoading} onPageChange={setPage} />
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={selected ? `Ubah ${title}` : `Tambah ${title}`}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={closeModal} onSave={() => void save()} isSaving={isSaving} />}
      >
        <SelectField label="Kontrak" value={form.contract_id} options={lookups.contractOptions} required onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))} />
        <SelectField label="Jenis Titipan" value={form.deposit_type_id} options={lookups.depositTypeOptions} emptyLabel="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, deposit_type_id: value }))} />
        <SelectField label="Pihak Ketiga" value={form.third_party_id} options={lookups.thirdPartyOptions} emptyLabel="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, third_party_id: value }))} />
        <SelectField label="Status" value={form.status} options={DEPOSIT_STATUS_OPTIONS} includeEmpty={false} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} />
        <TextField label="Nominal" value={form.nominal} type="number" required onChange={(value) => setForm((prev) => ({ ...prev, nominal: value }))} />
        <TextField label="Terbayar" value={form.paid_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, paid_amount: value }))} />
        <TextField label="Diproses" value={form.processed_amount} type="number" onChange={(value) => setForm((prev) => ({ ...prev, processed_amount: value }))} />
        <TextField label="Sisa Manual" value={form.remaining_amount} type="number" placeholder="Opsional" onChange={(value) => setForm((prev) => ({ ...prev, remaining_amount: value }))} />
        <TextareaField label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
      </DashboardModal>
      <DashboardModal
        isOpen={Boolean(transactionTarget)}
        title="Tambah Transaksi Titipan"
        description={transactionTarget?.contract?.no_kontrak}
        onClose={() => setTransactionTarget(null)}
        closeDisabled={isSaving}
        maxWidth="2xl"
        bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        footer={<ModalFooter onClose={() => setTransactionTarget(null)} onSave={() => void saveTransaction()} isSaving={isSaving} />}
      >
        <DateField label="Tanggal Transaksi" value={transactionForm.transaction_date} required onChange={(value) => setTransactionForm((prev) => ({ ...prev, transaction_date: value }))} />
        <SelectField label="Aksi" value={transactionForm.action} options={DEPOSIT_TRANSACTION_ACTION_OPTIONS} includeEmpty={false} onChange={(value) => setTransactionForm((prev) => ({ ...prev, action: value }))} />
        <TextField label="Nominal" value={transactionForm.amount} type="number" required onChange={(value) => setTransactionForm((prev) => ({ ...prev, amount: value }))} />
        <TextareaField label="Catatan" value={transactionForm.notes} onChange={(value) => setTransactionForm((prev) => ({ ...prev, notes: value }))} />
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
    </div>
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

  const flowSteps = useMemo(() => buildLegalFlowSteps(data, isLoading), [data, isLoading]);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title="Laporan Legal" subtitle="Ringkasan aktivitas legal, PHK3, dana titipan, dan claim." icon={<ClipboardList />} />
      <LegalFlowBoard
        steps={flowSteps}
        title="Cakupan Laporan Legal"
        subtitle="Ringkasan ini membaca data real dari template, cetak dokumen, IDEB, PHK3, claim, dan titipan."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Template" value={isLoading ? "-" : data?.templates ?? 0} icon={FileArchive} />
        <StatCard label="Cetak Dokumen" value={isLoading ? "-" : data?.prints ?? 0} icon={Printer} />
        <StatCard label="Upload IDEB" value={isLoading ? "-" : data?.ideb ?? 0} icon={Upload} />
        <StatCard label="Progress Notaris" value={isLoading ? "-" : data?.notary ?? 0} icon={Landmark} />
        <StatCard label="Progress Asuransi" value={isLoading ? "-" : data?.insurance ?? 0} icon={ShieldCheck} />
        <StatCard label="Progress KJPP" value={isLoading ? "-" : data?.kjpp ?? 0} icon={Building2} />
        <StatCard label="Claim" value={isLoading ? "-" : data?.claims ?? 0} icon={FileCheck2} />
        <StatCard label="Dana Titipan" value={isLoading ? "-" : data?.deposits ?? 0} icon={Banknote} />
      </div>
    </div>
  );
}

function readReportNumber(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
}

function readReportString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "-";
}

function countFromGroup(record: Record<string, unknown>) {
  const count = record._count;
  if (count && typeof count === "object" && "id" in count) {
    const value = (count as Record<string, unknown>).id;
    if (typeof value === "number") return value;
  }
  return readReportNumber(record, "total", "total_records");
}

export function LegalThirdPartyDocumentsReportClient() {
  const { showToast } = useAppToast();
  const [data, setData] = useState<LegalThirdPartyDocumentsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setIsLoading(true);
        const result = await legalService.getThirdPartyDocumentsReport();
        if (!ignore) setData(result);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat laporan pihak ketiga", "error");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [showToast]);

  const rows = [
    ...(data?.notary ?? []).map((item) => ({ module: "Notaris", ...item })),
    ...(data?.insurance ?? []).map((item) => ({ module: "Asuransi", ...item })),
    ...(data?.kjpp ?? []).map((item) => ({ module: "KJPP", ...item })),
    ...(data?.claims ?? []).map((item) => ({ module: "Claim", ...item })),
  ];

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title="Laporan Pihak Ketiga Dokumen" subtitle="Rekap progress dokumen notaris, asuransi, KJPP, dan claim." icon={<ClipboardList />} />
      <TableCard>
        <SetupDataTable className="min-w-[720px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Modul</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Total</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {rows.map((item, index) => (
              <SetupDataTableRow key={`${item.module}-${index}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{item.module}</SetupDataTableCell>
                <SetupDataTableCell>{readReportString(item, "third_party_name", "third_party_id")}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(readReportString(item, "status"))} /></SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(countFromGroup(item))}</SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={5}>Memuat laporan pihak ketiga...</SetupDataTableEmptyRow> : null}
            {!isLoading && rows.length === 0 ? <SetupDataTableEmptyRow colSpan={5}>Belum ada laporan pihak ketiga.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </div>
  );
}

export function LegalThirdPartyDepositFundsReportClient() {
  const { showToast } = useAppToast();
  const [rows, setRows] = useState<LegalDepositFundsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setIsLoading(true);
        const result = await legalService.getThirdPartyDepositFundsReport();
        if (!ignore) setRows(result);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat laporan dana titipan", "error");
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
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader title="Laporan Pihak Ketiga Dana Titipan" subtitle="Rekap nominal dana titipan legal berdasarkan tipe dan status." icon={<Banknote />} />
      <TableCard>
        <SetupDataTable className="min-w-[900px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tipe</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Total Data</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Terbayar</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Sisa</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {rows.map((item, index) => (
              <SetupDataTableRow key={`${item.type}-${item.status}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>{index + 1}</SetupDataTableCell>
                <SetupDataTableCell>{documentTypeLabel(item.type)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}><SetupStatusBadge status={statusLabel(item.status)} /></SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.total_records)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.nominal)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.paid_amount)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.remaining_amount)}</SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? <SetupDataTableEmptyRow colSpan={7}>Memuat laporan dana titipan...</SetupDataTableEmptyRow> : null}
            {!isLoading && rows.length === 0 ? <SetupDataTableEmptyRow colSpan={7}>Belum ada laporan dana titipan.</SetupDataTableEmptyRow> : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </div>
  );
}
