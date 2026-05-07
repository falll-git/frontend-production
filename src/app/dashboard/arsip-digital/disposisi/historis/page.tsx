"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  History,
  User,
  X,
  XCircle,
} from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import DocumentViewButton from "@/components/manajemen-surat/DocumentViewButton";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDateDisplay } from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import type { Disposisi } from "@/types/arsip.types";

function formatPersonName(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadge(statusKey: Disposisi["statusKey"]) {
  if (statusKey === "APPROVED") {
    return {
      className: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: "Disetujui",
    };
  }

  return {
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Ditolak",
  };
}

export default function HistorisDisposisiPage() {
  const { user } = useAuth();
  const { disposisi } = useArsipDigitalWorkflow();
  const { openPreview } = useDocumentPreviewContext();
  const searchParams = useSearchParams();
  const filterLemariId = searchParams.get("lemariId");
  const filterKantorId = searchParams.get("kantorId");
  const [reportScope, setReportScope] = useState<"my" | "all">("my");
  const [myReportFilter, setMyReportFilter] = useState<
    "all" | "requested" | "approved"
  >("all");
  const [selectedItem, setSelectedItem] = useState<Disposisi | null>(null);
  const currentUserId = user?.id ?? null;

  const completedDisposisi = useMemo(
    () => disposisi.filter((item) => item.statusKey !== "PENDING"),
    [disposisi],
  );

  const filteredByLocation = useMemo(() => {
    return completedDisposisi.filter((item) => {
      const officeCode = item.document?.storage?.officeCode ?? null;
      const cabinetCode = item.document?.storage?.cabinetCode ?? null;
      const lemariId =
        officeCode && cabinetCode ? `${officeCode}::${cabinetCode}` : null;

      if (filterKantorId) {
        return officeCode === filterKantorId;
      }

      if (filterLemariId) {
        return lemariId === filterLemariId;
      }

      return true;
    });
  }, [completedDisposisi, filterKantorId, filterLemariId]);

  const data = useMemo(() => {
    if (reportScope === "all") {
      return filteredByLocation;
    }

    if (!currentUserId) return [];

    return filteredByLocation.filter((item) => {
      if (myReportFilter === "requested") {
        return item.requester?.id === currentUserId;
      }

      if (myReportFilter === "approved") {
        if (item.actor?.id) {
          return item.actor.id === currentUserId;
        }
        return item.owner?.id === currentUserId;
      }

      return (
        item.requester?.id === currentUserId ||
        item.actor?.id === currentUserId ||
        item.owner?.id === currentUserId
      );
    });
  }, [reportScope, myReportFilter, currentUserId, filteredByLocation]);

  const totalApproved = useMemo(
    () => data.filter((item) => item.statusKey === "APPROVED").length,
    [data],
  );

  const totalRejected = useMemo(
    () => data.filter((item) => item.statusKey === "REJECTED").length,
    [data],
  );

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
        title="Historis Disposisi"
        subtitle="Riwayat pengajuan akses dan keputusan dokumen arsip digital."
        icon={<History />}
      />

      <div className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cakupan Laporan
              </span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setReportScope("my")}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    reportScope === "my"
                      ? "bg-[#157ec3] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  Laporan Saya
                </button>
                <button
                  type="button"
                  onClick={() => setReportScope("all")}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    reportScope === "all"
                      ? "bg-[#157ec3] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  Semua Disposisi
                </button>
              </div>
            </div>

            {reportScope === "my" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Filter Saya
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMyReportFilter("all")}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      myReportFilter === "all"
                        ? "border-blue-200 bg-blue-50 text-[#157ec3]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setMyReportFilter("requested")}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      myReportFilter === "requested"
                        ? "border-blue-200 bg-blue-50 text-[#157ec3]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    }`}
                  >
                    Permohonan
                  </button>
                  <button
                    type="button"
                    onClick={() => setMyReportFilter("approved")}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      myReportFilter === "approved"
                        ? "border-blue-200 bg-blue-50 text-[#157ec3]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    }`}
                  >
                    Persetujuan
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Total Riwayat
            </p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2 leading-none">
              {data.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <History className="w-7 h-7" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Disetujui
            </p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2 leading-none">
              {totalApproved}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Ditolak
            </p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2 leading-none">
              {totalRejected}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
            <XCircle className="w-7 h-7" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  {reportScope === "my" && myReportFilter === "requested"
                    ? "Pemilik"
                    : "Pemohon"}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tgl Pengajuan
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tgl Aksi
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item, idx) => {
                const statusBadge = getStatusBadge(item.statusKey);
                const relatedUser =
                  reportScope === "my" && myReportFilter === "requested"
                    ? item.pemilik
                    : item.pemohon;
                const canView =
                  item.statusKey === "APPROVED" &&
                  item.canViewDocument &&
                  Boolean(item.document?.fileUrl);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-xs font-medium tabular-nums">
                        {item.document?.kode ?? "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.document?.namaDokumen ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800">
                        {formatPersonName(relatedUser || "-")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateDisplay(item.tglPengajuan)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.tglAksi ? formatDateDisplay(item.tglAksi) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.className}`}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative ml-auto h-10 w-44">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="absolute left-0 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Detail
                        </button>
                        {canView ? (
                          <DocumentViewButton
                            onClick={() =>
                              openPreview(
                                item.document!.fileUrl!,
                                item.document!.namaDokumen,
                              )
                            }
                            className="absolute right-0 top-1/2 -translate-y-1/2"
                            title="View dokumen"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Belum ada riwayat disposisi pada tab ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem ? (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <History className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Detail Disposisi
                </h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Kode Dokumen
                  </label>
                  <p className="font-bold text-primary-600 mt-1">
                    {selectedItem.document?.kode ?? "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Jenis Dokumen
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.document?.jenisDokumen ?? "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Nama Dokumen
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.document?.namaDokumen ?? "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Lokasi Penyimpanan
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.document?.storage?.locationLabel ?? "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Pemohon
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-800">
                      {formatPersonName(selectedItem.pemohon)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Pemilik Dokumen
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-800">
                      {formatPersonName(selectedItem.pemilik)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Status Akhir
                  </label>
                  <div className="mt-1">
                    {(() => {
                      const statusBadge = getStatusBadge(
                        selectedItem.statusKey,
                      );
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.className}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Akses Berlaku Sampai
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.tglExpired
                      ? formatDateDisplay(selectedItem.tglExpired)
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Tanggal Pengajuan
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-800">
                      {formatDateDisplay(selectedItem.tglPengajuan)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Tanggal Aksi
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-800">
                      {selectedItem.tglAksi
                        ? formatDateDisplay(selectedItem.tglAksi)
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Alasan Pengajuan
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.alasanPengajuan}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Catatan Aksi
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.alasanAksi || "-"}
                  </p>
                </div>
              </div>

              {selectedItem.statusKey === "APPROVED" ? (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Akses Diberikan
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Akses dokumen disetujui dan berlaku sampai{" "}
                        <span className="font-bold">
                          {selectedItem.tglExpired
                            ? formatDateDisplay(selectedItem.tglExpired)
                            : "-"}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
