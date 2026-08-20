type MarketingActivityCreator = {
  name?: string | null;
  username?: string | null;
} | null;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  AKTIF: "Aktif",
  CANCELLED: "Dibatalkan",
  CANCELED: "Dibatalkan",
  BATAL: "Dibatalkan",
  CLOSED: "Selesai",
  COMPLETE: "Selesai",
  COMPLETED: "Selesai",
  DONE: "Selesai",
  SELESAI: "Selesai",
  FAILED: "Gagal",
  GAGAL: "Gagal",
  IN_PROGRESS: "Dalam Proses",
  DALAM_PROSES: "Dalam Proses",
  PROGRESS: "Dalam Proses",
  PROSES: "Dalam Proses",
  PENDING: "Menunggu",
  MENUNGGU: "Menunggu",
};

export function formatMarketingActivityStatus(
  status: string | null | undefined,
) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];

  return normalized
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function marketingActivityCreatorLabel(
  creator: MarketingActivityCreator,
) {
  const name = String(creator?.name ?? "").trim();
  if (name) return name;

  const username = String(creator?.username ?? "").trim();
  return username || "-";
}
