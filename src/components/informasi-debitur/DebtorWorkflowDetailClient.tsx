"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Eye,
  FileText,
  Pencil,
  ShieldCheck,
  Trash2,
  User,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import FeatureHeader from "@/components/ui/FeatureHeader";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FileUploadField from "@/components/ui/FileUploadField";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupAddButton from "@/components/ui/SetupAddButton";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupViewButton from "@/components/ui/SetupViewButton";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_PANEL_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
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
import { debiturService } from "@/services/debitur.service";
import {
  createParameterMasterService,
  type ParameterMasterRecord,
} from "@/services/parameter-master.service";
import type {
  DebtorCollateral,
  DebtorContract,
  DebtorDocument,
  DebtorDocumentChecklistStatus,
  DebtorFileMeta,
  DebtorMarketingTimelineEntry,
  DebtorRestructuringRecord,
  DebtorWarningLetter,
  DebtorWarningLetterPayload,
  DebtorWorkflow,
  DebtorWorkflowClaim,
  DebtorWorkflowCollectibility,
  DebtorWorkflowDeposit,
  DebtorWorkflowIdebUpload,
  DebtorWorkflowLegalProgress,
  DebtorWorkflowPrint,
} from "@/types/debitur.types";

type TabType =
  | "info"
  | "summary"
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
const restructuringTypeService = createParameterMasterService("/restructuring-types");

const TABS: TabConfig[] = [
  { id: "info", label: "Data Utama" },
  { id: "summary", label: "Laporan Summary" },
  {
    id: "ideb",
    label: "Hasil IDEB",
    permissions: [
      "/dashboard/informasi-debitur/admin/upload-ideb",
      "/dashboard/legal/laporan",
    ],
  },
  { id: "historis", label: "Historis Kol" },
  { id: "dokumen", label: "Dokumen" },
  { id: "agunan", label: "Agunan" },
  { id: "notaris", label: "Notaris", legal: true },
  {
    id: "sp",
    label: "Surat Peringatan",
    permissions: [
      DEBTOR_LIST_URL,
      DEBTOR_MASTER_URL,
      "/dashboard/legal/cetak/surat-peringatan",
    ],
  },
  { id: "claim", label: "Progress Klaim Asuransi", legal: true },
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

type WarningLetterFormState = {
  contract_id: string;
  letter_type: string;
  issued_at: string;
  sent_at: string;
  delivery_status: string;
  description: string;
  file: File | null;
};

const warningLetterStatusOptions = [
  { value: "BELUM_DIKIRIM", label: "Belum Dikirim" },
  { value: "TERKIRIM", label: "Terkirim" },
  { value: "DITERIMA", label: "Diterima" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
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

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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

function emptyWarningLetterForm(): WarningLetterFormState {
  return {
    contract_id: "",
    letter_type: "",
    issued_at: "",
    sent_at: "",
    delivery_status: "BELUM_DIKIRIM",
    description: "",
    file: null,
  };
}

function warningLetterToForm(item: DebtorWarningLetter): WarningLetterFormState {
  return {
    contract_id: item.contract_id ?? "",
    letter_type: item.letter_type,
    issued_at: item.issued_at?.slice(0, 10) ?? "",
    sent_at: item.sent_at?.slice(0, 10) ?? "",
    delivery_status: item.delivery_status || item.status || "BELUM_DIKIRIM",
    description: item.description ?? item.notes ?? "",
    file: null,
  };
}

function buildWarningLetterPayload(
  debtorId: string,
  form: WarningLetterFormState,
): DebtorWarningLetterPayload {
  return {
    debtor_id: debtorId,
    contract_id: form.contract_id || null,
    letter_type: form.letter_type,
    issued_at: form.issued_at,
    sent_at: form.sent_at || null,
    delivery_status: form.delivery_status || "BELUM_DIKIRIM",
    description: form.description || null,
    file: form.file,
  };
}

function validateWarningLetterForm(form: WarningLetterFormState) {
  if (!form.letter_type.trim()) return "Jenis surat peringatan wajib diisi";
  if (!form.issued_at) return "Tanggal terbit wajib diisi";
  return null;
}

function InfoItem({
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
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
        {display(value)}
      </p>
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

function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
      <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>{children}</div>
    </div>
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

function FormFieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-2 block text-sm font-medium text-gray-700">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function WarningLetterFormModal({
  isOpen,
  form,
  contracts,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  form: WarningLetterFormState;
  contracts: DebtorContract[];
  isSaving: boolean;
  onChange: (patch: Partial<WarningLetterFormState>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DashboardModal
      isOpen={isOpen}
      title="Surat Peringatan"
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
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </>
      }
    >
      <SetupFormSection title="Detail Surat">
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
        <div>
          <FormFieldLabel required>Jenis Surat</FormFieldLabel>
          <SetupTextInput
            value={form.letter_type}
            placeholder="SP1 / SP2 / SP3"
            onChange={(event) => onChange({ letter_type: event.target.value })}
          />
        </div>
        <div>
          <FormFieldLabel>Status Pengiriman</FormFieldLabel>
          <SetupSelect
            value={form.delivery_status}
            onChange={(event) => onChange({ delivery_status: event.target.value })}
          >
            {warningLetterStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SetupSelect>
        </div>
        <div>
          <FormFieldLabel required>Tanggal Terbit</FormFieldLabel>
          <BasicDateInput
            value={form.issued_at}
            onChange={(value) => onChange({ issued_at: value })}
          />
        </div>
        <div>
          <FormFieldLabel>Tanggal Kirim</FormFieldLabel>
          <BasicDateInput
            value={form.sent_at}
            onChange={(value) => onChange({ sent_at: value })}
          />
        </div>
      </SetupFormSection>
      <SetupFormSection title="File dan Keterangan" contentClassName="md:grid-cols-1">
        <div>
          <FormFieldLabel>Keterangan</FormFieldLabel>
          <SetupTextarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
        <FileUploadField
          id="debtor-detail-warning-letter-file"
          required={false}
          file={form.file}
          label="File Surat"
          validateFile={validateDomainUploadFile}
          onChange={(event) => onChange({ file: event.target.files?.[0] ?? null })}
          onClear={() => onChange({ file: null })}
        />
      </SetupFormSection>
    </DashboardModal>
  );
}

function FileButton({
  file,
  label = "Preview",
  onOpen,
}: {
  file: DebtorFileMeta | null | undefined;
  label?: string;
  onOpen: (file: DebtorFileMeta) => void;
}) {
  if (!file?.url) return <span className="text-gray-400">-</span>;

  return (
    <SetupViewButton
      label={label}
      title={file.name ? `Preview ${file.name}` : "Preview dokumen"}
      onClick={() => onOpen(file)}
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
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>{collectibility}</span>
        </div>
      ) : null}
    </div>
  );
}

function DataUtamaTab({ workflow }: { workflow: DebtorWorkflow }) {
  const debtor = workflow.debtor;
  const mainContract = workflow.contracts[0] ?? debtor.latest_contract;
  const latestSnapshot = mainContract?.latest_slik_snapshot ?? null;
  const individualProfile =
    debtor.customer_type === "INDIVIDUAL" ? debtor.individual_profile : null;
  const legalEntityProfile =
    debtor.customer_type === "LEGAL_ENTITY" ? debtor.legal_entity_profile : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Informasi Nasabah">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem label="No Debitur" value={debtor.debtor_number} />
          <InfoItem label="No Identitas" value={debtor.identity_number} />
          <InfoItem label="Nama Nasabah" value={debtor.name} />
          <InfoItem
            label="Status CIF / Jenis Nasabah"
            value={customerTypeLabel(
              debtor.customer_type,
              debtor.customer_type_label,
              debtor.slik_status_code,
            )}
          />
          <InfoItem label="Segmen SLIK" value={debtor.slik_segment} />
          <InfoItem label="Status CIF" value={debtor.slik_status_code} />
          <InfoItem label="Operasi Data" value={debtor.slik_operation_code} />
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
            <InfoItem
              label="Nama Sesuai Identitas"
              value={individualProfile.name_as_identity}
            />
            <InfoItem label="Nama Lengkap" value={individualProfile.full_name} />
            <InfoItem label="Jenis Kelamin" value={individualProfile.gender} />
            <InfoItem label="Tempat Lahir" value={individualProfile.birth_place} />
            <InfoItem
              label="Tanggal Lahir"
              value={formatDateOnly(individualProfile.birth_date)}
            />
            <InfoItem label="NPWP" value={individualProfile.tax_number} />
            <InfoItem label="Seluler" value={individualProfile.mobile_phone} />
            <InfoItem label="Email" value={individualProfile.email} />
            <InfoItem
              label="Nama Ibu Kandung"
              value={individualProfile.mother_maiden_name}
            />
            <InfoItem
              label="Alamat Sesuai SLIK"
              value={individualProfile.address_detail}
              wide
            />
          </div>
        </SectionCard>
      ) : null}

      {legalEntityProfile ? (
        <SectionCard title="CIF Badan Hukum/Yayasan">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem
              label="Nama Badan Usaha"
              value={legalEntityProfile.business_name}
            />
            <InfoItem
              label="Bentuk Badan Usaha"
              value={legalEntityProfile.legal_form_code}
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
              value={legalEntityProfile.business_field_code}
            />
            <InfoItem
              label="Nama Grup Debitur"
              value={legalEntityProfile.debtor_group_name}
            />
            <InfoItem
              label="Alamat Badan Usaha"
              value={legalEntityProfile.address_detail}
              wide
            />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Informasi Pembiayaan">
        {mainContract ? (
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem
              label="No Rekening Fasilitas"
              value={latestSnapshot?.facility_number ?? mainContract.no_kontrak}
            />
            <InfoItem
              label="Periode Data"
              value={periodLabel(latestSnapshot?.period_month ?? null)}
            />
            <InfoItem label="Produk" value={mainContract.product?.name} />
            <InfoItem label="Jenis Akad" value={mainContract.akad_type?.name} />
            <InfoItem
              label="No Akad Awal"
              value={latestSnapshot?.initial_akad_number}
            />
            <InfoItem
              label="Tanggal Akad Awal"
              value={formatDateOnly(
                latestSnapshot?.initial_akad_date ?? mainContract.tanggal_akad,
              )}
            />
            <InfoItem
              label="No Akad Akhir"
              value={latestSnapshot?.final_akad_number}
            />
            <InfoItem
              label="Tanggal Akad Akhir"
              value={formatDateOnly(latestSnapshot?.final_akad_date)}
            />
            <InfoItem
              label="Tanggal Awal Kredit"
              value={formatDateOnly(latestSnapshot?.credit_start_date)}
            />
            <InfoItem
              label="Tanggal Mulai"
              value={formatDateOnly(latestSnapshot?.start_date)}
            />
            <InfoItem
              label="Jatuh Tempo"
              value={formatDateOnly(
                latestSnapshot?.due_date ?? mainContract.tanggal_jatuh_tempo,
              )}
            />
            <InfoItem label="Tenor" value={mainContract.tenor ? `${mainContract.tenor} Bulan` : "-"} />
            <InfoItem
              label="Plafon Awal"
              value={formatOptionalCurrency(latestSnapshot?.initial_plafond)}
            />
            <InfoItem
              label="Plafon"
              value={formatOptionalCurrency(latestSnapshot?.plafond ?? mainContract.plafond)}
            />
            <InfoItem label="Pokok" value={formatCurrency(mainContract.pokok)} />
            <InfoItem label="Margin" value={formatCurrency(mainContract.margin)} />
            <InfoItem
              label="Baki Debet"
              value={formatOptionalCurrency(
                latestSnapshot?.baki_debet ?? mainContract.outstanding_pokok,
              )}
            />
            <InfoItem
              label="Tunggakan Pokok"
              value={formatOptionalCurrency(latestSnapshot?.principal_arrears)}
            />
            <InfoItem
              label="Tunggakan Margin"
              value={formatOptionalCurrency(latestSnapshot?.margin_arrears)}
            />
            <InfoItem
              label="Kolektibilitas"
              value={
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
              label="Restrukturisasi"
              value={
                latestSnapshot?.restructuring_frequency === null ||
                latestSnapshot?.restructuring_frequency === undefined
                  ? "-"
                  : `${formatNumber(latestSnapshot.restructuring_frequency)} kali`
              }
            />
            <InfoItem
              label="Kondisi"
              value={latestSnapshot?.condition_code}
            />
            <InfoItem
              label="Tanggal Kondisi"
              value={formatDateOnly(latestSnapshot?.condition_date)}
            />
            <InfoItem
              label="Kode Cabang SLIK"
              value={latestSnapshot?.branch_code}
            />
            <InfoItem label="Operasi Data" value={latestSnapshot?.operation_code} />
            <InfoItem
              label="Keterangan F01"
              value={latestSnapshot?.description ?? mainContract.objek_pembiayaan}
              wide
            />
            <InfoItem label="Agunan" value={mainContract.agunan} wide />
          </div>
        ) : (
          <EmptyState>Belum ada kontrak pembiayaan untuk debitur ini.</EmptyState>
        )}
      </SectionCard>
    </div>
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

  const unresolvedActionDates = new Set(
    timeline.entries
      .filter((entry) => entry.row_id === "action-plan" && !findLinkedLangkah(entry))
      .map((entry) => entry.date)
      .filter((date): date is string => Boolean(date)),
  );

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
        title={`${entry.summary} - ${entry.detail}`}
        className={`w-full rounded-lg border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.chipClassName} ${
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
          {entry.row_id === "action-plan" ? (
            <span className="text-xs font-semibold text-sky-700">
              {linkedLangkah?.date
                ? `Realisasi ${formatDateOnly(linkedLangkah.date)}`
                : "Belum ada realisasi"}
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
        <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white lg:block">
          <div className="grid grid-cols-[14rem_minmax(0,1fr)]">
            <div className="border-r border-gray-200 bg-white shadow-[8px_0_16px_-16px_rgba(15,23,42,0.35)]">
              <div className="border-b border-gray-200 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                  Aktivitas
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <div key={row.id} className="flex min-h-[188px] items-start px-5 py-5">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{row.label}</p>
                      <p className="mt-1 text-sm text-gray-500">{row.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-max">
                <div
                  className="grid border-b border-gray-200 bg-gray-50"
                  style={{
                    gridTemplateColumns: dates
                      .map(() => "minmax(16rem, 16rem)")
                      .join(" "),
                  }}
                >
                  {dates.map((date) => (
                    <div
                      key={date}
                      className="border-r border-gray-200 px-5 py-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-500 last:border-r-0"
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
                        className="relative grid min-h-[188px]"
                        style={{
                          gridTemplateColumns: dates
                            .map(() => "minmax(16rem, 16rem)")
                            .join(" "),
                        }}
                      >
                        <div
                          className={`pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 ${meta.lineClassName}`}
                        />
                        {dates.map((date) => {
                          const cellEntries = entriesByCell.get(`${row.id}:${date}`) ?? [];
                          const showPending =
                            row.id === "langkah-penanganan" &&
                            cellEntries.length === 0 &&
                            unresolvedActionDates.has(date);

                          return (
                            <div
                              key={`${row.id}-${date}`}
                              className="relative border-r border-gray-100 bg-white px-5 py-5 last:border-r-0"
                            >
                              <div className="relative z-10 space-y-3">
                                {cellEntries.map(renderTimelineCard)}
                                {showPending ? (
                                  <span className="inline-flex rounded-full border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500">
                                    Belum ada realisasi
                                  </span>
                                ) : null}
                                {cellEntries.length === 0 && !showPending ? (
                                  <span
                                    className={`inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold ${meta.emptyClassName}`}
                                  >
                                    -
                                  </span>
                                ) : null}
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
        <div className="space-y-4 lg:hidden">
          {dates.map((date) => {
            const dayEntries = timeline.entries.filter((entry) => entry.date === date);

            return (
              <section
                key={date}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                  {formatDateOnly(date)}
                </p>
                <div className="mt-3 space-y-3">
                  {dayEntries.length > 0 ? (
                    dayEntries.map((entry) => {
                      const row = rows.find((item) => item.id === entry.row_id);

                      return (
                        <div key={entry.id} className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                            {row?.label ?? entry.title}
                          </p>
                          {renderTimelineCard(entry)}
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                      Tidak ada aktivitas pada tanggal ini.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <DashboardModal
        isOpen={selectedEntry !== null}
        title={selectedEntry?.title ?? "Detail Aktivitas"}
        onClose={() => setSelectedEntry(null)}
        maxWidth="2xl"
      >
        {selectedEntry ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="Tanggal" value={formatDateOnly(selectedEntry.date)} />
                <InfoItem label="Status" value={statusLabel(selectedEntry.status)} />
                <InfoItem label="Kontrak" value={selectedEntry.contract?.no_kontrak} />
                <InfoItem label="Target Tanggal" value={formatDateOnly(selectedEntry.target_date)} />
                <InfoItem label="Ringkasan" value={selectedEntry.summary} wide />
                <InfoItem label="Detail" value={selectedEntry.detail} wide />
                <InfoItem label="Alamat Kunjungan" value={selectedEntry.visit_address} wide />
              </div>
            </div>
            <div className="flex justify-end">
              <FileButton file={selectedEntry.file} onOpen={onOpenFile} />
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </>
  );
}

function IdebTab({
  items,
  onOpenFile,
}: {
  items: DebtorWorkflowIdebUpload[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const [selectedIdeb, setSelectedIdeb] = useState<DebtorWorkflowIdebUpload | null>(null);

  return (
    <>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Riwayat Pengecekan IDEB</h2>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat upload dan hasil pengecekan IDEB nasabah.
        </p>
      </div>
      <TableCard>
        <SetupDataTable className="min-w-[900px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Bulan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tahun</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tgl Upload</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Kesimpulan
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Aksi
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>
                  {item.month
                    ? new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
                        new Date(item.year || 2000, item.month - 1, 1),
                      )
                    : "-"}
                </SetupDataTableCell>
                <SetupDataTableCell>{item.year || "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge
                    status={statusLabel(item.status)}
                    label={item.summary_detail?.conclusion ?? statusLabel(item.status)}
                    showIcon={false}
                  />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupViewButton
                    label="Lihat Detail"
                    title="Lihat detail hasil IDEB"
                    onClick={() => setSelectedIdeb(item)}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={7}>
                Belum ada hasil IDEB untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>

      <DashboardModal
        isOpen={selectedIdeb !== null}
        title={
          selectedIdeb
            ? `Hasil IDEB - ${selectedIdeb.summary_detail?.debtor_name ?? selectedIdeb.debtor?.name ?? "Debitur"}`
            : "Hasil IDEB"
        }
        description={
          selectedIdeb?.month && selectedIdeb.year
            ? new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
              }).format(new Date(selectedIdeb.year, selectedIdeb.month - 1, 1))
            : undefined
        }
        onClose={() => setSelectedIdeb(null)}
        maxWidth="3xl"
      >
        {selectedIdeb ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <SetupStatusBadge status={statusLabel(selectedIdeb.status)} />
            </div>
            <SectionCard title="Ringkasan Hasil IDEB">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="Nama Nasabah"
                  value={selectedIdeb.summary_detail?.debtor_name ?? selectedIdeb.debtor?.name}
                />
                <InfoItem
                  label="No Identitas"
                  value={selectedIdeb.summary_detail?.identity_number ?? selectedIdeb.debtor?.identity_number}
                />
                <InfoItem
                  label="No Kontrak"
                  value={selectedIdeb.summary_detail?.contract_number ?? selectedIdeb.contract?.no_kontrak}
                />
                <InfoItem
                  label="Kolektibilitas Berjalan"
                  value={selectedIdeb.summary_detail?.current_collectibility}
                />
                <InfoItem
                  label="OS Pokok"
                  value={formatCurrency(selectedIdeb.summary_detail?.outstanding_pokok)}
                />
                <InfoItem
                  label="Status Pembiayaan"
                  value={selectedIdeb.summary_detail?.financing_status}
                />
              </div>
            </SectionCard>

            <SectionCard title="Riwayat Kolektibilitas di BPRS Lain">
              <TableCard>
                <SetupDataTable className="min-w-[640px]">
                  <SetupDataTableHead>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell>Nama BPRS</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                        Kolektibilitas
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>OS Pokok</SetupDataTableHeaderCell>
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody>
                    {(selectedIdeb.summary_detail?.other_bprs ?? []).map((bprs) => (
                      <SetupDataTableRow key={`${bprs.name}-${bprs.collectibility}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                        <SetupDataTableCell className="font-semibold">{bprs.name}</SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                          {display(bprs.collectibility)}
                        </SetupDataTableCell>
                        <SetupDataTableCell>{formatCurrency(bprs.outstanding_pokok)}</SetupDataTableCell>
                      </SetupDataTableRow>
                    ))}
                    {(selectedIdeb.summary_detail?.other_bprs ?? []).length === 0 ? (
                      <SetupDataTableEmptyRow colSpan={3}>
                        Belum ada riwayat BPRS lain di hasil IDEB ini.
                      </SetupDataTableEmptyRow>
                    ) : null}
                  </SetupDataTableBody>
                </SetupDataTable>
              </TableCard>
            </SectionCard>

            <SectionCard title="Kesimpulan">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-semibold leading-6 text-gray-900">
                {selectedIdeb.summary_detail?.conclusion ?? "-"}
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <FileButton file={selectedIdeb.file} onOpen={onOpenFile} />
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </>
  );
}

function HistorisKolTab({ items }: { items: DebtorWorkflowCollectibility[] }) {
  return (
    <TableCard>
      <SetupDataTable className="min-w-[980px]">
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
              <SetupDataTableCell>{item.code ?? item.name ?? "-"}</SetupDataTableCell>
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
    </TableCard>
  );
}

function DokumenTab({
  items,
  checklist,
  onOpenFile,
}: {
  items: DebtorDocument[];
  checklist: DebtorDocumentChecklistStatus[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const shouldUseChecklist = checklist.length > 0;

  return (
    <TableCard>
      <SetupDataTable className="min-w-[920px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Dokumen</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kategori</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              Status
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              File
            </SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {shouldUseChecklist
            ? checklist.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">{item.name}</SetupDataTableCell>
                  <SetupDataTableCell>{item.category ?? "-"}</SetupDataTableCell>
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
                    <FileButton file={item.document?.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))
            : items.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">
                    {item.document_checklist?.name ?? item.document_type}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.category}</SetupDataTableCell>
                  <SetupDataTableCell>{display(item.description)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status="Ada" showIcon={false} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
          {(shouldUseChecklist ? checklist.length : items.length) === 0 ? (
            <SetupDataTableEmptyRow colSpan={6}>
              Belum ada checklist atau dokumen debitur.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
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
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-gray-900">
            {value}
          </p>
          <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
        </div>
      </div>
      <Icon className="h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
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

  return (
    <section className={SETUP_PAGE_PANEL_CLASS}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SetupStatusBadge status={customerLabel} showIcon={false} />
            <SetupStatusBadge status={statusLabel(debtor.status)} />
            {collectibility ? (
              <SetupStatusBadge
                status={collectibility}
                tone="emerald"
                icon={BadgeCheck}
              />
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
              label="Jaminan"
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
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <span className="text-gray-500">Produk</span>
              <span className="text-right font-semibold text-gray-900">
                {mainContract?.product?.name ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <span className="text-gray-500">Akad</span>
              <span className="text-right font-semibold text-gray-900">
                {mainContract?.akad_type?.name ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <span className="text-gray-500">Jatuh Tempo</span>
              <span className="text-right font-semibold text-gray-900">
                {formatDateOnly(mainContract?.tanggal_jatuh_tempo)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Cabang</span>
              <span className="text-right font-semibold text-gray-900">
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

function AgunanTab({
  items,
  collateralTypeLookup,
}: {
  items: DebtorCollateral[];
  collateralTypeLookup: Map<string, string>;
}) {
  return (
    <TableCard>
      <SetupDataTable className="min-w-[1480px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>No Agunan</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Pemilik</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Bukti</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Pengikatan</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Nilai NJOP/Wajar</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Nilai Pelapor</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Nilai Independen</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Diasuransikan</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Update Terakhir</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {items.map((item, index) => (
            <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell className="font-semibold">
                {item.collateral_number}
              </SetupDataTableCell>
              <SetupDataTableCell>
                {item.contract?.no_kontrak ?? item.facility_number ?? "-"}
              </SetupDataTableCell>
              <SetupDataTableCell>
                {parameterDisplay(item.collateral_type, collateralTypeLookup)}
              </SetupDataTableCell>
              <SetupDataTableCell>{display(item.collateral_status_code)}</SetupDataTableCell>
              <SetupDataTableCell>{display(item.owner_name)}</SetupDataTableCell>
              <SetupDataTableCell>{display(item.proof_number)}</SetupDataTableCell>
              <SetupDataTableCell>
                {[
                  item.binding_type_code,
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
              <SetupDataTableCell>{display(item.insured_status)}</SetupDataTableCell>
              <SetupDataTableCell>
                {periodLabel(item.last_import_period_month ?? item.period_month)}
              </SetupDataTableCell>
              <SetupDataTableCell>{display(item.description)}</SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {items.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={14}>
              Belum ada agunan hasil import SLIK untuk debitur ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
  );
}

function RestrukturisasiTab({
  items,
  restructuringTypeLookup,
}: {
  items: DebtorRestructuringRecord[];
  restructuringTypeLookup: Map<string, string>;
}) {
  return (
    <TableCard>
      <SetupDataTable className="min-w-[1120px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Tanggal Restruk</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Alasan</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>OS Setelah</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Jatuh Tempo Baru</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              Status
            </SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {items.map((item, index) => (
            <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell>{periodLabel(item.period_month)}</SetupDataTableCell>
              <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.restructuring_date)}</SetupDataTableCell>
              <SetupDataTableCell>
                {parameterDisplay(item.restructuring_type, restructuringTypeLookup)}
              </SetupDataTableCell>
              <SetupDataTableCell>{display(item.reason)}</SetupDataTableCell>
              <SetupDataTableCell>
                {formatOptionalCurrency(item.outstanding_after)}
              </SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.new_due_date)}</SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupStatusBadge status={statusLabel(item.status)} />
              </SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {items.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={9}>
              Belum ada riwayat restrukturisasi untuk debitur ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
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
    <TableCard>
      <SetupDataTable className="min-w-[1050px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Jenis Akta</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Notaris</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
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
              <SetupDataTableCell>{formatDateOnly(item.received_at)}</SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.estimated_completed_at)}</SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.completed_at)}</SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupStatusBadge status={statusLabel(item.status)} />
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <FileButton file={item.file} onOpen={onOpenFile} />
              </SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {items.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={9}>
              Belum ada progress notaris untuk debitur ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
  );
}

function SuratPeringatanTab({
  letters,
  prints,
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
  onOpenFile,
}: {
  letters: DebtorWarningLetter[];
  prints: DebtorWorkflowPrint[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: (item: DebtorWarningLetter) => void;
  onDelete: (item: DebtorWarningLetter) => void;
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const warningPrints = prints.filter(
    (item) => String(item.document_type).toUpperCase() === "SURAT_PERINGATAN",
  );

  return (
    <div className="space-y-5">
      <SectionCard
        title="Surat Peringatan Terupload"
        actions={
          canCreate ? (
            <SetupAddButton label="Tambah Surat" onClick={onCreate} />
          ) : null
        }
      >
        <TableCard>
          <SetupDataTable className="min-w-[980px]">
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
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
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
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupActionMenu
                      items={[
                        {
                          key: "view",
                          label: "Preview",
                          icon: Eye,
                          tone: "blue",
                          disabled: !item.file?.url,
                          onClick: () => {
                            if (item.file) onOpenFile(item.file);
                          },
                        },
                        {
                          key: "edit",
                          label: "Edit",
                          icon: Pencil,
                          tone: "amber",
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
              {letters.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Belum ada surat peringatan terupload.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>

      <SectionCard title="Dokumen Surat Peringatan Tercetak">
        <TableCard>
          <SetupDataTable className="min-w-[760px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nomor Dokumen</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal Cetak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {warningPrints.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.generated_number}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.printed_at)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.generated_file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {warningPrints.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={5}>
                  Belum ada cetak surat peringatan.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>
    </div>
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
      <SectionCard title="Progress Asuransi">
        <TableCard>
          <SetupDataTable className="min-w-[980px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Asuransi</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Perusahaan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>No Polis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nilai Cover</SetupDataTableHeaderCell>
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
                  <SetupDataTableCell>{display(item.policy_number)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.coverage_amount)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {insuranceProgress.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={8}>
                  Belum ada progress asuransi.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>

      <SectionCard title="Klaim Asuransi">
        <TableCard>
          <SetupDataTable className="min-w-[980px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Klaim</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
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
                  <SetupDataTableCell>{formatDateOnly(item.submitted_at)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.claim_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.approved_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.disbursed_amount)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {claims.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Belum ada klaim asuransi.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>
    </div>
  );
}

function TitipanTab({ deposits }: { deposits: DebtorWorkflowDeposit[] }) {
  const totalNominal = deposits.reduce((total, item) => total + item.nominal, 0);
  const totalRemaining = deposits.reduce(
    (total, item) => total + item.remaining_amount,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoItem label="Total Titipan" value={formatCurrency(totalNominal)} />
        <InfoItem label="Sisa Titipan" value={formatCurrency(totalRemaining)} />
        <InfoItem label="Jumlah Rekening" value={formatNumber(deposits.length)} />
      </div>

      <TableCard>
        <SetupDataTable className="min-w-[980px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Dibayar</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Diproses</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Sisa</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {deposits.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{item.deposit_type?.name ?? item.type}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.nominal)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.paid_amount)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.processed_amount)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.remaining_amount)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {deposits.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={9}>
                Belum ada dana titipan untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </div>
  );
}

function CetakLegalTab({
  prints,
  onOpenFile,
}: {
  prints: DebtorWorkflowPrint[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const legalPrints = prints.filter(
    (item) => String(item.document_type).toUpperCase() !== "SURAT_PERINGATAN",
  );

  if (legalPrints.length === 0) return null;

  return (
    <SectionCard title="Dokumen Legal Tercetak">
      <TableCard>
        <SetupDataTable className="min-w-[820px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Dokumen</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nomor Dokumen</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal Cetak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                File
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {legalPrints.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{documentTypeLabel(item.document_type)}</SetupDataTableCell>
                <SetupDataTableCell>{item.generated_number}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.printed_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.generated_file} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
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
  if (items.length === 0) return null;

  return (
    <SectionCard title="Progress KJPP">
      <TableCard>
        <SetupDataTable className="min-w-[960px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Appraisal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>KJPP</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
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
                <SetupDataTableCell>{display(item.report_number)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.appraisal_value)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.file} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </SectionCard>
  );
}

export default function DebtorWorkflowDetailClient({ debtorId }: { debtorId: string }) {
  const { role, user } = useAuth();
  const { showToast } = useAppToast();
  const { openPreview } = useDocumentPreviewContext();
  const [workflow, setWorkflow] = useState<DebtorWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningForm, setWarningForm] = useState<WarningLetterFormState>(
    emptyWarningLetterForm,
  );
  const [warningEditing, setWarningEditing] = useState<DebtorWarningLetter | null>(null);
  const [warningDeleting, setWarningDeleting] = useState<DebtorWarningLetter | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isSavingWarning, setIsSavingWarning] = useState(false);
  const [isDeletingWarning, setIsDeletingWarning] = useState(false);
  const [collateralTypes, setCollateralTypes] = useState<ParameterMasterRecord[]>([]);
  const [restructuringTypes, setRestructuringTypes] = useState<
    ParameterMasterRecord[]
  >([]);

  const canCreateWarningLetter = hasDebtorMasterCapability(role, user?.role_id, "create");
  const canUpdateWarningLetter = hasDebtorMasterCapability(role, user?.role_id, "update");
  const canDeleteWarningLetter = hasDebtorMasterCapability(role, user?.role_id, "delete");

  const canViewLegal = hasAnyMenuCapability(role, user?.role_id, [
    "/dashboard/legal/laporan",
    "/dashboard/legal/progress/notaris",
    "/dashboard/legal/progress/asuransi",
    "/dashboard/legal/progress/kjpp",
    "/dashboard/legal/progress/klaim",
    "/dashboard/legal/titipan/asuransi",
    "/dashboard/legal/titipan/notaris",
    "/dashboard/legal/titipan/angsuran",
    "/dashboard/legal/cetak/surat-peringatan",
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
    let ignore = false;

    async function loadParameterLookups() {
      try {
        const [nextCollateralTypes, nextRestructuringTypes] = await Promise.all([
          collateralTypeService.getAll({ is_active: true }),
          restructuringTypeService.getAll({ is_active: true }),
        ]);

        if (!ignore) {
          setCollateralTypes(nextCollateralTypes);
          setRestructuringTypes(nextRestructuringTypes);
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
  const restructuringTypeLookup = useMemo(
    () => createParameterLookup(restructuringTypes),
    [restructuringTypes],
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

  const openCreateWarningLetter = () => {
    if (!canCreateWarningLetter) return;
    setWarningEditing(null);
    setWarningForm(emptyWarningLetterForm());
    setIsWarningModalOpen(true);
  };

  const openEditWarningLetter = (item: DebtorWarningLetter) => {
    if (!canUpdateWarningLetter) return;
    setWarningEditing(item);
    setWarningForm(warningLetterToForm(item));
    setIsWarningModalOpen(true);
  };

  const closeWarningModal = () => {
    setIsWarningModalOpen(false);
    setWarningEditing(null);
    setWarningForm(emptyWarningLetterForm());
  };

  const saveWarningLetter = async () => {
    const validation = validateWarningLetterForm(warningForm);
    if (validation) {
      showToast(validation, "warning");
      return;
    }

    setIsSavingWarning(true);
    try {
      const payload = buildWarningLetterPayload(debtorId, warningForm);
      if (warningEditing) {
        await debiturService.updateWarningLetter(warningEditing.id, payload);
        showToast("Surat peringatan diperbarui", "success");
      } else {
        await debiturService.createWarningLetter(payload);
        showToast("Surat peringatan ditambahkan", "success");
      }
      closeWarningModal();
      await loadWorkflow();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan surat peringatan",
        "error",
      );
    } finally {
      setIsSavingWarning(false);
    }
  };

  const confirmDeleteWarningLetter = async () => {
    if (!warningDeleting) return;
    if (!canDeleteWarningLetter) return;

    setIsDeletingWarning(true);
    try {
      await debiturService.removeWarningLetter(warningDeleting.id);
      showToast("Surat peringatan dihapus", "success");
      setWarningDeleting(null);
      await loadWorkflow();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus surat peringatan",
        "error",
      );
    } finally {
      setIsDeletingWarning(false);
    }
  };

  const mainContract: DebtorContract | null =
    workflow?.contracts[0] ?? workflow?.debtor.latest_contract ?? null;

  const headerCollectibility = collectibilityLabel(mainContract?.latest_collectibility ?? null);

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
              <DataUtamaTab workflow={workflow} />
            ) : null}
            {resolvedActiveTab === "summary" ? (
              <SummaryTab workflow={workflow} onOpenFile={openFile} />
            ) : null}
            {resolvedActiveTab === "ideb" ? (
              <IdebTab items={workflow.ideb_uploads} onOpenFile={openFile} />
            ) : null}
            {resolvedActiveTab === "historis" ? (
              <HistorisKolTab items={workflow.collectibilities} />
            ) : null}
            {resolvedActiveTab === "dokumen" ? (
              <DokumenTab
                items={workflow.documents}
                checklist={workflow.document_checklist_status}
                onOpenFile={openFile}
              />
            ) : null}
            {resolvedActiveTab === "agunan" ? (
              <div className="space-y-5">
                <SectionCard title="Jaminan A01">
                  <AgunanTab
                    items={workflow.collaterals}
                    collateralTypeLookup={collateralTypeLookup}
                  />
                </SectionCard>
                <SectionCard title="Riwayat Restrukturisasi">
                  <RestrukturisasiTab
                    items={workflow.restructuring_records}
                    restructuringTypeLookup={restructuringTypeLookup}
                  />
                </SectionCard>
              </div>
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
                prints={workflow.legal.prints}
                canCreate={canCreateWarningLetter}
                canUpdate={canUpdateWarningLetter}
                canDelete={canDeleteWarningLetter}
                onCreate={openCreateWarningLetter}
                onEdit={openEditWarningLetter}
                onDelete={setWarningDeleting}
                onOpenFile={openFile}
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
              <div className="space-y-5">
                <TitipanTab deposits={workflow.legal.deposits} />
                <CetakLegalTab
                  prints={workflow.legal.prints}
                  onOpenFile={openFile}
                />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      <WarningLetterFormModal
        isOpen={isWarningModalOpen}
        form={warningForm}
        contracts={workflow?.contracts ?? []}
        isSaving={isSavingWarning}
        onChange={(patch) => setWarningForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeWarningModal}
        onSave={() => void saveWarningLetter()}
      />
      <DeleteConfirmModal
        isOpen={warningDeleting !== null}
        title="Hapus Surat Peringatan?"
        entityLabel="Surat Peringatan"
        itemName={
          warningDeleting
            ? `${warningDeleting.letter_type} - ${warningDeleting.debtor?.name ?? workflow?.debtor.name ?? debtorId}`
            : ""
        }
        onClose={() => setWarningDeleting(null)}
        onConfirm={() => void confirmDeleteWarningLetter()}
        isLoading={isDeletingWarning}
      />
    </DashboardPageShell>
  );
}
