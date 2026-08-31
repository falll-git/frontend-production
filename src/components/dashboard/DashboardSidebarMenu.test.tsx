import { describe, expect, it } from "vitest";

import type { DashboardMenuNode } from "@/types/rbac.types";
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
    const result = groupDashboardMenus([
      menu("parameter", "Parameter", "/dashboard/parameters", 90),
      menu("sj", "Seputar Jaminan", "/dashboard/seputar-jaminan", 5),
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
});
