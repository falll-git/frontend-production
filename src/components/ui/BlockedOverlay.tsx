"use client";

import { Lock } from "lucide-react";

interface BlockedOverlayProps {
  message?: string;
  description?: string;
}

export default function BlockedOverlay({
  message = "Maaf sementara fitur ini tidak tersedia",
  description = "Silakan hubungi administrator untuk informasi lebih lanjut",
}: BlockedOverlayProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-8 w-8 text-gray-400" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
