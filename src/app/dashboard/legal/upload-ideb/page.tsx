"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Upload, X } from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  getSetupPageEmptyStateCopy,
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
import { legalService, type LegalIdeb } from "@/services/legal.service";
import { toMultipartFormData } from "@/services/api.utils";

type FormState = {
  month: string;
  year: string;
  debtor_id: string;
  contract_id: string;
  status: string;
  file: File | null;
};

const EMPTY_FORM: FormState = {
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  debtor_id: "",
  contract_id: "",
  status: "PENDING",
  file: null,
};

export default function UploadIdebPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<LegalIdeb[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getIdeb();
        if (!ignore) setItems(data);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat data IDEB", "error");
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
      String(item.month ?? "").includes(keyword) ||
      String(item.year ?? "").includes(keyword) ||
      (item.status ?? "").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const openCreate = () => { setForm(EMPTY_FORM); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.month || !form.year) { showToast("Bulan dan tahun wajib diisi", "warning"); return; }
    if (!form.file) { showToast("File IDEB wajib dipilih", "warning"); return; }

    setIsSaving(true);
    try {
      const formData = toMultipartFormData({
        month: Number(form.month),
        year: Number(form.year),
        debtor_id: form.debtor_id.trim() || undefined,
        contract_id: form.contract_id.trim() || undefined,
        status: form.status || "PENDING",
        file: form.file,
      });
      const created = await legalService.createIdeb(formData);
      setItems((prev) => [created, ...prev]);
      showToast("IDEB berhasil diupload", "success");
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal upload IDEB", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Upload IDEB" subtitle="Kelola upload data IDEB." icon={<Upload />}
        actions={<button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}><Plus className="w-4 h-4" aria-hidden="true" />Upload IDEB</button>}
      />
      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari bulan, tahun, atau status..." className={SETUP_PAGE_SEARCH_INPUT_CLASS} />
        </div>
      </div>
      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup><col className="w-14" /><col className="w-20" /><col className="w-20" /><col className="w-28" /><col /><col className="w-36" /></colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Bulan</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Tahun</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>File</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Tanggal Upload</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{item.month ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{item.year ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">{item.status ?? "-"}</span>
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>
                    {item.file?.url ? <a href={item.file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-[200px]">{item.file.name ?? "Lihat File"}</a> : "-"}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID") : "-"}</td>
                </tr>
              ))}
              {isFetching && <tr><td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data IDEB...</td></tr>}
              {!isFetching && filtered.length === 0 && <tr><td colSpan={6} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>{getSetupPageEmptyStateCopy("IDEB")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div data-dashboard-overlay="true" className="fixed inset-0 p-4" style={{ background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-gray-900">Upload IDEB</h2><p className="text-sm text-gray-500 mt-1">Upload file IDEB.</p></div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm" title="Tutup"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bulan <span className="text-red-500">*</span></label>
                <select value={form.month} onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))} className="select">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahun <span className="text-red-500">*</span></label>
                <input type="number" value={form.year} onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))} min="2000" max="2100" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Debitur</label>
                <input value={form.debtor_id} onChange={(e) => setForm((prev) => ({ ...prev, debtor_id: e.target.value }))} placeholder="UUID debitur (opsional)" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Kontrak</label>
                <input value={form.contract_id} onChange={(e) => setForm((prev) => ({ ...prev, contract_id: e.target.value }))} placeholder="UUID kontrak (opsional)" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="select">
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSED">PROCESSED</option>
                  <option value="DONE">DONE</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">File IDEB <span className="text-red-500">*</span></label>
                <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="btn btn-outline">Batal</button>
              <button onClick={() => void handleSave()} disabled={isSaving} className="btn btn-upload">
                <Upload className="w-4 h-4" aria-hidden="true" />
                {isSaving ? "Mengupload..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
