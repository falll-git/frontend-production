"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Send, X, FileText } from "lucide-react";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { arsipService } from "@/services/arsip.service";
import type { Dokumen } from "@/types/arsip.types";

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function PengajuanDisposisiPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability } = useProtectedAction();
  const { submitDisposisi } = useArsipDigitalWorkflow();
  const canCreatePengajuanDisposisi = hasCapability(
    "/dashboard/arsip-digital/disposisi/pengajuan",
    "create",
  );
  const [requestableDocs, setRequestableDocs] = useState<Dokumen[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(true);

  const loadRequestableDocs = useCallback(async () => {
    if (!canCreatePengajuanDisposisi) {
      setRequestableDocs([]);
      setIsDocsLoading(false);
      return;
    }

    setIsDocsLoading(true);
    try {
      const rows = await arsipService.getRequestable();
      setRequestableDocs(rows);
    } catch (error) {
      setRequestableDocs([]);
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat dokumen yang bisa diajukan.",
        "error",
      );
    } finally {
      setIsDocsLoading(false);
    }
  }, [canCreatePengajuanDisposisi, showToast]);

  useEffect(() => {
    void loadRequestableDocs();
  }, [loadRequestableDocs]);

  const dokumenList = useMemo(() => {
    return requestableDocs
      .map((item) => ({
        id: item.id,
        kode: item.kode,
        jenisDokumen: item.jenisDokumen,
        namaDokumen: item.namaDokumen,
        detail: item.detail,
        pemilik: item.creator?.username ?? item.creator?.name ?? item.userInput,
      }));
  }, [requestableDocs]);

  const filteredDokumen = dokumenList.filter(
    (doc) =>
      doc.namaDokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.kode.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCheckbox = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === filteredDokumen.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDokumen.map((item) => item.id));
    }
  };

  const handleSubmit = async () => {
    if (
      !ensureCapability(
        "/dashboard/arsip-digital/disposisi/pengajuan",
        "create",
      )
    ) {
      return;
    }

    if (selectedDocs.length === 0) {
      showToast("Pilih minimal satu dokumen untuk diajukan.", "warning");
      return;
    }

    if (!alasan.trim()) {
      showToast("Alasan pengajuan wajib diisi.", "warning");
      return;
    }

    if (alasan.trim().length < 5) {
      showToast("Alasan pengajuan minimal 5 karakter.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const created = await submitDisposisi({
        dokumenIds: selectedDocs,
        alasanPengajuan: alasan.trim(),
      });

      if (created === 0) {
        showToast("Tidak ada dokumen yang bisa diajukan.", "warning");
        return;
      }

      setShowModal(false);
      showToast(
        `Pengajuan akses berhasil dikirim (${created} dokumen).`,
        "success",
      );
      setSelectedDocs([]);
      setAlasan("");
      await loadRequestableDocs();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Pengajuan gagal dikirim.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDocuments = dokumenList.filter((item) =>
    selectedDocs.includes(item.id),
  );

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Pengajuan Disposisi"
        subtitle="Ajukan permohonan akses untuk melihat detail dokumen."
        icon={<Send />}
      />

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-2xl mb-8">
        <h3 className="text-blue-800 font-semibold mb-2 flex items-center gap-2">
          Cara Mengajukan:
        </h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-700">
          <li>Pilih dokumen yang ingin Anda akses.</li>
          <li>Klik tombol <span className="font-semibold">&quot;Ajukan Disposisi&quot;</span>.</li>
          <li>Isi alasan pengajuan dengan jelas.</li>
          <li>Tunggu persetujuan dari pemilik dokumen.</li>
        </ol>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 p-5">
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Cari Dokumen
            </label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama dokumen atau kode..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input input-with-icon"
              />
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={!canCreatePengajuanDisposisi || selectedDocs.length === 0}
            className="btn btn-primary px-6 py-2.5 transition-all"
          >
            <Send className="w-4 h-4 mr-2" />
            Ajukan Disposisi
            <span className="ml-1 bg-white/20 px-2 py-0.5 rounded text-xs">
              {selectedDocs.length}
            </span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-16 px-6 py-3 text-center">
                  <div className="flex justify-center">
                    <UiverseCheckbox
                      checked={
                        selectedDocs.length === filteredDokumen.length &&
                        filteredDokumen.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      ariaLabel="Pilih semua dokumen"
                      size={20}
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kode
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Jenis Dokumen
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">
                  Nama Dokumen
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pemilik
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isDocsLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Memuat dokumen yang bisa diajukan...
                  </td>
                </tr>
              ) : filteredDokumen.length > 0 ? (
                filteredDokumen.map((doc) => (
                <tr
                  key={doc.id}
                  className={`group transition-colors cursor-pointer hover:bg-blue-50/40 ${
                    selectedDocs.includes(doc.id) ? "bg-blue-50/60" : ""
                  }`}
                  onClick={() => handleCheckbox(doc.id)}
                >
                  <td
                    className="px-6 py-3 text-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <UiverseCheckbox
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={() => handleCheckbox(doc.id)}
                        ariaLabel={`Pilih dokumen ${doc.kode}`}
                        size={20}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-xs font-medium tabular-nums">
                      {doc.kode}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {doc.jenisDokumen}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-800">
                    {doc.namaDokumen}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate" title={doc.detail}>
                    {doc.detail}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {formatPersonName(doc.pemilik)}
                    </span>
                  </td>
                  <td
                    className="px-6 py-3 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setSelectedDocs([doc.id]);
                        setShowModal(true);
                      }}
                      className="btn btn-sm btn-outline hover:bg-primary-600 hover:text-white transition-colors"
                    >
                      Ajukan
                    </button>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Tidak ada dokumen yang bisa diajukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Send className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Form Pengajuan
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Dokumen yang Diajukan ({selectedDocuments.length})
                </label>
                <div className="bg-gray-50 rounded-lg border border-gray-100 max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {selectedDocuments.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {doc.namaDokumen}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tabular-nums">
                            {doc.kode}
                          </span>
                          <span className="text-xs text-gray-500">
                            &bull; Pemilik:{" "}
                            <span className="font-semibold text-gray-700">
                              {formatPersonName(doc.pemilik)}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Keterangan: {doc.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alasan Pengajuan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={alasan}
                  onChange={(event) => setAlasan(event.target.value)}
                  placeholder="Jelaskan alasan Anda membutuhkan akses ke dokumen ini..."
                  className="textarea resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-outline"
              >
                Batal
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!alasan.trim() || isLoading}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Kirim Pengajuan
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
