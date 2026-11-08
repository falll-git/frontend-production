/** Display only: never derives public visibility from bank workflow. */
import { formatDateTime } from "@/lib/utils/date";

export function formatSjDate(value: string | null | undefined): string {
  if (!value) return "Belum tercatat";
  return formatDateTime(value, "Waktu belum tersedia");
}
