import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PersuratanDispositionPanel from "./PersuratanDispositionPanel";

const summary = [
  { label: "Pemegang Saat Ini", value: "Supervisor Review" },
  { label: "Holder Terakhir", value: "Admin Persuratan" },
  { label: "Disposisi Aktif", value: "2 disposisi" },
  { label: "Tenggat Waktu", value: "14 Agustus 2026" },
] as const;

const notes = [
  { label: "Keterangan Surat", value: "Mohon ditindaklanjuti" },
  { label: "Catatan Disposisi", value: "Periksa kelengkapan dokumen" },
] as const;

describe("PersuratanDispositionPanel", () => {
  it("menyusun ringkasan dalam satu kolom yang berubah menjadi dua kolom", () => {
    render(<PersuratanDispositionPanel summary={summary} notes={notes} />);

    const summaryList = screen.getByRole("group", {
      name: "Ringkasan alur disposisi",
    });

    expect(summaryList).toHaveClass("grid-cols-1", "sm:grid-cols-2");
    expect(summaryList).not.toHaveClass("xl:grid-cols-4");
    expect(screen.getByText("Supervisor Review")).toBeVisible();
    expect(screen.getByText("14 Agustus 2026")).toBeVisible();
  });

  it("memisahkan keterangan dan action tanpa membuat kolom nilai menyamping", () => {
    render(
      <PersuratanDispositionPanel
        summary={summary}
        notes={notes}
        action={<button type="button">Mulai Proses</button>}
      />,
    );

    expect(
      screen.getByRole("group", {
        name: "Keterangan dan catatan disposisi",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Mulai Proses" })).toBeVisible();

    const value = screen.getByText("Supervisor Review");
    expect(value).toHaveClass("break-words", "[word-break:normal]");
    expect(value).not.toHaveClass("break-all");
  });

  it("tidak menyisakan area action kosong dan memberi fallback untuk nilai kosong", () => {
    const { container } = render(
      <PersuratanDispositionPanel
        summary={summary}
        notes={[
          { label: "Keterangan Surat", value: "" },
          { label: "Catatan Disposisi", value: null },
        ]}
      />,
    );

    expect(screen.getAllByText("-")).toHaveLength(2);
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });
});
