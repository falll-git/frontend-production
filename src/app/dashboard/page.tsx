"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import DashboardOverviewClient from "@/components/dashboard/DashboardOverviewClient";

export default function DashboardPage() {
  return (
    <DashboardPageShell spacing="lg" animated={false}>
      <DashboardOverviewClient />
    </DashboardPageShell>
  );
}
