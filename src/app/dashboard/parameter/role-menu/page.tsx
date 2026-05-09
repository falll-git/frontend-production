"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { KeyRound, RotateCcw, Save, Search, Settings2, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import {
  getSetupPageEmptyStateCopy,
  SETUP_PAGE_COMPACT_CELL_CLASS,
  SETUP_PAGE_COMPACT_ROW_CLASS,
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
  SETUP_PAGE_TABLE_BODY_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
  SETUP_PAGE_WIDTH_MD_CLASS,
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
  rootName: string;
  ancestryIds: string[];
};

type PermKey = "can_read" | "can_create" | "can_update" | "can_delete";
type FeatureKey = string;

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

type MenuModuleKey =
  | "dashboard"
  | "arsip"
  | "surat"
  | "debitur"
  | "legal"
  | "administrator";

type MenuGroup = {
  key: string;
  label: string;
  rows: FlatMenu[];
};

const SECTION_CARD_CLASS =
  SETUP_PAGE_TABLE_CARD_CLASS;
const PERM_HEADER_CLASS =
  "w-[60px] px-1.5 py-3 !text-center text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 whitespace-nowrap";
const PERM_CELL_CLASS = "w-[60px] px-1.5 py-3 !text-center align-middle";
const FEATURE_HEADER_CLASS =
  "w-[220px] px-2 py-3 !text-center text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 whitespace-nowrap";
const FEATURE_CELL_CLASS = "w-[220px] px-2 py-3 align-middle";
const GROUP_ROW_CLASS = "border-y border-gray-200 bg-gray-50/80";

const FEATURE_LABELS: Record<string, string> = {
  report_all: "Semua Data",
  redispose: "Redisposisi",
  approve: "Setujui",
  reject: "Tolak",
  handover: "Serahkan",
  return: "Kembalikan",
};

const MODULE_GROUPS: Array<{
  key: MenuModuleKey;
  label: string;
  rootNames: string[];
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
    rootNames: ["Dashboard"],
  },
  {
    key: "arsip",
    label: "Modul penyimpanan arsip",
    rootNames: ["Arsip Digital"],
  },
  {
    key: "surat",
    label: "Modul surat menyurat",
    rootNames: ["Manajemen Surat"],
  },
  {
    key: "debitur",
    label: "Modul debitur",
    rootNames: ["Informasi Debitur"],
  },
  {
    key: "legal",
    label: "Modul legal",
    rootNames: ["Manajemen Legal"],
  },
  {
    key: "administrator",
    label: "Administrator",
    rootNames: ["Parameter"],
  },
];

const READ_ONLY_PREFIXES = [
  "/dashboard",
  "/dashboard/arsip-digital/historis",
  "/dashboard/arsip-digital/laporan",
  "/dashboard/arsip-digital/disposisi/historis",
  "/dashboard/arsip-digital/peminjaman/laporan",
  "/dashboard/arsip-digital/ruang-arsip/jatuh-tempo",
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
  "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
  "/dashboard/manajemen-surat/laporan",
  "/dashboard/manajemen-surat/cetak-dokumen",
  "/dashboard/informasi-debitur",
  "/dashboard/legal/cetak",
  "/dashboard/legal/laporan",
];

const FULL_CRUD_PREFIXES = [
  "/dashboard/users",
  "/dashboard/parameter",
  "/dashboard/legal/progress/asuransi",
  "/dashboard/legal/progress/klaim",
  "/dashboard/legal/progress/notaris",
  "/dashboard/legal/titipan/asuransi",
  "/dashboard/legal/titipan/notaris",
  "/dashboard/legal/titipan/angsuran",
];

const CREATE_ONLY_PREFIXES = [
  "/dashboard/arsip-digital/input-dokumen",
  "/dashboard/arsip-digital/disposisi/pengajuan",
  "/dashboard/arsip-digital/peminjaman/request",
  "/dashboard/manajemen-surat/kelola-surat/input-surat-masuk",
  "/dashboard/manajemen-surat/kelola-surat/input-memorandum",
  "/dashboard/informasi-debitur/admin/upload-slik",
  "/dashboard/informasi-debitur/admin/upload-restrik",
];

const CREATE_UPDATE_PREFIXES = [
  "/dashboard/informasi-debitur/marketing/action-plan",
  "/dashboard/informasi-debitur/marketing/hasil-kunjungan",
  "/dashboard/informasi-debitur/marketing/langkah-penanganan",
  "/dashboard/manajemen-surat/kelola-surat/input-surat-keluar",
];

const UPDATE_ONLY_PREFIXES = [
  "/dashboard/arsip-digital/disposisi/permintaan",
  "/dashboard/arsip-digital/peminjaman/accept",
];

const CREATE_DELETE_PREFIXES = ["/dashboard/legal/upload-ideb"];

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
  return [...new Set((features ?? []).map((item) => item.trim()).filter(Boolean))];
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
  rootName?: string,
  ancestryIds: string[] = [],
): FlatMenu[] {
  const sorted = [...nodes].sort((left, right) => left.order - right.order);
  const out: FlatMenu[] = [];

  for (const menu of sorted) {
    const nextRootName = rootName ?? menu.name;
    out.push({
      menu,
      depth,
      rootName: nextRootName,
      ancestryIds,
    });

    if (menu.children.length > 0) {
      out.push(
        ...flattenMenus(menu.children, depth + 1, nextRootName, [
          ...ancestryIds,
          menu.id,
        ]),
      );
    }
  }

  return out;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
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

function getModuleGroupMeta(rootName: string) {
  return MODULE_GROUPS.find((group) => group.rootNames.includes(rootName));
}

function normalizeFeatureOptions(row: FlatMenu): FeatureOption[] {
  const options = row.menu.allowed_feature_options;
  if (options && options.length > 0) {
    return options.map((option) => ({
      key: option.key,
      label: option.label || FEATURE_LABELS[option.key] || option.key,
    }));
  }

  return (row.menu.allowed_features ?? []).map((feature) => ({
    key: feature,
    label: FEATURE_LABELS[feature] || feature,
  }));
}

function getFeatureKeys(support: PermissionSupport): string[] {
  return support.features.map((feature) => feature.key);
}

function getFeatureLabel(key: string, support?: PermissionSupport): string {
  return (
    support?.features.find((feature) => feature.key === key)?.label ??
    FEATURE_LABELS[key] ??
    key
  );
}

function getPermissionSupport(row: FlatMenu): PermissionSupport {
  const pathname = row.menu.url;
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

  if (row.menu.children.length > 0) {
    return {
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
      features: [],
    };
  }

  if (FULL_CRUD_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return {
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: true,
      features: [],
    };
  }

  if (
    CREATE_UPDATE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return {
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: false,
      features: [],
    };
  }

  if (
    CREATE_DELETE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return {
      can_read: true,
      can_create: true,
      can_update: false,
      can_delete: true,
      features: [],
    };
  }

  if (UPDATE_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return {
      can_read: true,
      can_create: false,
      can_update: true,
      can_delete: false,
      features: [],
    };
  }

  if (CREATE_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return {
      can_read: true,
      can_create: true,
      can_update: false,
      can_delete: false,
      features: [],
    };
  }

  if (READ_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return {
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
      features: [],
    };
  }

  return {
    can_read: true,
    can_create: false,
    can_update: false,
    can_delete: false,
    features: [],
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
        error instanceof Error ? error.message : "Gagal memuat data role-menu",
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
    if (!keyword) return flatMenus;

    const matchedIds = new Set<string>();
    const visibleIds = new Set<string>();

    for (const row of flatMenus) {
      const haystack = `${row.menu.name} ${row.menu.url}`.toLowerCase();
      if (haystack.includes(keyword)) {
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
  }, [flatMenus, query]);

  const groupedMenus = useMemo(() => {
    const grouped = new Map<string, MenuGroup>();

    for (const row of filteredFlat) {
      const meta = getModuleGroupMeta(row.rootName);
      const key = meta?.key ?? `extra:${row.rootName}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.rows.push(row);
        continue;
      }

      grouped.set(key, {
        key,
        label: meta?.label ?? row.rootName,
        rows: [row],
      });
    }

    const orderedKnown = MODULE_GROUPS.map((group) =>
      grouped.get(group.key),
    ).filter((group): group is MenuGroup => Boolean(group));

    const extraGroups = Array.from(grouped.values())
      .filter((group) => !MODULE_GROUPS.some((meta) => meta.key === group.key))
      .sort((left, right) => left.label.localeCompare(right.label));

    return [...orderedKnown, ...extraGroups];
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
      showToast("Permission direset ke data awal", "info");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal mereset permission",
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
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Setup Akses Menu per Role"
        subtitle="Pilih role yang mau diatur, lalu tentukan menu mana yang boleh dibuka atau dikelola."
        icon={<KeyRound />}
        actions={null}
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_MD_CLASS}`}>
        <label className="block text-center text-sm font-medium text-gray-700">
          Pilih role
        </label>
        <select
          value={selectedRoleId}
          onChange={(event) => setSelectedRoleId(event.target.value)}
          className="select mx-auto mt-3 block w-full max-w-[320px]"
          disabled={isBusy}
        >
          <option value="">Pilih role yang mau diatur</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_MD_CLASS}`}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Menu</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              selectedRoleId
                ? "Cari nama menu atau route..."
                : "Pilih role dulu untuk mulai mencari menu"
            }
            className={SETUP_PAGE_SEARCH_INPUT_CLASS}
            disabled={!selectedRoleId || isBusy}
          />
        </div>
      </div>

      <div className={`${SECTION_CARD_CLASS} ${SETUP_PAGE_WIDTH_MD_CLASS}`}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup>
              <col />
              <col className="w-[60px]" />
              <col className="w-[60px]" />
              <col className="w-[60px]" />
              <col className="w-[60px]" />
              <col className="w-[220px]" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Menu
                </th>
                <th className={PERM_HEADER_CLASS}>Baca</th>
                <th className={PERM_HEADER_CLASS}>Tambah</th>
                <th className={PERM_HEADER_CLASS}>Ubah</th>
                <th className={PERM_HEADER_CLASS}>Hapus</th>
                <th className={FEATURE_HEADER_CLASS}>
                  Fitur Khusus
                </th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {isPageLoading && (
                <tr>
                  <td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>
                    Memuat daftar menu...
                  </td>
                </tr>
              )}

              {!isPageLoading && !selectedRoleId && (
                <tr>
                  <td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>
                    Pilih role untuk melihat permission menu.
                  </td>
                </tr>
              )}

              {!isPageLoading && selectedRoleId && isPermissionsLoading && (
                <tr>
                  <td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>
                    Memuat akses menu untuk role terpilih...
                  </td>
                </tr>
              )}

              {!isPageLoading &&
                selectedRoleId &&
                !isPermissionsLoading &&
                groupedMenus.map((group) => {
                  return (
                    <Fragment key={group.key}>
                      <tr
                        className={`${SETUP_PAGE_COMPACT_ROW_CLASS} ${GROUP_ROW_CLASS}`}
                      >
                        <td
                          colSpan={6}
                          className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}
                        >
                          {group.label}
                        </td>
                      </tr>

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
                            <td key={key} className={PERM_CELL_CLASS}>
                              <div
                                className="flex justify-center"
                                title={
                                  isUnsupported
                                    ? "Permission ini tidak tersedia untuk menu ini."
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
                                  size={20}
                                  className={
                                    isUnsupported
                                      ? "uiverse-checkbox--unavailable"
                                      : undefined
                                  }
                                />
                              </div>
                            </td>
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
                            <td className={FEATURE_CELL_CLASS}>
                              <div className="flex flex-col items-center gap-2">
                                {supportedFeatures.length === 0 ? (
                                  <span className="text-xs font-medium text-gray-400">
                                    -
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFeatureModalMenuId(row.menu.id)
                                    }
                                    disabled={disabled}
                                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                                    title={
                                      !permission.can_read
                                        ? "Aktifkan Baca sebelum mengatur fitur khusus."
                                        : undefined
                                    }
                                  >
                                    <Settings2
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Atur Fitur
                                  </button>
                                )}

                                {selectedFeatures.length > 0 && (
                                  <div className="flex max-w-[180px] flex-wrap justify-center gap-1">
                                    {selectedFeatures.map((feature) => (
                                      <span
                                        key={feature}
                                        className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                      >
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        };

                        return (
                          <tr
                            key={row.menu.id}
                            className={SETUP_PAGE_COMPACT_ROW_CLASS}
                          >
                            <td
                              className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-900`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <p className="font-medium text-gray-900">
                                  {row.menu.name}
                                </p>
                              </div>
                            </td>
                            {renderPermissionCell("can_read", "Baca")}
                            {renderPermissionCell("can_create", "Tambah")}
                            {renderPermissionCell("can_update", "Ubah")}
                            {renderPermissionCell("can_delete", "Hapus")}
                            {renderFeatureSummaryCell()}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}

              {!isPageLoading &&
                selectedRoleId &&
                !isPermissionsLoading &&
                groupedMenus.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                    >
                      {getSetupPageEmptyStateCopy("menu")}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!selectedRoleId || isBusy}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <div
                    className="button-spinner"
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
              disabled={!selectedRoleId || isBusy}
              className="btn btn-outline"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {featureModalRow && featureModalSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
                  Fitur Khusus
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">
                  {featureModalRow.menu.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Pilih fitur tambahan yang berlaku untuk menu ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeatureModalMenuId(null)}
                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Tutup modal fitur khusus"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              {featureModalSupport.features.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm font-medium text-gray-500">
                  Menu ini tidak memiliki fitur khusus.
                </div>
              ) : (
                featureModalSupport.features.map((feature) => {
                  const checked = featureModalPermission.features.includes(
                    feature.key,
                  );
                  const disabled =
                    isBusy ||
                    !selectedRoleId ||
                    !featureModalPermission.can_read;

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
                        <p className="mt-1 text-xs text-gray-500">
                          {feature.key === "report_all"
                            ? "Mengizinkan role melihat data seluruh user pada menu ini."
                            : "Mengizinkan role menjalankan aksi khusus ini."}
                        </p>
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
                })
              )}
            </div>

            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setFeatureModalMenuId(null)}
                className="btn btn-primary"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
