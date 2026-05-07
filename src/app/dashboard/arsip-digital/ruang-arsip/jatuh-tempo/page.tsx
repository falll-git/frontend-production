"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, FolderOpen, Search } from "lucide-react";

import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { formatDateDisplay, parseDateString } from "@/lib/utils/date";

type JatuhTempoRow = {
  id: string;
  namaDokumen: string;
  peminjam: string;
  tanggalPinjam: string;
  tanggalKembali: string;
  keterlambatanHari: number;
  kantorId: string | null;
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function diffInDays(later: Date, earlier: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.round((later.getTime() - earlier.getTime()) / oneDay),
  );
}

export default function JatuhTempoPage() {
  const { tempatPenyimpanan } = useArsipDigitalMasterData();
  const { peminjaman } = useArsipDigitalWorkflow();
  const searchParams = useSearchParams();
  const kantorId = searchParams.get("kantorId");
  const [searchTerm, setSearchTerm] = useState("");
  const today = useMemo(() => startOfDay(new Date()), []);

  const kantorName = useMemo(() => {
    if (!kantorId) return null;
    return (
      tempatPenyimpanan.find((tempat) => tempat.kodeKantor === kantorId)
        ?.namaKantor ?? null
    );
  }, [kantorId, tempatPenyimpanan]);

  const jatuhTempoRows = useMemo<JatuhTempoRow[]>(() => {
    return peminjaman
      .filter(
        (item) =>
          ["HANDED_OVER", "BORROWED", "OVERDUE"].includes(item.statusKey) &&
          item.isTerlambat,
      )
      .map((item) => {
        const dueDate = parseDateString(item.tglKembali);
        if (!dueDate) return null;

        const dueDay = startOfDay(dueDate);
        const officeCode = item.document?.storage?.officeCode ?? null;

        return {
          id: item.id,
          namaDokumen: item.document?.namaDokumen ?? "-",
          peminjam: item.peminjam,
          tanggalPinjam: item.tglPinjam,
          tanggalKembali: item.tglKembali,
          keterlambatanHari: diffInDays(today, dueDay),
          kantorId: officeCode,
        };
      })
      .filter((item): item is JatuhTempoRow => item !== null);
  }, [peminjaman, today]);

  const rowsByKantor = useMemo(() => {
    if (!kantorId) return jatuhTempoRows;
    return jatuhTempoRows.filter((item) => item.kantorId === kantorId);
  }, [jatuhTempoRows, kantorId]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rowsByKantor;
    return rowsByKantor.filter(
      (item) =>
        item.namaDokumen.toLowerCase().includes(query) ||
        item.peminjam.toLowerCase().includes(query),
    );
  }, [rowsByKantor, searchTerm]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort(
        (left, right) => right.keterlambatanHari - left.keterlambatanHari,
      ),
    [filteredRows],
  );

  const totalJatuhTempo = rowsByKantor.length;
  const terlama =
    rowsByKantor.length === 0
      ? 0
      : Math.max(...rowsByKantor.map((item) => item.keterlambatanHari));
  const rataRata =
    rowsByKantor.length === 0
      ? 0
      : Math.round(
          rowsByKantor.reduce((acc, item) => acc + item.keterlambatanHari, 0) /
            rowsByKantor.length,
        );

  const subtitle = kantorName
    ? `Daftar dokumen yang melewati batas waktu pengembalian. Kantor: ${kantorName}`
    : "Daftar dokumen yang melewati batas waktu pengembalian.";

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="mb-4">
        <Link
          href="/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan"
          className="btn btn-outline btn-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Ruang Arsip Digital
        </Link>
      </div>

      <FeatureHeader
        title="Dokumen Dipinjam Jatuh Tempo"
        subtitle={subtitle}
        icon={<Clock />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Total Jatuh Tempo
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {totalJatuhTempo}
            </p>
          </div>
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
            <Clock className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Terlama
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {terlama} hari
            </p>
          </div>
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Rata-rata Keterlambatan
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {rataRata} hari
            </p>
          </div>
          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
            <Clock className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 p-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Cari Dokumen
        </label>
        <div className="relative">
          <Search
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Cari nama dokumen atau peminjam..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="input input-with-icon"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <p className="text-sm text-gray-600">
            Menampilkan{" "}
            <span className="font-semibold">{sortedRows.length}</span> data
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 w-16">
                  No
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nama Dokumen
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Peminjam
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tgl Pinjam
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tgl Kembali
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">
                  Keterlambatan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.length > 0 ? (
                sortedRows.map((item, index) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.namaDokumen}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {item.peminjam}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateDisplay(item.tanggalPinjam)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      {formatDateDisplay(item.tanggalKembali)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        {item.keterlambatanHari} hari
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500 bg-gray-50/50"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <FolderOpen className="w-9 h-9 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">
                        Tidak ada dokumen yang jatuh tempo
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
