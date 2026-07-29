import { expect, test } from "@playwright/test";

const SYNTHETIC_PASSWORD = "fixture-password-not-a-real-secret-12345";
const SYNTHETIC_IDENTITY_NUMBER = "9999999999999999";

test("halaman login memiliki form yang dapat diakses", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByAltText("Logo Ruwang Arsip")).toHaveCount(1);
  await expect(
    page.getByAltText("Logo Bank Syariah Riyal Irsyadi"),
  ).toHaveCount(0);

  await expect(
    page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username")).toHaveAttribute(
    "autocomplete",
    "username",
  );
  await expect(page.locator("input#password")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );

  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Username dan password harap diisi." }),
  ).toBeVisible();
});

test("halaman lupa password dapat dibuka dari login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Lupa Password?" }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(
    page.getByRole("heading", { name: "Lupa Password?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "autocomplete",
    "email",
  );
});

test("dashboard mengalihkan pengguna tanpa sesi ke login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" }),
  ).toBeVisible();
});

test("route yang tidak ada menampilkan halaman 404 yang aman", async ({ page }) => {
  await page.goto("/halaman-yang-tidak-ada");

  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kembali ke Dashboard" }),
  ).toHaveAttribute("href", "/dashboard");
});

test("error browser dilaporkan dengan payload observability yang aman", async ({
  page,
}) => {
  let capturedReport: Record<string, unknown> | null = null;
  await page.route("**/api/v1/client-errors", async (route) => {
    capturedReport = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ status: true, success: true }),
    });
  });
  await page.goto("/");

  await expect
    .poll(async () => {
      if (!capturedReport) {
        await page.evaluate(
          ({ syntheticPassword, syntheticIdentityNumber }) => {
            const event = new Event("unhandledrejection");
            Object.defineProperty(event, "reason", {
              value: new Error(
                `password=${syntheticPassword} ktp=${syntheticIdentityNumber}`,
              ),
            });
            window.dispatchEvent(event);
          },
          {
            syntheticPassword: SYNTHETIC_PASSWORD,
            syntheticIdentityNumber: SYNTHETIC_IDENTITY_NUMBER,
          },
        );
      }

      return capturedReport;
    })
    .not.toBeNull();
  expect(capturedReport).toEqual(
    expect.objectContaining({
      event_type: "unhandled_rejection",
      boundary: "browser",
      error_name: "Error",
      route_group: "authentication",
    }),
  );
  expect(JSON.stringify(capturedReport)).not.toContain(SYNTHETIC_PASSWORD);
  expect(JSON.stringify(capturedReport)).not.toContain(
    SYNTHETIC_IDENTITY_NUMBER,
  );
  expect(capturedReport).not.toHaveProperty("message");
  expect(capturedReport).not.toHaveProperty("stack");
  expect(capturedReport).not.toHaveProperty("url");
});
