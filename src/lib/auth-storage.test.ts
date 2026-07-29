import { beforeEach, describe, expect, it } from "vitest";

import {
  AUTH_STORAGE_KEYS,
  clearAuthBrowserStorage,
  hasPersistedAuthSession,
} from "@/lib/auth-storage";

describe("auth browser storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("mendeteksi sesi persisten hanya dari marker user persisten", () => {
    expect(hasPersistedAuthSession()).toBe(false);
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.sessionUser, "session");
    expect(hasPersistedAuthSession()).toBe(false);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.persistedUser, "persisted");
    expect(hasPersistedAuthSession()).toBe(true);
  });

  it("menghapus seluruh key auth lama dan baru dari kedua storage", () => {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.legacyUserId, "value");
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.sessionUser, "value");
    window.localStorage.setItem(AUTH_STORAGE_KEYS.persistedUser, "value");
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEYS.sessionAccessToken,
      "value",
    );
    window.localStorage.setItem(
      AUTH_STORAGE_KEYS.persistedAccessToken,
      "value",
    );
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEYS.sessionRefreshToken,
      "value",
    );
    window.localStorage.setItem(
      AUTH_STORAGE_KEYS.persistedRefreshToken,
      "value",
    );

    clearAuthBrowserStorage();

    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.legacyUserId)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionUser)).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedUser)).toBeNull();
    expect(
      window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionAccessToken),
    ).toBeNull();
    expect(
      window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedAccessToken),
    ).toBeNull();
    expect(
      window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionRefreshToken),
    ).toBeNull();
    expect(
      window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedRefreshToken),
    ).toBeNull();
  });
});
