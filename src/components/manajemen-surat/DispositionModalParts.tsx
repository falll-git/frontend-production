"use client";

import type { ReactNode } from "react";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import type { SuratUser } from "@/types/surat.types";

export type DispositionActionMode = "disposisi" | "redisposisi";

type DispositionActionSource = {
  sequence?: number | null;
  is_disposisi_ulang?: boolean | null;
};

export function getDispositionActionMode(
  disposition: DispositionActionSource | null | undefined,
): DispositionActionMode {
  if (!disposition) return "disposisi";

  return disposition.is_disposisi_ulang ||
    Boolean(disposition.sequence && disposition.sequence > 1)
    ? "redisposisi"
    : "disposisi";
}

export function getDispositionActionLabel(
  mode: DispositionActionMode,
): "Disposisi" | "Redisposisi" {
  return mode === "redisposisi" ? "Redisposisi" : "Disposisi";
}

export function DispositionDetailItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  const displayValue = value?.trim() || "-";

  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800">
        {displayValue}
      </p>
    </div>
  );
}

export function DispositionSectionPanel({
  icon,
  title,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`.trim()}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex shrink-0 text-slate-900">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function mapDispositionStatusBadge(
  status: string,
  label: string,
): Parameters<typeof SetupStatusBadge>[0]["status"] {
  switch (status) {
    case "COMPLETED":
      return "Selesai";
    case "IN_PROGRESS":
      return "Dalam Proses";
    case "FORWARDED":
      return "Diteruskan";
    case "NEW":
      return "Baru";
    default:
      return label === "Selesai" ||
        label === "Dalam Proses" ||
        label === "Diteruskan" ||
        label === "Baru"
        ? label
        : "Baru";
  }
}

export function getCleanUserName(user: SuratUser): string {
  if (!user.roleName) return user.nama;

  const roleSuffix = ` ${user.roleName}`;
  return user.nama.endsWith(roleSuffix)
    ? user.nama.slice(0, -roleSuffix.length).trim()
    : user.nama;
}

export function getUserMeta(user: SuratUser): string {
  return [user.roleName, user.divisi]
    .filter((value): value is string => Boolean(value && value !== "-"))
    .join(" - ");
}

export function getUserSearchText(user: SuratUser): string {
  return [
    user.nama,
    getCleanUserName(user),
    user.roleName,
    user.divisi,
    user.username,
    user.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
