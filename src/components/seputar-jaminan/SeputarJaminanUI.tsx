"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import SetupPrimaryButton from "@/components/ui/SetupPrimaryButton";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_PANEL_HEADER_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import { cn } from "@/lib/utils";

export const SJ_ROOT = "/dashboard/seputar-jaminan";
export const SJ_CATALOG = `${SJ_ROOT}/katalog`;
export const SJ_REVIEW = `${SJ_ROOT}/pemeriksaan`;
export const SJ_PROFILE = `${SJ_ROOT}/profil-kontak`;

export const PUBLICATION_STATE_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  IN_REVIEW: "Menunggu pemeriksaan",
  REVISION_REQUIRED: "Perlu diperbaiki",
  APPROVED: "Disetujui",
  PUBLISHED: "Tayang",
  UNPUBLISHED: "Tidak tayang",
  ARCHIVED: "Diarsipkan",
};

export const SYNC_STATE_LABEL: Record<string, string> = {
  NOT_QUEUED: "Belum dikirim",
  QUEUED: "Menunggu dikirim",
  SENDING: "Sedang dikirim",
  ACKNOWLEDGED: "Sudah tersambung",
  RETRYING: "Mencoba kembali",
  FAILED: "Gagal dikirim",
  QUARANTINED: "Perlu diperiksa",
};

export const ENTITY_STATE_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  IN_REVIEW: "Menunggu pemeriksaan",
  VERIFIED: "Terverifikasi",
  REJECTED: "Perlu diperbaiki",
  REVISION_REQUIRED: "Perlu diperbaiki",
  REVOKED: "Dicabut",
  READY: "Siap",
};

export const CATEGORY_LABEL: Record<string, string> = {
  LAND: "Tanah",
  BUILDING: "Bangunan",
  MACHINE_EQUIPMENT: "Mesin & peralatan",
  VEHICLE: "Kendaraan",
};

export const ATTRIBUTE_LABEL: Record<string, string> = {
  land_area_m2: "Luas tanah (m²)",
  contour: "Kontur tanah",
  road_access: "Akses jalan",
  building_area_m2: "Luas bangunan (m²)",
  floor_count: "Jumlah lantai",
  public_usage: "Fungsi bangunan",
  brand_or_manufacturer: "Merek atau produsen",
  brand: "Merek",
  model_or_type: "Model atau tipe",
  manufacture_year: "Tahun pembuatan",
  public_capacity: "Kapasitas umum",
  transmission: "Transmisi",
  fuel_type: "Bahan bakar",
  mileage_km: "Jarak tempuh (km)",
  public_condition: "Kondisi aset",
};

export const VOCABULARY_LABEL: Record<string, string> = {
  SANGAT_BAIK: "Sangat baik",
  BAIK: "Baik",
  CUKUP: "Cukup",
  PERLU_PERBAIKAN: "Perlu perbaikan",
  DATAR: "Datar",
  MIRING: "Miring",
  BERKONTUR: "Berkontur",
  RODA_DUA: "Roda dua",
  MOBIL: "Mobil",
  TRUK: "Truk",
  HUNIAN: "Hunian",
  KOMERSIAL: "Komersial",
  PERKANTORAN: "Perkantoran",
  PERGUDANGAN: "Pergudangan",
  INDUSTRI: "Industri",
  SERBAGUNA: "Serbaguna",
  MANUAL: "Manual",
  OTOMATIS: "Otomatis",
  BENSIN: "Bensin",
  DIESEL: "Diesel",
  LISTRIK: "Listrik",
  HIBRIDA: "Hibrida",
  GAS: "Gas",
};

export function readableError(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Permintaan belum dapat diproses. Silakan coba kembali.";
}

export function SjPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <FeatureHeader
      title={title}
      subtitle={`${eyebrow} — ${description}`}
      icon={<Icon aria-hidden="true" />}
      actions={action}
    />
  );
}

export function SjSection({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(SETUP_PAGE_TABLE_CARD_CLASS, className)}>
      <div className={SETUP_PAGE_PANEL_HEADER_CLASS}>
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SjStatusBadge({ state, kind = "publication" }: { state: string; kind?: "publication" | "sync" | "connection" }) {
  const danger = ["FAILED", "QUARANTINED", "REVISION_REQUIRED", "REJECTED", "REVOKED", "SUSPENDED"].includes(state);
  const success = ["PUBLISHED", "ACKNOWLEDGED", "VERIFIED", "ACTIVE", "READY"].includes(state);
  const waiting = ["IN_REVIEW", "QUEUED", "SENDING", "RETRYING", "PENDING", "PROCESSING", "UPLOAD_PENDING", "UPLOADED"].includes(state);
  const label =
    kind === "publication"
      ? PUBLICATION_STATE_LABEL[state] ?? ENTITY_STATE_LABEL[state] ?? state
      : kind === "sync"
        ? SYNC_STATE_LABEL[state] ?? state
        : ({ ACTIVE: "Terhubung", PENDING: "Belum terhubung", SUSPENDED: "Ditangguhkan", REVOKED: "Dicabut" }[state] ?? ENTITY_STATE_LABEL[state] ?? state);
  const tone: SetupStatusTone = danger
    ? "red"
    : success
      ? "emerald"
      : waiting
        ? "amber"
        : "slate";

  return (
    <SetupStatusBadge
      status={state}
      label={label}
      tone={tone}
      showIcon={danger}
    />
  );
}

export function SjPrimaryButton({
  children,
  loading = false,
  disabled = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <SetupPrimaryButton
      className={cn("[&>span]:inline-flex [&>span]:items-center [&>span]:gap-2", className)}
      icon={loading ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : undefined}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
    </SetupPrimaryButton>
  );
}

export function SjSecondaryButton({
  children,
  loading = false,
  disabled = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        SETUP_PAGE_BACK_BUTTON_CLASS,
        className,
      )}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function SjQuickLink({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="group flex min-h-32 items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition motion-safe:hover:-translate-y-0.5 hover:border-sky-600/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sky-600/20"
    >
      <Icon className="size-7 shrink-0 text-sky-600 transition-transform motion-safe:group-hover:scale-105" strokeWidth={1.7} aria-hidden="true" />
      <span>
        <span className="block font-bold text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
      </span>
    </Link>
  );
}
