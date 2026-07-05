import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

import SetupEmptyState from "@/components/ui/SetupEmptyState";

export default function EmptyReportState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SetupEmptyState
      title={children}
      description="Data akan muncul setelah ada aktivitas yang sesuai dengan laporan ini."
      icon={FileSearch}
      tone="neutral"
      variant="panel"
    />
  );
}
