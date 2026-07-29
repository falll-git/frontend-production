"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Search, SearchX } from "lucide-react";

import type {
  KolektibilitasItem,
  KolektibilitasNasabahItem,
  NpfKolektibilitasLevel,
} from "@/lib/types";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCode,
  SetupTableMoney,
  SetupTableNumber,
  SetupTablePrimaryText,
} from "@/components/ui/SetupDataTable";
import { COLLECTIBILITY_CHART_COLORS } from "@/components/ui/SetupCollectibilityBadge";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import DashboardModal from "@/components/ui/DashboardModal";
import Pagination from "@/components/ui/Pagination";
import SetupSelect from "@/components/ui/SetupSelect";
import { formatNumber, formatRupiah } from "@/lib/utils/laporan";

type SortOption =
  | "OUTSTANDING_DESC"
  | "OUTSTANDING_ASC"
  | "NAME_ASC"
  | "NAME_DESC";

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "OUTSTANDING_DESC", label: "Outstanding Tertinggi" },
  { value: "OUTSTANDING_ASC", label: "Outstanding Terendah" },
  { value: "NAME_ASC", label: "A-Z" },
  { value: "NAME_DESC", label: "Z-A" },
];

const MODAL_PAGE_SIZE = 10;

const COLLECTIBILITY_TEXT_COLORS: Record<NpfKolektibilitasLevel, string> = {
  1: "#047857",
  2: "#3f6212",
  3: "#854d0e",
  4: "#713f12",
  5: "#b91c1c",
};

function formatPercentage(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getShortLabel(label: string) {
  const [, shortLabel] = label.split("/");
  return shortLabel?.trim() || label.trim();
}

export default function KolektibilitasTable({
  rows,
  nasabah,
  selectedKol: controlledSelectedKol,
  onSelectedKolChange,
}: {
  rows: KolektibilitasItem[];
  nasabah: KolektibilitasNasabahItem[];
  selectedKol?: NpfKolektibilitasLevel | null;
  onSelectedKolChange?: (kol: NpfKolektibilitasLevel | null) => void;
}) {
  const [internalSelectedKol, setInternalSelectedKol] =
    useState<NpfKolektibilitasLevel | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("OUTSTANDING_DESC");
  const [page, setPage] = useState(1);
  const selectedKol =
    controlledSelectedKol === undefined
      ? internalSelectedKol
      : controlledSelectedKol;

  const updateSelectedKol = useCallback(
    (nextKol: NpfKolektibilitasLevel | null) => {
      if (onSelectedKolChange) {
        onSelectedKolChange(nextKol);
        return;
      }

      setInternalSelectedKol(nextKol);
    },
    [onSelectedKolChange],
  );

  const totalOutstanding = useMemo(
    () => rows.reduce((total, item) => total + item.outstandingPokok, 0),
    [rows],
  );

  const tableRows = useMemo(
    () =>
      rows.map((item) => {
        const level = item.kol as NpfKolektibilitasLevel;

        return {
          ...item,
          color: COLLECTIBILITY_CHART_COLORS[level],
          textColor: COLLECTIBILITY_TEXT_COLORS[level],
          level,
          shortLabel: getShortLabel(item.label),
          percentage:
            totalOutstanding === 0
              ? 0
              : (item.outstandingPokok / totalOutstanding) * 100,
        };
      }),
    [rows, totalOutstanding],
  );

  const selectedRow = useMemo(
    () => tableRows.find((item) => item.level === selectedKol) ?? null,
    [selectedKol, tableRows],
  );

  const visibleNasabah = useMemo(() => {
    if (selectedKol === null) {
      return [];
    }

    const keyword = searchTerm.trim().toLowerCase();

    return nasabah
      .filter((item) => {
        const matchesKol = item.kolektibilitas === selectedKol;
        const matchesSearch =
          keyword.length === 0 || item.nama.toLowerCase().includes(keyword);

        return matchesKol && matchesSearch;
      })
      .sort((left, right) => {
        if (sortOption === "OUTSTANDING_ASC") {
          return left.outstandingPokok - right.outstandingPokok;
        }

        if (sortOption === "NAME_ASC") {
          return left.nama.localeCompare(right.nama, "id-ID");
        }

        if (sortOption === "NAME_DESC") {
          return right.nama.localeCompare(left.nama, "id-ID");
        }

        return right.outstandingPokok - left.outstandingPokok;
      });
  }, [nasabah, searchTerm, selectedKol, sortOption]);

  const modalLastPage = Math.max(
    1,
    Math.ceil(visibleNasabah.length / MODAL_PAGE_SIZE),
  );
  const currentModalPage = Math.min(page, modalLastPage);
  const paginatedNasabah = useMemo(() => {
    const start = (currentModalPage - 1) * MODAL_PAGE_SIZE;
    return visibleNasabah.slice(start, start + MODAL_PAGE_SIZE);
  }, [currentModalPage, visibleNasabah]);

  useEffect(() => {
    if (selectedKol === null) {
      return undefined;
    }

    const initialOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        updateSelectedKol(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = initialOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedKol, updateSelectedKol]);

  const openModal = (kol: NpfKolektibilitasLevel) => {
    updateSelectedKol(kol);
    setSearchTerm("");
    setSortOption("OUTSTANDING_DESC");
    setPage(1);
  };

  const closeModal = () => {
    updateSelectedKol(null);
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="overflow-visible lg:overflow-x-auto">
          <SetupDataTable variant="portfolio" density="compact" className="text-sm">
            <SetupDataTableHead className="border-b bg-gray-50">
              <SetupDataTableRow>
                <SetupDataTableHeaderCell className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kolektibilitas
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nasabah
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Outstanding
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  %
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-100">
              {tableRows.map((item, index) => (
                <SetupDataTableRow
                  key={item.level}
                  role="button"
                  tabIndex={0}
                  onClick={() => openModal(item.level)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openModal(item.level);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <SetupDataTableCell className="px-4 py-3 text-center text-sm text-gray-500">
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: item.color,
                        }}
                        aria-hidden="true"
                      ></span>
                      <span className="text-sm font-medium text-gray-900">
                        Kol {item.level}
                      </span>
                    </div>
                  </SetupDataTableCell>
                  <SetupDataTableCell className="px-4 py-3 text-center text-sm text-gray-700">
                    <SetupTableNumber>{formatNumber(item.jumlahNasabah)}</SetupTableNumber>
                  </SetupDataTableCell>
                  <SetupDataTableCell className="px-4 py-3 text-right text-sm text-gray-700">
                    <SetupTableMoney>{formatRupiah(item.outstandingPokok)}</SetupTableMoney>
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className="px-4 py-3 text-right text-sm font-semibold"
                    style={{ color: item.textColor }}
                  >
                    {formatPercentage(item.percentage)}%
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
            </SetupDataTableBody>
          </SetupDataTable>
        </div>
      </div>

      {selectedRow ? (
        <DashboardModal
          isOpen
          title={`Nasabah Kol ${selectedRow.level} - ${selectedRow.shortLabel}`}
          description={`${formatNumber(selectedRow.jumlahNasabah)} nasabah dalam kelompok kolektibilitas ini.`}
          maxWidth="4xl"
          onClose={closeModal}
          bodyClassName="p-4 sm:p-6"
        >
                  <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-end">
                    <div>
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          aria-label="Cari nama nasabah"
                          value={searchTerm}
                          onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setPage(1);
                          }}
                          className="app-input app-input-with-icon"
                          placeholder="Cari nama nasabah..."
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <ArrowUpDown
                          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <SetupSelect
                          aria-label="Urutkan daftar nasabah"
                          value={sortOption}
                          onChange={(event) => {
                            setSortOption(event.target.value as SortOption);
                            setPage(1);
                          }}
                          className="app-select app-input-with-icon"
                        >
                          {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </SetupSelect>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    {visibleNasabah.length > 0 ? (
                      <div className="overflow-visible lg:overflow-x-auto">
                        <SetupDataTable variant="portfolio" density="compact" className="text-sm">
                          <SetupDataTableHead className="border-b bg-gray-50">
                            <SetupDataTableRow>
                              <SetupDataTableHeaderCell className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Nama Nasabah
                              </SetupDataTableHeaderCell>
                              <SetupDataTableHeaderCell className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                No Kontrak
                              </SetupDataTableHeaderCell>
                              <SetupDataTableHeaderCell className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Outstanding
                              </SetupDataTableHeaderCell>
                              <SetupDataTableHeaderCell className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Sisa Bulan
                              </SetupDataTableHeaderCell>
                            </SetupDataTableRow>
                          </SetupDataTableHead>
                          <SetupDataTableBody className="divide-y divide-gray-100">
                            {paginatedNasabah.map((item) => (
                              <SetupDataTableRow
                                key={item.noKontrak}
                                className="transition-colors hover:bg-gray-50"
                              >
                                <SetupDataTableCell className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  <SetupTablePrimaryText>{item.nama}</SetupTablePrimaryText>
                                </SetupDataTableCell>
                                <SetupDataTableCell className="px-6 py-4 text-sm font-medium text-gray-800">
                                  <SetupTableCode>{item.noKontrak}</SetupTableCode>
                                </SetupDataTableCell>
                                <SetupDataTableCell className="px-6 py-4 text-right text-sm text-gray-700">
                                  <SetupTableMoney>{formatRupiah(item.outstandingPokok)}</SetupTableMoney>
                                </SetupDataTableCell>
                                <SetupDataTableCell className="px-6 py-4 text-center text-sm text-gray-700">
                                  <SetupTableNumber>{item.sisaBulan} bulan</SetupTableNumber>
                                </SetupDataTableCell>
                              </SetupDataTableRow>
                            ))}
                          </SetupDataTableBody>
                        </SetupDataTable>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center px-6 py-16">
                        <SetupEmptyState
                          title="Tidak ada nasabah yang sesuai"
                          description="Coba ubah kata kunci atau urutan data."
                          icon={SearchX}
                          isFiltered
                          variant="table"
                        />
                      </div>
                    )}
                    {visibleNasabah.length > 0 ? (
                      <Pagination
                        page={currentModalPage}
                        lastPage={modalLastPage}
                        total={visibleNasabah.length}
                        limit={MODAL_PAGE_SIZE}
                        onPageChange={setPage}
                      />
                    ) : null}
                  </div>
        </DashboardModal>
      ) : null}
    </>
  );
}
