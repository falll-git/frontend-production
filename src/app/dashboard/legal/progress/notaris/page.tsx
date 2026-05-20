"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit2, FileCheck, Plus, Save, Search, Trash2, X } from "lucide-react";

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
import { legalService, type NotaryProgress } from "@/services/legal.service";
import { toMultipartFormData } from "@/services/api.utils";
import { formatDateDisplay } from "@/lib/utils/date";

type FormState = {
  contract_id: string;
  third_party_id: string;
  deed_type: string;
  deed_number: string;
  received_at: string;
  estimated_completed_at: string;
  completed_at: string;
  status: string;
  notes: string;
  file: File | null;
};

const EMPTY_FORM: FormState = {
  contract_id: "", third_party_id: "", deed_type: "", deed_number: "",
  received_at: "", estimated_completed_at: "", completed_at: "",
  status: "PROSES", notes: "", file: null,
};

const ACTION_ICON_BUTTON_CLASS = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

export default function ProgressNotarisPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<NotaryProgress[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<NotaryProgress | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getNotaryProgress();
        if (!ignore) setItems(data);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat progress notaris", "error");
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
      (item.deed_type ?? "").toLowerCase().includes(keyword) ||
      (item.deed_number ?? "").toLowerCase().includes(keyword) ||
      (item.status ?? "").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (item: NotaryProgress) => {
    setEditingId(item.id);
    setForm({
      contract_id: item.contract_id ?? "", third_party_id: item.third_party_id ?? "",
      deed_type: item.deed_type ?? "", deed_number: item.deed_number ?? "",
      received_at: item.received_at ? item.received_at.split("T")[0] : "",
      estimated_completed_at: item.estimated_completed_at ? item.estimated_completed_at.split("T")[0] : "",
      completed_at: item.completed_at ? item.completed_at.split("T")[0] : "",
      status: item.status ?? "PROSES", notes: item.notes ?? "", file: null,
    });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.contract_id.trim()) { showToast("ID Kontrak wajib diisi", "warning"); return; }
    if (!form.third_party_id.trim()) { showToast("ID Pihak Ketiga wajib diisi", "warning"); return; }
    if (!form.deed_type.trim()) { showToast("Jenis akta wajib diisi", "warning"); return; }
    if (!form.received_at) { showToast("Tanggal diterima wajib diisi", "warning"); return; }

    setIsSaving(true);
    try {
      const formData = toMultipartFormData({
        contract_id: form.contract_id.trim(),
        third_party_id: form.third_party_id.trim(),
        deed_type: form.deed_type.trim(),
        deed_number: form.deed_number.trim() || undefined,
        received_at: form.received_at,
        estimated_completed_at: form.estimated_completed_at || undefined,
        completed_at: form.completed_at || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
        ...(form.file ? { file: form.file } : {}),
      });

      if (editingId) {
        const updated = await legalService.updateNotaryProgress(editingId, formData);
        setItems((prev) => prev.map((item) => item.id === editingId ? updated : item));
        showToast("Progress notaris diperbarui", "success");
      } else {
        const created = await legalService.createNotaryProgress(formData);
        setItems((prev) => [created, ...prev]);
        showToast("Progress notaris ditambahkan", "success");
      }
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan progress notaris", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await legalService.removeNotaryProgress(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Progress notaris dihapus", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Progress Notaris" subtitle="Pantau dan kelola progress proses notaris." icon={<FileCheck />}
        actions={<button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}><Plus className="w-4 h-4" />Tambah Progress</button>}
      />
      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari jenis akta, nomor akta, atau status..." className={SETUP_PAGE_SEARCH_INPUT_CLASS} />
        </div>
      </div>
      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup><col className="w-14" /><col /><col className="w-36" /><col className="w-28" /><col className="w-36" /><col className="w-28" /></colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Jenis Akta</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>No. Akta</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Tgl Diterima</th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>Aksi</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}>{item.deed_type ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.deed_number ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${item.status === "SELESAI" ? "bg-green-50 text-green-700 border-green-200" : item.status === "BERMASALAH" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{item.status ?? "-"}</span>
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{formatDateDisplay(item.received_at)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} !text-center`}>
                    <div className="inline-flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50`} title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteItem(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50`} title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {isFetching && <tr><td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data...</td></tr>}
              {!isFetching && filtered.length === 0 && <tr><td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>{getSetupPageEmptyStateCopy("progress notaris")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div data-dashboard-overlay="true" className="fixed inset-0 p-4" style={{ background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Progress Notaris" : "Tambah Progress Notaris"}</h2></div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Kontrak <span className="text-red-500">*</span></label>
                <input value={form.contract_id} onChange={setField("contract_id")} placeholder="UUID kontrak" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Pihak Ketiga (Notaris) <span className="text-red-500">*</span></label>
                <input value={form.third_party_id} onChange={setField("third_party_id")} placeholder="UUID pihak ketiga" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Akta <span className="text-red-500">*</span></label>
                <input value={form.deed_type} onChange={setField("deed_type")} placeholder="Jenis akta" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">No. Akta</label>
                <input value={form.deed_number} onChange={setField("deed_number")} placeholder="Nomor akta" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tgl Diterima <span className="text-red-500">*</span></label>
                <input type="date" value={form.received_at} onChange={setField("received_at")} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={form.status} onChange={setField("status")} className="select">
                  <option value="PROSES">PROSES</option>
                  <option value="SELESAI">SELESAI</option>
                  <option value="BERMASALAH">BERMASALAH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Est. Selesai</label>
                <input type="date" value={form.estimated_completed_at} onChange={setField("estimated_completed_at")} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tgl Selesai</label>
                <input type="date" value={form.completed_at} onChange={setField("completed_at")} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                <textarea value={form.notes} onChange={setField("notes")} placeholder="Catatan tambahan" className="input min-h-[60px] resize-none" rows={2} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dokumen Pendukung</label>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
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
      <DeleteConfirmModal isOpen={deleteItem !== null} title="Hapus Progress Notaris?" entityLabel="progress notaris" itemName={deleteItem?.deed_type ?? deleteItem?.id ?? ""} onClose={() => setDeleteItem(null)} onConfirm={() => void confirmDelete()} isLoading={isDeleting} />
    </div>
  );
}
