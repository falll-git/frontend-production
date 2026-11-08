import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const load = createRequire(import.meta.url);
const { SourceMapConsumer } = load("source-map-js");
const flatMap = () => ({
  version: 3,
  sources: ["fixture.js"],
  sourcesContent: ["a"],
  names: [],
  mappings: "AAAA",
});
const indexedMap = (line, column = 0, map = flatMap()) => ({
  version: 3,
  sections: [{ offset: { line, column }, map }],
});

test("image dan source-map dependency memakai versi perbaikan terpin", () => {
  const manifest = load("../package.json");
  assert.equal(manifest.overrides.sharp, "0.35.5");
  assert.equal(manifest.overrides["source-map-js"], "1.2.2");
  assert.equal(load("sharp").versions.sharp, "0.35.5");
  assert.equal(load("source-map-js/package.json").version, "1.2.2");
  const nextLoad = createRequire(load.resolve("next/package.json"));
  const postcssLoad = createRequire(load.resolve("postcss/package.json"));
  assert.equal(nextLoad("sharp").versions.sharp, "0.35.5");
  assert.equal(postcssLoad("source-map-js/package.json").version, "1.2.2");
});

// GHSA-68fv-2mgg-jv7q: reject amplification before serializing an indexed map.
test("indexed source-map menolak offset tidak sah tanpa serialisasi berbahaya", () => {
  for (const value of [-1, 0.5, NaN, Infinity, "1", null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new SourceMapConsumer(indexedMap(value)), /non-negative integers/);
    assert.throws(() => new SourceMapConsumer(indexedMap(0, value)), /non-negative integers/);
  }
  assert.throws(() => new SourceMapConsumer(indexedMap(10_000_001)), /must not exceed/);
  assert.throws(
    () => new SourceMapConsumer(indexedMap(6_000_000, 0, indexedMap(6_000_000))),
    /including offsets of nested sections/,
  );
});

test("indexed source-map sah tetap memetakan versi sumber dengan benar", () => {
  const consumer = new SourceMapConsumer(indexedMap(2, 0, indexedMap(3)));
  const mappings = [];
  consumer.eachMapping((mapping) => mappings.push(mapping.generatedLine));
  assert.deepEqual(mappings, [6]);
  assert.deepEqual(consumer.sources, ["fixture.js"]);
});

test("sharp tetap dapat membuat PNG dengan binary dependency yang diperbarui", async () => {
  const sharp = load("sharp");
  const image = await sharp({
    create: { width: 1, height: 1, channels: 4, background: "#157ec3" },
  }).png().toBuffer();
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1);
  assert.equal(metadata.height, 1);
});
