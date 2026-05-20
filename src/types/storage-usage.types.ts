export type StorageUsageStatusKey = "SAFE" | "NEAR_LIMIT" | "OVER_LIMIT";

export interface StorageUsageConfig {
  free_quota_gb: number;
  free_quota_bytes: number;
  overage_price_per_gb: number;
  currency: string;
}

export interface StorageUsageSummary {
  used_bytes: number;
  used_gb: number;
  used_percentage: number;
  remaining_bytes: number;
  remaining_gb: number;
  overage_bytes: number;
  overage_gb: number;
  estimated_overage_cost: number;
  file_count: number;
  status_key: StorageUsageStatusKey;
  status_label: string;
}

export interface StorageUsageBreakdownItem {
  module_key: string;
  module_label: string;
  used_bytes: number;
  used_gb: number;
  file_count: number;
  percentage_of_total: number;
}

export interface StorageUsageTrendPoint {
  date: string;
  label: string;
  used_bytes: number;
  used_gb: number;
  limit_gb: number;
}

export interface StorageUsageDashboardData {
  config: StorageUsageConfig;
  usage: StorageUsageSummary;
  breakdown: StorageUsageBreakdownItem[];
  trend: StorageUsageTrendPoint[];
  updated_at: string;
}
