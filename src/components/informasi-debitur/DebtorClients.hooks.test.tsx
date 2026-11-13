import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtorListClient } from "./DebiturModuleClients";
import DebtorIdebReportClient from "./DebtorIdebReportClient";
import type { DebtorIdebReportUpload } from "@/types/debitur.types";

const mocks = vi.hoisted(() => ({
  auth: { status: "authenticated", role: { id: "role-a" }, user: { id: "user-a" } },
  getDebtorsPage: vi.fn(), getContractsPage: vi.fn(), getCollateralsPage: vi.fn(), getIdebReports: vi.fn(),
  getIdebReportDetail: vi.fn(),
  showToast: vi.fn(), push: vi.fn(), hasCapability: vi.fn(() => true), ensureCapability: vi.fn(() => true),
}));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/ui/AppToastProvider", () => ({ useAppToast: () => ({ showToast: mocks.showToast }) }));
vi.mock("@/hooks/useProtectedAction", () => ({ useProtectedAction: () => ({
  hasCapability: mocks.hasCapability, ensureCapability: mocks.ensureCapability,
}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => "/dashboard/informasi-debitur" }));
vi.mock("@/services/debitur.service", () => ({ debiturService: {
  getDebtorsPage: mocks.getDebtorsPage, getContractsPage: mocks.getContractsPage,
  getCollateralsPage: mocks.getCollateralsPage, getIdebReports: mocks.getIdebReports,
  getIdebReportDetail: mocks.getIdebReportDetail,
} }));
vi.mock("@/services/parameter-master.service", () => ({
  createParameterMasterService: () => ({ getAll: async () => [] }),
}));

beforeEach(() => {
  mocks.getIdebReportDetail.mockReset();
  for (const request of [mocks.getDebtorsPage, mocks.getContractsPage, mocks.getCollateralsPage, mocks.getIdebReports]) {
    request.mockImplementation(async ({ page, limit }: { page: number; limit: number }) => ({
      items: [], meta: { total: 60, page, limit, lastPage: 3 },
    }));
  }
});

function report(id: string, name: string): DebtorIdebReportUpload {
  return {
    id, debtor_id: null, import_job_id: null, contract_id: null, month: 11, year: 2026, status: "COMPLETED",
    result_summary: null, summary_detail: null, file: null, debtor: null, contract: null, created_at: null,
    external_status: "COMPLETED", period_month: "2026-11", debtor_name: name, identity_number: null,
    contract_number: null, source_format: null, current_collectibility: null, outstanding_pokok: 0, updated_at: null,
    link_status: "BELUM_TERHUBUNG", result_date: null, reporter_count: 0, facilities_count: 0,
    active_facilities_count: 0, paid_off_facilities_count: 0, write_off_facilities_count: 0, inactive_facilities_count: 0,
    active_outstanding: 0, active_arrears: 0, paid_off_plafond: 0, write_off_plafond: 0, write_off_outstanding: 0,
    write_off_arrears: 0, total_plafond: 0, total_outstanding: 0, total_arrears: 0,
    reported_worst_collectibility: null, active_worst_collectibility: null, worst_collectibility: null,
    officer_name: null, total_parts: 1, received_parts: 1, part_display: "1/1", report_summary: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("IDEB detail retries", () => {
  it("fetches the same row again after its detail request fails", async () => {
    const item = report("report-a", "IDEB A");
    mocks.getIdebReports.mockResolvedValue({ items: [item], meta: { total: 1, page: 1, limit: 10, lastPage: 1 } });
    mocks.getIdebReportDetail.mockRejectedValueOnce(new Error("Detail sementara gagal")).mockResolvedValueOnce(item);
    render(<DebtorIdebReportClient />);

    fireEvent.doubleClick(await screen.findByRole("row", { name: /IDEB A/ }));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Detail sementara gagal", "error"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("row", { name: /IDEB A/ }));

    expect(await screen.findByRole("dialog", { name: "Detail Pengecekan IDEB - IDEB A" })).toBeInTheDocument();
    expect(mocks.getIdebReportDetail.mock.calls).toEqual([[item.id], [item.id]]);
  });

  it("does not duplicate a pending retry or replace the newer row with its late response", async () => {
    const first = report("report-a", "IDEB A");
    const second = report("report-b", "IDEB B");
    const retry = deferred<DebtorIdebReportUpload>();
    const next = deferred<DebtorIdebReportUpload>();
    mocks.getIdebReports.mockResolvedValue({ items: [first, second], meta: { total: 2, page: 1, limit: 10, lastPage: 1 } });
    mocks.getIdebReportDetail.mockRejectedValueOnce(new Error("Detail sementara gagal"))
      .mockReturnValueOnce(retry.promise).mockReturnValueOnce(next.promise);
    render(<DebtorIdebReportClient />);

    fireEvent.doubleClick(await screen.findByRole("row", { name: /IDEB A/ }));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Detail sementara gagal", "error"));
    fireEvent.doubleClick(screen.getByRole("row", { name: /IDEB A/ }));
    await waitFor(() => expect(mocks.getIdebReportDetail).toHaveBeenCalledTimes(2));
    fireEvent.doubleClick(screen.getByRole("row", { name: /IDEB A/ }));
    expect(mocks.getIdebReportDetail).toHaveBeenCalledTimes(2);
    fireEvent.doubleClick(screen.getByRole("row", { name: /IDEB B/ }));
    await waitFor(() => expect(mocks.getIdebReportDetail).toHaveBeenLastCalledWith(second.id));
    await act(async () => next.resolve(second));
    expect(await screen.findByRole("dialog", { name: "Detail Pengecekan IDEB - IDEB B" })).toBeInTheDocument();
    await act(async () => retry.resolve({ ...first, debtor_name: "IDEB A terlambat" }));
    expect(screen.getByRole("dialog", { name: "Detail Pengecekan IDEB - IDEB B" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Detail Pengecekan IDEB - IDEB A terlambat" })).not.toBeInTheDocument();
  });
});

describe("debtor request pagination", () => {
  it("resets CIF pagination in the filter event without requesting the old page for the new filter", async () => {
    render(<DebtorListClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Halaman berikutnya" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    await waitFor(() => expect(mocks.getDebtorsPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, search: "" })));
    fireEvent.change(screen.getByPlaceholderText("Cari nama, nomor debitur, identitas, atau kontrak..."), { target: { value: "baru" } });
    await waitFor(() => expect(mocks.getDebtorsPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: "baru" })));
    expect(mocks.getDebtorsPage.mock.calls.some(([query]) => query.page === 2 && query.search === "baru")).toBe(false);
    expect(mocks.getContractsPage).not.toHaveBeenCalled();
    expect(mocks.getCollateralsPage).not.toHaveBeenCalled();
  });

  it("resets IDEB pagination in the search event without fetching the old page for the new search", async () => {
    render(<DebtorIdebReportClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Halaman berikutnya" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    await waitFor(() => expect(mocks.getIdebReports).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, search: "" })));
    fireEvent.change(screen.getByLabelText("Cari Data"), { target: { value: "laporan baru" } });
    await waitFor(() => expect(mocks.getIdebReports).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: "laporan baru" })));
    expect(mocks.getIdebReports.mock.calls.some(([query]) => query.page === 2 && query.search === "laporan baru")).toBe(false);
  });
});
