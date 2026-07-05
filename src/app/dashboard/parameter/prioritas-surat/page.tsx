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
  SetupDataTableCol,
  SetupDataTableEmptyRow,
  SetupTableCard,
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  Mail,
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
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_WIDTH_XL_CLASS,
  SETUP_PARAMETER_PAGE_WIDTH_SM_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import { letterPriorityService } from "@/services/letter-priority.service";
import type { LetterPriority } from "@/types/master.types";

type FormState = {
  nama: string;
};

const EMPTY_FORM: FormState = {
  nama: "",
};

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
  const {
    paginatedItems: paginatedPriorities,
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
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Prioritas Surat"
        subtitle="Kelola master sifat atau prioritas surat."
        icon={<Mail />}
        className={SETUP_PAGE_WIDTH_XL_CLASS}
        actions={
          <SetupAddButton label="Tambah Prioritas" onClick={openCreate} />
        }
      />

      <div className={SETUP_PARAMETER_PAGE_WIDTH_SM_CLASS}>
        <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
          <SetupSearchInput
            label="Cari Data"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari prioritas surat..."
          />
        </div>
      </div>

      <div className={SETUP_PARAMETER_PAGE_WIDTH_SM_CLASS}>
        <SetupTableCard variant="crud">
          <SetupDataTable variant="crud" density="compact" className={SETUP_PAGE_MODERN_TABLE_CLASS}>
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
                  Nama Prioritas Surat
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {paginatedPriorities.map((priority, index) => (
                <SetupDataTableRow
                  key={priority.id}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate font-semibold text-gray-900`}
                    title={priority.name}
                  >
                    {priority.name}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupActionMenu
                      label="Buka aksi prioritas surat"
                      menuLabel={`Aksi untuk ${priority.name}`}
                      items={[
                        {
                          key: "edit",
                          label: "Edit",
                          icon: Edit2,
                          tone: "blue",
                          onClick: () => openEdit(priority),
                        },
                        {
                          key: "delete",
                          label: "Hapus",
                          icon: Trash2,
                          tone: "red",
                          onClick: () => handleDelete(priority),
                        },
                      ]}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}

              {isFetching && (
                <SetupDataTableEmptyRow colSpan={3} state="loading">
                  Memuat data prioritas surat...
                </SetupDataTableEmptyRow>
              )}

              {!isFetching && filtered.length === 0 && (
                <SetupDataTableEmptyRow
                  colSpan={3}
                  tone="parameter"
                  isFiltered={Boolean(query.trim())}
                  description={
                    query.trim()
                      ? "Coba ubah kata kunci pencarian."
                      : "Tambahkan prioritas agar klasifikasi surat tersedia."
                  }
                >
                  {getSetupPageEmptyStateCopy("prioritas surat")}
                </SetupDataTableEmptyRow>
              )}
            </SetupDataTableBody>
          </SetupDataTable>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          isLoading={isFetching}
          onPageChange={setPage}
        />
        </SetupTableCard>
      </div>

      <DashboardModal
        isOpen={isModalOpen}
        title={editingId ? "Edit Prioritas Surat" : "Tambah Prioritas Surat"}
        description={
          editingId
            ? "Perbarui prioritas yang dipakai di form persuratan."
            : "Tambahkan prioritas yang akan dipakai di form persuratan."
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
            Nama Prioritas Surat <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.nama}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, nama: event.target.value }))
            }
            placeholder="Masukkan nama prioritas surat"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan nama prioritas yang belum pernah dipakai.
          </p>
        </div>
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title="Hapus Prioritas Surat?"
        entityLabel="prioritas surat"
        itemName={deleteItem?.name ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}
