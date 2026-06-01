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
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  Save,
  Trash2,
  Warehouse,
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
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_WIDTH_XL_CLASS,
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
  const {
    paginatedItems: paginatedTempatPenyimpanan,
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
      showToast("Kapasitas harus berupa angka lebih dari 0.", "warning");
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
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Setup Tempat Penyimpanan"
        subtitle="Kelola master lokasi penyimpanan dokumen fisik."
        icon={<Warehouse />}
        actions={
          <SetupAddButton label="Tambah Tempat" onClick={openCreate} />
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_XL_CLASS}`}>
        <SetupSearchInput
          label="Cari Data"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari kantor, lemari, rak, kapasitas, atau status..."
        />
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} mx-auto max-w-[1280px]`}>
        <div className="overflow-x-auto">
          <SetupDataTable className={`${SETUP_PAGE_MODERN_TABLE_CLASS} min-w-[1080px]`}>
              <SetupDataTableColGroup>
                <SetupDataTableCol className="w-[56px]" />
                <SetupDataTableCol className="w-[112px]" />
                <SetupDataTableCol />
                <SetupDataTableCol className="w-[132px]" />
                <SetupDataTableCol className="w-[96px]" />
                <SetupDataTableCol className="w-[112px]" />
                <SetupDataTableCol className="w-[120px]" />
                <SetupDataTableCol className="w-[88px]" />
              </SetupDataTableColGroup>
              <SetupDataTableHead className="ltr:text-left rtl:text-right">
                <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                    No
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Kode Kantor
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Nama Kantor
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Kode Lemari
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Rak
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Kapasitas
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                    Status
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                    Aksi
                  </SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody className="divide-y divide-gray-200">
                {paginatedTempatPenyimpanan.map((t, idx) => (
                  <SetupDataTableRow
                    key={t.id}
                    className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                      <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                        {t.kodeKantor}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate font-semibold text-gray-900`}
                      title={t.namaKantor}
                    >
                      {t.namaKantor}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600 tabular-nums`}
                    >
                      {t.kodeLemari}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600 tabular-nums`}
                    >
                      {t.rak}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600 tabular-nums`}
                    >
                      {t.kapasitas}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge status={t.status} />
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupActionMenu
                        label="Buka aksi tempat penyimpanan"
                        menuLabel={`Aksi untuk ${t.kodeLemari} ${t.rak}`}
                        items={[
                          {
                            key: "edit",
                            label: "Edit",
                            icon: Edit2,
                            tone: "blue",
                            onClick: () => openEdit(t.id),
                          },
                          {
                            key: "toggle-status",
                            label:
                              t.status === "Aktif" ? "Nonaktifkan" : "Aktifkan",
                            icon: t.status === "Aktif" ? ToggleRight : ToggleLeft,
                            tone: t.status === "Aktif" ? "red" : "emerald",
                            onClick: () => void toggleStatus(t.id),
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            icon: Trash2,
                            tone: "red",
                            onClick: () => handleDelete(t.id),
                          },
                        ]}
                      />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}

                {isLoading && (
                  <SetupDataTableEmptyRow colSpan={8}>
                    Memuat data tempat penyimpanan...
                  </SetupDataTableEmptyRow>
                )}

                {!isLoading && filtered.length === 0 && (
                  <SetupDataTableEmptyRow colSpan={8}>
                    {getSetupPageEmptyStateCopy("tempat penyimpanan")}
                  </SetupDataTableEmptyRow>
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
        title={
          editingId ? "Edit Tempat Penyimpanan" : "Tambah Tempat Penyimpanan"
        }
        description={
          editingId
            ? "Perbarui lokasi fisik yang dipakai untuk penyimpanan dokumen."
            : "Tambahkan lokasi fisik untuk penyimpanan dokumen."
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
            Kode Kantor <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.kodeKantor}
            onChange={(e) =>
              setForm((p) => ({ ...p, kodeKantor: e.target.value }))
            }
            placeholder="Masukkan kode kantor"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan kode kantor sesuai penamaan internal.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Kantor <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.namaKantor}
            onChange={(e) =>
              setForm((p) => ({ ...p, namaKantor: e.target.value }))
            }
            placeholder="Masukkan nama kantor"
          />
          <p className="mt-2 text-xs text-slate-500">
            Isi nama kantor sesuai lokasi fisiknya.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kode Lemari <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.kodeLemari}
            onChange={(e) =>
              setForm((p) => ({ ...p, kodeLemari: e.target.value }))
            }
            placeholder="Masukkan kode lemari"
          />
          <p className="mt-2 text-xs text-slate-500">
            Gunakan kode lemari sesuai label fisiknya.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rak <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.rak}
            onChange={(e) =>
              setForm((p) => ({ ...p, rak: e.target.value }))
            }
            placeholder="Masukkan nama rak"
          />
          <p className="mt-2 text-xs text-slate-500">
            Kombinasi kantor, lemari, dan rak harus unik.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kapasitas <span className="text-red-500">*</span>
          </label>
          <SetupTextInput
            value={form.kapasitas}
            onChange={(e) =>
              setForm((p) => ({ ...p, kapasitas: e.target.value }))
            }
            placeholder="Masukkan kapasitas"
            inputMode="numeric"
          />
          <p className="mt-2 text-xs text-slate-500">
            Isi jumlah dokumen yang bisa disimpan di rak ini.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <SetupSelect
            value={form.status}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                status: e.target.value === "Aktif" ? "Aktif" : "Nonaktif",
              }))
            }
          >
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </SetupSelect>
          <p className="mt-2 text-xs text-slate-500">
            Lokasi nonaktif tidak muncul saat input dokumen baru.
          </p>
        </div>
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title="Hapus Tempat Penyimpanan?"
        entityLabel="tempat penyimpanan"
        itemName={deleteItem?.label ?? ""}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}
