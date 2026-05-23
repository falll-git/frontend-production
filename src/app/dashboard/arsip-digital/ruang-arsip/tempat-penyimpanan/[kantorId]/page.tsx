"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Box,
  Building2,
  Layers,
  SearchX,
  Warehouse,
} from "lucide-react";

import DokumenModal from "@/components/arsip/DokumenModal";
import RakGridModal from "@/components/arsip/RakGridModal";
import StorageSummaryCard from "@/components/arsip/StorageSummaryCard";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import { SETUP_PAGE_SEARCH_CARD_CLASS } from "@/components/ui/setupPageStyles";
import { DEFAULT_PAGINATION_META } from "@/lib/pagination";
import type { Kantor, Lemari, Rak } from "@/lib/types";
import { arsipService } from "@/services/arsip.service";
import type { PaginationMeta } from "@/types/api.types";

const ITEMS_PER_PAGE = 6;
const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: ITEMS_PER_PAGE,
};

export default function KantorLemariPage() {
  const params = useParams<{ kantorId?: string | string[] }>();
  const kantorId = Array.isArray(params.kantorId)
    ? params.kantorId[0] ?? ""
    : (params.kantorId ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [kantor, setKantor] = useState<Kantor | null>(null);
  const [lemariPage, setLemariPage] = useState<Lemari[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [isLoadingKantor, setIsLoadingKantor] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedLemari, setSelectedLemari] = useState<Lemari | null>(null);
  const [selectedRak, setSelectedRak] = useState<Rak | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    let ignore = false;

    async function loadKantor() {
      setIsLoadingKantor(true);
      try {
        const result = await arsipService.getStorageOfficesPage({
          limit: "all",
        });
        if (ignore) return;
        setKantor(result.items.find((item) => item.id === kantorId) ?? null);
      } catch (error) {
        if (!ignore) {
          setKantor(null);
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat data kantor",
          );
        }
      } finally {
        if (!ignore) setIsLoadingKantor(false);
      }
    }

    void loadKantor();

    return () => {
      ignore = true;
    };
  }, [kantorId]);

  useEffect(() => {
    let ignore = false;

    async function loadLemari() {
      setIsLoading(true);
      try {
        const result = await arsipService.getOfficeCabinetsPage(kantorId, {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch || undefined,
        });
        if (ignore) return;
        setLemariPage(result.items);
        setPaginationMeta(result.meta);
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setLemariPage([]);
          setPaginationMeta(INITIAL_PAGINATION_META);
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat daftar lemari",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadLemari();

    return () => {
      ignore = true;
    };
  }, [currentPage, debouncedSearch, kantorId]);

  const handleCloseAll = () => {
    setSelectedRak(null);
    setSelectedLemari(null);
  };

  if (!kantor) {
    return (
      <DashboardPageShell>
        <div className="mb-4">
          <Link
            href="/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan"
            className="uiverse-modal-button uiverse-modal-button--neutral"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Ruang Arsip Digital
          </Link>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {isLoadingKantor ? "Memuat data kantor..." : "Kantor tidak ditemukan"}
          </p>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="mb-4">
        <Link
          href="/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan"
          className="uiverse-modal-button uiverse-modal-button--neutral"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Ruang Arsip Digital
        </Link>
      </div>

      <FeatureHeader
        title={kantor.namaKantor}
        subtitle="Daftar lemari penyimpanan dokumen."
        icon={<Warehouse />}
      />

      <div className={`mb-6 ${SETUP_PAGE_SEARCH_CARD_CLASS}`}>
        <SetupSearchInput
          label="Cari Lemari"
          placeholder="Cari kode lemari..."
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-gray-700">{errorMessage}</p>
        </div>
      ) : isLoading && lemariPage.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-gray-700">
            Memuat daftar lemari...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {lemariPage.map((lemari, idx) => (
            <StorageSummaryCard
              key={lemari.id}
              style={{ animationDelay: `${idx * 0.1}s` }}
              icon={<Archive className="h-6 w-6" aria-hidden="true" />}
              total={lemari.totalDokumen ?? 0}
              rows={[
                {
                  icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
                  label: "Kantor",
                  value: kantor.namaKantor,
                },
                {
                  icon: <Box className="h-4 w-4" aria-hidden="true" />,
                  label: "Kode Lemari",
                  value: lemari.kodeLemari,
                },
                {
                  icon: <Layers className="h-4 w-4" aria-hidden="true" />,
                  label: "Jumlah Rak",
                  value: lemari.jumlahRak ?? 0,
                },
              ]}
              actionLabel="Lihat Rak"
              onAction={() => {
                setSelectedLemari(lemari);
                setSelectedRak(null);
              }}
            />
          ))}
        </div>
      )}

      {!errorMessage && !isLoading && paginationMeta.total === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-gray-700">
            Tidak ada lemari yang sesuai pencarian
          </p>
        </div>
      ) : null}

      <Pagination
        page={paginationMeta.page}
        lastPage={paginationMeta.lastPage}
        total={paginationMeta.total}
        limit={paginationMeta.limit}
        className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm"
        onPageChange={setCurrentPage}
      />

      {selectedLemari && !selectedRak ? (
        <RakGridModal
          lemari={selectedLemari}
          kantor={kantor}
          onBack={() => setSelectedLemari(null)}
          onClose={handleCloseAll}
          onSelectRak={setSelectedRak}
        />
      ) : null}

      {selectedLemari && selectedRak ? (
        <DokumenModal
          lemari={selectedLemari}
          namaKantor={kantor.namaKantor}
          rak={selectedRak}
          onBack={() => setSelectedRak(null)}
          onCloseAll={handleCloseAll}
        />
      ) : null}
    </DashboardPageShell>
  );
}
