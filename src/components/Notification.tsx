"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/types/dashboard.types";

export default function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const unreadCount = notifications.filter((notification) => notification.unread)
    .length;

  const handleMarkAsRead = (id: NotificationItem["id"]) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification,
      ),
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="nav-notif-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifikasi"
      >
        <Bell className="nav-notif-bell" />
        {unreadCount > 0 ? (
          <span className="absolute right-0 top-0 inline-flex -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full border border-white bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-red-100">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right animate-in overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-out fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h3 className="text-sm font-bold text-gray-900">Notifikasi</h3>
            <span className="text-xs text-gray-500">
              {unreadCount} belum dibaca
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`cursor-pointer border-b border-gray-50 p-4 transition-colors hover:bg-gray-50 ${
                    notification.unread ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <p
                      className={`text-sm ${
                        notification.unread
                          ? "font-bold text-blue-900"
                          : "font-medium text-gray-900"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <span className="ml-2 whitespace-nowrap text-[10px] text-gray-400">
                      {notification.time}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-600">
                    {notification.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
