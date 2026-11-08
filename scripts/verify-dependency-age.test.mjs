import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { setImmediate } from "node:timers/promises";
import {
  MIN_RELEASE_AGE_DAYS, REGISTRY, registryURL, collectLockedPackages,
  validatePublishedVersion, fetchRegistryMetadata, verifyDependencyAge,
} from "./verify-dependency-age.mjs";

// Unit metadata/fetch doubles only. Never use the network, npm, app services or DB.
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempParent = fs.realpathSync.native(os.tmpdir());
const now = Date.parse("2026-10-15T00:00:00.000Z");
const day = 86_400_000;
const maxMetadataBytes = 64 * 1024 * 1024;
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const sri = (bytes, algorithm = "sha512") => `${algorithm}-${crypto.createHash(algorithm).update(bytes).digest("base64")}`;
const forkRelative = "vendor/ruwang-braces-depth-guard-3.0.3-ruwang.depth.1.tgz";
const forkSHA = "c54b6da96080e5af8cac52851af98b229388d8855c59dbbb302c294731c82570";
const packageNode = (name = "age-unit-a", version = "1.0.0") => ({
  version, resolved: `${REGISTRY}/${name}/-/${name.split("/").at(-1)}-${version}.tgz`,
  integrity: sri(Buffer.from(`${name}@${version}`)),
});
const entry = (name = "age-unit-a", version = "1.0.0") => ({
  location: `node_modules/${name}`, name, ...packageNode(name, version), bundledInto: null,
});
function metadata(entries, ageDays = 8) {
  const first = entries[0];
  return { name: first.name, time: Object.fromEntries(entries.map(row => [row.version, new Date(now - ageDays * day).toISOString()])),
    versions: Object.fromEntries(entries.map(row => [row.version, { name: row.name, version: row.version,
      dist: { tarball: row.resolved, integrity: row.integrity } }])) };
}
const simpleLock = (nodes = { "node_modules/age-unit-a": packageNode() }, root = {}) => ({
  lockfileVersion: 3, packages: { "": root, ...nodes },
});

function fixture(t, { nodes, rootLock = {}, manifest = {}, npmrc = "fund=false\nmin-release-age=7\nengine-strict=true\n", fork = false } = {}) {
  const root = fs.mkdtempSync(path.join(tempParent, "ra-dependency-age-unit-"));
  const canonical = fs.realpathSync.native(root);
  assert.equal(path.dirname(canonical), tempParent);
  assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
  const marker = Buffer.from(JSON.stringify({ kind: "owned-dependency-age-unit-v1", id: crypto.randomUUID(), root: canonical, pid: process.pid }));
  const owner = path.join(root, "owner.json");
  fs.writeFileSync(owner, marker, { flag: "wx", mode: 0o600 });
  t.after(() => {
    // Refuse cleanup if the exact fresh run, canonical parent or owner has changed.
    assert.equal(fs.realpathSync.native(root), canonical);
    assert.equal(path.dirname(canonical), tempParent);
    assert.ok(path.basename(canonical).startsWith("ra-dependency-age-unit-"));
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    assert.equal(fs.lstatSync(owner).isSymbolicLink(), false);
    assert.equal(fs.statSync(owner).isFile(), true);
    assert.equal(fs.statSync(owner).nlink, 1);
    assert.deepEqual(fs.readFileSync(owner), marker);
    fs.rmSync(canonical, { recursive: true, force: false });
    assert.equal(fs.existsSync(canonical), false);
  });
  const lock = simpleLock(nodes, rootLock);
  fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify(lock), { flag: "wx" });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "dependency-age-unit", ...manifest }), { flag: "wx" });
  fs.writeFileSync(path.join(root, ".npmrc"), npmrc, { flag: "wx" });
  if (fork) {
    fs.mkdirSync(path.join(root, "vendor"));
    fs.copyFileSync(path.join(project, forkRelative), path.join(root, forkRelative), fs.constants.COPYFILE_EXCL);
  }
  return { root, lock, write: (name, bytes) => {
    assert.ok(["package-lock.json", "package.json", ".npmrc", forkRelative].includes(name));
    fs.writeFileSync(path.join(root, name), bytes);
  } };
}
const verifyUnit = (f, options = {}) => verifyDependencyAge({ root: f.root, now,
  fetchMetadata: async name => metadata(collectLockedPackages(f.lock, { root: f.root }).registry.filter(row => row.name === name)), ...options });

for (const [label, ageDays] of [["older than seven days", 8], ["exactly seven days", 7]]) {
  test(`age accepts ${label}`, () => {
    const value = entry(), result = validatePublishedVersion(value, metadata([value], ageDays), now);
    assert.equal(result.status, "AGE_VERIFIED");
    assert.equal(result.publishedAt, new Date(now - ageDays * day).toISOString());
    assert.equal(MIN_RELEASE_AGE_DAYS, 7);
  });
}
test("age rejects one millisecond inside the seven-day cutoff", () => {
  const value = entry(), remote = metadata([value]);
  remote.time[value.version] = new Date(now - 7 * day + 1).toISOString();
  assert.throws(() => validatePublishedVersion(value, remote, now), /PACKAGE_TOO_RECENT/);
});
for (const [label, releaseTime] of [
  ["future", new Date(now + 1).toISOString()], ["missing", undefined], ["not a date", "yesterday"],
  ["date without timezone", "2026-01-01T00:00:00"], ["invalid calendar day", "2026-02-30T00:00:00.000Z"],
  ["invalid calendar month", "2026-13-01T00:00:00.000Z"], ["invalid hour", "2026-01-01T24:00:00.000Z"],
]) test(`release time rejects ${label}`, () => {
  const value = entry(), remote = metadata([value]); remote.time[value.version] = releaseTime;
  assert.throws(() => validatePublishedVersion(value, remote, now), /MISSING_OR_INVALID_RELEASE_TIME/);
});
test("age rejects a nonfinite comparison clock", () => {
  for (const invalid of [NaN, Infinity, -Infinity]) assert.throws(() => validatePublishedVersion(entry(), metadata([entry()]), invalid), /INVALID_CLOCK/);
});
for (const [label, mutate, error] of [
  ["wrong metadata name", m => { m.name = "other"; }, /INVALID_REGISTRY_METADATA/],
  ["missing time map", m => { delete m.time; }, /INVALID_REGISTRY_METADATA/],
  ["missing versions map", m => { delete m.versions; }, /INVALID_REGISTRY_METADATA/],
  ["missing version", m => { delete m.versions["1.0.0"]; }, /REGISTRY_IDENTITY_MISMATCH/],
  ["wrong release name", m => { m.versions["1.0.0"].name = "other"; }, /REGISTRY_IDENTITY_MISMATCH/],
  ["wrong release version", m => { m.versions["1.0.0"].version = "2.0.0"; }, /REGISTRY_IDENTITY_MISMATCH/],
  ["different tarball", m => { m.versions["1.0.0"].dist.tarball += ".other"; }, /REGISTRY_TARBALL_MISMATCH/],
  ["different integrity", m => { m.versions["1.0.0"].dist.integrity = sri(Buffer.from("other")); }, /REGISTRY_INTEGRITY_MISMATCH/],
  ["missing integrity", m => { delete m.versions["1.0.0"].dist.integrity; }, /REGISTRY_INTEGRITY_MISMATCH/],
]) test(`registry version rejects ${label}`, () => {
  const value = entry(), remote = metadata([value]); mutate(remote);
  assert.throws(() => validatePublishedVersion(value, remote, now), error);
});
test("a weak sha1 match cannot bypass the lock's mismatching sha512", () => {
  const value = entry(), remote = metadata([value]), weak = Buffer.from("weak-algorithm-unit");
  value.integrity += " " + sri(weak, "sha1");
  remote.versions[value.version].dist.integrity = sri(Buffer.from("wrong-strong"));
  remote.versions[value.version].dist.shasum = crypto.createHash("sha1").update(weak).digest("hex");
  assert.throws(() => validatePublishedVersion(value, remote, now), /REGISTRY_INTEGRITY_MISMATCH/);
});
test("sha1-only historical lock can match the exact registry shasum", () => {
  const value = entry(), remote = metadata([value]), bytes = Buffer.from("sha1-only-unit");
  value.integrity = sri(bytes, "sha1"); delete remote.versions[value.version].dist.integrity;
  remote.versions[value.version].dist.shasum = crypto.createHash("sha1").update(bytes).digest("hex");
  assert.equal(validatePublishedVersion(value, remote, now).status, "AGE_VERIFIED");
});
test("unsupported SRI is refused instead of falling back to a matching weak digest", () => {
  const value = entry(), remote = metadata([value]); value.integrity += " md5-YQ==";
  assert.throws(() => validatePublishedVersion(value, remote, now), /REGISTRY_INTEGRITY_MISMATCH/);
});
for (const [label, integrity] of [
  ["short sha512 digest", "sha512-YQ=="], ["short sha384 digest", "sha384-YQ=="],
  ["short sha256 digest", "sha256-YQ=="], ["short sha1 digest", "sha1-YQ=="],
  ["unpadded digest", sri(Buffer.from("unpadded-unit")).replace(/=+$/, "")],
  ["invalid base64 characters", "sha512-!" + Buffer.alloc(64).toString("base64")],
  ["noncanonical base64 pad bits", "sha512-" + Buffer.alloc(64).toString("base64").slice(0, -3) + "B=="],
]) test(`SRI rejects ${label} in both lock and registry`, () => {
  const value = entry(), remote = metadata([value]); value.integrity = integrity;
  remote.versions[value.version].dist.integrity = integrity;
  assert.throws(() => validatePublishedVersion(value, remote, now), /REGISTRY_INTEGRITY_MISMATCH/);
});
test("malformed registry SRI cannot accompany a valid strongest match", () => {
  const value = entry(), remote = metadata([value]); remote.versions[value.version].dist.integrity += " sha1-YQ==";
  assert.throws(() => validatePublishedVersion(value, remote, now), /REGISTRY_INTEGRITY_MISMATCH/);
});
test("every strongest lock SRI must be present in registry metadata", () => {
  const value = entry(), remote = metadata([value]); value.integrity += " " + sri(Buffer.from("second-strong-unit"));
  assert.throws(() => validatePublishedVersion(value, remote, now), /REGISTRY_INTEGRITY_MISMATCH/);
  remote.versions[value.version].dist.integrity = value.integrity;
  assert.equal(validatePublishedVersion(value, remote, now).status, "AGE_VERIFIED");
});
for (const algorithm of ["sha256", "sha384"]) test(`valid ${algorithm} SRI uses its exact canonical digest`, () => {
  const value = entry(), remote = metadata([value]); value.integrity = sri(Buffer.from("unit-algorithm"), algorithm);
  remote.versions[value.version].dist.integrity = value.integrity;
  assert.equal(validatePublishedVersion(value, remote, now).status, "AGE_VERIFIED");
});
for (const [label, url] of [["HTTP", "http://registry.npmjs.org/x"], ["foreign host", "https://example.test/x"],
  ["userinfo", "https://user:pass@registry.npmjs.org/x"], ["query", "https://registry.npmjs.org/x?token=1"],
  ["fragment", "https://registry.npmjs.org/x#fragment"], ["local file", "file:///tmp/x"], ["git source", "git+https://registry.npmjs.org/x"]]) {
  test(`registry source rejects ${label}`, () => {
    assert.throws(() => registryURL(url), /UNSUPPORTED_REGISTRY_SOURCE/);
  });
}
test("registry source accepts the pinned registry and scoped package tarball", () => {
  assert.equal(registryURL("https://registry.npmjs.org/@age/unit/-/unit-1.0.0.tgz"), "https://registry.npmjs.org/@age/unit/-/unit-1.0.0.tgz");
});
test("aliased lock entry binds the real package name, version, tarball and integrity", () => {
  const node = { ...packageNode("real-unit"), name: "real-unit" };
  const [locked] = collectLockedPackages(simpleLock({ "node_modules/unit-alias": node })).registry;
  assert.equal(locked.name, "real-unit");
  assert.equal(validatePublishedVersion(locked, metadata([locked]), now).status, "AGE_VERIFIED");
  const wrong = metadata([locked]); wrong.versions[locked.version].name = "unit-alias";
  assert.throws(() => validatePublishedVersion(locked, wrong, now), /REGISTRY_IDENTITY_MISMATCH/);
});
for (const [label, lock, error] of [
  ["old lock format", { ...simpleLock(), lockfileVersion: 2 }, /INVALID_LOCKFILE/],
  ["missing root", { lockfileVersion: 3, packages: {} }, /INVALID_LOCKFILE/],
  ["linked entry", simpleLock({ "node_modules/age-unit-a": { ...packageNode(), link: true } }), /UNSUPPORTED_LOCK_ENTRY/],
  ["path traversal", simpleLock({ "node_modules/../age-unit-a": packageNode() }), /UNSUPPORTED_LOCK_ENTRY/],
  ["non-package path", simpleLock({ "vendor/age-unit-a": packageNode() }), /UNSUPPORTED_LOCK_ENTRY/],
  ["missing source", simpleLock({ "node_modules/age-unit-a": { version: "1.0.0", integrity: "sha512-YQ==" } }), /UNSUPPORTED_LOCK_ENTRY/],
  ["invalid version", simpleLock({ "node_modules/age-unit-a": { ...packageNode(), version: "latest" } }), /INVALID_LOCK_IDENTITY/],
  ["invalid name", simpleLock({ "node_modules/age-unit-a": { ...packageNode(), name: "Bad Name" } }), /INVALID_LOCK_IDENTITY/],
  ["non-registry source", simpleLock({ "node_modules/age-unit-a": { ...packageNode(), resolved: "https://example.test/a.tgz" } }), /UNSUPPORTED_REGISTRY_SOURCE/],
  ["empty registry graph", simpleLock({}), /EMPTY_REGISTRY_LOCK/],
]) test(`lock rejects ${label}`, () => assert.throws(() => collectLockedPackages(lock), error));
test("bundled dependencies prove their registry ancestor and still verify their own release age", () => {
  const parent = packageNode("bundle-parent"), child = { version: "2.0.0", inBundle: true };
  const result = collectLockedPackages(simpleLock({ "node_modules/bundle-parent": parent,
    "node_modules/bundle-parent/node_modules/bundled-child": child }));
  const bundled = result.registry.find(row => row.name === "bundled-child");
  assert.equal(bundled.bundledInto, "node_modules/bundle-parent");
  assert.equal(validatePublishedVersion(bundled, metadata([bundled]), now).status, "AGE_VERIFIED");
  assert.throws(() => validatePublishedVersion(bundled, metadata([bundled], 1), now), /PACKAGE_TOO_RECENT/);
});
test("unproven bundled parent is refused", () => {
  assert.throws(() => collectLockedPackages(simpleLock({ "node_modules/bundled-child": { version: "1.0.0", inBundle: true } })), /BUNDLED_PARENT_NOT_PROVEN/);
});
test("real local fork and normalized current lock graph are checked read-only without metadata fetch", () => {
  const lockPath = path.join(project, "package-lock.json"), archivePath = path.join(project, forkRelative);
  const before = fs.readFileSync(lockPath), archive = fs.readFileSync(archivePath), lock = JSON.parse(before);
  assert.equal(sha(archive), forkSHA);
  const graph = collectLockedPackages(lock, { root: project });
  assert.ok(graph.registry.length > 0);
  assert.deepEqual(graph.local.map(({ name, version, source, sha256 }) => ({ name, version, source, sha256 })), [{
    name: "@ruwang/braces-depth-guard", version: "3.0.3-ruwang.depth.1", source: "REVIEWED_LOCAL_FORK", sha256: forkSHA,
  }]);
  const forkNode = Object.values(lock.packages).find(node => node.resolved === `file:${forkRelative}`);
  assert.equal(forkNode.integrity, sri(archive));
  const reversed = { ...lock, packages: Object.fromEntries(Object.entries(lock.packages).reverse()) };
  const normalize = value => ({ registry: [...value.registry].sort((a, b) => a.location.localeCompare(b.location)), local: [...value.local].sort((a, b) => a.location.localeCompare(b.location)) });
  assert.deepEqual(normalize(collectLockedPackages(reversed, { root: project })), normalize(graph));
  assert.deepEqual(fs.readFileSync(lockPath), before); assert.deepEqual(fs.readFileSync(archivePath), archive);
});
function forkNode() {
  const archive = fs.readFileSync(path.join(project, forkRelative));
  return { name: "@ruwang/braces-depth-guard", version: "3.0.3-ruwang.depth.1", resolved: `file:${forkRelative}`, integrity: sri(archive) };
}
for (const [label, change, error] of [
  ["unreviewed path", n => { n.resolved = "file:vendor/other.tgz"; }, /UNREVIEWED_LOCAL_DEPENDENCY/],
  ["wrong fork name", n => { n.name = "other-fork"; }, /UNREVIEWED_LOCAL_DEPENDENCY/],
  ["wrong fork version", n => { n.version = "9.0.0"; }, /UNREVIEWED_LOCAL_DEPENDENCY/],
  ["wrong archive SRI", n => { n.integrity = sri(Buffer.from("wrong")); }, /LOCAL_ARTIFACT_LOCK_INTEGRITY_MISMATCH/],
]) test(`local fork rejects ${label}`, t => {
  const local = forkNode(); change(local);
  const f = fixture(t, { nodes: { "node_modules/age-unit-a": packageNode(), "node_modules/braces": local }, fork: true });
  assert.throws(() => collectLockedPackages(f.lock, { root: f.root }), error);
});
test("local fork rejects changed archive bytes in an owned fixture", t => {
  const f = fixture(t, { nodes: { "node_modules/age-unit-a": packageNode(), "node_modules/braces": forkNode() }, fork: true });
  f.write(forkRelative, "owned-unit-tampered-copy");
  assert.throws(() => collectLockedPackages(f.lock, { root: f.root }), /LOCAL_ARTIFACT_CHECKSUM_MISMATCH/);
});

function metadataResponse(chunks = [Buffer.from('{"unit":true}')], { ok = true, declared = null, readError = null } = {}) {
  const observed = { cancel: 0, release: 0, reads: 0, requests: [] };
  let index = 0;
  const reader = { read: async () => { observed.reads++; if (readError) throw readError;
    return index < chunks.length ? { done: false, value: chunks[index++] } : { done: true }; },
  cancel: async () => { observed.cancel++; }, releaseLock: () => { observed.release++; } };
  const response = { ok, body: { getReader: () => reader, cancel: async () => { observed.cancel++; } },
    headers: { get: name => name === "content-length" ? declared : null } };
  const fetchImpl = async (url, options) => { observed.requests.push({ url, options }); return response; };
  return { observed, response, fetchImpl };
}
test("metadata fetch double receives canonical URL, no redirects/credentials and a cancellation signal", async () => {
  const f = metadataResponse(), result = await fetchRegistryMetadata("@age/unit", { fetchImpl: f.fetchImpl });
  assert.deepEqual(result, { unit: true });
  assert.equal(f.observed.requests[0].url, `${REGISTRY}/%40age%2Funit`);
  assert.equal(f.observed.requests[0].options.redirect, "error");
  assert.equal(f.observed.requests[0].options.credentials, "omit");
  assert.equal(f.observed.requests[0].options.headers.accept, "application/json");
  assert.ok(f.observed.requests[0].options.signal instanceof AbortSignal);
  assert.equal(f.observed.release, 1);
});
test("metadata HTTP error and redirect-like non-ok responses fail closed", async () => {
  for (const label of ["400", "401", "404", "429", "500", "301-redirect"]) {
    const f = metadataResponse([], { ok: false });
    await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: f.fetchImpl }), /REGISTRY_METADATA_UNAVAILABLE/, label);
  }
});
test("metadata response without a body is refused", async () => {
  const f = metadataResponse(); f.response.body = null;
  await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: f.fetchImpl }), /REGISTRY_METADATA_UNAVAILABLE/);
});
test("metadata network failure and native redirect refusal are not converted to success", async () => {
  for (const error of [new Error("UNIT_NETWORK_FAILURE"), new TypeError("UNIT_REDIRECT_REFUSED")]) {
    await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: async () => { throw error; } }), value => value === error);
  }
});
test("metadata fetch propagates an already-aborted caller signal", async () => {
  const controller = new AbortController(); controller.abort(new Error("UNIT_ABORT"));
  await assert.rejects(fetchRegistryMetadata("age-unit-a", { signal: controller.signal, fetchImpl: async (_url, options) => {
    assert.equal(options.signal.aborted, true); throw options.signal.reason;
  } }), /UNIT_ABORT/);
});
for (const declared of ["invalid", "-1", String(maxMetadataBytes + 1)]) test(`metadata declared-size ${declared} is refused and cancelled`, async () => {
  const f = metadataResponse([], { declared });
  await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: f.fetchImpl }), /REGISTRY_METADATA_TOO_LARGE/);
  assert.equal(f.observed.cancel, 1); assert.equal(f.observed.reads, 0);
});
test("metadata streamed-size limit is enforced without relying on Content-Length", async () => {
  const f = metadataResponse([new Uint8Array(maxMetadataBytes + 1)]);
  await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: f.fetchImpl }), /REGISTRY_METADATA_TOO_LARGE/);
  assert.equal(f.observed.cancel, 1); assert.equal(f.observed.release, 1);
});
for (const [label, body] of [["invalid JSON", Buffer.from('{"broken":')], ["invalid UTF8 inside otherwise valid JSON", Buffer.concat([Buffer.from('{"v":"'), Buffer.from([0xff]), Buffer.from('"}')])]]) {
  test(`metadata rejects ${label}`, async () => {
    const f = metadataResponse([body]);
    await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: f.fetchImpl }), /INVALID_REGISTRY_JSON/);
    assert.equal(f.observed.cancel, 1); assert.equal(f.observed.release, 1);
  });
}
test("metadata reader failure preserves rejection and releases its lock", async () => {
  const error = new Error("UNIT_READER_FAILURE"), f = metadataResponse([], { readError: error });
  await assert.rejects(fetchRegistryMetadata("age-unit-a", { fetchImpl: f.fetchImpl }), value => value === error);
  assert.equal(f.observed.cancel, 1); assert.equal(f.observed.release, 1);
});
test("invalid metadata package name is refused before fetch", async () => {
  let calls = 0;
  await assert.rejects(fetchRegistryMetadata("../private", { fetchImpl: async () => { calls++; } }), /INVALID_REGISTRY_PACKAGE_NAME/);
  assert.equal(calls, 0);
});

test("owned file fixture verifies a lock without mutation or real registry requests", async t => {
  const f = fixture(t), files = ["package-lock.json", "package.json", ".npmrc"];
  const before = files.map(name => fs.readFileSync(path.join(f.root, name)));
  const result = await verifyUnit(f);
  assert.equal(result.status, "passed"); assert.equal(result.registryLockEntries, 1);
  assert.equal(result.minReleaseAgeDays, 7); assert.equal(result.mutation, false);
  files.forEach((name, index) => assert.deepEqual(fs.readFileSync(path.join(f.root, name)), before[index]));
});
for (const key of ["dependencies", "devDependencies", "optionalDependencies"]) test(`root lock rejects mismatched ${key} before metadata fetch`, async t => {
  const f = fixture(t, { rootLock: { [key]: { "age-unit-a": "1.0.0" } }, manifest: { [key]: { "age-unit-a": "2.0.0" } } });
  let calls = 0;
  await assert.rejects(verifyUnit(f, { fetchMetadata: async () => { calls++; } }), /PACKAGE_LOCK_ROOT_MISMATCH/);
  assert.equal(calls, 0);
});
test("root dependency maps compare order-insensitively without changing lock bytes", async t => {
  const f = fixture(t, { rootLock: { dependencies: { "age-unit-b": "1.0.0", "age-unit-a": "1.0.0" } },
    manifest: { dependencies: { "age-unit-a": "1.0.0", "age-unit-b": "1.0.0" } } });
  assert.equal((await verifyUnit(f)).status, "passed");
});
for (const [label, config, error] of [
  ["missing age", "fund=false\n", /INVALID_PROJECT_RELEASE_AGE_POLICY/],
  ["comment-only age", "# min-release-age=7\n", /INVALID_PROJECT_RELEASE_AGE_POLICY/],
  ["wrong age", "min-release-age=0\n", /INVALID_PROJECT_RELEASE_AGE_POLICY/],
  ["duplicate age", "min-release-age=7\nmin-release-age=7\n", /INVALID_PROJECT_RELEASE_AGE_POLICY/],
  ["conflicting age", "min-release-age=7\nmin-release-age=0\n", /INVALID_PROJECT_RELEASE_AGE_POLICY/],
  ["before cutoff", "min-release-age=7\nbefore=2100-01-01\n", /PROJECT_RELEASE_AGE_BYPASS/],
  ["package exclusion", "min-release-age=7\nmin-release-age-exclude=age-unit-a\n", /PROJECT_RELEASE_AGE_BYPASS/],
  ["array exclusion", "min-release-age=7\nmin-release-age-exclude[]=*\n", /PROJECT_RELEASE_AGE_BYPASS/],
  ["forced install", "min-release-age=7\nforce=true\n", /PROJECT_RELEASE_AGE_BYPASS/],
]) test(`file policy rejects ${label} before metadata fetch`, async t => {
  const f = fixture(t, { npmrc: config }); let calls = 0;
  await assert.rejects(verifyUnit(f, { fetchMetadata: async () => { calls++; } }), error); assert.equal(calls, 0);
});
for (const name of ["package-lock.json", "package.json", ".npmrc"]) test(`async metadata cannot hide mutation of ${name}`, async t => {
  const f = fixture(t);
  await assert.rejects(verifyUnit(f, { fetchMetadata: async packageName => {
    f.write(name, fs.readFileSync(path.join(f.root, name), "utf8") + "\n");
    return metadata([entry(packageName)]);
  } }), /INPUT_CHANGED_DURING_AGE_CHECK/);
});
test("async metadata cannot hide mutation of the reviewed local fork archive", async t => {
  const f = fixture(t, { nodes: { "node_modules/age-unit-a": packageNode(), "node_modules/braces": forkNode() }, fork: true });
  await assert.rejects(verifyUnit(f, { fetchMetadata: async packageName => {
    f.write(forkRelative, "owned-unit-changed-after-initial-provenance"); return metadata([entry(packageName)]);
  } }), /INPUT_CHANGED_DURING_AGE_CHECK|LOCAL_ARTIFACT_CHECKSUM_MISMATCH/);
});
test("grouped versions use one metadata request per real package name", async t => {
  const nodes = { "node_modules/age-unit-a": packageNode(), "node_modules/parent/node_modules/age-unit-a": packageNode("age-unit-a", "2.0.0") };
  const f = fixture(t, { nodes }), calls = [];
  const result = await verifyUnit(f, { fetchMetadata: async name => {
    calls.push(name); return metadata([entry(name), entry(name, "2.0.0")]);
  } });
  assert.deepEqual(calls, ["age-unit-a"]); assert.equal(result.registryLockEntries, 2); assert.equal(result.registryPackages, 1);
});
test("all grouped versions are age-checked rather than accepting one old version", async t => {
  const f = fixture(t, { nodes: { "node_modules/age-unit-a": packageNode(), "node_modules/parent/node_modules/age-unit-a": packageNode("age-unit-a", "2.0.0") } });
  await assert.rejects(verifyUnit(f, { fetchMetadata: async name => {
    const data = metadata([entry(name), entry(name, "2.0.0")]); data.time["2.0.0"] = new Date(now - day).toISOString(); return data;
  } }), /PACKAGE_TOO_RECENT/);
});
test("metadata concurrency stays within the explicit bound and every entry is checked", async t => {
  const names = ["age-unit-a", "age-unit-b", "age-unit-c", "age-unit-d"];
  const f = fixture(t, { nodes: Object.fromEntries(names.map(name => [`node_modules/${name}`, packageNode(name)])) });
  let active = 0, peak = 0; const calls = [];
  const result = await verifyUnit(f, { concurrency: 2, fetchMetadata: async name => {
    active++; peak = Math.max(peak, active); calls.push(name);
    try { await setImmediate(); return metadata([entry(name)]); } finally { active--; }
  } });
  assert.equal(peak, 2); assert.equal(active, 0); assert.equal(result.registryLockEntries, 4);
  assert.deepEqual(calls.sort(), [...names].sort());
});
test("metadata failure aborts peers, waits for them and never returns a partial pass", async t => {
  const f = fixture(t, { nodes: { "node_modules/age-unit-a": packageNode(), "node_modules/age-unit-b": packageNode("age-unit-b"), "node_modules/age-unit-c": packageNode("age-unit-c") } });
  const failure = new Error("UNIT_METADATA_FAILED"), calls = []; let peerFinished = false;
  await assert.rejects(verifyUnit(f, { concurrency: 2, fetchMetadata: async (name, { signal }) => {
    calls.push(name); if (name === "age-unit-a") throw failure;
    await setImmediate(); assert.equal(signal.aborted, true); peerFinished = true; throw signal.reason;
  } }), error => error === failure);
  assert.equal(peerFinished, true); assert.deepEqual(calls, ["age-unit-a", "age-unit-b"]);
});
for (const options of [{ concurrency: 0 }, { concurrency: 9 }, { concurrency: 1.5 }, { now: NaN }]) test(`invalid age-check options ${JSON.stringify(options)} are refused before file access`, async () => {
  await assert.rejects(verifyDependencyAge({ root: "this-path-must-not-be-read", ...options }), /INVALID_AGE_CHECK_OPTIONS/);
});
