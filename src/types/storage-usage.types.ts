export type StorageUsageStatusKey = "SAFE" | "NEAR_LIMIT" | "OVER_LIMIT";

export interface StorageUsageConfig {
  free_quota_gb: number;
  free_quota_bytes: number;
  overage_price_per_gb: number;
  currency: string;
  billing_model: string;
  pricing_tiers: StorageUsagePricingTier[];
  manual_review_threshold_gb: number;
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
  billable_gb: number;
  manual_review_required: boolean;
  unpriced_gb: number;
  file_count: number;
  status_key: StorageUsageStatusKey;
  status_label: string;
}

export interface StorageUsagePricingTier {
  from_gb: number;
  to_gb: number | null;
  price_per_gb: number;
  label: string;
  description: string;
}

export interface StorageUsageBillingTier extends StorageUsagePricingTier {
  used_gb: number;
  billable_gb: number;
  cost: number;
}

export interface StorageUsageBilling {
  billing_model: string;
  free_quota_gb: number;
  billable_gb: number;
  priced_usage_gb: number;
  unpriced_gb: number;
  manual_review_threshold_gb: number;
  manual_review_required: boolean;
  estimated_cost: number;
  tier_breakdown: StorageUsageBillingTier[];
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
  billing: StorageUsageBilling;
  updated_at: string;
}
