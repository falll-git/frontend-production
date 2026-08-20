import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { FileText, Inbox, Shield } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupReportSelectorCards from "@/components/ui/SetupReportSelectorCards";

describe("presentation cleanup contracts", () => {
  it("menjaga trigger searchable select tetap satu baris dan memberi ruang tombol hapus", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/styles/base-select.css"),
      "utf8",
    );

    expect(css).toMatch(
      /\.app-select\.searchable-select-trigger\s*\{[^}]*display:\s*flex;/,
    );
    expect(css).toMatch(
      /\.app-select\.searchable-select-trigger\[data-clearable="true"\]\s*\{[^}]*padding-right:\s*64px;/,
    );
  });

  it("menjaga pemisah sticky kolom aksi sebagai gradasi halus tanpa shadow gelap per sel", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/styles/setup-responsive-table.css"),
      "utf8",
    );

    expect(css).not.toContain("-10px 0 14px -14px rgba(15, 23, 42, 0.5)");
    expect(css).toMatch(
      /\.setup-responsive-table \[data-table-action="true"\]\s*\{[^}]*box-shadow:\s*-1px 0 0 rgba\(148, 163, 184, 0\.18\);/,
    );
    expect(css).toMatch(
      /\.setup-responsive-table \[data-table-action="true"\]::before\s*\{[^}]*linear-gradient\([^}]*rgba\(15, 23, 42, 0\.055\)[^}]*pointer-events:\s*none;/,
    );
  });

  it("menjaga tombol disposisi di samping sticky kolom aksi agar tidak tertutup", () => {
    const stylesheet = readFileSync(
      join(process.cwd(), "src/components/styles/setup-responsive-table.css"),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.setup-responsive-table \.correspondence-disposition-column\s*\{[^}]*position:\s*sticky;[^}]*inset-inline-end:\s*4\.75rem;[^}]*z-index:\s*7;/,
    );
    expect(stylesheet).toMatch(
      /\.setup-responsive-table__head \.correspondence-disposition-column\s*\{[^}]*z-index:\s*11;/,
    );
  });

  it.each(["neutral", "debitur", "legal", "import", "parameter"] as const)(
    "menjaga empty state %s tetap netral dan tanpa bayangan dekoratif",
    (tone) => {
      const { container } = render(
        <SetupEmptyState
          title="Belum ada data"
          description="Data akan tampil setelah tersedia."
          tone={tone}
          variant="panel"
        />,
      );

      const panel = container.firstElementChild;
      const iconWrap = panel?.querySelector("span");

      expect(panel).toHaveClass("rounded-lg", "border", "border-slate-200");
      expect(panel).toHaveAttribute("role", "status");
      expect(panel).toHaveAttribute("aria-live", "polite");
      expect(panel?.className).not.toMatch(/shadow|rounded-2xl|bg-(blue|red|amber|emerald)/);
      expect(iconWrap).toHaveClass("border-slate-200", "bg-slate-50");
      expect(iconWrap?.className).not.toMatch(/shadow/);
    },
  );

  it("mempertahankan selector laporan sebagai card navigasi dengan ringkasan terkelompok", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <SetupReportSelectorCards
        activeKey={null}
        onSelect={onSelect}
        cards={[
          {
            kind: "SURAT",
            title: "Surat Masuk",
            icon: Inbox,
            totalLabel: "Total Surat",
            totalValue: 3,
            ctaLabel: "Lihat Daftar Surat",
            infoRows: [
              { icon: FileText, label: "Arsip", value: "3 Dokumen" },
              { icon: Shield, label: "Status", value: "Aktif" },
            ],
          },
        ]}
      />,
    );

    const selector = screen.getByRole("button", { name: /Surat Masuk/i });
    const rows = container.querySelector(".overflow-hidden.rounded-lg.bg-gray-50");

    expect(selector).toHaveAttribute("aria-pressed", "false");
    expect(selector).toHaveClass("rounded-lg", "shadow-sm");
    expect(selector.className).not.toMatch(/rounded-2xl/);
    expect(rows).toBeInTheDocument();
    expect(rows?.className).not.toMatch(/shadow/);
  });

  it("menjaga card laporan dashboard profesional dan responsif", () => {
    const thirdPartySource = readFileSync(
      join(
        process.cwd(),
        "src/components/dashboard/LaporanPihakKetigaSection.tsx",
      ),
      "utf8",
    );
    const depositSource = readFileSync(
      join(
        process.cwd(),
        "src/components/dashboard/LaporanTitipanSection.tsx",
      ),
      "utf8",
    );
    const npfSource = readFileSync(
      join(process.cwd(), "src/components/dashboard/LaporanNPFSection.tsx"),
      "utf8",
    );
    const cardCss = readFileSync(
      join(process.cwd(), "src/components/styles/base-card.css"),
      "utf8",
    );

    for (const source of [thirdPartySource, depositSource]) {
      expect(source).toContain("motion-safe:hover:-translate-y-0.5");
      expect(source).toContain("motion-safe:group-hover:scale-105");
      expect(source).not.toContain("group-hover:scale-110");
      expect(source).toContain("motion-safe:group-hover:translate-x-1");
    }

    expect(depositSource).toMatch(
      /item\.jenisTitipan === "LAINNYA" \? "lg:col-start-2" : ""/,
    );
    expect(npfSource.match(/app-card--report-accent/g)).toHaveLength(2);
    expect(cardCss).toMatch(
      /\.app-card\.app-card--report-accent\s*\{[^}]*border-top:\s*3px solid #157ec3;[^}]*box-shadow:/,
    );
  });
});
