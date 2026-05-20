export type MenuPermissionMap = {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type MenuFeatureOption = {
  key: string;
  label: string;
};

export type DashboardMenuType = "NAVIGATION" | "DASHBOARD_WIDGET" | string;
export type DashboardMenuPlacement = "SIDEBAR" | "DASHBOARD" | string;

export type DashboardWidgetRolePermissions = MenuPermissionMap & {
  features: string[];
};

export interface DashboardMenuNode {
  id: string;
  name: string;
  parent_id: string | null;
  parent: string | null;
  icon?: string;
  url: string;
  order: number;
  menu_type: DashboardMenuType;
  placement: DashboardMenuPlacement;
  render_in_sidebar: boolean;
  component_key?: string | null;
  allowed_capabilities?: string[];
  allowed_permissions?: MenuPermissionMap;
  allowed_features?: string[];
  allowed_feature_options?: MenuFeatureOption[];
  role_permissions?: DashboardWidgetRolePermissions;
  children: DashboardMenuNode[];
}

export interface RoleMenuPermission {
  id: string;
  role_id: string;
  menu_id: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  features: string[];
  role_name?: string;
  menu_name?: string;
  menu_url?: string;
}
