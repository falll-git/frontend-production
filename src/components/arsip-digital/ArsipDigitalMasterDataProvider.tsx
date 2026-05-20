"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { hasDashboardCapability } from "@/lib/rbac";
import { documentTypeService } from "@/services/document-type.service";
import { storageService } from "@/services/storage.service";
import type { DocumentType, Storage } from "@/types/master.types";

type ArsipDigitalMasterDataValue = {
  tempatPenyimpanan: Storage[];
  jenisDokumen: DocumentType[];
  isLoading: boolean;
  setTempatPenyimpanan: Dispatch<SetStateAction<Storage[]>>;
  setJenisDokumen: Dispatch<SetStateAction<DocumentType[]>>;
  resetMasterData: () => void;
};

interface ArsipDigitalMasterDataProviderProps {
  children: ReactNode;
}

const ArsipDigitalMasterDataContext =
  createContext<ArsipDigitalMasterDataValue | null>(null);

const MASTER_DATA_SCOPED_PATHS = [
  "/dashboard/arsip-digital/input-dokumen",
  "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
  "/dashboard/arsip-digital/ruang-arsip/jatuh-tempo",
  "/dashboard/arsip-digital/peminjaman/request",
  "/dashboard/parameter/tempat-penyimpanan",
  "/dashboard/parameter/jenis-dokumen",
];

const STORAGE_READ_PATHS = [
  "/dashboard/arsip-digital/input-dokumen",
  "/dashboard/arsip-digital/peminjaman/request",
  "/dashboard/parameter/tempat-penyimpanan",
  "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
];

const DOCUMENT_TYPE_READ_PATHS = [
  "/dashboard/arsip-digital/input-dokumen",
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen",
  "/dashboard/parameter/jenis-dokumen",
];

function isScopedPath(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function ArsipDigitalMasterDataProvider({
  children,
}: ArsipDigitalMasterDataProviderProps): ReactNode {
  const { showToast } = useAppToast();
  const pathname = usePathname();
  const { status, role, user } = useAuth();
  const [tempatPenyimpanan, setTempatPenyimpanan] = useState<Storage[]>([]);
  const [jenisDokumen, setJenisDokumen] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const roleId = user?.role_id ?? null;
  const isMasterDataPage = isScopedPath(pathname, MASTER_DATA_SCOPED_PATHS);
  const canReadStorage = STORAGE_READ_PATHS.some((path) =>
    hasDashboardCapability(path, role, roleId, "read"),
  );
  const canReadDocumentType = DOCUMENT_TYPE_READ_PATHS.some((path) =>
    hasDashboardCapability(path, role, roleId, "read"),
  );
  const shouldAutoLoad =
    status === "authenticated" &&
    isMasterDataPage &&
    (canReadStorage || canReadDocumentType);

  const resetMasterData = useCallback((): void => {
    if (!canReadStorage && !canReadDocumentType) {
      setTempatPenyimpanan([]);
      setJenisDokumen([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const storageRequest = canReadStorage
      ? storageService.getAll()
      : Promise.resolve<Storage[]>([]);
    const documentTypeRequest = canReadDocumentType
      ? documentTypeService.getAll()
      : Promise.resolve<DocumentType[]>([]);

    void Promise.all([storageRequest, documentTypeRequest])
      .then(([storages, documentTypes]) => {
        setTempatPenyimpanan(storages);
        setJenisDokumen(documentTypes);
      })
      .catch((error) => {
        setTempatPenyimpanan([]);
        setJenisDokumen([]);
        showToast(
          error instanceof Error
            ? error.message
            : "Gagal memuat master arsip digital",
          "error",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [canReadDocumentType, canReadStorage, showToast]);

  useEffect(() => {
    if (!shouldAutoLoad) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      resetMasterData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [resetMasterData, shouldAutoLoad]);

  const value = useMemo<ArsipDigitalMasterDataValue>(
    () => ({
      tempatPenyimpanan,
      jenisDokumen,
      isLoading,
      setTempatPenyimpanan,
      setJenisDokumen,
      resetMasterData,
    }),
    [isLoading, jenisDokumen, resetMasterData, tempatPenyimpanan],
  );

  return (
    <ArsipDigitalMasterDataContext.Provider value={value}>
      {children}
    </ArsipDigitalMasterDataContext.Provider>
  );
}

export function useArsipDigitalMasterData(): ArsipDigitalMasterDataValue {
  const ctx = useContext(ArsipDigitalMasterDataContext);
  if (!ctx) {
    throw new Error(
      "useArsipDigitalMasterData must be used within ArsipDigitalMasterDataProvider",
    );
  }
  return ctx;
}
