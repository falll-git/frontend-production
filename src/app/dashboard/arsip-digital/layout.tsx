import type { ReactNode } from "react";

import ArsipDigitalScopedProviders from "@/components/arsip-digital/ArsipDigitalScopedProviders";

export default function ArsipDigitalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ArsipDigitalScopedProviders>{children}</ArsipDigitalScopedProviders>;
}
