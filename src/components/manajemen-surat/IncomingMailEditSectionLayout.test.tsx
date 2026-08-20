import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IncomingMailEditSectionLayout, {
  INCOMING_MAIL_EDIT_SECTION_TITLES,
} from "./IncomingMailEditSectionLayout";

describe("IncomingMailEditSectionLayout", () => {
  it("menampilkan enam bagian Surat Masuk dalam urutan bisnis yang ditetapkan", () => {
    const { container } = render(
      <IncomingMailEditSectionLayout
        identity={<span>Kontrol identitas</span>}
        sender={<span>Kontrol pengirim</span>}
        receipt={<span>Kontrol penerimaan</span>}
        filing={<span>Kontrol pengarsipan</span>}
        disposition={<span>Informasi disposisi</span>}
        attachments={<span>Kontrol lampiran</span>}
      />,
    );

    const layout = container.querySelector(
      '[data-ui="incoming-mail-edit-sections"]',
    );
    expect(layout).toBeInTheDocument();

    expect(
      within(layout as HTMLElement)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([...INCOMING_MAIL_EDIT_SECTION_TITLES]);

    const sections = (layout as HTMLElement).querySelectorAll("section");
    expect(sections).toHaveLength(6);
    sections.forEach((section) => {
      expect(section).toHaveClass("border-t", "border-slate-200");
      expect(section.className).not.toMatch(/shadow|rounded-|bg-slate-50/);
    });
  });

  it("menempatkan setiap kelompok kontrol tepat di bagian yang sesuai", () => {
    render(
      <IncomingMailEditSectionLayout
        identity={<span>Kontrol identitas</span>}
        sender={<span>Kontrol pengirim</span>}
        receipt={<span>Kontrol penerimaan</span>}
        filing={<span>Kontrol pengarsipan</span>}
        disposition={<span>Informasi disposisi</span>}
        attachments={<span>Kontrol lampiran</span>}
      />,
    );

    const expectedContent = [
      "Kontrol identitas",
      "Kontrol pengirim",
      "Kontrol penerimaan",
      "Kontrol pengarsipan",
      "Informasi disposisi",
      "Kontrol lampiran",
    ];

    INCOMING_MAIL_EDIT_SECTION_TITLES.forEach((title, index) => {
      const heading = screen.getByRole("heading", { name: title, level: 3 });
      const section = heading.closest("section");

      expect(section).not.toBeNull();
      expect(
        within(section as HTMLElement).getByText(expectedContent[index]),
      ).toBeVisible();
    });
  });
});
