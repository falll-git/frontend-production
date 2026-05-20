import { isRecord, readBoolean, readNumber, readString } from "@/services/api.utils";
import type { PhysicalStorageSummary } from "@/types/surat.types";

type UnknownRecord = Record<string, unknown>;

export function mapPhysicalStorage(
  record: unknown,
): PhysicalStorageSummary | null {
  if (!isRecord(record)) return null;

  const id = readString(record, "id");
  const officeCode = readString(record, "office_code", "officeCode");
  const officeName = readString(record, "office_name", "officeName");
  const cabinetCode = readString(record, "cabinet_code", "cabinetCode");
  const rackName = readString(record, "rack_name", "rackName", "name");
  const locationLabel =
    readString(record, "location_label", "locationLabel") ??
    [officeName, cabinetCode && rackName ? `${cabinetCode} (${rackName})` : rackName]
      .filter(Boolean)
      .join(" - ");

  if (!id) return null;

  return {
    id,
    officeId: readString(record, "office_id", "officeId"),
    officeCode,
    officeName,
    cabinetId: readString(record, "cabinet_id", "cabinetId"),
    cabinetCode,
    rackName,
    capacity: readNumber(record, "capacity") ?? 0,
    isActive: readBoolean(record, "is_active", "isActive"),
    locationLabel: locationLabel || rackName || id,
  };
}

export function readPhysicalStorage(
  record: UnknownRecord,
): PhysicalStorageSummary | null {
  return (
    mapPhysicalStorage(record.storage) ??
    mapPhysicalStorage(record.physical_storage)
  );
}

export function readPhysicalStorageLabel(record: UnknownRecord): string {
  const storage = readPhysicalStorage(record);

  return (
    readString(
      record,
      "physical_storage_label",
      "physicalStorageLabel",
      "storage_label",
      "storageLabel",
    ) ??
    storage?.locationLabel ??
    "-"
  );
}
