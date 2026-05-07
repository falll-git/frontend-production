import api from "@/lib/axios";
import { extractList, readNumber, readString } from "@/services/api.utils";
import type { DashboardMenuNode } from "@/types/rbac.types";

type UnknownRecord = Record<string, unknown>;

export function normalizeDashboardMenuUrl(url: string): string {
  return url;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function mapMenuNode(record: UnknownRecord): DashboardMenuNode | null {
  const id = readString(record, "id");
  const name = readString(record, "name");
  const rawUrl = typeof record.url === "string" ? record.url : "";

  if (!id || !name) return null;

  const children = Array.isArray(record.children)
    ? record.children
        .map((item) => asRecord(item))
        .filter((item): item is UnknownRecord => item !== null)
        .map((item) => mapMenuNode(item))
        .filter((item): item is DashboardMenuNode => item !== null)
    : [];

  return {
    id,
    name,
    parent_id: readString(record, "parent_id") ?? null,
    parent: readString(record, "parent") ?? null,
    icon: readString(record, "icon") ?? undefined,
    url: normalizeDashboardMenuUrl(rawUrl),
    order: readNumber(record, "order") ?? 0,
    allowed_capabilities: Array.isArray(record.allowed_capabilities)
      ? record.allowed_capabilities
          .map((item) => (typeof item === "string" ? item : null))
          .filter((item): item is string => item !== null)
      : undefined,
    allowed_permissions:
      typeof record.allowed_permissions === "object" &&
      record.allowed_permissions !== null &&
      !Array.isArray(record.allowed_permissions)
        ? {
            can_create: Boolean(
              (record.allowed_permissions as UnknownRecord).can_create,
            ),
            can_read: Boolean(
              (record.allowed_permissions as UnknownRecord).can_read,
            ),
            can_update: Boolean(
              (record.allowed_permissions as UnknownRecord).can_update,
            ),
            can_delete: Boolean(
              (record.allowed_permissions as UnknownRecord).can_delete,
            ),
          }
        : undefined,
    allowed_features: Array.isArray(record.allowed_features)
      ? record.allowed_features
          .map((item) => (typeof item === "string" ? item : null))
          .filter((item): item is string => item !== null)
      : undefined,
    allowed_feature_options: Array.isArray(record.allowed_feature_options)
      ? record.allowed_feature_options
          .map((item) => asRecord(item))
          .filter((item): item is UnknownRecord => item !== null)
          .map((item) => {
            const key = readString(item, "key");
            const label = readString(item, "label") ?? key;
            return key ? { key, label: label ?? key } : null;
          })
          .filter(
            (item): item is { key: string; label: string } => item !== null,
          )
      : undefined,
    children,
  };
}

export const menuService = {
  getAll: async (): Promise<DashboardMenuNode[]> => {
    const res = await api.get("/menus");
    return extractList(res.data)
      .map((record) => mapMenuNode(record))
      .filter((item): item is DashboardMenuNode => item !== null);
  },
  getAllForManagement: async (): Promise<DashboardMenuNode[]> => {
    const res = await api.get("/menus/all");
    return extractList(res.data)
      .map((record) => mapMenuNode(record))
      .filter((item): item is DashboardMenuNode => item !== null);
  },
};
