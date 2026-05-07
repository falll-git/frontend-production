"use client";

import { JSX, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  duration?: number;
}

interface ToastItemComponentProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
  duration?: number;
  index: number;
}

const toastConfig: Record<
  ToastType,
  {
    background: string;
    icon: JSX.Element;
    label: string;
  }
> = {
  success: {
    background: "#16a34a",
    label: "Berhasil",
    icon: <Check size={20} />,
  },
  error: {
    background: "#dc2626",
    label: "Gagal",
    icon: <AlertCircle size={20} />,
  },
  warning: {
    background: "#d97706",
    label: "Peringatan",
    icon: <AlertTriangle size={20} />,
  },
  info: {
    background: "#157ec3",
    label: "Informasi",
    icon: <Info size={20} />,
  },
};

function ToastItemComponent({
  toast,
  onRemove,
  duration = 3000,
  index,
}: ToastItemComponentProps): JSX.Element {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onRemove, toast.id]);

  const config = toastConfig[toast.type];

  return (
    <div
      className={`transition-colors duration-150 transform ${
        isLeaving
          ? "opacity-0 translate-x-full scale-95"
          : "opacity-100 translate-x-0 scale-100"
      }`}
      style={{
        marginBottom: "12px",
        animation: "slideInRight 0.3s ease-out",
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        role="alert"
        style={{
          background: config.background,
          width: "340px",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "start",
          borderRadius: "8px",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.16)",
        }}
        className="group relative backdrop-blur-sm"
      >
        <div className="flex items-center justify-center w-7 h-7 mr-3 text-white shrink-0 bg-white/20 rounded-full">
          {config.icon}
        </div>

        <div className="flex flex-col flex-1">
          <span className="text-[10px] uppercase font-bold text-white/80 leading-none mb-1 tracking-wide">
            {config.label}
          </span>
          <div className="font-semibold text-sm text-white leading-tight">
            {toast.message}
          </div>
        </div>

        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(() => onRemove(toast.id), 300);
          }}
          aria-label="Tutup"
          className="ml-2 p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
        >
          <X size={16} />
        </button>

        <div
          className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
          style={{
            animation: `shrink ${duration}ms linear forwards`,
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onRemove,
  duration = 3000,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-10000 flex flex-col">
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
      {toasts.slice(0, 5).map((toast, index) => (
        <ToastItemComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          duration={duration}
          index={index}
        />
      ))}
    </div>
  );
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let closeTimer: NodeJS.Timeout;
    let animationFrame = 0;

    if (isVisible) {
      animationFrame = window.requestAnimationFrame(() => {
        setIsLeaving(false);
      });
      timer = setTimeout(() => {
        setIsLeaving(true);
        closeTimer = setTimeout(onClose, 300);
      }, duration);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const config = toastConfig[type];

  return (
    <div
      className={`fixed top-24 right-6 z-10000 transition-colors duration-150 transform ${
        isLeaving
          ? "opacity-0 translate-x-full scale-95"
          : "opacity-100 translate-x-0 scale-100"
      }`}
    >
      <style jsx global>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
      <div
        role="alert"
        style={{
          background: config.background,
          width: "340px",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "start",
          borderRadius: "12px",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
        className="group relative backdrop-blur-sm"
      >
        <div className="flex items-center justify-center w-7 h-7 mr-3 text-white shrink-0 bg-white/20 rounded-full">
          {config.icon}
        </div>

        <div className="flex flex-col flex-1">
          <span className="text-[10px] uppercase font-bold text-white/80 leading-none mb-1 tracking-wide">
            {config.label}
          </span>
          <div className="font-semibold text-sm text-white leading-tight">
            {message}
          </div>
        </div>

        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(onClose, 300);
          }}
          aria-label="Tutup"
          className="ml-2 p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
        >
          <X size={16} />
        </button>

        <div
          className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
          style={{
            animation: `shrink ${duration}ms linear forwards`,
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}
