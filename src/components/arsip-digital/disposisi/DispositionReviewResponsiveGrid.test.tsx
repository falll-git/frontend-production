import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DispositionReviewResponsiveGrid from "./DispositionReviewResponsiveGrid";

describe("DispositionReviewResponsiveGrid", () => {
  it("allows the single-column layout to shrink without changing the wide-screen split", () => {
    render(
      <DispositionReviewResponsiveGrid>
        <div>Dokumen</div>
        <div>Pemohon</div>
      </DispositionReviewResponsiveGrid>,
    );

    const grid = screen.getByText("Dokumen").parentElement;

    expect(grid).toHaveAttribute("data-ui", "disposition-review-summary-grid");
    expect(grid).toHaveClass("min-w-0");
    expect(grid).toHaveClass("grid-cols-[minmax(0,1fr)]");
    expect(grid).toHaveClass(
      "xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.85fr)]",
    );
  });
});
