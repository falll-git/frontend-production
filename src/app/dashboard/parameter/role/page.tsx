"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
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
import { ROLES } from "@/lib/rbac";
import { roleMenuService } from "@/services/role-menu.service";
import { roleService } from "@/services/role.service";
import { userService } from "@/services/user.service";
import type { RoleRecord } from "@/types/master.types";

type FormState = {
  nama: string;
};

const EMPTY_FORM: FormState = {
  nama: "",
};

const CORE_ROLE_NAMES = new Set(
  [ROLES.ADMIN, ROLES.STAF, ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.IT].map(
    (name) => name.toLowerCase(),
  ),
);

function isCoreRole(record: RoleRecord): boolean {
  return CORE_ROLE_NAMES.has(record.name.trim().toLowerCase());
}

function normalizeRoleName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const ACTION_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

const BADGE_UTAMA_CLASS =
  "inline-flex items-center rounded-full border border-[#157ec3]/15 bg-[#157ec3]/8 px-2.5 py-1 text-[11px] font-semibold text-[#0d5a8f]";

const SECTION_CARD_CLASS =
  SETUP_PAGE_TABLE_CARD_CLASS;

export default function SetupRolePage() {
  const { showToast } = useAppToast();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<RoleRecord | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadRoles() {
      try {
        setIsFetching(true);
        const items = await roleService.getAll();
        if (!ignore) {
          setRoles(
            [...items].sort((left, right) => left.name.localeCompare(right.name)),
          );
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat data role",
            "error",
          );
        }
      } finally {
        if (!ignore) {
          setIsFetching(false);
        }
      }
    }

    void loadRoles();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return roles;

    return roles.filter((item) =>
      item.name.toLowerCase().includes(keyword),
    );
  }, [roles, query]);

  const coreRoles = useMemo(
    () => filtered.filter((item) => isCoreRole(item)),
    [filtered],
  );

  const customRoles = useMemo(
    () => filtered.filter((item) => !isCoreRole(item)),
    [filtered],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (role: RoleRecord) => {
    if (isCoreRole(role)) {
      showToast("Role utama tidak dapat diubah namanya.", "warning");
      return;
    }
    setEditingId(role.id);
    setForm({ nama: role.name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (role: RoleRecord) => {
    if (isCoreRole(role)) {
      showToast("Role utama tidak dapat dihapus.", "warning");
      return;
    }
    setDeleteItem(role);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      const linkedUsers = await userService.getAll();
      const hasLinkedUsers = linkedUsers.some(
        (item) => item.role_id === deleteItem.id,
      );

      if (hasLinkedUsers) {
        setDeleteItem(null);
        showToast(
          "Role tidak bisa dihapus karena masih dipakai user. Pindahkan user ke role lain dulu.",
          "warning",
        );
        return;
      }

      const linkedRoleMenus = await roleMenuService.getByRoleId(deleteItem.id);
      if (linkedRoleMenus.length > 0) {
        const cleanupResults = await Promise.allSettled(
          linkedRoleMenus.map((item) => roleMenuService.remove(item.id)),
        );
        const failedCleanup = cleanupResults.some(
          (result) => result.status === "rejected",
        );

        if (failedCleanup) {
          throw new Error(
            "Gagal membersihkan akses menu yang masih menempel pada role.",
          );
        }
      }

      await roleService.remove(deleteItem.id);
      setRoles((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Role dihapus", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus role",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const nama = form.nama.trim();

    if (!nama) {
      showToast("Nama role wajib diisi", "warning");
      return;
    }

    const normalizedName = normalizeRoleName(nama);
    const duplicateRole = roles.some(
      (item) =>
        item.id !== editingId &&
        normalizeRoleName(item.name) === normalizedName,
    );

    if (duplicateRole) {
      showToast("Nama role sudah digunakan.", "warning");
      return;
    }

    if (CORE_ROLE_NAMES.has(nama.toLowerCase()) && !editingId) {
      showToast(
        "Nama ini dipakai role utama. Pilih nama lain (validasi sama seperti di server).",
        "warning",
      );
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await roleService.update(editingId, { name: nama });
        setRoles((prev) =>
          prev
            .map((item) =>
              item.id === editingId ? { ...item, ...updated, id: editingId } : item,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        showToast("Role diperbarui", "success");
      } else {
        const created = await roleService.create({ name: nama });
        setRoles((prev) =>
          [...prev, created].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );

        showToast("Role ditambahkan", "success");
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan role",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Setup Role"
        subtitle="Atur role yang dipakai di sistem."
        icon={<Shield />}
        actions={
          <button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah Role
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
            placeholder="Cari nama role..."
            className={SETUP_PAGE_SEARCH_INPUT_CLASS}
          />
        </div>
      </div>

      <div className={`${SECTION_CARD_CLASS} ${SETUP_PAGE_WIDTH_SM_CLASS}`}>
        <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Role Utama</h2>
        </div>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed`}>
            <colgroup>
              <col className="w-16" />
              <col />
              <col className="w-32" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>
                  No
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Nama Role
                </th>
                <th className={`${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-32`}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {coreRoles.map((role, index) => (
                <tr
                  key={role.id}
                  className={SETUP_PAGE_COMPACT_ROW_CLASS}
                >
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </td>
                  <td
                    className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{role.name}</span>
                    </div>
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} !text-left`}>
                    <span className={BADGE_UTAMA_CLASS}>Role utama</span>
                  </td>
                </tr>
              ))}

              {isFetching && (
                <tr>
                  <td
                    colSpan={3}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    Memuat data role...
                  </td>
                </tr>
              )}

              {!isFetching && coreRoles.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    Tidak ada role bawaan yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${SECTION_CARD_CLASS} ${SETUP_PAGE_WIDTH_SM_CLASS}`}>
        <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Role Tambahan</h2>
        </div>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed`}>
            <colgroup>
              <col className="w-16" />
              <col />
              <col className="w-24" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>
                  No
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Nama Role
                </th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {customRoles.map((role, index) => (
                <tr
                  key={role.id}
                  className={SETUP_PAGE_COMPACT_ROW_CLASS}
                >
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </td>
                  <td
                    className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}
                  >
                    {role.name}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} w-24 !text-center`}>
                    <div className="inline-flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(role)}
                        className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50 hover:text-blue-700`}
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50 hover:text-red-700`}
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isFetching && customRoles.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    {query.trim()
                      ? "Tidak ada role tambahan yang cocok dengan pencarian."
                      : "Belum ada role tambahan. Tambah role baru kalau diperlukan."}
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
                  {editingId ? "Edit Role" : "Tambah Role"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Nama tidak boleh sama dengan role utama (Admin, Staf,
                  Supervisor, Manager, IT).
                </p>
              </div>
              <button
                onClick={closeModal}
                className="btn btn-ghost btn-sm"
                title="Tutup"
                type="button"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Role <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nama}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nama: event.target.value }))
                  }
                  placeholder="Contoh: Auditor Internal"
                  className="input"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Nama role harus beda dan jangan sama dengan role utama.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline" type="button">
                Batal
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className={editingId ? "btn btn-primary" : "btn btn-upload"}
                type="button"
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
        title="Hapus Role?"
        entityLabel="role"
        itemName={deleteItem?.name ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </div>
  );
}
