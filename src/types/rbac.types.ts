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

export interface DashboardMenuNode {
  id: string;
  name: string;
  parent_id: string | null;
  parent: string | null;
  icon?: string;
  url: string;
  order: number;
  allowed_capabilities?: string[];
  allowed_permissions?: MenuPermissionMap;
  allowed_features?: string[];
  allowed_feature_options?: MenuFeatureOption[];
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
