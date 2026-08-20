import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LoanRequestResponsiveGrid from "@/components/arsip-digital/peminjaman/LoanRequestResponsiveGrid";

describe("LoanRequestResponsiveGrid", () => {
  it("menggunakan kolom yang boleh menyusut tanpa minimum lebar tetap", () => {
    const { container } = render(
      <LoanRequestResponsiveGrid>
        <section>Dokumen</section>
        <aside>Panduan</aside>
      </LoanRequestResponsiveGrid>,
    );

    const grid = container.querySelector(
      "[data-ui='loan-request-summary-grid']",
    );

    expect(grid).not.toBeNull();
    expect(grid).toHaveClass("grid-cols-[minmax(0,1fr)]");
    expect(grid).toHaveClass(
      "xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]",
    );
    expect(grid?.className).not.toContain("minmax(280px");
  });
});
