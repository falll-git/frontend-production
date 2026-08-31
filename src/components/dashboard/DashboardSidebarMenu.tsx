"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import {
  getMenuIdsToExpandForPath,
  isNodeOrDescendantPathActive,
  normalizePath,
} from "@/lib/rbac";
import type { DashboardMenuNode } from "@/types/rbac.types";
import { MenuLucideIcon } from "./MenuLucideIcon";

const DASHBOARD_ROOT = "/dashboard";
const SEPUTAR_JAMINAN_ROOT = "/dashboard/seputar-jaminan";

export function groupDashboardMenus(nodes: DashboardMenuNode[]) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);

  return {
    dashboard: sorted.filter(
      (node) => normalizePath(node.url) === DASHBOARD_ROOT,
    ),
    ruwang: sorted.filter((node) => {
      const url = normalizePath(node.url);
      return url !== DASHBOARD_ROOT && url !== SEPUTAR_JAMINAN_ROOT;
    }),
    seputarJaminan: sorted.filter(
      (node) => normalizePath(node.url) === SEPUTAR_JAMINAN_ROOT,
    ),
  };
}

function SidebarContextLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-3 mb-1 mt-3 border-l-2 border-white/30 py-0.5 pl-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-4 text-white/65">
        {description}
      </p>
    </div>
  );
}

function MenuBranch({
  node,
  depth,
  pathname,
  sidebarExpanded,
  openById,
  toggleOpen,
}: {
  node: DashboardMenuNode;
  depth: number;
  pathname: string;
  sidebarExpanded: boolean;
  openById: Record<string, boolean>;
  toggleOpen: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = openById[node.id] ?? false;
  const normPath = normalizePath(pathname);
  const normUrl = normalizePath(node.url);
  const leafActive = !hasChildren && normUrl === normPath;
  const branchActive = hasChildren && isNodeOrDescendantPathActive(node, pathname);

  const paddingClass = depth === 0 ? "" : depth === 1 ? "" : "ml-1 mt-0.5 space-y-0.5";
  const linkSize = depth >= 2 ? " text-xs" : "";

  if (!hasChildren) {
    return (
      <ProtectedLink
        href={node.url}
        className={`${
          depth === 0 ? "sidebar-menu-item" : "sidebar-submenu-item"
        }${linkSize} ${leafActive ? "active" : ""}`}
        aria-label={node.name}
        title={node.name}
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
      ? `sidebar-menu-item w-full justify-between${branchActive ? " active" : ""}`
      : `sidebar-submenu-item w-full justify-between${branchActive ? " active" : ""}${linkSize}`;

  return (
    <div className={paddingClass}>
      <button
        type="button"
        className={buttonClass}
        onClick={() => toggleOpen(node.id)}
        aria-expanded={isOpen}
        aria-label={node.name}
        title={node.name}
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

  const groupedMenus = useMemo(
    () => groupDashboardMenus(visibleMenus),
    [visibleMenus],
  );

  if (visibleMenus.length === 0) {
    return null;
  }

  return (
    <>
      {groupedMenus.dashboard.map((node) => (
        <MenuBranch
          key={node.id}
          node={node}
          depth={0}
          pathname={pathname}
          sidebarExpanded={sidebarExpanded}
          openById={effectiveOpenById}
          toggleOpen={toggleOpen}
        />
      ))}
      {sidebarExpanded && groupedMenus.ruwang.length > 0 ? (
        <SidebarContextLabel
          title="Ruwang Arsip"
          description="Arsip dan operasional internal BPRS."
        />
      ) : null}
      {groupedMenus.ruwang.map((node) => (
        <MenuBranch
          key={node.id}
          node={node}
          depth={0}
          pathname={pathname}
          sidebarExpanded={sidebarExpanded}
          openById={effectiveOpenById}
          toggleOpen={toggleOpen}
        />
      ))}
      {sidebarExpanded && groupedMenus.seputarJaminan.length > 0 ? (
        <SidebarContextLabel
          title="Seputar Jaminan"
          description="Siapkan katalog aset untuk masyarakat."
        />
      ) : null}
      {groupedMenus.seputarJaminan.map((node) => (
        <MenuBranch
          key={node.id}
          node={node}
          depth={0}
          pathname={pathname}
          sidebarExpanded={sidebarExpanded}
          openById={effectiveOpenById}
          toggleOpen={toggleOpen}
        />
      ))}
    </>
  );
}
