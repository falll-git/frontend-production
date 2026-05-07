"use client";

import { useMemo, useState } from "react";
import { Check, Inbox, X, AlertCircle } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { formatDateDisplay, parseDateString } from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function PermintaanDisposisiPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { ensureCapability, ensureFeature, hasCapability, hasFeature } =
    useProtectedAction();
  const { disposisi, processDisposisi } = useArsipDigitalWorkflow();
  const menuUrl = "/dashboard/arsip-digital/disposisi/permintaan";
  const canUpdatePermintaanDisposisi = hasCapability(
    menuUrl,
    "update",
  );
  const canApprovePermintaanDisposisi =
    canUpdatePermintaanDisposisi && hasFeature(menuUrl, "approve");
  const canRejectPermintaanDisposisi =
    canUpdatePermintaanDisposisi && hasFeature(menuUrl, "reject");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    kode: string;
    namaDokumen: string;
    detail: string;
    pemohon: string;
    tglPengajuan: string;
    alasan: string;
  } | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [tanggalExpired, setTanggalExpired] = useState("");
  const [alasanAksi, setAlasanAksi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const todayKey = useMemo(() => new Date().toDateString(), []);

  const data = useMemo(() => {
    return disposisi
      .filter(
        (item) =>
          item.statusKey === "PENDING" && item.owner?.id === user?.id,
      )
      .map((item) => ({
        id: item.id,
        kode: item.document?.kode ?? "-",
        namaDokumen: item.document?.namaDokumen ?? "-",
        detail: item.document?.detail ?? item.detail,
        pemohon: item.requester?.username ?? item.requester?.name ?? item.pemohon,
        tglPengajuan: item.tglPengajuan,
        alasan: item.alasanPengajuan,
      }));
  }, [disposisi, user?.id]);

  const approvedTodayCount = useMemo(() => {
    if (!user?.id) return 0;

    return disposisi.filter((item) => {
      if (item.owner?.id !== user.id || item.statusKey !== "APPROVED" || !item.tglAksi) {
        return false;
      }

      const actionDate = parseDateString(item.tglAksi);
      return actionDate?.toDateString() === todayKey;
    }).length;
  }, [disposisi, todayKey, user?.id]);

  const handleAction = (
    item: (typeof data)[0],
    type: "approve" | "reject",
  ) => {
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

    const trimmedReason = alasanAksi.trim();

    if (actionType === "approve" && !tanggalExpired) {
      showToast("Tanggal expired wajib diisi.", "warning");
      return;
    }

    if (trimmedReason.length < 3) {
      showToast("Catatan aksi minimal 3 karakter.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await processDisposisi({
        id: selectedItem.id,
        action: actionType,
        alasanAksi: trimmedReason,
        tanggalExpired,
      });

      if (!updated) {
        showToast("Data disposisi tidak valid atau sudah diproses.", "warning");
        return;
      }

      setShowModal(false);
      showToast(
        actionType === "approve"
          ? "Akses dokumen berhasil disetujui."
          : "Permintaan akses berhasil ditolak.",
        actionType === "approve" ? "success" : "warning",
      );
      setSelectedItem(null);
      setActionType(null);
      setTanggalExpired("");
      setAlasanAksi("");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Permintaan gagal diproses.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <FeatureHeader
        title="Permintaan Disposisi"
        subtitle="Kelola persetujuan permintaan akses dokumen dari pengguna lain."
        icon={<Inbox />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Total Permintaan
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{data.length}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <Inbox className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Menunggu Aksi
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{data.length}</p>
          </div>
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <AlertCircle className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Disetujui Hari Ini
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{approvedTodayCount}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <Check className="w-7 h-7" />
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
                    Kode
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nama Dokumen
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pemohon
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    Alasan
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
                {data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-xs font-medium tabular-nums">
                        {item.kode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.namaDokumen}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={item.detail}>
                      {item.detail}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800">
                        {formatPersonName(item.pemohon)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateDisplay(item.tglPengajuan)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs italic">
                      &quot;{item.alasan}&quot;
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Menunggu Persetujuan
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canApprovePermintaanDisposisi ||
                        canRejectPermintaanDisposisi ? (
                          <>
                            {canApprovePermintaanDisposisi ? (
                              <button
                                onClick={() => handleAction(item, "approve")}
                                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Setujui"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : null}
                            {canRejectPermintaanDisposisi ? (
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Tidak Ada Permintaan</h3>
          <p className="text-gray-500 mt-2">
            Semua permintaan akses dokumen sudah diproses.
          </p>
        </div>
      )}

      <ConfirmModal
        isOpen={showModal && !!selectedItem}
        onClose={() => setShowModal(false)}
        onConfirm={() => void handleSubmit()}
        title={actionType === "approve" ? "Setujui Disposisi" : "Tolak Disposisi"}
        type={actionType === "approve" ? "success" : "danger"}
        confirmText={
          actionType === "approve" ? (
            <>
              <Check className="w-4 h-4" />
              Setujui
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              Tolak
            </>
          )
        }
        cancelText="Batal"
        isLoading={isLoading}
        isConfirmDisabled={
          !alasanAksi.trim() || (actionType === "approve" && !tanggalExpired)
        }
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Kode Dokumen
                  </label>
                  <p className="font-bold text-primary-600 mt-1">{selectedItem.kode}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Nama Dokumen
                  </label>
                  <p className="font-medium text-gray-800 mt-1">
                    {selectedItem.namaDokumen}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Keterangan
                  </label>
                  <p className="font-medium text-gray-800 mt-1 text-sm">
                    {selectedItem.detail}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Pemohon
                  </label>
                  <p className="font-semibold text-gray-800 mt-1">
                    {formatPersonName(selectedItem.pemohon)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    Alasan Pengajuan
                  </label>
                  <p className="font-medium text-gray-800 italic mt-1 text-sm bg-white p-2 rounded border border-gray-200">
                    &quot;{selectedItem.alasan}&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {actionType === "approve" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tanggal Expired Akses <span className="text-red-500">*</span>
                  </label>
                  <DatePickerInput
                    value={tanggalExpired}
                    onChange={setTanggalExpired}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alasan {actionType === "approve" ? "Persetujuan" : "Penolakan"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={alasanAksi}
                  onChange={(event) => setAlasanAksi(event.target.value)}
                  placeholder={`Masukkan alasan ${actionType === "approve" ? "persetujuan" : "penolakan"}...`}
                  className="textarea resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
