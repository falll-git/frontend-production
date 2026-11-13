import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InputDokumenPage from "@/app/dashboard/arsip-digital/input-dokumen/page";
import LaporanArsipDigitalPage from "@/app/dashboard/arsip-digital/laporan/page";
import LaporanPeminjamanPage from "@/app/dashboard/arsip-digital/peminjaman/laporan/page";
import ListDokumenPage from "@/app/dashboard/arsip-digital/ruang-arsip/list-dokumen/page";
import PengajuanDisposisiPageClient from "@/components/arsip-digital/pages/PengajuanDisposisiPageClient";
import type Pagination from "@/components/ui/Pagination";
import type BasicDateInput from "@/components/ui/BasicDateInput";
import type SearchableSelect from "@/components/ui/SearchableSelect";
import type { SetupActionMenuItem } from "@/components/ui/SetupActionMenu";
import type { Dokumen, Peminjaman } from "@/types/arsip.types";
import type { UserRecord } from "@/types/auth.types";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1", role_id: "role-1" },
  canCreate: true,
  canUpdate: true,
  canReadDebtors: true,
  showToast: vi.fn(),
  getRequestable: vi.fn(),
  getSummary: vi.fn(),
  getDocumentPage: vi.fn(),
  getDueDatePage: vi.fn(),
  getLoanPage: vi.fn(),
  getLoanReport: vi.fn(),
  getAssignable: vi.fn(),
  getDivisions: vi.fn(),
  documents: [] as Dokumen[],
  loans: [] as Peminjaman[],
  submitDisposisi: vi.fn(),
  createDokumen: vi.fn(),
  refreshWorkflowData: vi.fn(),
  master: { tempatPenyimpanan: [], jenisDokumen: [] },
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicPlaceholder({
    children, footer, isOpen, ariaLabel, checked, onCheckedChange,
  }: {
    children?: ReactNode;
    footer?: ReactNode;
    isOpen?: boolean;
    ariaLabel?: string;
    checked?: boolean;
    onCheckedChange?: () => void;
  }) {
    if (ariaLabel) {
      return <input type="checkbox" aria-label={ariaLabel} checked={checked} onChange={onCheckedChange} />;
    }
    if (isOpen === false) return null;
    return <div>{children}{footer}</div>;
  },
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("@/hooks/useProtectedAction", () => ({
  useProtectedAction: () => ({
    status: "authenticated",
    hasCapability: (path: string, capability: string) => {
      if (path.includes("informasi-debitur")) return mocks.canReadDebtors;
      if (capability === "update") return mocks.canUpdate;
      if (capability === "create") return mocks.canCreate;
      return false;
    },
    hasFeature: () => true,
    ensureCapability: () => true,
  }),
}));
vi.mock("@/components/arsip-digital/ArsipDigitalWorkflowProvider", () => ({
  useArsipDigitalWorkflow: () => ({
    dokumen: mocks.documents,
    peminjaman: mocks.loans,
    submitDisposisi: mocks.submitDisposisi,
    createDokumen: mocks.createDokumen,
    refreshWorkflowData: mocks.refreshWorkflowData,
  }),
}));
vi.mock("@/components/arsip-digital/ArsipDigitalMasterDataProvider", () => ({
  useArsipDigitalMasterData: () => mocks.master,
}));
vi.mock("@/components/arsip-digital/input-dokumen/RelatedUsersPicker", () => ({ default: () => null }));
vi.mock("@/components/arsip-digital/laporan/ReportDocumentDetailModal", () => ({ default: () => null }));
vi.mock("@/components/ui/DocumentPreviewContext", () => ({
  useDocumentPreviewContext: () => ({ openPreview: vi.fn() }),
}));
vi.mock("@/components/ui/SetupActionMenu", () => ({
  default: ({ items }: { items: SetupActionMenuItem[] }) => (
    <div>{items.map((item) => (
      <button key={item.key} disabled={item.disabled} onClick={() => void item.onClick()}>{item.label}</button>
    ))}</div>
  ),
}));
vi.mock("@/components/ui/SearchableSelect", () => ({
  default: ({ id, name, value, disabled, onChange }: ComponentProps<typeof SearchableSelect>) => (
    <input id={id} name={name} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("@/components/ui/BasicDateInput", () => ({
  default: ({ id, value, onChange }: ComponentProps<typeof BasicDateInput>) => (
    <input id={id} data-testid="date-input" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("@/components/ui/Pagination", () => ({
  default: ({ page, total, isLoading, onPageChange }: ComponentProps<typeof Pagination>) => (
    <div>
      <output data-testid="pagination">{page}:{total}:{String(isLoading)}</output>
      <button disabled={isLoading} onClick={() => onPageChange(page + 1)}>Next page</button>
    </div>
  ),
}));
vi.mock("@/services/arsip.service", () => ({
  arsipService: {
    getRequestable: mocks.getRequestable,
    getReportSummary: mocks.getSummary,
    getDocumentReportPage: mocks.getDocumentPage,
    getDueDateReportPage: mocks.getDueDatePage,
  },
}));
vi.mock("@/services/peminjaman.service", () => ({
  peminjamanService: { getReportPage: mocks.getLoanPage, getReport: mocks.getLoanReport },
}));
vi.mock("@/services/user.service", () => ({ userService: { getAssignableAll: mocks.getAssignable } }));
vi.mock("@/services/division.service", () => ({ divisionService: { getAll: mocks.getDivisions } }));

const DOCUMENT: Dokumen = {
  id: "doc-1", kode: "DOC-001", namaDokumen: "Dokumen Awal", jenisDokumen: "Legalitas",
  detail: "Uji respons tertunda", tglInput: "2026-11-13", userInput: "admin",
  statusPinjam: "Tersedia", statusPinjamKey: "AVAILABLE", levelAkses: "NON_RESTRICT", restrict: false,
};
const OWNER: UserRecord = {
  id: "owner-1", name: "PIC Awal", username: "pic", email: "pic@example.test", role_id: "role-1",
  division_id: "division-1", can_access_restricted_documents: false, is_restrict: false, is_active: true,
};
const LOAN: Peminjaman = {
  id: "loan-1", dokumenId: DOCUMENT.id, document: DOCUMENT, detail: "Peminjaman uji", peminjam: "Peminjam",
  tglPinjam: "2026-11-13", tglKembali: "2026-11-14", tglPengembalian: null, status: "Dipinjam", statusKey: "BORROWED",
  alasan: "Uji pinjam", approver: null, tglApprove: null, jamApprove: null, alasanApprove: null, tanggalTolak: null,
  alasanTolak: null, tglPenyerahan: null, catatanPenyerahan: null, tanggalDikembalikan: null, catatanPengembalian: null,
  isTerlambat: false,
};
const meta = (page = 1) => ({ page, lastPage: 3, total: 30, limit: 10 });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("arsip page request ownership", () => {
  beforeEach(() => {
    mocks.user = { id: "user-1", role_id: "role-1" };
    mocks.canCreate = true;
    mocks.canUpdate = true;
    mocks.canReadDebtors = true;
    mocks.documents = [];
    mocks.loans = [];
    mocks.getRequestable.mockReset().mockResolvedValue([DOCUMENT]);
    mocks.submitDisposisi.mockReset().mockResolvedValue(1);
    mocks.getAssignable.mockReset().mockResolvedValue([OWNER]);
    mocks.getDivisions.mockReset().mockResolvedValue([]);
    mocks.getSummary.mockReset().mockResolvedValue(null);
    mocks.getDocumentPage.mockReset().mockResolvedValue({ items: [DOCUMENT], meta: meta() });
    mocks.getDueDatePage.mockReset().mockResolvedValue({ items: [], meta: meta() });
    mocks.getLoanPage.mockReset().mockResolvedValue({ items: [LOAN], meta: meta() });
    mocks.getLoanReport.mockReset().mockResolvedValue([LOAN]);
  });

  it("resets loan pagination before fetching a changed filter and ignores the previous page failure", async () => {
    const oldPage = deferred<{ items: Peminjaman[]; meta: ReturnType<typeof meta> }>();
    mocks.getLoanPage.mockResolvedValueOnce({ items: [LOAN], meta: meta() }).mockReturnValueOnce(oldPage.promise);
    render(<LaporanPeminjamanPage />);
    await screen.findByText("Dokumen Awal");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(mocks.getLoanPage).toHaveBeenCalledTimes(2));
    const filtered = deferred<{ items: Peminjaman[]; meta: ReturnType<typeof meta> }>();
    mocks.getLoanPage.mockReturnValueOnce(filtered.promise);
    fireEvent.change(screen.getByLabelText("Status Peminjaman"), { target: { value: "Dikembalikan" } });
    expect(screen.queryByText("Dokumen Awal")).not.toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toHaveTextContent("1:0:true");
    await waitFor(() => expect(mocks.getLoanPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: "RETURNED" })));
    await act(async () => {
      oldPage.reject(new Error("old page failed"));
      filtered.resolve({ items: [{ ...LOAN, document: { ...DOCUMENT, namaDokumen: "Dokumen Baru" } }], meta: meta() });
    });
    expect(await screen.findByText("Dokumen Baru")).toBeInTheDocument();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("hides the previous report rows immediately and ignores a response after switching reports", async () => {
    const oldPage = deferred<{ items: Dokumen[]; meta: ReturnType<typeof meta> }>();
    mocks.getDocumentPage.mockResolvedValueOnce({ items: [DOCUMENT], meta: meta() }).mockReturnValueOnce(oldPage.promise);
    render(<LaporanArsipDigitalPage />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat Dokumen/ }));
    await screen.findByText("Dokumen Awal");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(mocks.getDocumentPage).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Dokumen Awal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Jatuh Tempo/ }));
    await waitFor(() => expect(mocks.getDueDatePage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
    await act(async () => oldPage.resolve({ items: [{ ...DOCUMENT, namaDokumen: "Respons Terlambat" }], meta: meta(2) }));
    expect(screen.queryByText("Respons Terlambat")).not.toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toHaveTextContent("1:30:false");
  });

  it("clears selected requests on permission loss and fetches again when permission returns", async () => {
    const view = render(<PengajuanDisposisiPageClient />);
    fireEvent.click(await screen.findByText("Dokumen Awal"));
    expect(screen.getByRole("button", { name: /Ajukan Disposisi/ })).not.toBeDisabled();
    mocks.canCreate = false;
    view.rerender(<PengajuanDisposisiPageClient />);
    expect(screen.queryByText("Dokumen Awal")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajukan Disposisi/ })).toBeDisabled();
    const fresh = deferred<Dokumen[]>();
    mocks.getRequestable.mockReturnValueOnce(fresh.promise);
    mocks.canCreate = true;
    view.rerender(<PengajuanDisposisiPageClient />);
    expect(screen.getByText("Memuat dokumen yang bisa diajukan...")).toBeInTheDocument();
    await act(async () => fresh.resolve([DOCUMENT]));
    expect(await screen.findByText("Dokumen Awal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajukan Disposisi/ })).toBeDisabled();
  });

  it("does not publish an old user's requestable documents after the user changes", async () => {
    const old = deferred<Dokumen[]>();
    const fresh = deferred<Dokumen[]>();
    mocks.getRequestable.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const view = render(<PengajuanDisposisiPageClient />);
    mocks.user = { id: "user-2", role_id: "role-1" };
    view.rerender(<PengajuanDisposisiPageClient />);
    await act(async () => {
      fresh.resolve([{ ...DOCUMENT, namaDokumen: "Dokumen Pengguna Baru" }]);
      old.reject(new Error("old scope failed"));
    });
    expect(await screen.findByText("Dokumen Pengguna Baru")).toBeInTheDocument();
    expect(screen.queryByText("Dokumen Awal")).not.toBeInTheDocument();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("does not clear a new request selection when a submission from a revoked scope finishes", async () => {
    const submitted = deferred<number>();
    mocks.submitDisposisi.mockReturnValueOnce(submitted.promise);
    const view = render(<PengajuanDisposisiPageClient />);
    fireEvent.click(await screen.findByText("Dokumen Awal"));
    fireEvent.click(screen.getByRole("button", { name: /Ajukan Disposisi/ }));
    fireEvent.change(screen.getByPlaceholderText("Jelaskan alasan Anda membutuhkan akses ke dokumen ini..."), {
      target: { value: "Keperluan pemeriksaan" },
    });
    fireEvent.change(screen.getByTestId("date-input"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Pengajuan" }));
    await waitFor(() => expect(mocks.submitDisposisi).toHaveBeenCalledTimes(1));
    mocks.canCreate = false;
    view.rerender(<PengajuanDisposisiPageClient />);
    mocks.canCreate = true;
    view.rerender(<PengajuanDisposisiPageClient />);
    fireEvent.click(await screen.findByText("Dokumen Awal"));
    await act(async () => submitted.resolve(1));
    expect(screen.getByRole("button", { name: /Ajukan Disposisi/ })).not.toBeDisabled();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("closes document editing on permission loss and ignores the old ownership lookup", async () => {
    const old = deferred<UserRecord[]>();
    mocks.documents = [DOCUMENT];
    mocks.getAssignable.mockReturnValueOnce(old.promise);
    const view = render(<ListDokumenPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog", { name: "Edit Dokumen" })).toBeInTheDocument();
    mocks.canUpdate = false;
    view.rerender(<ListDokumenPage />);
    expect(screen.queryByRole("dialog", { name: "Edit Dokumen" })).not.toBeInTheDocument();
    mocks.getAssignable.mockResolvedValueOnce([{ ...OWNER, id: "owner-2", name: "PIC Baru" }]);
    mocks.canUpdate = true;
    view.rerender(<ListDokumenPage />);
    await waitFor(() => expect(mocks.getAssignable).toHaveBeenCalledTimes(2));
    await act(async () => old.resolve([OWNER]));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("option", { name: /PIC Baru/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /PIC Awal/ })).not.toBeInTheDocument();
  });

  it("discards a debtor association when debtor access is revoked", async () => {
    const view = render(<InputDokumenPage />);
    fireEvent.change(screen.getByLabelText("Debitur Terkait"), { target: { value: "debtor-1" } });
    expect(screen.getByLabelText("Debitur Terkait")).toHaveValue("debtor-1");
    mocks.canReadDebtors = false;
    view.rerender(<InputDokumenPage />);
    expect(screen.queryByLabelText("Debitur Terkait")).not.toBeInTheDocument();
    mocks.canReadDebtors = true;
    view.rerender(<InputDokumenPage />);
    expect(screen.getByLabelText("Debitur Terkait")).toHaveValue("");
    await act(async () => undefined);
  });
});
