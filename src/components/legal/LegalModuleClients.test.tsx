import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LegalProgressClient } from "./LegalModuleClients";

const mocks = vi.hoisted(() => ({
  getNotaryPage: vi.fn(),
  getKjppPage: vi.fn(),
  getInsurancePage: vi.fn(),
  showToast: vi.fn(),
  removeNotary: vi.fn(),
  allowed: false,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/legal/progress-notaris" }));
vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("@/hooks/useProtectedAction", () => ({
  useProtectedAction: () => ({ hasCapability: () => mocks.allowed, ensureCapability: () => mocks.allowed }),
}));
vi.mock("@/components/ui/DocumentPreviewContext", () => ({
  useDocumentPreviewContext: () => ({ openPreview: vi.fn() }),
}));
vi.mock("@/services/legal.service", () => ({ legalService: mocks }));
vi.mock("@/services/parameter-master.service", () => ({
  createParameterMasterService: () => ({ getAll: async () => [] }),
}));
vi.mock("@/services/debitur.service", () => ({
  debiturService: {
    getContractsPage: async () => ({ items: [] }),
    getDebtorsPage: async () => ({ items: [] }),
  },
}));

function page(label: string) {
  return {
    items: [{ id: label, status: "PROSES", contract: { no_kontrak: label }, file: null, files: [] }],
    meta: { page: 1, limit: 20, total: 21, lastPage: 2 },
  };
}

describe("legal page request ownership", () => {
  beforeEach(() => {
    mocks.allowed = false;
    mocks.removeNotary.mockResolvedValue(undefined);
    mocks.getNotaryPage.mockResolvedValue(page("notary-record"));
    mocks.getKjppPage.mockResolvedValue(page("kjpp-record"));
    mocks.getInsurancePage.mockResolvedValue(page("insurance-record"));
  });

  it("clears the previous module while the new module loads and retains server totals", async () => {
    let finishInsurance!: (value: ReturnType<typeof page>) => void;
    mocks.getInsurancePage.mockImplementationOnce(() => new Promise((resolve) => { finishInsurance = resolve; }));
    const { rerender } = render(<LegalProgressClient type="notary" />);
    expect(await screen.findByText("notary-record")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    rerender(<LegalProgressClient type="insurance" />);
    expect(screen.queryByText("notary-record")).not.toBeInTheDocument();
    await act(async () => { finishInsurance(page("insurance-current")); });
    expect(screen.getByText("insurance-current")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
  });

  it("ignores a late response from an obsolete search", async () => {
    let finishOld!: (value: ReturnType<typeof page>) => void;
    mocks.getNotaryPage
      .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(page("current-search-result"));
    render(<LegalProgressClient type="notary" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Cari Data" }), { target: { value: "current" } });
    expect(await screen.findByText("current-search-result")).toBeInTheDocument();
    await waitFor(() => expect(mocks.getNotaryPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: "current" }),
    ));
    await act(async () => { finishOld(page("obsolete-private-result")); });
    expect(screen.queryByText("obsolete-private-result")).not.toBeInTheDocument();
    expect(screen.getByText("current-search-result")).toBeInTheDocument();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });
  it("retains same-module rows and server totals when the awaited post-mutation refresh fails", async () => {
    mocks.allowed = true;
    mocks.getNotaryPage
      .mockResolvedValueOnce(page("loaded-before-mutation"))
      .mockRejectedValueOnce(new Error("Refresh unavailable"));
    render(<LegalProgressClient type="notary" />);
    expect(await screen.findByText("loaded-before-mutation")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buka aksi" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Hapus" }));
    const dialog = await screen.findByRole("dialog", { name: "Hapus progress legal?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(mocks.removeNotary).toHaveBeenCalledWith("loaded-before-mutation"));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Refresh unavailable", "error"));
    expect(mocks.getNotaryPage).toHaveBeenCalledTimes(2);
    expect(screen.getByText("loaded-before-mutation")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    expect(screen.queryByText("Belum ada progress legal.")).not.toBeInTheDocument();
  });

  it("does not expose a previous module's rows or totals when the new module fails", async () => {
    mocks.getInsurancePage.mockRejectedValueOnce(new Error("Insurance unavailable"));
    const { rerender } = render(<LegalProgressClient type="notary" />);
    expect(await screen.findByText("notary-record")).toBeInTheDocument();
    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    rerender(<LegalProgressClient type="insurance" />);
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Insurance unavailable", "error"));
    expect(screen.queryByText("notary-record")).not.toBeInTheDocument();
    expect(screen.queryByText("Total 21 data")).not.toBeInTheDocument();
    expect(screen.getByText("Belum ada progress legal.")).toBeInTheDocument();
  });

});
