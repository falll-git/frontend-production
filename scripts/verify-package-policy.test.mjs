import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validatePackagePolicy } from "./verify-package-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const npmrc = fs.readFileSync(path.join(root, ".npmrc"), "utf8");
const clone = value => structuredClone(value);

test("package policy aktif cocok tanpa menjalankan npm atau instalasi", () => {
  assert.deepEqual(validatePackagePolicy(pkg, lock, npmrc), {
    npm_version: "11.21.0", node_range: "^22.13 || 24.x", min_release_age_days: 7,
  });
});

for (const [label, mutate] of [
  ["packageManager berbeda", p => { p.packageManager = "npm@11.8.0"; }],
  ["npm engine dilonggarkan", p => { p.engines.npm = ">=11"; }],
  ["Node 22.12 yang tidak didukung jsdom", p => { p.engines.node = "^22.12 || 24.x"; }],
  ["devEngines hilang", p => { delete p.devEngines; }],
  ["devEngines warn", p => { p.devEngines.packageManager.onFail = "warn"; }],
  ["runtime versi berbeda", p => { p.devEngines.runtime.version = ">=20"; }],
  ["installer memanggil ci tanpa precheck", p => { p.scripts["deps:install"] = "npm ci"; }],
  ["installer menelan kegagalan", p => { p.scripts["deps:install"] += " || true"; }],
  ["age checker berargumen bypass", p => { p.scripts["check:dependency-age"] += " --skip"; }],
  ["quality tanpa age gate", p => { p.scripts.quality = p.scripts.quality.replace("npm run check:dependency-age && ", ""); }],
  ["workflow tanpa package gate", p => { p.scripts["ci:verify-workflow"] = "node scripts/verify-ci-workflow.mjs"; }],
  ["regresi age tidak terhubung", p => { p.scripts["test:e2e:preflight:test"] = p.scripts["test:e2e:preflight:test"].replace(" scripts/verify-dependency-age.test.mjs", ""); }],
]) test(`policy menolak ${label}`, () => {
  const changed = clone(pkg); mutate(changed);
  assert.throws(() => validatePackagePolicy(changed, lock, npmrc), /Package policy tidak sesuai/);
});

for (const [label, config] of [
  ["umur nol", npmrc.replace("min-release-age=7", "min-release-age=0")],
  ["umur hanya komentar", npmrc.replace("min-release-age=7", "# min-release-age=7")],
  ["engine strict mati", npmrc.replace("engine-strict=true", "engine-strict=false")],
  ["cutoff override", npmrc + "\nbefore=2100-01-01\n"],
  ["exclusion wildcard", npmrc + "\nmin-release-age-exclude[]=*\n"],
  ["force", npmrc + "\nforce=true\n"],
  ["konfigurasi duplikat", npmrc + "\nmin-release-age=7\n"],
]) test(`policy menolak .npmrc ${label}`, () => {
  assert.throws(() => validatePackagePolicy(pkg, lock, config), /Package policy tidak sesuai/);
});

test("policy menolak metadata lock root yang tertinggal", () => {
  const changed = clone(lock); changed.packages[""].engines.node = "^22.12 || 24.x";
  assert.throws(() => validatePackagePolicy(pkg, changed, npmrc), /root lockfile/);
});
