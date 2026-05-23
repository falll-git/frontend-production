"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  Clock,
  MailOpen,
  RefreshCw,
} from "lucide-react";

import {
  type AppNotification,
  notificationService,
} from "@/services/notification.service";

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

function priorityClass(priority: string): string {
  const normalized = priority.toUpperCase();
  if (normalized === "CRITICAL") return "notif-item-critical";
  if (normalized === "HIGH") return "notif-item-high";
  return "notif-item-normal";
}

function eventIcon(eventType: string) {
  const normalized = eventType.toUpperCase();
  if (normalized === "OVERDUE" || normalized === "REJECTED") {
    return <CircleAlert className="notif-item-icon" aria-hidden="true" />;
  }
  if (normalized === "DUE_SOON") {
    return <Clock className="notif-item-icon" aria-hidden="true" />;
  }
  return <MailOpen className="notif-item-icon" aria-hidden="true" />;
}

export default function Notification() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);

    try {
      const [list, count] = await Promise.all([
        notificationService.getAll({ limit: 10 }),
        notificationService.getUnreadCount(),
      ]);
      setItems(list.data);
      setUnreadCount(count);
      setErrorMessage(null);
    } catch {
      setErrorMessage(
        "Notifikasi belum dapat dimuat. Periksa koneksi atau coba lagi.",
      );
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 45000);
    return () => window.clearInterval(interval);
  }, [refreshNotifications]);

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
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      await refreshNotifications(true);
    }
  }

  async function handleReadAll() {
    setIsLoading(true);
    try {
      await notificationService.markAllRead();
      await refreshNotifications(true);
    } catch {
      setErrorMessage("Notifikasi belum dapat diperbarui. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelect(item: AppNotification) {
    setIsLoading(true);
    try {
      if (!item.isRead) {
        await notificationService.markRead(item.id);
      }
      await refreshNotifications(true);
      setIsOpen(false);
      if (item.linkUrl && item.linkUrl.startsWith("/")) {
        router.push(item.linkUrl);
      }
    } catch {
      setErrorMessage("Notifikasi belum dapat diproses. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

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
            <div>
              <h3 className="notif-title">Notifikasi</h3>
              <p className="notif-subtitle">{unreadCount} belum dibaca</p>
            </div>
            <button
              type="button"
              className="notif-read-all"
              onClick={handleReadAll}
              disabled={isLoading || unreadCount === 0}
              title="Tandai semua dibaca"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="notif-list">
            {errorMessage ? (
              <div className="notif-error" role="status" aria-live="polite">
                <CircleAlert className="notif-error-icon" aria-hidden="true" />
                <span>{errorMessage}</span>
                <button
                  type="button"
                  className="notif-retry"
                  onClick={() => refreshNotifications(true)}
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

            {!errorMessage && items.length === 0 ? (
              <div className="notif-empty">Tidak ada notifikasi</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notif-item ${priorityClass(item.priority)} ${
                    item.isRead ? "notif-item-read" : ""
                  }`}
                  onClick={() => handleSelect(item)}
                  disabled={isLoading}
                >
                  <span className="notif-icon-wrap">
                    {eventIcon(item.eventType)}
                  </span>
                  <span className="notif-content">
                    <span className="notif-item-title">{item.title}</span>
                    <span className="notif-item-message">{item.message}</span>
                    <span className="notif-item-time">
                      {formatTime(item.createdAt)}
                    </span>
                  </span>
                  {!item.isRead ? <span className="notif-unread-dot" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
