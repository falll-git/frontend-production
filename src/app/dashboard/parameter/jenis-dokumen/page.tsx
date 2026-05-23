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
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupAddButton from "@/components/ui/SetupAddButton";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextInput from "@/components/ui/SetupTextInput";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
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
  SETUP_PAGE_WIDTH_LG_CLASS,
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
  const {
    paginatedItems: paginatedJenisDokumen,
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
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Jenis Dokumen"
        subtitle="Kelola master jenis dokumen."
        icon={<Shield />}
        actions={
          <SetupAddButton label="Tambah Jenis" onClick={openCreate} />
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_LG_CLASS}`}>
        <SetupSearchInput
          label="Cari Data"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari kode, nama jenis dokumen, atau keterangan..."
        />
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} mx-auto max-w-[1120px]`}>
        <div className="overflow-x-auto">
          <SetupDataTable className={`${SETUP_PAGE_MODERN_TABLE_CLASS} min-w-[820px]`}>
              <SetupDataTableColGroup>
                <SetupDataTableCol className="w-[56px]" />
                <SetupDataTableCol className="w-[112px]" />
                <SetupDataTableCol className="w-[260px]" />
                <SetupDataTableCol />
                <SetupDataTableCol className="w-[88px]" />
              </SetupDataTableColGroup>
              <SetupDataTableHead className="ltr:text-left rtl:text-right">
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                    No
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Kode
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Nama Jenis Dokumen
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Keterangan
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                    Aksi
                  </SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody className="divide-y divide-gray-200">
                {paginatedJenisDokumen.map((j, idx) => (
                  <SetupDataTableRow
                    key={j.id}
                    className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                      <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                        {j.kode}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="truncate text-sm font-semibold text-gray-900"
                          title={j.nama}
                        >
                          {j.nama}
                        </span>
                        <SetupStatusBadge status={j.status} />
                      </div>
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate text-gray-700`}
                      title={j.keterangan || "-"}
                    >
                      {j.keterangan || "-"}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupActionMenu
                        label="Buka aksi jenis dokumen"
                        menuLabel={`Aksi untuk ${j.nama}`}
                        items={[
                          {
                            key: "edit",
                            label: "Edit",
                            icon: Edit2,
                            tone: "blue",
                            onClick: () => openEdit(j.id),
                          },
                          {
                            key: "toggle-status",
                            label:
                              j.status === "Aktif" ? "Nonaktifkan" : "Aktifkan",
                            icon: j.status === "Aktif" ? ToggleRight : ToggleLeft,
                            tone: j.status === "Aktif" ? "red" : "emerald",
                            onClick: () => void toggleStatus(j.id),
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            icon: Trash2,
                            tone: "red",
                            onClick: () => handleDelete(j.id),
                          },
                        ]}
                      />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}

                {isLoading && (
                  <SetupDataTableRow>
                    <SetupDataTableCell
                      colSpan={5}
                      className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                    >
                      Memuat data jenis dokumen...
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                )}

                {!isLoading && filtered.length === 0 && (
                  <SetupDataTableRow>
                    <SetupDataTableCell
                      colSpan={5}
                      className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                    >
                      {getSetupPageEmptyStateCopy("jenis dokumen")}
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
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>

      <DashboardModal
        isOpen={isModalOpen}
        title={editingId ? "Edit Jenis Dokumen" : "Tambah Jenis Dokumen"}
        description={
          editingId
            ? "Perbarui jenis dokumen yang dipakai pada arsip digital."
            : "Tambahkan jenis dokumen yang akan dipakai pada arsip digital."
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kode <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.kode}
            onChange={(e) =>
              setForm((p) => ({ ...p, kode: e.target.value }))
            }
            placeholder="Masukkan kode jenis dokumen"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan kode jenis dokumen yang unik.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Jenis Dokumen <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.nama}
            onChange={(e) =>
              setForm((p) => ({ ...p, nama: e.target.value }))
            }
            placeholder="Masukkan nama jenis dokumen"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan nama jenis dokumen yang belum pernah dipakai.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keterangan <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.keterangan}
            onChange={(e) =>
              setForm((p) => ({ ...p, keterangan: e.target.value }))
            }
            placeholder="Masukkan deskripsi jenis dokumen"
          />
          <p className="mt-2 text-xs text-slate-500">
            Jelaskan fungsi atau kelompok dokumen secara singkat.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <SetupSelect
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                status: e.target.value === "Aktif" ? "Aktif" : "Nonaktif",
              }))
            }
          >
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </SetupSelect>
          <p className="mt-2 text-xs text-slate-500">
            Jenis nonaktif tidak muncul saat input dokumen baru.
          </p>
        </div>
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title="Hapus Jenis Dokumen?"
        entityLabel="jenis dokumen"
        itemName={deleteItem?.nama ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}
