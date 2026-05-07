"use client";

import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Layers,
  Search,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Kantor, Lemari, Rak } from "@/lib/types";
import { useMemo, useState } from "react";

type RakWithMeta = Rak & {
  kapasitas?: number;
  status?: "Aktif" | "Nonaktif";
};

type RakGridModalProps = {
  lemari: Lemari;
  kantor: Kantor;
  rakList: Rak[];
  onClose: () => void;
  onBack: () => void;
  onSelectRak: (rak: Rak) => void;
};

function getStatusBadgeClass(status: "Aktif" | "Nonaktif") {
  return status === "Aktif"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-gray-200 bg-gray-100 text-gray-700";
}

export default function RakGridModal({
  lemari,
  kantor,
  rakList,
  onClose,
  onBack,
  onSelectRak,
}: RakGridModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRak = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rakList;
    return rakList.filter((item) => item.namaRak.toLowerCase().includes(query));
  }, [rakList, searchTerm]);

  const hasNoData = rakList.length === 0;
  const hasNoFilteredData = rakList.length > 0 && filteredRak.length === 0;

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-[96vw] max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="truncate text-lg font-bold text-gray-900">
              {lemari.kodeLemari} {"\u00B7"} {kantor.namaKantor}
            </h3>
            <p className="text-sm text-gray-500">{filteredRak.length} Rak</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mb-5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input input-with-icon"
                placeholder="Cari nomor rak..."
              />
            </div>
          </div>

          {hasNoData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <FolderOpen className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">Belum ada rak</p>
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Tidak ada rak yang sesuai
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredRak.map((rak, idx) => {
                const metadata = rak as RakWithMeta;
                const hasKapasitas = typeof metadata.kapasitas === "number";
                const status = metadata.status;

                return (
                  <div
                    key={rak.id}
                    className="group bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-left transition-colors duration-150"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[#157ec3]">
                        <Layers className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Total Arsip
                        </span>
                        <span className="text-xl font-semibold text-gray-800 tabular-nums">
                          {rak.totalArsip}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                            <Layers
                              className="h-4 w-4 text-gray-500"
                              aria-hidden="true"
                            />
                            Nama Rak
                          </span>
                          <span className="font-semibold text-gray-800 text-right whitespace-nowrap">
                            {rak.namaRak}
                          </span>
                        </div>
                        {hasKapasitas ? (
                          <>
                            <div className="h-px w-full bg-gray-200" />
                            <div className="flex items-center justify-between px-4 py-3 text-sm">
                              <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                                <Layers
                                  className="h-4 w-4 text-gray-500"
                                  aria-hidden="true"
                                />
                                Kapasitas
                              </span>
                              <span className="min-w-[2.5rem] font-semibold text-gray-800 tabular-nums text-right">
                                {metadata.kapasitas}
                              </span>
                            </div>
                          </>
                        ) : null}
                        {status === "Aktif" || status === "Nonaktif" ? (
                          <>
                            <div className="h-px w-full bg-gray-200" />
                            <div className="flex items-center justify-between px-4 py-3 text-sm">
                              <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                                <Layers
                                  className="h-4 w-4 text-gray-500"
                                  aria-hidden="true"
                                />
                                Status
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                  status,
                                )}`}
                              >
                                {status}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectRak(rak)}
                      className="mt-6 flex w-full items-center justify-between text-primary-600 font-medium transition-colors"
                    >
                      <span className="text-sm">Lihat Dokumen</span>
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Kembali
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
