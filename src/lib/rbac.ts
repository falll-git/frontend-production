import type { DashboardMenuNode, RoleMenuPermission } from "@/types/rbac.types";

export const RBAC_DENIED_MESSAGE = "Maaf, Anda tidak bisa mengakses fitur ini.";

export type Role = string;
export type PermissionCapability = "read" | "create" | "update" | "delete";
export type DataAccessLevel = "RESTRICT" | "NON_RESTRICT";

type FlattenedMenuNode = DashboardMenuNode & {
  depth: number;
  ancestryIds: string[];
};

type RuntimeRbacState = {
  flatMenus: FlattenedMenuNode[];
  permissionsByRoleId: Map<string, Map<string, RoleMenuPermission>>;
  readableRolesByMenuId: Map<string, Set<Role>>;
};

export interface RouteAccessDecision {
  allowed: boolean;
  reason:
    | "ALLOWED"
    | "AUTH_REQUIRED"
    | "ROLE_REQUIRED"
    | "UNKNOWN_ROUTE_DENIED";
  label?: string;
  message?: string;
  allowedRoles?: readonly Role[];
}

let runtimeRbacState: RuntimeRbacState | null = null;

function allow(): RouteAccessDecision {
  return { allowed: true, reason: "ALLOWED" };
}

function deny(reason: RouteAccessDecision["reason"]): RouteAccessDecision {
  return { allowed: false, reason };
}

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function normalizePath(pathname: string): string {
  const [withoutHash] = pathname.split("#");
  const [withoutQuery] = withoutHash.split("?");
  if (!withoutQuery || withoutQuery === "/") return withoutQuery || "/";
  return withoutQuery.endsWith("/") ? withoutQuery.slice(0, -1) : withoutQuery;
}

export function getRoleLabel(role: Role | null | undefined): string {
  if (!role) return "-";

  const trimmed = role.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

export function filterMenuTreeForRoleRead(
  roleId: string | undefined,
  menus: DashboardMenuNode[],
): DashboardMenuNode[] {
  if (!roleId || !runtimeRbacState) return [];

  const perms = runtimeRbacState.permissionsByRoleId.get(roleId);
  if (!perms) return [];

  const canRead = (menuId: string) => perms.get(menuId)?.can_read === true;

  function walk(nodes: DashboardMenuNode[]): DashboardMenuNode[] {
    const sorted = [...nodes].sort((a, b) => a.order - b.order);
    const out: DashboardMenuNode[] = [];

    for (const node of sorted) {
      const childFiltered = walk(node.children);
      if (canRead(node.id) || childFiltered.length > 0) {
        out.push({ ...node, children: childFiltered });
      }
    }

    return out;
  }

  return walk(menus);
}

export function getMenuIdsToExpandForPath(
  menus: DashboardMenuNode[],
  pathname: string,
): string[] {
  const norm = normalizePath(pathname);
  let bestUrlLen = -1;
  let bestAncestors: string[] = [];

  function visit(nodes: DashboardMenuNode[], ancestors: string[]) {
    for (const n of nodes) {
      const nu = normalizePath(n.url);
      if (nu && nu !== "/" && (norm === nu || norm.startsWith(`${nu}/`))) {
        if (nu.length > bestUrlLen) {
          bestUrlLen = nu.length;
          bestAncestors = ancestors;
        }
      }

      if (n.children.length > 0) {
        visit(n.children, [...ancestors, n.id]);
      }
    }
  }

  visit(menus, []);
  return bestAncestors;
}

export function isNodeOrDescendantPathActive(
  node: DashboardMenuNode,
  pathname: string,
): boolean {
  const norm = normalizePath(pathname);
  const nu = normalizePath(node.url);
  if (nu && (norm === nu || norm.startsWith(`${nu}/`))) return true;
  return node.children.some((child) =>
    isNodeOrDescendantPathActive(child, pathname),
  );
}

export function getMenuTitleForPath(
  menus: DashboardMenuNode[],
  pathname: string,
): string | null {
  const normalizedPath = normalizePath(pathname);
  let bestTitle: string | null = null;
  let bestLength = -1;

  function visit(nodes: DashboardMenuNode[]) {
    for (const node of nodes) {
      const url = normalizePath(node.url);
      if (url && url !== "/" && matchesPath(normalizedPath, url)) {
        const length = url.length;
        if (length > bestLength) {
          bestTitle = node.name;
          bestLength = length;
        }
      }

      if (node.children.length > 0) visit(node.children);
    }
  }

  visit(menus);
  return bestTitle;
}

function flattenMenuTree(
  menus: DashboardMenuNode[],
  depth = 0,
  ancestryIds: string[] = [],
): FlattenedMenuNode[] {
  return menus.flatMap((menu) => {
    const node: FlattenedMenuNode = {
      ...menu,
      depth,
      ancestryIds,
    };

    return [
      node,
      ...flattenMenuTree(menu.children, depth + 1, [...ancestryIds, menu.id]),
    ];
  });
}

function buildMenuNodeFromPermission(
  permission: RoleMenuPermission,
): FlattenedMenuNode | null {
  const url = normalizePath(permission.menu_url ?? "");
  if (!permission.menu_id || !url || url === "/") return null;

  return {
    id: permission.menu_id,
    name: permission.menu_name ?? url,
    parent_id: null,
    parent: null,
    url,
    order: 0,
    menu_type: "NAVIGATION",
    placement: "SIDEBAR",
    render_in_sidebar: true,
    children: [],
    depth: 0,
    ancestryIds: [],
  };
}

function flattenRuntimeMenus(
  menus: DashboardMenuNode[],
  roleMenus: RoleMenuPermission[],
): FlattenedMenuNode[] {
  const byId = new Map<string, FlattenedMenuNode>();

  for (const menu of flattenMenuTree(menus)) {
    byId.set(menu.id, menu);
  }

  for (const permission of roleMenus) {
    if (byId.has(permission.menu_id)) continue;
    const menu = buildMenuNodeFromPermission(permission);
    if (menu) byId.set(menu.id, menu);
  }

  return Array.from(byId.values()).sort((left, right) => {
    const rightLength = normalizePath(right.url).length;
    const leftLength = normalizePath(left.url).length;

    if (rightLength !== leftLength) return rightLength - leftLength;
    return left.depth - right.depth;
  });
}

function mergePermissionEntries(
  existing: RoleMenuPermission | undefined,
  next: RoleMenuPermission,
): RoleMenuPermission {
  if (!existing) return next;

  return {
    ...existing,
    can_create: existing.can_create || next.can_create,
    can_read: existing.can_read || next.can_read,
    can_update: existing.can_update || next.can_update,
    can_delete: existing.can_delete || next.can_delete,
    features: [...new Set([...(existing.features ?? []), ...(next.features ?? [])])],
    role_name: existing.role_name ?? next.role_name,
    menu_name: existing.menu_name ?? next.menu_name,
    menu_url: existing.menu_url ?? next.menu_url,
  };
}

function getCapabilityFlag(
  permission: RoleMenuPermission | undefined,
  capability: PermissionCapability,
): boolean {
  if (!permission) return false;

  switch (capability) {
    case "create":
      return permission.can_create;
    case "update":
      return permission.can_update;
    case "delete":
      return permission.can_delete;
    case "read":
    default:
      return permission.can_read;
  }
}

function getBestMatchingMenus(pathname: string): FlattenedMenuNode[] {
  if (!runtimeRbacState) return [];

  const normalizedPath = normalizePath(pathname);
  const matchingMenus = runtimeRbacState.flatMenus.filter((menu) => {
    const url = normalizePath(menu.url);
    return url && url !== "/" && matchesPath(normalizedPath, url);
  });

  const candidates =
    normalizedPath === "/dashboard"
      ? matchingMenus
      : matchingMenus.filter((menu) => normalizePath(menu.url) !== "/dashboard");

  if (candidates.length === 0) return [];

  const maxUrlLength = candidates.reduce(
    (max, menu) => Math.max(max, normalizePath(menu.url).length),
    0,
  );

  return candidates.filter(
    (menu) => normalizePath(menu.url).length === maxUrlLength,
  );
}

function getRuntimeCapability(
  pathname: string,
  roleId: string | null | undefined,
  capability: PermissionCapability,
): boolean | null {
  if (!runtimeRbacState) return null;

  const matchingMenus = getBestMatchingMenus(pathname);
  if (matchingMenus.length === 0) return null;
  if (!roleId) return null;

  const rolePermissions = runtimeRbacState.permissionsByRoleId.get(roleId);
  if (!rolePermissions) return false;

  return matchingMenus.some((menu) =>
    getCapabilityFlag(rolePermissions.get(menu.id), capability),
  );
}

function getRuntimeFeature(
  pathname: string,
  roleId: string | null | undefined,
  feature: string,
): boolean | null {
  if (!runtimeRbacState) return null;

  const normalizedFeature = feature.trim();
  if (!normalizedFeature) return null;

  const matchingMenus = getBestMatchingMenus(pathname);
  if (matchingMenus.length === 0) return null;
  if (!roleId) return null;

  const rolePermissions = runtimeRbacState.permissionsByRoleId.get(roleId);
  if (!rolePermissions) return false;

  return matchingMenus.some((menu) => {
    const permission = rolePermissions.get(menu.id);
    return (
      permission?.can_read === true &&
      (permission.features ?? []).includes(normalizedFeature)
    );
  });
}

function getAllowedRolesForMenus(menuIds: string[]): readonly Role[] {
  if (!runtimeRbacState) return [];

  const allowedRoles = new Set<Role>();

  for (const menuId of menuIds) {
    const roles = runtimeRbacState.readableRolesByMenuId.get(menuId);
    roles?.forEach((role) => allowedRoles.add(role));
  }

  return Array.from(allowedRoles);
}

function getRuntimeRouteDecision(
  pathname: string,
  roleId: string | null | undefined,
): RouteAccessDecision | null {
  if (!runtimeRbacState) return null;
  if (pathname === "/dashboard" && roleId) return allow();

  const matchingMenus = getBestMatchingMenus(pathname);
  if (matchingMenus.length === 0) return null;
  if (!roleId) return deny("AUTH_REQUIRED");

  const hasReadAccess = getRuntimeCapability(pathname, roleId, "read");
  if (hasReadAccess) return allow();

  const label =
    matchingMenus.length === 1
      ? matchingMenus[0].name
      : matchingMenus.map((menu) => menu.name).join(" / ");

  return {
    allowed: false,
    reason: "ROLE_REQUIRED",
    label,
    allowedRoles: getAllowedRolesForMenus(matchingMenus.map((menu) => menu.id)),
  };
}

export function getRoleNameFromUnknown(value: unknown): Role | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return (
      getRoleNameFromUnknown(record.role) ??
      getRoleNameFromUnknown(record.role_name) ??
      getRoleNameFromUnknown(record.roleName) ??
      getRoleNameFromUnknown(record.name) ??
      getRoleNameFromUnknown(record.label) ??
      getRoleNameFromUnknown(record.code)
    );
  }

  return null;
}

export function setRuntimeRbacData(payload: {
  menus: DashboardMenuNode[];
  roleMenus: RoleMenuPermission[];
}) {
  const flatMenus = flattenRuntimeMenus(payload.menus, payload.roleMenus);

  const permissionsByRoleId = new Map<
    string,
    Map<string, RoleMenuPermission>
  >();
  const readableRolesByMenuId = new Map<string, Set<Role>>();

  payload.roleMenus.forEach((permission) => {
    const rolePermissions =
      permissionsByRoleId.get(permission.role_id) ??
      new Map<string, RoleMenuPermission>();
    const mergedPermission = mergePermissionEntries(
      rolePermissions.get(permission.menu_id),
      permission,
    );

    rolePermissions.set(permission.menu_id, mergedPermission);
    permissionsByRoleId.set(permission.role_id, rolePermissions);

    if (mergedPermission.can_read) {
      const allowedRoleLabel = permission.role_name?.trim();
      if (allowedRoleLabel) {
        const allowedRoles =
          readableRolesByMenuId.get(permission.menu_id) ?? new Set<Role>();
        allowedRoles.add(allowedRoleLabel);
        readableRolesByMenuId.set(permission.menu_id, allowedRoles);
      }
    }
  });

  runtimeRbacState = {
    flatMenus,
    permissionsByRoleId,
    readableRolesByMenuId,
  };
}

export function clearRuntimeRbacData() {
  runtimeRbacState = null;
}

export function getDashboardRouteDecision(
  pathname: string,
  _role: Role | null | undefined,
  roleId?: string | null,
): RouteAccessDecision {
  const normalizedPath = normalizePath(pathname);
  const runtimeDecision = getRuntimeRouteDecision(normalizedPath, roleId);
  if (runtimeDecision) return runtimeDecision;
  if (normalizedPath === "/dashboard" && roleId) return allow();
  if (!roleId) return deny("AUTH_REQUIRED");
  if (normalizedPath.startsWith("/dashboard")) return deny("UNKNOWN_ROUTE_DENIED");
  return deny("UNKNOWN_ROUTE_DENIED");
}

export function hasDashboardCapability(
  pathname: string,
  _role: Role | null | undefined,
  roleId: string | null | undefined,
  capability: PermissionCapability,
): boolean {
  const runtimeCapability = getRuntimeCapability(
    normalizePath(pathname),
    roleId,
    capability,
  );

  return runtimeCapability ?? false;
}

export function hasDashboardFeature(
  pathname: string,
  _role: Role | null | undefined,
  roleId: string | null | undefined,
  feature: string,
): boolean {
  const runtimeFeature = getRuntimeFeature(
    normalizePath(pathname),
    roleId,
    feature,
  );

  return runtimeFeature ?? false;
}
