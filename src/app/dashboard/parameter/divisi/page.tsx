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
  Building2,
  Edit2,
  Save,
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
  getSetupPageEmptyStateCopy,
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
import { divisionService } from "@/services/division.service";
import type { Division } from "@/types/master.types";

type FormState = {
  nama: string;
};

const EMPTY_FORM: FormState = {
  nama: "",
};

export default function SetupDivisiPage() {
  const { showToast } = useAppToast();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<Division | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDivisions() {
      try {
        setIsFetching(true);
        const items = await divisionService.getAll();
        if (!ignore) {
          setDivisions(
            [...items].sort((left, right) => left.name.localeCompare(right.name)),
          );
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error ? error.message : "Gagal memuat data divisi",
            "error",
          );
        }
      } finally {
        if (!ignore) {
          setIsFetching(false);
        }
      }
    }

    void loadDivisions();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return divisions;

    return divisions.filter((item) =>
      item.name.toLowerCase().includes(keyword),
    );
  }, [divisions, query]);
  const {
    paginatedItems: paginatedDivisions,
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

  const openEdit = (division: Division) => {
    setEditingId(division.id);
    setForm({ nama: division.name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (division: Division) => {
    setDeleteItem(division);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      await divisionService.remove(deleteItem.id);
      setDivisions((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Divisi dihapus", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus divisi",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const nama = form.nama.trim();

    if (!nama) {
      showToast("Nama divisi wajib diisi", "warning");
      return;
    }

    const duplicateDivision = divisions.some(
      (item) =>
        item.id !== editingId &&
        item.name.trim().toLowerCase() === nama.toLowerCase(),
    );

    if (duplicateDivision) {
      showToast("Nama divisi sudah digunakan.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await divisionService.update(editingId, { name: nama });
        setDivisions((prev) =>
          prev
            .map((item) =>
              item.id === editingId ? { ...item, ...updated, id: editingId } : item,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        showToast("Divisi diperbarui", "success");
      } else {
        const created = await divisionService.create({ name: nama });
        setDivisions((prev) =>
          [...prev, created].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );

        showToast("Divisi ditambahkan", "success");
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan divisi",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Divisi"
        subtitle="Kelola master divisi yang dipakai lintas modul."
        icon={<Building2 />}
        actions={
          <SetupAddButton label="Tambah Divisi" onClick={openCreate} />
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_SM_CLASS}`}>
        <SetupSearchInput
          label="Cari Data"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama divisi..."
        />
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} mx-auto max-w-[720px]`}>
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
                  Nama Divisi
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {paginatedDivisions.map((division, index) => (
                <SetupDataTableRow
                  key={division.id}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate font-semibold text-gray-900`}
                    title={division.name}
                  >
                    {division.name}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupActionMenu
                      label="Buka aksi divisi"
                      menuLabel={`Aksi untuk ${division.name}`}
                      items={[
                        {
                          key: "edit",
                          label: "Edit",
                          icon: Edit2,
                          tone: "blue",
                          onClick: () => openEdit(division),
                        },
                        {
                          key: "delete",
                          label: "Hapus",
                          icon: Trash2,
                          tone: "red",
                          onClick: () => handleDelete(division),
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
                    Memuat data divisi...
                  </SetupDataTableCell>
                </SetupDataTableRow>
              )}

              {!isFetching && filtered.length === 0 && (
                <SetupDataTableRow>
                  <SetupDataTableCell
                    colSpan={3}
                    className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                  >
                    {getSetupPageEmptyStateCopy("divisi")}
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
        title={editingId ? "Edit Divisi" : "Tambah Divisi"}
        description={
          editingId
            ? "Perbarui nama divisi yang dipakai di data pengguna dan workflow."
            : "Tambahkan divisi yang akan dipakai di data pengguna dan workflow."
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
              onClick={handleSave}
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
            Nama Divisi <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.nama}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, nama: event.target.value }))
            }
            placeholder="Masukkan nama divisi"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan nama divisi yang belum pernah dipakai.
          </p>
        </div>
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title="Hapus Divisi?"
        entityLabel="divisi"
        itemName={deleteItem?.name ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}
