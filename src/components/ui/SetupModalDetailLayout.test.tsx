import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SetupModalDetailLayout from "@/components/ui/SetupModalDetailLayout";

describe("SetupModalDetailLayout", () => {
  it("mengunci urutan ringkasan, informasi, detail, lampiran, lalu catatan", () => {
    const { container } = render(
      <SetupModalDetailLayout
        summary={<section>Ringkasan record</section>}
        information={<section>Informasi utama</section>}
        details={<section>Detail record</section>}
        attachments={<section>Lampiran record</section>}
        notes={<section>Catatan record</section>}
      />,
    );

    expect(screen.getByText("Ringkasan record")).toBeInTheDocument();
    expect(screen.getByText("Informasi utama")).toBeInTheDocument();
    expect(screen.getByText("Detail record")).toBeInTheDocument();
    expect(screen.getByText("Lampiran record")).toBeInTheDocument();
    expect(screen.getByText("Catatan record")).toBeInTheDocument();

    expect(
      Array.from(
        container.querySelectorAll("[data-modal-detail-part]"),
        (element) => element.getAttribute("data-modal-detail-part"),
      ),
    ).toEqual([
      "summary",
      "information",
      "detail",
      "attachment",
      "notes",
    ]);
  });

  it("tidak membuat pembatas kosong untuk bagian yang tidak relevan", () => {
    const { container } = render(
      <SetupModalDetailLayout
        information={<section>Informasi utama</section>}
        notes={<section>Catatan record</section>}
      />,
    );

    const parts = Array.from(
      container.querySelectorAll<HTMLElement>("[data-modal-detail-part]"),
    );

    expect(parts.map((part) => part.dataset.modalDetailPart)).toEqual([
      "information",
      "notes",
    ]);
    expect(parts[0]).not.toHaveClass("border-t");
    expect(parts[1]).toHaveClass("border-t", "border-slate-200");
  });
});
