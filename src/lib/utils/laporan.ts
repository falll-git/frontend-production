import { parseDateString } from "@/lib/utils/date";

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatRupiah(value: number) {
  return rupiahFormatter.format(value);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatLongDate(value: Date | string | number) {
  if (value instanceof Date) {
    return shortDateFormatter.format(value);
  }

  if (typeof value === "string") {
    const parsedString = parseDateString(value);
    if (parsedString) return shortDateFormatter.format(parsedString);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value ?? "");
  return shortDateFormatter.format(parsed);
}
