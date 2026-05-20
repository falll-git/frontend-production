"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export default function Notification() {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="nav-notif-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifikasi"
        aria-expanded={isOpen}
      >
        <Bell className="nav-notif-bell" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h3 className="text-sm font-bold text-gray-900">Notifikasi</h3>
            <span className="text-xs text-gray-500">0 belum dibaca</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="p-4 text-center text-sm text-gray-400">
              Tidak ada notifikasi
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
