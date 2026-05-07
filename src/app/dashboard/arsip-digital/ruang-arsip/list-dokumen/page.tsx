"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  FileSpreadsheet,
  FileText,
  MapPin,
  Search,
  SearchX,
  X,
  Filter,
  Edit,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { validateDigitalArchiveFile } from "@/lib/utils/file";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DocumentViewButton from "@/components/manajemen-surat/DocumentViewButton";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { arsipService, type CreateDokumenPayload } from "@/services/arsip.service";

const LIST_DOKUMEN_MENU_URL = "/dashboard/arsip-digital/ruang-arsip/list-dokumen";

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PILL_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

function getDocumentStatusPillClass(status: string) {
  switch (status) {
    case "Tersedia":
      return `${PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`;
    case "Dipinjam":
      return `${PILL_BASE_CLASS} border-amber-200 bg-amber-50 text-amber-700`;
    case "Diajukan":
      return `${PILL_BASE_CLASS} border-blue-200 bg-blue-50 text-blue-700`;
    case "Dalam Proses":
      return `${PILL_BASE_CLASS} border-violet-200 bg-violet-50 text-violet-700`;
    default:
      return `${PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
  }
}

type DokumenRow = {
  id: string;
  kode: string;
  jenisDokumen: string;
  namaDokumen: string;
  detail: string;
  tglInput: string;
  userInput: string;
  statusPinjam: string;
  locationLabel: string;
  officeCode: string;
  officeName: string;
  cabinetCode: string;
  rackName: string;
  fileUrl: string | null;
};

export default function ListDokumenPage() {
  const { showToast } = useAppToast();
  const { openPreview } = useDocumentPreviewContext();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const { jenisDokumen } = useArsipDigitalMasterData();
  const { dokumen, peminjaman, refreshWorkflowData } = useArsipDigitalWorkflow();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [selectedDoc, setSelectedDoc] = useState<DokumenRow | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFormData, setEditFormData] = useState({
    document_name: "",
    description: "",
    is_restricted: false,
  });
  const canUpdateDokumen = hasCapability(LIST_DOKUMEN_MENU_URL, "update");
  const canDeleteDokumen = hasCapability(LIST_DOKUMEN_MENU_URL, "delete");

  const requireUpdateDokumenAction = () =>
    ensureCapability(LIST_DOKUMEN_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah dokumen.",
    });

  const requireDeleteDokumenAction = () =>
    ensureCapability(LIST_DOKUMEN_MENU_URL, "delete", {
      message: "Anda tidak memiliki akses untuk menghapus dokumen.",
    });

  const allDokumen = useMemo<DokumenRow[]>(() => {
    return dokumen.map((item) => ({
      id: item.id,
      kode: item.kode,
      jenisDokumen: item.jenisDokumen,
      namaDokumen: item.namaDokumen,
      detail: item.detail,
      tglInput: item.tglInput,
      userInput: item.creator?.username ?? item.creator?.name ?? item.userInput,
      statusPinjam: item.statusPinjam,
      locationLabel: item.storage?.locationLabel ?? item.tempatPenyimpanan ?? "-",
      officeCode: item.storage?.officeCode ?? "-",
      officeName: item.storage?.officeName ?? "-",
      cabinetCode: item.storage?.cabinetCode ?? "-",
      rackName: item.storage?.rackName ?? "-",
      fileUrl: item.fileUrl ?? null,
    }));
  }, [dokumen]);

  const jenisDokumenList = useMemo(() => {
    return [
      "Semua",
      ...jenisDokumen.filter((item) => item.status === "Aktif").map((item) => item.nama),
    ];
  }, [jenisDokumen]);

  const historisPeminjaman = useMemo(() => {
    if (!selectedDoc) return [];
    return peminjaman
      .filter((item) => item.dokumenId === selectedDoc.id)
      .map((item) => ({
        id: item.id,
        peminjam: item.peminjam,
        tglPinjam: item.tglPinjam,
        tglKembali: item.tglKembali,
        status: item.status,
      }));
  }, [peminjaman, selectedDoc]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const kode = new URLSearchParams(window.location.search).get("kode");
    if (!kode) return;

    const timeoutId = window.setTimeout(() => {
      setSearchTerm(kode);
      const doc = allDokumen.find(
        (item) => item.kode.toLowerCase() === kode.toLowerCase(),
      );
      if (doc) {
        setSelectedDoc(doc);
        setShowDetail(true);
      } else {
        showToast("Dokumen tidak ditemukan.", "warning");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [allDokumen, showToast]);

  const filteredDokumen = allDokumen.filter((doc) => {
    const matchSearch =
      doc.namaDokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.kode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchJenis = filterJenis === "Semua" || doc.jenisDokumen === filterJenis;
    return matchSearch && matchJenis;
  });

  const handleRowClick = (doc: DokumenRow) => {
    setSelectedDoc(doc);
    setShowDetail(true);
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    if (!requireDeleteDokumenAction()) return;
    setIsDeleting(true);
    try {
      await arsipService.remove(selectedDoc.id);
      showToast("Dokumen berhasil dihapus.", "success");
      setShowDetail(false);
      setShowDelete(false);
      refreshWorkflowData();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Dokumen gagal dihapus.",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    if (!selectedDoc) return;
    if (!requireUpdateDokumenAction()) return;
    setEditFormData({
      document_name: selectedDoc.namaDokumen,
      description: selectedDoc.detail,
      is_restricted: false,
    });
    setEditFile(null);
    setShowEdit(true);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDoc) return;

    if (editFormData.document_name.trim().length < 3) {
      showToast("Nama dokumen minimal 3 karakter.", "warning");
      return;
    }

    setIsEditing(true);
    try {
      const updateData: Partial<CreateDokumenPayload> = {
        document_name: editFormData.document_name.trim(),
        description: editFormData.description.trim(),
      };
      if (editFile) {
        updateData.file = editFile;
      }
      await arsipService.update(selectedDoc.id, updateData);
      showToast("Dokumen berhasil diperbarui.", "success");
      setShowEdit(false);
      setShowDetail(false);
      refreshWorkflowData();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Dokumen gagal diperbarui.",
        "error",
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleExport = async () => {
    await exportToExcel({
      filename: "list-dokumen-digital",
      sheetName: "List Dokumen",
      title: "Daftar Dokumen Digital",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Kode", key: "kode", width: 15 },
        { header: "Jenis Dokumen", key: "jenisDokumen", width: 20 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 30 },
        { header: "Keterangan", key: "detail", width: 40 },
        { header: "Tgl Input", key: "tglInput", width: 15 },
        { header: "User Input", key: "userInput", width: 15 },
        { header: "Status", key: "statusPinjam", width: 18 },
      ],
      data: filteredDokumen.map((doc, idx) => ({
        no: idx + 1,
        kode: doc.kode,
        jenisDokumen: doc.jenisDokumen,
        namaDokumen: doc.namaDokumen,
        detail: doc.detail,
        tglInput: formatDateDisplay(doc.tglInput),
        userInput: doc.userInput,
        statusPinjam: doc.statusPinjam,
      })),
    });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="List Dokumen Digital"
        subtitle="Daftar seluruh dokumen yang tersimpan dalam sistem."
        icon={<FileText />}
        actions={
          <button onClick={handleExport} className="btn btn-export-excel" title="Export Excel">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 p-5">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1 relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Cari Dokumen
            </label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, kode, atau keterangan..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input input-with-icon"
              />
            </div>
          </div>

          <div className="w-full md:w-72">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Filter Jenis Dokumen
            </label>
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterJenis}
                onChange={(event) => setFilterJenis(event.target.value)}
                className="select input-with-icon"
              >
                {jenisDokumenList.map((jenis) => (
                  <option key={jenis} value={jenis}>
                    {jenis}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-600">
            Menampilkan <span className="font-bold text-gray-900">{filteredDokumen.length}</span> data
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  No
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                  Kode
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                  Jenis
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nama Dokumen
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                  Keterangan
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Input
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  User
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDokumen.length > 0 ? (
                filteredDokumen.map((doc, idx) => (
                  <tr
                    key={doc.id}
                    onDoubleClick={() => handleRowClick(doc)}
                    className="group hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-xs font-medium tabular-nums">
                        {doc.kode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {doc.jenisDokumen}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold group-hover:text-primary-700 transition-colors">
                      {doc.namaDokumen}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                      {doc.detail}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateDisplay(doc.tglInput)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                      {formatPersonName(doc.userInput)}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={getDocumentStatusPillClass(doc.statusPinjam)}>
                        {doc.statusPinjam}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX className="w-9 h-9 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">
                        Tidak ada dokumen ditemukan
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Coba sesuaikan filter atau kata kunci pencarian Anda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && selectedDoc ? (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <DeleteConfirmModal
              isOpen={showDelete}
              onClose={() => setShowDelete(false)}
              onConfirm={handleDelete}
              isLoading={isDeleting}
              title="Hapus Dokumen"
              itemName={selectedDoc.namaDokumen}
              entityLabel="dokumen"
            />
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[#157ec3]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Detail Dokumen</h2>
                  <p className="text-sm text-gray-500">{selectedDoc.kode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canUpdateDokumen ? (
                  <button
                    onClick={handleEditClick}
                    className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                    title="Edit dokumen"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                ) : null}
                {canDeleteDokumen ? (
                  <button
                    onClick={() => {
                      if (!requireDeleteDokumenAction()) return;
                      setShowDelete(true);
                    }}
                    className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
                    title="Hapus dokumen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                ) : null}
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Kode Dokumen
                    </label>
                    <p className="text-lg font-bold text-primary-600 mt-1">{selectedDoc.kode}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Jenis Dokumen
                    </label>
                    <p className="text-base font-medium text-gray-800 mt-1">{selectedDoc.jenisDokumen}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Nama Dokumen
                    </label>
                    <p className="text-base font-medium text-gray-800 mt-1">{selectedDoc.namaDokumen}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Keterangan
                    </label>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                      {selectedDoc.detail}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Tanggal Input
                      </label>
                      <p className="text-base font-medium text-gray-800 mt-1">
                        {formatDateDisplay(selectedDoc.tglInput)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        User Input
                      </label>
                      <p className="text-base font-medium text-gray-800 mt-1">
                        {formatPersonName(selectedDoc.userInput)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-2">
                      <span className={getDocumentStatusPillClass(selectedDoc.statusPinjam)}>
                        {selectedDoc.statusPinjam}
                      </span>
                    </div>
                  </div>

                  {selectedDoc.fileUrl ? (
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                        Action
                      </label>
                      <DocumentViewButton
                        onClick={() => openPreview(selectedDoc.fileUrl!, selectedDoc.namaDokumen)}
                        className="w-full justify-center"
                        title="View dokumen"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  Lokasi Penyimpanan
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-xs text-gray-500 block mb-1">Kantor</span>
                    <span className="font-semibold text-gray-800">{selectedDoc.officeName}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-xs text-gray-500 block mb-1">Kode</span>
                    <span className="font-semibold text-gray-800">{selectedDoc.officeCode}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-xs text-gray-500 block mb-1">Lemari</span>
                    <span className="font-semibold text-gray-800">{selectedDoc.cabinetCode}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-xs text-gray-500 block mb-1">Rak</span>
                    <span className="font-semibold text-gray-800">{selectedDoc.rackName}</span>
                  </div>
                </div>
              </div>

              {historisPeminjaman.length > 0 ? (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Riwayat Peminjaman
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Peminjam
                          </th>
                          <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Pinjam
                          </th>
                          <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Kembali
                          </th>
                          <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {historisPeminjaman.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm">{formatPersonName(item.peminjam)}</td>
                            <td className="px-4 py-2 text-sm">{formatDateDisplay(item.tglPinjam)}</td>
                            <td className="px-4 py-2 text-sm">{formatDateDisplay(item.tglKembali)}</td>
                            <td className="px-4 py-2">
                              <span className="badge badge-success text-xs">{item.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showEdit && selectedDoc ? (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[#157ec3]">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Edit Dokumen</h2>
                  <p className="text-sm text-gray-500">{selectedDoc.kode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEdit(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div>
                <label htmlFor="edit_nama" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit_nama"
                  type="text"
                  value={editFormData.document_name}
                  onChange={(e) => setEditFormData({ ...editFormData, document_name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_keterangan" className="block text-sm font-medium text-gray-700 mb-2">
                  Keterangan
                </label>
                <textarea
                  id="edit_keterangan"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="textarea"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Dokumen (Opsional)
                </label>
                <div className="file-upload flex flex-col items-center justify-center">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const validationMessage = validateDigitalArchiveFile(file);

                        if (validationMessage) {
                          showToast(validationMessage, "error");
                          e.target.value = "";
                          return;
                        }
                        setEditFile(file);
                      }
                    }}
                  />
                  {editFile ? (
                    <div className="text-center">
                      <FileText className="w-9 h-9 text-primary-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">{editFile.name}</p>
                      <p className="text-xs text-gray-500">{(editFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={() => setEditFile(null)}
                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                      >
                        Hapus file
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Klik untuk upload file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 15MB)</p>
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="btn btn-outline"
                disabled={isEditing}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                className="btn btn-primary"
                disabled={isEditing}
              >
                {isEditing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
