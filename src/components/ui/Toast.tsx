"use client";

import { JSX, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  duration?: number;
}

interface ToastItemComponentProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
  duration: number;
}

const toastConfig: Record<
  ToastType,
  {
    icon: JSX.Element;
    title: string;
    wrapperClassName: string;
    iconClassName: string;
    titleClassName: string;
    messageClassName: string;
  }
> = {
  success: {
    title: "Berhasil",
    icon: <CheckCircle2 className="h-6 w-6" aria-hidden="true" />,
    wrapperClassName: "border-green-500 bg-green-50",
    iconClassName: "text-slate-900",
    titleClassName: "text-green-800",
    messageClassName: "text-green-700",
  },
  error: {
    title: "Gagal",
    icon: <AlertCircle className="h-6 w-6" aria-hidden="true" />,
    wrapperClassName: "border-red-500 bg-red-50",
    iconClassName: "text-slate-900",
    titleClassName: "text-red-800",
    messageClassName: "text-red-700",
  },
  warning: {
    title: "Peringatan",
    icon: <AlertTriangle className="h-6 w-6" aria-hidden="true" />,
    wrapperClassName: "border-amber-500 bg-amber-50",
    iconClassName: "text-slate-900",
    titleClassName: "text-amber-800",
    messageClassName: "text-amber-700",
  },
  info: {
    title: "Informasi",
    icon: <Info className="h-6 w-6" aria-hidden="true" />,
    wrapperClassName: "border-blue-500 bg-blue-50",
    iconClassName: "text-slate-900",
    titleClassName: "text-blue-800",
    messageClassName: "text-blue-700",
  },
};

function ToastItemComponent({
  toast,
  onRemove,
  duration,
}: ToastItemComponentProps): JSX.Element {
  const [isLeaving, setIsLeaving] = useState(false);
  const config = toastConfig[toast.type];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLeaving(true);
      window.setTimeout(() => onRemove(toast.id), 180);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onRemove, toast.id]);

  const closeToast = () => {
    setIsLeaving(true);
    window.setTimeout(() => onRemove(toast.id), 180);
  };

  return (
    <div
      role="alert"
      className={[
        "w-[min(380px,calc(100dvw-2rem))] rounded-md border p-4 shadow-sm",
        "transition-all duration-200 ease-out",
        isLeaving
          ? "translate-x-4 opacity-0"
          : "translate-x-0 opacity-100",
        config.wrapperClassName,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className={["-mt-0.5 shrink-0", config.iconClassName].join(" ")}>
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">
          <strong
            className={[
              "block text-sm font-semibold leading-tight",
              config.titleClassName,
            ].join(" ")}
          >
            {config.title}
          </strong>

          <p
            className={[
              "mt-1 text-sm leading-5",
              config.messageClassName,
            ].join(" ")}
          >
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={closeToast}
          aria-label="Tutup notifikasi"
          className={[
            "-mr-1 -mt-1 rounded-md p-1 transition-colors",
            "text-slate-400 hover:bg-white/70 hover:text-slate-700",
          ].join(" ")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onRemove,
  duration = 4000,
}: ToastContainerProps): JSX.Element | null {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-5 z-[10000] flex flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.slice(-5).map((toast) => (
        <ToastItemComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          duration={duration}
        />
      ))}
    </div>
  );
}
