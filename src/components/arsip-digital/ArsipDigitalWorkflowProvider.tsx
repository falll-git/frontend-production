"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAppToast } from "@/components/ui/AppToastProvider";
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
  refreshWorkflowData: () => Promise<void>;
  resetWorkflowData: () => Promise<void>;
};

interface ArsipDigitalWorkflowProviderProps {
  children: ReactNode;
}

const ArsipDigitalWorkflowContext =
  createContext<ArsipDigitalWorkflowValue | null>(null);

export function ArsipDigitalWorkflowProvider({
  children,
}: ArsipDigitalWorkflowProviderProps): ReactNode {
  const { showToast } = useAppToast();
  const [dokumen, setDokumen] = useState<Dokumen[]>([]);
  const [disposisi, setDisposisi] = useState<Disposisi[]>([]);
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [aktivitasPenyimpanan, setAktivitasPenyimpanan] = useState<
    AktivitasPenyimpanan[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkflowData = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const [dokumenRows, disposisiRows, peminjamanRows, aktivitasRows] =
        await Promise.all([
          arsipService.getAll(),
          disposisiArsipService.getAll(),
          peminjamanService.getAll(),
          arsipService.getStorageHistories(),
        ]);

      setDokumen(dokumenRows);
      setDisposisi(disposisiRows);
      setPeminjaman(peminjamanRows);
      setAktivitasPenyimpanan(aktivitasRows);
    } catch (error) {
      setDokumen([]);
      setDisposisi([]);
      setPeminjaman([]);
      setAktivitasPenyimpanan([]);
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat data arsip digital",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshWorkflowData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshWorkflowData]);

  const createDokumen = useCallback(
    async (params: CreateDokumenPayload): Promise<Dokumen> => {
      const created = await arsipService.create(params);
      await refreshWorkflowData();
      return created;
    },
    [refreshWorkflowData],
  );

  const submitDisposisi = useCallback(
    async ({ dokumenIds, alasanPengajuan }: SubmitDisposisiParams): Promise<number> => {
      const created = await disposisiArsipService.create({
        document_ids: dokumenIds,
        request_reason: alasanPengajuan,
      });
      await refreshWorkflowData();
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

      await refreshWorkflowData();
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

      await refreshWorkflowData();
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
      await refreshWorkflowData();
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
      await refreshWorkflowData();
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
      await refreshWorkflowData();
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
      await refreshWorkflowData();
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
