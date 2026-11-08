import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_NPM_VERSION } from "./verify-package-policy.mjs";

// Deliberately checks the two repository-authored job layouts, not arbitrary YAML.
// Keep actual step ordering and commands in scope; comments are not evidence.
function jobSteps(source, jobId) {
  const text = String(source || "").replace(/^\s*#.*$/gm, "");
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => line === `  ${jobId}:`);
  if (start < 0) throw new Error(`Workflow wajib memiliki job ${jobId}.`);
  let end = start + 1;
  while (end < lines.length && !/^  [A-Za-z_][A-Za-z0-9_-]*:\s*$/.test(lines[end])) end++;
  const body = lines.slice(start + 1, end).join("\n");
  return { body, steps: body.split(/^      - /m).slice(1).map(block => `      - ${block}`) };
}

export function validateNpmPolicyWorkflow(source, { jobId, frontendDirectory }) {
  const { body, steps } = jobSteps(source, jobId);
  const errors = [];
  const bootstrap = steps.findIndex(step => /^      - name: Bootstrap pinned npm in ephemeral runner\s*$/m.test(step));
  const packagePolicy = steps.findIndex(step => /^      - name: Verify frontend package policy\s*$/m.test(step));
  const frontendInstall = steps.findIndex(step => /^      - name: Install frontend dependencies\s*$/m.test(step));
  const bootstrapStep = steps[bootstrap] || "";
  const policyStep = steps[packagePolicy] || "";
  const installStep = steps[frontendInstall] || "";
  const workflowPrefix = String(source || "").split(/^jobs:\s*$/m)[0];
  if (/^    (?:if|continue-on-error):/m.test(body) ||
      /^\s*npm_config_(?:force|engine_strict|min_release_age(?:_exclude)?|before)\s*:/im.test(workflowPrefix + "\n" + body) ||
      /^\s*defaults:\s*$/m.test(workflowPrefix + "\n" + body)) {
    errors.push("Job dependency wajib tanpa skip job, override env npm policy, atau defaults tersembunyi.");
  }
  const pinnedInstall = `          npm install --global npm@${REQUIRED_NPM_VERSION} --ignore-scripts --no-audit --no-fund`;
  const pinnedAssert = `          test "$(npm --version)" = "${REQUIRED_NPM_VERSION}"`;

  if (bootstrap < 0 || !bootstrapStep.split("\n").includes(pinnedInstall) ||
      !bootstrapStep.split("\n").includes(pinnedAssert) ||
      !/^        working-directory: \$\{\{ runner\.temp \}\}\s*$/m.test(bootstrapStep) ||
      !/^        shell: bash\s*$/m.test(bootstrapStep) ||
      !/^          set -euo pipefail\s*$/m.test(bootstrapStep)) {
    errors.push("Bootstrap npm 11.21.0 wajib di runner.temp, dengan versi diperiksa dan shell fail-closed.");
  }
  if (packagePolicy <= bootstrap || !/^        run: node scripts\/verify-package-policy\.mjs\s*$/m.test(policyStep)) {
    errors.push("Package policy wajib dijalankan setelah bootstrap npm.");
  }
  if (frontendInstall <= packagePolicy ||
      !/^          node scripts\/verify-dependency-age\.mjs\s*$/m.test(installStep) ||
      !/^          npm ci\s*$/m.test(installStep) ||
      installStep.indexOf("node scripts/verify-dependency-age.mjs") > installStep.indexOf("npm ci")) {
    errors.push("Frontend wajib memeriksa lock-age sebelum npm ci, setelah package policy.");
  }
  if (frontendDirectory) {
    const expected = `        working-directory: ${frontendDirectory}`;
    if (!policyStep.split("\n").includes(expected) || !installStep.split("\n").includes(expected)) {
      errors.push("Package policy dan frontend install wajib memakai checkout frontend.");
    }
  } else if (/^\s+working-directory:/m.test(policyStep + "\n" + installStep)) {
    errors.push("Dependency audit Security wajib memakai root checkout frontend.");
  }
  for (const step of [bootstrapStep, policyStep, installStep]) {
    if (/^\s+(?:if|continue-on-error):/m.test(step) || /\|\|\s*(?:true|:)|set\s+\+e/.test(step)) {
      errors.push("Bootstrap/policy/install wajib tanpa skip kondisi atau toleransi kegagalan.");
    }
  }
  const bypass = /(?:--(?:force|ignore-scripts|engine-strict|min-release-age(?:-exclude)?|before)\b)|(?:npm_config_(?:force|engine_strict|min_release_age(?:_exclude)?|before)\s*:)/i;
  for (const [index, step] of steps.entries()) {
    if (index !== bootstrap && bypass.test(step)) errors.push("Langkah dependency tidak boleh membawa override policy npm.");
    if (/\bnpm\s+ci\b/.test(step) && index < bootstrap) errors.push("npm ci tidak boleh berjalan sebelum bootstrap npm pinned.");
  }
  if (errors.length) throw new Error(`Workflow npm policy ${jobId} tidak sesuai:\n- ${errors.join("\n- ")}`);
  return { npm_version: REQUIRED_NPM_VERSION, age_check_before_ci: true };
}

export function validateSecurityDependencyWorkflow(source) {
  return validateNpmPolicyWorkflow(source, { jobId: "dependency-audit", frontendDirectory: null });
}

const REQUIRED_PATTERNS = Object.freeze([
  [/^name:\s*Quality\s*$/m, "nama workflow Quality"],
  [/^\s*pull_request:\s*$/m, "trigger pull_request"],
  [/^\s*push:\s*$/m, "trigger push"],
  [/^\s*workflow_dispatch:\s*$/m, "trigger manual"],
  [/^permissions:\s*\r?\n\s+contents:\s*read\s*$/m, "permission contents read-only"],
  [/^concurrency:\s*$/m, "pembatasan concurrency"],
  [/^\s+cancel-in-progress:\s*true\s*$/m, "pembatalan run lama"],
  [/^\s+runs-on:\s*ubuntu-24\.04\s*$/m, "GitHub-hosted Ubuntu runner"],
  [/^\s+timeout-minutes:\s*\d+\s*$/m, "timeout job"],
  [/^\s+HOME:\s*\/root\s*$/m, "HOME writable untuk browser container"],
  [/^\s+postgres:\s*$/m, "PostgreSQL service CI"],
  [/postgresql:\/\/postgres:postgres@postgres:5432\/ruwang_arsip_ci\?schema=public/, "database PostgreSQL service khusus CI"],
  [/^\s+persist-credentials:\s*false\s*$/m, "checkout tanpa menyimpan credential Git"],
  [/npm run prisma:generate/, "Prisma Client generation"],
  [/npm run ci:provision-runtime-role/, "provisioning runtime role khusus CI"],
  [/npm run quality:release/, "quality gate release"],
  [/^\s+if:\s*\$\{\{\s*failure\(\)\s*\}\}\s*$/m, "artefak hanya saat gagal"],
  [/^\s+retention-days:\s*\d+\s*$/m, "retensi artefak terbatas"],
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/^\s*runs-on:\s*.*self-hosted/im, "self-hosted runner"],
  [/^\s*environment:\s*/im, "GitHub deployment environment"],
  [/^\s+[A-Za-z][A-Za-z0-9_-]*:\s*write\s*$/im, "permission write"],
  [/\b(?:pull_request_target|workflow_run|repository_dispatch)\s*:/i, "deployment-style trigger"],
  [/\b(?:ssh|scp|rsync|systemctl|pm2|nginx|kubectl|helm)\b/i, "perintah administrasi/deployment"],
  [/(?:appleboy\/|webfactory\/ssh-agent|docker\s+context|git\s+pull)/i, "action atau perintah deployment"],
  [/curl[^\n]*(?:webhook|deploy)/i, "deployment webhook"],
  [/\bsecrets\.[A-Z0-9_]+/i, "secret repository pada quality workflow"],
]);

export function validateQualityWorkflow(source) {
  const text = String(source || "");
  const errors = [];

  validateNpmPolicyWorkflow(text, { jobId: "release-quality", frontendDirectory: "frontend-production" });

  for (const [pattern, label] of REQUIRED_PATTERNS) {
    if (!pattern.test(text)) errors.push(`Tidak ditemukan: ${label}.`);
  }

  const checkoutCount = (
    text.match(/uses:\s*actions\/checkout@[0-9a-f]{40}/gi) || []
  ).length;
  if (checkoutCount < 2) {
    errors.push("Workflow wajib checkout frontend dan backend dengan action terpin.");
  }

  const detachedCheckoutCount = (
    text.match(/^\s+persist-credentials:\s*false\s*$/gim) || []
  ).length;
  if (detachedCheckoutCount < checkoutCount) {
    errors.push("Setiap checkout wajib memakai persist-credentials: false.");
  }

  const prismaGenerateIndex = text.indexOf("npm run prisma:generate");
  const provisionRoleIndex = text.indexOf("npm run ci:provision-runtime-role");
  const migrateIndex = text.indexOf("npm run migrate:deploy");
  const seedIndex = text.indexOf("npm run seed");
  if (prismaGenerateIndex < 0 || seedIndex < 0 || prismaGenerateIndex > seedIndex) {
    errors.push("Prisma Client wajib dibuat sebelum database CI di-seed.");
  }
  if (
    provisionRoleIndex < 0 ||
    migrateIndex < 0 ||
    provisionRoleIndex > migrateIndex
  ) {
    errors.push(
      "Runtime role CI wajib diprovisikan sebelum migration database dijalankan.",
    );
  }

  const unpinnedActions = text
    .split(/\r?\n/)
    .filter((line) => /\buses:\s*[^\s]+@/i.test(line))
    .filter((line) => !/@[0-9a-f]{40}(?:\s|$)/i.test(line));
  if (unpinnedActions.length > 0) {
    errors.push("Semua GitHub Action wajib dipin ke commit SHA 40 karakter.");
  }

  if (!/image:\s*postgres:[^\s]+@sha256:[0-9a-f]{64}/i.test(text)) {
    errors.push("Image PostgreSQL CI wajib dipin ke digest SHA-256.");
  }
  if (
    !/image:\s*mcr\.microsoft\.com\/playwright:v1\.61\.1-noble@sha256:[0-9a-f]{64}/i.test(
      text,
    )
  ) {
    errors.push("Image Playwright CI wajib cocok dengan lockfile dan dipin ke digest SHA-256.");
  }

  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) errors.push(`Dilarang pada CI quality-only: ${label}.`);
  }

  if (errors.length > 0) {
    throw new Error(`Workflow Quality tidak aman:\n- ${errors.join("\n- ")}`);
  }

  return { checkout_count: checkoutCount, deployment_capability: false };
}

export function verifyQualityWorkflow(
  workflowPath = path.resolve(".github", "workflows", "quality.yml"),
  securityWorkflowPath = path.resolve(".github", "workflows", "security.yml"),
) {
  const result = validateQualityWorkflow(fs.readFileSync(workflowPath, "utf8"));
  const security = validateSecurityDependencyWorkflow(fs.readFileSync(securityWorkflowPath, "utf8"));
  console.log(
    JSON.stringify({
      status: "passed",
      workflow: path.relative(process.cwd(), workflowPath),
      ...result,
      dependency_audit_npm_policy: security,
    }),
  );
  return result;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  verifyQualityWorkflow();
}
