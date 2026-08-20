import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

type ModalCallerMatrixFixture = {
  kind: "ruwang-arsip-modal-caller-matrix";
  version: 1;
  user: { id: string; name: string; username: string; email: string };
};

const backendDirectory = process.env.E2E_BACKEND_DIR?.trim();
const fixtureScript = backendDirectory
  ? path.join(backendDirectory, "scripts", "modal-caller-matrix-fixtures.js")
  : "";
const fixtureManifestPath = path.join(
  os.tmpdir(),
  "ruwang-arsip-modal-caller-matrix.json",
);

test.describe.configure({ mode: "serial" });
test.skip(
  !backendDirectory,
  "E2E_BACKEND_DIR wajib tersedia untuk fixture matriks modal.",
);

let fixture: ModalCallerMatrixFixture;

function runFixture(action: "setup" | "cleanup") {
  if (!backendDirectory || !fixtureScript) {
    throw new Error("Repository backend tidak tersedia untuk fixture matriks modal.");
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
  ) as ModalCallerMatrixFixture;
  if (
    value.kind !== "ruwang-arsip-modal-caller-matrix" ||
    value.version !== 1 ||
    !value.user?.id ||
    !value.user?.username
  ) {
    throw new Error("Manifest fixture matriks modal tidak valid.");
  }
  return value;
}

async function openAssertAndClose({
  page,
  trigger,
  dialogName,
}: {
  page: Page;
  trigger: Locator;
  dialogName: RegExp;
}) {
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: dialogName });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
}

test.beforeAll(() => {
  runFixture("cleanup");
  runFixture("setup");
  fixture = readFixture();
});

test.afterAll(() => {
  runFixture("cleanup");
});

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("form parameter umum terbuka dan memenuhi kontrak modal", async ({
  page,
}) => {
  const scenarios = [
    {
      route: "/dashboard/parameter/divisi",
      trigger: "Tambah Divisi",
      dialog: /Tambah Divisi/i,
    },
    {
      route: "/dashboard/parameter/jenis-dokumen",
      trigger: "Tambah Jenis",
      dialog: /Tambah Jenis Dokumen/i,
    },
    {
      route: "/dashboard/parameter/prioritas-surat",
      trigger: "Tambah Prioritas",
      dialog: /Tambah Prioritas Surat/i,
    },
    {
      route: "/dashboard/parameter/role",
      trigger: "Tambah Role",
      dialog: /Tambah Role/i,
    },
    {
      route: "/dashboard/parameter/tempat-penyimpanan",
      trigger: "Tambah Tempat",
      dialog: /Tambah Tempat Penyimpanan/i,
    },
  ] as const;

  for (const scenario of scenarios) {
    await page.goto(scenario.route);
    await openAssertAndClose({
      page,
      trigger: page.getByRole("button", {
        name: scenario.trigger,
        exact: true,
      }),
      dialogName: scenario.dialog,
    });
  }
});

test("form parameter master terbuka dari konfigurasi cabang", async ({
  page,
}) => {
  await page.goto("/dashboard/parameter/cabang");
  const trigger = page.getByRole("button", { name: /Tambah/i }).first();
  await openAssertAndClose({
    page,
    trigger,
    dialogName: /Tambah/i,
  });
});

test("pengaturan fitur role terbuka tanpa memutus alur fokus", async ({
  page,
}) => {
  await page.goto("/dashboard/parameter/role-menu");

  const roleControl = page.getByLabel("Pilih Role");
  await expect(roleControl).toBeVisible();
  await roleControl.selectOption({ label: "Admin" });

  const trigger = page.getByRole("button", { name: "Atur fitur" }).first();
  await openAssertAndClose({
    page,
    trigger,
    dialogName: /Atur Fitur/i,
  });
});

test("form, undangan, dan aksi pengguna memenuhi kontrak modal", async ({
  page,
}) => {
  await page.goto("/dashboard/users");

  const addTrigger = page.getByRole("button", {
    name: "Tambah Pengguna",
    exact: true,
  });
  await addTrigger.click();
  const addDialog = page.getByRole("dialog", { name: /Tambah Pengguna/i });
  await assertModalPresentation(page, addDialog);

  const syntheticId = "00000000-0000-4000-8000-000000000067";
  await page.route("**/api/v1/users", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        status: true,
        data: {
          id: syntheticId,
          name: payload.name,
          username: payload.username,
          email: payload.email,
          role_id: payload.role_id,
          division_id: payload.division_id,
          is_active: true,
          onboarding_status: "PENDING_ACTIVATION",
          invitation: {
            type: "INVITE",
            url: "http://127.0.0.1:3000/set-password?token=fixture-modal",
            delivery: {
              channel: "email",
              status: "not_sent",
              reason: "SMTP_NOT_CONFIGURED",
            },
          },
        },
      }),
    });
  });

  await addDialog.getByLabel("Nama Lengkap").fill("Undangan Modal Regression");
  await addDialog.getByLabel("Username").fill("undangan_modal_regression");
  await addDialog
    .getByLabel("Email")
    .fill("undangan_modal_regression@integration.invalid");
  await addDialog.getByLabel("Divisi").selectOption({ index: 1 });
  await addDialog.getByLabel("Peran").selectOption({ index: 1 });
  await addDialog
    .getByRole("button", { name: "Simpan & Kirim Undangan" })
    .click();

  const invitationDialog = page.getByRole("dialog", {
    name: "Undangan Siap Dibagikan",
  });
  await assertModalPresentation(page, invitationDialog);
  await expect(invitationDialog).toContainText(
    "undangan_modal_regression@integration.invalid",
  );
  await expect(
    invitationDialog.getByRole("button", { name: "Salin Link" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(invitationDialog).toHaveCount(0);

  await page.getByLabel("Cari Data").fill(fixture.user.username);
  const userRow = page.getByRole("row").filter({ hasText: fixture.user.username });
  await expect(userRow).toBeVisible();

  const actionTrigger = userRow.getByRole("button", {
    name: "Buka aksi pengguna",
  });

  await actionTrigger.click();
  const editTrigger = page.getByRole("menuitem", { name: "Edit", exact: true });
  await editTrigger.click();
  const editDialog = page.getByRole("dialog", { name: /Edit Pengguna/i });
  await assertModalPresentation(page, editDialog);
  await page.keyboard.press("Escape");
  await expect(editDialog).toHaveCount(0);
  await expect(actionTrigger).toBeFocused();

  await actionTrigger.click();
  const accessTrigger = page
    .getByRole("menuitem", {
      name: /Tutup Akses|Aktifkan Kembali/,
    })
    .first();
  await accessTrigger.click();
  const accessDialog = page.getByRole("dialog", {
    name: /Tutup Akses Pengguna|Aktifkan Kembali Pengguna/i,
  });
  await assertModalPresentation(page, accessDialog);
  await page.keyboard.press("Escape");
  await expect(accessDialog).toHaveCount(0);
  await expect(actionTrigger).toBeFocused();

  await actionTrigger.click();
  const deleteTrigger = page.getByRole("menuitem", {
    name: "Hapus",
    exact: true,
  });
  await deleteTrigger.click();
  const deleteDialog = page.getByRole("dialog", {
    name: /Hapus Pengguna Permanen/i,
  });
  await assertModalPresentation(page, deleteDialog);
  await page.keyboard.press("Escape");
  await expect(deleteDialog).toHaveCount(0);
  await expect(actionTrigger).toBeFocused();
});
