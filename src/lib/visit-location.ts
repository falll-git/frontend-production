export type VisitCoordinates = {
  visit_latitude: number | null | undefined;
  visit_longitude: number | null | undefined;
};

export function isValidVisitLatitude(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidVisitLongitude(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function hasValidVisitLocation({
  visit_latitude,
  visit_longitude,
}: VisitCoordinates): boolean {
  return (
    isValidVisitLatitude(visit_latitude) &&
    isValidVisitLongitude(visit_longitude)
  );
}

export function formatVisitCoordinate(
  value: number | null | undefined,
): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(6)
    : "-";
}

export function formatVisitAccuracy(
  value: number | null | undefined,
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "-";
  }

  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(value)} meter`;
}

export function buildGoogleMapsUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  if (!isValidVisitLatitude(latitude) || !isValidVisitLongitude(longitude)) {
    return null;
  }

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
