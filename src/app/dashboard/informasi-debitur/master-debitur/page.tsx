"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Save, Search, Trash2, UserCheck, X } from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  getSetupPageEmptyStateCopy,
  SETUP_PAGE_ACTION_HEADER_CELL_CLASS,
  SETUP_PAGE_ADD_BUTTON_CLASS,
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
} from "@/components/ui/setupPageStyles";
import { debiturService, type Debitur, type DebiturPayload } from "@/services/debitur.service";

type FormState = {
  name: string;
  debtor_number: string;
  identity_number: string;
  phone: string;
  address: string;
  financing_number: string;
  status: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  debtor_number: "",
  identity_number: "",
  phone: "",
  address: "",
  financing_number: "",
  status: "ACTIVE",
  description: "",
};

const ACTION_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

export default function MasterDebiturPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<Debitur[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<Debitur | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const result = await debiturService.getAll();
        if (!ignore) setItems(result.items);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat data debitur", "error");
      } finally {
        if (!ignore) setIsFetching(false);
      }
    }
    void loadData();
    return () => { ignore = true; };
  }, [showToast]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(keyword) ||
      (item.identity_number ?? "").toLowerCase().includes(keyword) ||
      (item.debtor_number ?? "").toLowerCase().includes(keyword) ||
      (item.phone ?? "").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (item: Debitur) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      debtor_number: item.debtor_number ?? "",
      identity_number: item.identity_number ?? "",
      phone: item.phone ?? "",
      address: item.address ?? "",
      financing_number: item.financing_number ?? "",
      status: item.status ?? "ACTIVE",
      description: item.description ?? "",
    });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Nama debitur wajib diisi", "warning"); return; }
    const payload: DebiturPayload = {
      name: form.name.trim(),
      debtor_number: form.debtor_number.trim() || undefined,
      identity_number: form.identity_number.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      financing_number: form.financing_number.trim() || undefined,
      status: form.status || undefined,
      description: form.description.trim() || undefined,
    };
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await debiturService.update(editingId, payload);
        setItems((prev) => prev.map((item) => item.id === editingId ? { ...item, ...updated } : item));
        showToast("Debitur diperbarui", "success");
      } else {
        const created = await debiturService.create(payload);
        setItems((prev) => [created, ...prev]);
        showToast("Debitur ditambahkan", "success");
      }
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan debitur", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await debiturService.remove(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Debitur dihapus", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus debitur", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const setField = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Master Debitur"
        subtitle="Kelola data master debitur yang terdaftar dalam sistem."
        icon={<UserCheck />}
        actions={
          <button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah Debitur
          </button>
        }
      />

      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, NIK, atau nomor debitur..." className={SETUP_PAGE_SEARCH_INPUT_CLASS} />
        </div>
      </div>

      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup>
              <col className="w-14" />
              <col className="w-28" />
              <col />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-28" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>No. Debitur</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Nama</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>NIK</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>No. Telepon</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>Aksi</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{item.debtor_number ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}>{item.name}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.identity_number ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.phone ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${item.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {item.status ?? "-"}
                    </span>
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} !text-center`}>
                    <div className="inline-flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50`} title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteItem(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50`} title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {isFetching && <tr><td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data debitur...</td></tr>}
              {!isFetching && filtered.length === 0 && <tr><td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>{getSetupPageEmptyStateCopy("debitur")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div data-dashboard-overlay="true" className="fixed inset-0 p-4" style={{ background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Debitur" : "Tambah Debitur"}</h2>
                <p className="text-sm text-gray-500 mt-1">Isi data debitur dengan lengkap dan benar.</p>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm" title="Tutup"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Debitur <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={setField("name")} placeholder="Nama lengkap debitur" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">No. Debitur</label>
                <input value={form.debtor_number} onChange={setField("debtor_number")} placeholder="Nomor debitur" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NIK</label>
                <input value={form.identity_number} onChange={setField("identity_number")} placeholder="Nomor Induk Kependudukan" className="input" maxLength={16} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon</label>
                <input value={form.phone} onChange={setField("phone")} placeholder="08xxxxxxxxxx" className="input" type="tel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">No. Pembiayaan</label>
                <input value={form.financing_number} onChange={setField("financing_number")} placeholder="Nomor pembiayaan" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={form.status} onChange={setField("status")} className="select">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                <textarea value={form.address} onChange={setField("address")} placeholder="Alamat lengkap debitur" className="input min-h-[80px] resize-none" rows={3} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                <textarea value={form.description} onChange={setField("description")} placeholder="Keterangan tambahan" className="input min-h-[60px] resize-none" rows={2} />
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline">Batal</button>
              <button onClick={() => void handleSave()} disabled={isSaving} className={editingId ? "btn btn-primary" : "btn btn-upload"}>
                <Save className="w-4 h-4" aria-hidden="true" />
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal isOpen={deleteItem !== null} title="Hapus Debitur?" entityLabel="debitur" itemName={deleteItem?.name ?? ""} onClose={() => setDeleteItem(null)} onConfirm={() => void confirmDelete()} isLoading={isDeleting} />
    </div>
  );
}
