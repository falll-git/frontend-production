import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

type ModalRemediationFixture = {
  kind: "ruwang-arsip-modal-remediation-regression";
  version: 1;
  auth: { username: string; password: string };
  records: {
    activityTitle: string;
    availableDocumentNumber: string;
    collateralDebtorTargetId: string;
    incomingMailNumber: string;
    idebDebtorTargetId: string;
    legalAuditTitle: string;
    loanDocumentNumber: string;
    restrictedDocumentNumber: string;
  };
};

const backendDirectory =
  process.env.MODAL_E2E_BACKEND_DIR?.trim() ||
  process.env.E2E_BACKEND_DIR?.trim();
const fixtureScript = backendDirectory
  ? path.join(backendDirectory, "scripts", "modal-remediation-fixtures.js")
  : "";
const fixtureManifestPath = path.join(
  os.tmpdir(),
  "ruwang-arsip-modal-remediation-regression.json",
);

test.describe.configure({ mode: "serial" });
test.skip(
  !backendDirectory,
  "E2E_BACKEND_DIR wajib tersedia untuk fixture remediation modal.",
);

let fixture: ModalRemediationFixture;

function runFixture(action: "setup" | "cleanup") {
  if (!backendDirectory || !fixtureScript) {
    throw new Error("Repository backend tidak tersedia untuk fixture modal.");
  }
  execFileSync(process.execPath, [fixtureScript, action], {
    cwd: backendDirectory,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readFixture() {
  const value = JSON.parse(
    fs.readFileSync(fixtureManifestPath, "utf8"),
  ) as ModalRemediationFixture;
  if (
    value.kind !== "ruwang-arsip-modal-remediation-regression" ||
    value.version !== 1 ||
    !value.auth?.username ||
    !value.auth?.password ||
    !value.records?.collateralDebtorTargetId ||
    !value.records?.idebDebtorTargetId
  ) {
    throw new Error("Manifest fixture remediation modal tidak valid.");
  }
  return value;
}

async function loginWithCredentials(
  page: Page,
  username: string,
  password: string,
) {
  await page.goto("/");
  await page.getByLabel("Username").fill(username);
  await page.locator("input#password").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();
}

async function openAction(
  page: Page,
  triggerName: string | RegExp,
  itemName: string,
) {
  const trigger = page.getByRole("button", { name: triggerName }).first();
  await trigger.click();
  await page.getByRole("menuitem", { name: itemName, exact: true }).click();
  return trigger;
}

test.beforeAll(() => {
  runFixture("cleanup");
  runFixture("setup");
  fixture = readFixture();
});

test.afterAll(() => {
  runFixture("cleanup");
});

test("Pusat Log Aktivitas dan Audit Legal lulus kontrak modal", async ({
  page,
}) => {
  await login(page);

  await page.goto("/dashboard/activity-centre", {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Cari Aktivitas").fill(fixture.records.activityTitle);
  const activityTrigger = await openAction(page, /Buka aksi aktivitas/i, "Detail");
  let dialog = page.getByRole("dialog", { name: /Detail Aktivitas/i });
  await assertModalPresentation(page, dialog);
  await expect(dialog).not.toContainText(/ID Aktivitas|ID Data Terkait|Referensi Sistem/i);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: activityTrigger,
  });

  await page.goto("/dashboard/legal/laporan", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Tahun", exact: true }).click();
  await page.getByLabel("Cari Audit").fill(fixture.records.legalAuditTitle);
  const legalRow = page.locator("tbody tr").first();
  await expect(legalRow).toBeVisible();
  const legalTrigger = legalRow.getByRole("button", { name: /Buka aksi/i });
  await legalTrigger.click();
  await page.getByRole("menuitem", { name: "Detail", exact: true }).click();
  dialog = page.getByRole("dialog");
  await assertModalPresentation(page, dialog);
  await expect(dialog).not.toContainText("legal_deposit_transactions");
  await expect(dialog).not.toContainText("REVIEW_SEED");
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: legalTrigger,
  });
});

test("Edit Surat dan Detail Peminjaman lulus kontrak modal", async ({ page }) => {
  await login(page);

  await page.goto("/dashboard/manajemen-surat/laporan", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /Surat Masuk/ }).click();
  await page.getByLabel("Cari Data").fill(fixture.records.incomingMailNumber);
  const mailRow = page
    .getByRole("row")
    .filter({ hasText: fixture.records.incomingMailNumber });
  const mailTrigger = mailRow.getByRole("button", { name: /Buka aksi/i });
  await mailTrigger.click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: /Ubah Surat Masuk/i });
  await assertModalPresentation(page, dialog);
  for (const heading of [
    "Identitas Surat",
    "Informasi Pengirim",
    "Penerimaan",
    "Pengarsipan",
    "Disposisi",
    "Lampiran dan Informasi Tambahan",
  ]) {
    await expect(dialog.getByText(heading, { exact: true })).toBeVisible();
  }
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: mailTrigger,
  });

  await page.goto("/dashboard/arsip-digital/peminjaman/laporan", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByPlaceholder("Dokumen, peminjam...")
    .fill(fixture.records.loanDocumentNumber);
  const loanRow = page
    .getByRole("row")
    .filter({ hasText: fixture.records.loanDocumentNumber });
  const loanTrigger = loanRow.getByRole("button", { name: /Buka aksi/i });
  await loanTrigger.click();
  await page.getByRole("menuitem", { name: "Detail", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Detail Peminjaman" });
  await assertModalPresentation(page, dialog);
  await expect(dialog).toContainText(fixture.records.loanDocumentNumber);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: loanTrigger,
  });
});

test("Ajukan Peminjaman dan Ajukan Disposisi lulus kontrak modal", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard/arsip-digital/peminjaman/request", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByPlaceholder("Cari berdasarkan nama atau kode...")
    .fill(fixture.records.availableDocumentNumber);
  const documentCheckbox = page.getByRole("checkbox", {
    name: `Pilih dokumen ${fixture.records.availableDocumentNumber}`,
  });
  const checkboxId = await documentCheckbox.getAttribute("id");
  if (!checkboxId) {
    throw new Error("Checkbox dokumen tidak memiliki relasi label.");
  }
  await page.locator(`label[for="${checkboxId}"]`).click();
  const loanRequestTrigger = page.getByRole("button", {
    name: /Ajukan Pinjam/,
  });
  await loanRequestTrigger.click();
  let dialog = page.getByRole("dialog", { name: "Ajukan Peminjaman" });
  await assertModalPresentation(page, dialog);
  await expect(dialog).toContainText(fixture.records.availableDocumentNumber);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: loanRequestTrigger,
  });

  await page.context().clearCookies();
  await loginWithCredentials(
    page,
    fixture.auth.username,
    fixture.auth.password,
  );
  await page.goto("/dashboard/arsip-digital/disposisi/pengajuan", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByPlaceholder("Cari berdasarkan nama dokumen atau kode...")
    .fill(fixture.records.restrictedDocumentNumber);
  const dispositionRow = page
    .getByRole("row")
    .filter({ hasText: fixture.records.restrictedDocumentNumber });
  const dispositionTrigger = dispositionRow.getByRole("button", {
    name: "Ajukan",
    exact: true,
  });
  await dispositionTrigger.click();
  dialog = page.getByRole("dialog", { name: "Ajukan Disposisi" });
  await assertModalPresentation(page, dialog);
  await expect(dialog).toContainText(fixture.records.restrictedDocumentNumber);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: dispositionTrigger,
  });
});

test("Detail iDeb, agunan, dan monitoring expired lulus kontrak modal", async ({
  page,
}) => {
  await login(page);

  await page.goto("/dashboard/informasi-debitur/laporan-ideb", {
    waitUntil: "domcontentloaded",
  });
  const idebTrigger = await openAction(page, "Aksi IDEB", "Detail");
  let dialog = page.getByRole("dialog", { name: /Detail Pengecekan IDEB/i });
  await assertModalPresentation(page, dialog);
  await expect(dialog).not.toContainText(/^Lampiran$/i);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: idebTrigger,
  });

  await page.goto(
    `/dashboard/informasi-debitur/${fixture.records.idebDebtorTargetId}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.getByRole("tab", { name: "Hasil IDEB" }).click();
  const debtorIdebTrigger = await openAction(page, "Aksi IDEB", "Detail");
  dialog = page.getByRole("dialog", { name: /Detail Pengecekan IDEB/i });
  await assertModalPresentation(page, dialog);
  await expect(dialog).not.toContainText(/^Lampiran$/i);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: debtorIdebTrigger,
  });

  await page.goto(
    `/dashboard/informasi-debitur/${fixture.records.collateralDebtorTargetId}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.getByRole("tab", { name: "Agunan" }).click();
  const collateralTrigger = page
    .getByRole("button", { name: "Aksi agunan" })
    .first();
  await collateralTrigger.click();
  await page
    .getByRole("menuitem", { name: "Detail Agunan", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: /Detail Agunan/i });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: collateralTrigger,
  });

  await collateralTrigger.click();
  await page
    .getByRole("menuitem", { name: "Atur Monitoring Expired", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Atur Monitoring Expired" });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog,
    trigger: collateralTrigger,
  });
});
