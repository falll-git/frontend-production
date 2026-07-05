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

function getBadgeClass(tone: SetupStatusTone, size: "sm" | "md") {
  return `${BASE_BADGE_CLASS} ${SIZE_CLASS[size]} ${TONE_CLASS[tone]}`;
}

function getStatusConfig(status: string, size: "sm" | "md") {
  const normalized = status.trim().toLowerCase();

  if (normalized === "urutan") {
    return {
      icon: null,
      className:
        "inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-2 text-xs font-bold text-sky-700",
    };
  }

  switch (normalized) {
    case "aktif":
    case "masih aktif":
    case "tersedia":
    case "disetujui":
    case "dikembalikan":
    case "input baru":
    case "baru":
    case "selesai":
    case "completed":
    case "complete":
    case "done":
    case "aman":
    case "ya":
      return {
        icon: CheckCircle2,
        className: getBadgeClass("emerald", size),
      };
    case "nonaktif":
    case "ditolak":
    case "dicabut":
    case "hapus":
    case "gagal":
    case "failed":
    case "tidak":
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
      return {
        icon: Clock3,
        className: getBadgeClass("amber", size),
      };
    case "terlambat":
    case "melewati batas":
    case "overdue":
      return {
        icon: AlertTriangle,
        className: getBadgeClass("red", size),
      };
    case "diajukan":
    case "persetujuan":
    case "menunggu":
    case "menunggu persetujuan":
    case "pending":
    case "diteruskan":
    case "belum diterapkan":
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
    case "in progress":
    case "processing":
      return {
        icon: LoaderCircle,
        className: getBadgeClass("violet", size),
      };
    default:
      return {
        icon: Clock3,
        className: getBadgeClass("gray", size),
      };
  }
}

export default function SetupStatusBadge({
  status,
  label,
  tone,
  icon,
  showIcon = true,
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

  const Icon = showIcon ? icon === undefined ? config.icon : icon : null;

  return (
    <span className={`${config.className} ${className}`.trim()}>
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
        {label ?? status}
      </span>
    </span>
  );
}
