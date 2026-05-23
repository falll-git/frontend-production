"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableColGroup,
  SetupDataTableCol
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  Save,
  Shield,
  Trash2,
} from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupAddButton from "@/components/ui/SetupAddButton";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupTextInput from "@/components/ui/SetupTextInput";
import { useClientPagination } from "@/hooks/useClientPagination";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_EMPTY_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_WIDTH_SM_CLASS,
} from "@/components/ui/setupPageStyles";
import { roleService } from "@/services/role.service";
import type { RoleRecord } from "@/types/master.types";

type FormState = {
  nama: string;
};

const EMPTY_FORM: FormState = {
  nama: "",
};

function normalizeRoleName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

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
  const {
    paginatedItems: paginatedRoles,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filtered, SETUP_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [query, resetPage]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (role: RoleRecord) => {
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
    setDeleteItem(role);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
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
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Role"
        subtitle="Atur role yang dipakai di sistem."
        icon={<Shield />}
        actions={
          <SetupAddButton label="Tambah Role" onClick={openCreate} />
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_SM_CLASS}`}>
        <SetupSearchInput
          label="Cari Data"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama role..."
        />
      </div>

      <div className={`${SECTION_CARD_CLASS} mx-auto max-w-[720px]`}>
        <div className="overflow-visible">
          <SetupDataTable className={SETUP_PAGE_MODERN_TABLE_CLASS}>
            <SetupDataTableColGroup>
              <SetupDataTableCol className="w-[56px]" />
              <SetupDataTableCol />
              <SetupDataTableCol className="w-[88px]" />
            </SetupDataTableColGroup>
            <SetupDataTableHead className="ltr:text-left rtl:text-right">
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Nama Role
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {paginatedRoles.map((role, index) => (
                <SetupDataTableRow
                  key={role.id}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate font-semibold text-gray-900`}
                    title={role.name}
                  >
                    {role.name}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupActionMenu
                      label="Buka aksi role"
                      menuLabel={`Aksi untuk ${role.name}`}
                      items={[
                        {
                          key: "edit",
                          label: "Edit",
                          icon: Edit2,
                          tone: "blue",
                          onClick: () => openEdit(role),
                        },
                        {
                          key: "delete",
                          label: "Hapus",
                          icon: Trash2,
                          tone: "red",
                          onClick: () => handleDelete(role),
                        },
                      ]}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}

              {isFetching && (
                <SetupDataTableRow>
                  <SetupDataTableCell
                    colSpan={3}
                    className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                  >
                    Memuat data role...
                  </SetupDataTableCell>
                </SetupDataTableRow>
              )}

              {!isFetching && filtered.length === 0 && (
                <SetupDataTableRow>
                  <SetupDataTableCell
                    colSpan={3}
                    className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                  >
                    {query.trim()
                      ? "Tidak ada role yang cocok dengan pencarian."
                      : "Belum ada role. Tambah role baru kalau diperlukan."}
                  </SetupDataTableCell>
                </SetupDataTableRow>
              )}
            </SetupDataTableBody>
          </SetupDataTable>
        </div>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          isLoading={isFetching}
          onPageChange={setPage}
        />
      </div>

      <DashboardModal
        isOpen={isModalOpen}
        title={editingId ? "Edit Role" : "Tambah Role"}
        description={
          editingId
            ? "Perbarui nama role yang dipakai untuk pengaturan akses."
            : "Buat role baru untuk mengatur akses pengguna."
        }
        onClose={closeModal}
        maxWidth="2xl"
        bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        footer={
          <>
            <button
              onClick={closeModal}
              className="uiverse-modal-button uiverse-modal-button--neutral"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="uiverse-modal-button uiverse-modal-button--primary"
              type="button"
            >
              {isSaving ? (
                <>
                  <div
                    className="button-spinner uiverse-modal-button__spinner"
                    style={
                      {
                        ["--spinner-size"]: "18px",
                        ["--spinner-border"]: "2px",
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>Simpan</span>
                </>
              )}
            </button>
          </>
        }
      >
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Role <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.nama}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, nama: event.target.value }))
            }
            placeholder="Masukkan nama role"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan nama role yang belum pernah dipakai.
          </p>
        </div>
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title="Hapus Role?"
        entityLabel="role"
        itemName={deleteItem?.name ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}
