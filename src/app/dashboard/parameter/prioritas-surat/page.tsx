"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  getSetupPageEmptyStateCopy,
  SETUP_PAGE_ADD_BUTTON_CLASS,
  SETUP_PAGE_ACTION_HEADER_CELL_CLASS,
  SETUP_PAGE_COMPACT_CELL_CLASS,
  SETUP_PAGE_COMPACT_ROW_CLASS,
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_NUMBER_CELL_CLASS,
  SETUP_PAGE_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
  SETUP_PAGE_TABLE_BODY_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
  SETUP_PAGE_WIDTH_SM_CLASS,
} from "@/components/ui/setupPageStyles";
import { letterPriorityService } from "@/services/letter-priority.service";
import type { LetterPriority } from "@/types/master.types";

type FormState = {
  nama: string;
};

const EMPTY_FORM: FormState = {
  nama: "",
};

const ACTION_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

export default function SetupPrioritasSuratPage() {
  const { showToast } = useAppToast();
  const [priorities, setPriorities] = useState<LetterPriority[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<LetterPriority | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPriorities() {
      try {
        setIsFetching(true);
        const items = await letterPriorityService.getAll();
        if (!ignore) {
          setPriorities(
            [...items].sort((left, right) => left.name.localeCompare(right.name)),
          );
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat data prioritas surat",
            "error",
          );
        }
      } finally {
        if (!ignore) {
          setIsFetching(false);
        }
      }
    }

    void loadPriorities();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return priorities;

    return priorities.filter((item) =>
      item.name.toLowerCase().includes(keyword),
    );
  }, [priorities, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (priority: LetterPriority) => {
    setEditingId(priority.id);
    setForm({ nama: priority.name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (priority: LetterPriority) => {
    setDeleteItem(priority);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      await letterPriorityService.remove(deleteItem.id);
      setPriorities((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Prioritas surat dihapus", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menghapus prioritas surat",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const nama = form.nama.trim();

    if (!nama) {
      showToast("Nama prioritas surat wajib diisi", "warning");
      return;
    }

    const duplicatePriority = priorities.some(
      (item) =>
        item.id !== editingId &&
        item.name.trim().toLowerCase() === nama.toLowerCase(),
    );

    if (duplicatePriority) {
      showToast("Nama prioritas surat sudah digunakan.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await letterPriorityService.update(editingId, { name: nama });
        setPriorities((prev) =>
          prev
            .map((item) =>
              item.id === editingId ? { ...item, ...updated, id: editingId } : item,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        showToast("Prioritas surat diperbarui", "success");
      } else {
        const created = await letterPriorityService.create({ name: nama });
        setPriorities((prev) =>
          [...prev, created].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );

        showToast("Prioritas surat ditambahkan", "success");
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan prioritas surat",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Setup Prioritas Surat"
        subtitle="Kelola master sifat atau prioritas surat."
        icon={<Mail />}
        actions={
          <button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah Prioritas
          </button>
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_SM_CLASS}`}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search
            className={SETUP_PAGE_SEARCH_ICON_CLASS}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari prioritas surat..."
            className={SETUP_PAGE_SEARCH_INPUT_CLASS}
          />
        </div>
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} ${SETUP_PAGE_WIDTH_SM_CLASS}`}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed`}>
            <colgroup>
              <col className="w-16" />
              <col className="w-[400px]" />
              <col className="w-24" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>
                  No
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Nama Prioritas Surat
                </th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((priority, index) => (
                <tr
                  key={priority.id}
                  className={SETUP_PAGE_COMPACT_ROW_CLASS}
                >
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </td>
                  <td
                    className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}
                  >
                    {priority.name}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} w-24 !text-center`}>
                    <div className="inline-flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(priority)}
                        className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50 hover:text-blue-700`}
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(priority)}
                        className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50 hover:text-red-700`}
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {isFetching && (
                <tr>
                  <td
                    colSpan={3}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    Memuat data prioritas surat...
                  </td>
                </tr>
              )}

              {!isFetching && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    {getSetupPageEmptyStateCopy("prioritas surat")}
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
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Edit Prioritas Surat" : "Tambah Prioritas Surat"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tentukan daftar sifat surat yang dipakai di form persuratan.
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Prioritas <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nama}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nama: event.target.value }))
                  }
                  placeholder="Biasa / Terbatas / Rahasia"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Nama prioritas harus beda.
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
        title="Hapus Prioritas Surat?"
        entityLabel="prioritas surat"
        itemName={deleteItem?.name ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </div>
  );
}
