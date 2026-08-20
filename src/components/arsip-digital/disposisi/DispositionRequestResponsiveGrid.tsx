import type { ReactNode } from "react";

export default function DispositionRequestResponsiveGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      data-ui="disposition-request-summary-grid"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]"
    >
      {children}
    </div>
  );
}
