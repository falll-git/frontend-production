import api from "@/lib/axios";
import {
  extractList,
  extractLastPage,
  extractRecord,
  readBoolean,
  readString,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { normalizeDashboardMenuUrl } from "@/services/menu.service";
import type { RoleMenuPermission } from "@/types/rbac.types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function mapRoleMenuPermission(record: UnknownRecord): RoleMenuPermission | null {
  const roleRecord = asRecord(record.role);
  const menuRecord = asRecord(record.menu);
  const id = readString(record, "id");
  const roleId =
    readString(record, "role_id", "roleId") ??
    (roleRecord ? readString(roleRecord, "id") : null);
  const menuId =
    readString(record, "menu_id", "menuId") ??
    (menuRecord ? readString(menuRecord, "id") : null);

  if (!id || !roleId || !menuId) return null;

  const rawMenuUrl =
    readString(record, "menu_url", "menuUrl") ??
    (menuRecord ? readString(menuRecord, "url") ?? undefined : undefined);

  return {
    id,
    role_id: roleId,
    menu_id: menuId,
    can_create: readBoolean(record, "can_create", "canCreate"),
    can_read: readBoolean(record, "can_read", "canRead"),
    can_update: readBoolean(record, "can_update", "canUpdate"),
    can_delete: readBoolean(record, "can_delete", "canDelete"),
    features: Array.isArray(record.features)
      ? record.features
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [],
    role_name:
      readString(record, "role_name", "roleName") ??
      (roleRecord ? readString(roleRecord, "name") ?? undefined : undefined),
    menu_name:
      readString(record, "menu_name", "menuName") ??
      (menuRecord ? readString(menuRecord, "name") ?? undefined : undefined),
    menu_url: rawMenuUrl ? normalizeDashboardMenuUrl(rawMenuUrl) : undefined,
  };
}

async function getRoleMenuPage(
  page: number,
  roleId?: string,
): Promise<{
  items: RoleMenuPermission[];
  lastPage: number;
}> {
  const res = await api.get("/role-menus", {
    params: {
      page,
      limit: MAX_TABLE_PAGE_SIZE,
      ...(roleId ? { role_id: roleId } : {}),
    },
  });
  return {
    items: extractList(res.data)
      .map((record) => mapRoleMenuPermission(record))
      .filter((item): item is RoleMenuPermission => item !== null),
    lastPage: extractLastPage(res.data),
  };
}

export type RoleMenuWritePayload = {
  role_id: string;
  menu_id: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  features?: string[];
};

export const roleMenuService = {
  getAll: async (): Promise<RoleMenuPermission[]> => {
    const firstPage = await getRoleMenuPage(1);
    const allItems = [...firstPage.items];

    for (let page = 2; page <= firstPage.lastPage; page += 1) {
      const nextPage = await getRoleMenuPage(page);
      allItems.push(...nextPage.items);
    }

    return allItems;
  },

  getByRoleId: async (roleId: string): Promise<RoleMenuPermission[]> => {
    const firstPage = await getRoleMenuPage(1, roleId);
    const allItems = [...firstPage.items];

    for (let page = 2; page <= firstPage.lastPage; page += 1) {
      const nextPage = await getRoleMenuPage(page, roleId);
      allItems.push(...nextPage.items);
    }

    return allItems;
  },

  create: async (
    payload: RoleMenuWritePayload,
  ): Promise<RoleMenuPermission> => {
    const res = await api.post("/role-menus", payload);
    const record = extractRecord(res.data);
    const mapped = record
      ? mapRoleMenuPermission(record as UnknownRecord)
      : null;

    if (!mapped) {
      throw new Error("Respons create role-menu dari server tidak valid");
    }

    return mapped;
  },

  update: async (
    id: string,
    payload: Omit<RoleMenuWritePayload, "role_id" | "menu_id">,
  ): Promise<RoleMenuPermission> => {
    const res = await api.put(`/role-menus/${id}`, payload);
    const record = extractRecord(res.data);
    const mapped = record
      ? mapRoleMenuPermission(record as UnknownRecord)
      : null;

    if (!mapped) {
      throw new Error("Respons update role-menu dari server tidak valid");
    }

    return mapped;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/role-menus/${id}`);
  },
};
