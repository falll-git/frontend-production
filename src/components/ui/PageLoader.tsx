"use client";

import NewtonsCradleLoader from "@/components/ui/NewtonsCradleLoader";

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <NewtonsCradleLoader
          size={64}
          color="#157ec3"
          label="Memuat data..."
          className="mx-auto mb-4"
        />
        <p className="animate-pulse font-medium text-gray-600">
          Memuat data...
        </p>
      </div>
    </div>
  );
}
