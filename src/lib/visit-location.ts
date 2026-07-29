export type VisitCoordinates = {
  visit_latitude: number | null | undefined;
  visit_longitude: number | null | undefined;
};

export const VISIT_LOCATION_PRECISE_ACCURACY_M = 30;
export const VISIT_LOCATION_MAX_ACCURACY_M = 100;
export const VISIT_LOCATION_SAMPLE_MAX_AGE_MS = 30_000;

export type VisitLocationAccuracyLevel =
  | "PRECISE"
  | "ACCEPTABLE"
  | "LOW"
  | "UNKNOWN";

export type VisitLocationSample = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type VisitLocationDeviceSignals = {
  userAgent?: string | null;
  userAgentDataMobile?: boolean | null;
  maxTouchPoints?: number | null;
  coarsePointer?: boolean | null;
};

export type VisitLocationVerificationStep =
  | "not-required"
  | "open-maps"
  | "confirm"
  | "verified";

export type VisitLocationSessionVerification = {
  visit_location_captured_in_session?: boolean;
  visit_location_maps_opened_in_session?: boolean;
  visit_location_confirmed_in_session?: boolean;
};

export function getVisitLocationVerificationStep({
  visit_location_captured_in_session,
  visit_location_maps_opened_in_session,
  visit_location_confirmed_in_session,
}: VisitLocationSessionVerification): VisitLocationVerificationStep {
  if (!visit_location_captured_in_session) return "not-required";
  if (!visit_location_maps_opened_in_session) return "open-maps";
  if (!visit_location_confirmed_in_session) return "confirm";
  return "verified";
}

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

export function isLikelyGpsCapableMobileDevice({
  userAgent,
  userAgentDataMobile,
  maxTouchPoints,
  coarsePointer,
}: VisitLocationDeviceSignals): boolean {
  if (userAgentDataMobile === true) return true;

  const normalizedUserAgent = String(userAgent ?? "");
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(normalizedUserAgent)) {
    return true;
  }

  return Boolean(
    coarsePointer &&
      typeof maxTouchPoints === "number" &&
      Number.isFinite(maxTouchPoints) &&
      maxTouchPoints > 1,
  );
}

export function getVisitLocationAccuracyLevel(
  value: number | null | undefined,
): VisitLocationAccuracyLevel {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "UNKNOWN";
  }
  if (value <= VISIT_LOCATION_PRECISE_ACCURACY_M) return "PRECISE";
  if (value <= VISIT_LOCATION_MAX_ACCURACY_M) return "ACCEPTABLE";
  return "LOW";
}

export function isAcceptableVisitLocationAccuracy(
  value: number | null | undefined,
): value is number {
  const level = getVisitLocationAccuracyLevel(value);
  return level === "PRECISE" || level === "ACCEPTABLE";
}

export function normalizeVisitLocationSample(
  value: Partial<VisitLocationSample>,
  now = Date.now(),
): VisitLocationSample | null {
  const { latitude, longitude, accuracy, timestamp } = value;
  if (
    !isValidVisitLatitude(latitude) ||
    !isValidVisitLongitude(longitude) ||
    typeof accuracy !== "number" ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp) ||
    timestamp > now + 5_000 ||
    now - timestamp > VISIT_LOCATION_SAMPLE_MAX_AGE_MS
  ) {
    return null;
  }

  return { latitude, longitude, accuracy, timestamp };
}

export function visitLocationDistanceMeters(
  first: Pick<VisitLocationSample, "latitude" | "longitude">,
  second: Pick<VisitLocationSample, "latitude" | "longitude">,
): number {
  const earthRadiusM = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function selectBestVisitLocationSample(
  samples: VisitLocationSample[],
): VisitLocationSample | null {
  return (
    [...samples].sort(
      (first, second) =>
        first.accuracy - second.accuracy ||
        second.timestamp - first.timestamp,
    )[0] ?? null
  );
}

export function areVisitLocationSamplesConsistent(
  samples: VisitLocationSample[],
): boolean {
  if (samples.length < 2) return true;
  const best = selectBestVisitLocationSample(samples);
  if (!best) return false;

  return samples.every((sample) => {
    const tolerance = Math.max(
      VISIT_LOCATION_MAX_ACCURACY_M,
      best.accuracy + sample.accuracy,
    );
    return visitLocationDistanceMeters(best, sample) <= tolerance;
  });
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
