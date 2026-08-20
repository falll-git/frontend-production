import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Pencil,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type SetupStatusTone =
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "violet"
  | "sky"
  | "slate"
  | "gray";

type SetupStatusBadgeProps = {
  status: string;
  label?: ReactNode;
  tone?: SetupStatusTone;
  icon?: LucideIcon | null;
  showIcon?: boolean;
  size?: "sm" | "md";
  wrap?: boolean;
  className?: string;
  textClassName?: string;
};

const BASE_BADGE_CLASS =
  "inline-flex items-center justify-center rounded-full border font-medium";

const SIZE_CLASS = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

const TONE_CLASS: Record<SetupStatusTone, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  gray: "border-gray-200 bg-gray-50 text-gray-700",
};

const TONE_ICON: Record<SetupStatusTone, LucideIcon> = {
  emerald: CheckCircle2,
  amber: Clock3,
  red: XCircle,
  blue: Clock3,
  violet: LoaderCircle,
  sky: Clock3,
  slate: Clock3,
  gray: Clock3,
};

const STATUS_LABEL_BY_KEY: Record<string, string> = {
  ACTIVE: "Aktif",
  AKTIF: "Aktif",
  BERJALAN: "Aktif",
  INACTIVE: "Nonaktif",
  NONAKTIF: "Nonaktif",
  AVAILABLE: "Tersedia",
  APPROVED: "Disetujui",
  DISETUJUI: "Disetujui",
  RETURNED: "Dikembalikan",
  HANDED_OVER: "Sudah Diserahkan",
  NEW: "Baru",
  COMPLETED: "Selesai",
  SELESAI: "Selesai",
  COMPLETE: "Selesai",
  DONE: "Selesai",
  CLOSED: "Selesai",
  LUNAS: "Selesai",
  COMPLETED_WITH_ERRORS: "Selesai dengan Error",
  COMPLETED_WITH_ERROR: "Selesai dengan Error",
  SAFE: "Aman",
  YES: "Ya",
  YA: "Ya",
  NO: "Tidak",
  TIDAK: "Tidak",
  REJECTED: "Ditolak",
  DITOLAK: "Ditolak",
  REVOKED: "Dicabut",
  DELETED: "Dihapus",
  FAILED: "Gagal",
  GAGAL: "Gagal",
  BORROWED: "Dipinjam",
  SUBMITTED: "Diajukan",
  PENDING: "Menunggu",
  MENUNGGU: "Menunggu",
  FORWARDED: "Diteruskan",
  NOT_APPLIED: "Belum Diterapkan",
  IN_PROGRESS: "Dalam Proses",
  DALAM_PROSES: "Dalam Proses",
  PROGRESS: "Dalam Proses",
  DIPROSES: "Dalam Proses",
  PROCESSING: "Dalam Proses",
  PROSES: "Dalam Proses",
  CANCELLED: "Dibatalkan",
  CANCELED: "Dibatalkan",
  BATAL: "Dibatalkan",
  DRAFT: "Draf",
  SENT: "Dikirim",
  DIKIRIM: "Dikirim",
  RECEIVED: "Diterima",
  UPLOADED: "Terupload",
  TERUPLOAD: "Terupload",
  VERIFIED: "Terverifikasi",
  VERIFIKASI: "Verifikasi",
  CONNECTED: "Terhubung",
  NOT_CONNECTED: "Belum Terhubung",
  PRESENT: "Ada",
  ADA: "Ada",
  MISSING: "Belum Ada",
  BELUM_ADA: "Belum Ada",
  COMPLETE_DATA: "Lengkap",
  INCOMPLETE: "Belum Lengkap",
  NOT_APPLICABLE: "Tidak Berlaku",
  NOT_SET: "Belum Diisi",
  CURRENT: "Aman",
  DUE_SOON: "Segera Berakhir",
  EXPIRED: "Expired",
  OVERDUE: "Terlambat",
  NEAR_LIMIT: "Mendekati Limit",
  OVER_LIMIT: "Melewati Batas",
  ACTION_REQUIRED: "Perlu Tindakan",
  PERLU_REKONSILIASI: "Perlu Rekonsiliasi",
  UNSUPPORTED: "Belum Didukung",
  NOT_SUPPORTED: "Belum Didukung",
  LOW_ACCURACY: "Akurasi Rendah",
};

const ATTENTION_STATUS_KEYS = new Set([
  "PERHATIAN",
  "JATUH_TEMPO",
  "DUE_SOON",
  "SEGERA_BERAKHIR",
  "MENDEKATI_TENGGAT",
  "MENDEKATI_LIMIT",
  "NEAR_LIMIT",
  "PERLU_TINDAKAN",
  "ACTION_REQUIRED",
  "PERLU_REKONSILIASI",
  "BELUM_DIDUKUNG",
  "UNSUPPORTED",
  "NOT_SUPPORTED",
  "AKURASI_RENDAH",
  "LOW_ACCURACY",
  "SELESAI_DENGAN_ERROR",
  "COMPLETED_WITH_ERRORS",
  "COMPLETED_WITH_ERROR",
  "GAGAL",
  "FAILED",
  "TERLAMBAT",
  "OVERDUE",
  "MELEWATI_BATAS",
  "OVER_LIMIT",
  "MELEWATI_KUOTA_ARGO_BERJALAN",
  "EXPIRED",
  "SUDAH_BERAKHIR",
  "KEDALUWARSA",
  "LEWAT_TENGGAT",
  "LEWAT_TEMPO",
  "LEWAT_EXPIRED",
  "WAJIB_DINILAI_ULANG",
  "BERMASALAH",
  "KRITIS",
  "CRITICAL",
  "ERROR",
]);

const STATUS_ACRONYMS = new Set([
  "API",
  "CIF",
  "DPD",
  "ID",
  "IDEB",
  "KJPP",
  "KOL",
  "NPF",
  "PDF",
  "RLS",
  "SHGB",
  "SLIK",
]);

function toStatusKey(status: string) {
  return status
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function formatSetupStatusLabel(status: string) {
  const trimmed = status.trim();
  if (!trimmed) return "-";

  const key = toStatusKey(trimmed);
  const knownLabel = STATUS_LABEL_BY_KEY[key];
  if (knownLabel) return knownLabel;

  const isMachineToken =
    /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/.test(trimmed) &&
    (trimmed.includes("_") || trimmed === trimmed.toUpperCase());

  if (!isMachineToken) {
    return trimmed;
  }

  return trimmed
    .split("_")
    .filter(Boolean)
    .map((token) => {
      const uppercaseToken = token.toUpperCase();
      if (
        /^\d+$/.test(token) ||
        /\d/.test(token) ||
        STATUS_ACRONYMS.has(uppercaseToken)
      ) {
        return uppercaseToken;
      }
      const lowercaseToken = token.toLowerCase();
      return `${lowercaseToken.charAt(0).toUpperCase()}${lowercaseToken.slice(1)}`;
    })
    .join(" ");
}

export function shouldShowSetupStatusIcon(status: string) {
  return ATTENTION_STATUS_KEYS.has(toStatusKey(status));
}

function getBadgeClass(tone: SetupStatusTone, size: "sm" | "md") {
  return `${BASE_BADGE_CLASS} ${SIZE_CLASS[size]} ${TONE_CLASS[tone]}`;
}

function getStatusConfig(status: string, size: "sm" | "md") {
  const normalized = formatSetupStatusLabel(status)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (normalized === "urutan") {
    return {
      icon: null,
      className:
        "inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-2 text-xs font-bold text-sky-700",
    };
  }

  switch (normalized) {
    case "aktif":
    case "fasilitas aktif":
    case "masih aktif":
    case "tersedia":
    case "disetujui":
    case "dikembalikan":
    case "selesai":
    case "completed":
    case "complete":
    case "done":
    case "aman":
    case "ya":
    case "terupload":
    case "cair":
    case "dikirim":
    case "terkirim":
    case "diterima":
    case "terverifikasi":
    case "terhubung":
    case "ada":
    case "lengkap":
    case "presisi tinggi":
      return {
        icon: CheckCircle2,
        className: getBadgeClass("emerald", size),
      };
    case "nonaktif":
    case "tidak":
    case "dibatalkan":
    case "draf":
    case "tidak berlaku":
    case "belum ada":
    case "belum terukur":
    case "tanggal expired belum diisi":
      return {
        icon: null,
        className: getBadgeClass("gray", size),
      };
    case "ditolak":
    case "dicabut":
    case "hapus":
    case "dihapus":
      return {
        icon: XCircle,
        className: getBadgeClass("red", size),
      };
    case "gagal":
    case "failed":
    case "akurasi rendah":
    case "bermasalah":
    case "expired":
    case "sudah berakhir":
    case "kedaluwarsa":
    case "wajib dinilai ulang":
    case "selesai dengan error":
    case "kritis":
    case "critical":
    case "error":
      return {
        icon: XCircle,
        className: getBadgeClass("red", size),
      };
    case "dipinjam":
    case "sudah diserahkan":
    case "penyerahan":
    case "perhatian":
    case "jatuh tempo":
    case "due soon":
    case "segera berakhir":
    case "mendekati tenggat":
    case "mendekati limit":
    case "perlu tindakan":
    case "perlu rekonsiliasi":
    case "belum lengkap":
    case "belum terhubung":
    case "klaim":
      return {
        icon: Clock3,
        className: getBadgeClass("amber", size),
      };
    case "terlambat":
    case "melewati batas":
    case "melewati kuota / argo berjalan":
    case "melewati kuota argo berjalan":
    case "overdue":
    case "lewat tenggat":
    case "lewat tempo":
    case "lewat expired":
      return {
        icon: AlertTriangle,
        className: getBadgeClass("red", size),
      };
    case "diajukan":
    case "input baru":
    case "baru":
    case "persetujuan":
    case "menunggu":
    case "menunggu persetujuan":
    case "pending":
    case "diteruskan":
    case "belum diterapkan":
    case "pengajuan":
    case "verifikasi":
      return {
        icon: Clock3,
        className: getBadgeClass("blue", size),
      };
    case "pengembalian":
    case "perubahan data":
      return {
        icon: normalized === "perubahan data" ? Pencil : CheckCircle2,
        className: getBadgeClass("violet", size),
      };
    case "pindah lokasi":
    case "belum didukung":
      return {
        icon: normalized === "belum didukung" ? AlertTriangle : ArrowRightLeft,
        className: getBadgeClass("amber", size),
      };
    case "dalam proses":
    case "diproses":
    case "proses":
    case "in progress":
    case "processing":
      return {
        icon: LoaderCircle,
        className: getBadgeClass("violet", size),
      };
    default:
      return {
        icon: null,
        className: getBadgeClass("gray", size),
      };
  }
}

export default function SetupStatusBadge({
  status,
  label,
  tone,
  icon,
  showIcon,
  size = "sm",
  wrap = false,
  className = "",
  textClassName = "",
}: SetupStatusBadgeProps) {
  const config = tone
    ? {
        icon: TONE_ICON[tone],
        className: getBadgeClass(tone, size),
      }
    : getStatusConfig(status, size);

  const shouldShowIcon = showIcon ?? shouldShowSetupStatusIcon(status);
  const statusPriority = shouldShowSetupStatusIcon(status)
    ? "attention"
    : "routine";
  const defaultIcon = config.icon ?? (statusPriority === "attention" ? AlertTriangle : null);
  const Icon = shouldShowIcon ? icon === undefined ? defaultIcon : icon : null;
  const displayLabel = label ?? formatSetupStatusLabel(status);

  return (
    <span
      data-ui="status-badge"
      data-status-priority={statusPriority}
      data-status-icon={Icon ? "visible" : "hidden"}
      className={`${config.className} ${className}`.trim()}
    >
      {Icon ? (
        <Icon
          className={`-ms-0.5 me-1 ${size === "md" ? "size-4" : "size-3.5"}`}
          aria-hidden="true"
          strokeWidth={1.5}
        />
      ) : null}
      <span
        className={`${wrap ? "whitespace-normal" : "whitespace-nowrap"} ${textClassName}`.trim()}
      >
        {displayLabel}
      </span>
    </span>
  );
}
