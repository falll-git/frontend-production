import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_NPM_VERSION = "11.21.0";
export const REQUIRED_NODE_RANGE = "^22.13 || 24.x";

/** Static repository policy, not a security boundary against arbitrary npm flags. */
export function validatePackagePolicy(pkg, lock, npmrc) {
  const errors = [];
  const expectedEngine = (engine, name, version) =>
    engine?.name === name && engine?.version === version && engine?.onFail === "error";

  if (pkg?.packageManager !== `npm@${REQUIRED_NPM_VERSION}`) {
    errors.push("packageManager wajib npm@11.21.0.");
  }
  if (pkg?.engines?.node !== REQUIRED_NODE_RANGE || pkg?.engines?.npm !== REQUIRED_NPM_VERSION) {
    errors.push("engines wajib Node ^22.13 || 24.x dan npm 11.21.0.");
  }
  if (!expectedEngine(pkg?.devEngines?.runtime, "node", REQUIRED_NODE_RANGE) ||
      !expectedEngine(pkg?.devEngines?.packageManager, "npm", REQUIRED_NPM_VERSION)) {
    errors.push("devEngines runtime/packageManager wajib versi yang sama dan onFail error.");
  }
  if (lock?.lockfileVersion !== 3 ||
      lock?.packages?.[""]?.engines?.node !== REQUIRED_NODE_RANGE ||
      lock?.packages?.[""]?.engines?.npm !== REQUIRED_NPM_VERSION) {
    errors.push("Metadata root lockfile v3 wajib cocok dengan engines package.json.");
  }

  const assignments = new Map();
  for (const rawLine of String(npmrc).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^[#;]/.test(line)) continue;
    const match = /^([^=\s]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) {
      errors.push(".npmrc memiliki baris konfigurasi yang tidak dikenali.");
      continue;
    }
    const key = match[1].toLowerCase();
    if (assignments.has(key)) errors.push(`.npmrc menduplikasi ${key}.`);
    assignments.set(key, match[2]);
  }
  if (assignments.get("min-release-age") !== "7") errors.push("min-release-age wajib 7 hari.");
  if (assignments.get("engine-strict") !== "true") errors.push("engine-strict wajib true.");
  if ([...assignments.keys()].some(key => key === "before" || key.startsWith("min-release-age-exclude")) ||
      assignments.get("force") === "true") {
    errors.push(".npmrc tidak boleh melonggarkan cutoff, exclusion, atau force.");
  }

  const scripts = pkg?.scripts || {};
  if (scripts["check:dependency-age"] !== "node scripts/verify-dependency-age.mjs") {
    errors.push("check:dependency-age wajib memakai pemeriksaan lock-age tanpa argumen bypass.");
  }
  if (scripts["deps:install"] !== "node scripts/verify-package-policy.mjs && node scripts/verify-dependency-age.mjs && npm ci") {
    errors.push("deps:install wajib memeriksa policy dan lock-age sebelum npm ci.");
  }
  if (scripts["ci:verify-workflow"] !== "node scripts/verify-package-policy.mjs && node scripts/verify-ci-workflow.mjs") {
    errors.push("ci:verify-workflow wajib mencakup package policy dan kedua workflow dependency.");
  }
  if (!String(scripts.quality).startsWith("npm run ci:verify-workflow && npm run check:dependency-age && ")) {
    errors.push("quality wajib diawali policy/workflow dan pemeriksaan lock-age.");
  }
  if (!String(scripts["test:e2e:preflight:test"]).includes("scripts/verify-package-policy.test.mjs") ||
      !String(scripts["test:e2e:preflight:test"]).includes("scripts/verify-dependency-age.test.mjs")) {
    errors.push("Gate pure preflight wajib mencakup regresi package-policy dan lock-age.");
  }
  if (errors.length) throw new Error(`Package policy tidak sesuai:\n- ${errors.join("\n- ")}`);
  return { npm_version: REQUIRED_NPM_VERSION, node_range: REQUIRED_NODE_RANGE, min_release_age_days: 7 };
}

export function verifyPackagePolicy(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  const result = validatePackagePolicy(
    JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
    JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8")),
    fs.readFileSync(path.join(root, ".npmrc"), "utf8"),
  );
  console.log(JSON.stringify({ status: "passed_static_package_policy_only", ...result }));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyPackagePolicy();
}
