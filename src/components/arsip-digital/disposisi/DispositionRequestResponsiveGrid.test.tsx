import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DispositionRequestResponsiveGrid from "@/components/arsip-digital/disposisi/DispositionRequestResponsiveGrid";

describe("DispositionRequestResponsiveGrid", () => {
  it("menggunakan kolom yang boleh menyusut tanpa minimum lebar tetap", () => {
    const { container } = render(
      <DispositionRequestResponsiveGrid>
        <section>Dokumen yang diajukan</section>
        <aside>Pemilik dokumen</aside>
      </DispositionRequestResponsiveGrid>,
    );

    const grid = container.querySelector(
      "[data-ui='disposition-request-summary-grid']",
    );

    expect(grid).not.toBeNull();
    expect(grid).toHaveClass("grid-cols-[minmax(0,1fr)]");
    expect(grid).toHaveClass(
      "xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]",
    );
    expect(grid?.className).not.toContain("minmax(300px");
  });
});
