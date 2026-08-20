import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";

describe("SetupRecordDetailSection", () => {
  it("menyajikan metadata sebagai pasangan label dan nilai yang semantik", () => {
    const { container } = render(
      <SetupRecordDetailSection
        title="Informasi Utama"
        description="Identitas record yang sedang dibuka."
        rows={[
          { label: "Nomor Kontrak", value: "KTR-001" },
          { label: "Status", value: "Aktif" },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Informasi Utama", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Identitas record yang sedang dibuka."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("term")).toHaveLength(2);
    expect(screen.getAllByRole("definition")).toHaveLength(2);
    expect(
      container.querySelector("[data-ui='record-detail-section']"),
    ).not.toBeNull();
    expect(container.querySelector("dl")?.className).toContain("gap-px");
    expect(container.querySelector("dl")?.className).toContain(
      "md:grid-cols-2",
    );
    expect(
      container.querySelector("[data-ui-layout='modal-definition-grid']"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll("[data-ui='modal-definition-cell']"),
    ).toHaveLength(2);
  });

  it("menutup baris terakhir yang tidak berpasangan tanpa menyisakan ruang kosong", () => {
    const { container } = render(
      <SetupRecordDetailSection
        title="Informasi Aktivitas"
        rows={[
          { label: "Pelaku", value: "Admin" },
          { label: "Peran", value: "Admin" },
          { label: "Modul", value: "Autentikasi" },
        ]}
      />,
    );

    const cells = container.querySelectorAll("dl > div");
    expect(cells).toHaveLength(3);
    expect(cells[2]?.className).toContain("md:col-span-2");
  });
});
