export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function parseDateString(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  const dmySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmySlash) {
    const day = Number(dmySlash[1]);
    const month = Number(dmySlash[2]);
    const year = Number(dmySlash[3]);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed);
  if (dmyDash) {
    const day = Number(dmyDash[1]);
    const month = Number(dmyDash[2]);
    const year = Number(dmyDash[3]);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  return undefined;
}

export function formatDateDisplay(
  value: string | null | undefined,
  fallback = "-",
): string {
  if (!value?.trim()) return fallback;
  const date = parseDateString(value);
  if (!date) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  } catch { return '-'; }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '-'; }
}
