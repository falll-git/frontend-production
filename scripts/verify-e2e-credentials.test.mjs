import assert from "node:assert/strict";
import test from "node:test";

import { validateE2eCredentials } from "./verify-e2e-credentials.mjs";

test("credential E2E lengkap diterima tanpa mengembalikan nilainya", () => {
  assert.deepEqual(
    validateE2eCredentials({
      E2E_USERNAME: "admin-test",
      E2E_PASSWORD: "password-rahasia",
    }),
    { usernamePresent: true, passwordPresent: true },
  );
});

test("username atau password E2E yang kosong ditolak", () => {
  assert.throws(
    () => validateE2eCredentials({ E2E_PASSWORD: "password-rahasia" }),
    /wajib diisi/,
  );
  assert.throws(
    () => validateE2eCredentials({ E2E_USERNAME: "admin-test" }),
    /wajib diisi/,
  );
  assert.throws(
    () =>
      validateE2eCredentials({
        E2E_USERNAME: "   ",
        E2E_PASSWORD: "password-rahasia",
      }),
    /wajib diisi/,
  );
});
