"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart2,
  Handshake,
  RotateCcw,
  X,
} from "lucide-react";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { formatDateDisplay } from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";

type ActionKind = "approve" | "reject" | "handover" | "return";

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function AcceptPeminjamanPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, ensureFeature, hasCapability, hasFeature } =
    useProtectedAction();
  const {
    peminjaman,
    approvePeminjaman,
    rejectPeminjaman,
    handoverPeminjaman,
    returnPeminjaman,
  } = useArsipDigitalWorkflow();
  const menuUrl = "/dashboard/arsip-digital/peminjaman/accept";
  const canUpdatePeminjaman = hasCapability(menuUrl, "update");
  const canApprovePeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "approve");
  const canRejectPeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "reject");
  const canHandoverPeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "handover");
  const canReturnPeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "return");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    kode: string;
    namaDokumen: string;
    pemohon: string;
    tglPeminjaman: string;
    tglPengembalian: string;
    alasan: string;
    statusKey: "PENDING" | "APPROVED" | "HANDED_OVER" | "BORROWED";
  } | null>(null);
  const [actionType, setActionType] = useState<ActionKind | null>(null);
  const [tanggalAksi, setTanggalAksi] = useState("");
  const [catatanAksi, setCatatanAksi] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const data = useMemo(() => {
    return peminjaman
      .filter((item) =>
        ["PENDING", "APPROVED", "HANDED_OVER", "BORROWED"].includes(
          item.statusKey,
        ),
      )
      .map((item) => ({
        id: item.id,
        kode: item.document?.kode ?? `DOC-${item.dokumenId}`,
        namaDokumen: item.document?.namaDokumen ?? item.detail,
        pemohon: item.borrower?.username ?? item.borrower?.name ?? item.peminjam,
        tglPeminjaman: item.tglPinjam,
        tglPengembalian: item.tglKembali,
        alasan: item.alasan,
        statusKey: item.statusKey as
          | "PENDING"
          | "APPROVED"
          | "HANDED_OVER"
          | "BORROWED",
        statusLabel: item.status,
      }));
  }, [peminjaman]);

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setActionType(null);
    setTanggalAksi("");
    setCatatanAksi("");
  };

  const handleAction = (item: (typeof data)[0], type: ActionKind) => {
    if (!ensureCapability(menuUrl, "update")) {
      return;
    }

    if (!ensureFeature(menuUrl, type)) {
      return;
    }
    setSelectedItem(item);
    setActionType(type);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!ensureCapability(menuUrl, "update")) {
      return;
    }
    if (!selectedItem || !actionType) return;

    if (!ensureFeature(menuUrl, actionType)) {
      return;
    }

    const trimmedNote = catatanAksi.trim();

    if ((actionType === "approve" || actionType === "reject") && trimmedNote.length < 3) {
      showToast("Catatan persetujuan minimal 3 karakter.", "warning");
      return;
    }

    if (actionType === "handover" && !tanggalAksi) {
      showToast("Tanggal penyerahan wajib diisi.", "warning");
      return;
    }

    if (actionType === "return") {
      if (!tanggalAksi) {
        showToast("Tanggal pengembalian wajib diisi.", "warning");
        return;
      }

      if (trimmedNote.length < 3) {
        showToast("Catatan pengembalian minimal 3 karakter.", "warning");
        return;
      }
    }

    setIsLoading(true);
    try {
      switch (actionType) {
        case "approve":
          await approvePeminjaman({
            id: selectedItem.id,
            approvalNote: trimmedNote,
          });
          showToast("Permintaan peminjaman berhasil disetujui.", "success");
          break;
        case "reject":
          await rejectPeminjaman({
            id: selectedItem.id,
            rejectionNote: trimmedNote,
          });
          showToast("Permintaan peminjaman berhasil ditolak.", "warning");
          break;
        case "handover":
          await handoverPeminjaman({
            id: selectedItem.id,
            handoverAt: tanggalAksi,
            handoverNote: trimmedNote,
          });
          showToast("Dokumen berhasil diserahkan ke peminjam.", "success");
          break;
        case "return":
          await returnPeminjaman({
            id: selectedItem.id,
            returnedAt: tanggalAksi,
            returnNote: trimmedNote,
          });
          showToast("Pengembalian dokumen berhasil dicatat.", "success");
          break;
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Aksi peminjaman gagal diproses.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = data.filter((item) => item.statusKey === "PENDING").length;
  const approvedCount = data.filter((item) => item.statusKey === "APPROVED").length;
  const borrowedCount = data.filter((item) =>
    ["HANDED_OVER", "BORROWED"].includes(item.statusKey),
  ).length;

  const requiresDate = actionType === "handover" || actionType === "return";
  const requiresNote = true;

  const confirmLabel =
    actionType === "approve"
      ? "Setujui"
      : actionType === "reject"
        ? "Tolak"
        : actionType === "handover"
          ? "Serahkan"
          : "Simpan Pengembalian";

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Accept Peminjaman"
        subtitle="Kelola persetujuan, penyerahan, dan pengembalian dokumen fisik."
        icon={<ClipboardCheck />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Menunggu Persetujuan
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <FileBarChart2 className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Siap Diserahkan
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <Handshake className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Sedang Dipinjam
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{borrowedCount}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                    No
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tahap
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
                    Tgl Pinjam
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tgl Kembali
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    Alasan
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          item.statusKey === "PENDING"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : item.statusKey === "APPROVED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {item.statusKey === "PENDING"
                          ? "Persetujuan"
                          : item.statusKey === "APPROVED"
                            ? "Penyerahan"
                            : "Pengembalian"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-xs font-medium tabular-nums">
                        {item.kode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.namaDokumen}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {formatPersonName(item.pemohon)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateDisplay(item.tglPeminjaman)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateDisplay(item.tglPengembalian)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs italic">
                      &quot;{item.alasan}&quot;
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.statusKey === "PENDING" &&
                        (canApprovePeminjaman || canRejectPeminjaman) ? (
                          <>
                            {canApprovePeminjaman ? (
                              <button
                                onClick={() => handleAction(item, "approve")}
                                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Setujui"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : null}
                            {canRejectPeminjaman ? (
                              <button
                                onClick={() => handleAction(item, "reject")}
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Tolak"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : null}
                          </>
                        ) : null}

                        {canHandoverPeminjaman &&
                        item.statusKey === "APPROVED" ? (
                          <button
                            onClick={() => handleAction(item, "handover")}
                            className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                            title="Serahkan Dokumen"
                          >
                            <Handshake className="w-4 h-4" />
                          </button>
                        ) : null}

                        {canReturnPeminjaman &&
                        ["HANDED_OVER", "BORROWED"].includes(item.statusKey) ? (
                          <button
                            onClick={() => handleAction(item, "return")}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Catat Pengembalian"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Semua Beres</h3>
          <p className="text-gray-500 mt-2">
            Tidak ada proses peminjaman yang sedang menunggu tindakan.
          </p>
        </div>
      )}

      {showModal && selectedItem && (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-start gap-4">
                <div className="text-emerald-500">
                  {actionType === "reject" ? (
                    <X className="h-6 w-6 text-red-500" />
                  ) : actionType === "handover" ? (
                    <Handshake className="h-6 w-6 text-amber-500" />
                  ) : actionType === "return" ? (
                    <RotateCcw className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {actionType === "approve"
                    ? "Setujui Peminjaman"
                    : actionType === "reject"
                      ? "Tolak Peminjaman"
                      : actionType === "handover"
                        ? "Serah Terima Dokumen"
                        : "Catat Pengembalian"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/60 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase font-semibold">
                    Kode
                  </label>
                  <p className="text-sm font-bold text-primary-600 tabular-nums">
                    {selectedItem.kode}
                  </p>
                </div>
                <div className="w-full h-px bg-gray-200" />
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase font-semibold">
                    Dokumen
                  </label>
                  <p className="font-medium text-gray-800">
                    {selectedItem.namaDokumen}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase font-semibold">
                    Peminjam
                  </label>
                  <p className="font-medium text-gray-800">
                    {formatPersonName(selectedItem.pemohon)}
                  </p>
                </div>
              </div>

              {requiresDate ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {actionType === "handover" ? "Tanggal Penyerahan" : "Tanggal Pengembalian"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <DatePickerInput
                    value={tanggalAksi}
                    onChange={setTanggalAksi}
                  />
                </div>
              ) : null}

              {requiresNote ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catatan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={catatanAksi}
                    onChange={(event) => setCatatanAksi(event.target.value)}
                    placeholder="Tambahkan catatan singkat..."
                    className="textarea resize-none"
                    rows={3}
                  />
                </div>
              ) : null}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline">
                Batal
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={
                  (requiresNote && !catatanAksi.trim()) ||
                  (requiresDate && !tanggalAksi) ||
                  isLoading
                }
                className="btn btn-primary"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {actionType === "handover" ? (
                      <Handshake className="w-4 h-4" />
                    ) : actionType === "return" ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : actionType === "reject" ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {confirmLabel}
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
