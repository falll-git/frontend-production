"use client";

import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  BookOpen,
  Box,
  ChevronRight,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  Search,
  SearchX,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { exportDokumenPerKantor } from "@/lib/export-arsip";
import type { Kantor, Lemari } from "@/lib/types";

import type { StorageDokumenArsip, StorageRak } from "@/lib/arsip-digital-storage";

type LemariWithMeta = Lemari & {
  kapasitas?: number;
  status?: "Aktif" | "Nonaktif";
};

type LemariGridModalProps = {
  kantor: Kantor;
  lemariList: Lemari[];
  rakList: StorageRak[];
  dokumenList: StorageDokumenArsip[];
  totalDokumenByLemariId: Map<string, number>;
  jumlahRakByLemariId: Map<string, number>;
  disposisiByLemariId: Map<string, number>;
  dipinjamByLemariId: Map<string, number>;
  jatuhTempoByLemariId: Map<string, number>;
  onSelectLemari: (lemari: Lemari) => void;
  onClose: () => void;
};

function getStatusBadgeClass(status: "Aktif" | "Nonaktif") {
  return status === "Aktif"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-gray-200 bg-gray-100 text-gray-700";
}

export default function LemariGridModal({
  kantor,
  lemariList,
  rakList,
  dokumenList,
  totalDokumenByLemariId,
  jumlahRakByLemariId,
  disposisiByLemariId,
  dipinjamByLemariId,
  jatuhTempoByLemariId,
  onSelectLemari,
  onClose,
}: LemariGridModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const filteredLemari = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return lemariList;
    return lemariList.filter((item) =>
      item.kodeLemari.toLowerCase().includes(query),
    );
  }, [lemariList, searchTerm]);

  const hasNoData = lemariList.length === 0;
  const hasNoFilteredData =
    lemariList.length > 0 && filteredLemari.length === 0;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportDokumenPerKantor({
        kantorId: kantor.id,
        kantorNama: kantor.namaKantor,
        lemariList,
        rakList,
        dokumenList,
      });
    } finally {
      setExportLoading(false);
    }
  };

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
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-900">
              {kantor.namaKantor}
            </h3>
            <p className="text-sm text-gray-500">
              {filteredLemari.length} Lemari
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportLoading}
            className="btn btn-export-excel"
            title="Export Excel"
          >
            {exportLoading ? (
              <span
                className="button-spinner"
                style={
                  {
                    ["--spinner-size"]: "16px",
                    ["--spinner-border"]: "2px",
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ) : (
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            )}
            <span>Export Excel</span>
          </button>
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
                placeholder="Cari kode lemari..."
              />
            </div>
          </div>

          {hasNoData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <FolderOpen className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Belum ada lemari
              </p>
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Tidak ada lemari yang sesuai
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredLemari.map((lemari, idx) => {
                const metadata = lemari as LemariWithMeta;
                const hasKapasitas = typeof metadata.kapasitas === "number";
                const status = metadata.status;
                const jumlahRak = jumlahRakByLemariId.get(lemari.id) ?? 0;
                const dokumenDisposisi = disposisiByLemariId.get(lemari.id) ?? 0;
                const dokumenDipinjam = dipinjamByLemariId.get(lemari.id) ?? 0;
                const dokumenJatuhTempo = jatuhTempoByLemariId.get(lemari.id) ?? 0;

                return (
                  <div
                    key={lemari.id}
                    className="group bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-left transition-colors duration-150"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[#157ec3]">
                        <Archive className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Total Arsip
                        </span>
                        <span className="text-xl font-semibold text-gray-800 tabular-nums">
                          {totalDokumenByLemariId.get(lemari.id) ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                            <Box className="h-4 w-4 text-gray-500" aria-hidden="true" />
                            Kode Lemari
                          </span>
                          <span className="font-semibold text-gray-800 text-right whitespace-nowrap">
                            {lemari.kodeLemari}
                          </span>
                        </div>
                        <div className="h-px w-full bg-gray-200" />
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                            <Layers className="h-4 w-4 text-gray-500" aria-hidden="true" />
                            Jumlah Rak
                          </span>
                          <span className="min-w-[2.5rem] font-semibold text-gray-800 tabular-nums text-right">
                            {jumlahRak}
                          </span>
                        </div>
                        <div className="h-px w-full bg-gray-200" />
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                            <ArrowLeftRight
                              className="h-4 w-4 text-gray-500"
                              aria-hidden="true"
                            />
                            Dokumen Disposisi
                          </span>
                          <span className="min-w-[2.5rem] font-semibold text-gray-800 tabular-nums text-right">
                            {dokumenDisposisi}
                          </span>
                        </div>
                        <div className="h-px w-full bg-gray-200" />
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                            <BookOpen className="h-4 w-4 text-gray-500" aria-hidden="true" />
                            Dokumen Dipinjam
                          </span>
                          <span className="min-w-[2.5rem] font-semibold text-gray-800 tabular-nums text-right">
                            {dokumenDipinjam}
                          </span>
                        </div>
                        <div className="h-px w-full bg-gray-200" />
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                            <AlertTriangle
                              className="h-4 w-4 text-gray-500"
                              aria-hidden="true"
                            />
                            Dokumen Jatuh Tempo
                          </span>
                          <span className="min-w-[2.5rem] font-semibold text-gray-800 tabular-nums text-right">
                            {dokumenJatuhTempo}
                          </span>
                        </div>
                        {hasKapasitas ? (
                          <>
                            <div className="h-px w-full bg-gray-200" />
                            <div className="flex items-center justify-between px-4 py-3 text-sm">
                              <span className="flex items-center gap-3 text-gray-600 whitespace-nowrap">
                                <Archive
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
                                <Archive
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
                      onClick={() => onSelectLemari(lemari)}
                      className="mt-6 flex w-full items-center justify-between text-primary-600 font-medium transition-colors"
                    >
                      <span className="text-sm">Lihat Rak</span>
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
