import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGoogleMapsUrl,
  formatVisitAccuracy,
  formatVisitCoordinate,
  hasValidVisitLocation,
  isValidVisitLatitude,
  isValidVisitLongitude,
} from "./visit-location.ts";

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
