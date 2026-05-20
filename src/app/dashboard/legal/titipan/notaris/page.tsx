"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Save, Search, Trash2, Wallet, X } from "lucide-react";

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
import { legalService, type LegalDeposit } from "@/services/legal.service";

const DEPOSIT_TYPE = "NOTARIS";

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

type FormState = { contract_id: string; nominal: string; status: string; notes: string; };
const EMPTY_FORM: FormState = { contract_id: "", nominal: "", status: "PENDING", notes: "" };
const ACTION_ICON_BUTTON_CLASS = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

export default function TitipanNotarisPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<LegalDeposit[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<LegalDeposit | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getDeposits();
        if (!ignore) setItems(data.filter((item) => item.type === DEPOSIT_TYPE));
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat data titipan notaris", "error");
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
    return items.filter((item) => (item.status ?? "").toLowerCase().includes(keyword) || (item.contract_id ?? "").toLowerCase().includes(keyword));
  }, [items, query]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (item: LegalDeposit) => {
    setEditingId(item.id);
    setForm({ contract_id: item.contract_id ?? "", nominal: item.nominal !== undefined ? String(item.nominal) : "", status: item.status ?? "PENDING", notes: item.notes ?? "" });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.contract_id.trim()) { showToast("ID Kontrak wajib diisi", "warning"); return; }
    if (!form.nominal) { showToast("Nominal wajib diisi", "warning"); return; }
    setIsSaving(true);
    try {
      const payload = { contract_id: form.contract_id.trim(), type: DEPOSIT_TYPE, nominal: Number(form.nominal), status: form.status, notes: form.notes.trim() || undefined };
      if (editingId) {
        const updated = await legalService.updateDeposit(editingId, payload);
        setItems((prev) => prev.map((item) => item.id === editingId ? updated : item));
        showToast("Dana titipan notaris diperbarui", "success");
      } else {
        const created = await legalService.createDeposit(payload);
        setItems((prev) => [created, ...prev]);
        showToast("Dana titipan notaris ditambahkan", "success");
      }
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan dana titipan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await legalService.removeDeposit(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Dana titipan notaris dihapus", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Dana Titipan Notaris" subtitle="Kelola dana titipan untuk keperluan proses notaris." icon={<Wallet />}
        actions={<button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}><Plus className="w-4 h-4" />Tambah Titipan</button>}
      />
      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari ID kontrak atau status..." className={SETUP_PAGE_SEARCH_INPUT_CLASS} />
        </div>
      </div>
      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup><col className="w-14" /><col /><col className="w-40" /><col className="w-40" /><col className="w-40" /><col className="w-28" /><col className="w-28" /></colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>ID Kontrak</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Nominal</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Terbayar</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Sisa</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>Aksi</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 truncate max-w-[160px]`}>{item.contract_id ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.nominal)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.paid_amount)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.remaining_amount)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">{item.status ?? "-"}</span>
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} !text-center`}>
                    <div className="inline-flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50`} title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteItem(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50`} title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {isFetching && <tr><td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data...</td></tr>}
              {!isFetching && filtered.length === 0 && <tr><td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>{getSetupPageEmptyStateCopy("dana titipan notaris")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div data-dashboard-overlay="true" className="fixed inset-0 p-4" style={{ background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Dana Titipan Notaris" : "Tambah Dana Titipan Notaris"}</h2></div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Kontrak <span className="text-red-500">*</span></label>
                <input value={form.contract_id} onChange={(e) => setForm((prev) => ({ ...prev, contract_id: e.target.value }))} placeholder="UUID kontrak" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nominal (Rp) <span className="text-red-500">*</span></label>
                <input type="number" value={form.nominal} onChange={(e) => setForm((prev) => ({ ...prev, nominal: e.target.value }))} placeholder="0" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <input value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} placeholder="Status titipan" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Catatan tambahan" className="input min-h-[60px] resize-none" rows={2} />
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline">Batal</button>
              <button onClick={() => void handleSave()} disabled={isSaving} className={editingId ? "btn btn-primary" : "btn btn-upload"}>
                <Save className="w-4 h-4" />{isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmModal isOpen={deleteItem !== null} title="Hapus Dana Titipan Notaris?" entityLabel="dana titipan" itemName={deleteItem?.contract_id ?? deleteItem?.id ?? ""} onClose={() => setDeleteItem(null)} onConfirm={() => void confirmDelete()} isLoading={isDeleting} />
    </div>
  );
}
