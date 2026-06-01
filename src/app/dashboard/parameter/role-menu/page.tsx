"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableColGroup,
  SetupDataTableCol,
  SetupDataTableEmptyRow,
} from "@/components/ui/SetupDataTable";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { KeyRound, RotateCcw, Save, Settings2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import {
  getSetupPageEmptyStateCopy,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import { menuService } from "@/services/menu.service";
import {
  roleMenuService,
  type RoleMenuWritePayload,
} from "@/services/role-menu.service";
import { roleService } from "@/services/role.service";
import type { RoleRecord } from "@/types/master.types";
import type { DashboardMenuNode, RoleMenuPermission } from "@/types/rbac.types";

type FlatMenu = {
  menu: DashboardMenuNode;
  depth: number;
  rootId: string;
  rootName: string;
  rootOrder: number;
  ancestryIds: string[];
};

type PermKey = "can_read" | "can_create" | "can_update" | "can_delete";
type FeatureKey = string;
type PermissionFilter = "all" | "active" | "unset" | "changed" | "feature";

type FeatureOption = {
  key: FeatureKey;
  label: string;
};

type PermissionFlags = Pick<
  RoleMenuPermission,
  "can_read" | "can_create" | "can_update" | "can_delete"
> & {
  features: string[];
};

type PermissionMap = Record<string, PermissionFlags>;

type PermissionSupport = Record<PermKey, boolean> & {
  features: FeatureOption[];
};

type MenuGroup = {
  key: string;
  label: string;
  order: number;
  rows: FlatMenu[];
};

const SECTION_CARD_CLASS =
  SETUP_PAGE_TABLE_CARD_CLASS;
const PERM_HEADER_CLASS =
  "w-[58px] px-1.5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-600 whitespace-nowrap";
const PERM_CELL_CLASS = "w-[58px] px-1.5 py-2 text-center align-middle";
const FEATURE_HEADER_CLASS =
  "w-[160px] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-600 whitespace-nowrap";
const FEATURE_CELL_CLASS = "w-[160px] px-2 py-2 align-middle";
const MENU_HEADER_CLASS =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-600 whitespace-nowrap";
const MENU_CELL_CLASS =
  "px-3 py-2 text-left align-middle text-sm text-gray-900";
const GROUP_ROW_CLASS = "border-y border-gray-200 bg-slate-50/90";
const PERMISSION_TABLE_CLASS =
  "role-menu-permission-table w-[760px] min-w-[760px] table-fixed divide-y-2 divide-gray-200";
const FEATURE_BADGE_CLASS =
  "inline-flex max-w-[104px] items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700";
const FEATURE_BUTTON_CLASS =
  "inline-flex size-7 items-center justify-center rounded-lg border border-[rgba(21,126,195,0.36)] bg-white text-slate-900 shadow-sm transition hover:border-[rgba(21,126,195,0.66)] hover:bg-[rgba(21,126,195,0.06)] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400";
const PERMISSION_FILTER_OPTIONS: Array<{
  key: PermissionFilter;
  label: string;
}> = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "unset", label: "Belum Diatur" },
  { key: "changed", label: "Berubah" },
  { key: "feature", label: "Ada Fitur" },
];
const RBAC_REFRESH_EVENT = "ruang-arsip:rbac-refresh";
const RBAC_REFRESH_STORAGE_KEY = "ruang-arsip.rbac-refresh-at";
const REPORT_ALL_FEATURE = "report_all";
const VIEW_DIVISION_FEATURE = "view_division";
const MANAGE_ALL_FEATURE = "manage_all";

function createEmptyPermission(): PermissionFlags {
  return {
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
    features: [],
  };
}

function normalizeFeatures(features: string[] | undefined): string[] {
  const normalized = [
    ...new Set((features ?? []).map((item) => item.trim()).filter(Boolean)),
  ];

  if (!normalized.includes(MANAGE_ALL_FEATURE)) {
    return normalized;
  }

  return normalized.filter((feature) => feature !== VIEW_DIVISION_FEATURE);
}

function clonePermission(permission: PermissionFlags): PermissionFlags {
  return {
    can_read: permission.can_read,
    can_create: permission.can_create,
    can_update: permission.can_update,
    can_delete: permission.can_delete,
    features: normalizeFeatures(permission.features),
  };
}

function permissionFromRoleMenu(
  permission: RoleMenuPermission | null | undefined,
): PermissionFlags {
  return {
    can_read: permission?.can_read ?? false,
    can_create: permission?.can_create ?? false,
    can_update: permission?.can_update ?? false,
    can_delete: permission?.can_delete ?? false,
    features: normalizeFeatures(permission?.features),
  };
}

function permissionsEqual(
  left: PermissionFlags,
  right: PermissionFlags,
): boolean {
  const leftFeatures = normalizeFeatures(left.features).sort();
  const rightFeatures = normalizeFeatures(right.features).sort();

  return (
    left.can_read === right.can_read &&
    left.can_create === right.can_create &&
    left.can_update === right.can_update &&
    left.can_delete === right.can_delete &&
    leftFeatures.length === rightFeatures.length &&
    leftFeatures.every((feature, index) => feature === rightFeatures[index])
  );
}

function flattenMenus(
  nodes: DashboardMenuNode[],
  depth = 0,
  rootId?: string,
  rootName?: string,
  rootOrder?: number,
  ancestryIds: string[] = [],
): FlatMenu[] {
  const sorted = [...nodes].sort((left, right) => left.order - right.order);
  const out: FlatMenu[] = [];

  for (const menu of sorted) {
    const nextRootId = rootId ?? menu.id;
    const nextRootName = rootName ?? menu.name;
    const nextRootOrder = rootOrder ?? menu.order;
    out.push({
      menu,
      depth,
      rootId: nextRootId,
      rootName: nextRootName,
      rootOrder: nextRootOrder,
      ancestryIds,
    });

    if (menu.children.length > 0) {
      out.push(
        ...flattenMenus(
          menu.children,
          depth + 1,
          nextRootId,
          nextRootName,
          nextRootOrder,
          [...ancestryIds, menu.id],
        ),
      );
    }
  }

  return out;
}

function isPermissionEmpty(permission: PermissionFlags): boolean {
  return !(
    permission.can_read ||
    permission.can_create ||
    permission.can_update ||
    permission.can_delete ||
    permission.features.length > 0
  );
}

function permissionMatchesFilter(
  filter: PermissionFilter,
  current: PermissionFlags,
  initial: PermissionFlags,
  support: PermissionSupport,
): boolean {
  if (filter === "all") return true;
  if (filter === "active") return !isPermissionEmpty(current);
  if (filter === "unset") return isPermissionEmpty(current);
  if (filter === "changed") return !permissionsEqual(current, initial);
  return support.features.length > 0;
}

function mergeRoleMenuPermissions(
  items: RoleMenuPermission[],
): RoleMenuPermission | null {
  if (items.length === 0) return null;

  return items.reduce<RoleMenuPermission>(
    (merged, current) => ({
      ...merged,
      can_read: merged.can_read || current.can_read,
      can_create: merged.can_create || current.can_create,
      can_update: merged.can_update || current.can_update,
      can_delete: merged.can_delete || current.can_delete,
      features: normalizeFeatures([
        ...(merged.features ?? []),
        ...(current.features ?? []),
      ]),
      role_name: merged.role_name ?? current.role_name,
      menu_name: merged.menu_name ?? current.menu_name,
      menu_url: merged.menu_url ?? current.menu_url,
    }),
    { ...items[0] },
  );
}

function normalizeFeatureOptions(row: FlatMenu): FeatureOption[] {
  const options = row.menu.allowed_feature_options;
  if (options && options.length > 0) {
    return options.map((option) => ({
      key: option.key,
      label: option.label || option.key,
    }));
  }

  return (row.menu.allowed_features ?? []).map((feature) => ({
    key: feature,
    label: feature,
  }));
}

function getFeatureKeys(support: PermissionSupport): string[] {
  return support.features.map((feature) => feature.key);
}

function getFeatureLabel(key: string, support?: PermissionSupport): string {
  return support?.features.find((feature) => feature.key === key)?.label ?? key;
}

function getFeatureSummaryLabel(features: string[]): string {
  if (features.length === 0) return "-";
  if (features.length === 1) return features[0];
  return `${features.length} fitur`;
}

function getFeatureGroupTitle(group: string): string {
  if (group === "operational") return "Scope Operasional";
  if (group === "report") return "Laporan";
  return "Aksi Tambahan";
}

function getFeatureGroupDescription(group: string): string {
  if (group === "operational") {
    return "Data sendiri/terkait aktif otomatis. Data Divisi hanya memperluas akses baca, sedangkan Kelola Semua Data membuka scope operasional penuh.";
  }
  if (group === "report") {
    return "Semua Data hanya berlaku untuk laporan, export, atau cetak laporan.";
  }
  return "Aksi khusus yang tetap mengikuti permission menu dan validasi backend.";
}

function groupFeatureOptions(features: FeatureOption[]) {
  const groups = new Map<string, FeatureOption[]>();

  for (const feature of features) {
    const group =
      feature.key === REPORT_ALL_FEATURE
        ? "report"
        : feature.key === VIEW_DIVISION_FEATURE ||
            feature.key === MANAGE_ALL_FEATURE
          ? "operational"
          : "actions";
    groups.set(group, [...(groups.get(group) ?? []), feature]);
  }

  return ["operational", "report", "actions"]
    .map((group) => ({
      key: group,
      features: groups.get(group) ?? [],
    }))
    .filter((group) => group.features.length > 0);
}

function isFeatureDisabledByScopeRule(
  featureKey: FeatureKey,
  permission: PermissionFlags,
): boolean {
  return (
    featureKey === VIEW_DIVISION_FEATURE &&
    permission.features.includes(MANAGE_ALL_FEATURE)
  );
}

function getPermissionSupport(row: FlatMenu): PermissionSupport {
  const backendPermissions = row.menu.allowed_permissions;
  const backendFeatures = normalizeFeatureOptions(row);

  if (backendPermissions) {
    return {
      can_read: backendPermissions.can_read,
      can_create: backendPermissions.can_create,
      can_update: backendPermissions.can_update,
      can_delete: backendPermissions.can_delete,
      features: backendFeatures,
    };
  }

  return {
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
    features: backendFeatures,
  };
}

function sanitizePermission(
  permission: PermissionFlags,
  support: PermissionSupport,
): PermissionFlags {
  const next = clonePermission(permission);

  if (!support.can_read) {
    return createEmptyPermission();
  }

  if (!next.can_read) {
    return createEmptyPermission();
  }

  next.can_create = support.can_create ? next.can_create : false;
  next.can_update = support.can_update ? next.can_update : false;
  next.can_delete = support.can_delete ? next.can_delete : false;
  const supportedFeatures = getFeatureKeys(support);
  next.features = normalizeFeatures(next.features).filter((feature) =>
    supportedFeatures.includes(feature),
  );

  return next;
}

function togglePermission(
  current: PermissionFlags,
  key: PermKey,
  support: PermissionSupport,
): PermissionFlags {
  const next = clonePermission(current);

  if (key === "can_read") {
    next.can_read = !next.can_read;
    if (!next.can_read) {
      next.can_create = false;
      next.can_update = false;
      next.can_delete = false;
    }
    return sanitizePermission(next, support);
  }

  if (!support[key]) {
    return sanitizePermission(next, support);
  }

  next[key] = !next[key];
  if (next[key]) {
    next.can_read = true;
  }

  return sanitizePermission(next, support);
}

function toggleFeature(
  current: PermissionFlags,
  key: FeatureKey,
  support: PermissionSupport,
): PermissionFlags {
  if (!getFeatureKeys(support).includes(key)) {
    return sanitizePermission(current, support);
  }

  const next = clonePermission(current);
  const features = new Set(next.features);

  if (features.has(key)) {
    features.delete(key);
  } else {
    features.add(key);
    next.can_read = true;
    if (key === MANAGE_ALL_FEATURE) {
      features.delete(VIEW_DIVISION_FEATURE);
    }
  }

  next.features = Array.from(features);
  return sanitizePermission(next, support);
}

function buildPermissionDraft(
  rows: FlatMenu[],
  items: RoleMenuPermission[],
  supportByMenuId: Map<string, PermissionSupport>,
): PermissionMap {
  const grouped = new Map<string, RoleMenuPermission[]>();

  for (const permission of items) {
    const current = grouped.get(permission.menu_id) ?? [];
    current.push(permission);
    grouped.set(permission.menu_id, current);
  }

  return rows.reduce<PermissionMap>((acc, row) => {
    const merged = mergeRoleMenuPermissions(grouped.get(row.menu.id) ?? []);
    const support =
      supportByMenuId.get(row.menu.id) ?? getPermissionSupport(row);
    acc[row.menu.id] = sanitizePermission(
      permissionFromRoleMenu(merged),
      support,
    );
    return acc;
  }, {});
}

export default function SetupRoleMenuPage() {
  const { showToast } = useAppToast();
  const { refreshRbac } = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [flatMenus, setFlatMenus] = useState<FlatMenu[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<
    RoleMenuPermission[]
  >([]);
  const [draftPermissions, setDraftPermissions] = useState<PermissionMap>({});
  const [initialPermissions, setInitialPermissions] = useState<PermissionMap>(
    {},
  );
  const [query, setQuery] = useState("");
  const [permissionFilter, setPermissionFilter] =
    useState<PermissionFilter>("all");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [featureModalMenuId, setFeatureModalMenuId] = useState<string | null>(
    null,
  );

  const supportByMenuId = useMemo(
    () =>
      new Map(flatMenus.map((row) => [row.menu.id, getPermissionSupport(row)])),
    [flatMenus],
  );

  const loadPageData = useCallback(async () => {
    setIsPageLoading(true);

    try {
      const [roleList, menuTree] = await Promise.all([
        roleService.getAll(),
        menuService.getAllForManagement(),
      ]);

      setRoles(
        [...roleList].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setFlatMenus(flattenMenus(menuTree));
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat data akses menu role",
        "error",
      );
    } finally {
      setIsPageLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const applyFetchedPermissions = useCallback(
    (items: RoleMenuPermission[]) => {
      const nextDraft = buildPermissionDraft(flatMenus, items, supportByMenuId);
      setSelectedRolePermissions(items);
      setDraftPermissions(nextDraft);
      setInitialPermissions(nextDraft);
    },
    [flatMenus, supportByMenuId],
  );

  useEffect(() => {
    if (!selectedRoleId || flatMenus.length === 0) {
      setSelectedRolePermissions([]);
      setDraftPermissions({});
      setInitialPermissions({});
      return;
    }

    let ignore = false;

    async function loadPermissions() {
      setIsPermissionsLoading(true);
      try {
        const items = await roleMenuService.getByRoleId(selectedRoleId);
        if (!ignore) {
          applyFetchedPermissions(items);
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat akses menu role",
            "error",
          );
        }
      } finally {
        if (!ignore) {
          setIsPermissionsLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      ignore = true;
    };
  }, [applyFetchedPermissions, flatMenus.length, selectedRoleId, showToast]);

  const hasUnsavedChanges = useMemo(() => {
    return flatMenus.some((row) => {
      const current = draftPermissions[row.menu.id] ?? createEmptyPermission();
      const initial =
        initialPermissions[row.menu.id] ?? createEmptyPermission();
      return !permissionsEqual(current, initial);
    });
  }, [draftPermissions, flatMenus, initialPermissions]);

  const filteredFlat = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword && permissionFilter === "all") return flatMenus;

    const matchedIds = new Set<string>();
    const visibleIds = new Set<string>();

    for (const row of flatMenus) {
      const haystack = `${row.menu.name} ${row.menu.url}`.toLowerCase();
      const current =
        draftPermissions[row.menu.id] ?? createEmptyPermission();
      const initial =
        initialPermissions[row.menu.id] ?? createEmptyPermission();
      const support =
        supportByMenuId.get(row.menu.id) ?? getPermissionSupport(row);
      const keywordMatches = !keyword || haystack.includes(keyword);
      const permissionMatches = permissionMatchesFilter(
        permissionFilter,
        current,
        initial,
        support,
      );

      if (keywordMatches && permissionMatches) {
        matchedIds.add(row.menu.id);
        visibleIds.add(row.menu.id);
        row.ancestryIds.forEach((ancestorId) => visibleIds.add(ancestorId));
      }
    }

    for (const row of flatMenus) {
      if (row.ancestryIds.some((ancestorId) => matchedIds.has(ancestorId))) {
        visibleIds.add(row.menu.id);
      }
    }

    return flatMenus.filter((row) => visibleIds.has(row.menu.id));
  }, [
    draftPermissions,
    flatMenus,
    initialPermissions,
    permissionFilter,
    query,
    supportByMenuId,
  ]);

  const groupedMenus = useMemo(() => {
    const grouped = new Map<string, MenuGroup>();

    for (const row of filteredFlat) {
      const key = row.rootId;
      const existing = grouped.get(key);

      if (existing) {
        existing.rows.push(row);
        continue;
      }

      grouped.set(key, {
        key,
        label: row.rootName,
        order: row.rootOrder,
        rows: [row],
      });
    }

    return Array.from(grouped.values()).sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.label.localeCompare(right.label);
    });
  }, [filteredFlat]);

  const isBusy =
    isPageLoading || isPermissionsLoading || isSaving || isResetting;

  const featureModalRow = useMemo(
    () =>
      featureModalMenuId
        ? flatMenus.find((row) => row.menu.id === featureModalMenuId) ?? null
        : null,
    [featureModalMenuId, flatMenus],
  );

  const featureModalSupport = featureModalRow
    ? supportByMenuId.get(featureModalRow.menu.id) ??
      getPermissionSupport(featureModalRow)
    : null;

  const featureModalPermission = featureModalRow
    ? draftPermissions[featureModalRow.menu.id] ?? createEmptyPermission()
    : createEmptyPermission();

  const handlePermissionToggle = useCallback(
    (menuId: string, key: PermKey) => {
      if (!selectedRoleId || isBusy) return;

      const support = supportByMenuId.get(menuId);
      if (!support) return;

      setDraftPermissions((prev) => {
        const current = prev[menuId] ?? createEmptyPermission();
        return {
          ...prev,
          [menuId]: togglePermission(current, key, support),
        };
      });
    },
    [isBusy, selectedRoleId, supportByMenuId],
  );

  const handleFeatureToggle = useCallback(
    (menuId: string, key: FeatureKey) => {
      if (!selectedRoleId || isBusy) return;

      const support = supportByMenuId.get(menuId);
      if (!support) return;

      setDraftPermissions((prev) => {
        const current = prev[menuId] ?? createEmptyPermission();
        return {
          ...prev,
          [menuId]: toggleFeature(current, key, support),
        };
      });
    },
    [isBusy, selectedRoleId, supportByMenuId],
  );

  const handleReset = async () => {
    if (!selectedRoleId || isBusy) return;

    setIsResetting(true);
    try {
      const items = await roleMenuService.getByRoleId(selectedRoleId);
      applyFetchedPermissions(items);
      showToast("Akses menu dikembalikan ke data awal.", "info");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengembalikan akses menu",
        "error",
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      showToast("Pilih role terlebih dahulu.", "warning");
      return;
    }

    if (!hasUnsavedChanges) {
      showToast("Belum ada perubahan yang perlu disimpan.", "info");
      return;
    }

    setIsSaving(true);

    try {
      const existingByMenuId = new Map<string, RoleMenuPermission[]>();

      for (const permission of selectedRolePermissions) {
        const current = existingByMenuId.get(permission.menu_id) ?? [];
        current.push(permission);
        existingByMenuId.set(permission.menu_id, current);
      }

      for (const row of flatMenus) {
        const support =
          supportByMenuId.get(row.menu.id) ?? getPermissionSupport(row);
        const desired = sanitizePermission(
          draftPermissions[row.menu.id] ?? createEmptyPermission(),
          support,
        );
        const existingItems = existingByMenuId.get(row.menu.id) ?? [];
        const mergedExisting = mergeRoleMenuPermissions(existingItems);
        const normalizedExisting = sanitizePermission(
          permissionFromRoleMenu(mergedExisting),
          support,
        );

        if (
          existingItems.length <= 1 &&
          permissionsEqual(normalizedExisting, desired)
        ) {
          continue;
        }

        if (isPermissionEmpty(desired)) {
          for (const item of existingItems) {
            await roleMenuService.remove(item.id);
          }
          continue;
        }

        if (existingItems.length > 0) {
          const [primaryPermission, ...duplicatePermissions] = existingItems;
          const primaryFlags = sanitizePermission(
            permissionFromRoleMenu(primaryPermission),
            support,
          );

          if (!permissionsEqual(primaryFlags, desired)) {
            await roleMenuService.update(primaryPermission.id, desired);
          }

          for (const duplicatePermission of duplicatePermissions) {
            await roleMenuService.remove(duplicatePermission.id);
          }
          continue;
        }

        const payload: RoleMenuWritePayload = {
          role_id: selectedRoleId,
          menu_id: row.menu.id,
          ...desired,
        };

        await roleMenuService.create(payload);
      }

      const refreshedPermissions =
        await roleMenuService.getByRoleId(selectedRoleId);
      applyFetchedPermissions(refreshedPermissions);
      await refreshRbac();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(RBAC_REFRESH_EVENT));
        window.localStorage.setItem(
          RBAC_REFRESH_STORAGE_KEY,
          String(Date.now()),
        );
      }
      showToast("Akses menu berhasil disimpan.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan akses menu",
        "error",
      );

      try {
        const refreshedPermissions =
          await roleMenuService.getByRoleId(selectedRoleId);
        applyFetchedPermissions(refreshedPermissions);
      } catch {}
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Akses Menu per Role"
        subtitle="Pilih role yang mau diatur, lalu tentukan menu mana yang boleh dibuka atau dikelola."
        icon={<KeyRound />}
        actions={null}
      />

      <div
        className={`${SETUP_PAGE_SEARCH_CARD_CLASS} role-menu-filter-card max-w-[1280px]`}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,320px)] lg:items-end">
          <SetupSearchInput
            label="Cari Menu"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              selectedRoleId
                ? "Cari nama menu atau route..."
                : "Pilih role dulu untuk mulai mencari menu"
            }
            disabled={!selectedRoleId || isBusy}
          />

          <label htmlFor="role-menu-role-select" className="block w-full">
            <span className="text-sm font-medium text-gray-700">
              Pilih Role
            </span>

            <SetupSelect
              id="role-menu-role-select"
              name="role-menu-role-select"
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              className="mt-0.5"
              disabled={isBusy}
            >
              <option value="">Pilih role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SetupSelect>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter akses menu">
          {PERMISSION_FILTER_OPTIONS.map((option) => {
            const isActive = permissionFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setPermissionFilter(option.key)}
                disabled={!selectedRoleId || isBusy}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-[#157ec3] bg-[#157ec3] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                } disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${SECTION_CARD_CLASS} role-menu-table-card`}>

        <div className="role-menu-table-scroll overflow-x-auto">
          <SetupDataTable className={PERMISSION_TABLE_CLASS}>
            <SetupDataTableColGroup>
              <SetupDataTableCol className="w-[368px]" />
              <SetupDataTableCol className="w-[58px]" />
              <SetupDataTableCol className="w-[58px]" />
              <SetupDataTableCol className="w-[58px]" />
              <SetupDataTableCol className="w-[58px]" />
              <SetupDataTableCol className="w-[160px]" />
            </SetupDataTableColGroup>
            <SetupDataTableHead className="sticky top-0 z-20 bg-white shadow-[0_1px_0_rgba(15,23,42,0.08)] ltr:text-left rtl:text-right">
              <SetupDataTableRow>
                <SetupDataTableHeaderCell className={`${MENU_HEADER_CLASS} role-menu-name-cell`}>
                  Menu
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={PERM_HEADER_CLASS}>Baca</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={PERM_HEADER_CLASS}>Tambah</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={PERM_HEADER_CLASS}>Ubah</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={PERM_HEADER_CLASS}>Hapus</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={FEATURE_HEADER_CLASS}>
                  Fitur Khusus
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {isPageLoading && (
                <SetupDataTableEmptyRow colSpan={6}>
                  Memuat daftar menu...
                </SetupDataTableEmptyRow>
              )}

              {!isPageLoading && !selectedRoleId && (
                <SetupDataTableEmptyRow colSpan={6}>
                  Pilih role untuk melihat akses menu.
                </SetupDataTableEmptyRow>
              )}

              {!isPageLoading && selectedRoleId && isPermissionsLoading && (
                <SetupDataTableEmptyRow colSpan={6}>
                  Memuat akses menu untuk role terpilih...
                </SetupDataTableEmptyRow>
              )}

              {!isPageLoading &&
                selectedRoleId &&
                !isPermissionsLoading &&
                groupedMenus.map((group) => {
                  return (
                    <Fragment key={group.key}>
                      <SetupDataTableRow className={GROUP_ROW_CLASS}>
                        <SetupDataTableCell
                          className="role-menu-name-cell px-3 py-2 text-sm font-bold text-gray-950"
                        >
                          {group.label}
                        </SetupDataTableCell>
                        <SetupDataTableCell colSpan={5} className="px-2 py-2" />
                      </SetupDataTableRow>

                      {group.rows.map((row) => {
                        const permission =
                          draftPermissions[row.menu.id] ??
                          createEmptyPermission();
                        const support =
                          supportByMenuId.get(row.menu.id) ??
                          getPermissionSupport(row);
                        const renderPermissionCell = (
                          key: PermKey,
                          label: string,
                        ) => {
                          const isUnsupported = !support[key];
                          const disabled =
                            isBusy ||
                            !selectedRoleId ||
                            isUnsupported ||
                            (key !== "can_read" && !permission.can_read);

                          return (
                            <SetupDataTableCell key={key} className={PERM_CELL_CLASS}>
                              <div
                                className="flex justify-center"
                                title={
                                  isUnsupported
                                    ? "Akses ini tidak tersedia untuk menu ini."
                                    : undefined
                                }
                              >
                                <UiverseCheckbox
                                  checked={permission[key]}
                                  onCheckedChange={() =>
                                    handlePermissionToggle(row.menu.id, key)
                                  }
                                  disabled={disabled}
                                  ariaLabel={`${row.menu.name} - ${label}`}
                                  size={18}
                                  className={
                                    isUnsupported
                                      ? "uiverse-checkbox--unavailable"
                                      : undefined
                                  }
                                />
                              </div>
                            </SetupDataTableCell>
                          );
                        };

                        const renderFeatureSummaryCell = () => {
                          const supportedFeatures = support.features;
                          const selectedFeatures = permission.features
                            .filter((feature) =>
                              supportedFeatures.some(
                                (option) => option.key === feature,
                              ),
                            )
                            .map((feature) =>
                              getFeatureLabel(feature, support),
                            );
                          const disabled =
                            isBusy ||
                            !selectedRoleId ||
                            supportedFeatures.length === 0 ||
                            !permission.can_read;

                          return (
                            <SetupDataTableCell className={FEATURE_CELL_CLASS}>
                              <div className="flex items-center justify-center gap-2">
                                {selectedFeatures.length > 0 ? (
                                  <span
                                    className={FEATURE_BADGE_CLASS}
                                    title={selectedFeatures.join(", ")}
                                  >
                                    <span className="truncate">
                                      {getFeatureSummaryLabel(selectedFeatures)}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-gray-400">
                                    -
                                  </span>
                                )}

                                {supportedFeatures.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFeatureModalMenuId(row.menu.id)
                                    }
                                    disabled={disabled}
                                    className={FEATURE_BUTTON_CLASS}
                                    title={
                                      !permission.can_read
                                        ? "Aktifkan Baca sebelum mengatur fitur khusus."
                                        : undefined
                                    }
                                  >
                                    <Settings2
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                    <span className="sr-only">Atur fitur</span>
                                  </button>
                                ) : null}
                              </div>
                            </SetupDataTableCell>
                          );
                        };

                        return (
                          <SetupDataTableRow
                            key={row.menu.id}
                            className="border-b border-gray-200 transition-colors hover:bg-gray-50/70"
                          >
                            <SetupDataTableCell
                              className={`${MENU_CELL_CLASS} role-menu-name-cell`}
                              style={
                                {
                                  ["--role-menu-depth"]: row.depth,
                                } as CSSProperties
                              }
                            >
                              <div className="role-menu-name-content flex min-w-0 items-center text-left">
                                <p
                                  className="truncate font-semibold text-gray-900"
                                  title={row.menu.name}
                                >
                                  {row.menu.name}
                                </p>
                              </div>
                            </SetupDataTableCell>
                            {renderPermissionCell("can_read", "Baca")}
                            {renderPermissionCell("can_create", "Tambah")}
                            {renderPermissionCell("can_update", "Ubah")}
                            {renderPermissionCell("can_delete", "Hapus")}
                            {renderFeatureSummaryCell()}
                          </SetupDataTableRow>
                        );
                      })}
                    </Fragment>
                  );
                })}

              {!isPageLoading &&
                selectedRoleId &&
                !isPermissionsLoading &&
                groupedMenus.length === 0 && (
                  <SetupDataTableEmptyRow colSpan={6}>
                    {query.trim() || permissionFilter !== "all"
                      ? "Tidak ada menu yang cocok dengan filter."
                      : getSetupPageEmptyStateCopy("menu")}
                  </SetupDataTableEmptyRow>
                )}
            </SetupDataTableBody>
          </SetupDataTable>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-gray-50/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!selectedRoleId || isBusy || !hasUnsavedChanges}
              className="uiverse-modal-button uiverse-modal-button--primary"
            >
              {isSaving ? (
                <>
                  <div
                    className="button-spinner uiverse-modal-button__spinner"
                    style={
                      {
                        ["--spinner-size"]: "18px",
                        ["--spinner-border"]: "2px",
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Simpan perubahan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={!selectedRoleId || isBusy || !hasUnsavedChanges}
              className="uiverse-modal-button uiverse-modal-button--neutral"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {featureModalRow && featureModalSupport && (
        <DashboardModal
          isOpen={Boolean(featureModalRow && featureModalSupport)}
          title={`Atur Fitur ${featureModalRow.menu.name}`}
          description="Aktifkan akses tambahan yang boleh digunakan role ini."
          onClose={() => setFeatureModalMenuId(null)}
          maxWidth="lg"
          bodyClassName="space-y-3 p-6"
          footerClassName="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4"
          footer={
            <button
              type="button"
              onClick={() => setFeatureModalMenuId(null)}
              className="uiverse-modal-button uiverse-modal-button--primary"
            >
              <span>Selesai</span>
            </button>
          }
        >
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            Perubahan fitur akan tersimpan setelah klik Simpan perubahan.
          </p>
          {featureModalSupport.features.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm font-medium text-gray-500">
              Menu ini tidak memiliki fitur tambahan.
            </div>
          ) : (
            <div className="space-y-4">
              {groupFeatureOptions(featureModalSupport.features).map((group) => (
                <section
                  key={group.key}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="mb-3 space-y-1">
                    <h3 className="text-sm font-bold text-gray-950">
                      {getFeatureGroupTitle(group.key)}
                    </h3>
                    <p className="text-xs leading-5 text-gray-500">
                      {getFeatureGroupDescription(group.key)}
                    </p>
                  </div>

                  {group.key === "operational" ? (
                    <div className="mb-2 rounded-lg bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                      Data Sendiri/Terkait aktif otomatis saat Baca dicentang.
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {group.features.map((feature) => {
                      const checked = featureModalPermission.features.includes(
                        feature.key,
                      );
                      const disabledByScopeRule = isFeatureDisabledByScopeRule(
                        feature.key,
                        featureModalPermission,
                      );
                      const disabled =
                        isBusy ||
                        !selectedRoleId ||
                        !featureModalPermission.can_read ||
                        disabledByScopeRule;

                      return (
                        <div
                          key={feature.key}
                          className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition ${
                            checked
                              ? "border-blue-200 bg-blue-50"
                              : "border-gray-200 bg-white"
                          } ${
                            disabled
                              ? "cursor-not-allowed opacity-60"
                              : "hover:border-blue-200 hover:bg-blue-50/60"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-950">
                              {feature.label}
                            </p>
                            {disabledByScopeRule ? (
                              <p className="mt-1 text-xs font-medium text-gray-500">
                                Tidak perlu dicentang karena Kelola Semua Data sudah aktif.
                              </p>
                            ) : null}
                          </div>
                          <UiverseCheckbox
                            checked={checked}
                            onCheckedChange={() =>
                              handleFeatureToggle(
                                featureModalRow.menu.id,
                                feature.key,
                              )
                            }
                            disabled={disabled}
                            ariaLabel={`${featureModalRow.menu.name} - ${feature.label}`}
                            size={20}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </DashboardModal>
      )}
    </DashboardPageShell>
  );
}
