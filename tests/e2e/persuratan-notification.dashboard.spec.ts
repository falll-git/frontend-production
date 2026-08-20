import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

type FixtureManifest = {
  kind: "ruwang-arsip-persuratan-notification-e2e";
  credentials: {
    username: string;
    password: string;
  };
  records: {
    memorandumId: string;
    memorandumNumber: string;
    notificationTitle: string;
    notificationMessage: string;
  };
};

const backendDirectory = path.resolve(
  process.env.PERSURATAN_E2E_BACKEND_DIR ||
    process.env.E2E_BACKEND_DIR ||
    "D:/backend-production",
);
const fixtureScript = path.join(
  backendDirectory,
  "scripts",
  "persuratan-notification-e2e-fixture.js",
);
const manifestPath = path.join(
  os.tmpdir(),
  "ruwang-arsip-persuratan-notification-e2e.json",
);

function runFixture(action: "setup" | "cleanup" | "status") {
  execFileSync(process.execPath, [fixtureScript, action], {
    cwd: backendDirectory,
    env: process.env,
    stdio: "pipe",
    timeout: 60_000,
  });
}

function readManifest(): FixtureManifest {
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as FixtureManifest;
  if (
    manifest.kind !== "ruwang-arsip-persuratan-notification-e2e" ||
    !manifest.credentials?.username ||
    !manifest.credentials?.password ||
    !manifest.records?.memorandumId
  ) {
    throw new Error("Manifest fixture notifikasi persuratan tidak lengkap.");
  }
  return manifest;
}

test.describe("Notifikasi persuratan menuju detail record", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: FixtureManifest;

  test.beforeAll(() => {
    runFixture("cleanup");
    runFixture("setup");
    fixture = readManifest();
  });

  test.afterAll(() => {
    runFixture("cleanup");
  });

  test("penerima dapat membuka memorandum yang tepat langsung dari notifikasi", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Username").fill(fixture.credentials.username);
    await page.locator("input#password").fill(fixture.credentials.password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Notifikasi" }).click();

    const notification = page.locator(".notif-item").filter({
      hasText: fixture.records.notificationMessage,
    });
    await expect(notification).toHaveCount(1);
    await expect(notification).toContainText(
      fixture.records.notificationTitle,
    );
    await notification.locator(".notif-item-main").click();

    await expect(page).toHaveURL(
      new RegExp(
        `/dashboard/manajemen-surat/laporan\\?kind=memorandum&id=${fixture.records.memorandumId}$`,
      ),
    );
    const dialog = page.getByRole("dialog", { name: "Detail Memorandum" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(fixture.records.memorandumNumber);

    await dialog.getByRole("button", { name: "Tutup", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/dashboard\/manajemen-surat\/laporan$/);
  });

  test("record memorandum yang sama dapat dibuka dari laporan dan cetak dokumen", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Username").fill(fixture.credentials.username);
    await page.locator("input#password").fill(fixture.credentials.password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });

    await page.goto("/dashboard/manajemen-surat/laporan", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: /Memorandum/i }).first().click();
    const reportRow = page.getByRole("row").filter({
      hasText: fixture.records.memorandumNumber,
    });
    await expect(reportRow).toBeVisible();
    let trigger = reportRow.getByRole("button", {
      name: new RegExp(`^Buka aksi ${fixture.records.memorandumNumber}$`),
    });
    await trigger.click();
    await page.getByRole("menuitem", { name: "Detail", exact: true }).click();
    let dialog = page.getByRole("dialog", {
      name: "Detail Memorandum",
      exact: true,
    });
    await assertModalPresentation(page, dialog);
    await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });

    await page.goto("/dashboard/manajemen-surat/cetak-dokumen", {
      waitUntil: "domcontentloaded",
    });
    await page.getByLabel("Jenis Dokumen").selectOption("memorandum");
    const printRow = page.getByRole("row").filter({
      hasText: fixture.records.memorandumNumber,
    });
    await expect(printRow).toBeVisible();
    trigger = printRow.getByRole("button", {
      name: new RegExp(`^Aksi ${fixture.records.memorandumNumber}$`),
    });
    await trigger.click();
    await page.getByRole("menuitem", { name: "Detail", exact: true }).click();
    dialog = page.getByRole("dialog", {
      name: "Detail Dokumen Cetak",
      exact: true,
    });
    await assertModalPresentation(page, dialog);
    await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
  });
});
