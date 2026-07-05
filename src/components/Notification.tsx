"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  FileText,
  FolderOpen,
  Inbox,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  Trash2,
  X,
} from "lucide-react";

import {
  type AppNotification,
  notificationService,
} from "@/services/notification.service";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import type { PaginationMeta } from "@/types/api.types";

const PAGE_LIMIT = 10;

type NotificationTone = "info" | "warning" | "danger" | "success";
type NotificationAccent =
  | "info"
  | "due"
  | "danger"
  | "success"
  | "access"
  | "loan"
  | "incoming"
  | "memo"
  | "outgoing";

type NotificationVisual = {
  tone: NotificationTone;
  accent: NotificationAccent;
  moduleLabel: string;
  stateLabel: string;
  Icon: LucideIcon;
};

function formatTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function moduleLabel(moduleName: string): string {
  const normalized = String(moduleName || "").trim().toUpperCase();
  if (normalized === "DIGITAL_ARCHIVE") return "Arsip Digital";
  if (normalized === "CORRESPONDENCE") return "Manajemen Surat";
  return "Pemberitahuan";
}

function normalizeEventType(item: AppNotification): string {
  return String(item.eventType || "").trim().toUpperCase();
}

function normalizeEntityType(item: AppNotification): string {
  return String(item.entityType || "").trim().toUpperCase();
}

function isLegacySuccess(item: AppNotification): boolean {
  const text = `${item.title} ${item.message}`.toLowerCase();
  return (
    text.includes("selesai") ||
    text.includes("dikembalikan") ||
    text.includes("disetujui")
  );
}

function resolveTone(item: AppNotification): NotificationTone {
  const normalized = normalizeEventType(item);

  if (normalized === "REJECTED" || normalized === "OVERDUE") return "danger";
  if (normalized === "DUE_SOON" || normalized === "ACTION_REQUIRED") {
    return "warning";
  }
  if (
    normalized === "APPROVED" ||
    normalized === "COMPLETED" ||
    normalized === "RETURNED" ||
    isLegacySuccess(item)
  ) {
    return "success";
  }

  return "info";
}

function resolveEntityIcon(item: AppNotification): LucideIcon {
  const eventType = normalizeEventType(item);
  if (eventType === "APPROVED" || eventType === "COMPLETED") return ShieldCheck;
  if (eventType === "REJECTED") return ShieldX;
  if (eventType === "OVERDUE") return TriangleAlert;
  if (eventType === "DUE_SOON") return CalendarClock;

  const normalized = normalizeEntityType(item);

  switch (normalized) {
    case "DIGITAL_DOCUMENT_ACCESS_REQUEST":
      return FolderOpen;
    case "DIGITAL_DOCUMENT_LOAN":
      return Archive;
    case "INCOMING_MAIL_DISPOSITION":
      return Inbox;
    case "MEMORANDUM_DISPOSITION":
      return FileText;
    case "OUTGOING_MAIL":
      return Send;
    default:
      return BellRing;
  }
}

function stateLabel(item: AppNotification): string {
  const normalized = normalizeEventType(item);

  switch (normalized) {
    case "ACTION_REQUIRED":
      return "Perlu Tindakan";
    case "DUE_SOON":
      return "Mendekati Tenggat";
    case "OVERDUE":
      return "Lewat Tenggat";
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "COMPLETED":
      return "Selesai";
    case "RETURNED":
      return "Dikembalikan";
    default:
      return isLegacySuccess(item) ? "Selesai" : "Info";
  }
}

function resolveAccent(item: AppNotification): NotificationAccent {
  const eventType = normalizeEventType(item);
  if (eventType === "REJECTED" || eventType === "OVERDUE") return "danger";
  if (eventType === "DUE_SOON") return "due";
  if (
    eventType === "APPROVED" ||
    eventType === "COMPLETED" ||
    eventType === "RETURNED" ||
    isLegacySuccess(item)
  ) {
    return "success";
  }

  switch (normalizeEntityType(item)) {
    case "DIGITAL_DOCUMENT_ACCESS_REQUEST":
      return "access";
    case "DIGITAL_DOCUMENT_LOAN":
      return "loan";
    case "INCOMING_MAIL_DISPOSITION":
      return "incoming";
    case "MEMORANDUM_DISPOSITION":
      return "memo";
    case "OUTGOING_MAIL":
      return "outgoing";
    default:
      return "info";
  }
}

function buildVisual(item: AppNotification): NotificationVisual {
  return {
    tone: resolveTone(item),
    accent: resolveAccent(item),
    moduleLabel: moduleLabel(item.module),
    stateLabel: stateLabel(item),
    Icon: resolveEntityIcon(item),
  };
}

function getNotificationBadgeTone(tone: NotificationTone): SetupStatusTone {
  switch (tone) {
    case "warning":
      return "amber";
    case "danger":
      return "red";
    case "success":
      return "emerald";
    case "info":
    default:
      return "blue";
  }
}

const DEFAULT_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: PAGE_LIMIT,
  lastPage: 1,
};

export default function Notification() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isMutatingId, setIsMutatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshUnreadCount = useCallback(async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
    return count;
  }, []);

  const loadNotifications = useCallback(
    async ({
      page = 1,
      append = false,
      showRefreshing = false,
    }: {
      page?: number;
      append?: boolean;
      showRefreshing?: boolean;
    } = {}) => {
      if (append) setIsLoadingMore(true);
      if (showRefreshing && !append) setIsRefreshing(true);

      try {
        const list = await notificationService.getAll({
          page,
          limit: PAGE_LIMIT,
        });
        setItems((previous) =>
          append ? [...previous, ...list.data] : list.data,
        );
        setMeta(list.meta);
        setErrorMessage(null);
        return list;
      } catch {
        setErrorMessage(
          "Notifikasi belum dapat dimuat. Periksa koneksi atau coba lagi.",
        );
        throw new Error("NOTIFICATION_LOAD_FAILED");
      } finally {
        if (append) setIsLoadingMore(false);
        if (showRefreshing && !append) setIsRefreshing(false);
      }
    },
    [],
  );

  const refreshPanel = useCallback(async () => {
    await Promise.all([loadNotifications({ page: 1 }), refreshUnreadCount()]);
  }, [loadNotifications, refreshUnreadCount]);

  useEffect(() => {
    refreshPanel().catch(() => {});
    const interval = window.setInterval(() => {
      refreshUnreadCount().catch(() => {});
    }, 45000);

    return () => window.clearInterval(interval);
  }, [refreshPanel, refreshUnreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleOpen() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    try {
      await Promise.all([
        loadNotifications({ page: 1, showRefreshing: true }),
        refreshUnreadCount(),
      ]);
    } catch {
      return;
    }
  }

  async function handleReadAll() {
    setIsLoading(true);
    try {
      await notificationService.markAllRead();
      setItems((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Notifikasi belum dapat diperbarui. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearAll() {
    setIsClearingAll(true);
    try {
      await notificationService.clearAll();
      setItems([]);
      setMeta(DEFAULT_META);
      setUnreadCount(0);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Notifikasi belum dapat dibersihkan. Silakan coba lagi.");
    } finally {
      setIsClearingAll(false);
    }
  }

  async function handleClearOne(
    event: ReactMouseEvent<HTMLButtonElement>,
    item: AppNotification,
  ) {
    event.stopPropagation();
    setIsMutatingId(item.id);
    try {
      await notificationService.clearOne(item.id);
      setItems((previous) => previous.filter((entry) => entry.id !== item.id));
      setMeta((previous) => ({
        ...previous,
        total: Math.max(0, previous.total - 1),
      }));
      if (!item.isRead) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
      setErrorMessage(null);
    } catch {
      setErrorMessage("Notifikasi belum dapat dihapus. Silakan coba lagi.");
    } finally {
      setIsMutatingId(null);
    }
  }

  async function handleLoadMore() {
    if (meta.page >= meta.lastPage) return;
    try {
      await loadNotifications({
        page: meta.page + 1,
        append: true,
      });
    } catch {
      return;
    }
  }

  async function handleSelect(item: AppNotification) {
    setIsLoading(true);
    try {
      if (!item.isRead) {
        await notificationService.markRead(item.id);
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }

      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                isRead: true,
                readAt: entry.readAt ?? new Date().toISOString(),
              }
            : entry,
        ),
      );
      setIsOpen(false);
      setErrorMessage(null);

      if (item.linkUrl && item.linkUrl.startsWith("/")) {
        router.push(item.linkUrl);
      }
    } catch {
      setErrorMessage("Notifikasi belum dapat diproses. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  const totalLoaded = items.length;
  const hasMore = meta.page < meta.lastPage;
  const hasItems = items.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="nav-notif-btn"
        onClick={handleOpen}
        aria-label="Notifikasi"
        aria-expanded={isOpen}
      >
        <Bell className="nav-notif-bell" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="nav-notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <div className="notif-panel-header-copy">
              <h3 className="notif-title">Notifikasi</h3>
              <p className="notif-subtitle">
                {unreadCount} belum dibaca
                {meta.total > 0 ? ` dari ${meta.total} notifikasi` : ""}
              </p>
            </div>
            <div className="notif-panel-actions">
              <button
                type="button"
                className="notif-header-action"
                onClick={handleReadAll}
                disabled={isLoading || unreadCount === 0}
                title="Tandai semua dibaca"
              >
                <CheckCheck className="notif-header-action-icon" aria-hidden="true" />
                <span>Tandai dibaca</span>
              </button>
              <button
                type="button"
                className="notif-header-action notif-header-action-danger"
                onClick={handleClearAll}
                disabled={isClearingAll || !hasItems}
                title="Bersihkan semua"
              >
                <Trash2 className="notif-header-action-icon" aria-hidden="true" />
                <span>Hapus semua</span>
              </button>
            </div>
          </div>

          <div className="notif-list">
            {errorMessage ? (
              <div className="notif-error" role="status" aria-live="polite">
                <CircleAlert className="notif-error-icon" aria-hidden="true" />
                <span>{errorMessage}</span>
                <button
                  type="button"
                  className="notif-retry"
                  onClick={() => refreshPanel().catch(() => {})}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`notif-retry-icon ${
                      isRefreshing ? "notif-retry-icon-spin" : ""
                    }`}
                    aria-hidden="true"
                  />
                  Coba lagi
                </button>
              </div>
            ) : null}

            {!errorMessage && !hasItems ? (
              <SetupEmptyState
                title="Belum ada notifikasi"
                description="Pemberitahuan dari arsip digital dan manajemen surat akan tampil di sini."
                icon={BellRing}
                tone="neutral"
                variant="compact"
                className="notif-empty"
              />
            ) : (
              items.map((item) => {
                const visual = buildVisual(item);
                const Icon = visual.Icon;

                return (
                  <div
                    key={item.id}
                    className={`notif-item notif-accent-${visual.accent} ${
                      item.isRead ? "notif-item-read" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="notif-item-main"
                      onClick={() => handleSelect(item)}
                      disabled={isLoading}
                    >
                      <span className="notif-icon-wrap">
                        <Icon className="notif-item-icon" aria-hidden="true" />
                      </span>
                      <span className="notif-content">
                        <span className="notif-item-labels">
                          <SetupStatusBadge
                            status={visual.moduleLabel}
                            tone="slate"
                            showIcon={false}
                            size="sm"
                            className="notif-module-badge"
                          />
                          <SetupStatusBadge
                            status={visual.stateLabel}
                            tone={getNotificationBadgeTone(visual.tone)}
                            size="sm"
                            className="notif-state-badge"
                          />
                        </span>
                        <span className="notif-item-title">{item.title}</span>
                        <span className="notif-item-message">{item.message}</span>
                        <span className="notif-item-footer">
                          <span className="notif-item-time">
                            {formatTime(item.createdAt)}
                          </span>
                          {!item.isRead ? (
                            <SetupStatusBadge
                              status="Baru"
                              tone="blue"
                              showIcon={false}
                              size="sm"
                              className="notif-unread-inline"
                            />
                          ) : null}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="notif-item-clear"
                      onClick={(event) => handleClearOne(event, item)}
                      disabled={isMutatingId === item.id}
                      title="Hapus notifikasi"
                      aria-label={`Hapus notifikasi ${item.title}`}
                    >
                      <X className="notif-item-clear-icon" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {hasItems ? (
            <div className="notif-panel-footer">
              <span className="notif-panel-footer-text">
                Menampilkan {totalLoaded} notifikasi terbaru
              </span>
              {hasMore ? (
                <button
                  type="button"
                  className="notif-load-more"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Memuat..." : "Muat lagi"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
