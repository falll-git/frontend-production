export const AUTH_STORAGE_KEYS = {
  legacyUserId: "ruang-arsip.session.userId",
  sessionUser: "ruang-arsip.session.user",
  persistedUser: "ruang-arsip.session.persisted.user",
  sessionAccessToken: "ruang-arsip.session.accessToken",
  persistedAccessToken: "ruang-arsip.session.persisted.accessToken",
  sessionRefreshToken: "ruang-arsip.session.token",
  persistedRefreshToken: "ruang-arsip.session.persisted.token",
} as const;

export function clearAuthBrowserStorage(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_STORAGE_KEYS.legacyUserId);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.sessionUser);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.persistedUser);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.sessionAccessToken);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.persistedAccessToken);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.sessionRefreshToken);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.persistedRefreshToken);
}
