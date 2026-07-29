"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";

type AppErrorStateProps = {
  title?: string;
  description?: string;
  referenceId?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
};

export default function AppErrorState({
  title = "Halaman tidak dapat ditampilkan",
  description =
    "Terjadi kendala saat menyiapkan halaman. Coba muat ulang, atau kembali ke dashboard.",
  referenceId,
  onRetry,
  fullScreen = false,
}: AppErrorStateProps) {
  return (
    <main
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center bg-[#eef8ff] px-4 py-10"
          : "flex min-h-[60vh] items-center justify-center px-4 py-10"
      }
    >
      <section
        className="w-full max-w-xl rounded-2xl border border-red-100 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,77,116,0.12)] sm:p-8"
        role="alert"
        aria-live="assertive"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-xl font-bold text-slate-900 sm:text-2xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          {description}
        </p>

        {referenceId ? (
          <p className="mt-3 font-mono text-xs text-slate-500">
            Kode referensi: {referenceId}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157ec3]"
          >
            <Home className="size-4" aria-hidden="true" />
            Kembali ke Dashboard
          </Link>

          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157ec3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d6da9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157ec3]"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Coba Lagi
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
