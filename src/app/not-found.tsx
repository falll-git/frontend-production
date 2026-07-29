import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef8ff] px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-sky-100 bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,77,116,0.12)] sm:p-9">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-sky-50 text-[#157ec3]">
          <FileQuestion className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-bold tracking-[0.18em] text-[#157ec3]">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Alamat yang dibuka tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157ec3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d6da9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157ec3]"
        >
          <Home className="size-4" aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
      </section>
    </main>
  );
}
