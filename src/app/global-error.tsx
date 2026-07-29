"use client";

import { useEffect } from "react";

import AppErrorState from "@/components/system/AppErrorState";
import { reportClientError } from "@/lib/client-error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error, { boundary: "global" });
  }, [error]);

  return (
    <html lang="id">
      <body>
        <AppErrorState
          title="Ruwang Arsip sedang mengalami kendala"
          description="Aplikasi tidak dapat dimuat dengan sempurna. Coba lagi tanpa menutup pekerjaan di tab lain."
          referenceId={error.digest}
          onRetry={reset}
          fullScreen
        />
      </body>
    </html>
  );
}
