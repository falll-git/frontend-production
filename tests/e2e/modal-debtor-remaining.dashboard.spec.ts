import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

test.describe.configure({ mode: "serial" });

function findFirstDebtorId(payload: unknown): string | null {
  let current = payload;

  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      for (const value of current) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          continue;
        }
        const item = value as Record<string, unknown>;
        const direct = item.debtor_id ?? item.debtorId;
        if (typeof direct === "string" && direct) return direct;
        if (item.debtor && typeof item.debtor === "object") {
          const nested = (item.debtor as Record<string, unknown>).id;
          if (typeof nested === "string" && nested) return nested;
        }
      }
      return null;
    }

    if (!current || typeof current !== "object") return null;
    const record = current as Record<string, unknown>;
    const candidate =
      record.items ?? record.rows ?? record.results ?? record.list;
    if (Array.isArray(candidate)) {
      current = candidate;
      continue;
    }
    if (!("data" in record)) return null;
    current = record.data;
  }

  return null;
}

async function openActionItem({
  page,
  trigger,
  item,
}: {
  page: Page;
  trigger: Locator;
  item: string;
}) {
  await trigger.click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

async function verifyAndClose({
  page,
  dialog,
  trigger,
}: {
  page: Page;
  dialog: Locator;
  trigger: Locator;
}) {
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("Master Debitur dan Kontrak membuka seluruh modal tanpa mengubah data", async ({
  page,
}) => {
  await page.goto("/dashboard/informasi-debitur/master-debitur", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Master Debitur & Kontrak" }),
  ).toBeVisible();

  const addDebtor = page.getByRole("button", { name: "Tambah Debitur" });
  await addDebtor.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Tambah Debitur" }),
    trigger: addDebtor,
  });

  const debtorAction = page
    .getByRole("button", { name: /^Aksi (?!kontrak)/i })
    .first();
  await expect(debtorAction).toBeVisible();

  await openActionItem({ page, trigger: debtorAction, item: "Detail" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Detail Debitur" }),
    trigger: debtorAction,
  });

  await openActionItem({ page, trigger: debtorAction, item: "Edit" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Edit Debitur" }),
    trigger: debtorAction,
  });

  await openActionItem({ page, trigger: debtorAction, item: "Hapus" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Hapus Debitur?" }),
    trigger: debtorAction,
  });

  const contractMode = page.getByRole("button", {
    name: /Kontrak \/ Pembiayaan/i,
  });
  await contractMode.click();

  const addContract = page.getByRole("button", { name: "Tambah Kontrak" });
  await addContract.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Tambah Kontrak" }),
    trigger: addContract,
  });

  const contractAction = page
    .getByRole("button", { name: /^Aksi kontrak /i })
    .first();
  await expect(contractAction).toBeVisible();

  await openActionItem({ page, trigger: contractAction, item: "Detail" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Detail Kontrak" }),
    trigger: contractAction,
  });

  await openActionItem({ page, trigger: contractAction, item: "Edit" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Edit Kontrak" }),
    trigger: contractAction,
  });

  await openActionItem({ page, trigger: contractAction, item: "Hapus" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Hapus Kontrak?" }),
    trigger: contractAction,
  });
});

test("Agunan membuka detail dan form import expired tanpa menyimpan perubahan", async ({
  page,
}) => {
  await page.goto("/dashboard/informasi-debitur", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /^Agunan A01\b/ }).click();

  const expiryImport = page.getByRole("button", {
    name: "Upload Excel Expired",
  });
  await expiryImport.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", {
      name: "Upload Excel Expired Agunan",
    }),
    trigger: expiryImport,
  });

  const collateralAction = page
    .getByRole("button", { name: /^Aksi agunan /i })
    .first();
  await expect(collateralAction).toBeVisible();
  await openActionItem({
    page,
    trigger: collateralAction,
    item: "Detail Agunan",
  });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Detail Agunan A01" }),
    trigger: collateralAction,
  });
});

test("Marketing dan tab Detail Debitur membuka form, detail, dokumen, serta surat peringatan", async ({
  page,
}) => {
  const marketingResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/debtor-marketing/action-plans") &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page.goto("/dashboard/informasi-debitur/marketing/action-plan", {
    waitUntil: "domcontentloaded",
  });
  const marketingResponse = await marketingResponsePromise;
  const payload = (await marketingResponse.json()) as unknown;
  const debtorId = findFirstDebtorId(payload);
  if (!debtorId) {
    throw new Error("Data Action Plan tidak memiliki debtor_id untuk audit modal.");
  }

  const addMarketing = page.getByRole("button", {
    name: "Tambah Action Plan",
  });
  await addMarketing.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Action Plan" }),
    trigger: addMarketing,
  });

  const marketingAction = page
    .getByRole("button", { name: "Aksi Action Plan" })
    .first();
  await expect(marketingAction).toBeVisible();
  await openActionItem({ page, trigger: marketingAction, item: "Detail" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Detail Action Plan" }),
    trigger: marketingAction,
  });

  await page.goto(`/dashboard/informasi-debitur/${debtorId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Laporan Summary" }).click();
  const activityTrigger = page
    .getByRole("button", { name: /^Buka detail /i })
    .first();
  await expect(activityTrigger).toBeVisible();
  await activityTrigger.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog").filter({
      has: page.getByRole("heading", { name: "Target Aktivitas" }),
    }),
    trigger: activityTrigger,
  });

  await page.getByRole("tab", { name: "Dokumen" }).click();
  const addDocument = page.getByRole("button", {
    name: "Tambah Dokumen Lainnya",
  });
  await addDocument.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Tambah Dokumen Lainnya" }),
    trigger: addDocument,
  });

  await page.getByRole("tab", { name: "Surat Peringatan" }).click();
  const uploadWarning = page.getByRole("button", {
    name: "Upload Surat Peringatan",
  });
  await uploadWarning.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Upload Surat Peringatan" }),
    trigger: uploadWarning,
  });
});

test("Import SLIK, riwayat job, dan IDEB pending membuka modal yang sesuai", async ({
  page,
}) => {
  await page.goto("/dashboard/informasi-debitur/admin/upload-slik", {
    waitUntil: "domcontentloaded",
  });
  const uploadImport = page.getByRole("button", { name: "Upload File" });
  await uploadImport.click();
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Import SLIK" }),
    trigger: uploadImport,
  });

  await page.goto("/dashboard/informasi-debitur/admin/monitoring-import", {
    waitUntil: "domcontentloaded",
  });
  const importAction = page
    .getByRole("button", { name: /^Aksi job import /i })
    .first();
  await expect(importAction).toBeVisible();
  await openActionItem({ page, trigger: importAction, item: "Detail" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", { name: "Detail Job Import" }),
    trigger: importAction,
  });

  await page
    .getByRole("button", { name: /IDEB Perlu Dihubungkan/i })
    .click();
  const idebAction = page
    .getByRole("button", { name: /^Aksi IDEB /i })
    .first();
  await expect(idebAction).toBeVisible();
  await openActionItem({ page, trigger: idebAction, item: "Detail" });
  await verifyAndClose({
    page,
    dialog: page.getByRole("dialog", {
      name: "Detail IDEB Belum Terhubung",
    }),
    trigger: idebAction,
  });
});
