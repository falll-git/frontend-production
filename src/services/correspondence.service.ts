import {
  extractList,
  extractRecord,
  readBoolean,
  readNumber,
} from "@/services/api.utils";
import { mapMemorandumRecord } from "@/services/memorandum.service";
import { mapSuratKeluarRecord } from "@/services/surat-keluar.service";
import { mapSuratMasukRecord } from "@/services/surat-masuk.service";
import type {
  CorrespondenceMyReportFilter,
  CorrespondencePrintableItem,
  CorrespondenceReportFilters,
  CorrespondenceReportScope,
  CorrespondenceReportSummary,
  Memorandum,
  SuratKeluar,
  SuratMasuk,
} from "@/types/surat.types";
import api from "@/lib/axios";

type UnknownRecord = Record<string, unknown>;

const EMPTY_REPORT_SUMMARY: CorrespondenceReportSummary = {
  incoming_mails: { total: 0, baru: 0, dalam_proses: 0, selesai: 0, terlambat: 0 },
  outgoing_mails: { total: 0, aktif: 0, nonaktif: 0 },
  memorandums: { total: 0, baru: 0, dalam_proses: 0, selesai: 0, terlambat: 0 },
  total_documents: 0,
};

const EMPTY_REPORT_FILTERS: CorrespondenceReportFilters = {
  scope: "my",
  requested_scope: null,
  available_scopes: ["my"],
  can_report_all: false,
  my_filter: null,
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readNullableString(
  record: UnknownRecord,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function readString(record: UnknownRecord, ...keys: string[]): string {
  return readNullableString(record, ...keys) ?? "";
}

function readReportScope(
  record: UnknownRecord,
  ...keys: string[]
): CorrespondenceReportScope | null {
  const value = readNullableString(record, ...keys);
  if (value === "my" || value === "all") {
    return value;
  }

  return null;
}

function readAvailableScopes(record: UnknownRecord): CorrespondenceReportScope[] {
  const raw = record.available_scopes;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (item): item is CorrespondenceReportScope =>
      item === "my" || item === "all",
  );
}

function toReportSummary(record: UnknownRecord | null | undefined) {
  return (record ?? EMPTY_REPORT_SUMMARY) as unknown as CorrespondenceReportSummary;
}

function toReportFilters(record: UnknownRecord | null | undefined) {
  if (!record) {
    return EMPTY_REPORT_FILTERS;
  }

  const scope = readReportScope(record, "scope") ?? EMPTY_REPORT_FILTERS.scope;
  const requestedScope = readReportScope(
    record,
    "requested_scope",
    "requestedScope",
  );
  const availableScopes = readAvailableScopes(record);
  const myFilter = readNullableString(record, "my_filter", "myFilter");

  return {
    scope,
    requested_scope: requestedScope,
    available_scopes:
      availableScopes.length > 0 ? availableScopes : [scope],
    can_report_all: readBoolean(
      record,
      "can_report_all",
      "canReportAll",
    ),
    my_filter:
      scope === "my" &&
      (myFilter === "all" ||
        myFilter === "active" ||
        myFilter === "completed" ||
        myFilter === "forwarded")
        ? myFilter
        : null,
    scope_applies_to: Array.isArray(record.scope_applies_to)
      ? record.scope_applies_to.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : undefined,
    document_scopes: asRecord(record.document_scopes) ?? undefined,
  };
}

function mapPrintableRecord(
  record: UnknownRecord,
): CorrespondencePrintableItem | null {
  const kind = readString(record, "kind");
  const entityRecord = asRecord(record.record);

  if (!entityRecord) return null;

  if (kind === "incoming-mail") {
    const mapped = mapSuratMasukRecord(entityRecord);
    if (!mapped) return null;

    return {
      id: readString(record, "id") || String(mapped.id),
      kind,
      document_number: readString(record, "document_number", "documentNumber"),
      subject: readString(record, "subject"),
      primary_text: readString(record, "primary_text", "primaryText"),
      secondary_text: readString(record, "secondary_text", "secondaryText"),
      document_date: readString(record, "document_date", "documentDate"),
      status_key: readString(record, "status_key", "statusKey"),
      status_label: readString(record, "status_label", "statusLabel"),
      file_name: readString(record, "file_name", "fileName"),
      file_url: readNullableString(record, "file_url", "fileUrl"),
      record: mapped,
    };
  }

  if (kind === "outgoing-mail") {
    const mapped = mapSuratKeluarRecord(entityRecord);
    if (!mapped) return null;

    return {
      id: readString(record, "id") || String(mapped.id),
      kind,
      document_number: readString(record, "document_number", "documentNumber"),
      subject: readString(record, "subject"),
      primary_text: readString(record, "primary_text", "primaryText"),
      secondary_text: readString(record, "secondary_text", "secondaryText"),
      document_date: readString(record, "document_date", "documentDate"),
      status_key: readString(record, "status_key", "statusKey"),
      status_label: readString(record, "status_label", "statusLabel"),
      file_name: readString(record, "file_name", "fileName"),
      file_url: readNullableString(record, "file_url", "fileUrl"),
      record: mapped,
    };
  }

  if (kind === "memorandum") {
    const mapped = mapMemorandumRecord(entityRecord);
    if (!mapped) return null;

    return {
      id: readString(record, "id") || String(mapped.id),
      kind,
      document_number: readString(record, "document_number", "documentNumber"),
      subject: readString(record, "subject"),
      primary_text: readString(record, "primary_text", "primaryText"),
      secondary_text: readString(record, "secondary_text", "secondaryText"),
      document_date: readString(record, "document_date", "documentDate"),
      status_key: readString(record, "status_key", "statusKey"),
      status_label: readString(record, "status_label", "statusLabel"),
      file_name: readString(record, "file_name", "fileName"),
      file_url: readNullableString(record, "file_url", "fileUrl"),
      record: mapped,
    };
  }

  return null;
}

export const correspondenceService = {
  getReport: async (options?: {
    kind?: "surat-masuk" | "surat-keluar" | "memorandum";
    scope?: CorrespondenceReportScope;
    myFilter?: CorrespondenceMyReportFilter;
  }) => {
    const res = await api.get("/correspondence/report", {
      params: {
        ...(options?.kind ? { kind: options.kind } : {}),
        ...(options?.scope ? { scope: options.scope } : {}),
        ...(options?.myFilter ? { my_filter: options.myFilter } : {}),
      },
    });
    const payload = extractRecord(res.data);
    const summaryRecord = asRecord(payload?.summary);
    const recordsRecord = asRecord(payload?.records);
    const filtersRecord = asRecord(payload?.filters);

    const incomingRecords = recordsRecord?.incoming_mails;
    const outgoingRecords = recordsRecord?.outgoing_mails;
    const memorandumRecords = recordsRecord?.memorandums;

    return {
      filters: toReportFilters(filtersRecord),
      summary: toReportSummary(summaryRecord),
      records: {
        incoming_mails: Array.isArray(incomingRecords)
          ? incomingRecords
              .map((record, index) => mapSuratMasukRecord(record, index))
              .filter((record): record is SuratMasuk => record !== null)
          : [],
        outgoing_mails: Array.isArray(outgoingRecords)
          ? outgoingRecords
              .map((record, index) => mapSuratKeluarRecord(record, index))
              .filter((record): record is SuratKeluar => record !== null)
          : [],
        memorandums: Array.isArray(memorandumRecords)
          ? memorandumRecords
              .map((record, index) => mapMemorandumRecord(record, index))
              .filter((record): record is Memorandum => record !== null)
          : [],
      },
    };
  },
  getPrintableDocuments: async (options?: {
    kind?: "surat-masuk" | "surat-keluar" | "memorandum";
    onlyWithFile?: boolean;
    scope?: CorrespondenceReportScope;
    myFilter?: CorrespondenceMyReportFilter;
  }) => {
    const res = await api.get("/correspondence/print-documents", {
      params: {
        ...(options?.kind ? { kind: options.kind } : {}),
        ...(options?.onlyWithFile !== undefined
          ? { only_with_file: String(options.onlyWithFile) }
          : {}),
        ...(options?.scope ? { scope: options.scope } : {}),
        ...(options?.myFilter ? { my_filter: options.myFilter } : {}),
      },
    });

    const payload = extractRecord(res.data);
    const items = extractList(payload?.items ?? payload?.data ?? payload);
    const summaryRecord = asRecord(payload?.summary);
    const filtersRecord = asRecord(payload?.filters);

    return {
      filters: toReportFilters(filtersRecord),
      summary: toReportSummary(summaryRecord),
      total: readNumber(payload ?? {}, "total") ?? items.length,
      items: items
        .map((item) => mapPrintableRecord(item))
        .filter(
          (item): item is CorrespondencePrintableItem => item !== null,
        ),
    };
  },
};
