import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateQualityWorkflow, validateSecurityDependencyWorkflow } from "./verify-ci-workflow.mjs";

const workflow = fs.readFileSync(
  path.resolve(".github", "workflows", "quality.yml"),
  "utf8",
);
const securityWorkflow = fs.readFileSync(path.resolve(".github", "workflows", "security.yml"), "utf8");

test("workflow Quality memenuhi kebijakan CI quality-only", () => {
  assert.deepEqual(validateQualityWorkflow(workflow), {
    checkout_count: 2,
    deployment_capability: false,
  });
});

test("workflow Quality menolak permission write", () => {
  assert.throws(
    () => validateQualityWorkflow(workflow.replace("contents: read", "contents: write")),
    /permission write/,
  );
});

test("workflow Quality menolak permission write pada scope lain", () => {
  assert.throws(
    () => validateQualityWorkflow(`${workflow}\n    permissions:\n      issues: write\n`),
    /permission write/,
  );
});

test("workflow Quality mewajibkan semua checkout memutus credential Git", () => {
  assert.throws(
    () =>
      validateQualityWorkflow(
        workflow.replace(/\n\s+persist-credentials:\s*false/, ""),
      ),
    /Setiap checkout/,
  );
});

test("workflow Quality mewajibkan Prisma Client dibuat sebelum seed", () => {
  assert.throws(
    () =>
      validateQualityWorkflow(
        workflow.replace(/\n\s+- name: Generate Prisma client[\s\S]*?run: npm run prisma:generate\n/, "\n"),
      ),
    /Prisma Client/,
  );
});

test("workflow Quality mewajibkan runtime role CI sebelum migration", () => {
  assert.throws(
    () =>
      validateQualityWorkflow(
        workflow.replace(
          /\n\s+- name: Provision least-privilege runtime role for CI migrations[\s\S]*?run: npm run ci:provision-runtime-role\n/,
          "\n",
        ),
      ),
    /provisioning runtime role|Runtime role CI/i,
  );
});

test("workflow Quality mewajibkan HOME writable untuk browser container", () => {
  assert.throws(
    () => validateQualityWorkflow(workflow.replace(/^\s+HOME:\s*\/root\s*\r?\n/m, "")),
    /HOME writable/,
  );
});

test("workflow Quality menolak pull_request_target", () => {
  assert.throws(
    () => validateQualityWorkflow(`${workflow}\npull_request_target:\n`),
    /deployment-style trigger/,
  );
});

test("workflow Quality menolak SSH ke server", () => {
  assert.throws(
    () => validateQualityWorkflow(`${workflow}\n      - run: ssh production-vps\n`),
    /administrasi\/deployment/,
  );
});

test("workflow Quality menolak action yang tidak dipin", () => {
  assert.throws(
    () =>
      validateQualityWorkflow(
        workflow.replace(
          /actions\/checkout@[0-9a-f]{40}/,
          "actions/checkout@v6",
        ),
      ),
    /commit SHA 40 karakter/,
  );
});

test("dependency-audit Security terpin tanpa melarang permission CodeQL yang sah", () => {
  assert.match(securityWorkflow, /security-events: write/);
  assert.deepEqual(validateSecurityDependencyWorkflow(securityWorkflow), {
    npm_version: "11.21.0", age_check_before_ci: true,
  });
});

for (const [label, mutate] of [
  ["bootstrap hilang", text => text.replace(/      - name: Bootstrap pinned npm in ephemeral runner[\s\S]*?(?=      - )/, "")],
  ["npm tidak terpin", text => text.replace("npm@11.21.0", "npm@latest")],
  ["versi bootstrap tidak diverifikasi", text => text.replace('          test "$(npm --version)" = "11.21.0"', "")],
  ["bootstrap dari checkout", text => text.replace("working-directory: ${{ runner.temp }}", "working-directory: frontend-production")],
  ["bootstrap hanya komentar", text => text.replace("          npm install --global npm@11.21.0", "          # npm install --global npm@11.21.0")],
  ["bootstrap menelan kegagalan", text => text.replace("set -euo pipefail", "set +e")],
  ["bootstrap dilewati", text => text.replace("      - name: Bootstrap pinned npm in ephemeral runner", "      - name: Bootstrap pinned npm in ephemeral runner\n        if: false")],
  ["lock-age hilang", text => text.replace("          node scripts/verify-dependency-age.mjs\n", "")],
  ["lock-age setelah instalasi", text => text.replace("          node scripts/verify-dependency-age.mjs\n          npm ci", "          npm ci\n          node scripts/verify-dependency-age.mjs")],
  ["lock-age hanya komentar", text => text.replace("          node scripts/verify-dependency-age.mjs", "          # node scripts/verify-dependency-age.mjs")],
  ["install meloloskan kegagalan", text => text.replace("          npm ci", "          npm ci || true")],
  ["force saat install", text => text.replace("          npm ci", "          npm ci --force")],
  ["policy check tidak ada", text => text.replace("run: node scripts/verify-package-policy.mjs", "run: echo policy")],
]) {
  test(`Quality npm policy menolak ${label}`, () => {
    assert.throws(() => validateQualityWorkflow(mutate(workflow)), /Workflow npm policy/);
  });
  test(`Security npm policy menolak ${label}`, () => {
    assert.throws(() => validateSecurityDependencyWorkflow(mutate(securityWorkflow)), /Workflow npm policy/);
  });
}

test("Security tidak dianggap terlindungi oleh bootstrap pada job lain", () => {
  const changed = securityWorkflow.replace(/      - name: Bootstrap pinned npm in ephemeral runner[\s\S]*?(?=      - )/, "");
  assert.throws(() => validateSecurityDependencyWorkflow(changed + "\n  unrelated:\n    steps:\n      - name: Bootstrap pinned npm in ephemeral runner\n"), /Workflow npm policy/);
});

test("Quality menolak npm ci backend yang ditempatkan sebelum bootstrap", () => {
  const changed = workflow.replace("      - name: Bootstrap pinned npm in ephemeral runner", "      - name: Early backend install\n        run: npm ci\n      - name: Bootstrap pinned npm in ephemeral runner");
  assert.throws(() => validateQualityWorkflow(changed), /sebelum bootstrap/);
});

test("Quality menolak override policy di env job", () => {
  assert.throws(() => validateQualityWorkflow(workflow.replace("    env:\n", "    env:\n      NPM_CONFIG_MIN_RELEASE_AGE: 0\n")), /override env/);
});

test("Security menolak job dependency yang sengaja dilewati", () => {
  assert.throws(() => validateSecurityDependencyWorkflow(securityWorkflow.replace("  dependency-audit:\n", "  dependency-audit:\n    if: false\n")), /skip job/);
});
