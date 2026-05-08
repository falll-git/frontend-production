"use client";

import { useState, useCallback } from "react";
import { ToastType, ToastItem } from "@/components/ui/Toast";
import { createSafeId } from "@/lib/utils/random";

interface UseMultiToastResult {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export function useMultiToast(): UseMultiToastResult {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = createSafeId("toast");
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return { toasts, showToast, removeToast, clearToasts };
}
