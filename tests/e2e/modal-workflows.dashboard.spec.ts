import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./support/auth";

type ModalFixtureManifest = {
  kind: "ruwang-arsip-modal-workflow-regression";
  version: 1;
  records: {
    incomingMailNumber: string;
    memorandumNumber: string;
    handoverDocumentNumber: string;
    returnDocumentNumber: string;
  };
};

const backendDirectory =
  process.env.MODAL_E2E_BACKEND_DIR?.trim() ||
  process.env.E2E_BACKEND_DIR?.trim();
const fixtureScript = backendDirectory
  ? path.join(backendDirectory, "scripts", "modal-workflow-fixtures.js")
  : "";
const fixtureManifestPath = path.join(
  os.tmpdir(),
  "ruwang-arsip-modal-workflow-regression.json",
);

test.describe.configure({ mode: "serial" });
test.skip(
  !backendDirectory,
  "MODAL_E2E_BACKEND_DIR atau E2E_BACKEND_DIR wajib tersedia untuk fixture modal workflow exact.",
);

let fixture: ModalFixtureManifest;

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

function readFixtureManifest(): ModalFixtureManifest {
  const manifest = JSON.parse(
    fs.readFileSync(fixtureManifestPath, "utf8"),
  ) as ModalFixtureManifest;

  if (
    manifest.kind !== "ruwang-arsip-modal-workflow-regression" ||
    manifest.version !== 1 ||
    !manifest.records?.incomingMailNumber ||
    !manifest.records?.memorandumNumber ||
    !manifest.records?.handoverDocumentNumber ||
    !manifest.records?.returnDocumentNumber
  ) {
    throw new Error("Manifest fixture modal tidak memenuhi kontrak E2E.");
  }

  return manifest;
}

async function assertNoHorizontalOverflow(page: Page, dialog?: Locator) {
  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);

  if (!dialog) return;

  const dimensions = await dialog.evaluate((element) => {
    const body = element.querySelector<HTMLElement>(".dashboard-modal__body");
    return {
      dialogOverflow: element.scrollWidth - element.clientWidth,
      bodyOverflow: body ? body.scrollWidth - body.clientWidth : 0,
    };
  });
  expect(dimensions.dialogOverflow).toBeLessThanOrEqual(1);
  expect(dimensions.bodyOverflow).toBeLessThanOrEqual(1);
}

async function assertModalInteraction(
  page: Page,
  dialog: Locator,
  trigger: Locator,
) {
  await expect(dialog).toBeVisible();
  await assertNoHorizontalOverflow(page, dialog);

  const closeButton = dialog.getByRole("button", { name: "Tutup modal" });
  await expect(closeButton).toBeFocused();

  const undersizedButtons = await dialog.locator("button,[role='button']").evaluateAll(
    (elements) =>
      elements
        .filter((element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none"
          );
        })
        .map((element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          return {
            label:
              node.getAttribute("aria-label") ||
              node.textContent?.trim() ||
              node.tagName,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
  );
  expect(undersizedButtons).toEqual([]);

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

async function selectToday(page: Page, dialog: Locator) {
  await dialog.getByRole("button", { name: "Pilih tanggal" }).click();
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  await page
    .getByRole("dialog", { name: "Pilih tanggal" })
    .getByRole("button", { name: dateLabel, exact: true })
    .click();
}

async function openLoanAction(
  page: Page,
  documentNumber: string,
  actionName: "Serahkan Dokumen" | "Catat Pengembalian",
) {
  const row = page.getByRole("row").filter({ hasText: documentNumber });
  await expect(row).toBeVisible();
  const menuTrigger = row.getByRole("button", {
    name: `Buka aksi untuk peminjaman ${documentNumber}`,
  });
  await menuTrigger.click();
  await page.getByRole("menuitem", { name: actionName, exact: true }).click();
  return menuTrigger;
}

async function openRowAction(
  page: Page,
  rowText: string,
  triggerName: RegExp,
  actionName: string,
) {
  const row = page.getByRole("row").filter({ hasText: rowText });
  await expect(row).toBeVisible();
  const trigger = row.getByRole("button", { name: triggerName });
  await trigger.click();
  await page.getByRole("menuitem", { name: actionName, exact: true }).click();
  return trigger;
}

test.beforeAll(() => {
  runFixture("setup");
  fixture = readFixtureManifest();
});

test.afterAll(() => {
  runFixture("cleanup");
});

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("disposisi Surat Masuk, Memorandum, dan tenggat tetap terbaca serta aksesibel", async ({
  page,
}) => {
  await page.goto("/dashboard/manajemen-surat/laporan", {
    waitUntil: "domcontentloaded",
  });

  await page.getByRole("button", { name: /Surat Masuk/ }).click();
  const incomingRow = page
    .getByRole("row")
    .filter({ hasText: fixture.records.incomingMailNumber });
  await expect(incomingRow).toContainText("Terlambat");
  await expect(incomingRow).toContainText("Lewat");

  const incomingTrigger = incomingRow.getByTitle(
    new RegExp(`^(?:Disposisi|Redisposisi) ${fixture.records.incomingMailNumber}$`),
  );
  await incomingTrigger.scrollIntoViewIfNeeded();
  expect(
    await incomingTrigger.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const center = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return center === element || element.contains(center);
    }),
  ).toBe(true);
  await incomingTrigger.click();
  await assertModalInteraction(
    page,
    page.getByRole("dialog", { name: /(?:Disposisi|Redisposisi) Surat Masuk/ }),
    incomingTrigger,
  );

  await page.getByRole("button", { name: /Memorandum/ }).click();
  const memorandumRow = page
    .getByRole("row")
    .filter({ hasText: fixture.records.memorandumNumber });
  await expect(memorandumRow).toBeVisible();
  const memorandumTrigger = memorandumRow.getByTitle(
    new RegExp(`^(?:Disposisi|Redisposisi) ${fixture.records.memorandumNumber}$`),
  );
  await memorandumTrigger.click();
  await assertModalInteraction(
    page,
    page.getByRole("dialog", { name: /(?:Disposisi|Redisposisi) Memorandum/ }),
    memorandumTrigger,
  );

  const search = page.getByPlaceholder(
    "Cari nomor memo, perihal, divisi, pembuat, atau penerima",
  );
  await search.fill("fixture-yang-tidak-mungkin-ditemukan");
  await expect(page.getByText("Tidak ada data yang sesuai filter")).toBeVisible();
  await expect(page.locator("table")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

test("permintaan akses, detail peminjaman, daftar dokumen, dan laporan arsip membuka modal lengkap", async ({
  page,
}) => {
  await page.goto("/dashboard/arsip-digital/disposisi/permintaan", {
    waitUntil: "domcontentloaded",
  });
  let trigger = await openRowAction(
    page,
    fixture.records.handoverDocumentNumber,
    new RegExp(`Buka aksi untuk permintaan disposisi ${fixture.records.handoverDocumentNumber}`),
    "Detail",
  );
  let dialog = page.getByRole("dialog", { name: "Detail Permintaan Disposisi" });
  await assertModalInteraction(page, dialog, trigger);

  await page.goto("/dashboard/arsip-digital/peminjaman/accept", {
    waitUntil: "domcontentloaded",
  });
  trigger = await openRowAction(
    page,
    fixture.records.handoverDocumentNumber,
    new RegExp(`Buka aksi untuk peminjaman ${fixture.records.handoverDocumentNumber}`),
    "Detail",
  );
  dialog = page.getByRole("dialog", { name: "Detail Peminjaman" });
  await assertModalInteraction(page, dialog, trigger);

  await page.goto("/dashboard/arsip-digital/ruang-arsip/list-dokumen", {
    waitUntil: "domcontentloaded",
  });
  trigger = await openRowAction(
    page,
    fixture.records.handoverDocumentNumber,
    new RegExp(`Buka aksi untuk dokumen ${fixture.records.handoverDocumentNumber}`),
    "Detail",
  );
  dialog = page.getByRole("dialog", { name: "Detail Dokumen" });
  await assertModalInteraction(page, dialog, trigger);

  trigger = await openRowAction(
    page,
    fixture.records.handoverDocumentNumber,
    new RegExp(`Buka aksi untuk dokumen ${fixture.records.handoverDocumentNumber}`),
    "Edit",
  );
  dialog = page.getByRole("dialog", { name: "Edit Dokumen" });
  await assertModalInteraction(page, dialog, trigger);

  await page.goto("/dashboard/arsip-digital/laporan", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /Lihat Daftar Dokumen/ }).click();
  trigger = await openRowAction(
    page,
    fixture.records.handoverDocumentNumber,
    new RegExp(`Buka aksi untuk dokumen ${fixture.records.handoverDocumentNumber}`),
    "Detail",
  );
  dialog = page.getByRole("dialog", { name: "Detail Dokumen" });
  await assertModalInteraction(page, dialog, trigger);
});

test("serah-terima dan pengembalian dapat dituntaskan tanpa overflow serta fixture kosong terbaca", async ({
  page,
}) => {
  await page.goto("/dashboard/arsip-digital/peminjaman/accept", {
    waitUntil: "domcontentloaded",
  });

  const handoverTrigger = await openLoanAction(
    page,
    fixture.records.handoverDocumentNumber,
    "Serahkan Dokumen",
  );
  let dialog = page.getByRole("dialog", { name: "Serah Terima Dokumen" });
  await assertModalInteraction(page, dialog, handoverTrigger);

  await handoverTrigger.click();
  await page.getByRole("menuitem", { name: "Serahkan Dokumen" }).click();
  dialog = page.getByRole("dialog", { name: "Serah Terima Dokumen" });
  await selectToday(page, dialog);
  await dialog.getByPlaceholder("Tambahkan catatan singkat...").fill(
    "Serah terima fixture regression lintas viewport telah diverifikasi.",
  );
  await dialog.getByRole("button", { name: "Serahkan", exact: true }).click();
  await expect(page.getByText("Dokumen berhasil diserahkan ke peminjam.")).toBeVisible();
  await expect(dialog).toHaveCount(0);

  const returnTrigger = await openLoanAction(
    page,
    fixture.records.returnDocumentNumber,
    "Catat Pengembalian",
  );
  dialog = page.getByRole("dialog", { name: "Catat Pengembalian" });
  await assertModalInteraction(page, dialog, returnTrigger);

  await returnTrigger.click();
  await page.getByRole("menuitem", { name: "Catat Pengembalian" }).click();
  dialog = page.getByRole("dialog", { name: "Catat Pengembalian" });
  await selectToday(page, dialog);
  await dialog.getByPlaceholder("Tambahkan catatan singkat...").fill(
    "Pengembalian fixture regression lintas viewport telah diverifikasi.",
  );
  await dialog
    .getByRole("button", { name: "Simpan Pengembalian", exact: true })
    .click();
  await expect(page.getByText("Pengembalian dokumen berhasil dicatat.")).toBeVisible();
  await expect(dialog).toHaveCount(0);

  await page.route("**/digital-document-loans?**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: [],
        meta: { page: 1, limit: 100, total: 0, last_page: 1 },
      }),
    });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Tidak ada proses peminjaman yang menunggu tindakan."),
  ).toBeVisible();
  await expect(page.locator("table")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

test("historis disposisi, peminjaman, dan penyimpanan menampilkan detail setelah workflow", async ({
  page,
}) => {
  await page.goto("/dashboard/arsip-digital/disposisi/historis", {
    waitUntil: "domcontentloaded",
  });
  let trigger = await openRowAction(
    page,
    fixture.records.returnDocumentNumber,
    new RegExp(`Buka aksi untuk disposisi ${fixture.records.returnDocumentNumber}`),
    "Detail",
  );
  let dialog = page.getByRole("dialog", { name: "Detail Disposisi" });
  await assertModalInteraction(page, dialog, trigger);

  await page.goto("/dashboard/arsip-digital/historis/peminjaman", {
    waitUntil: "domcontentloaded",
  });
  trigger = await openRowAction(
    page,
    fixture.records.returnDocumentNumber,
    new RegExp(`Buka aksi untuk historis peminjaman ${fixture.records.returnDocumentNumber}`),
    "Detail",
  );
  dialog = page.getByRole("dialog", { name: "Detail Historis Peminjaman" });
  await assertModalInteraction(page, dialog, trigger);

  await page.goto("/dashboard/arsip-digital/historis/penyimpanan", {
    waitUntil: "domcontentloaded",
  });
  trigger = await openRowAction(
    page,
    fixture.records.returnDocumentNumber,
    new RegExp(`Buka aksi untuk historis penyimpanan ${fixture.records.returnDocumentNumber}`),
    "Detail",
  );
  dialog = page.getByRole("dialog", { name: "Detail Historis Penyimpanan" });
  await assertModalInteraction(page, dialog, trigger);
});
