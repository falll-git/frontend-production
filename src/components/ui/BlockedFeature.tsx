"use client";

import { Lock } from "lucide-react";

interface BlockedFeatureProps {
  title: string;
  description?: string;
}

export default function BlockedFeature({ 
  title, 
  description = "Maaf fitur ini sedang dalam pembuatan" 
}: BlockedFeatureProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-500">
        <Lock className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}
