"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileBarChart2,
  FileSpreadsheet,
  Filter,
  Search,
  XCircle,
} from "lucide-react";

import { exportToExcel } from "@/lib/utils/exportExcel";
import DatePickerInput from "@/components/ui/DatePickerInput";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  formatDateDisplay,
  parseDateString,
  toIsoDate,
} from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import type { LoanStatusKey } from "@/types/arsip.types";

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

function getStatusText(statusKey: LoanStatusKey, isOverdue: boolean) {
  switch (statusKey) {
    case "PENDING":
      return "Menunggu Persetujuan";
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "HANDED_OVER":
      return isOverdue ? "Terlambat" : "Sudah Diserahkan";
    case "OVERDUE":
      return "Terlambat";
    case "BORROWED":
      return isOverdue ? "Terlambat" : "Dipinjam";
    case "RETURNED":
      return "Dikembalikan";
    default:
      return "Menunggu Persetujuan";
  }
}

function getStatusPillClass(statusKey: LoanStatusKey, isOverdue: boolean) {
  switch (statusKey) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "APPROVED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "HANDED_OVER":
    case "BORROWED":
    case "OVERDUE":
      return isOverdue
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
    case "RETURNED":
      return "bg-green-50 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function LaporanPeminjamanPage() {
  const { peminjaman } = useArsipDigitalWorkflow();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const riwayatPeminjaman = useMemo(() => {
    return peminjaman.map((item) => ({
      id: item.id,
      kode: item.document?.kode ?? "-",
      namaDokumen: item.document?.namaDokumen ?? "-",
      peminjam: item.peminjam,
      tanggalPinjam: item.tglPinjam,
      tanggalPenyerahan: item.tglPenyerahan,
      tanggalEstimasiPengembalian: item.tglKembali,
      tanggalPengembalian: item.tanggalDikembalikan ?? item.tglPengembalian,
      statusKey: item.statusKey,
      statusText: getStatusText(item.statusKey, item.isTerlambat),
      approvedBy:
        item.approverUser?.username ??
        item.approverUser?.name ??
        item.approver ??
        "-",
      isTerlambat: item.isTerlambat,
    }));
  }, [peminjaman]);

  const normalizedFrom =
    dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom;
  const normalizedTo =
    dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo;

  const filteredData = useMemo(() => {
    return riwayatPeminjaman.filter((item) => {
      const keyword = searchTerm.trim().toLowerCase();
      const matchSearch =
        keyword.length === 0 ||
        item.namaDokumen.toLowerCase().includes(keyword) ||
        item.kode.toLowerCase().includes(keyword) ||
        item.peminjam.toLowerCase().includes(keyword);
      const matchStatus =
        filterStatus === "Semua" || item.statusText === filterStatus;

      const pinjamDate = parseDateString(item.tanggalPinjam);
      const pinjamIso = pinjamDate ? toIsoDate(pinjamDate) : "";
      const matchFrom =
        !normalizedFrom || (pinjamIso && pinjamIso >= normalizedFrom);
      const matchTo = !normalizedTo || (pinjamIso && pinjamIso <= normalizedTo);

      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [filterStatus, normalizedFrom, normalizedTo, riwayatPeminjaman, searchTerm]);

  const totalAktif = useMemo(
    () =>
      riwayatPeminjaman.filter((item) =>
        ["HANDED_OVER", "BORROWED", "OVERDUE"].includes(item.statusKey),
      ).length,
    [riwayatPeminjaman],
  );

  const totalDikembalikan = useMemo(
    () =>
      riwayatPeminjaman.filter((item) => item.statusKey === "RETURNED").length,
    [riwayatPeminjaman],
  );

  const handleExport = async () => {
    await exportToExcel({
      filename: "laporan-peminjaman",
      sheetName: "Peminjaman",
      title: "Laporan Peminjaman Dokumen",
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
        { header: "Disetujui Oleh", key: "approvedBy", width: 20 },
        { header: "Status", key: "status", width: 16 },
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
        approvedBy: item.approvedBy,
        status: item.statusText,
      })),
    });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Laporan Peminjaman"
        subtitle="Daftar peminjaman dan pengembalian dokumen fisik."
        icon={<FileBarChart2 />}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Total Peminjaman
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {riwayatPeminjaman.length}
            </p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <FileBarChart2 className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Sedang Dipinjam
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{totalAktif}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Sudah Dikembalikan
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {totalDikembalikan}
            </p>
          </div>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
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
                placeholder="Dokumen, peminjam..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input input-with-icon"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Status Peminjaman
            </label>
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="select input-with-icon"
              >
                <option value="Semua">Semua Status</option>
                <option value="Menunggu Persetujuan">
                  Menunggu Persetujuan
                </option>
                <option value="Disetujui">Disetujui</option>
                <option value="Sudah Diserahkan">Sudah Diserahkan</option>
                <option value="Dipinjam">Dipinjam</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Dikembalikan">Dikembalikan</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Dari Tanggal
            </label>
            <DatePickerInput value={dateFrom} onChange={setDateFrom} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Sampai Tanggal
            </label>
            <DatePickerInput value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-600">
            Menampilkan{" "}
            <span className="font-bold text-gray-900">{filteredData.length}</span>{" "}
            data
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  No
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kode
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nama Dokumen
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Peminjam
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tanggal Pinjam
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tanggal Penyerahan
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estimasi Pengembalian
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tanggal Pengembalian
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Disetujui Oleh
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50/50 transition-colors ${
                    item.isTerlambat ? "bg-red-50/30" : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-xs font-medium tabular-nums">
                      {item.kode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {item.namaDokumen}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-800">
                      {formatPersonName(item.peminjam)}
                    </span>
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
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {formatPersonName(item.approvedBy)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusPillClass(item.statusKey, item.isTerlambat)}`}
                    >
                      {item.statusKey === "RETURNED" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : item.statusKey === "REJECTED" ? (
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {item.statusText}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Belum ada data peminjaman yang sesuai.
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
