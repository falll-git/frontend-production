"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { SjChangeRequestAction } from "@/types/seputar-jaminan.types";
import useSeputarJaminanModalScrollLock from "./useSeputarJaminanModalScrollLock";
import useDiscardChanges from "./useDiscardChanges";
import { readableError, SjPrimaryButton, SjSecondaryButton } from "./SeputarJaminanUI";

export const CHANGE_REQUEST_LABEL: Record<SjChangeRequestAction, string> = {
  UNPUBLISH_PUBLICATION: "Tarik publikasi dari website",
  ARCHIVE_PUBLICATION: "Arsipkan publikasi",
  HIDE_PROFILE: "Sembunyikan profil dari SJ",
  REVOKE_CONTACT: "Cabut kontak WhatsApp",
  REVOKE_MEDIA: "Cabut media",
  RECONFIRM_PUBLICATION: "Konfirmasi ulang publikasi",
};

export type SjChangeRequestTarget =
  | { kind: "publication"; id: string; label: string; version: number }
  | { kind: "profile"; id: string; label: string; version: number }
  | { kind: "contact"; id: string; label: string; version: number }
  | { kind: "media"; id: string; label: string };

type Props = {
  open: boolean;
  target: SjChangeRequestTarget | null;
  actions: SjChangeRequestAction[];
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
};

export default function SeputarJaminanChangeRequestModal({ open, target, actions, onClose, onSubmitted }: Props) {
  const [action, setAction] = useState<SjChangeRequestAction>(actions[0] ?? "UNPUBLISH_PUBLICATION");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useAppToast();
  const isContact = target?.kind === "contact";
  useSeputarJaminanModalScrollLock(open);
  const guard = useDiscardChanges(open, {reason, action}, onClose, submitting, {reason: "", action: actions[0] ?? "UNPUBLISH_PUBLICATION"});

  const initialAction = actions[0] ?? "UNPUBLISH_PUBLICATION";
  useEffect(() => {
    if (!open) return;
    setAction(initialAction);
    setReason("");
    setError(null);
  }, [initialAction, open]);

  async function submit() {
    if (!target) return;
    const note = reason.trim();
    if (note.length < 10) {
      setError(isContact ? "Tulis alasan pencabutan sedikitnya 10 karakter." : "Jelaskan alasan dan dampak yang diharapkan sedikitnya 10 karakter.");
      document.getElementById("sj-change-request-reason")?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (target.kind === "publication") {
        if (!["UNPUBLISH_PUBLICATION", "ARCHIVE_PUBLICATION", "RECONFIRM_PUBLICATION"].includes(action)) throw new Error("Tindakan publikasi tidak valid.");
        await seputarJaminanService.createPublicationChangeRequest(
          target.id,
          action as Extract<SjChangeRequestAction, "UNPUBLISH_PUBLICATION" | "ARCHIVE_PUBLICATION" | "RECONFIRM_PUBLICATION">,
          target.version,
          note,
        );
      } else if (target.kind === "profile") {
        await seputarJaminanService.createProfileRemovalRequest(target.version, note);
      } else if (target.kind === "contact") {
        await seputarJaminanService.createContactRemovalRequest(target.id, target.version, note);
      } else {
        await seputarJaminanService.createMediaRemovalRequest(target.id, note);
      }
      showToast("Permintaan berhasil dikirim ke Ruwang Control.", "success");
      onClose();
      await onSubmitted();
    } catch (submitError) {
      const message = readableError(submitError);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return <><DashboardModal
    isOpen={open}
    onClose={guard.requestClose}
    closeDisabled={submitting}
    maxWidth="md"
    title={isContact ? "Ajukan pencabutan kontak" : target?.kind==='publication'&&actions.length===1 ? action==='UNPUBLISH_PUBLICATION'?'Ajukan penarikan':action==='ARCHIVE_PUBLICATION'?'Ajukan arsip':'Ajukan konfirmasi tersedia' : "Ajukan perubahan publik"}
    description={isContact ? "Periksa kontak dan alasan pencabutan." : "Periksa data dan alasan sebelum mengirim permintaan."}
    footer={<><SjSecondaryButton disabled={submitting} onClick={guard.requestClose}>Batal</SjSecondaryButton><SjPrimaryButton loading={submitting} disabled={!target} onClick={() => void submit()}><Send className="size-4" aria-hidden="true" />Kirim permintaan</SjPrimaryButton></>}
  >
    <div className="space-y-5">
      {target ? <div className="min-w-0 space-y-1 text-sm [overflow-wrap:anywhere]"><p className="font-semibold text-slate-600">Data yang akan diubah</p><p className="text-slate-900">{target.label}</p></div> : null}
      {actions.length > 1 ? <label className="block space-y-2 text-sm font-semibold text-slate-700">Tindakan<SetupSelect value={action} onChange={(event) => setAction(event.target.value as SjChangeRequestAction)}>{actions.map(item => <option key={item} value={item}>{CHANGE_REQUEST_LABEL[item]}</option>)}</SetupSelect></label> : <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tindakan</p><p className="mt-1 text-sm font-semibold text-slate-900">{CHANGE_REQUEST_LABEL[action]}</p></div>}
      <label className="block space-y-2 text-sm font-semibold text-slate-700">{isContact ? "Alasan pencabutan" : "Alasan dan dampak"} <span className="text-rose-600">*</span><SetupTextarea id="sj-change-request-reason" rows={5} minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="sj-change-request-help sj-change-request-error" placeholder={isContact ? "Tuliskan alasan kontak ini perlu dicabut." : "Jelaskan alasan perubahan dan hasil yang diharapkan pada website publik."} /></label>
      <p id="sj-change-request-help" className="text-sm leading-6 text-slate-600">{target?.kind === 'profile'
        ? 'Permintaan ini perlu disetujui Control. Setelah diterapkan di SJ, profil BPRS dan aset terkait tidak ditampilkan selama profil disembunyikan. Data di bank tidak dihapus; ini bukan penarikan atau pengarsipan aset.'
        : target?.kind === 'contact' ? 'Setelah disetujui, kontak tidak dapat dipilih lagi. Kontak yang masih dipakai publikasi harus diganti terlebih dahulu. Data kontak tetap tersimpan.'
        : target?.kind==='publication'&&action==='UNPUBLISH_PUBLICATION' ? 'Setelah disetujui dan diterapkan di SJ, aset ditarik dari website. Draf perubahan tetap tersimpan. Ini bukan pengarsipan.'
        : target?.kind==='publication'&&action==='ARCHIVE_PUBLICATION' ? 'Permintaan arsip diperiksa Control. Data di bank tetap tersimpan, bukan dihapus. Penayangan diperiksa terpisah setelah keputusan diterapkan.'
        : 'Control akan memeriksa dampak dan ketergantungan. Data sumber tetap tersimpan untuk audit; permintaan ini tidak menghapus fisik data secara langsung.'}</p>
      {error ? <p id="sj-change-request-error" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p> : null}
    </div>
  </DashboardModal>{guard.confirmation}</>;
}
