import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LaporanPihakKetigaSection from "./LaporanPihakKetigaSection";

const serviceMocks = vi.hoisted(() => ({
  getThirdPartyDocumentsReport: vi.fn(),
  getNotaryPage: vi.fn(),
  getInsurancePage: vi.fn(),
  getKjppPage: vi.fn(),
  getClaimsPage: vi.fn(),
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

describe("LaporanPihakKetigaSection", () => {
  beforeEach(() => {
    serviceMocks.getThirdPartyDocumentsReport.mockResolvedValue({
      notary: [],
      insurance: [],
      claims: [],
      kjpp: [],
    });
    serviceMocks.getNotaryPage.mockResolvedValue(emptyPage);
    serviceMocks.getInsurancePage.mockResolvedValue(emptyPage);
    serviceMocks.getKjppPage.mockResolvedValue(emptyPage);
    serviceMocks.getClaimsPage.mockResolvedValue(emptyPage);
  });

  it.each([
    ["Notaris", serviceMocks.getNotaryPage],
    ["KJPP", serviceMocks.getKjppPage],
  ])(
    "menampilkan empty state tanpa tabel saat %s tidak memiliki record",
    async (category, loader) => {
      const user = userEvent.setup();
      render(<LaporanPihakKetigaSection />);

      await user.click(screen.getByTitle(`Lihat laporan ${category}`));

      expect(
        await screen.findByText("Belum ada progress untuk kategori ini"),
      ).toBeInTheDocument();
      expect(loader).toHaveBeenCalled();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    },
  );

  it("tidak merender tabel kosong untuk progress Asuransi maupun Klaim", async () => {
    const user = userEvent.setup();
    render(<LaporanPihakKetigaSection />);

    await user.click(screen.getByTitle("Lihat laporan Asuransi"));
    expect(
      await screen.findByText("Belum ada progress untuk kategori ini"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Klaim" }));
    await waitFor(() => expect(serviceMocks.getClaimsPage).toHaveBeenCalled());
    expect(
      screen.getByText("Belum ada progress untuk kategori ini"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("merender tabel dan pagination hanya ketika record tersedia", async () => {
    serviceMocks.getNotaryPage.mockResolvedValue({
      items: [
        {
          id: "notary-1",
          status: "PROSES",
          deed_type: "Akta Pembiayaan",
          received_at: "2026-08-13T00:00:00.000Z",
          contract: {
            no_kontrak: "KTR-001",
            debtor: { name: "Debitur Uji" },
          },
          third_party: { name: "Notaris Uji" },
        },
      ],
      meta: { page: 1, limit: 20, total: 21, lastPage: 2 },
    });

    const user = userEvent.setup();
    render(<LaporanPihakKetigaSection />);
    await user.click(screen.getByTitle("Lihat laporan Notaris"));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Pihak Ketiga" })).toBeInTheDocument();
    expect(screen.getByText("Notaris Uji")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    expect(
      screen.queryByText("Belum ada progress untuk kategori ini"),
    ).not.toBeInTheDocument();
  });
});
