import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCard,
  SetupTableCode,
  SetupTableMoney,
  SetupTableNumber,
  SetupTablePrimaryText,
  SetupTableScroll,
  SetupTableSecondaryText,
} from "@/components/ui/SetupDataTable";

describe("SetupDataTable", () => {
  it("meneruskan label header ke sel mobile tanpa menimpa label eksplisit", () => {
    render(
      <SetupDataTable variant="report" density="compact" aria-label="Daftar">
        <SetupDataTableHead>
          <SetupDataTableRow>
            <SetupDataTableHeaderCell>
              <span>Nama</span>
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>{["Nilai", " "]}</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>{2026}</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          <SetupDataTableRow>
            <SetupDataTableCell>Debitur A</SetupDataTableCell>
            <SetupDataTableCell mobileLabel="Nominal">100</SetupDataTableCell>
            <SetupDataTableCell mobileHidden>Aktif</SetupDataTableCell>
          </SetupDataTableRow>
          <SetupDataTableRow>
            <SetupDataTableCell colSpan={3}>Ringkasan</SetupDataTableCell>
          </SetupDataTableRow>
        </SetupDataTableBody>
      </SetupDataTable>,
    );

    const table = screen.getByRole("table", { name: "Daftar" });
    expect(table).toHaveAttribute("data-table-variant", "report");
    expect(table).toHaveAttribute("data-table-density", "compact");
    expect(screen.getByText("Debitur A").closest("td")).toHaveAttribute(
      "data-mobile-label",
      "Nama",
    );
    expect(screen.getByText("100").closest("td")).toHaveAttribute(
      "data-mobile-label",
      "Nominal",
    );
    expect(screen.getByText("Aktif").closest("td")).toHaveAttribute(
      "data-mobile-label",
      "2026",
    );
    expect(screen.getByText("Aktif").closest("td")).toHaveAttribute(
      "data-mobile-hidden",
      "true",
    );
    expect(screen.getByText("Ringkasan").closest("td")).not.toHaveAttribute(
      "data-mobile-label",
    );
  });

  it("mendukung wrapper tabel scroll maupun non-scroll dan elemen teks semantik", () => {
    const { rerender } = render(
      <SetupTableCard variant="nested" data-testid="card">
        <SetupDataTable>
          <SetupDataTableColGroup>
            <SetupDataTableCol span={1} />
          </SetupDataTableColGroup>
          <SetupDataTableBody>
            <SetupDataTableRow>
              <SetupDataTableCell>
                <SetupTableCode>{["REG", "-001"]}</SetupTableCode>
                <SetupTablePrimaryText as="div">Nama utama</SetupTablePrimaryText>
                <SetupTableSecondaryText title="Judul khusus">
                  Keterangan
                </SetupTableSecondaryText>
                <SetupTableNumber as="p">12</SetupTableNumber>
                <SetupTableMoney>Rp 100</SetupTableMoney>
              </SetupDataTableCell>
            </SetupDataTableRow>
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-table-card-variant", "nested");
    expect(within(card).getByRole("region", { name: "Tabel data" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByText("REG-001")).toHaveAttribute("title", "REG -001");
    expect(screen.getByText("Nama utama").tagName).toBe("DIV");
    expect(screen.getByText("Keterangan")).toHaveAttribute(
      "title",
      "Judul khusus",
    );
    expect(screen.getByText("12").tagName).toBe("P");

    rerender(
      <SetupTableCard scroll={false} data-testid="card">
        <span>Tanpa scroll</span>
      </SetupTableCard>,
    );
    expect(screen.queryByRole("region", { name: "Tabel data" })).toBeNull();
    expect(screen.getByText("Tanpa scroll")).toBeInTheDocument();
  });

  it("menampilkan state empty, error, dan loading yang tepat", () => {
    const { rerender } = render(
      <SetupDataTable>
        <SetupDataTableBody>
          <SetupDataTableEmptyRow
            colSpan={4}
            description="Ubah filter pencarian."
            isFiltered
          >
            Data tidak ditemukan
          </SetupDataTableEmptyRow>
        </SetupDataTableBody>
      </SetupDataTable>,
    );
    expect(screen.getByText("Data tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByText("Ubah filter pencarian.")).toBeInTheDocument();

    rerender(
      <SetupDataTable>
        <SetupDataTableBody>
          <SetupDataTableEmptyRow colSpan={4} state="error">
            Gagal mengambil data
          </SetupDataTableEmptyRow>
        </SetupDataTableBody>
      </SetupDataTable>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal mengambil data");

    rerender(
      <SetupDataTable>
        <SetupDataTableBody>
          <SetupDataTableEmptyRow
            colSpan={2}
            loadingRows={2}
            loadingColumns={1}
          >
            Memuat data
          </SetupDataTableEmptyRow>
        </SetupDataTableBody>
      </SetupDataTable>,
    );
    expect(screen.getAllByRole("row", { hidden: true })).toHaveLength(2);
  });

  it("mengizinkan region scroll dikonfigurasi untuk tabel yang sudah berlabel", () => {
    render(
      <SetupTableScroll role="group" tabIndex={-1} aria-label="Ringkasan">
        Isi
      </SetupTableScroll>,
    );
    expect(screen.getByRole("group", { name: "Ringkasan" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
