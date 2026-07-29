export default function AppRouteLoader() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#eef8ff] px-4"
      role="status"
      aria-live="polite"
      aria-label="Menyiapkan halaman"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative size-14" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-4 border-sky-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#157ec3]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">
          Menyiapkan Ruwang Arsip…
        </p>
      </div>
    </main>
  );
}
