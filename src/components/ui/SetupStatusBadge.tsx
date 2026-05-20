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
  wrap?: boolean;
  className?: string;
  textClassName?: string;
};

const BASE_BADGE_CLASS =
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-medium";

const TONE_CLASS: Record<SetupStatusTone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
  slate: "bg-slate-100 text-slate-700",
  gray: "bg-gray-100 text-gray-700",
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

function getStatusConfig(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "urutan") {
    return {
      icon: null,
      className:
        "inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-sky-100 px-2 text-sm font-bold text-sky-700",
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
    case "aman":
    case "ya":
      return {
        icon: CheckCircle2,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.emerald}`,
      };
    case "nonaktif":
    case "ditolak":
    case "hapus":
    case "gagal":
    case "tidak":
      return {
        icon: XCircle,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.red}`,
      };
    case "dipinjam":
    case "sudah diserahkan":
    case "penyerahan":
    case "perhatian":
      return {
        icon: Clock3,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.amber}`,
      };
    case "terlambat":
    case "melewati batas":
      return {
        icon: AlertTriangle,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.red}`,
      };
    case "diajukan":
    case "persetujuan":
    case "menunggu":
    case "menunggu persetujuan":
    case "diteruskan":
    case "belum diterapkan":
      return {
        icon: Clock3,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.blue}`,
      };
    case "pengembalian":
    case "perubahan data":
      return {
        icon: normalized === "perubahan data" ? Pencil : CheckCircle2,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.violet}`,
      };
    case "pindah lokasi":
    case "belum didukung":
      return {
        icon: normalized === "belum didukung" ? AlertTriangle : ArrowRightLeft,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.amber}`,
      };
    case "dalam proses":
      return {
        icon: LoaderCircle,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.violet}`,
      };
    default:
      return {
        icon: Clock3,
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS.gray}`,
      };
  }
}

export default function SetupStatusBadge({
  status,
  label,
  tone,
  icon,
  showIcon = true,
  wrap = false,
  className = "",
  textClassName = "",
}: SetupStatusBadgeProps) {
  const config = tone
    ? {
        icon: TONE_ICON[tone],
        className: `${BASE_BADGE_CLASS} ${TONE_CLASS[tone]}`,
      }
    : getStatusConfig(status);

  const Icon = showIcon ? icon === undefined ? config.icon : icon : null;

  return (
    <span className={`${config.className} ${className}`.trim()}>
      {Icon ? (
        <Icon
          className="-ms-1 me-1.5 size-4"
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
