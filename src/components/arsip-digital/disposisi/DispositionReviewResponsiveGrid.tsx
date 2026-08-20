import type { ReactNode } from "react";

type DispositionReviewResponsiveGridProps = {
  children: ReactNode;
};

export default function DispositionReviewResponsiveGrid({
  children,
}: DispositionReviewResponsiveGridProps) {
  return (
    <div
      data-ui="disposition-review-summary-grid"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.85fr)]"
    >
      {children}
    </div>
  );
}
