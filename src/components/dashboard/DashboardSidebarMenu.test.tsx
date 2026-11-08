import { describe, expect, it } from "vitest";

import {
  clearRuntimeRbacData,
  filterMenuTreeForRoleRead,
  getDashboardRouteDecision,
  hasDashboardCapability,
  hasDashboardFeature,
  setRuntimeRbacData,
} from "@/lib/rbac";
import type { DashboardMenuNode, RoleMenuPermission } from "@/types/rbac.types";
import { groupDashboardMenus } from "./DashboardSidebarMenu";

function menu(
  id: string,
  name: string,
  url: string,
  order: number,
): DashboardMenuNode {
  return {
    id,
    name,
    parent_id: null,
    parent: null,
    url,
    order,
    menu_type: "NAVIGATION",
    placement: "SIDEBAR",
    render_in_sidebar: true,
    children: [],
  };
}

describe("groupDashboardMenus", () => {
  it("keeps Dashboard first and Seputar Jaminan in its final dedicated group", () => {
    const seputarJaminan = menu("sj", "Seputar Jaminan", "/dashboard/seputar-jaminan", 5);
    seputarJaminan.children = [
      {
        ...menu("sj-profile", "Profil BPRS", "/dashboard/seputar-jaminan/profil", 1),
        parent_id: seputarJaminan.id,
        parent: seputarJaminan.name,
      },
    ];
    const result = groupDashboardMenus([
      menu("parameter", "Parameter", "/dashboard/parameters", 90),
      seputarJaminan,
      menu("dashboard", "Dashboard", "/dashboard", 1),
      menu("arsip", "Arsip Digital", "/dashboard/archives", 2),
    ]);

    expect(result.dashboard.map((item) => item.name)).toEqual(["Dashboard"]);
    expect(result.ruwang.map((item) => item.name)).toEqual([
      "Arsip Digital",
      "Parameter",
    ]);
    expect(result.seputarJaminan.map((item) => item.name)).toEqual([
      "Seputar Jaminan",
    ]);

    const allIds = [
      ...result.dashboard,
      ...result.ruwang,
      ...result.seputarJaminan,
    ].map((item) => item.id);

    expect(allIds).toEqual(["dashboard", "arsip", "parameter", "sj"]);
  });

  it("removes technical navigation without granting submission privileges to monitoring-only roles", () => {
    const parent = menu("sj", "Seputar Jaminan", "/dashboard/seputar-jaminan", 6);
    const summary = {
      ...menu("sj-summary", "Ringkasan", "/dashboard/seputar-jaminan/ringkasan", 1),
      parent_id: parent.id,
      parent: parent.name,
    };
    const profile = {
      ...menu("sj-profile", "Profil BPRS", "/dashboard/seputar-jaminan/profil", 2),
      parent_id: parent.id,
      parent: parent.name,
    };
    parent.children = [summary, profile];

    const permission = (canRead: boolean): RoleMenuPermission => ({
      id: "permission-summary",
      role_id: "role-bank",
      menu_id: summary.id,
      can_create: false,
      can_read: canRead,
      can_update: false,
      can_delete: false,
      features: [],
      role_name: "Admin",
      menu_name: summary.name,
      menu_url: summary.url,
    });

    setRuntimeRbacData({ menus: [parent], roleMenus: [permission(true)] });
    const summaryOnly = filterMenuTreeForRoleRead("role-bank", [parent]);
    expect(groupDashboardMenus(summaryOnly).seputarJaminan).toEqual([]);
    expect(getDashboardRouteDecision("/dashboard/seputar-jaminan/pengajuan", "Admin", "role-bank").allowed).toBe(false);
    expect(getDashboardRouteDecision("/dashboard/seputar-jaminan/pengajuan?view=pengiriman", "Admin", "role-bank").allowed).toBe(false);
    expect(getDashboardRouteDecision("/dashboard/seputar-jaminan", "Admin", "role-bank").allowed).toBe(false);
    expect(hasDashboardCapability("/dashboard/seputar-jaminan/pengajuan", "Admin", "role-bank", "read")).toBe(false);
    expect(hasDashboardCapability("/dashboard/seputar-jaminan/pengajuan", "Admin", "role-bank", "update")).toBe(false);
    expect(hasDashboardFeature("/dashboard/seputar-jaminan/pengajuan", "Admin", "role-bank", "sj_review")).toBe(false);
    expect(parent.children[0].name).toBe("Ringkasan");

    const profilePermission: RoleMenuPermission = {
      ...permission(true),
      id: "permission-profile",
      menu_id: profile.id,
      menu_name: profile.name,
      menu_url: profile.url,
    };
    setRuntimeRbacData({ menus: [parent], roleMenus: [permission(true), profilePermission] });
    const readable = filterMenuTreeForRoleRead("role-bank", [parent]);
    const visible = groupDashboardMenus(readable).seputarJaminan;
    expect(visible).toHaveLength(1);
    expect(visible[0]?.children.map((child) => child.name)).toEqual(["Profil BPRS"]);
    const submissions = { ...menu("sj-submissions", "Pengajuan", "/dashboard/seputar-jaminan/pengajuan", 5), parent_id: parent.id };
    const combined = groupDashboardMenus([{ ...parent, children: [summary, profile, submissions] }]).seputarJaminan[0];
    expect(combined.children.map(child => child.name)).toEqual(["Profil BPRS", "Pengajuan"]);
    expect(getDashboardRouteDecision("/dashboard/unknown-module", "Admin", "role-bank").allowed).toBe(false);
    setRuntimeRbacData({menus:[parent],roleMenus:[permission(false),profilePermission]});
    expect(groupDashboardMenus(filterMenuTreeForRoleRead("role-bank",[parent])).seputarJaminan[0]?.children.map(child=>child.name)).toEqual(["Profil BPRS"]);
    clearRuntimeRbacData();
  });

  it("maps legacy Seputar Jaminan URLs to the matching child permission", () => {
    const parent = menu("sj", "Seputar Jaminan", "/dashboard/seputar-jaminan", 6);
    const publications = {
      ...menu("sj-publications", "Daftar Publikasi", "/dashboard/seputar-jaminan/publikasi", 4),
      parent_id: parent.id,
      parent: parent.name,
    };
    parent.children = [publications];
    const roleMenus: RoleMenuPermission[] = [{
      id: "permission-publications",
      role_id: "role-bank",
      menu_id: publications.id,
      can_create: false,
      can_read: true,
      can_update: false,
      can_delete: false,
      features: [],
      role_name: "Admin",
      menu_name: publications.name,
      menu_url: publications.url,
    }];

    setRuntimeRbacData({ menus: [parent], roleMenus });
    expect(getDashboardRouteDecision("/dashboard/seputar-jaminan", "Admin", "role-bank").allowed).toBe(true);
    expect(getDashboardRouteDecision("/dashboard/seputar-jaminan", null, null).allowed).toBe(false);
    expect(
      getDashboardRouteDecision(
        "/dashboard/seputar-jaminan/katalog",
        "Admin",
        "role-bank",
      ).allowed,
    ).toBe(true);
    clearRuntimeRbacData();
  });
});
