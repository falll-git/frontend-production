"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useMemo, useState } from "react";

import { useAppToast } from "@/components/ui/AppToastProvider";
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

export function ArsipDigitalMasterDataProvider({
  children,
}: ArsipDigitalMasterDataProviderProps): ReactNode {
  const { showToast } = useAppToast();
  const [tempatPenyimpanan, setTempatPenyimpanan] = useState<Storage[]>([]);
  const [jenisDokumen, setJenisDokumen] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const resetMasterData = useCallback((): void => {
    setIsLoading(true);

    void Promise.all([
      storageService.getAll(),
      documentTypeService.getAll(),
    ])
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
  }, [showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      resetMasterData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [resetMasterData]);

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
