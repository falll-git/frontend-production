import api from "@/lib/axios";
import { extractRecord, isRecord, readNumber, readString } from "@/services/api.utils";
import type {
  StorageUsageBreakdownItem,
  StorageUsageConfig,
  StorageUsageDashboardData,
  StorageUsageStatusKey,
  StorageUsageSummary,
  StorageUsageTrendPoint,
} from "@/types/storage-usage.types";

type UnknownRecord = Record<string, unknown>;

function readStatusKey(record: UnknownRecord): StorageUsageStatusKey {
  const value = readString(record, "status_key", "statusKey");
  if (value === "NEAR_LIMIT" || value === "OVER_LIMIT") return value;
  return "SAFE";
}

function mapConfig(value: unknown): StorageUsageConfig {
  const record = isRecord(value) ? value : {};

  return {
    free_quota_gb: readNumber(record, "free_quota_gb", "freeQuotaGb") ?? 0,
    free_quota_bytes:
      readNumber(record, "free_quota_bytes", "freeQuotaBytes") ?? 0,
    overage_price_per_gb:
      readNumber(record, "overage_price_per_gb", "overagePricePerGb") ??
      0,
    currency: readString(record, "currency") ?? "USD",
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
    file_count: readNumber(record, "file_count", "fileCount") ?? 0,
    status_key: readStatusKey(record),
    status_label: readString(record, "status_label", "statusLabel") ?? "Aman",
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
    limit_gb: readNumber(value, "limit_gb", "limitGb") ?? 0,
  };
}

function mapStorageUsageDashboardData(
  record: UnknownRecord | null,
): StorageUsageDashboardData {
  const data = record ?? {};

  return {
    config: mapConfig(data.config),
    usage: mapUsage(data.usage),
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
