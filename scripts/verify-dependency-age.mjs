// Read-only, fail-closed companion to npm's native resolution-age filter.
// Native npm ci replays its lock; this checks that lock BEFORE the approved ci.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const MIN_RELEASE_AGE_DAYS = 7;
export const REGISTRY = "https://registry.npmjs.org";
const DAY_MS = 86_400_000;
// Vite's measured public packument is ~39 MB; retain a finite 64 MiB ceiling.
const MAX_METADATA_BYTES = 64 * 1024 * 1024;
const REVIEWED_FORK = Object.freeze({
  resolved: "file:vendor/ruwang-braces-depth-guard-3.0.3-ruwang.depth.1.tgz",
  name: "@ruwang/braces-depth-guard",
  version: "3.0.3-ruwang.depth.1",
  sha256: "c54b6da96080e5af8cac52851af98b229388d8855c59dbbb302c294731c82570",
});
const digest = (b, algorithm = "sha256") => crypto.createHash(algorithm).update(b).digest("hex");
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `: ${detail}` : ""}`); };
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
const packageName = value => typeof value === "string" && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value);
const versionString = value => typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
function parseIntegrity(value) {
  if (typeof value !== "string" || !value.trim()) fail("REGISTRY_INTEGRITY_MISMATCH");
  return value.trim().split(/\s+/).map(token => {
    const match = /^(sha512|sha384|sha256|sha1)-([A-Za-z0-9+/]+={0,2})$/.exec(token);
    if (!match) fail("REGISTRY_INTEGRITY_MISMATCH");
    const bytes = Buffer.from(match[2], "base64"), sizes = { sha512: 64, sha384: 48, sha256: 32, sha1: 20 };
    if (bytes.length !== sizes[match[1]] || bytes.toString("base64") !== match[2]) fail("REGISTRY_INTEGRITY_MISMATCH");
    return token;
  });
}

export function registryURL(value) {
  let url;
  try { url = new URL(value); } catch { fail("UNSUPPORTED_REGISTRY_SOURCE"); }
  if (url.origin !== REGISTRY || url.username || url.password || url.search || url.hash) fail("UNSUPPORTED_REGISTRY_SOURCE");
  return url.href;
}

function verifyReviewedFork(root, node) {
  if (node.resolved !== REVIEWED_FORK.resolved || node.name !== REVIEWED_FORK.name || node.version !== REVIEWED_FORK.version) fail("UNREVIEWED_LOCAL_DEPENDENCY");
  const archive = path.resolve(root, node.resolved.slice(5));
  if (!archive.startsWith(path.resolve(root) + path.sep)) fail("LOCAL_ARTIFACT_OUTSIDE_PROJECT");
  const realRelative = path.relative(fs.realpathSync(root), fs.realpathSync(archive));
  if (realRelative.startsWith(".." + path.sep) || realRelative === ".." || path.isAbsolute(realRelative)) fail("LOCAL_ARTIFACT_OUTSIDE_PROJECT");
  const stat = fs.lstatSync(archive);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("INVALID_LOCAL_ARTIFACT");
  const bytes = fs.readFileSync(archive);
  if (digest(bytes) !== REVIEWED_FORK.sha256) fail("LOCAL_ARTIFACT_CHECKSUM_MISMATCH");
  const expected = "sha512-" + crypto.createHash("sha512").update(bytes).digest("base64");
  if (node.integrity !== expected) fail("LOCAL_ARTIFACT_LOCK_INTEGRITY_MISMATCH");
  return { name: node.name, version: node.version, source: "REVIEWED_LOCAL_FORK", sha256: REVIEWED_FORK.sha256 };
}

export function collectLockedPackages(lock, { root, verifyLocal = verifyReviewedFork } = {}) {
  if (!plain(lock) || lock.lockfileVersion !== 3 || !plain(lock.packages) || !plain(lock.packages[""])) fail("INVALID_LOCKFILE");
  const registry = [], local = [];
  for (const [location, node] of Object.entries(lock.packages)) {
    if (location === "") continue;
    if (!plain(node) || node.link || !location.startsWith("node_modules/") || location.split(/[\\/]/).some(p => p === "." || p === ".." || !p)) fail("UNSUPPORTED_LOCK_ENTRY");
    const inferred = location.slice(location.lastIndexOf("node_modules/") + 13);
    const name = node.name || inferred;
    if (!packageName(name) || !versionString(node.version)) fail("INVALID_LOCK_IDENTITY");
    if (typeof node.resolved === "string" && node.resolved.startsWith("file:")) {
      local.push({ location, ...verifyLocal(root, node) });
      continue;
    }
    let bundledInto = null;
    if (node.resolved === undefined && node.inBundle === true) {
      let parent = location.slice(0, location.lastIndexOf("/node_modules/"));
      while (parent && !lock.packages[parent]?.resolved) {
        const next = parent.lastIndexOf("/node_modules/");
        if (next < 0) { parent = ""; break; }
        parent = parent.slice(0, next);
      }
      if (!parent || parent === location || !plain(lock.packages[parent])) fail("BUNDLED_PARENT_NOT_PROVEN");
      registryURL(lock.packages[parent].resolved);
      if (typeof lock.packages[parent].integrity !== "string") fail("BUNDLED_PARENT_NOT_PROVEN");
      bundledInto = parent;
    } else {
      if (typeof node.resolved !== "string" || typeof node.integrity !== "string") fail("UNSUPPORTED_LOCK_ENTRY");
      registryURL(node.resolved);
    }
    registry.push({ location, name, version: node.version, resolved: node.resolved ?? null, integrity: node.integrity ?? null, bundledInto });
  }
  if (registry.length === 0) fail("EMPTY_REGISTRY_LOCK");
  return { registry, local };
}

export function validatePublishedVersion(entry, metadata, now = Date.now()) {
  if (!Number.isFinite(now)) fail("INVALID_CLOCK");
  if (!plain(metadata) || metadata.name !== entry.name || !plain(metadata.time) || !plain(metadata.versions)) fail("INVALID_REGISTRY_METADATA", entry.name);
  const release = metadata.versions[entry.version], time = metadata.time[entry.version];
  if (!plain(release) || release.name !== entry.name || release.version !== entry.version) fail("REGISTRY_IDENTITY_MISMATCH", `${entry.name}@${entry.version}`);
  if (typeof time !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(time)) fail("MISSING_OR_INVALID_RELEASE_TIME", `${entry.name}@${entry.version}`);
  const fields = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)/.exec(time);
  const [, year, month, day, hour, minute, second] = fields.map(Number);
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) fail("MISSING_OR_INVALID_RELEASE_TIME", `${entry.name}@${entry.version}`);
  const published = Date.parse(time);
  if (!Number.isFinite(published) || published > now) fail("MISSING_OR_INVALID_RELEASE_TIME", `${entry.name}@${entry.version}`);
  if (now - published < MIN_RELEASE_AGE_DAYS * DAY_MS) fail("PACKAGE_TOO_RECENT", `${entry.name}@${entry.version}`);
  if (!entry.bundledInto) {
    if (!plain(release.dist) || registryURL(release.dist.tarball) !== registryURL(entry.resolved)) fail("REGISTRY_TARBALL_MISMATCH", `${entry.name}@${entry.version}`);
    const lockSRI = parseIntegrity(entry.integrity), remoteSRI = release.dist.integrity === undefined ? [] : parseIntegrity(release.dist.integrity);
    const rank = { sha512: 4, sha384: 3, sha256: 2, sha1: 1 };
    const strongest = Math.max(...lockSRI.map(v => rank[v.split("-")[0]]));
    const preferred = lockSRI.filter(v => rank[v.split("-")[0]] === strongest);
    const sha1 = /^[a-f0-9]{40}$/i.test(release.dist.shasum ?? "") ? "sha1-" + Buffer.from(release.dist.shasum, "hex").toString("base64") : null;
    if (!preferred.length || !preferred.every(v => remoteSRI.includes(v) || v === sha1)) fail("REGISTRY_INTEGRITY_MISMATCH", `${entry.name}@${entry.version}`);
  }
  return { name: entry.name, version: entry.version, publishedAt: new Date(published).toISOString(), bundledInto: entry.bundledInto, status: "AGE_VERIFIED" };
}

export async function fetchRegistryMetadata(name, { signal, fetchImpl = fetch } = {}) {
  if (!packageName(name)) fail("INVALID_REGISTRY_PACKAGE_NAME");
  const response = await fetchImpl(`${REGISTRY}/${encodeURIComponent(name)}`, {
    headers: { accept: "application/json" }, redirect: "error", credentials: "omit",
    signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]),
  });
  if (!response.ok || !response.body) { await response.body?.cancel().catch(() => {}); fail("REGISTRY_METADATA_UNAVAILABLE", name); }
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_METADATA_BYTES)) {
    await response.body.cancel(); fail("REGISTRY_METADATA_TOO_LARGE", name);
  }
  const reader = response.body.getReader(), parts = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_METADATA_BYTES) fail("REGISTRY_METADATA_TOO_LARGE", name); parts.push(Buffer.from(value)); }
    let data; try { data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts))); } catch { fail("INVALID_REGISTRY_JSON", name); }
    return data;
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}

export async function verifyDependencyAge({ root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), fetchMetadata = fetchRegistryMetadata, now = Date.now(), concurrency = 4 } = {}) {
  if (!Number.isFinite(now) || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) fail("INVALID_AGE_CHECK_OPTIONS");
  const lockPath = path.join(root, "package-lock.json"), manifestPath = path.join(root, "package.json"), npmrcPath = path.join(root, ".npmrc");
  const original = fs.readFileSync(lockPath), manifest = fs.readFileSync(manifestPath), npmrc = fs.readFileSync(npmrcPath, "utf8");
  const settings = npmrc.split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith("#") && !x.startsWith(";"));
  if (settings.filter(x => /^min-release-age\s*=/i.test(x)).length !== 1 || !settings.includes("min-release-age=7")) fail("INVALID_PROJECT_RELEASE_AGE_POLICY");
  if (settings.some(x => /^(?:before|min-release-age-exclude(?:\[\])?|force)\s*=/i.test(x))) fail("PROJECT_RELEASE_AGE_BYPASS");
  const lock = JSON.parse(original), pkg = JSON.parse(manifest);
  for (const key of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const left = lock.packages?.[""]?.[key] ?? {}, right = pkg[key] ?? {};
    const sorted = value => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    if (!plain(left) || !plain(right) || sorted(left) !== sorted(right)) fail("PACKAGE_LOCK_ROOT_MISMATCH", key);
  }
  const { registry, local } = collectLockedPackages(lock, { root });
  const groups = new Map(); for (const e of registry) { if (!groups.has(e.name)) groups.set(e.name, []); groups.get(e.name).push(e); }
  const names = [...groups.keys()], controller = new AbortController(), deadline = setTimeout(() => controller.abort(new Error("AGE_CHECK_DEADLINE")), 180_000);
  let cursor = 0, firstError = null; const results = [];
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, async () => {
      while (cursor < names.length && !firstError) {
        const name = names[cursor++];
        try { const metadata = await fetchMetadata(name, { signal: controller.signal }); for (const entry of groups.get(name)) results.push(validatePublishedVersion(entry, metadata, now)); }
        catch (error) { firstError ??= error; controller.abort(error); }
      }
    }));
    if (firstError) throw firstError;
    if (controller.signal.aborted || results.length !== registry.length) fail("INCOMPLETE_RELEASE_AGE_CHECK");
    if (digest(fs.readFileSync(lockPath)) !== digest(original) || digest(fs.readFileSync(manifestPath)) !== digest(manifest) || fs.readFileSync(npmrcPath, "utf8") !== npmrc) fail("INPUT_CHANGED_DURING_AGE_CHECK");
    for (const entry of local) verifyReviewedFork(root, lock.packages[entry.location]);
    return { status: "passed", minReleaseAgeDays: MIN_RELEASE_AGE_DAYS, checkedAt: new Date(now).toISOString(), registryLockEntries: registry.length, registryPackages: names.length, bundledEntries: registry.filter(e => e.bundledInto).length, reviewedLocalArtifacts: local, lockSHA256: digest(original), mutation: false };
  } finally { clearTimeout(deadline); controller.abort(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) { console.error("DEPENDENCY_AGE_FAILED: no CLI overrides are supported"); process.exitCode = 1; }
  else verifyDependencyAge().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(`DEPENDENCY_AGE_FAILED: ${error.message}`); process.exitCode = 1; });
}
