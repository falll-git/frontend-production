import {
  Banknote,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  FileCheck2,
  FileSignature,
  Landmark,
  ListChecks,
  Send,
  Tags,
  Workflow,
} from "lucide-react";

import type { ParameterMasterPageConfig } from "@/components/parameter/ParameterMasterPage";
import {
  SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  SETUP_PARAMETER_PAGE_WIDTH_MD_CLASS,
} from "@/components/ui/setupPageStyles";

const STATUS_FIELD = {
  key: "is_active",
  label: "Status",
  type: "status",
  defaultValue: true,
} satisfies ParameterMasterPageConfig["fields"][number];

const DESCRIPTION_FIELD = {
  key: "description",
  label: "Keterangan",
  type: "textarea",
  placeholder: "Masukkan keterangan",
  colSpan: "full",
} satisfies ParameterMasterPageConfig["fields"][number];

const CODE_NAME_COLUMNS = [
  {
    key: "code",
    label: "Kode",
    type: "code",
    widthClassName: "w-[132px]",
  },
  {
    key: "name",
    label: "Nama",
    className: "min-w-[220px] font-semibold text-gray-900",
  },
] satisfies ParameterMasterPageConfig["columns"];

const depositTypeCategoryOptions = [
  { label: "Notaris", value: "NOTARIS" },
  { label: "Asuransi", value: "ASURANSI" },
  { label: "Angsuran", value: "ANGSURAN" },
  { label: "Lainnya", value: "LAINNYA" },
];

const legalProcessCategoryOptions = [
  { label: "Notaris", value: "NOTARY_DEED" },
  { label: "Asuransi", value: "INSURANCE_TYPE" },
  { label: "KJPP", value: "KJPP_APPRAISAL" },
  { label: "Klaim Asuransi", value: "INSURANCE_CLAIM" },
];

function simpleCodeNameConfig(
  overrides: Pick<
    ParameterMasterPageConfig,
    "title" | "subtitle" | "entityLabel" | "endpoint" | "icon" | "addLabel" | "searchPlaceholder"
  > &
    Partial<
      Pick<
        ParameterMasterPageConfig,
        | "fields"
        | "columns"
        | "tableMinWidthClassName"
        | "layoutWidthClassName"
        | "tableWidthClassName"
      >
    >,
): ParameterMasterPageConfig {
  return {
    ...overrides,
    layoutWidthClassName:
      overrides.layoutWidthClassName ?? SETUP_PARAMETER_PAGE_WIDTH_MD_CLASS,
    tableWidthClassName:
      overrides.tableWidthClassName ?? SETUP_PARAMETER_PAGE_WIDTH_MD_CLASS,
    fields:
      overrides.fields ??
      [
        {
          key: "code",
          label: "Kode",
          required: true,
          placeholder: "Masukkan kode",
        },
        {
          key: "name",
          label: "Nama",
          required: true,
          placeholder: "Masukkan nama",
        },
        DESCRIPTION_FIELD,
        STATUS_FIELD,
      ],
    columns:
      overrides.columns ??
      [
        ...CODE_NAME_COLUMNS,
        {
          key: "description",
          label: "Keterangan",
          className: "min-w-[240px] max-w-[320px] truncate text-gray-600",
        },
        {
          key: "is_active",
          label: "Status",
          type: "status",
          widthClassName: "w-[120px]",
        },
      ],
  };
}

export const branchParameterConfig: ParameterMasterPageConfig = {
  title: "Setup Cabang",
  subtitle: "Kelola master cabang yang dipakai di modul debitur dan legal.",
  entityLabel: "cabang",
  endpoint: "/branches",
  icon: Building2,
  addLabel: "Tambah Cabang",
  searchPlaceholder: "Cari kode, nama, alamat, atau telepon...",
  layoutWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  tableWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  fields: [
    { key: "code", label: "Kode Cabang", required: true, placeholder: "Masukkan kode cabang" },
    { key: "name", label: "Nama Cabang", required: true, placeholder: "Masukkan nama cabang" },
    { key: "phone", label: "Telepon", placeholder: "Masukkan nomor telepon" },
    { key: "address", label: "Alamat", type: "textarea", placeholder: "Masukkan alamat", colSpan: "full" },
    STATUS_FIELD,
  ],
  columns: [
    ...CODE_NAME_COLUMNS,
    { key: "phone", label: "Telepon", widthClassName: "w-[160px]" },
    { key: "address", label: "Alamat", className: "min-w-[260px] max-w-[360px] truncate text-gray-600" },
    { key: "is_active", label: "Status", type: "status", widthClassName: "w-[120px]" },
  ],
  tableMinWidthClassName: "min-w-[980px]",
};

export const financingProductParameterConfig = simpleCodeNameConfig({
  title: "Setup Produk Pembiayaan",
  subtitle: "Kelola pilihan produk pembiayaan untuk data debitur.",
  entityLabel: "produk pembiayaan",
  endpoint: "/financing-products",
  icon: Banknote,
  addLabel: "Tambah Produk",
  searchPlaceholder: "Cari kode, nama, atau keterangan produk...",
});

export const contractTypeParameterConfig = simpleCodeNameConfig({
  title: "Setup Jenis Akad",
  subtitle: "Kelola master jenis akad yang dipakai di kontrak debitur.",
  entityLabel: "jenis akad",
  endpoint: "/contract-types",
  icon: FileSignature,
  addLabel: "Tambah Akad",
  searchPlaceholder: "Cari kode, nama, atau keterangan akad...",
});

export const mailDeliveryMediaParameterConfig = simpleCodeNameConfig({
  title: "Setup Media Pengiriman Surat",
  subtitle: "Kelola media pengiriman yang bisa dipilih pada Surat Keluar.",
  entityLabel: "media pengiriman surat",
  endpoint: "/mail-delivery-media",
  icon: Send,
  addLabel: "Tambah Media",
  searchPlaceholder: "Cari kode, nama, atau keterangan media...",
  fields: [
    {
      key: "code",
      label: "Kode Media",
      required: true,
      placeholder: "Masukkan kode media",
    },
    { key: "name", label: "Nama Media", required: true, placeholder: "Masukkan nama media" },
    DESCRIPTION_FIELD,
    STATUS_FIELD,
  ],
});

export const collateralTypeParameterConfig = simpleCodeNameConfig({
  title: "Setup Jenis Agunan",
  subtitle: "Kelola label/filter jenis agunan untuk data A01 dan jaminan debitur.",
  entityLabel: "jenis agunan",
  endpoint: "/collateral-types",
  icon: Landmark,
  addLabel: "Tambah Jenis Agunan",
  searchPlaceholder: "Cari kode, nama, atau keterangan agunan...",
});

export const documentChecklistParameterConfig: ParameterMasterPageConfig = {
  title: "Setup Checklist Dokumen",
  subtitle: "Kelola daftar dokumen wajib atau opsional untuk kebutuhan proses.",
  entityLabel: "checklist dokumen",
  endpoint: "/document-checklists",
  icon: ClipboardCheck,
  addLabel: "Tambah Checklist",
  searchPlaceholder: "Cari kode, nama, kategori, atau jenis dokumen...",
  layoutWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  tableWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  fields: [
    { key: "code", label: "Kode", required: true, placeholder: "Masukkan kode" },
    { key: "name", label: "Nama Dokumen", required: true, placeholder: "Masukkan nama dokumen" },
    { key: "category", label: "Kategori", placeholder: "Masukkan kategori" },
    { key: "document_type", label: "Jenis Dokumen", placeholder: "Masukkan jenis dokumen" },
    { key: "is_required", label: "Wajib", type: "boolean", defaultValue: false },
    DESCRIPTION_FIELD,
    STATUS_FIELD,
  ],
  columns: [
    { key: "code", label: "Kode", type: "code", widthClassName: "w-[120px]" },
    { key: "name", label: "Nama Dokumen", className: "min-w-[220px] font-semibold text-gray-900" },
    { key: "category", label: "Kategori", widthClassName: "w-[160px]" },
    { key: "document_type", label: "Jenis Dokumen", widthClassName: "w-[180px]" },
    { key: "is_required", label: "Wajib", type: "boolean", widthClassName: "w-[100px]" },
    { key: "is_active", label: "Status", type: "status", widthClassName: "w-[120px]" },
  ],
  tableMinWidthClassName: "min-w-[1040px]",
};

export const depositTypeParameterConfig = simpleCodeNameConfig({
  title: "Setup Jenis Titipan",
  subtitle: "Kelola master jenis titipan untuk kebutuhan legal.",
  entityLabel: "jenis titipan",
  endpoint: "/deposit-types",
  icon: Tags,
  addLabel: "Tambah Titipan",
  searchPlaceholder: "Cari kode, nama, kategori, atau keterangan titipan...",
  layoutWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  tableWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  fields: [
    { key: "code", label: "Kode", required: true, placeholder: "Masukkan kode" },
    { key: "name", label: "Nama Titipan", required: true, placeholder: "Masukkan nama titipan" },
    { key: "category", label: "Kategori", type: "select", required: true, options: depositTypeCategoryOptions },
    DESCRIPTION_FIELD,
    STATUS_FIELD,
  ],
  columns: [
    ...CODE_NAME_COLUMNS,
    { key: "category", label: "Kategori", widthClassName: "w-[160px]" },
    { key: "description", label: "Keterangan", className: "min-w-[240px] max-w-[320px] truncate text-gray-600" },
    { key: "is_active", label: "Status", type: "status", widthClassName: "w-[120px]" },
  ],
});

export const legalProcessTypeParameterConfig = simpleCodeNameConfig({
  title: "Setup Jenis Proses Legal",
  subtitle: "Kelola jenis proses untuk progress notaris, asuransi, KJPP, dan klaim.",
  entityLabel: "jenis proses legal",
  endpoint: "/legal-process-types",
  icon: Workflow,
  addLabel: "Tambah Proses Legal",
  searchPlaceholder: "Cari kode, nama, kategori, atau keterangan proses...",
  layoutWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  tableWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  fields: [
    { key: "code", label: "Kode", required: true, placeholder: "Masukkan kode" },
    { key: "name", label: "Nama Proses", required: true, placeholder: "Masukkan nama proses" },
    {
      key: "category",
      label: "Kategori",
      type: "select",
      required: true,
      options: legalProcessCategoryOptions,
    },
    DESCRIPTION_FIELD,
    STATUS_FIELD,
  ],
  columns: [
    ...CODE_NAME_COLUMNS,
    { key: "category", label: "Kategori", widthClassName: "w-[180px]" },
    { key: "description", label: "Keterangan", className: "min-w-[240px] max-w-[320px] truncate text-gray-600" },
    { key: "is_active", label: "Status", type: "status", widthClassName: "w-[120px]" },
  ],
  tableMinWidthClassName: "min-w-[980px]",
});

function thirdPartyConfig(
  category: "NOTARY" | "INSURANCE" | "KJPP",
  title: string,
  entityLabel: string,
  addLabel: string,
  icon: ParameterMasterPageConfig["icon"],
): ParameterMasterPageConfig {
  return {
    title,
    subtitle: "Kelola master pihak ketiga yang dipakai di modul legal dan debitur.",
    entityLabel,
    endpoint: "/third-parties",
    icon,
    addLabel,
    searchPlaceholder: "Cari kode, nama, kontak, telepon, atau email...",
    layoutWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
    tableWidthClassName: SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
    filters: { category },
    fixedPayload: { category },
    fields: [
      { key: "code", label: "Kode", required: true, placeholder: "Masukkan kode" },
      { key: "name", label: "Nama", required: true, placeholder: "Masukkan nama" },
      { key: "contact_person", label: "Kontak", placeholder: "Masukkan kontak" },
      { key: "phone", label: "Telepon", placeholder: "Masukkan telepon" },
      { key: "email", label: "Email", placeholder: "Masukkan email" },
      { key: "address", label: "Alamat", type: "textarea", placeholder: "Masukkan alamat", colSpan: "full" },
      DESCRIPTION_FIELD,
      STATUS_FIELD,
    ],
    columns: [
      { key: "code", label: "Kode", type: "code", widthClassName: "w-[120px]" },
      { key: "name", label: "Nama", className: "min-w-[220px] font-semibold text-gray-900" },
      { key: "contact_person", label: "Kontak", widthClassName: "w-[180px]" },
      { key: "phone", label: "Telepon", widthClassName: "w-[160px]" },
      { key: "email", label: "Email", className: "min-w-[220px] max-w-[280px] truncate text-gray-600" },
      { key: "is_active", label: "Status", type: "status", widthClassName: "w-[120px]" },
    ],
    tableMinWidthClassName: "min-w-[1040px]",
  };
}

export const notaryParameterConfig = thirdPartyConfig(
  "NOTARY",
  "Setup Notaris",
  "notaris",
  "Tambah Notaris",
  BookOpenCheck,
);

export const insuranceParameterConfig = thirdPartyConfig(
  "INSURANCE",
  "Setup Perusahaan Asuransi",
  "perusahaan asuransi",
  "Tambah Asuransi",
  FileCheck2,
);

export const kjppParameterConfig = thirdPartyConfig(
  "KJPP",
  "Setup KJPP",
  "KJPP",
  "Tambah KJPP",
  ListChecks,
);
