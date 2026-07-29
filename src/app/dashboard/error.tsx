"use client";

import { useEffect } from "react";

import AppErrorState from "@/components/system/AppErrorState";
import { reportClientError } from "@/lib/client-error-reporting";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error, { boundary: "dashboard" });
  }, [error]);

  return (
    <AppErrorState
      title="Konten dashboard gagal dimuat"
      description="Navigasi tetap tersedia. Coba muat ulang konten halaman ini."
      referenceId={error.digest}
      onRetry={reset}
    />
  );
}
