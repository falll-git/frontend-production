"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { ToastContainer, type ToastType } from "@/components/ui/Toast";
import { useMultiToast } from "@/hooks/useToast";

interface AppToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

interface AppToastProviderProps {
  children: ReactNode;
}

const AppToastContext = createContext<AppToastContextValue | undefined>(
  undefined,
);

export function AppToastProvider({
  children,
}: AppToastProviderProps): ReactNode {
  const { toasts, showToast, removeToast } = useMultiToast();

  const value = useMemo<AppToastContextValue>(
    () => ({ showToast }),
    [showToast],
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} duration={3500} />
    </AppToastContext.Provider>
  );
}

export function useAppToast(): AppToastContextValue {
  const ctx = useContext(AppToastContext);
  if (!ctx) throw new Error("useAppToast must be used within AppToastProvider");
  return ctx;
}
