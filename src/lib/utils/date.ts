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

function parseAnyDate(value: string | null | undefined): Date | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const parsedLocalDate = parseDateString(trimmed);
  if (parsedLocalDate) {
    // Display validation only. Do not change the parser used by inputs/schedules.
    const parts = trimmed.split(/[-/]/).map(Number);
    const [year, month, day] = /^\d{4}-/.test(trimmed) ? parts : [parts[2], parts[1], parts[0]];
    if (parsedLocalDate.getFullYear() !== year || parsedLocalDate.getMonth() !== month - 1 || parsedLocalDate.getDate() !== day) return undefined;
    return parsedLocalDate;
  }

  const parsedDateTime = new Date(trimmed);
  return Number.isNaN(parsedDateTime.getTime()) ? undefined : parsedDateTime;
}

function formatDateValue(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "-",
): string {
  const parsedDate = parseAnyDate(value);
  if (!parsedDate) return fallback;
  return new Intl.DateTimeFormat("id-ID", options).format(parsedDate);
}

export function formatDateDisplay(
  value: string | null | undefined,
  fallback = "-",
): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const formatted = formatDateValue(trimmed, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, "");

  return formatted || trimmed;
}

export function formatDate(dateString: string | null | undefined): string {
  return formatDateValue(dateString, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Uses the existing device/runtime timezone; never changes the timestamp. */
export function formatTime(value: Date | string | null | undefined, fallback = "-"): string {
  const date = value instanceof Date ? value : parseAnyDate(value);
  if (!date || Number.isNaN(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return `${parts.find(part => part.type === "hour")?.value}:${parts.find(part => part.type === "minute")?.value}`;
}

function displayDateTime(value: string | null | undefined, month: "long" | "short", fallback: string): string {
  const date = parseAnyDate(value);
  if (!date) return fallback;
  const day = new Intl.DateTimeFormat("id-ID", { day: "numeric", month, year: "numeric" }).format(date);
  // A calendar date is not an observed time. Do not invent midnight for date-only data.
  if (value && /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})$/.test(value.trim())) return day;
  return `${day}, ${formatTime(date)}`;
}

export function formatDateTime(value: string | null | undefined, fallback = "-"): string {
  return displayDateTime(value, "long", fallback);
}

/** Compact variant for narrow tables and notification rows. */
export function formatDateTimeShort(value: string | null | undefined, fallback = "-"): string {
  return displayDateTime(value, "short", fallback);
}

/** Existing human-readable spreadsheet column contract, not ordinary UI. */
export function formatDateTimeForExport(value: string | null | undefined): string {
  return formatDateValue(value, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDateOnly(
  value: string | null | undefined,
  fallback = "-",
): string {
  return formatDateValue(value, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }, fallback);
}
