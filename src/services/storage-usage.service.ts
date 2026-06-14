import api from "@/lib/axios";
import {
  extractRecord,
  isRecord,
  readBoolean,
  readNumber,
  readString,
} from "@/services/api.utils";
import type {
  StorageUsageBilling,
  StorageUsageBillingTier,
  StorageUsageBreakdownItem,
  StorageUsageConfig,
  StorageUsageDashboardData,
  StorageUsagePricingTier,
  StorageUsageStatusKey,
  StorageUsageSummary,
  StorageUsageTrendPoint,
} from "@/types/storage-usage.types";

type UnknownRecord = Record<string, unknown>;

const DEFAULT_PRICING_TIERS: StorageUsagePricingTier[] = [
  {
    from_gb: 0,
    to_gb: 100,
    price_per_gb: 0,
    label: "0-100 GB",
    description: "Gratis",
  },
  {
    from_gb: 100,
    to_gb: 500,
    price_per_gb: 200,
    label: "100-500 GB",
    description: "Rp 200/GB/bulan",
  },
  {
    from_gb: 500,
    to_gb: 1000,
    price_per_gb: 150,
    label: "500-1000 GB",
    description: "Rp 150/GB/bulan",
  },
];

function readStatusKey(record: UnknownRecord): StorageUsageStatusKey {
  const value = readString(record, "status_key", "statusKey");
  if (value === "NEAR_LIMIT" || value === "OVER_LIMIT") return value;
  return "SAFE";
}

function mapConfig(value: unknown): StorageUsageConfig {
  const record = isRecord(value) ? value : {};
  const pricingTiers = Array.isArray(record.pricing_tiers)
    ? record.pricing_tiers.map(mapPricingTier).filter(isPricingTier)
    : [];

  return {
    free_quota_gb: readNumber(record, "free_quota_gb", "freeQuotaGb") ?? 0,
    free_quota_bytes:
      readNumber(record, "free_quota_bytes", "freeQuotaBytes") ?? 0,
    overage_price_per_gb:
      readNumber(record, "overage_price_per_gb", "overagePricePerGb") ??
      0,
    currency: readString(record, "currency") ?? "IDR",
    billing_model: readString(record, "billing_model", "billingModel") ?? "TIERED",
    pricing_tiers: pricingTiers.length > 0 ? pricingTiers : DEFAULT_PRICING_TIERS,
    manual_review_threshold_gb:
      readNumber(
        record,
        "manual_review_threshold_gb",
        "manualReviewThresholdGb",
      ) ?? 1000,
  };
}

function mapUsage(value: unknown): StorageUsageSummary {
  const record = isRecord(value) ? value : {};

  return {
    used_bytes: readNumber(record, "used_bytes", "usedBytes") ?? 0,
    used_gb: readNumber(record, "used_gb", "usedGb") ?? 0,
    used_percentage:
      readNumber(record, "used_percentage", "usedPercentage") ?? 0,
    remaining_bytes:
      readNumber(record, "remaining_bytes", "remainingBytes") ?? 0,
    remaining_gb: readNumber(record, "remaining_gb", "remainingGb") ?? 0,
    overage_bytes: readNumber(record, "overage_bytes", "overageBytes") ?? 0,
    overage_gb: readNumber(record, "overage_gb", "overageGb") ?? 0,
    estimated_overage_cost:
      readNumber(
        record,
        "estimated_overage_cost",
        "estimatedOverageCost",
      ) ?? 0,
    billable_gb: readNumber(record, "billable_gb", "billableGb") ?? 0,
    manual_review_required: readBoolean(
      record,
      "manual_review_required",
      "manualReviewRequired",
    ),
    unpriced_gb: readNumber(record, "unpriced_gb", "unpricedGb") ?? 0,
    file_count: readNumber(record, "file_count", "fileCount") ?? 0,
    status_key: readStatusKey(record),
    status_label: readString(record, "status_label", "statusLabel") ?? "Aman",
  };
}

function mapPricingTier(value: unknown): StorageUsagePricingTier | null {
  if (!isRecord(value)) return null;

  const fromGb = readNumber(value, "from_gb", "fromGb");
  const toValue = value.to_gb ?? value.toGb;
  const toGb =
    toValue === null
      ? null
      : readNumber(value, "to_gb", "toGb");
  const pricePerGb = readNumber(value, "price_per_gb", "pricePerGb");
  if (fromGb === null || pricePerGb === null) return null;

  return {
    from_gb: fromGb,
    to_gb: toGb,
    price_per_gb: pricePerGb,
    label: readString(value, "label") ?? `${fromGb}-${toGb ?? ""} GB`,
    description: readString(value, "description") ?? "",
  };
}

function isPricingTier(value: StorageUsagePricingTier | null): value is StorageUsagePricingTier {
  return value !== null;
}

function mapBillingTier(value: unknown): StorageUsageBillingTier | null {
  const tier = mapPricingTier(value);
  if (!tier || !isRecord(value)) return null;

  return {
    ...tier,
    used_gb: readNumber(value, "used_gb", "usedGb") ?? 0,
    billable_gb: readNumber(value, "billable_gb", "billableGb") ?? 0,
    cost: readNumber(value, "cost") ?? 0,
  };
}

function isBillingTier(value: StorageUsageBillingTier | null): value is StorageUsageBillingTier {
  return value !== null;
}

function mapBilling(value: unknown, config: StorageUsageConfig, usage: StorageUsageSummary): StorageUsageBilling {
  const record = isRecord(value) ? value : {};
  const breakdown = Array.isArray(record.tier_breakdown)
    ? record.tier_breakdown.map(mapBillingTier).filter(isBillingTier)
    : [];

  return {
    billing_model:
      readString(record, "billing_model", "billingModel") ?? config.billing_model,
    free_quota_gb:
      readNumber(record, "free_quota_gb", "freeQuotaGb") ?? config.free_quota_gb,
    billable_gb:
      readNumber(record, "billable_gb", "billableGb") ?? usage.billable_gb,
    priced_usage_gb:
      readNumber(record, "priced_usage_gb", "pricedUsageGb") ?? usage.used_gb,
    unpriced_gb:
      readNumber(record, "unpriced_gb", "unpricedGb") ?? usage.unpriced_gb,
    manual_review_threshold_gb:
      readNumber(
        record,
        "manual_review_threshold_gb",
        "manualReviewThresholdGb",
      ) ?? config.manual_review_threshold_gb,
    manual_review_required: readBoolean(
      record,
      "manual_review_required",
      "manualReviewRequired",
    ) || usage.manual_review_required,
    estimated_cost:
      readNumber(record, "estimated_cost", "estimatedCost") ??
      usage.estimated_overage_cost,
    tier_breakdown: breakdown,
  };
}

function mapBreakdownItem(value: unknown): StorageUsageBreakdownItem | null {
  if (!isRecord(value)) return null;

  const moduleKey = readString(value, "module_key", "moduleKey");
  const moduleLabel = readString(value, "module_label", "moduleLabel");
  if (!moduleKey || !moduleLabel) return null;

  return {
    module_key: moduleKey,
    module_label: moduleLabel,
    used_bytes: readNumber(value, "used_bytes", "usedBytes") ?? 0,
    used_gb: readNumber(value, "used_gb", "usedGb") ?? 0,
    file_count: readNumber(value, "file_count", "fileCount") ?? 0,
    percentage_of_total:
      readNumber(value, "percentage_of_total", "percentageOfTotal") ?? 0,
  };
}

function mapTrendPoint(value: unknown): StorageUsageTrendPoint | null {
  if (!isRecord(value)) return null;

  const date = readString(value, "date");
  const label = readString(value, "label") ?? date;
  if (!date || !label) return null;

  return {
    date,
    label,
    used_bytes: readNumber(value, "used_bytes", "usedBytes") ?? 0,
    used_gb: readNumber(value, "used_gb", "usedGb") ?? 0,
    file_count: readNumber(value, "file_count", "fileCount") ?? 0,
    delta_bytes: readNumber(value, "delta_bytes", "deltaBytes") ?? 0,
    delta_gb: readNumber(value, "delta_gb", "deltaGb") ?? 0,
    limit_gb: readNumber(value, "limit_gb", "limitGb") ?? 0,
    is_estimated: readBoolean(value, "is_estimated", "isEstimated"),
  };
}

function mapStorageUsageDashboardData(
  record: UnknownRecord | null,
): StorageUsageDashboardData {
  const data = record ?? {};
  const config = mapConfig(data.config);
  const usage = mapUsage(data.usage);

  return {
    config,
    usage,
    breakdown: Array.isArray(data.breakdown)
      ? data.breakdown
          .map(mapBreakdownItem)
          .filter((item): item is StorageUsageBreakdownItem => item !== null)
      : [],
    trend: Array.isArray(data.trend)
      ? data.trend
          .map(mapTrendPoint)
          .filter((item): item is StorageUsageTrendPoint => item !== null)
      : [],
    billing: mapBilling(data.billing, config, usage),
    updated_at: readString(data, "updated_at", "updatedAt") ?? "",
  };
}

export const storageUsageService = {
  getSummary: async (days = 7): Promise<StorageUsageDashboardData> => {
    const res = await api.get("/storage-usage/summary", {
      params: {
        days,
      },
    });
    return mapStorageUsageDashboardData(extractRecord(res.data));
  },
};
