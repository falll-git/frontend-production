"use client";

import { useMemo, useState } from "react";
import {
  Edit2,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
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
  SETUP_PAGE_TABLE_CELL_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import { documentTypeService } from "@/services/document-type.service";

type FormState = {
  kode: string;
  nama: string;
  keterangan: string;
  status: "Aktif" | "Nonaktif";
};

const EMPTY_FORM: FormState = {
  kode: "",
  nama: "",
  keterangan: "",
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

export default function SetupJenisDokumenPage() {
  const { showToast } = useAppToast();
  const { jenisDokumen, setJenisDokumen, isLoading } = useArsipDigitalMasterData();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    id: string | number;
    nama: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return jenisDokumen;

    return jenisDokumen.filter((item) =>
      [item.kode, item.nama, item.keterangan ?? "", item.status]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [jenisDokumen, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (id: string | number) => {
    const item = jenisDokumen.find((j) => j.id === id);
    if (!item) return;
    setEditingId(item.id);
    setForm({
      kode: item.kode,
      nama: item.nama,
      keterangan: item.keterangan ?? "",
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
    const current = jenisDokumen.find((item) => item.id === id);
    if (!current) return;

    const nextStatus = current.status === "Aktif" ? "Nonaktif" : "Aktif";

    try {
      const updated = await documentTypeService.update(String(id), {
        kode: current.kode,
        nama: current.nama,
        keterangan: current.keterangan,
        status: nextStatus,
      });

      setJenisDokumen((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated, id } : item)),
      );
      showToast("Status jenis dokumen diperbarui", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memperbarui status",
        "error",
      );
    }
  };

  const handleDelete = (id: string | number) => {
    const current = jenisDokumen.find((item) => item.id === id);
    if (!current) return;

    setDeleteItem({ id: current.id, nama: current.nama });
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      await documentTypeService.remove(String(deleteItem.id));
      setJenisDokumen((prev) =>
        prev.filter((item) => item.id !== deleteItem.id),
      );
      showToast("Jenis dokumen dihapus", "success");
      setDeleteItem(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus jenis dokumen",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const kode = form.kode.trim().toUpperCase();
    const nama = form.nama.trim();
    const keterangan = form.keterangan.trim();

    if (!kode) {
      showToast("Kode jenis dokumen wajib diisi.", "warning");
      return;
    }

    if (!nama) {
      showToast("Nama jenis dokumen wajib diisi.", "warning");
      return;
    }

    if (!keterangan) {
      showToast("Keterangan jenis dokumen wajib diisi.", "warning");
      return;
    }

    const duplicateCode = jenisDokumen.some(
      (item) =>
        item.id !== editingId &&
        item.kode.trim().toUpperCase() === kode,
    );

    if (duplicateCode) {
      showToast("Kode jenis dokumen sudah digunakan.", "warning");
      return;
    }

    const duplicateName = jenisDokumen.some(
      (item) =>
        item.id !== editingId &&
        item.nama.trim().toLowerCase() === nama.toLowerCase(),
    );

    if (duplicateName) {
      showToast("Nama jenis dokumen sudah digunakan.", "warning");
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await documentTypeService.update(String(editingId), {
          kode,
          nama,
          keterangan,
          status: form.status,
        });

        setJenisDokumen((prev) =>
          prev.map((item) =>
            item.id === editingId ? { ...item, ...updated, id: editingId } : item,
          ),
        );
        showToast("Jenis dokumen diperbarui", "success");
      } else {
        const created = await documentTypeService.create({
          kode,
          nama,
          keterangan,
          status: form.status,
        });
        setJenisDokumen((prev) => [...prev, created]);

        showToast("Jenis dokumen ditambahkan", "success");
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan jenis dokumen",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Setup Jenis Dokumen"
        subtitle="Kelola master jenis dokumen."
        icon={<Shield />}
        actions={
          <button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah Jenis
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kode, nama jenis dokumen, atau keterangan..."
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
                    Kode
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Nama Jenis Dokumen
                  </th>
                  <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                    Keterangan
                  </th>
                  <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((j, idx) => (
                  <tr
                    key={j.id}
                    className={SETUP_PAGE_TABLE_ROW_CLASS}
                  >
                    <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                      {idx + 1}
                    </td>
                    <td className={SETUP_PAGE_TABLE_CELL_CLASS}>
                      <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                        {j.kode}
                      </span>
                    </td>
                    <td className={SETUP_PAGE_TABLE_CELL_CLASS}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {j.nama}
                        </span>
                        <span className={getStatusBadgeClass(j.status)}>
                          {j.status}
                        </span>
                      </div>
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} text-sm text-gray-700`}>
                      {j.keterangan || "-"}
                    </td>
                    <td className={SETUP_PAGE_ACTION_CELL_CLASS}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(j.id)}
                          className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50 hover:text-blue-700`}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => toggleStatus(j.id)}
                          className={`${ACTION_ICON_BUTTON_CLASS} ${
                            j.status === "Aktif"
                              ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              : "text-red-600 hover:bg-red-50 hover:text-red-700"
                          }`}
                          title={
                            j.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"
                          }
                        >
                          {j.status === "Aktif" ? (
                            <ToggleRight className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(j.id)}
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
                      colSpan={5}
                      className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                    >
                      Memuat data jenis dokumen...
                    </td>
                  </tr>
                )}

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                    >
                      {getSetupPageEmptyStateCopy("jenis dokumen")}
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
                  {editingId ? "Edit Jenis Dokumen" : "Tambah Jenis Dokumen"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tentukan kode, nama, dan keterangan dokumen.
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
                  Kode <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.kode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kode: e.target.value }))
                  }
                  placeholder="PRH / PMB"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Kode harus beda.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nama}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nama: e.target.value }))
                  }
                  placeholder="Pembiayaan"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Nama jenis dokumen harus beda.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keterangan <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.keterangan}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, keterangan: e.target.value }))
                  }
                  placeholder="Dokumen perusahaan"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Isi keterangan singkatnya.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value === "Aktif" ? "Aktif" : "Nonaktif",
                    }))
                  }
                  className="select"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Kalau nonaktif, jenis ini tidak muncul saat input baru.
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
        title="Hapus Jenis Dokumen?"
        entityLabel="jenis dokumen"
        itemName={deleteItem?.nama ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </div>
  );
}
