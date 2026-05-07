"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Eye, FileSpreadsheet, FolderOpen, Search, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { exportDokumenPerRak } from "@/lib/export-arsip";
import type { DokumenArsip, Kantor, Lemari, Rak } from "@/lib/types";
import { formatDateDisplay } from "@/lib/utils/date";

type DokumenListModalProps = {
  kantor: Kantor;
  lemari: Lemari;
  rak: Rak;
  dokumenList: DokumenArsip[];
  onBack: () => void;
  onClose: () => void;
};

function formatTanggalInput(value: string) {
  return formatDateDisplay(value, value);
}

export default function DokumenListModal({
  kantor,
  lemari,
  rak,
  dokumenList,
  onBack,
  onClose,
}: DokumenListModalProps) {
  const { openPreview } = useDocumentPreviewContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const filteredDokumen = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return dokumenList.filter((item) => {
      const matchSearch =
        query.length === 0 || item.namaDokumen.toLowerCase().includes(query);
      return matchSearch;
    });
  }, [dokumenList, searchTerm]);

  const hasNoData = dokumenList.length === 0;
  const hasNoFilteredData = dokumenList.length > 0 && filteredDokumen.length === 0;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportDokumenPerRak({
        rakNama: rak.namaRak,
        lemariKode: lemari.kodeLemari,
        kantorNama: kantor.namaKantor,
        dokumenList: filteredDokumen,
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
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h3 className="truncate text-lg font-bold text-gray-900">
              {rak.namaRak} {"\u00B7"} {lemari.kodeLemari} {"\u00B7"}{" "}
              {kantor.namaKantor}
            </h3>
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

        <div className="flex-1 overflow-auto">
          <div className="border-b border-gray-100 bg-white px-5 py-4">
            <div className="grid grid-cols-1 gap-4">
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
                  placeholder="Cari dokumen..."
                />
              </div>
            </div>
          </div>

          {hasNoData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <FolderOpen className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Belum ada dokumen di rak ini
              </p>
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Tidak ada dokumen yang sesuai
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[45%]" />
                <col className="w-[15%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Nama Dokumen
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Jenis
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tgl Input
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDokumen.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                    <td className="truncate px-5 py-3 font-semibold text-gray-900">
                      {item.namaDokumen}
                    </td>
                    <td className="px-5 py-3 text-gray-700 font-medium">
                      {item.jenisDokumen}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatTanggalInput(item.tanggalInput)}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="btn btn-view-pdf btn-sm"
                        onClick={() =>
                          item.fileUrl
                            ? openPreview(item.fileUrl, item.namaDokumen)
                            : undefined
                        }
                        disabled={!item.fileUrl}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
