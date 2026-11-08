import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LaporanTitipanSection from "./LaporanTitipanSection";

const serviceMocks = vi.hoisted(() => ({
  getThirdPartyDepositFundsReport: vi.fn(),
  getDepositsPage: vi.fn(),
}));

vi.mock("@/services/legal.service", () => ({
  legalService: serviceMocks,
}));

vi.mock("@/components/ui/DocumentPreviewContext", () => ({
  useDocumentPreviewContext: () => ({ openPreview: vi.fn() }),
}));

const emptyPage = {
  items: [],
  meta: { page: 1, limit: 20, total: 0, lastPage: 1 },
};

describe("LaporanTitipanSection", () => {
  beforeEach(() => {
    serviceMocks.getThirdPartyDepositFundsReport.mockResolvedValue([]);
    serviceMocks.getDepositsPage.mockResolvedValue(emptyPage);
  });

  it("menampilkan empty state tanpa header tabel maupun area scroll saat tidak ada record", async () => {
    const user = userEvent.setup();
    render(<LaporanTitipanSection />);

    await user.click(screen.getByTitle("Lihat Titipan Asuransi"));

    expect(
      await screen.findByText("Belum ada laporan untuk jenis titipan ini"),
    ).toBeInTheDocument();
    expect(serviceMocks.getDepositsPage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ASURANSI" }),
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Tabel data" })).not.toBeInTheDocument();
  });

  it("menghapus peringatan dari kartu tetapi mempertahankan perbedaan catatan di detail", async () => {
    serviceMocks.getThirdPartyDepositFundsReport.mockResolvedValue([{
      type: "NOTARIS", total_records: 1, mismatched_records: 1,
      total_deposit_amount: 10_000_000, total_payment_amount: 0,
      total_refund_amount: 0, balance_amount: 10_000_000,
    }]);
    const user = userEvent.setup();
    render(<LaporanTitipanSection />);
    const card = screen.getByTitle("Lihat Titipan Notaris");
    await waitFor(() => expect(within(card).getAllByText(/10\.000\.000/)).toHaveLength(2));
    expect(within(card).queryByText(/rekonsiliasi|perbedaan catatan/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(card);
    expect(await screen.findByRole("alert")).toHaveTextContent("1 data memiliki perbedaan catatan.");
    expect(screen.getByRole("alert")).toHaveTextContent("Angka laporan dihitung dari riwayat transaksi.");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/ledger|agregat|rekonsiliasi/i);
  });

  it("tetap merender tabel, header, dan pagination ketika record tersedia", async () => {
    serviceMocks.getDepositsPage.mockResolvedValue({
      items: [
        {
          id: "deposit-1",
          status: "AKTIF",
          type: "NOTARIS",
          nominal: 10_000_000,
          paid_amount: 2_000_000,
          processed_amount: 0,
          remaining_amount: 8_000_000,
          contract: {
            no_kontrak: "KTR-001",
            debtor: { name: "Debitur Uji" },
          },
          third_party: { name: "Notaris Uji" },
          transactions: [],
        },
      ],
      meta: { page: 1, limit: 20, total: 21, lastPage: 2 },
    });

    const user = userEvent.setup();
    render(<LaporanTitipanSection />);

    await user.click(screen.getByTitle("Lihat Titipan Notaris"));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Jenis Titipan" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tabel data" })).toBeInTheDocument();
    expect(screen.getByText("Notaris Uji")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    expect(
      screen.queryByText("Belum ada laporan untuk jenis titipan ini"),
    ).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Buka aksi dana titipan KTR-001" }).focus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
