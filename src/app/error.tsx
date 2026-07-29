"use client";

import { useEffect } from "react";

import AppErrorState from "@/components/system/AppErrorState";
import { reportClientError } from "@/lib/client-error-reporting";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error, { boundary: "route" });
  }, [error]);

  return <AppErrorState referenceId={error.digest} onRetry={reset} />;
}
