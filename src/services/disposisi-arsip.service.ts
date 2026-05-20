import api from "@/lib/axios";
import {
  extractList,
  extractLastPage,
  extractPaginationMeta,
  extractRecord,
  readString,
  toApiDateTime,
} from "@/services/api.utils";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { PaginatedResult } from "@/types/api.types";
import { getAllPaginatedRecords, mapDigitalDocument } from "@/services/arsip.service";
import type { Disposisi } from "@/types/arsip.types";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapUserName(record: unknown): string {
  if (!isRecord(record)) return "-";

  return (
    readString(record, "username") ??
    readString(record, "name") ??
    readString(record, "email") ??
    "-"
  );
}

function mapAccessRequestStatusLabel(
  label: string,
): Disposisi["status"] {
  switch (label) {
    case "Approved":
    case "Disetujui":
      return "Disetujui";
    case "Rejected":
    case "Ditolak":
      return "Ditolak";
    case "Pending":
    case "Menunggu Persetujuan":
    default:
      return "Menunggu Persetujuan";
  }
}

function mapDisposisi(record: AnyRecord): Disposisi | null {
  const id = readString(record, "id");
  const statusKey = readString(record, "status_key");
  const statusLabel = readString(record, "status_label");
  const documentRecord = record.document;
  const document = isRecord(documentRecord) ? mapDigitalDocument(documentRecord) : null;

  if (!id || !statusKey || !statusLabel) return null;

  return {
    id,
    dokumenId: readString(record, "document_id") ?? document?.id ?? "",
    detail: document?.detail ?? readString(record, "request_reason") ?? "-",
    pemohon: mapUserName(record.requester),
    pemilik: mapUserName(record.owner),
    tglPengajuan: readString(record, "created_at") ?? "",
    status: mapAccessRequestStatusLabel(statusLabel),
    statusKey: statusKey as Disposisi["statusKey"],
    alasanPengajuan: readString(record, "request_reason") ?? "",
    tglExpired: readString(record, "expires_at"),
    tglAksi: readString(record, "acted_at"),
    alasanAksi: readString(record, "action_note"),
    canViewDocument: Boolean(record.can_view_document),
    isActiveAccess: Boolean(record.is_active_access),
    document,
    requester: isRecord(record.requester)
      ? {
          id: readString(record.requester, "id") ?? "",
          name: readString(record.requester, "name") ?? "-",
          username: readString(record.requester, "username") ?? "-",
          email: readString(record.requester, "email") ?? "-",
        }
      : null,
    owner: isRecord(record.owner)
      ? {
          id: readString(record.owner, "id") ?? "",
          name: readString(record.owner, "name") ?? "-",
          username: readString(record.owner, "username") ?? "-",
          email: readString(record.owner, "email") ?? "-",
        }
      : null,
    actor: isRecord(record.actor)
      ? {
          id: readString(record.actor, "id") ?? "",
          name: readString(record.actor, "name") ?? "-",
          username: readString(record.actor, "username") ?? "-",
          email: readString(record.actor, "email") ?? "-",
        }
      : null,
  };
}

type GetAllDisposisiParams = {
  page?: number;
  limit?: number;
  search?: string;
  scope?: "requested" | "owned";
  status?: "PENDING" | "APPROVED" | "REJECTED";
  report?: "history";
  document_id?: string;
  office_id?: string;
  cabinet_id?: string;
};

type CreateDisposisiPayload = {
  document_ids: string[];
  request_reason: string;
  expires_at: string;
};

export const disposisiArsipService = {
  getAll: async (params: GetAllDisposisiParams = {}): Promise<Disposisi[]> => {
    const records = await getAllPaginatedRecords("/digital-document-access-requests", params);
    return records
      .map((record) => mapDisposisi(record))
      .filter((item): item is Disposisi => item !== null);
  },
  getPage: async ({
    page = 1,
    limit = OPERATIONAL_TABLE_PAGE_SIZE,
    ...params
  }: GetAllDisposisiParams = {}): Promise<PaginatedResult<Disposisi>> => {
    const res = await api.get("/digital-document-access-requests", {
      params: {
        ...params,
        page,
        limit,
      },
    });
    const items = extractList(res.data)
      .map((record) => mapDisposisi(record))
      .filter((item): item is Disposisi => item !== null);

    return {
      items,
      meta: extractPaginationMeta(res.data, {
        page,
        limit,
        total: items.length,
      }),
    };
  },
  getById: async (id: string): Promise<Disposisi | null> => {
    const res = await api.get(`/digital-document-access-requests/${id}`);
    const record = extractRecord(res.data);
    return record ? mapDisposisi(record) : null;
  },
  create: async (payload: CreateDisposisiPayload): Promise<Disposisi[]> => {
    const res = await api.post("/digital-document-access-requests", {
      ...payload,
      expires_at: toApiDateTime(payload.expires_at),
    });
    const record = extractRecord(res.data);
    const items = Array.isArray(record?.items)
      ? record.items.filter(isRecord).map((item) => mapDisposisi(item)).filter((item): item is Disposisi => item !== null)
      : [];
    return items;
  },
  approve: async (
    id: string,
    payload: { expires_at: string; action_note: string },
  ): Promise<Disposisi> => {
    const res = await api.patch(`/digital-document-access-requests/${id}/approve`, {
      expires_at: toApiDateTime(payload.expires_at),
      action_note: payload.action_note,
    });
    const record = extractRecord(res.data);
    const mapped = record ? mapDisposisi(record) : null;

    if (!mapped) {
      throw new Error("Respons persetujuan akses dokumen dari server tidak valid");
    }

    return mapped;
  },
  reject: async (
    id: string,
    payload: { action_note: string },
  ): Promise<Disposisi> => {
    const res = await api.patch(`/digital-document-access-requests/${id}/reject`, payload);
    const record = extractRecord(res.data);
    const mapped = record ? mapDisposisi(record) : null;

    if (!mapped) {
      throw new Error("Respons penolakan akses dokumen dari server tidak valid");
    }

    return mapped;
  },
  getHistory: async (
    params: Pick<GetAllDisposisiParams, "office_id" | "cabinet_id" | "search" | "scope"> = {},
  ): Promise<Disposisi[]> => {
    const records = await getAllPaginatedRecords(
      "/digital-archives/histories/access-requests",
      params,
    );
    return records
      .map((record) => mapDisposisi(record))
      .filter((item): item is Disposisi => item !== null);
  },
  getLastPage: async (): Promise<number> => {
    const res = await api.get("/digital-document-access-requests", {
      params: { page: 1, limit: 1 },
    });
    return extractLastPage(res.data);
  },
};
