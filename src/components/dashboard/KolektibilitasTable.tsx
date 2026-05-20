"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, Search, SearchX, X } from "lucide-react";

import type {
  KolektibilitasItem,
  KolektibilitasNasabahItem,
  NpfKolektibilitasLevel,
} from "@/lib/types";
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
}: {
  rows: KolektibilitasItem[];
  nasabah: KolektibilitasNasabahItem[];
}) {
  const [selectedKol, setSelectedKol] = useState<NpfKolektibilitasLevel | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("OUTSTANDING_DESC");

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
        setSelectedKol(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = initialOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedKol]);

  const openModal = (kol: NpfKolektibilitasLevel) => {
    setSelectedKol(kol);
    setSearchTerm("");
    setSortOption("OUTSTANDING_DESC");
  };

  const closeModal = () => {
    setSelectedKol(null);
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kolektibilitas
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nasabah
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Outstanding
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((item, index) => (
                <tr
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
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {formatNumber(item.jumlahNasabah)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {formatRupiah(item.outstandingPokok)}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-sm font-semibold"
                    style={{ color: item.color }}
                  >
                    {formatPercentage(item.percentage)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: selectedRow.color }}
                        aria-hidden="true"
                      />
                      <h3 className="text-xl font-bold text-gray-900">
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

                <div className="flex-1 overflow-y-auto p-6">
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
                          className="input input-with-icon"
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
                          className="select input-with-icon"
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
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[45rem] text-sm">
                          <thead className="border-b bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Nama Nasabah
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                No Kontrak
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Outstanding
                              </th>
                              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Sisa Bulan
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {visibleNasabah.map((item) => (
                              <tr
                                key={item.noKontrak}
                                className="transition-colors hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  {item.nama}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                                  {item.noKontrak}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-700">
                                  {formatRupiah(item.outstandingPokok)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-700">
                                  {item.sisaBulan} bulan
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                          <SearchX className="h-8 w-8" aria-hidden="true" />
                        </div>
                        <p className="text-lg font-medium text-gray-900">
                          Tidak ada nasabah yang sesuai
                        </p>
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
