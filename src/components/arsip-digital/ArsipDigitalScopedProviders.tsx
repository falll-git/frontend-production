import type { ReactNode } from "react";

import { ArsipDigitalMasterDataProvider } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { ArsipDigitalWorkflowProvider } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";

export default function ArsipDigitalScopedProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ArsipDigitalMasterDataProvider>
      <ArsipDigitalWorkflowProvider>{children}</ArsipDigitalWorkflowProvider>
    </ArsipDigitalMasterDataProvider>
  );
}
