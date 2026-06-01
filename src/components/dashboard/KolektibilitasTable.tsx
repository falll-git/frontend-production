"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, Search, SearchX, X } from "lucide-react";

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
} from "@/components/ui/SetupDataTable";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import { formatNumber, formatRupiah } from "@/lib/utils/laporan";

type SortOption =
  | "OUTSTANDING_DESC"
  | "OUTSTANDING_ASC"
  | "NAME_ASC"
  | "NAME_DESC";

const kolColors: Record<NpfKolektibilitasLevel, string> = {
  1: "#22c55e",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
  5: "#991b1b",
};

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "OUTSTANDING_DESC", label: "Outstanding Tertinggi" },
  { value: "OUTSTANDING_ASC", label: "Outstanding Terendah" },
  { value: "NAME_ASC", label: "A-Z" },
  { value: "NAME_DESC", label: "Z-A" },
];

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
          color: kolColors[level],
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
  };

  const closeModal = () => {
    updateSelectedKol(null);
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="overflow-visible lg:overflow-x-auto">
          <SetupDataTable className="text-sm">
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
                    {formatNumber(item.jumlahNasabah)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="px-4 py-3 text-right text-sm text-gray-700">
                    {formatRupiah(item.outstandingPokok)}
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className="px-4 py-3 text-right text-sm font-semibold"
                    style={{ color: item.color }}
                  >
                    {formatPercentage(item.percentage)}%
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
            </SetupDataTableBody>
          </SetupDataTable>
        </div>
      </div>

      {selectedRow
        ? createPortal(
            <div
              data-dashboard-overlay="true"
              className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fade-in"
              onClick={closeModal}
            >
              <div
                className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="shrink-0 border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: selectedRow.color }}
                        aria-hidden="true"
                      />
                      <h3 className="min-w-0 break-words text-base font-bold text-gray-900 sm:text-xl">
                        Nasabah Kol {selectedRow.level} -{" "}
                        {selectedRow.shortLabel}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Tutup"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-end">
                    <div>
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(event) =>
                            setSearchTerm(event.target.value)
                          }
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
                        <select
                          value={sortOption}
                          onChange={(event) =>
                            setSortOption(event.target.value as SortOption)
                          }
                          className="app-select app-input-with-icon"
                        >
                          {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    {visibleNasabah.length > 0 ? (
                      <div className="overflow-visible lg:overflow-x-auto">
                        <SetupDataTable className="text-sm">
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
                            {visibleNasabah.map((item) => (
                              <SetupDataTableRow
                                key={item.noKontrak}
                                className="transition-colors hover:bg-gray-50"
                              >
                                <SetupDataTableCell className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  {item.nama}
                                </SetupDataTableCell>
                                <SetupDataTableCell className="px-6 py-4 text-sm font-medium text-gray-800">
                                  {item.noKontrak}
                                </SetupDataTableCell>
                                <SetupDataTableCell className="px-6 py-4 text-right text-sm text-gray-700">
                                  {formatRupiah(item.outstandingPokok)}
                                </SetupDataTableCell>
                                <SetupDataTableCell className="px-6 py-4 text-center text-sm text-gray-700">
                                  {item.sisaBulan} bulan
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
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
