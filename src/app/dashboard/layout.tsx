import type { ReactNode } from "react";

import { ArsipDigitalMasterDataProvider } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { ArsipDigitalWorkflowProvider } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import DashboardLayoutContent from "@/components/dashboard/DashboardLayoutContent";
import { DocumentPreviewProvider } from "@/components/ui/DocumentPreviewContext";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocumentPreviewProvider>
      <ArsipDigitalMasterDataProvider>
        <ArsipDigitalWorkflowProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </ArsipDigitalWorkflowProvider>
      </ArsipDigitalMasterDataProvider>
    </DocumentPreviewProvider>
  );
}
