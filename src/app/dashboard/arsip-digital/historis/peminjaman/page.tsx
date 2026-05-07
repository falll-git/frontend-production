"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, History, Search } from "lucide-react";

import { exportToExcel } from "@/lib/utils/exportExcel";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { formatDateDisplay, parseDateString } from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";

function formatPersonName(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return value;

  return trimmed
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDurationText(startValue: string, endValue: string | null) {
  const startDate = parseDateString(startValue);
  const endDate = endValue ? parseDateString(endValue) : null;
  if (!startDate || !endDate) return "0 hari";

  const oneDay = 24 * 60 * 60 * 1000;
  const diff = Math.round(
    (endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0)) / oneDay,
  );
  const days = Number.isFinite(diff) ? Math.max(diff, 0) : 0;
  return `${days} hari`;
}

export default function HistorisPeminjamanPage() {
  const { peminjaman } = useArsipDigitalWorkflow();
  const searchParams = useSearchParams();
  const filterLemariId = searchParams.get("lemariId");
  const filterKantorId = searchParams.get("kantorId");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeminjam, setFilterPeminjam] = useState("Semua");

  const historisPeminjaman = useMemo(() => {
    return peminjaman
      .filter((item) => item.statusKey === "RETURNED")
      .map((item) => {
        const officeCode = item.document?.storage?.officeCode ?? null;
        const cabinetCode = item.document?.storage?.cabinetCode ?? null;
        const lemariId =
          officeCode && cabinetCode ? `${officeCode}::${cabinetCode}` : null;
        const tglDikembalikan =
          item.tanggalDikembalikan ?? item.tglPengembalian ?? item.tglKembali;

        return {
          id: item.id,
          kode: item.document?.kode ?? "-",
          namaDokumen: item.document?.namaDokumen ?? "-",
          peminjam: item.peminjam,
          tanggalPinjam: item.tglPinjam,
          tanggalPenyerahan: item.tglPenyerahan,
          tanggalEstimasiPengembalian: item.tglKembali,
          tanggalPengembalian: tglDikembalikan,
          durasi: getDurationText(item.tglPinjam, tglDikembalikan),
          approvedBy:
            item.approverUser?.username ??
            item.approverUser?.name ??
            item.approver ??
            "-",
          lemariId,
          kantorId: officeCode,
        };
      });
  }, [peminjaman]);

  const historisByLokasi = useMemo(() => {
    if (filterKantorId) {
      return historisPeminjaman.filter(
        (item) => item.kantorId === filterKantorId,
      );
    }

    if (filterLemariId) {
      return historisPeminjaman.filter(
        (item) => item.lemariId === filterLemariId,
      );
    }

    return historisPeminjaman;
  }, [filterKantorId, filterLemariId, historisPeminjaman]);

  const peminjamList = useMemo(
    () => [
      "Semua",
      ...Array.from(new Set(historisByLokasi.map((item) => item.peminjam))),
    ],
    [historisByLokasi],
  );

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return historisByLokasi.filter((item) => {
      const matchSearch =
        keyword.length === 0 ||
        item.namaDokumen.toLowerCase().includes(keyword) ||
        item.kode.toLowerCase().includes(keyword);
      const matchPeminjam =
        filterPeminjam === "Semua" || item.peminjam === filterPeminjam;
      return matchSearch && matchPeminjam;
    });
  }, [filterPeminjam, historisByLokasi, searchTerm]);

  const totalPeminjaman = historisByLokasi.length;
  const uniquePeminjam = new Set(historisByLokasi.map((item) => item.peminjam))
    .size;
  const avgDurasi = Math.round(
    historisByLokasi.length === 0
      ? 0
      : historisByLokasi.reduce(
          (acc, item) => acc + parseInt(item.durasi, 10),
          0,
        ) / historisByLokasi.length,
  );

  const handleExport = async () => {
    await exportToExcel({
      filename: "historis-peminjaman",
      sheetName: "Historis Peminjaman",
      title: "Historis Peminjaman Dokumen",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Kode", key: "kode", width: 15 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 30 },
        { header: "Peminjam", key: "peminjam", width: 20 },
        { header: "Tanggal Pinjam", key: "tanggalPinjam", width: 18 },
        { header: "Tanggal Penyerahan", key: "tanggalPenyerahan", width: 20 },
        {
          header: "Tanggal Estimasi Pengembalian",
          key: "tanggalEstimasiPengembalian",
          width: 28,
        },
        {
          header: "Tanggal Pengembalian",
          key: "tanggalPengembalian",
          width: 22,
        },
        { header: "Durasi", key: "durasi", width: 12 },
        { header: "Disetujui Oleh", key: "approvedBy", width: 20 },
      ],
      data: filteredData.map((item, idx) => ({
        no: idx + 1,
        kode: item.kode,
        namaDokumen: item.namaDokumen,
        peminjam: item.peminjam,
        tanggalPinjam: formatDateDisplay(item.tanggalPinjam),
        tanggalPenyerahan: formatDateDisplay(item.tanggalPenyerahan),
        tanggalEstimasiPengembalian: formatDateDisplay(
          item.tanggalEstimasiPengembalian,
        ),
        tanggalPengembalian: formatDateDisplay(item.tanggalPengembalian),
        durasi: item.durasi,
        approvedBy: item.approvedBy,
      })),
    });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {filterLemariId || filterKantorId ? (
        <div className="mb-4">
          <Link
            href="/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan"
            className="btn btn-outline btn-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Ruang Arsip Digital
          </Link>
        </div>
      ) : null}

      <FeatureHeader
        title="Historis Peminjaman Dokumen"
        subtitle="Riwayat peminjaman dokumen yang sudah dikembalikan."
        icon={<History />}
        actions={
          <button
            onClick={handleExport}
            className="btn btn-export-excel"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            <span>Export Excel</span>
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Total Riwayat
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {totalPeminjaman}
            </p>
          </div>
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <History className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Jumlah Peminjam
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {uniquePeminjam}
            </p>
          </div>
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <History className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Rata-rata Durasi
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {avgDurasi} hari
            </p>
          </div>
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <History className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 p-5">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
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
                placeholder="Cari berdasarkan nama atau kode..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input input-with-icon"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Filter Peminjam
            </label>
            <select
              value={filterPeminjam}
              onChange={(event) => setFilterPeminjam(event.target.value)}
              className="select"
            >
              {peminjamList.map((peminjam) => (
                <option key={peminjam} value={peminjam}>
                  {peminjam}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <p className="text-sm text-gray-600">
            Menampilkan{" "}
            <span className="font-semibold">{filteredData.length}</span> dari{" "}
            {historisByLokasi.length} riwayat
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  No
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kode
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nama Dokumen
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Peminjam
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tanggal Pinjam
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tanggal Penyerahan
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Estimasi Pengembalian
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tanggal Pengembalian
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Durasi
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Disetujui Oleh
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item, idx) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg border-2 border-gray-800 bg-white px-3 py-1 text-xs font-semibold text-gray-900 tabular-nums">
                      {item.kode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {item.namaDokumen}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    {formatPersonName(item.peminjam)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateDisplay(item.tanggalPinjam)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateDisplay(item.tanggalPenyerahan)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateDisplay(item.tanggalEstimasiPengembalian)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateDisplay(item.tanggalPengembalian)}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-gray-800">
                    {item.durasi}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    {formatPersonName(item.approvedBy)}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Belum ada riwayat peminjaman yang sesuai.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
