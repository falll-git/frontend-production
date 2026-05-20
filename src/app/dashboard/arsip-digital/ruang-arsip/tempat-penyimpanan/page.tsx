"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  BookOpen,
  Building2,
  SearchX,
  Warehouse,
} from "lucide-react";

import DokumenListModal from "@/components/arsip/DokumenListModal";
import LemariGridModal from "@/components/arsip/LemariGridModal";
import RakGridModal from "@/components/arsip/RakGridModal";
import StorageSummaryCard from "@/components/arsip/StorageSummaryCard";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import {
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_WIDTH_2XL_CLASS,
} from "@/components/ui/setupPageStyles";
import { buildArsipDigitalStorageData } from "@/lib/arsip-digital-storage";
import { DEFAULT_PAGINATION_META } from "@/lib/pagination";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { arsipService } from "@/services/arsip.service";
import type { PaginationMeta } from "@/types/api.types";
import type { Kantor, Lemari, Rak } from "@/lib/types";
import Pagination from "@/components/ui/Pagination";

const STORAGE_GRID_PAGE_SIZE = 6;
const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: STORAGE_GRID_PAGE_SIZE,
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export default function TempatPenyimpananPage() {
  const { tempatPenyimpanan } = useArsipDigitalMasterData();
  const { dokumen, disposisi, peminjaman } = useArsipDigitalWorkflow();
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedKantor, setSelectedKantor] = useState<Kantor | null>(null);
  const [selectedLemari, setSelectedLemari] = useState<Lemari | null>(null);
  const [selectedRak, setSelectedRak] = useState<Rak | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [kantorPage, setKantorPage] = useState<Kantor[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [isLoadingKantor, setIsLoadingKantor] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const storageData = useMemo(
    () =>
      buildArsipDigitalStorageData({
        tempatPenyimpanan,
        dokumen,
        disposisi,
        peminjaman,
        today,
      }),
    [disposisi, dokumen, peminjaman, tempatPenyimpanan, today],
  );

  const kantorSummary = useMemo(() => {
    return storageData.kantorList.map((kantor) => ({
      id: kantor.id,
      namaKantor: kantor.namaKantor,
      totalDokumen: storageData.totalDokumenByKantor.get(kantor.id) ?? 0,
      jumlahLemari: storageData.jumlahLemariByKantor.get(kantor.id) ?? 0,
      dokumenDisposisi: storageData.disposisiByKantor.get(kantor.id) ?? 0,
      dokumenDipinjam: storageData.peminjamanByKantor.get(kantor.id) ?? 0,
      dokumenDipinjamJatuhTempo:
        storageData.jatuhTempoByKantor.get(kantor.id) ?? 0,
    }));
  }, [storageData]);

  const filteredKantorSummary = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return kantorSummary;
    return kantorSummary.filter((kantor) =>
      kantor.namaKantor.toLowerCase().includes(query),
    );
  }, [kantorSummary, searchTerm]);

  const lemariList = useMemo(
    () => {
      if (!selectedKantor) return [];
      const selectedKantorCode = selectedKantor.kodeKantor ?? selectedKantor.id;
      return storageData.lemariList.filter(
        (item) => item.kantorId === selectedKantorCode,
      );
    },
    [selectedKantor, storageData.lemariList],
  );

  const dokumenList = useMemo(
    () =>
      selectedRak
        ? storageData.dokumenArsipList.filter((item) => item.rakId === selectedRak.id)
        : [],
    [selectedRak, storageData.dokumenArsipList],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    let isCancelled = false;

    void arsipService
      .getStorageOfficesPage({
        page: currentPage,
        limit: STORAGE_GRID_PAGE_SIZE,
        search: debouncedSearch || undefined,
      })
      .then((result) => {
        if (isCancelled) return;
        setKantorPage(result.items);
        setPaginationMeta(result.meta);
      })
      .catch((error) => {
        if (isCancelled) return;
        setKantorPage([]);
        setPaginationMeta(INITIAL_PAGINATION_META);
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat daftar kantor",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingKantor(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, debouncedSearch]);

  const handleExport = async () => {
    await exportToExcel({
      filename: "ruang-arsip-digital",
      sheetName: "Ruang Arsip Digital",
      title: "Ruang Arsip Digital",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Kantor", key: "namaKantor", width: 24 },
        { header: "Total Arsip", key: "totalDokumen", width: 14 },
        { header: "Jumlah Lemari", key: "jumlahLemari", width: 14 },
        { header: "Dokumen Disposisi", key: "dokumenDisposisi", width: 18 },
        { header: "Dokumen Dipinjam", key: "dokumenDipinjam", width: 18 },
        {
          header: "Peminjaman Jatuh Tempo",
          key: "dokumenDipinjamJatuhTempo",
          width: 20,
        },
      ],
      data: filteredKantorSummary.map((kantor, idx) => ({
        no: idx + 1,
        namaKantor: kantor.namaKantor,
        totalDokumen: kantor.totalDokumen,
        jumlahLemari: kantor.jumlahLemari,
        dokumenDisposisi: kantor.dokumenDisposisi,
        dokumenDipinjam: kantor.dokumenDipinjam,
        dokumenDipinjamJatuhTempo: kantor.dokumenDipinjamJatuhTempo,
      })),
    });
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <FeatureHeader
        title="Ruang Arsip Digital"
        subtitle="Laporan visual penyimpanan dokumen fisik dan digital."
        icon={<Warehouse />}
        actions={
          <SetupExcelButton onClick={handleExport} />
        }
      />

      <div className={`mb-6 ${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <SetupSearchInput
              label="Cari Kantor"
              placeholder="Cari nama kantor..."
              value={searchTerm}
              onChange={(event) => {
                setIsLoadingKantor(true);
                setErrorMessage("");
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Cari kantor"
            />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-slate-900">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-gray-700">
            {errorMessage}
          </p>
        </div>
      ) : isLoadingKantor && kantorPage.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-gray-700">
            Memuat daftar kantor...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {kantorPage.map((kantor, idx) => (
              <StorageSummaryCard
                key={kantor.id}
                style={{ animationDelay: `${idx * 0.1}s` }}
                icon={<Warehouse className="h-6 w-6" aria-hidden="true" />}
                total={kantor.totalDokumen ?? 0}
                rows={[
                  {
                    icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
                    label: "Kantor",
                    value: kantor.namaKantor,
                  },
                  {
                    icon: <Archive className="h-4 w-4" aria-hidden="true" />,
                    label: "Jumlah Lemari",
                    value: kantor.jumlahLemari ?? 0,
                  },
                  {
                    icon: <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />,
                    label: "Dokumen Disposisi",
                    value: kantor.dokumenDisposisi ?? 0,
                    onClick: () =>
                      router.push(
                        `/dashboard/arsip-digital/disposisi/historis?kantorId=${kantor.id}`,
                      ),
                  },
                  {
                    icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
                    label: "Dokumen Dipinjam",
                    value: kantor.dokumenDipinjam ?? 0,
                    onClick: () =>
                      router.push(
                        `/dashboard/arsip-digital/historis/peminjaman?kantorId=${kantor.id}`,
                      ),
                  },
                  {
                    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
                    label: "Peminjaman Jatuh Tempo",
                    value: kantor.dokumenDipinjamJatuhTempo ?? 0,
                    onClick: () =>
                      router.push(
                        `/dashboard/arsip-digital/ruang-arsip/jatuh-tempo?kantorId=${kantor.kodeKantor ?? kantor.id}`,
                      ),
                  },
                ]}
                actionLabel="Lihat Lemari"
                onAction={() => {
                  setSelectedKantor({
                    id: kantor.id,
                    kodeKantor: kantor.kodeKantor,
                    namaKantor: kantor.namaKantor,
                  });
                  setSelectedLemari(null);
                  setSelectedRak(null);
                }}
              />
            ))}
          </div>

          <Pagination
            page={paginationMeta.page}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            limit={paginationMeta.limit}
            isLoading={isLoadingKantor}
            className="rounded-lg border border-gray-200 bg-white shadow-sm"
            onPageChange={(page) => {
              setIsLoadingKantor(true);
              setErrorMessage("");
              setCurrentPage(page);
            }}
          />
        </div>
      )}

      {!errorMessage && !isLoadingKantor && paginationMeta.total === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-gray-700">
            Tidak ada kantor yang sesuai pencarian
          </p>
        </div>
      ) : null}

      {selectedKantor ? (
        <LemariGridModal
          kantor={selectedKantor}
          lemariList={lemariList}
          rakList={storageData.rakList}
          dokumenList={storageData.dokumenArsipList}
          onSelectLemari={(lemari) => setSelectedLemari(lemari)}
          onClose={() => {
            setSelectedKantor(null);
            setSelectedLemari(null);
            setSelectedRak(null);
          }}
        />
      ) : null}

      {selectedKantor && selectedLemari ? (
        <RakGridModal
          lemari={selectedLemari}
          kantor={selectedKantor}
          onSelectRak={(rak) => setSelectedRak(rak)}
          onBack={() => {
            setSelectedLemari(null);
            setSelectedRak(null);
          }}
          onClose={() => {
            setSelectedKantor(null);
            setSelectedLemari(null);
            setSelectedRak(null);
          }}
        />
      ) : null}

      {selectedKantor && selectedLemari && selectedRak ? (
        <DokumenListModal
          rak={selectedRak}
          lemari={selectedLemari}
          kantor={selectedKantor}
          dokumenList={dokumenList}
          onBack={() => setSelectedRak(null)}
          onClose={() => {
            setSelectedKantor(null);
            setSelectedLemari(null);
            setSelectedRak(null);
          }}
        />
      ) : null}
    </div>
  );
}
