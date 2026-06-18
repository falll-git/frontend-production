import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  readBoolean,
  readNumber,
  readString,
} from "@/services/api.utils";
import type { PaginationMeta } from "@/types/api.types";

export type AppNotification = {
  id: string;
  module: string;
  eventType: string;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  linkUrl: string | null;
  priority: string;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationListResult = {
  data: AppNotification[];
  meta: PaginationMeta;
};

type AnyRecord = Record<string, unknown>;

function mapNotification(record: AnyRecord): AppNotification | null {
  const id = readString(record, "id");
  const title = readString(record, "title");
  const message = readString(record, "message");
  if (!id || !title || !message) return null;

  const readAt = readString(record, "read_at", "readAt");

  return {
    id,
    module: readString(record, "module") ?? "SYSTEM",
    eventType: readString(record, "event_type", "eventType") ?? "INFO",
    entityType: readString(record, "entity_type", "entityType") ?? "GENERAL",
    entityId: readString(record, "entity_id", "entityId") ?? "",
    title,
    message,
    linkUrl: readString(record, "link_url", "linkUrl"),
    priority: readString(record, "priority") ?? "NORMAL",
    readAt,
    isRead: readBoolean(record, "is_read", "isRead") || Boolean(readAt),
    createdAt: readString(record, "created_at", "createdAt") ?? "",
  };
}

export const notificationService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
  }): Promise<NotificationListResult> => {
    const res = await api.get("/notifications", { params });
    const data = extractList(res.data)
      .map(mapNotification)
      .filter((item): item is AppNotification => Boolean(item));

    return {
      data,
      meta: extractPaginationMeta(res.data),
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get("/notifications/unread-count");
    const record = extractRecord(res.data);
    return record ? readNumber(record, "unread_count", "unreadCount") ?? 0 : 0;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },

  clearOne: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  clearAll: async (): Promise<void> => {
    await api.delete("/notifications/clear-all");
  },
};
