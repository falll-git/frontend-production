"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type ModalType = "danger" | "warning" | "info" | "success";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string | ReactNode;
  children?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  type?: ModalType;
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
}

const modalStyles = {
  danger: {
    bg: "bg-red-50",
    icon: "text-red-500",
    btn: "bg-red-500 hover:bg-red-600",
  },
  warning: {
    bg: "bg-amber-50",
    icon: "text-amber-500",
    btn: "bg-amber-500 hover:bg-amber-600",
  },
  info: {
    bg: "bg-[#e6f2fa]",
    icon: "text-[#157ec3]",
    btn: "bg-[#157ec3] hover:bg-[#0d5a8f]",
  },
  success: {
    bg: "bg-emerald-50",
    icon: "text-emerald-500",
    btn: "bg-emerald-500 hover:bg-emerald-600",
  },
} as const;

const modalIcons = {
  danger: <AlertTriangle className="h-6 w-6" />,
  warning: <AlertTriangle className="h-6 w-6" />,
  info: <Info className="h-6 w-6" />,
  success: <CheckCircle2 className="h-6 w-6" />,
} as const;

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
  isLoading = false,
  isConfirmDisabled = false,
}: ConfirmModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  const style = modalStyles[type];

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)", zIndex: 9999 }}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-2xl transform rounded-lg bg-white shadow-sm transition-colors duration-150 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`${style.bg} rounded-t-2xl p-6`}>
          <div className="flex items-start gap-4">
            <div className={`${style.icon} shrink-0`}>{modalIcons[type]}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>
          </div>
        </div>

        <div className="p-6">
          {message ? (
            <div className="mb-4 text-gray-700">
              {typeof message === "string" ? <p>{message}</p> : message}
            </div>
          ) : null}
          {children ? <div>{children}</div> : null}
        </div>

        <div className="flex justify-end gap-3 rounded-b-2xl bg-gray-50 p-6">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="btn btn-outline"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || isConfirmDisabled}
            className={`${style.btn} flex items-center gap-2 rounded-lg px-6 py-2.5 font-medium text-white transition-all disabled:cursor-not-allowed disabled:grayscale-[0.5] disabled:opacity-70`}
          >
            {isLoading ? (
              <div
                className="button-spinner"
                style={
                  {
                    ["--spinner-size"]: "16px",
                    ["--spinner-border"]: "2px",
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
