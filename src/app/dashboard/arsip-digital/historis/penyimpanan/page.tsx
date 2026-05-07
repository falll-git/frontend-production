"use client";

import { useMemo, useState } from "react";
import { Archive, FileSpreadsheet, Search } from "lucide-react";

import { exportToExcel } from "@/lib/utils/exportExcel";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { formatDateDisplay } from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";

type StorageHistoryRow = {
  id: string;
  kode: string;
  namaDokumen: string;
  aksiKey: string;
  aksiLabel: string;
  lokasiLama: string;
  lokasiBaru: string;
  user: string;
  tanggal: string;
  jam: string;
};

const ACTION_FILTERS = [
  "Semua",
  "Input Baru",
  "Pindah Lokasi",
  "Perubahan Data",
  "Hapus",
] as const;

function formatPersonName(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function mapActionLabel(actionKey: string, fallback: string) {
  switch (actionKey) {
    case "CREATED":
      return "Input Baru";
    case "STORAGE_MOVED":
      return "Pindah Lokasi";
    case "UPDATED":
      return "Perubahan Data";
    case "DELETED":
      return "Hapus";
    default:
      return fallback || "Perubahan Data";
  }
}

function getActionPillClass(actionLabel: string) {
  switch (actionLabel) {
    case "Input Baru":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Pindah Lokasi":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Hapus":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

export default function HistorisPenyimpananPage() {
  const { aktivitasPenyimpanan } = useArsipDigitalWorkflow();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAksi, setFilterAksi] =
    useState<(typeof ACTION_FILTERS)[number]>("Semua");

  const historisPenyimpanan = useMemo<StorageHistoryRow[]>(() => {
    return aktivitasPenyimpanan.map((item) => {
      const aksiLabel = mapActionLabel(item.actionKey, item.actionLabel);

      return {
        id: item.id,
        kode: item.document?.documentNumber ?? "-",
        namaDokumen: item.document?.documentName ?? "-",
        aksiKey: item.actionKey,
        aksiLabel,
        lokasiLama: item.fromStorage?.locationLabel ?? "-",
        lokasiBaru: item.toStorage?.locationLabel ?? "-",
        user:
          item.actor?.username ?? item.actor?.name ?? item.actor?.email ?? "-",
        tanggal: item.createdAt,
        jam: formatTimeLabel(item.createdAt),
      };
    });
  }, [aktivitasPenyimpanan]);

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return historisPenyimpanan.filter((item) => {
      const matchSearch =
        keyword.length === 0 ||
        item.namaDokumen.toLowerCase().includes(keyword) ||
        item.kode.toLowerCase().includes(keyword) ||
        item.user.toLowerCase().includes(keyword) ||
        item.aksiLabel.toLowerCase().includes(keyword);

      const matchAksi = filterAksi === "Semua" || item.aksiLabel === filterAksi;

      return matchSearch && matchAksi;
    });
  }, [filterAksi, historisPenyimpanan, searchTerm]);

  const totalInputBaru = useMemo(
    () =>
      historisPenyimpanan.filter((item) => item.aksiKey === "CREATED").length,
    [historisPenyimpanan],
  );

  const totalPindahLokasi = useMemo(
    () =>
      historisPenyimpanan.filter((item) => item.aksiKey === "STORAGE_MOVED")
        .length,
    [historisPenyimpanan],
  );

  const totalPerubahanData = useMemo(
    () =>
      historisPenyimpanan.filter((item) => item.aksiKey === "UPDATED").length,
    [historisPenyimpanan],
  );

  const handleExport = async () => {
    await exportToExcel({
      filename: "historis-penyimpanan",
      sheetName: "Historis Penyimpanan",
      title: "Historis Penyimpanan Dokumen",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Tanggal", key: "tanggal", width: 15 },
        { header: "Jam", key: "jam", width: 10 },
        { header: "Kode", key: "kode", width: 15 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 30 },
        { header: "Aksi", key: "aksi", width: 18 },
        { header: "Lokasi Lama", key: "lokasiLama", width: 24 },
        { header: "Lokasi Baru", key: "lokasiBaru", width: 24 },
        { header: "User", key: "user", width: 18 },
      ],
      data: filteredData.map((item, idx) => ({
        no: idx + 1,
        tanggal: formatDateDisplay(item.tanggal),
        jam: item.jam,
        kode: item.kode,
        namaDokumen: item.namaDokumen,
        aksi: item.aksiLabel,
        lokasiLama: item.lokasiLama,
        lokasiBaru: item.lokasiBaru,
        user: item.user,
      })),
    });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Historis Penyimpanan"
        subtitle="Riwayat perubahan lokasi dan aktivitas dokumen arsip digital."
        icon={<Archive />}
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Total Aktivitas
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {historisPenyimpanan.length}
            </p>
          </div>
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <Archive className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Input Baru
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {totalInputBaru}
            </p>
          </div>
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <Archive className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Pindah Lokasi
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {totalPindahLokasi}
            </p>
          </div>
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <Archive className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Perubahan Data
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {totalPerubahanData}
            </p>
          </div>
          <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600">
            <Archive className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 p-5">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Cari
            </label>
            <div className="relative">
              <Search
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Cari dokumen, aksi, atau user..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input input-with-icon"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Filter Aksi
            </label>
            <select
              value={filterAksi}
              onChange={(event) =>
                setFilterAksi(
                  event.target.value as (typeof ACTION_FILTERS)[number],
                )
              }
              className="select"
            >
              {ACTION_FILTERS.map((aksi) => (
                <option key={aksi} value={aksi}>
                  {aksi}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  No
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tanggal
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Jam
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kode
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nama Dokumen
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Aksi
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Lokasi Lama
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Lokasi Baru
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  User
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
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateDisplay(item.tanggal)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.jam}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg border-2 border-gray-800 bg-white px-3 py-1 text-xs font-semibold text-gray-900 tabular-nums">
                      {item.kode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {item.namaDokumen}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getActionPillClass(item.aksiLabel)}`}
                    >
                      {item.aksiLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.lokasiLama}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {item.lokasiBaru}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    {formatPersonName(item.user)}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Belum ada data historis penyimpanan yang sesuai.
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
