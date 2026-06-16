import type { ReactNode } from "react";

import DashboardLayoutContent from "@/components/dashboard/DashboardLayoutContent";
import { DocumentPreviewProvider } from "@/components/ui/DocumentPreviewContext";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocumentPreviewProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DocumentPreviewProvider>
  );
}
