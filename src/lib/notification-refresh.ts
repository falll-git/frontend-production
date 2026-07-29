type RefreshNotificationPanelOptions = {
  loadNotifications: (options: {
    page: number;
    showRefreshing: boolean;
  }) => Promise<unknown>;
  refreshUnreadCount: () => Promise<unknown>;
  showRefreshing?: boolean;
};

export async function refreshNotificationPanel({
  loadNotifications,
  refreshUnreadCount,
  showRefreshing = false,
}: RefreshNotificationPanelOptions): Promise<void> {
  await loadNotifications({ page: 1, showRefreshing });
  await refreshUnreadCount();
}
