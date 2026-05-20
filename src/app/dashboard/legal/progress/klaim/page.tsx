"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit2, Plus, Save, Search, Trash2, X } from "lucide-react";

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
import { legalService, type LegalClaim } from "@/services/legal.service";
import { toMultipartFormData } from "@/services/api.utils";
import { formatDateDisplay } from "@/lib/utils/date";

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

type FormState = {
  contract_id: string; claim_type: string; submitted_at: string;
  claim_amount: string; status: string; policy_number: string;
  approved_amount: string; disbursed_amount: string; disbursed_at: string;
  rejection_reason: string; notes: string; file: File | null;
};

const EMPTY_FORM: FormState = {
  contract_id: "", claim_type: "", submitted_at: "", claim_amount: "",
  status: "PENGAJUAN", policy_number: "", approved_amount: "", disbursed_amount: "",
  disbursed_at: "", rejection_reason: "", notes: "", file: null,
};

const ACTION_ICON_BUTTON_CLASS = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors";

export default function KlaimAsuransiPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<LegalClaim[]>([]);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [deleteItem, setDeleteItem] = useState<LegalClaim | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getClaims();
        if (!ignore) setItems(data);
      } catch (error) {
        if (!ignore) showToast(error instanceof Error ? error.message : "Gagal memuat data klaim", "error");
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
      (item.claim_type ?? "").toLowerCase().includes(keyword) ||
      (item.policy_number ?? "").toLowerCase().includes(keyword) ||
      (item.status ?? "").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (item: LegalClaim) => {
    setEditingId(item.id);
    setForm({
      contract_id: item.contract_id ?? "", claim_type: item.claim_type ?? "",
      submitted_at: item.submitted_at ? item.submitted_at.split("T")[0] : "",
      claim_amount: item.claim_amount !== undefined ? String(item.claim_amount) : "",
      status: item.status ?? "PENGAJUAN", policy_number: item.policy_number ?? "",
      approved_amount: item.approved_amount !== undefined ? String(item.approved_amount) : "",
      disbursed_amount: item.disbursed_amount !== undefined ? String(item.disbursed_amount) : "",
      disbursed_at: item.disbursed_at ? item.disbursed_at.split("T")[0] : "",
      rejection_reason: item.rejection_reason ?? "", notes: item.notes ?? "", file: null,
    });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.contract_id.trim()) { showToast("ID Kontrak wajib diisi", "warning"); return; }
    if (!form.claim_type.trim()) { showToast("Jenis klaim wajib diisi", "warning"); return; }
    if (!form.submitted_at) { showToast("Tanggal pengajuan wajib diisi", "warning"); return; }

    setIsSaving(true);
    try {
      const formData = toMultipartFormData({
        contract_id: form.contract_id.trim(),
        claim_type: form.claim_type.trim(),
        submitted_at: form.submitted_at,
        claim_amount: form.claim_amount ? Number(form.claim_amount) : undefined,
        status: form.status,
        policy_number: form.policy_number.trim() || undefined,
        approved_amount: form.approved_amount ? Number(form.approved_amount) : undefined,
        disbursed_amount: form.disbursed_amount ? Number(form.disbursed_amount) : undefined,
        disbursed_at: form.disbursed_at || undefined,
        rejection_reason: form.rejection_reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ...(form.file ? { file: form.file } : {}),
      });

      if (editingId) {
        const updated = await legalService.updateClaim(editingId, formData);
        setItems((prev) => prev.map((item) => item.id === editingId ? updated : item));
        showToast("Klaim diperbarui", "success");
      } else {
        const created = await legalService.createClaim(formData);
        setItems((prev) => [created, ...prev]);
        showToast("Klaim ditambahkan", "success");
      }
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan klaim", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await legalService.removeClaim(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast("Klaim dihapus", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus klaim", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Klaim Asuransi" subtitle="Kelola data klaim asuransi." icon={<AlertCircle />}
        actions={<button onClick={openCreate} className={SETUP_PAGE_ADD_BUTTON_CLASS}><Plus className="w-4 h-4" />Tambah Klaim</button>}
      />
      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari jenis klaim, no. polis, atau status..." className={SETUP_PAGE_SEARCH_INPUT_CLASS} />
        </div>
      </div>
      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup><col className="w-14" /><col /><col className="w-36" /><col className="w-36" /><col className="w-28" /><col className="w-36" /><col className="w-28" /></colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Jenis Klaim</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Nilai Klaim</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>No. Polis</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Tgl Pengajuan</th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>Aksi</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filtered.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}>{item.claim_type ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.claim_amount)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.policy_number ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${item.status === "CAIR" ? "bg-green-50 text-green-700 border-green-200" : item.status === "DITOLAK" ? "bg-red-50 text-red-700 border-red-200" : item.status === "DISETUJUI" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{item.status ?? "-"}</span>
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{formatDateDisplay(item.submitted_at)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} !text-center`}>
                    <div className="inline-flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50`} title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteItem(item)} className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50`} title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {isFetching && <tr><td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data...</td></tr>}
              {!isFetching && filtered.length === 0 && <tr><td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>{getSetupPageEmptyStateCopy("klaim asuransi")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div data-dashboard-overlay="true" className="fixed inset-0 p-4" style={{ background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Klaim" : "Tambah Klaim"}</h2></div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Kontrak <span className="text-red-500">*</span></label>
                <input value={form.contract_id} onChange={setField("contract_id")} placeholder="UUID kontrak" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Klaim <span className="text-red-500">*</span></label>
                <input value={form.claim_type} onChange={setField("claim_type")} placeholder="Jenis klaim" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">No. Polis</label>
                <input value={form.policy_number} onChange={setField("policy_number")} placeholder="Nomor polis" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tgl Pengajuan <span className="text-red-500">*</span></label>
                <input type="date" value={form.submitted_at} onChange={setField("submitted_at")} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={form.status} onChange={setField("status")} className="select">
                  <option value="PENGAJUAN">PENGAJUAN</option>
                  <option value="VERIFIKASI">VERIFIKASI</option>
                  <option value="DISETUJUI">DISETUJUI</option>
                  <option value="DITOLAK">DITOLAK</option>
                  <option value="CAIR">CAIR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Klaim (Rp)</label>
                <input type="number" value={form.claim_amount} onChange={setField("claim_amount")} placeholder="0" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Disetujui (Rp)</label>
                <input type="number" value={form.approved_amount} onChange={setField("approved_amount")} placeholder="0" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Dicairkan (Rp)</label>
                <input type="number" value={form.disbursed_amount} onChange={setField("disbursed_amount")} placeholder="0" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tgl Pencairan</label>
                <input type="date" value={form.disbursed_at} onChange={setField("disbursed_at")} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Alasan Penolakan</label>
                <input value={form.rejection_reason} onChange={setField("rejection_reason")} placeholder="Alasan penolakan (jika ditolak)" className="input" />
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
      <DeleteConfirmModal isOpen={deleteItem !== null} title="Hapus Klaim?" entityLabel="klaim" itemName={deleteItem?.claim_type ?? deleteItem?.id ?? ""} onClose={() => setDeleteItem(null)} onConfirm={() => void confirmDelete()} isLoading={isDeleting} />
    </div>
  );
}
