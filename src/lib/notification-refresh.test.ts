import { describe, expect, it, vi } from "vitest";

import { refreshNotificationPanel } from "@/lib/notification-refresh";

describe("refreshNotificationPanel", () => {
  it("menghitung badge setelah daftar dan reminder selesai dimuat", async () => {
    let finishList: (() => void) | undefined;
    const loadNotifications = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishList = resolve;
        }),
    );
    const refreshUnreadCount = vi.fn().mockResolvedValue(3);

    const refresh = refreshNotificationPanel({
      loadNotifications,
      refreshUnreadCount,
      showRefreshing: true,
    });

    expect(loadNotifications).toHaveBeenCalledWith({
      page: 1,
      showRefreshing: true,
    });
    expect(refreshUnreadCount).not.toHaveBeenCalled();

    finishList?.();
    await refresh;

    expect(refreshUnreadCount).toHaveBeenCalledTimes(1);
  });

  it("memakai status refresh nonaktif secara default", async () => {
    const loadNotifications = vi.fn().mockResolvedValue(undefined);
    const refreshUnreadCount = vi.fn().mockResolvedValue(0);

    await refreshNotificationPanel({ loadNotifications, refreshUnreadCount });

    expect(loadNotifications).toHaveBeenCalledWith({
      page: 1,
      showRefreshing: false,
    });
  });

  it("tidak menghitung badge jika pemuatan daftar gagal", async () => {
    const loadNotifications = vi.fn().mockRejectedValue(new Error("gagal"));
    const refreshUnreadCount = vi.fn().mockResolvedValue(0);

    await expect(
      refreshNotificationPanel({ loadNotifications, refreshUnreadCount }),
    ).rejects.toThrow("gagal");
    expect(refreshUnreadCount).not.toHaveBeenCalled();
  });
});
