"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  FileArchive,
  FileCheck2,
  FileSpreadsheet,
  FolderInput,
  Pencil,
  PieChart,
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
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
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
  SETUP_PAGE_MODERN_EMPTY_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
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
  DebtorContract,
  DebtorContractPayload,
  DebtorDocumentPayload,
  DebtorImportJob,
  DebtorImportPayload,
  DebtorImportType,
  DebtorMarketingActivity,
  DebtorMarketingKind,
  DebtorMarketingPayload,
  DebtorMarketingReport,
  DebtorNpfReport,
  DebtorPayload,
  DebtorRecord,
  DebtorReportSummary,
} from "@/types/debitur.types";

type Option = {
  value: string;
  label: string;
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

type DocumentFormState = {
  debtor_id: string;
  contract_id: string;
  document_checklist_id: string;
  document_type: string;
  category: string;
  description: string;
  file: File | null;
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
  debtor_id: string;
  contract_id: string;
  period_month: string;
  raw_reference: string;
  total_rows: string;
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

const contractStatusOptions: Option[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "CLOSED", label: "Selesai" },
  { value: "INACTIVE", label: "Nonaktif" },
];

const activityStatusOptions: Option[] = [
  { value: "", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "IN_PROGRESS", label: "Dalam Proses" },
  { value: "DONE", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const documentCategoryOptions: Option[] = [
  { value: "AWAL", label: "Awal" },
  { value: "LAINNYA", label: "Lainnya" },
];

const branchService = createParameterMasterService("/branches");
const productService = createParameterMasterService("/financing-products");
const contractTypeService = createParameterMasterService("/contract-types");
const checklistService = createParameterMasterService("/document-checklists");

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

function normalizeDisplay(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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

function activityKindLabel(kind: string) {
  const normalized = kind.trim().toUpperCase();
  if (normalized === "ACTION_PLAN") return "Action Plan";
  if (normalized === "VISIT_RESULT") return "Hasil Kunjungan";
  if (normalized === "HANDLING_STEP") return "Langkah Penanganan";
  return statusLabel(kind);
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
    status: "ACTIVE",
    description: "",
  };
}

function debtorToForm(debtor: DebtorRecord): DebtorFormState {
  return {
    debtor_number: debtor.debtor_number ?? "",
    identity_number: debtor.identity_number ?? "",
    name: debtor.name,
    address: debtor.address ?? "",
    phone: debtor.phone ?? "",
    branch_id: debtor.branch_id ?? "",
    marketing_user_id: debtor.marketing_user_id ?? "",
    financing_number: debtor.financing_number ?? "",
    status: debtor.status || "ACTIVE",
    description: debtor.description ?? "",
  };
}

function buildDebtorPayload(form: DebtorFormState): DebtorPayload {
  return {
    debtor_number: form.debtor_number || null,
    identity_number: form.identity_number || null,
    name: form.name,
    address: form.address || null,
    phone: form.phone || null,
    branch_id: form.branch_id || null,
    marketing_user_id: form.marketing_user_id || null,
    financing_number: form.financing_number || null,
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

function emptyDocumentForm(debtorId = ""): DocumentFormState {
  return {
    debtor_id: debtorId,
    contract_id: "",
    document_checklist_id: "",
    document_type: "",
    category: "LAINNYA",
    description: "",
    file: null,
  };
}

function buildDocumentPayload(form: DocumentFormState): DebtorDocumentPayload {
  if (!form.file) throw new Error("File dokumen wajib dipilih");
  return {
    contract_id: form.contract_id || null,
    document_checklist_id: form.document_checklist_id || null,
    document_type: form.document_type,
    category: form.category,
    description: form.description || null,
    file: form.file,
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
    debtor_id: "",
    contract_id: "",
    period_month: "",
    raw_reference: "",
    total_rows: "",
  };
}

function buildImportPayload(form: ImportFormState): DebtorImportPayload {
  if (!form.file) throw new Error("File import wajib dipilih");
  return {
    file: form.file,
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

function validateDocumentForm(form: DocumentFormState) {
  if (!form.debtor_id) return "Debitur wajib dipilih";
  if (!form.document_type.trim()) return "Jenis dokumen wajib diisi";
  if (!form.file) return "File dokumen wajib dipilih";
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
        {includeEmpty ? (
          <option value="">{emptyLabel ?? `Pilih ${label.toLowerCase()}`}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SetupSelect>
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
}: {
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {description ? (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
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

function TableCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} ${className}`.trim()}>
      <div className="overflow-x-auto">{children}</div>
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
  const [checklists, setChecklists] = useState<Option[]>([]);
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
          checklistRows,
          userRows,
        ] = await Promise.all([
          branchService.getAll({ is_active: true }),
          productService.getAll({ is_active: true }),
          contractTypeService.getAll({ is_active: true }),
          checklistService.getAll({ is_active: true }),
          userService.getAll(),
        ]);

        if (ignore) return;
        setBranches(toParameterOptions(branchRows));
        setProducts(toParameterOptions(productRows));
        setContractTypes(toParameterOptions(contractTypeRows));
        setChecklists(toParameterOptions(checklistRows));
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
    checklists,
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
      const [debtorRows, contractRows] = await Promise.all([
        debiturService.getAllDebtors(),
        debiturService.getAllContracts(),
      ]);
      setDebtors(debtorRows);
      setContracts(contractRows);
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

          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Kontrak Terkait
            </h3>
            <TableCard>
              <SetupDataTable className="min-w-[840px]">
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
                        {contract.latest_collectibility?.name ?? "-"}
                      </SetupDataTableCell>
                      <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                        <SetupStatusBadge status={statusLabel(contract.status)} />
                      </SetupDataTableCell>
                    </SetupDataTableRow>
                  ))}
                  {debtor.contracts.length === 0 ? (
                    <SetupDataTableRow>
                      <SetupDataTableCell
                        colSpan={6}
                        className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                      >
                        Belum ada kontrak untuk debitur ini.
                      </SetupDataTableCell>
                    </SetupDataTableRow>
                  ) : null}
                </SetupDataTableBody>
              </SetupDataTable>
            </TableCard>
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
      bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      }
    >
      <TextField
        label="Nomor Debitur"
        value={form.debtor_number}
        onChange={(value) => onChange({ debtor_number: value })}
      />
      <TextField
        label="Nomor Identitas"
        value={form.identity_number}
        onChange={(value) => onChange({ identity_number: value })}
      />
      <TextField
        label="Nama Debitur"
        value={form.name}
        onChange={(value) => onChange({ name: value })}
        required
      />
      <TextField
        label="Telepon"
        value={form.phone}
        onChange={(value) => onChange({ phone: value })}
      />
      <SelectField
        label="Cabang"
        value={form.branch_id}
        options={branches}
        onChange={(value) => onChange({ branch_id: value })}
      />
      <SelectField
        label="PIC / Marketing"
        value={form.marketing_user_id}
        options={users}
        onChange={(value) => onChange({ marketing_user_id: value })}
      />
      <TextField
        label="Nomor Pembiayaan"
        value={form.financing_number}
        onChange={(value) => onChange({ financing_number: value })}
      />
      <SelectField
        label="Status"
        value={form.status}
        options={debtorStatusOptions.filter((option) => option.value)}
        includeEmpty={false}
        onChange={(value) => onChange({ status: value })}
      />
      <TextareaField
        label="Alamat"
        value={form.address}
        onChange={(value) => onChange({ address: value })}
      />
      <TextareaField
        label="Keterangan"
        value={form.description}
        onChange={(value) => onChange({ description: value })}
      />
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
      bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-3"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      }
    >
      <SelectField
        label="Debitur"
        value={form.debtor_id}
        options={debtors}
        onChange={(value) => onChange({ debtor_id: value })}
        required
      />
      <TextField
        label="Nomor Kontrak"
        value={form.no_kontrak}
        onChange={(value) => onChange({ no_kontrak: value })}
        required
      />
      <SelectField
        label="Produk Pembiayaan"
        value={form.product_id}
        options={products}
        onChange={(value) => onChange({ product_id: value })}
        required
      />
      <SelectField
        label="Jenis Akad"
        value={form.akad_type_id}
        options={contractTypes}
        onChange={(value) => onChange({ akad_type_id: value })}
        required
      />
      <SelectField
        label="Cabang"
        value={form.branch_id}
        options={branches}
        onChange={(value) => onChange({ branch_id: value })}
      />
      <SelectField
        label="PIC / Marketing"
        value={form.marketing_user_id}
        options={users}
        onChange={(value) => onChange({ marketing_user_id: value })}
      />
      <DateField
        label="Tanggal Akad"
        value={form.tanggal_akad}
        onChange={(value) => onChange({ tanggal_akad: value })}
        required
      />
      <DateField
        label="Tanggal Jatuh Tempo"
        value={form.tanggal_jatuh_tempo}
        onChange={(value) => onChange({ tanggal_jatuh_tempo: value })}
      />
      <SelectField
        label="Status"
        value={form.status}
        options={contractStatusOptions}
        includeEmpty={false}
        onChange={(value) => onChange({ status: value })}
      />
      <TextField
        label="Plafond"
        value={form.plafond}
        type="number"
        onChange={(value) => onChange({ plafond: value })}
      />
      <TextField
        label="Pokok"
        value={form.pokok}
        type="number"
        onChange={(value) => onChange({ pokok: value })}
      />
      <TextField
        label="Margin"
        value={form.margin}
        type="number"
        onChange={(value) => onChange({ margin: value })}
      />
      <TextField
        label="Tenor"
        value={form.tenor}
        type="number"
        onChange={(value) => onChange({ tenor: value })}
        required
      />
      <TextField
        label="Outstanding Pokok"
        value={form.outstanding_pokok}
        type="number"
        onChange={(value) => onChange({ outstanding_pokok: value })}
      />
      <TextField
        label="Outstanding Margin"
        value={form.outstanding_margin}
        type="number"
        onChange={(value) => onChange({ outstanding_margin: value })}
      />
      <TextareaField
        label="Objek Pembiayaan"
        value={form.objek_pembiayaan}
        onChange={(value) => onChange({ objek_pembiayaan: value })}
      />
      <TextareaField
        label="Agunan"
        value={form.agunan}
        onChange={(value) => onChange({ agunan: value })}
      />
    </DashboardModal>
  );
}

function DocumentUploadModal({
  isOpen,
  form,
  contracts,
  checklists,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  form: DocumentFormState;
  contracts: Option[];
  checklists: Option[];
  isSaving: boolean;
  onChange: (patch: Partial<DocumentFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DashboardModal
      isOpen={isOpen}
      title="Upload Dokumen Debitur"
      onClose={onClose}
      closeDisabled={isSaving}
      maxWidth="3xl"
      bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
          saveLabel="Upload"
        />
      }
    >
      <SelectField
        label="Kontrak"
        value={form.contract_id}
        options={contracts}
        onChange={(value) => onChange({ contract_id: value })}
        emptyLabel="Tanpa kontrak khusus"
      />
      <SelectField
        label="Checklist Dokumen"
        value={form.document_checklist_id}
        options={checklists}
        onChange={(value) => onChange({ document_checklist_id: value })}
        emptyLabel="Tanpa checklist"
      />
      <TextField
        label="Jenis Dokumen"
        value={form.document_type}
        onChange={(value) => onChange({ document_type: value })}
        required
      />
      <SelectField
        label="Kategori"
        value={form.category}
        options={documentCategoryOptions}
        includeEmpty={false}
        onChange={(value) => onChange({ category: value })}
      />
      <TextareaField
        label="Keterangan"
        value={form.description}
        onChange={(value) => onChange({ description: value })}
      />
      <FileUploadField
        id="debtor-document-file"
        className="md:col-span-2"
        file={form.file}
        label="File Dokumen"
        validateFile={validateDomainUploadFile}
        onChange={(event) =>
          onChange({ file: event.target.files?.[0] ?? null })
        }
        onClear={() => onChange({ file: null })}
      />
    </DashboardModal>
  );
}

function useDebtorTable() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<DebtorRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
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

function DebtorTable({
  items,
  meta,
  isLoading,
  canUpdate = false,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
  onAddContract,
  onUploadDocument,
}: {
  items: DebtorRecord[];
  meta: PaginationMeta;
  isLoading: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onView: (debtor: DebtorRecord) => void;
  onEdit?: (debtor: DebtorRecord) => void;
  onDelete?: (debtor: DebtorRecord) => void;
  onAddContract?: (debtor: DebtorRecord) => void;
  onUploadDocument?: (debtor: DebtorRecord) => void;
}) {
  const showActions = Boolean(onEdit || onDelete || onAddContract || onUploadDocument);
  const colSpan = showActions ? 10 : 9;

  return (
    <SetupDataTable className="min-w-[1180px]">
      <SetupDataTableColGroup>
        <SetupDataTableCol className="w-[56px]" />
        <SetupDataTableCol className="w-[160px]" />
        <SetupDataTableCol className="w-[190px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[170px]" />
        <SetupDataTableCol className="w-[170px]" />
        <SetupDataTableCol className="w-[150px]" />
        <SetupDataTableCol className="w-[120px]" />
        <SetupDataTableCol className="w-[120px]" />
        {showActions ? <SetupDataTableCol className="w-[88px]" /> : null}
      </SetupDataTableColGroup>
      <SetupDataTableHead>
        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
            No
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>No Debitur</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Nama Debitur</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Cabang</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>PIC / Marketing</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Kontrak Terakhir</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell>Kolektibilitas</SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Status
          </SetupDataTableHeaderCell>
          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
            Dokumen
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
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium tabular-nums text-gray-700">
                {item.debtor_number ?? "-"}
              </span>
            </SetupDataTableCell>
            <SetupDataTableCell className="font-semibold">
              {item.name}
            </SetupDataTableCell>
            <SetupDataTableCell>{item.branch?.name ?? "-"}</SetupDataTableCell>
            <SetupDataTableCell>
              {item.marketing_user
                ? item.marketing_user.division_name
                  ? `${item.marketing_user.name} / ${item.marketing_user.division_name}`
                  : item.marketing_user.name
                : "-"}
            </SetupDataTableCell>
            <SetupDataTableCell>
              {item.latest_contract?.no_kontrak ?? "-"}
            </SetupDataTableCell>
            <SetupDataTableCell>
              {item.latest_contract?.latest_collectibility?.name ?? "-"}
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              <SetupStatusBadge status={statusLabel(item.status)} />
            </SetupDataTableCell>
            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
              {item.documents_count}
            </SetupDataTableCell>
            {showActions ? (
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupActionMenu
                  label={`Aksi ${item.name}`}
                  menuLabel={`Aksi untuk ${item.name}`}
                  items={[
                    {
                      key: "view",
                      label: "Detail",
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
                      key: "document",
                      label: "Upload Dokumen",
                      icon: Upload,
                      tone: "amber",
                      disabled: !canUpdate || !onUploadDocument,
                      onClick: () => onUploadDocument?.(item),
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
          <SetupDataTableRow>
            <SetupDataTableCell
              colSpan={colSpan}
              className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
            >
              Memuat data debitur...
            </SetupDataTableCell>
          </SetupDataTableRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <SetupDataTableRow>
            <SetupDataTableCell
              colSpan={colSpan}
              className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
            >
              Belum ada data debitur yang sesuai.
            </SetupDataTableCell>
          </SetupDataTableRow>
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
    <SetupDataTable className="min-w-[1180px]">
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
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium tabular-nums text-gray-700">
                {item.no_kontrak}
              </span>
            </SetupDataTableCell>
            <SetupDataTableCell className="font-semibold">
              {item.debtor?.name ?? "-"}
            </SetupDataTableCell>
            <SetupDataTableCell>{item.product?.name ?? "-"}</SetupDataTableCell>
            <SetupDataTableCell>{formatDateOnly(item.tanggal_akad)}</SetupDataTableCell>
            <SetupDataTableCell>{formatDateOnly(item.tanggal_jatuh_tempo)}</SetupDataTableCell>
            <SetupDataTableCell>{formatCurrency(item.total_outstanding)}</SetupDataTableCell>
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
          <SetupDataTableRow>
            <SetupDataTableCell
              colSpan={9}
              className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
            >
              Memuat data kontrak...
            </SetupDataTableCell>
          </SetupDataTableRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <SetupDataTableRow>
            <SetupDataTableCell
              colSpan={9}
              className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
            >
              Belum ada data kontrak yang sesuai.
            </SetupDataTableCell>
          </SetupDataTableRow>
        ) : null}
      </SetupDataTableBody>
    </SetupDataTable>
  );
}

function DebtorSearchPanel({
  query,
  status,
  onQueryChange,
  onStatusChange,
}: {
  query: string;
  status: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} grid gap-4 lg:grid-cols-[1fr_240px]`}>
      <SetupSearchInput
        label="Cari Debitur"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cari nama, nomor debitur, identitas, atau kontrak..."
      />
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

export function DebtorListClient() {
  const table = useDebtorTable();
  const router = useRouter();
  const openDetail = (debtor: DebtorRecord) => {
    router.push(`/dashboard/informasi-debitur/${debtor.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title="List Debitur"
        subtitle="Daftar debitur dan kontrak pembiayaan yang tercatat di sistem."
        icon={<Users />}
      />
      <DebtorSearchPanel
        query={table.query}
        status={table.status}
        onQueryChange={table.setQuery}
        onStatusChange={table.setStatus}
      />
      <TableCard>
        <DebtorTable
          items={table.items}
          meta={table.meta}
          isLoading={table.isLoading}
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
      </TableCard>
    </div>
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

  const [documentForm, setDocumentForm] = useState<DocumentFormState>(
    emptyDocumentForm,
  );
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);

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

  const openUploadDocument = (debtor: DebtorRecord) => {
    if (!ensureCapability(pathname, "create")) return;
    setDocumentForm(emptyDocumentForm(debtor.id));
    setIsDocumentModalOpen(true);
  };

  const closeDocumentModal = () => {
    setIsDocumentModalOpen(false);
    setDocumentForm(emptyDocumentForm());
  };

  const saveDocument = async () => {
    const validation = validateDocumentForm(documentForm);
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSavingDocument(true);
    try {
      await debiturService.createDebtorDocument(
        documentForm.debtor_id,
        buildDocumentPayload(documentForm),
      );
      showToast("Dokumen debitur diupload", "success");
      closeDocumentModal();
      await table.reload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal upload dokumen debitur",
        "error",
      );
    } finally {
      setIsSavingDocument(false);
    }
  };

  const selectedDocumentContracts = useMemo(
    () =>
      debtorContracts.contracts.filter(
        (contract) => contract.debtor_id === documentForm.debtor_id,
      ),
    [debtorContracts.contracts, documentForm.debtor_id],
  );

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
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
      <DebtorSearchPanel
        query={table.query}
        status={table.status}
        onQueryChange={table.setQuery}
        onStatusChange={table.setStatus}
      />
      <TableCard>
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
          onUploadDocument={openUploadDocument}
        />
        <Pagination
          page={table.meta.page}
          lastPage={table.meta.lastPage}
          total={table.meta.total}
          limit={table.meta.limit}
          isLoading={table.isLoading}
          onPageChange={table.setPage}
        />
      </TableCard>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Daftar Kontrak</h2>
            <p className="mt-1 text-sm text-gray-500">
              Kontrak pembiayaan yang terhubung ke data debitur.
            </p>
          </div>
        </div>
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
              {contractStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
        </div>
        <TableCard>
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
        </TableCard>
      </section>

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
      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        form={documentForm}
        contracts={toContractOptions(selectedDocumentContracts)}
        checklists={options.checklists}
        isSaving={isSavingDocument}
        onChange={(patch) => setDocumentForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeDocumentModal}
        onSave={() => void saveDocument()}
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
    </div>
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
      bodyClassName="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2"
      footer={
        <ModalFooter
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      }
    >
      <SelectField
        label="Debitur"
        value={form.debtor_id}
        options={debtors}
        onChange={(value) => onChange({ debtor_id: value, contract_id: "" })}
        required
      />
      <SelectField
        label="Kontrak"
        value={form.contract_id}
        options={contractOptions}
        onChange={(value) => onChange({ contract_id: value })}
        emptyLabel="Tanpa kontrak khusus"
      />
      <SelectField
        label="Status"
        value={form.status}
        options={activityStatusOptions.filter((option) => option.value)}
        includeEmpty={false}
        onChange={(value) => onChange({ status: value })}
      />
      <DateField
        label="Tanggal Aktivitas"
        value={form.activity_date}
        onChange={(value) => onChange({ activity_date: value })}
      />
      <DateField
        label="Target Tanggal"
        value={form.target_date}
        onChange={(value) => onChange({ target_date: value })}
      />
      <TextareaField
        label={config.primaryLabel}
        value={String(form[config.primaryKey] ?? "")}
        onChange={(value) => onChange({ [config.primaryKey]: value })}
        required
      />
      {config.secondaryFields.includes("visit_address") ? (
        <TextareaField
          label="Alamat Kunjungan"
          value={form.visit_address}
          onChange={(value) => onChange({ visit_address: value })}
        />
      ) : null}
      {config.secondaryFields.includes("conclusion") ? (
        <TextareaField
          label="Kesimpulan"
          value={form.conclusion}
          onChange={(value) => onChange({ conclusion: value })}
        />
      ) : null}
      {config.secondaryFields.includes("handling_result") ? (
        <TextareaField
          label="Hasil Penanganan"
          value={form.handling_result}
          onChange={(value) => onChange({ handling_result: value })}
        />
      ) : null}
      <TextareaField
        label="Catatan"
        value={form.notes}
        onChange={(value) => onChange({ notes: value })}
      />
      <FileUploadField
        id={`debtor-marketing-file-${kind}`}
        className="md:col-span-2"
        file={form.file}
        label="File Pendukung"
        required={false}
        validateFile={validateDomainUploadFile}
        onChange={(event) =>
          onChange({ file: event.target.files?.[0] ?? null })
        }
        onClear={() => onChange({ file: null })}
      />
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
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
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
      <TableCard>
        <SetupDataTable className="min-w-[1100px]">
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
              <SetupDataTableRow>
                <SetupDataTableCell
                  colSpan={8}
                  className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                >
                  Memuat data {config.title}...
                </SetupDataTableCell>
              </SetupDataTableRow>
            ) : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableRow>
                <SetupDataTableCell
                  colSpan={8}
                  className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                >
                  Belum ada data {config.title.toLowerCase()} yang sesuai.
                </SetupDataTableCell>
              </SetupDataTableRow>
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
      </TableCard>
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
    </div>
  );
}

function getImportConfig(type: DebtorImportType) {
  switch (type) {
    case "COLLECTIBILITY":
      return {
        title: "Import Kolektibilitas",
        subtitle: "Upload file kolektibilitas dan outstanding kontrak.",
        icon: FileSpreadsheet,
      };
    case "SLIK":
      return {
        title: "Upload Data SLIK",
        subtitle: "Simpan file SLIK dan relasi target debitur atau kontrak.",
        icon: FolderInput,
      };
    case "RESTRIK":
      return {
        title: "Upload Data Restrik",
        subtitle: "Simpan file restrik dan relasi target debitur atau kontrak.",
        icon: FolderInput,
      };
    case "MASTER":
    default:
      return {
        title: "Import Master Debitur",
        subtitle: "Upload file master debitur dan kontrak untuk pipeline import.",
        icon: FileSpreadsheet,
      };
  }
}

export function DebtorImportClient({ type }: { type: DebtorImportType }) {
  const pathname = usePathname() ?? "";
  const config = getImportConfig(type);
  const Icon = config.icon;
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const debtorContracts = useDebtorContractOptions();
  const canCreate = hasCapability(pathname, "create");
  const [items, setItems] = useState<DebtorImportJob[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ImportFormState>(emptyImportForm);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await debiturService.getImportJobs({
        page,
        limit: SETUP_TABLE_PAGE_SIZE,
        type,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat riwayat import",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, showToast, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const openUpload = () => {
    if (!ensureCapability(pathname, "create")) return;
    setForm(emptyImportForm());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyImportForm());
  };

  const saveImport = async () => {
    setIsSaving(true);
    try {
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

  const showTargetFields = type === "SLIK" || type === "RESTRIK";
  const filteredContractOptions = toContractOptions(
    form.debtor_id
      ? debtorContracts.contracts.filter((contract) => contract.debtor_id === form.debtor_id)
      : debtorContracts.contracts,
  );

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={<Icon />}
        actions={
          canCreate ? <SetupAddButton label="Upload File" onClick={openUpload} /> : null
        }
      />
      <TableCard>
        <SetupDataTable className="min-w-[980px]">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[56px]" />
            <SetupDataTableCol className="w-[140px]" />
            <SetupDataTableCol className="w-[140px]" />
            <SetupDataTableCol className="w-[240px]" />
            <SetupDataTableCol className="w-[120px]" />
            <SetupDataTableCol className="w-[120px]" />
            <SetupDataTableCol className="w-[150px]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tipe</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nama File</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Total Baris</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Berhasil</SetupDataTableHeaderCell>
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
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell>{item.file?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.total_rows)}</SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.success_rows)}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {isLoading ? (
              <SetupDataTableRow>
                <SetupDataTableCell colSpan={7} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                  Memuat riwayat import...
                </SetupDataTableCell>
              </SetupDataTableRow>
            ) : null}
            {!isLoading && items.length === 0 ? (
              <SetupDataTableRow>
                <SetupDataTableCell colSpan={7} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                  Belum ada riwayat import untuk tipe ini.
                </SetupDataTableCell>
              </SetupDataTableRow>
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
      </TableCard>
      <DashboardModal
        isOpen={isModalOpen}
        title={config.title}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        footer={
          <ModalFooter
            onClose={closeModal}
            onSave={() => void saveImport()}
            isSaving={isSaving}
            saveLabel="Upload"
          />
        }
      >
        {showTargetFields ? (
          <>
            <SelectField
              label="Debitur Target"
              value={form.debtor_id}
              options={debtorContracts.debtorOptions}
              onChange={(value) => setForm((prev) => ({ ...prev, debtor_id: value, contract_id: "" }))}
              emptyLabel="Tanpa target debitur"
            />
            <SelectField
              label="Kontrak Target"
              value={form.contract_id}
              options={filteredContractOptions}
              onChange={(value) => setForm((prev) => ({ ...prev, contract_id: value }))}
              emptyLabel="Tanpa target kontrak"
            />
            <TextField
              label="Periode"
              value={form.period_month}
              placeholder="YYYY-MM"
              onChange={(value) => setForm((prev) => ({ ...prev, period_month: value }))}
            />
            <TextField
              label="Referensi"
              value={form.raw_reference}
              onChange={(value) => setForm((prev) => ({ ...prev, raw_reference: value }))}
            />
          </>
        ) : (
          <TextField
            label="Total Baris"
            value={form.total_rows}
            type="number"
            onChange={(value) => setForm((prev) => ({ ...prev, total_rows: value }))}
          />
        )}
        <FileUploadField
          id={`debtor-import-${type}`}
          className="md:col-span-2"
          accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
          label="File Import"
          file={form.file}
          validateFile={validateDomainUploadFile}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))
          }
          onClear={() => setForm((prev) => ({ ...prev, file: null }))}
        />
      </DashboardModal>
    </div>
  );
}

export function DebtorReportClient() {
  const { showToast } = useAppToast();
  const [data, setData] = useState<DebtorReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        const result = await debiturService.getReportSummary();
        if (!ignore) setData(result);
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
  }, [showToast]);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title="Laporan Debitur"
        subtitle="Ringkasan debitur dan kontrak pembiayaan."
        icon={<FileArchive />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Debitur" value={isLoading ? "-" : data?.total_debtors ?? 0} />
        <StatCard label="Debitur Aktif" value={isLoading ? "-" : data?.active_debtors ?? 0} />
        <StatCard label="Debitur Nonaktif" value={isLoading ? "-" : data?.inactive_debtors ?? 0} />
        <StatCard label="Kontrak Aktif" value={isLoading ? "-" : data?.active_contracts ?? 0} />
        <StatCard label="Kontrak Selesai" value={isLoading ? "-" : data?.closed_contracts ?? 0} />
      </div>
    </div>
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
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
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
        <TableCard className="!w-full">
          <SetupDataTable className="min-w-[560px]">
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
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={4} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    Belum ada data kolektibilitas.
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
        <TableCard className="!w-full">
          <SetupDataTable className="min-w-[520px]">
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
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={4} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    Belum ada riwayat NPF.
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </div>
      <TableCard className="!w-full">
        <SetupDataTable className="min-w-[960px]">
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
                <SetupDataTableCell>{item.level ? `Kol ${item.level} / ${item.name}` : item.name}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.outstanding)}</SetupDataTableCell>
                <SetupDataTableCell>{formatNumber(item.remaining_months)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={item.is_npf ? "Ya" : "Tidak"} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {!isLoading && (data?.details.length ?? 0) === 0 ? (
              <SetupDataTableRow>
                <SetupDataTableCell colSpan={6} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                  Belum ada detail nasabah kolektibilitas.
                </SetupDataTableCell>
              </SetupDataTableRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </div>
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
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <FeatureHeader
        title="Laporan Aktivitas Marketing"
        subtitle="Ringkasan aktivitas marketing debitur."
        icon={<BarChart3 />}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <TableCard className="!w-full">
          <SetupDataTable className="min-w-[560px]">
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
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={3} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    Belum ada ringkasan aktivitas marketing.
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
        <TableCard className="!w-full">
          <SetupDataTable className="min-w-[720px]">
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
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={4} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    Belum ada aktivitas marketing terbaru.
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </div>
    </div>
  );
}
