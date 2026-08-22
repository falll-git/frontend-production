import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function openAndCloseFormModal({
  page,
  route,
  triggerName,
  dialogName,
}: {
  page: Page;
  route: string;
  triggerName: string;
  dialogName: string;
}) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", {
    name: triggerName,
    exact: true,
  }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: dialogName,
    exact: true,
  });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
}

async function openAndCloseFirstActionDetail({
  page,
  route,
  actionName = "Buka aksi",
  dialogName,
}: {
  page: Page;
  route: string;
  actionName?: string | RegExp;
  dialogName: string;
}) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  const trigger = page
    .getByRole("button", { name: actionName, exact: typeof actionName === "string" })
    .first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole("menuitem", { name: "Detail", exact: true }).click();

  const dialog = page.getByRole("dialog", {
    name: dialogName,
    exact: true,
  });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
}

function findFirstStorageOfficeId(payload: unknown): string | null {
  const visit = (value: unknown): string | null => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = visit(item);
        if (result) return result;
      }
      return null;
    }

    if (!value || typeof value !== "object") return null;

    const record = value as Record<string, unknown>;
    const id = record.id;
    const looksLikeOffice = [
      "name",
      "code",
      "namaKantor",
      "nama_kantor",
      "office_name",
      "kodeKantor",
      "kode_kantor",
    ].some((key) => typeof record[key] === "string");

    if (looksLikeOffice && typeof id === "string" && id.trim()) {
      return id;
    }

    for (const item of Object.values(record)) {
      const result = visit(item);
      if (result) return result;
    }

    return null;
  };

  return visit(payload);
}

async function pickFirstSelectOption(select: Locator) {
  await expect
    .poll(async () => select.locator("option").count())
    .toBeGreaterThan(1);
  await select.selectOption({ index: 1 });
}

test("modal NPF terbuka dari baris kolektibilitas dan mengembalikan fokus", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const trigger = page
    .getByRole("button", { name: /\bKol 1\b/i })
    .first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /^Nasabah Kol 1\b/i });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
});

test("form Legal dan transaksi dana titipan lulus kontrak modal", async ({
  page,
}) => {
  await openAndCloseFormModal({
    page,
    route: "/dashboard/legal/progress/notaris",
    triggerName: "Tambah Progress",
    dialogName: "Tambah Progress Notaris",
  });
  await openAndCloseFormModal({
    page,
    route: "/dashboard/legal/progress/klaim",
    triggerName: "Tambah Klaim",
    dialogName: "Tambah Klaim Asuransi",
  });
  await openAndCloseFormModal({
    page,
    route: "/dashboard/legal/titipan/notaris",
    triggerName: "Tambah Titipan",
    dialogName: "Tambah Dana Titipan Notaris",
  });

  await page.goto("/dashboard/legal/titipan/notaris", {
    waitUntil: "domcontentloaded",
  });
  const actionTrigger = page
    .getByRole("button", { name: "Buka aksi", exact: true })
    .first();
  await expect(actionTrigger).toBeVisible();
  await actionTrigger.click();
  await page.getByRole("menuitem", { name: "Transaksi", exact: true }).click();

  const transactionDialog = page.getByRole("dialog", {
    name: "Tambah Transaksi Titipan",
    exact: true,
  });
  await assertModalPresentation(page, transactionDialog);
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog: transactionDialog,
    trigger: actionTrigger,
  });
});

test("detail progress, klaim, dan dana titipan terbuka dari halaman Legal", async ({
  page,
}) => {
  await openAndCloseFirstActionDetail({
    page,
    route: "/dashboard/legal/progress/notaris",
    dialogName: "Detail Progress Notaris",
  });
  await openAndCloseFirstActionDetail({
    page,
    route: "/dashboard/legal/progress/klaim",
    dialogName: "Detail Klaim Asuransi",
  });
  await openAndCloseFirstActionDetail({
    page,
    route: "/dashboard/legal/titipan/notaris",
    dialogName: "Detail Dana Titipan",
  });
});

test("modal daftar dokumen legacy memakai satu lapisan dialog", async ({
  page,
}) => {
  const officeResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      url.pathname.endsWith("/api/v1/digital-archives/storage/offices")
    );
  });

  await page.goto(
    "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
    { waitUntil: "domcontentloaded" },
  );
  const officeResponse = await officeResponsePromise;
  expect(officeResponse.ok()).toBe(true);
  const officeId = findFirstStorageOfficeId(await officeResponse.json());
  expect(officeId).toBeTruthy();

  await page.goto(
    `/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan/${officeId}`,
    { waitUntil: "domcontentloaded" },
  );
  const rackTrigger = page
    .getByRole("button", { name: "Lihat Rak", exact: true })
    .first();
  await expect(rackTrigger).toBeVisible();
  await rackTrigger.click();

  const rackDialog = page.getByRole("dialog");
  await expect(rackDialog).toHaveCount(1);
  await assertModalPresentation(page, rackDialog);

  const documentTrigger = rackDialog
    .getByRole("button", { name: "Lihat Dokumen", exact: true })
    .first();
  await expect(documentTrigger).toBeVisible();
  await documentTrigger.click();

  const documentDialog = page.getByRole("dialog");
  await expect(documentDialog).toHaveCount(1);
  await assertModalPresentation(page, documentDialog);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Escape membatalkan modal tenggat tanpa menyimpan surat masuk", async ({
  page,
}) => {
  await page.goto(
    "/dashboard/manajemen-surat/kelola-surat/input-surat-masuk",
    { waitUntil: "domcontentloaded" },
  );

  const marker = `E2E-TENGGAT-${Date.now()}`;
  await page.getByLabel("Nama Pengirim").fill("Pengirim Uji Modal");
  await page.locator("#tanggalPenerimaan").click();
  const dateDialog = page.getByRole("dialog", { name: "Pilih tanggal" });
  await expect(dateDialog).toBeVisible();
  await dateDialog.getByRole("button", { name: "Hari ini" }).click();
  await page.getByLabel("Alamat Pengirim").fill("Alamat uji modal tenggat");
  await page.getByLabel("Nama/Nomor Surat").fill(marker);
  await pickFirstSelectOption(page.getByLabel("Sifat Surat"));
  await pickFirstSelectOption(page.getByLabel("Tempat Penyimpanan Fisik"));
  await page
    .getByLabel("Keterangan Surat")
    .fill("Keterangan uji pembatalan modal tenggat");
  await page
    .getByLabel("Perihal Surat")
    .fill("Perihal uji pembatalan modal tenggat");
  await page.locator("#surat-masuk-file-input").setInputFiles({
    name: "lampiran-regression.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% fixture lintas-platform\n%%EOF\n", "utf8"),
  });

  const division = page.getByRole("checkbox", { name: /^Pilih / }).first();
  await expect(division).toBeVisible();
  await division.locator("xpath=following-sibling::label").click();
  await expect(division).toBeChecked();

  const trigger = page.getByRole("button", {
    name: "Simpan Surat Masuk",
    exact: true,
  });
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: "Tenggat Tindak Lanjut Surat Masuk",
    exact: true,
  });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });

  await expect(page.getByLabel("Nama/Nomor Surat")).toHaveValue(marker);
  await expect(page.getByText("Surat masuk berhasil disimpan")).toHaveCount(0);
});
