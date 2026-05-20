import api from "@/lib/axios";
import {
  extractList,
  readBoolean,
  readNumber,
  readString,
} from "@/services/api.utils";
import type { DashboardMenuNode } from "@/types/rbac.types";

type UnknownRecord = Record<string, unknown>;

export function normalizeDashboardMenuUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  normalized = normalized.replace(/\/{2,}/g, "/");

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized;
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
  const rolePermissionsRecord = asRecord(record.role_permissions);

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
    menu_type: readString(record, "menu_type", "menuType") ?? "NAVIGATION",
    placement: readString(record, "placement") ?? "SIDEBAR",
    render_in_sidebar:
      "render_in_sidebar" in record || "renderInSidebar" in record
        ? readBoolean(record, "render_in_sidebar", "renderInSidebar")
        : true,
    component_key: readString(record, "component_key", "componentKey"),
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
    role_permissions: rolePermissionsRecord
      ? {
          can_create: readBoolean(rolePermissionsRecord, "can_create"),
          can_read: readBoolean(rolePermissionsRecord, "can_read"),
          can_update: readBoolean(rolePermissionsRecord, "can_update"),
          can_delete: readBoolean(rolePermissionsRecord, "can_delete"),
          features: Array.isArray(rolePermissionsRecord.features)
            ? rolePermissionsRecord.features
                .map((item) => (typeof item === "string" ? item : null))
                .filter((item): item is string => item !== null)
            : [],
        }
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
  getDashboardWidgets: async (): Promise<DashboardMenuNode[]> => {
    const res = await api.get("/menus/dashboard-widgets");
    return extractList(res.data)
      .map((record) => mapMenuNode(record))
      .filter((item): item is DashboardMenuNode => item !== null);
  },
};
