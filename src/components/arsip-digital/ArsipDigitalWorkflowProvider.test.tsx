import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ArsipDigitalWorkflowProvider,
  useArsipDigitalWorkflow,
} from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import type { Dokumen } from "@/types/arsip.types";

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard/arsip-digital/peminjaman/request",
  auth: {
    status: "authenticated",
    role: "Admin",
    user: { id: "user-1", role_id: "role-admin" },
  },
  capabilities: new Set<string>(),
  showToast: vi.fn(),
  getDocuments: vi.fn(),
  getStorageHistories: vi.fn(),
  getAccessRequests: vi.fn(),
  getLoans: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock("@/lib/rbac", () => ({
  hasDashboardCapability: (path: string) => mocks.capabilities.has(path),
}));

vi.mock("@/services/arsip.service", () => ({
  arsipService: {
    getAll: mocks.getDocuments,
    getStorageHistories: mocks.getStorageHistories,
    create: vi.fn(),
  },
}));

vi.mock("@/services/disposisi-arsip.service", () => ({
  disposisiArsipService: {
    getAll: mocks.getAccessRequests,
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock("@/services/peminjaman.service", () => ({
  peminjamanService: {
    getAll: mocks.getLoans,
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    handover: vi.fn(),
    returnLoan: vi.fn(),
  },
}));

const ALL_CAPABILITIES = [
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
  "/dashboard/arsip-digital/disposisi/pengajuan",
  "/dashboard/arsip-digital/peminjaman/request",
  "/dashboard/arsip-digital/historis/penyimpanan",
];

const DOCUMENT: Dokumen = {
  id: "document-1",
  kode: "DOC-001",
  jenisDokumen: "Legalitas",
  namaDokumen: "Dokumen Uji",
  detail: "Fixture provider",
  tglInput: "2026-08-15T00:00:00.000Z",
  userInput: "admin",
  statusPinjam: "Tersedia",
  statusPinjamKey: "AVAILABLE",
  levelAkses: "NON_RESTRICT",
  restrict: false,
};

function WorkflowProbe() {
  const workflow = useArsipDigitalWorkflow();
  return (
    <div>
      <span data-testid="documents">{workflow.dokumen.length}</span>
      <span data-testid="access-requests">{workflow.disposisi.length}</span>
      <span data-testid="loans">{workflow.peminjaman.length}</span>
      <span data-testid="storage-histories">
        {workflow.aktivitasPenyimpanan.length}
      </span>
      <span data-testid="loading">{String(workflow.isLoading)}</span>
      <button type="button" onClick={() => void workflow.refreshWorkflowData()}>
        Muat ulang
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ArsipDigitalWorkflowProvider>
      <WorkflowProbe />
    </ArsipDigitalWorkflowProvider>,
  );
}

describe("ArsipDigitalWorkflowProvider", () => {
  beforeEach(() => {
    mocks.pathname = "/dashboard/arsip-digital/peminjaman/request";
    mocks.auth.status = "authenticated";
    mocks.auth.role = "Admin";
    mocks.auth.user = { id: "user-1", role_id: "role-admin" };
    mocks.capabilities = new Set(ALL_CAPABILITIES);
    mocks.getDocuments.mockResolvedValue([DOCUMENT]);
    mocks.getStorageHistories.mockResolvedValue([]);
    mocks.getAccessRequests.mockResolvedValue([]);
    mocks.getLoans.mockResolvedValue([]);
  });

  it("mempertahankan resource yang berhasil ketika satu endpoint workflow gagal", async () => {
    mocks.getAccessRequests.mockRejectedValue(new Error("endpoint gagal"));
    mocks.getLoans.mockResolvedValue([{ id: "loan-1" }]);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("documents")).toHaveTextContent("1");
      expect(screen.getByTestId("loans")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("access-requests")).toHaveTextContent("0");
    expect(mocks.showToast).toHaveBeenCalledWith(
      expect.stringContaining("disposisi"),
      "error",
    );
  });

  it("tidak memanggil endpoint yang tidak diizinkan oleh role aktif", async () => {
    mocks.capabilities = new Set([
      "/dashboard/arsip-digital/peminjaman/request",
    ]);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("documents")).toHaveTextContent("1");
    });
    expect(mocks.getDocuments).toHaveBeenCalledTimes(1);
    expect(mocks.getLoans).toHaveBeenCalledTimes(1);
    expect(mocks.getAccessRequests).not.toHaveBeenCalled();
    expect(mocks.getStorageHistories).not.toHaveBeenCalled();
  });

  it("mendeduplikasi refresh bersamaan agar tidak membebani endpoint global", async () => {
    let resolveDocuments: (value: (typeof DOCUMENT)[]) => void = () => undefined;
    mocks.getDocuments.mockReturnValue(
      new Promise<(typeof DOCUMENT)[]>((resolve) => {
        resolveDocuments = resolve;
      }),
    );
    const user = userEvent.setup();

    renderProvider();
    await waitFor(() => expect(mocks.getDocuments).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Muat ulang" }));
    await user.click(screen.getByRole("button", { name: "Muat ulang" }));
    expect(mocks.getDocuments).toHaveBeenCalledTimes(1);

    resolveDocuments([DOCUMENT]);
    await waitFor(() => {
      expect(screen.getByTestId("documents")).toHaveTextContent("1");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("mengosongkan cache pengguna lama sebelum memuat scope pengguna baru", async () => {
    const view = renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId("documents")).toHaveTextContent("1");
    });

    let resolveSecondUser: (value: (typeof DOCUMENT)[]) => void = () => undefined;
    mocks.getDocuments.mockReturnValueOnce(
      new Promise<(typeof DOCUMENT)[]>((resolve) => {
        resolveSecondUser = resolve;
      }),
    );
    mocks.auth.user = { id: "user-2", role_id: "role-admin" };
    view.rerender(
      <ArsipDigitalWorkflowProvider>
        <WorkflowProbe />
      </ArsipDigitalWorkflowProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("documents")).toHaveTextContent("0");
      expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    resolveSecondUser([{ ...DOCUMENT, id: "document-2", kode: "DOC-002" }]);
    await waitFor(() => {
      expect(screen.getByTestId("documents")).toHaveTextContent("1");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });
});
