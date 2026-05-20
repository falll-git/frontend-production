import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import type { ArsipReportRiskItem } from "@/services/arsip.service";
export { formatDateTime } from "@/lib/utils/date";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function accessLevelLabel(key: string): string {
  switch (key) {
    case "RESTRICT":
      return "Restrict";
    case "NON_RESTRICT":
      return "Non-restrict";
    default:
      return key;
  }
}

export function actionTone(actionKey: string): string {
  switch (actionKey) {
    case "CREATED":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "UPDATED":
      return "border-sky-100 bg-sky-50 text-[#157ec3]";
    case "STORAGE_MOVED":
      return "border-violet-100 bg-violet-50 text-violet-700";
    case "DELETED":
      return "border-rose-100 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function severityTone(
  severity: ArsipReportRiskItem["severity"],
) {
  switch (severity) {
    case "critical":
      return {
        border: "border-rose-200 bg-rose-50 text-rose-700",
        icon: AlertTriangle,
      };
    case "warning":
      return {
        border: "border-amber-200 bg-amber-50 text-amber-700",
        icon: AlertTriangle,
      };
    case "info":
      return {
        border: "border-sky-200 bg-sky-50 text-[#157ec3]",
        icon: Clock3,
      };
    case "normal":
    default:
      return {
        border: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };
  }
}
