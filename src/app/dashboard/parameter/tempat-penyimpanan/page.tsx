"use client";

import { useMemo, useState } from "react";
import {
  Edit2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Warehouse,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import {
  getSetupPageEmptyStateCopy,
  SETUP_PAGE_ADD_BUTTON_CLASS,
  SETUP_PAGE_ACTION_CELL_CLASS,
  SETUP_PAGE_ACTION_HEADER_CELL_CLASS,
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_NUMBER_CELL_CLASS,
  SETUP_PAGE_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
  SETUP_PAGE_STATUS_CELL_CLASS,
  SETUP_PAGE_STATUS_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_CELL_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import { storageService } from "@/services/storage.service";

type FormState = {
  kodeKantor: string;
  namaKantor: string;
  kodeLemari: string;
  rak: string;
  kapasitas: string;
  status: "Aktif" | "Nonaktif";
};

const EMPTY_FORM: FormState = {
  kodeKantor: "",
  namaKantor: "",
  kodeLemari: "",
  rak: "",
  kapasitas: "",
  status: "Aktif",
};

const ACTION_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";
const STATUS_BADGE_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

function getStatusBadgeClass(status: "Aktif" | "Nonaktif") {
  return status === "Aktif"
    ? `${STATUS_BADGE_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${STATUS_BADGE_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
}

export default function SetupTempatPenyimpananPage() {
  const { showToast } = useAppToast();
  const { tempatPenyimpanan, setTempatPenyimpanan, isLoading } =
    useArsipDigitalMasterData();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    id: string | number;
    label: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tempatPenyimpanan;
    return tempatPenyimpanan.filter((t) =>
      [
        t.kodeKantor,
        t.namaKantor,
        t.kodeLemari,
        t.rak,
        String(t.kapasitas),
        t.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, tempatPenyimpanan]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (id: string | number) => {
    const item = tempatPenyimpanan.find((t) => t.id === id);
    if (!item) return;
    setEditingId(item.id);
    setForm({
      kodeKantor: item.kodeKantor,
      namaKantor: item.namaKantor,
      kodeLemari: item.kodeLemari,
      rak: item.rak,
      kapasitas: String(item.kapasitas),
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const toggleStatus = async (id: string | number) => {
    const current = tempatPenyimpanan.find((item) => item.id === id);
    if (!current) return;

    const nextStatus = current.status === "Aktif" ? "Nonaktif" : "Aktif";

    try {
      const updated = await storageService.update(String(id), {
        kodeKantor: current.kodeKantor,
        namaKantor: current.namaKantor,
        kodeLemari: current.kodeLemari,
        rak: current.rak,
        kapasitas: current.kapasitas,
        status: nextStatus,
      });

      setTempatPenyimpanan((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated, id } : item)),
      );
      showToast("Status tempat penyimpanan diperbarui", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status tempat penyimpanan",
        "error",
      );
    }
  };

  const handleDelete = (id: string | number) => {
    const current = tempatPenyimpanan.find((item) => item.id === id);
    if (!current) return;

    setDeleteItem({
      id: current.id,
      label: `${current.kodeLemari} - ${current.rak}`,
    });
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      await storageService.remove(String(deleteItem.id));
      setTempatPenyimpanan((prev) =>
        prev.filter((item) => item.id !== deleteItem.id),
      );
      showToast("Tempat penyimpanan dihapus", "success");
      setDeleteItem(null);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menghapus tempat penyimpanan",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const kodeKantor = form.kodeKantor.trim().toUpperCase();
    const namaKantor = form.namaKantor.trim();
    const kodeLemari = form.kodeLemari.trim().toUpperCase();
    const rak = form.rak.trim();
    const kapasitasNum = Number(form.kapasitas);

    if (!kodeKantor) {
      showToast("Kode kantor wajib diisi.", "warning");
      return;
    }

    if (!namaKantor) {
      showToast("Nama kantor wajib diisi.", "warning");
      return;
    }

    if (!kodeLemari) {
      showToast("Kode lemari wajib diisi.", "warning");
      return;
    }

    if (!rak) {
      showToast("Nama rak wajib diisi.", "warning");
      return;
    }

    if (!form.kapasitas.trim()) {
      showToast("Kapasitas wajib diisi.", "warning");
      return;
    }

    if (!Number.isFinite(kapasitasNum) || kapasitasNum <= 0) {
      showToast("Kapasitas harus berupa angka > 0", "warning");
      return;
    }

    const duplicateStorage = tempatPenyimpanan.some(
      (item) =>
        item.id !== editingId &&
        item.kodeKantor.trim().toUpperCase() === kodeKantor &&
        item.kodeLemari.trim().toUpperCase() === kodeLemari &&
        item.rak.trim().toLowerCase() === rak.toLowerCase(),
    );

    if (duplicateStorage) {
      showToast("Kombinasi kantor, lemari, dan rak sudah digunakan.", "warning");
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await storageService.update(String(editingId), {
          kodeKantor,
          namaKantor,
          kodeLemari,
          rak,
          kapasitas: kapasitasNum,
          status: form.status,
        });

        setTempatPenyimpanan((prev) =>
          prev.map((item) =>
            item.id === editingId ? { ...item, ...updated, id: editingId } : item,
          ),
        );
        showToast("Tempat penyimpanan diperbarui", "success");
      } else {
        const created = await storageService.create({
          kodeKantor,
          namaKantor,
          kodeLemari,
          rak,
          kapasitas: kapasitasNum,
          status: form.status,
        });
        setTempatPenyimpanan((prev) => [...prev, created]);

        showToast("Tempat penyimpanan ditambahkan", "success");
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan tempat penyimpanan",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Setup Tempat Penyimpanan"
        subtitle="Kelola master lokasi penyimpanan dokumen fisik."
        icon={<Warehouse />}
        actions={
          <button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah Tempat
          </button>
        }
      />

      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search
            className={SETUP_PAGE_SEARCH_ICON_CLASS}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kantor, lemari, rak, kapasitas, atau status..."
            className={SETUP_PAGE_SEARCH_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>
                    No
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Kode Kantor
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Nama Kantor
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Kode Lemari
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Rak
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Kapasitas
                  </th>
                  <th className={SETUP_PAGE_STATUS_HEADER_CELL_CLASS}>
                    Status
                  </th>
                  <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t, idx) => (
                  <tr
                    key={t.id}
                    className={SETUP_PAGE_TABLE_ROW_CLASS}
                  >
                    <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                      {idx + 1}
                    </td>
                    <td className={SETUP_PAGE_TABLE_CELL_CLASS}>
                      <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                        {t.kodeKantor}
                      </span>
                    </td>
                    <td
                      className={`${SETUP_PAGE_TABLE_CELL_CLASS} text-sm font-semibold text-gray-900`}
                    >
                      {t.namaKantor}
                    </td>
                    <td
                      className={`${SETUP_PAGE_TABLE_CELL_CLASS} text-sm text-gray-600 tabular-nums`}
                    >
                      {t.kodeLemari}
                    </td>
                    <td
                      className={`${SETUP_PAGE_TABLE_CELL_CLASS} text-sm text-gray-600 tabular-nums`}
                    >
                      {t.rak}
                    </td>
                    <td
                      className={`${SETUP_PAGE_TABLE_CELL_CLASS} text-sm text-gray-600 tabular-nums`}
                    >
                      {t.kapasitas}
                    </td>
                    <td className={SETUP_PAGE_STATUS_CELL_CLASS}>
                      <span className={getStatusBadgeClass(t.status)}>
                        {t.status}
                      </span>
                    </td>
                    <td className={SETUP_PAGE_ACTION_CELL_CLASS}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(t.id)}
                          className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50 hover:text-blue-700`}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => toggleStatus(t.id)}
                          className={`${ACTION_ICON_BUTTON_CLASS} ${
                            t.status === "Aktif"
                              ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              : "text-red-600 hover:bg-red-50 hover:text-red-700"
                          }`}
                          title={
                            t.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"
                          }
                        >
                          {t.status === "Aktif" ? (
                            <ToggleRight className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50 hover:text-red-700`}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {isLoading && (
                  <tr>
                    <td
                      colSpan={8}
                      className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                    >
                      Memuat data tempat penyimpanan...
                    </td>
                  </tr>
                )}

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                    >
                      {getSetupPageEmptyStateCopy("tempat penyimpanan")}
                    </td>
                  </tr>
                )}
              </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 p-4"
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId
                    ? "Edit Tempat Penyimpanan"
                    : "Tambah Tempat Penyimpanan"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Isi data lokasi penyimpanan dokumen.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="btn btn-ghost btn-sm"
                title="Tutup"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kode Kantor <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.kodeKantor}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kodeKantor: e.target.value }))
                  }
                  placeholder="KP / KST"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Pakai kode kantor yang jelas.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Kantor <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.namaKantor}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, namaKantor: e.target.value }))
                  }
                  placeholder="Kantor Pusat"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Isi nama kantor sesuai data aslinya.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kode Lemari <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.kodeLemari}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kodeLemari: e.target.value }))
                  }
                  placeholder="L-020"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Pakai kode lemari yang jelas.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rak <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.rak}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rak: e.target.value }))
                  }
                  placeholder="Rak 4"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Rak ini tidak boleh dobel dalam lemari yang sama.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kapasitas <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.kapasitas}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kapasitas: e.target.value }))
                  }
                  placeholder="150"
                  inputMode="numeric"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Isi dengan angka lebih dari 0.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value === "Aktif" ? "Aktif" : "Nonaktif",
                    }))
                  }
                  className="select"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Kalau nonaktif, lokasi ini tidak dipakai untuk input baru.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={editingId ? "btn btn-primary" : "btn btn-upload"}
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title="Hapus Tempat Penyimpanan?"
        entityLabel="tempat penyimpanan"
        itemName={deleteItem?.label ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </div>
  );
}
