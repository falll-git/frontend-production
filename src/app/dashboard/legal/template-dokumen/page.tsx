"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit2, FileText, Plus, Save, Search, Trash2, X } from "lucide-react";

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
import { legalService, type LegalTemplate } from "@/services/legal.service";
import { toMultipartFormData } from "@/services/api.utils";

const TEMPLATE_TYPES = ["AKAD", "HAFTSHEET", "SURAT_PERINGATAN", "FORMULIR_ASURANSI", "SKL", "SAMSAT"];

type FormState = {
  template_type: string;
  title: string;
  content_template: string;
  version: string;
  is_active: boolean;
  file: File | null;
};

const EMPTY_FORM: FormState = {
  template_type: "",
  title: "",
  content_template: "",
  version: "1",
  is_active: true,
  file: null,
};

const ACTION_ICON_BUTTON_CLASS = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

export default function TemplateDokumenPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<LegalTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<LegalTemplate | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getTemplates();
        if (!ignore) setItems(data);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat template", "error");
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
      (item.title ?? "").toLowerCase().includes(keyword) ||
      (item.template_type ?? "").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (item: LegalTemplate) => {
    setEditingId(item.id);
    setForm({ template_type: item.template_type ?? "", title: item.title ?? "", content_template: item.content_template ?? "", version: String(item.version ?? 1), is_active: item.is_active !== false, file: null });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.template_type) { showToast("Jenis template wajib dipilih", "warning"); return; }
    if (!form.title.trim()) { showToast("Judul template wajib diisi", "warning"); return; }
    if (!editingId && !form.file) { showToast("File template wajib dipilih", "warning"); return; }

    setIsSaving(true);
    try {
      const formData = toMultipartFormData({
        template_type: form.template_type,
        title: form.title.trim(),
        content_template: form.content_template.trim() || undefined,
        version: Number(form.version) || 1,
        is_active: form.is_active,
        ...(form.file ? { file: form.file } : {}),
      });

      if (editingId) {
        const updated = await legalService.updateTemplate(editingId, formData);
        setItems((prev) => prev.map((item) => item.id === editingId ? updated : item));
        showToast("Template diperbarui", "success");
      } else {
        const created = await legalService.createTemplate(formData);
        setItems((prev) => [created, ...prev]);
        showToast("Template ditambahkan", "success");
      }
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan template", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await legalService.removeTemplate(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Template dihapus", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus template", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Template Dokumen" subtitle="Kelola template dokumen legal." icon={<FileText />}
        actions={<button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}><Plus className="w-4 h-4" aria-hidden="true" />Tambah Template</button>}
      />
      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul atau jenis template..." className={SETUP_PAGE_SEARCH_INPUT_CLASS} />
        </div>
      </div>
      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup><col className="w-14" /><col className="w-40" /><col /><col className="w-16" /><col className="w-20" /><col className="w-28" /></colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Jenis</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Judul</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Versi</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>Aksi</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.template_type ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}>{item.title ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{item.version ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${item.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
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
              {isFetching && <tr><td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data template...</td></tr>}
              {!isFetching && filtered.length === 0 && <tr><td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>{getSetupPageEmptyStateCopy("template dokumen")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div data-dashboard-overlay="true" className="fixed inset-0 p-4" style={{ background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Template" : "Tambah Template"}</h2>
                <p className="text-sm text-gray-500 mt-1">Isi informasi template dokumen legal.</p>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm" title="Tutup"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Template <span className="text-red-500">*</span></label>
                <select value={form.template_type} onChange={(e) => setForm((prev) => ({ ...prev, template_type: e.target.value }))} className="select">
                  <option value="">Pilih jenis template</option>
                  {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Judul <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Judul template" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Versi</label>
                  <input type="number" value={form.version} onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))} min="1" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select value={form.is_active ? "true" : "false"} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "true" }))} className="select">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konten Template</label>
                <textarea value={form.content_template} onChange={(e) => setForm((prev) => ({ ...prev, content_template: e.target.value }))} placeholder="Konten template (opsional)" className="input min-h-[80px] resize-none" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Template {!editingId && <span className="text-red-500">*</span>}</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {editingId && <p className="mt-1 text-xs text-gray-500">Kosongkan jika tidak ingin mengganti file.</p>}
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
      <DeleteConfirmModal isOpen={deleteItem !== null} title="Hapus Template?" entityLabel="template" itemName={deleteItem?.title ?? ""} onClose={() => setDeleteItem(null)} onConfirm={() => void confirmDelete()} isLoading={isDeleting} />
    </div>
  );
}
