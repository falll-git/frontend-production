type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapDataNode(payload: unknown): unknown {
  let current = payload;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!isRecord(current) || !("data" in current)) break;

    const next = current.data;
    if (next === undefined) break;
    current = next;
  }

  return current;
}

export function extractList(payload: unknown): AnyRecord[] {
  const direct = unwrapDataNode(payload);
  if (Array.isArray(direct)) {
    return direct.filter(isRecord);
  }

  if (!isRecord(direct)) return [];

  const listCandidates = [direct.items, direct.rows, direct.results, direct.list];
  for (const candidate of listCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
}

export function extractRecord(payload: unknown): AnyRecord | null {
  const direct = unwrapDataNode(payload);
  return isRecord(direct) ? direct : null;
}

export function extractLastPage(payload: unknown): number {
  if (!isRecord(payload)) return 1;

  const meta = isRecord(payload.meta) ? payload.meta : null;
  const rawLastPage =
    readNumber(payload, "lastPage", "last_page", "totalPages", "total_pages") ??
    (meta
      ? readNumber(meta, "lastPage", "last_page", "totalPages", "total_pages")
      : null);

  return Math.max(1, rawLastPage ?? 1);
}

export function readString(record: AnyRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

export function readNullableString(
  record: AnyRecord,
  ...keys: string[]
): string | undefined {
  const value = readString(record, ...keys);
  return value ?? undefined;
}

export function readBoolean(record: AnyRecord, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "aktif", "active", "yes", "ya"].includes(normalized)) {
        return true;
      }
      if (
        ["false", "0", "nonaktif", "inactive", "no", "tidak"].includes(
          normalized,
        )
      ) {
        return false;
      }
    }
  }

  return false;
}

export function readNumber(record: AnyRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

export function toStatusLabel(isActive: boolean): "Aktif" | "Nonaktif" {
  return isActive ? "Aktif" : "Nonaktif";
}

export function fromStatusLabel(status: "Aktif" | "Nonaktif"): boolean {
  return status === "Aktif";
}

export function toApiDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("T")) return trimmed;
  return `${trimmed}T00:00:00Z`;
}

function isFileLike(value: unknown): value is File | Blob {
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }

  return typeof File !== "undefined" && value instanceof File;
}

function appendMultipartValue(
  formData: FormData,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (isFileLike(value)) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  if (value instanceof Date) {
    formData.append(key, value.toISOString());
    return;
  }

  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
}

export function toMultipartFormData<T extends object>(payload: T): FormData {
  const formData = new FormData();

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    appendMultipartValue(formData, key, value);
  });

  return formData;
}
