"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { hasDashboardCapability } from "@/lib/rbac";
import { arsipService, type CreateDokumenPayload } from "@/services/arsip.service";
import { disposisiArsipService } from "@/services/disposisi-arsip.service";
import { peminjamanService } from "@/services/peminjaman.service";
import type {
  AktivitasPenyimpanan,
  Disposisi,
  Dokumen,
  Peminjaman,
} from "@/types/arsip.types";

type SubmitDisposisiParams = {
  dokumenIds: string[];
  alasanPengajuan: string;
  tanggalExpired: string;
};

type ProcessDisposisiParams = {
  id: string;
  action: "approve" | "reject";
  alasanAksi: string;
  tanggalExpired?: string;
};

type SubmitPeminjamanParams = {
  dokumenIds: string[];
  tanggalPeminjaman: string;
  tanggalPengembalian: string;
  alasan: string;
};

type WorkflowRefreshOptions = {
  force?: boolean;
};

type ArsipDigitalWorkflowValue = {
  dokumen: Dokumen[];
  disposisi: Disposisi[];
  peminjaman: Peminjaman[];
  aktivitasPenyimpanan: AktivitasPenyimpanan[];
  isLoading: boolean;
  createDokumen: (params: CreateDokumenPayload) => Promise<Dokumen>;
  submitDisposisi: (params: SubmitDisposisiParams) => Promise<number>;
  processDisposisi: (params: ProcessDisposisiParams) => Promise<boolean>;
  submitPeminjaman: (params: SubmitPeminjamanParams) => Promise<number>;
  approvePeminjaman: (params: {
    id: string;
    approvalNote: string;
  }) => Promise<boolean>;
  rejectPeminjaman: (params: {
    id: string;
    rejectionNote: string;
  }) => Promise<boolean>;
  handoverPeminjaman: (params: {
    id: string;
    handoverAt: string;
    handoverNote: string;
  }) => Promise<boolean>;
  returnPeminjaman: (params: {
    id: string;
    returnedAt: string;
    returnNote: string;
  }) => Promise<boolean>;
  refreshWorkflowData: (options?: WorkflowRefreshOptions) => Promise<void>;
  resetWorkflowData: () => Promise<void>;
};

interface ArsipDigitalWorkflowProviderProps {
  children: ReactNode;
}

const ArsipDigitalWorkflowContext =
  createContext<ArsipDigitalWorkflowValue | null>(null);

const ARSIP_DIGITAL_ROOT_PATH = "/dashboard/arsip-digital";

const DIGITAL_DOCUMENT_READ_PATHS = [
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
  "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
  "/dashboard/arsip-digital/ruang-arsip/jatuh-tempo",
  "/dashboard/arsip-digital/peminjaman/request",
];

const ACCESS_REQUEST_READ_PATHS = [
  "/dashboard/arsip-digital/disposisi/pengajuan",
  "/dashboard/arsip-digital/disposisi/permintaan",
  "/dashboard/arsip-digital/disposisi/historis",
];

const LOAN_READ_PATHS = [
  "/dashboard/arsip-digital/peminjaman/request",
  "/dashboard/arsip-digital/peminjaman/accept",
  "/dashboard/arsip-digital/historis/peminjaman",
  "/dashboard/arsip-digital/ruang-arsip/jatuh-tempo",
];

const STORAGE_HISTORY_PATH = "/dashboard/arsip-digital/historis/penyimpanan";

const WORKFLOW_RESOURCE_LABELS = {
  dokumen: "dokumen",
  disposisi: "disposisi",
  peminjaman: "peminjaman",
  aktivitasPenyimpanan: "historis penyimpanan",
} as const;

function isArsipDigitalPath(pathname: string) {
  return (
    pathname === ARSIP_DIGITAL_ROOT_PATH ||
    pathname.startsWith(`${ARSIP_DIGITAL_ROOT_PATH}/`)
  );
}

export function ArsipDigitalWorkflowProvider({
  children,
}: ArsipDigitalWorkflowProviderProps): ReactNode {
  const { showToast } = useAppToast();
  const pathname = usePathname();
  const { status, role, user } = useAuth();
  const [dokumen, setDokumen] = useState<Dokumen[]>([]);
  const [disposisi, setDisposisi] = useState<Disposisi[]>([]);
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [aktivitasPenyimpanan, setAktivitasPenyimpanan] = useState<
    AktivitasPenyimpanan[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const refreshGenerationRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const activeScopeKeyRef = useRef<string | null>(null);

  const roleId = user?.role_id ?? null;
  const canReadDigitalDocuments = DIGITAL_DOCUMENT_READ_PATHS.some((path) =>
    hasDashboardCapability(path, role, roleId, "read"),
  );
  const canReadAccessRequests = ACCESS_REQUEST_READ_PATHS.some((path) =>
    hasDashboardCapability(path, role, roleId, "read"),
  );
  const canReadLoans = LOAN_READ_PATHS.some((path) =>
    hasDashboardCapability(path, role, roleId, "read"),
  );
  const canReadStorageHistories = hasDashboardCapability(
    STORAGE_HISTORY_PATH,
    role,
    roleId,
    "read",
  );
  const hasReadableWorkflowEndpoint =
    canReadDigitalDocuments ||
    canReadAccessRequests ||
    canReadLoans ||
    canReadStorageHistories;
  const shouldAutoLoad =
    status === "authenticated" &&
    isArsipDigitalPath(pathname) &&
    hasReadableWorkflowEndpoint;
  const activeScopeKey =
    status === "authenticated" && user?.id
      ? [
          user.id,
          roleId ?? "no-role",
          canReadDigitalDocuments ? "documents" : "no-documents",
          canReadAccessRequests ? "access" : "no-access",
          canReadLoans ? "loans" : "no-loans",
          canReadStorageHistories ? "storage" : "no-storage",
        ].join(":")
      : null;

  const refreshWorkflowData = useCallback(async ({
    force = false,
  }: WorkflowRefreshOptions = {}): Promise<void> => {
    if (!force && inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    if (!hasReadableWorkflowEndpoint) {
      refreshGenerationRef.current += 1;
      setDokumen([]);
      setDisposisi([]);
      setPeminjaman([]);
      setAktivitasPenyimpanan([]);
      setIsLoading(false);
      return;
    }

    const generation = refreshGenerationRef.current + 1;
    refreshGenerationRef.current = generation;
    setIsLoading(true);

    const refreshPromise = (async () => {
      const [dokumenResult, disposisiResult, peminjamanResult, aktivitasResult] =
        await Promise.allSettled([
          canReadDigitalDocuments
            ? arsipService.getAll()
            : Promise.resolve<Dokumen[]>([]),
          canReadAccessRequests
            ? disposisiArsipService.getAll()
            : Promise.resolve<Disposisi[]>([]),
          canReadLoans
            ? peminjamanService.getAll()
            : Promise.resolve<Peminjaman[]>([]),
          canReadStorageHistories
            ? arsipService.getStorageHistories()
            : Promise.resolve<AktivitasPenyimpanan[]>([]),
        ]);

      if (refreshGenerationRef.current !== generation) return;

      const failedResources: string[] = [];
      if (dokumenResult.status === "fulfilled") {
        setDokumen(dokumenResult.value);
      } else {
        failedResources.push(WORKFLOW_RESOURCE_LABELS.dokumen);
      }
      if (disposisiResult.status === "fulfilled") {
        setDisposisi(disposisiResult.value);
      } else {
        failedResources.push(WORKFLOW_RESOURCE_LABELS.disposisi);
      }
      if (peminjamanResult.status === "fulfilled") {
        setPeminjaman(peminjamanResult.value);
      } else {
        failedResources.push(WORKFLOW_RESOURCE_LABELS.peminjaman);
      }
      if (aktivitasResult.status === "fulfilled") {
        setAktivitasPenyimpanan(aktivitasResult.value);
      } else {
        failedResources.push(WORKFLOW_RESOURCE_LABELS.aktivitasPenyimpanan);
      }

      if (failedResources.length > 0) {
        showToast(
          `Sebagian data arsip digital gagal dimuat: ${failedResources.join(", ")}. Data lain yang berhasil dimuat tetap ditampilkan.`,
          "error",
        );
      }
    })();

    inFlightRefreshRef.current = refreshPromise;

    try {
      await refreshPromise;
    } finally {
      if (refreshGenerationRef.current === generation) {
        setIsLoading(false);
      }
      if (inFlightRefreshRef.current === refreshPromise) {
        inFlightRefreshRef.current = null;
      }
    }
  }, [
    canReadAccessRequests,
    canReadDigitalDocuments,
    canReadLoans,
    canReadStorageHistories,
    hasReadableWorkflowEndpoint,
    showToast,
  ]);

  useEffect(() => {
    if (activeScopeKeyRef.current === activeScopeKey) return;

    activeScopeKeyRef.current = activeScopeKey;
    refreshGenerationRef.current += 1;
    inFlightRefreshRef.current = null;
    setDokumen([]);
    setDisposisi([]);
    setPeminjaman([]);
    setAktivitasPenyimpanan([]);
    setIsLoading(false);
  }, [activeScopeKey]);

  useEffect(() => {
    if (!shouldAutoLoad) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshWorkflowData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeScopeKey, refreshWorkflowData, shouldAutoLoad]);

  const createDokumen = useCallback(
    async (params: CreateDokumenPayload): Promise<Dokumen> => {
      const created = await arsipService.create(params);
      await refreshWorkflowData({ force: true });
      return created;
    },
    [refreshWorkflowData],
  );

  const submitDisposisi = useCallback(
    async ({
      dokumenIds,
      alasanPengajuan,
      tanggalExpired,
    }: SubmitDisposisiParams): Promise<number> => {
      const created = await disposisiArsipService.create({
        document_ids: dokumenIds,
        request_reason: alasanPengajuan,
        expires_at: tanggalExpired,
      });
      await refreshWorkflowData({ force: true });
      return created.length;
    },
    [refreshWorkflowData],
  );

  const processDisposisi = useCallback(
    async ({
      id,
      action,
      alasanAksi,
      tanggalExpired,
    }: ProcessDisposisiParams): Promise<boolean> => {
      if (action === "approve") {
        if (!tanggalExpired) return false;
        await disposisiArsipService.approve(id, {
          expires_at: tanggalExpired,
          action_note: alasanAksi,
        });
      } else {
        await disposisiArsipService.reject(id, {
          action_note: alasanAksi,
        });
      }

      await refreshWorkflowData({ force: true });
      return true;
    },
    [refreshWorkflowData],
  );

  const submitPeminjaman = useCallback(
    async ({
      dokumenIds,
      tanggalPeminjaman,
      tanggalPengembalian,
      alasan,
    }: SubmitPeminjamanParams): Promise<number> => {
      const created = await peminjamanService.create({
        document_ids: dokumenIds,
        requested_start_date: tanggalPeminjaman,
        requested_due_date: tanggalPengembalian,
        request_reason: alasan,
      });

      await refreshWorkflowData({ force: true });
      return created.length;
    },
    [refreshWorkflowData],
  );

  const approvePeminjaman = useCallback(
    async ({
      id,
      approvalNote,
    }: {
      id: string;
      approvalNote: string;
    }): Promise<boolean> => {
      await peminjamanService.approve(id, {
        approval_note: approvalNote,
      });
      await refreshWorkflowData({ force: true });
      return true;
    },
    [refreshWorkflowData],
  );

  const rejectPeminjaman = useCallback(
    async ({
      id,
      rejectionNote,
    }: {
      id: string;
      rejectionNote: string;
    }): Promise<boolean> => {
      await peminjamanService.reject(id, {
        rejection_note: rejectionNote,
      });
      await refreshWorkflowData({ force: true });
      return true;
    },
    [refreshWorkflowData],
  );

  const handoverPeminjaman = useCallback(
    async ({
      id,
      handoverAt,
      handoverNote,
    }: {
      id: string;
      handoverAt: string;
      handoverNote: string;
    }): Promise<boolean> => {
      await peminjamanService.handover(id, {
        handover_at: handoverAt,
        handover_note: handoverNote,
      });
      await refreshWorkflowData({ force: true });
      return true;
    },
    [refreshWorkflowData],
  );

  const returnPeminjaman = useCallback(
    async ({
      id,
      returnedAt,
      returnNote,
    }: {
      id: string;
      returnedAt: string;
      returnNote: string;
    }): Promise<boolean> => {
      await peminjamanService.returnLoan(id, {
        returned_at: returnedAt,
        return_note: returnNote,
      });
      await refreshWorkflowData({ force: true });
      return true;
    },
    [refreshWorkflowData],
  );

  const value = useMemo<ArsipDigitalWorkflowValue>(
    () => ({
      dokumen,
      disposisi,
      peminjaman,
      aktivitasPenyimpanan,
      isLoading,
      createDokumen,
      submitDisposisi,
      processDisposisi,
      submitPeminjaman,
      approvePeminjaman,
      rejectPeminjaman,
      handoverPeminjaman,
      returnPeminjaman,
      refreshWorkflowData,
      resetWorkflowData: refreshWorkflowData,
    }),
    [
      aktivitasPenyimpanan,
      approvePeminjaman,
      createDokumen,
      disposisi,
      dokumen,
      handoverPeminjaman,
      isLoading,
      peminjaman,
      processDisposisi,
      refreshWorkflowData,
      rejectPeminjaman,
      returnPeminjaman,
      submitDisposisi,
      submitPeminjaman,
    ],
  );

  return (
    <ArsipDigitalWorkflowContext.Provider value={value}>
      {children}
    </ArsipDigitalWorkflowContext.Provider>
  );
}

export function useArsipDigitalWorkflow(): ArsipDigitalWorkflowValue {
  const context = useContext(ArsipDigitalWorkflowContext);
  if (!context) {
    throw new Error(
      "useArsipDigitalWorkflow must be used within ArsipDigitalWorkflowProvider",
    );
  }
  return context;
}
