import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const rootRequire = createRequire(import.meta.url);

test("brace-expansion memakai implementasi aman dengan API lama dan baru", () => {
  const braceExpansion = rootRequire("brace-expansion");

  assert.equal(typeof braceExpansion, "function");
  assert.equal(typeof braceExpansion.expand, "function");
  assert.deepEqual(braceExpansion("arsip-{aman,aktif}"), [
    "arsip-aman",
    "arsip-aktif",
  ]);

  const bounded = braceExpansion.expand("{1..10000000}");
  assert.equal(bounded.length, braceExpansion.EXPANSION_MAX);
});

test("minimatch lint dan archive tetap kompatibel dengan shim", () => {
  const consumerManifests = [
    path.resolve("node_modules", "eslint", "package.json"),
    path.resolve(
      "node_modules",
      "@typescript-eslint",
      "typescript-estree",
      "package.json",
    ),
    path.resolve("node_modules", "archiver-node", "package.json"),
  ];

  for (const manifest of consumerManifests) {
    const consumerRequire = createRequire(manifest);
    const minimatchModule = consumerRequire("minimatch");
    const minimatch =
      typeof minimatchModule === "function"
        ? minimatchModule
        : minimatchModule.minimatch;

    assert.equal(typeof minimatch, "function");
    assert.equal(minimatch("src/app/page.tsx", "src/**/*.tsx"), true);
  }
});
