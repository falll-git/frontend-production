"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  ADMINISTRATOR_SECTION_ROOT_NAMES,
  getBlockedFeatureRule,
  getMenuIdsToExpandForPath,
  isDashboardFeatureBlocked,
  isNodeOrDescendantPathActive,
  normalizePath,
} from "@/lib/rbac";
import type { DashboardMenuNode } from "@/types/rbac.types";
import { MenuLucideIcon } from "./MenuLucideIcon";

function splitRoots(visible: DashboardMenuNode[]) {
  const sorted = [...visible].sort((a, b) => a.order - b.order);
  const dashboard = sorted.find(
    (n) => n.name === "Dashboard" && normalizePath(n.url) === "/dashboard",
  );
  const rest = sorted.filter((n) => n.id !== dashboard?.id);
  const admin = rest.filter((n) => ADMINISTRATOR_SECTION_ROOT_NAMES.has(n.name));
  const main = rest.filter((n) => !ADMINISTRATOR_SECTION_ROOT_NAMES.has(n.name));
  return { dashboard, main, admin };
}

function MenuBranch({
  node,
  depth,
  pathname,
  sidebarExpanded,
  openById,
  toggleOpen,
  showToast,
}: {
  node: DashboardMenuNode;
  depth: number;
  pathname: string;
  sidebarExpanded: boolean;
  openById: Record<string, boolean>;
  toggleOpen: (id: string) => void;
  showToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = openById[node.id] ?? false;
  const normPath = normalizePath(pathname);
  const normUrl = normalizePath(node.url);
  const leafActive = !hasChildren && normUrl === normPath;
  const branchActive = hasChildren && isNodeOrDescendantPathActive(node, pathname);
  const isFeatureBlocked = hasChildren && isDashboardFeatureBlocked(node.url);

  const paddingClass = depth === 0 ? "" : depth === 1 ? "" : "ml-1 mt-0.5 space-y-0.5";
  const linkSize = depth >= 2 ? " text-xs" : "";

  if (!hasChildren) {
    return (
      <ProtectedLink
        href={node.url}
        className={`${
          depth === 0 ? "sidebar-menu-item" : "sidebar-submenu-item"
        }${linkSize} ${leafActive ? "active" : ""}`}
      >
        <MenuLucideIcon
          icon={node.icon}
          className={depth === 0 ? "w-5 h-5" : "w-4 h-4"}
        />
        {sidebarExpanded && (
          <span className={depth === 0 ? "font-bold" : ""}>{node.name}</span>
        )}
      </ProtectedLink>
    );
  }

  const buttonClass =
    depth === 0
      ? `sidebar-menu-item w-full justify-between${branchActive ? " active" : ""}${isFeatureBlocked ? " rbac-disabled feature-blocked-link" : ""}`
      : `sidebar-submenu-item w-full justify-between${branchActive ? " active" : ""}${linkSize}${isFeatureBlocked ? " rbac-disabled feature-blocked-link" : ""}`;

  return (
    <div className={paddingClass}>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          if (isFeatureBlocked) {
            const message = getBlockedFeatureRule(node.url)?.message ?? `Maaf fitur ${node.name} masih dalam tahap pengembangan.`;
            showToast(message, "warning");
            return;
          }
          toggleOpen(node.id);
        }}
        aria-expanded={isOpen}
        aria-disabled={isFeatureBlocked}
        data-access-state={isFeatureBlocked ? "feature-blocked" : undefined}
        title={
          isFeatureBlocked
            ? (getBlockedFeatureRule(node.url)?.message ?? `Maaf fitur ${node.name} masih dalam tahap pengembangan.`)
            : undefined
        }
      >
        <div
          className={`flex items-center min-w-0 ${depth === 0 ? "gap-3" : "gap-2"}`}
        >
          <MenuLucideIcon
            icon={node.icon}
            className={depth === 0 ? "w-5 h-5 shrink-0" : "w-4 h-4 shrink-0"}
          />
          {sidebarExpanded && (
            <span className={depth === 0 ? "font-bold truncate" : "truncate"}>{node.name}</span>
          )}
        </div>
        {sidebarExpanded && (
          <ChevronDown
            className={`${depth === 0 ? "w-4 h-4" : "w-3 h-3"} shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {sidebarExpanded && isOpen && (
        <div className={depth === 0 ? "mt-1 space-y-0.5" : "ml-1 mt-0.5 space-y-0.5"}>
          {node.children.map((child) => (
            <MenuBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              pathname={pathname}
              sidebarExpanded={sidebarExpanded}
              openById={openById}
              toggleOpen={toggleOpen}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface DashboardSidebarMenuProps {
  pathname: string;
  visibleMenus: DashboardMenuNode[];
  sidebarExpanded: boolean;
}

export function DashboardSidebarMenu({
  pathname,
  visibleMenus,
  sidebarExpanded,
}: DashboardSidebarMenuProps) {
  const [openById, setOpenById] = useState<Record<string, boolean>>({});
  const { showToast } = useAppToast();

  const toggleOpen = useCallback((id: string) => {
    setOpenById((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const pathExpandedIds = useMemo(
    () => getMenuIdsToExpandForPath(visibleMenus, pathname),
    [pathname, visibleMenus],
  );

  const effectiveOpenById = useMemo(() => {
    const next = { ...openById };
    for (const id of pathExpandedIds) {
      next[id] = true;
    }
    return next;
  }, [openById, pathExpandedIds]);

  const { dashboard, main, admin } = useMemo(
    () => splitRoots(visibleMenus),
    [visibleMenus],
  );

  if (visibleMenus.length === 0) {
    return (
      <ProtectedLink
        href="/dashboard"
        className={`sidebar-menu-item ${normalizePath(pathname) === "/dashboard" ? "active" : ""}`}
      >
        <MenuLucideIcon icon="lucide lucide-layout-dashboard" className="w-5 h-5" />
        {sidebarExpanded && <span className="font-medium">Dashboard</span>}
      </ProtectedLink>
    );
  }

  return (
    <>
      {dashboard && (
        <ProtectedLink
          href={dashboard.url}
          className={`sidebar-menu-item ${normalizePath(pathname) === "/dashboard" ? "active" : ""}`}
        >
          <MenuLucideIcon icon={dashboard.icon} className="w-5 h-5" />
          {sidebarExpanded && <span className="font-medium">{dashboard.name}</span>}
        </ProtectedLink>
      )}

      {sidebarExpanded && main.length > 0 && (
        <div className="mx-0 my-2 border-t border-white/10">
          <span className="block px-4 py-2 text-xs text-white/50 uppercase tracking-wider font-semibold">
            Modul Utama
          </span>
        </div>
      )}

      {main.map((node) => (
        <MenuBranch
          key={node.id}
          node={node}
          depth={0}
          pathname={pathname}
          sidebarExpanded={sidebarExpanded}
          openById={effectiveOpenById}
          toggleOpen={toggleOpen}
          showToast={showToast}
        />
      ))}

      {sidebarExpanded && admin.length > 0 && (
        <div className="mx-0 my-2 border-t border-white/10">
          <span className="block px-4 py-2 text-xs text-white/50 uppercase tracking-wider font-semibold">
            Administrator
          </span>
        </div>
      )}

      {admin.map((node) => (
        <MenuBranch
          key={node.id}
          node={node}
          depth={0}
          pathname={pathname}
          sidebarExpanded={sidebarExpanded}
          openById={effectiveOpenById}
          toggleOpen={toggleOpen}
          showToast={showToast}
        />
      ))}
    </>
  );
}
