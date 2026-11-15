import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

import { login } from "./support/auth";

const now = "2026-08-31T00:00:00.000Z";
const directAction = { available: true, reason: null, reason_code: null, mode: "DIRECT" };
const settings = {
  institution_id: "bprs-modal-runtime",
  installation_id: "installation-modal-runtime",
  key_id: "key-modal-runtime",
  central_base_url: "http://127.0.0.1:4320",
  contract_version: 1,
  taxonomy_version: 1,
  connection_state: "ACTIVE",
  review_authority: "local",
  module_visible: true,
  draft_enabled: true,
  review_enabled: true,
  review_submission_ready: true,
  sync_enabled: true,
  publish_enabled: true,
  filesystem_upload_enabled: true,
  s3_upload_enabled: false,
  last_success_at: null,
  last_error_at: null,
  last_error_code: null,
  entry_actions: {
    scope: "START_ACTION",
    expected_version: null,
    revalidated_on_submit: true,
    actions: {
      create_publication: directAction,
      create_contact: directAction,
      create_profile: directAction,
      upload_media: directAction,
      reconcile: directAction,
    },
  },
};

const contact = {
  id: "contact-modal-runtime",
  label: "Marketing katalog wilayah Bandung dengan nama yang panjang",
  phone_e164: "+6281234567890",
  state: "VERIFIED",
  is_default: true,
  sync_state: "ACKNOWLEDGED",
  aggregate_version: 1,
  lock_version: 1,
  current_version_id: "contact-version-modal-runtime",
  draft_version_id: null,
  rejection_reason: null,
  last_verified_at: now,
  revoked_at: null,
  created_at: now,
  updated_at: now,
};

const profile = {
  id: "profile-modal-runtime",
  display_name: "BPRS Uji Modal Runtime dengan Nama Resmi yang Panjang",
  public_slug: "bprs-uji-modal-runtime",
  city_regency: "Bandung",
  province: "Jawa Barat",
  short_description: "Profil khusus pengujian browser pada database disposable.",
  logo_media_id: "logo-modal-runtime",
  logo_ready: true,
  logo_preview_url: null,
  website_url: null,
  state: "VERIFIED",
  sync_state: "ACKNOWLEDGED",
  aggregate_version: 1,
  lock_version: 1,
  current_version_id: "profile-version-modal-runtime",
  draft_version_id: null,
  rejection_reason: null,
  created_at: now,
  updated_at: now,
};

const version = {
  id: "publication-version-modal-runtime",
  version_number: 1,
  state: "SUBMITTED",
  taxonomy_version: 1,
  subcategory: "HOUSE",
  title:
    "Rumah tinggal dua lantai dengan halaman luas dan akses jalan utama untuk pemeriksaan modal",
  description:
    "Deskripsi publik yang panjang digunakan untuk memastikan isi modal tetap dapat dipindai, digulir, dan tidak melebar keluar layar pada seluruh viewport yang didukung.",
  city_regency: "Bandung",
  province: "Jawa Barat",
  availability: "AVAILABLE",
  whatsapp_contact: {
    id: contact.id,
    version_id: contact.current_version_id,
    label: contact.label,
    phone_ending: "7890",
  },
  profile_version_id: profile.current_version_id,
  attributes: {
    land_area_m2: 180,
    building_area_m2: 145,
    public_condition: "GOOD",
  },
  media: [],
  submitted_at: now,
  approved_at: null,
  rejection_reason: null,
  created_at: now,
};

const publication = {
  id: "publication-modal-runtime",
  reference_code: "SJ-MODAL01",
  source_type: "COLLATERAL",
  source_collateral_id: "collateral-modal-runtime",
  owner_division: { id: "division-modal-runtime", name: "Marketing" },
  asset_category: "BUILDING",
  state: "IN_REVIEW",
  sync_state: "NOT_QUEUED",
  aggregate_version: 1,
  lock_version: 2,
  next_reconfirmation_at: null,
  last_confirmed_at: null,
  last_sync_error_code: null,
  title: version.title,
  city_regency: version.city_regency,
  province: version.province,
  cover: null,
  current_version: version,
  published_version: null,
  reviews: [],
  created_at: now,
  updated_at: now,
};

const submission = {
  id: "profile-version-modal-runtime",
  kind: "PROFILE",
  request_kind: "CHANGE",
  resource_id: profile.id,
  resource_label: profile.display_name,
  submitted_by: { id: "user-modal-runtime", name: "Admin BPRS Uji" },
  submitted_at: now,
  version_number: 2,
  payload_checksum: "sha256:profile-modal-runtime",
  review_state: "REVISION_REQUIRED",
  reviewer_note: "Lengkapi deskripsi wilayah layanan sebelum diajukan kembali.",
  delivery_state: "RECEIVED_BY_CONTROL",
  bank_application_state: "APPLIED_BY_BANK",
  public_state: "PUBLIC_UNKNOWN",
  snapshot: {
    display_name: profile.display_name,
    city_regency: profile.city_regency,
    province: profile.province,
    short_description: profile.short_description,
  },
};

const reviewPublication = {
  ...publication,
  action_availability: {
    scope: "START_ACTION",
    expected_version: publication.lock_version,
    revalidated_on_submit: true,
    actions: {
      request_revision: directAction,
      approve: directAction,
      edit_draft: { available: false, reason: "Sedang diperiksa.", reason_code: "INVALID_STATE", mode: "DIRECT" },
      submit: { available: false, reason: "Sudah diajukan.", reason_code: "INVALID_STATE", mode: "DIRECT" },
      unpublish: { available: false, reason: "Belum diterbitkan.", reason_code: "INVALID_STATE", mode: "DIRECT" },
      reconfirm: { available: false, reason: "Belum diterbitkan.", reason_code: "INVALID_STATE", mode: "DIRECT" },
      archive: { available: false, reason: "Sedang diperiksa.", reason_code: "INVALID_STATE", mode: "DIRECT" },
      check_public: { available: false, reason: "Belum diterbitkan.", reason_code: "INVALID_STATE", mode: "DIRECT" },
    },
  },
  review_source: {
    type: "COLLATERAL",
    collateral: {
      id: "collateral-modal-runtime",
      collateral_number: "AGUNAN-MODAL-01",
      collateral_type: "SHM",
      location_city_code: null,
      description: "Rumah tinggal untuk verifikasi modal browser.",
      period_month: null,
    },
  },
};

const taxonomy = {
  version: 1,
  categories: [
    {
      code: "BUILDING",
      items: [
        {
          id: "taxonomy-house-modal-runtime",
          code: "HOUSE",
          label: "Rumah tinggal",
          required_fields: ["land_area_m2", "building_area_m2"],
        },
      ],
    },
  ],
  vocabularies: {
    public_condition: ["GOOD"],
    contour: [],
    road_access: [],
    public_usage: [],
    transmission: [],
    fuel_type: [],
  },
};

function json(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  });
}

function cursorPage(items: unknown[], limit: number, order = "CREATED_DESC_ID_DESC") {
  return {
    items,
    page_info: { limit, order, has_more: false, next_cursor: null, count_scope: "CURRENT_PAGE" },
  };
}

async function installSeputarJaminanFixtures(page: Page) {
  await page.route("**/api/v1/digital-documents?**", (route) =>
    json(route, { items: [], total: 0, page: 1, limit: 100, lastPage: 1 }),
  );

  await page.route("**/api/v1/seputar-jaminan/**", (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.abort("blockedbyclient");

    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api\/v1/, "");
    const paged = url.searchParams.get("paged") === "true";
    const limit = Number(url.searchParams.get("limit") ?? 20);
    if (pathname === "/seputar-jaminan/taxonomy") return json(route, taxonomy);
    if (pathname === "/seputar-jaminan/settings") {
      return json(route, settings);
    }
    if (pathname === "/seputar-jaminan/profile") return json(route, profile);
    if (pathname === "/seputar-jaminan/contacts") {
      const state = url.searchParams.get("state");
      const contacts = !state || state === contact.state ? [contact] : [];
      return json(route, paged ? cursorPage(contacts, limit) : contacts);
    }
    if (pathname === "/seputar-jaminan/reviews") {
      return json(route, paged ? cursorPage([reviewPublication], limit) : [reviewPublication]);
    }
    if (pathname === "/seputar-jaminan/submissions") {
      return json(route, cursorPage([submission], limit, "SUBMITTED_AT_DESC_CREATED_AT_DESC_ID_DESC_KIND_ASC"));
    }
    if (pathname === "/seputar-jaminan/eligible-collaterals") {
      return json(route, {
        items: [],
        pagination: { page: 1, limit, total: 0, total_pages: 0 },
      });
    }
    if (pathname === `/seputar-jaminan/publications/${publication.id}`) {
      return json(route, publication);
    }
    if (pathname === "/seputar-jaminan/publications") {
      return json(route, cursorPage([publication], limit));
    }
    if (pathname === "/seputar-jaminan/media") return json(route, []);

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Fixture endpoint tidak terdaftar." }),
    });
  });
}

async function expectModalRuntimeContract(page: Page, dialogName: string) {
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(
    "hidden",
  );

  const layout = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.documentOverflow).toBeLessThanOrEqual(1);

  const accessibility = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    accessibility.violations,
    accessibility.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);

  return dialog;
}

test.beforeEach(async ({ page }) => {
  await login(page);
  await installSeputarJaminanFixtures(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("lima modal Seputar Jaminan memenuhi kontrak runtime", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard/seputar-jaminan/publikasi", {
    waitUntil: "domcontentloaded",
  });

  const detailOpener = page.getByRole("button", { name: /^Aksi publikasi / });
  await detailOpener.press("Enter");
  await page.getByRole("menuitem", { name: "Lihat detail", exact: true }).press("Enter");
  let dialog = await expectModalRuntimeContract(page, version.title);
  await page.screenshot({
    path: testInfo.outputPath("catalog-detail.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(detailOpener).toBeFocused();

  const formOpener = page.getByRole("button", { name: "Buat publikasi" });
  await expect(formOpener).toBeEnabled();
  await formOpener.press("Enter");
  dialog = await expectModalRuntimeContract(page, "Buat publikasi baru");
  await expect(dialog.getByLabel("Sumber data")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("catalog-form.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(formOpener).toBeFocused();

  await page.goto("/dashboard/seputar-jaminan/pemeriksaan", {
    waitUntil: "domcontentloaded",
  });
  const reviewOpener = page.getByRole("button", { name: /^Aksi pemeriksaan / });
  await reviewOpener.press("Enter");
  await page.getByRole("menuitem", { name: "Minta perbaikan" }).press("Enter");
  dialog = await expectModalRuntimeContract(page, "Minta revisi?");
  await expect(dialog.getByLabel(/Bagian yang perlu diperbaiki/)).toBeVisible();
  await dialog.getByRole("button", { name: "Kirim catatan" }).click();
  await expect(dialog.getByRole("alert")).toContainText("sedikitnya 5 karakter");
  await expect(dialog.getByLabel(/Bagian yang perlu diperbaiki/)).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("review-decision.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(reviewOpener).toBeFocused();

  await page.goto("/dashboard/seputar-jaminan/kontak", {
    waitUntil: "domcontentloaded",
  });
  const contactOpener = page.getByRole("button", { name: "Tambah kontak" });
  await expect(contactOpener).toBeEnabled();
  await contactOpener.press("Enter");
  dialog = await expectModalRuntimeContract(page, "Tambah kontak WhatsApp");
  await expect(dialog.getByLabel("Nama kontak")).toBeVisible();
  await expect(dialog.getByLabel("Nomor WhatsApp")).toHaveAttribute("inputmode", "tel");
  await page.screenshot({
    path: testInfo.outputPath("contact-form.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(contactOpener).toBeFocused();

  await page.goto("/dashboard/seputar-jaminan/pengajuan", {
    waitUntil: "domcontentloaded",
  });
  const submissionOpener = page.getByRole("button", { name: /^Aksi pengajuan / });
  await submissionOpener.press("Enter");
  await page.getByRole("menuitem", { name: "Lihat detail", exact: true }).press("Enter");
  dialog = await expectModalRuntimeContract(page, profile.display_name);
  await expect(dialog.getByText("Catatan pemeriksa", { exact: true })).toBeVisible();
  await expect(dialog.getByText(submission.reviewer_note, { exact: true })).toBeVisible();
  await expect(dialog.getByText("Diterapkan di bank", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Tampil publik", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("submission-detail.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(submissionOpener).toBeFocused();
});
