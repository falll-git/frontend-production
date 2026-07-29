"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/client-error-reporting";

export default function ClientErrorMonitor() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (!event.error) return;
      void reportClientError(event.error, {
        boundary: "browser",
        eventType: "unhandled_error",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void reportClientError(event.reason, {
        boundary: "browser",
        eventType: "unhandled_rejection",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return null;
}
