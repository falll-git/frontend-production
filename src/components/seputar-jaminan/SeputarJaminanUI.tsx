"use client";

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
import { PUBLICATION_STATE_LABEL, SYNC_STATE_LABEL, ENTITY_STATE_LABEL } from './labels';
export { PUBLICATION_STATE_LABEL, SYNC_STATE_LABEL, ENTITY_STATE_LABEL } from './labels';

export const SJ_ROOT = "/dashboard/seputar-jaminan";
// Reuse the bank skeleton, but let its columns stack with SJ's mobile rows.
export const SJ_TABLE_LOADING_CLASS = "max-lg:block max-lg:w-full max-lg:[&>div]:min-w-0 max-lg:[&>div]:grid max-lg:[&>div]:grid-cols-2 max-lg:[&>div>div]:w-full";
// Legacy API permission key, retained for monitoring; no longer a navigation page.
export const SJ_SUMMARY = `${SJ_ROOT}/ringkasan`;
export const SJ_PROFILE = `${SJ_ROOT}/profil`;
export const SJ_CONTACTS = `${SJ_ROOT}/kontak`;
export const SJ_PUBLICATIONS = `${SJ_ROOT}/publikasi`;
export const SJ_SUBMISSIONS = `${SJ_ROOT}/pengajuan`;
export const SJ_CATALOG = SJ_PUBLICATIONS;
export const SJ_REVIEW = SJ_SUBMISSIONS;

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
  const success = ["APPROVED", "PUBLISHED", "ACKNOWLEDGED", "VERIFIED", "ACTIVE", "READY"].includes(state);
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
      wrap
    />
  );
}

export function SjPublicStatusBadge({
  state,
  syncState,
  hasPublishedVersion,
  onInspect,
}: {
  state: string;
  syncState: string;
  hasPublishedVersion: boolean;
  onInspect?: () => void;
}) {
  // List inputs describe bank workflow only; evidence is loaded in the detail.
  return onInspect
    ? <button type="button" onClick={onInspect} className="min-h-11 text-left text-sm font-semibold text-[#1773B0] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Lihat hasil pengecekan</button>
    : <SetupStatusBadge status={`PUBLIC_NOT_LOADED_${state}_${syncState}_${hasPublishedVersion}`} label="Lihat pengecekan di detail" tone="slate" />;
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
      icon={loading ? <RefreshCw className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : undefined}
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
      {loading ? <RefreshCw className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
