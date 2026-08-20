import { render, screen } from "@testing-library/react";
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
  });
});
