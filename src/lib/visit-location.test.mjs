import assert from "node:assert/strict";
import test from "node:test";

import {
  areVisitLocationSamplesConsistent,
  buildGoogleMapsUrl,
  formatVisitAccuracy,
  formatVisitCoordinate,
  getVisitLocationAccuracyLevel,
  getVisitLocationVerificationStep,
  hasValidVisitLocation,
  isAcceptableVisitLocationAccuracy,
  isLikelyGpsCapableMobileDevice,
  isValidVisitLatitude,
  isValidVisitLongitude,
  normalizeVisitLocationSample,
  selectBestVisitLocationSample,
  visitLocationDistanceMeters,
} from "./visit-location.ts";

test("lokasi baru wajib dibuka di Maps lalu dikonfirmasi", () => {
  assert.equal(getVisitLocationVerificationStep({}), "not-required");
  assert.equal(
    getVisitLocationVerificationStep({
      visit_location_captured_in_session: true,
    }),
    "open-maps",
  );
  assert.equal(
    getVisitLocationVerificationStep({
      visit_location_captured_in_session: true,
      visit_location_maps_opened_in_session: true,
    }),
    "confirm",
  );
  assert.equal(
    getVisitLocationVerificationStep({
      visit_location_captured_in_session: true,
      visit_location_maps_opened_in_session: true,
      visit_location_confirmed_in_session: true,
    }),
    "verified",
  );
});

test("validasi koordinat menerima batas dan menolak nilai di luar rentang", () => {
  assert.equal(isValidVisitLatitude(-90), true);
  assert.equal(isValidVisitLatitude(90), true);
  assert.equal(isValidVisitLatitude(-90.000001), false);
  assert.equal(isValidVisitLatitude(90.000001), false);
  assert.equal(isValidVisitLongitude(-180), true);
  assert.equal(isValidVisitLongitude(180), true);
  assert.equal(isValidVisitLongitude(-180.000001), false);
  assert.equal(isValidVisitLongitude(180.000001), false);
});

test("lokasi hanya valid jika latitude dan longitude tersedia berpasangan", () => {
  assert.equal(
    hasValidVisitLocation({
      visit_latitude: -6.2,
      visit_longitude: 106.816667,
    }),
    true,
  );
  assert.equal(
    hasValidVisitLocation({
      visit_latitude: -6.2,
      visit_longitude: null,
    }),
    false,
  );
  assert.equal(
    hasValidVisitLocation({
      visit_latitude: null,
      visit_longitude: null,
    }),
    false,
  );
});

test("pengambilan geotag lapangan hanya dilanjutkan pada perangkat mobile atau tablet", () => {
  assert.equal(
    isLikelyGpsCapableMobileDevice({
      userAgentDataMobile: true,
      userAgent: "Chrome",
    }),
    true,
  );
  assert.equal(
    isLikelyGpsCapableMobileDevice({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile)",
    }),
    true,
  );
  assert.equal(
    isLikelyGpsCapableMobileDevice({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      maxTouchPoints: 0,
      coarsePointer: false,
    }),
    false,
  );
  assert.equal(
    isLikelyGpsCapableMobileDevice({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      maxTouchPoints: 5,
      coarsePointer: true,
    }),
    true,
  );
});

test("kualitas akurasi lokasi dibatasi maksimal 100 meter", () => {
  assert.equal(getVisitLocationAccuracyLevel(12), "PRECISE");
  assert.equal(getVisitLocationAccuracyLevel(75), "ACCEPTABLE");
  assert.equal(getVisitLocationAccuracyLevel(101), "LOW");
  assert.equal(getVisitLocationAccuracyLevel(null), "UNKNOWN");
  assert.equal(isAcceptableVisitLocationAccuracy(100), true);
  assert.equal(isAcceptableVisitLocationAccuracy(100.1), false);
});

test("sampel lokasi wajib segar dan sampel terbaik dipilih dari akurasi terkecil", () => {
  const now = Date.parse("2026-07-16T10:00:00.000Z");
  const first = normalizeVisitLocationSample(
    {
      latitude: -8.1335,
      longitude: 113.2248,
      accuracy: 42,
      timestamp: now - 2_000,
    },
    now,
  );
  const second = normalizeVisitLocationSample(
    {
      latitude: -8.13351,
      longitude: 113.22481,
      accuracy: 18,
      timestamp: now - 1_000,
    },
    now,
  );

  assert.ok(first);
  assert.ok(second);
  assert.equal(
    normalizeVisitLocationSample(
      {
        latitude: -8.1335,
        longitude: 113.2248,
        accuracy: 8,
        timestamp: now - 31_000,
      },
      now,
    ),
    null,
  );
  assert.deepEqual(selectBestVisitLocationSample([first, second]), second);
});

test("sampel GPS yang terpencar jauh ditolak sebagai lokasi tidak stabil", () => {
  const lumajang = {
    latitude: -8.1335,
    longitude: 113.2248,
    accuracy: 20,
    timestamp: 1,
  };
  const lumajangNearby = {
    latitude: -8.13355,
    longitude: 113.22485,
    accuracy: 24,
    timestamp: 2,
  };
  const surabaya = {
    latitude: -7.2575,
    longitude: 112.7521,
    accuracy: 20,
    timestamp: 3,
  };

  assert.ok(visitLocationDistanceMeters(lumajang, lumajangNearby) < 100);
  assert.ok(visitLocationDistanceMeters(lumajang, surabaya) > 100_000);
  assert.equal(
    areVisitLocationSamplesConsistent([lumajang, lumajangNearby]),
    true,
  );
  assert.equal(
    areVisitLocationSamplesConsistent([lumajang, surabaya]),
    false,
  );
});

test("URL Google Maps dibentuk hanya untuk pasangan koordinat valid", () => {
  assert.equal(
    buildGoogleMapsUrl(-6.2, 106.816667),
    "https://www.google.com/maps?q=-6.2,106.816667",
  );
  assert.equal(buildGoogleMapsUrl(-6.2, null), null);
  assert.equal(buildGoogleMapsUrl(91, 106.816667), null);
});

test("formatter aman untuk data legacy dan akurasi tidak valid", () => {
  assert.equal(formatVisitCoordinate(null), "-");
  assert.equal(formatVisitCoordinate(-6.2), "-6.200000");
  assert.equal(formatVisitAccuracy(null), "-");
  assert.equal(formatVisitAccuracy(-1), "-");
  assert.match(formatVisitAccuracy(6.25), /^6[,.]3 meter$/);
});
