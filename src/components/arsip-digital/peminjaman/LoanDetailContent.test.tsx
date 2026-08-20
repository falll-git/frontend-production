import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LoanDetailContent, {
  getMeaningfulLoanNoteRows,
} from "@/components/arsip-digital/peminjaman/LoanDetailContent";

describe("LoanDetailContent", () => {
  it("menyajikan identitas sebagai satu card dan metadata rutin sebagai definition rows", () => {
    const { container } = render(
      <LoanDetailContent
        documentName="Dokumen Pembiayaan Nasabah"
        documentCode="DOC-001"
        status={<span>Dikembalikan</span>}
        informationDescription="Informasi transaksi peminjaman."
        informationRows={[
          { label: "Peminjam", value: "Petugas Arsip" },
          { label: "Tanggal Pinjam", value: "15 Agustus 2026" },
        ]}
        noteRows={[
          { label: "Alasan Peminjaman", value: "Pemeriksaan dokumen" },
          { label: "Catatan Penolakan", value: "-" },
        ]}
      />,
    );

    const summary = container.querySelector("[data-ui='loan-detail-summary']");
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("DOC-001")).toBeInTheDocument();
    expect(screen.getAllByRole("term")).toHaveLength(3);
    expect(screen.getAllByRole("definition")).toHaveLength(3);
    expect(screen.queryByText("Catatan Penolakan")).not.toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("menampilkan satu penjelasan eksplisit ketika seluruh catatan kosong", () => {
    render(
      <LoanDetailContent
        documentName="Dokumen Arsip"
        documentCode="DOC-002"
        status={<span>Disetujui</span>}
        informationDescription="Informasi transaksi peminjaman."
        informationRows={[{ label: "Peminjam", value: "Supervisor" }]}
        noteRows={[
          { label: "Catatan Persetujuan", value: " " },
          { label: "Catatan Penyerahan", value: null },
        ]}
      />,
    );

    expect(screen.getByText("Belum ada catatan proses.")).toBeInTheDocument();
    expect(screen.queryByText("Catatan Persetujuan")).not.toBeInTheDocument();
    expect(screen.queryByText("Catatan Penyerahan")).not.toBeInTheDocument();
  });

  it("menganggap placeholder dash sebagai nilai kosong tanpa menghapus catatan nyata", () => {
    expect(
      getMeaningfulLoanNoteRows([
        { label: "Kosong", value: "-" },
        { label: "Spasi", value: "   " },
        { label: "Nyata", value: "  Dokumen diterima baik  " },
      ]),
    ).toEqual([{ label: "Nyata", value: "Dokumen diterima baik" }]);
  });
});
