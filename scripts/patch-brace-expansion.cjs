/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_VERSION = "5.0.9";
const MARKER = "RUWANG_ARSIP_COMMONJS_COMPAT";
const SOURCE_MAP_LINE = "//# sourceMappingURL=index.js.map";
const COMPATIBILITY_ADAPTER = `
// ${MARKER}: old minimatch releases expect a callable CommonJS export.
module.exports = Object.assign(
  function braceExpansionCompat(pattern) {
    return expand(pattern);
  },
  {
    expand,
    EXPANSION_MAX: exports.EXPANSION_MAX,
    EXPANSION_MAX_LENGTH: exports.EXPANSION_MAX_LENGTH,
  },
);
`;

function findInstalledPackages(nodeModulesDirectory, results = []) {
  if (!fs.existsSync(nodeModulesDirectory)) return results;

  for (const entry of fs.readdirSync(nodeModulesDirectory, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    const entryPath = path.join(nodeModulesDirectory, entry.name);
    if (entry.name.startsWith("@")) {
      for (const scopedEntry of fs.readdirSync(entryPath, {
        withFileTypes: true,
      })) {
        if (!scopedEntry.isDirectory() && !scopedEntry.isSymbolicLink()) {
          continue;
        }
        const packagePath = path.join(entryPath, scopedEntry.name);
        findInstalledPackages(path.join(packagePath, "node_modules"), results);
      }
      continue;
    }

    if (
      entry.name === "brace-expansion" &&
      fs.existsSync(path.join(entryPath, "package.json"))
    ) {
      results.push(entryPath);
    }
    findInstalledPackages(path.join(entryPath, "node_modules"), results);
  }

  return results;
}

function patchInstalledPackage(packageDirectory) {
  const manifestPath = path.join(packageDirectory, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.version !== EXPECTED_VERSION) {
    throw new Error(
      `brace-expansion ${manifest.version} tidak boleh dipatch; ` +
        `versi yang diverifikasi adalah ${EXPECTED_VERSION}.`,
    );
  }

  const commonJsPath = path.join(
    packageDirectory,
    "dist",
    "commonjs",
    "index.js",
  );
  const source = fs.readFileSync(commonJsPath, "utf8");
  if (source.includes(MARKER)) return "already-patched";

  const sourceMapOccurrences = source.split(SOURCE_MAP_LINE).length - 1;
  if (sourceMapOccurrences !== 1 || !source.includes("exports.expand = expand")) {
    throw new Error(
      `Struktur brace-expansion ${EXPECTED_VERSION} tidak sesuai baseline patch.`,
    );
  }

  fs.writeFileSync(
    commonJsPath,
    source.replace(
      SOURCE_MAP_LINE,
      `${COMPATIBILITY_ADAPTER}\n${SOURCE_MAP_LINE}`,
    ),
    "utf8",
  );
  return "patched";
}

const installedPackages = findInstalledPackages(
  path.resolve("node_modules"),
);
if (installedPackages.length === 0) {
  throw new Error(
    `brace-expansion ${EXPECTED_VERSION} tidak ditemukan setelah install.`,
  );
}

const results = installedPackages.map(patchInstalledPackage);
console.log(
  `brace-expansion CommonJS compatibility ready ` +
    `(${results.filter((result) => result === "patched").length} patched, ` +
    `${results.filter((result) => result === "already-patched").length} existing).`,
);
