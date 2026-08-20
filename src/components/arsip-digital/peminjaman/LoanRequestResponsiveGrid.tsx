import type { ReactNode } from "react";

export default function LoanRequestResponsiveGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      data-ui="loan-request-summary-grid"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]"
    >
      {children}
    </div>
  );
}
