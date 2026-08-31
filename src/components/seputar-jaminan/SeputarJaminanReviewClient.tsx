"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import DashboardModal from "@/components/ui/DashboardModal";
import useSeputarJaminanModalScrollLock from "@/components/seputar-jaminan/useSeputarJaminanModalScrollLock";
import DashboardNotice from "@/components/ui/DashboardNotice";
import SetupState from "@/components/ui/SetupState";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { SETUP_PAGE_TABLE_CARD_CLASS } from "@/components/ui/setupPageStyles";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type {
  SjContact,
  SjProfile,
  SjReviewPublication,
} from "@/types/seputar-jaminan.types";
import {
  ATTRIBUTE_LABEL,
  CATEGORY_LABEL,
  SJ_ROOT,
  SjPageHeader,
  SjPrimaryButton,
  SjSecondaryButton,
  SjSection,
  SjStatusBadge,
  VOCABULARY_LABEL,
  readableError,
} from "./SeputarJaminanUI";

type ReviewTarget =
  | { kind: "publication"; item: SjReviewPublication }
  | { kind: "profile"; item: SjProfile }
  | { kind: "contact"; item: SjContact };

function targetLabel(target: ReviewTarget | null) {
  if (!target) return "pengajuan";
  if (target.kind === "publication") return target.item.title ?? target.item.reference_code;
  if (target.kind === "profile") return target.item.display_name;
  return target.item.label;
}

export default function SeputarJaminanReviewClient() {
  const [publications, setPublications] = useState<SjReviewPublication[]>([]);
  const [profile, setProfile] = useState<SjProfile | null>(null);
  const [contacts, setContacts] = useState<SjContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [mode, setMode] = useState<"approve" | "revision">("approve");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useSeputarJaminanModalScrollLock(Boolean(target));
  const { showToast } = useAppToast();
  const access = useProtectedAction();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPublications, nextProfile, nextContacts] = await Promise.all([
        seputarJaminanService.getReviews(),
        seputarJaminanService.getProfile(),
        seputarJaminanService.getContacts(),
      ]);
      setPublications(nextPublications);
      setProfile(nextProfile?.state === "IN_REVIEW" ? nextProfile : null);
      setContacts(nextContacts.filter((contact) => contact.state === "IN_REVIEW"));
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = publications.length + contacts.length + (profile ? 1 : 0);
  const mediaWaiting = useMemo(
    () => publications.reduce(
      (sum, publication) => sum + (publication.current_version?.media.filter((media) => !media.central_ready).length ?? 0),
      0,
    ),
    [publications],
  );

  const begin = (nextTarget: ReviewTarget, nextMode: "approve" | "revision") => {
    const feature = nextTarget.kind === "publication"
      ? nextMode === "approve" ? "sj_publish" : "sj_review"
      : nextTarget.kind === "profile" ? "sj_profile_verify" : "sj_contact_verify";
    if (!access.ensureFeature(SJ_ROOT, feature)) return;
    setTarget(nextTarget);
    setMode(nextMode);
    setReason("");
    setReasonError(null);
  };

  const closeModal = () => {
    if (saving) return;
    setTarget(null);
    setReason("");
    setReasonError(null);
  };

  const submitDecision = async () => {
    if (!target) return;
    if (mode === "revision" && reason.trim().length < 5) {
      setReasonError("Jelaskan bagian yang perlu diperbaiki sedikitnya 5 karakter.");
      requestAnimationFrame(() => {
        document.getElementById("sj-review-revision-reason")?.focus();
      });
      return;
    }
    setSaving(true);
    try {
      if (target.kind === "publication") {
        if (mode === "approve") {
          await seputarJaminanService.publicationCommand(
            target.item.id,
            "approve-and-publish",
            target.item.lock_version,
          );
        } else {
          await seputarJaminanService.requestPublicationRevision(
            target.item.id,
            target.item.lock_version,
            reason.trim(),
          );
        }
      } else if (target.kind === "profile") {
        if (mode === "approve") {
          await seputarJaminanService.profileCommand("verify", target.item.lock_version);
        } else {
          await seputarJaminanService.requestProfileRevision(target.item.lock_version, reason.trim());
        }
      } else if (mode === "approve") {
        await seputarJaminanService.contactCommand(target.item.id, "verify", target.item.lock_version);
      } else {
        await seputarJaminanService.requestContactRevision(
          target.item.id,
          target.item.lock_version,
          reason.trim(),
        );
      }
      showToast(
        mode === "approve" ? "Pengajuan disetujui dan masuk antrean sinkronisasi." : "Pengajuan dikembalikan untuk diperbaiki.",
        "success",
      );
      setTarget(null);
      setReason("");
      setReasonError(null);
      await load();
    } catch (decisionError) {
      showToast(readableError(decisionError), "error");
    } finally {
      setSaving(false);
    }
  };

  const pendingSummary = [
    { label: "Katalog", value: publications.length },
    { label: "Profil BPRS", value: profile ? 1 : 0 },
    { label: "Kontak WhatsApp", value: contacts.length },
  ].filter((item) => item.value > 0);

  const approvalNotice = target?.kind === "publication"
    ? "Persetujuan katalog akan langsung memasukkannya ke antrean tayang."
    : target?.kind === "profile"
      ? "Persetujuan profil akan memverifikasi identitas BPRS untuk katalog publik."
      : "Persetujuan kontak akan memverifikasi nomor WhatsApp untuk katalog publik.";

  return (
    <DashboardPageShell spacing="lg" animated>
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Pemeriksaan publikasi"
        description="Periksa isi publik, sumber data, gambar, profil, dan kontak. Pemeriksa harus berbeda dari pembuat atau pengaju."
        icon={ClipboardCheck}
        action={<SjSecondaryButton loading={loading} onClick={() => void load()}>{!loading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}Muat ulang</SjSecondaryButton>}
      />

      {loading ? <SetupState variant="loading" title="Memuat daftar pemeriksaan…" /> : error ? <SetupState variant="error" title="Daftar pemeriksaan belum dapat dimuat" description={error} /> : total === 0 ? <SetupState title="Tidak ada pengajuan yang menunggu" description="Semua pengajuan sudah selesai diperiksa." icon={BadgeCheck} className="max-w-none text-slate-700" /> : (
        <>
          <section aria-label="Ringkasan antrean pemeriksaan" className={SETUP_PAGE_TABLE_CARD_CLASS}>
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="size-6 shrink-0 text-sky-700" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold tabular-nums text-slate-950">{total}</p>
                  <p className="text-sm text-slate-600">Pengajuan perlu diperiksa</p>
                </div>
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-2">
                {pendingSummary.map((item) => (
                  <div key={item.label} className="flex items-baseline gap-2">
                    <dt className="text-sm text-slate-600">{item.label}</dt>
                    <dd className="font-bold tabular-nums text-slate-950">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <SjSection title="Katalog" description="Periksa informasi yang akan dilihat masyarakat.">
            {publications.length === 0 ? <div className="p-6"><SetupState title="Tidak ada katalog yang menunggu" /></div> : <div className="divide-y divide-slate-100">{publications.map((publication) => {
              const version = publication.current_version;
              return <article key={publication.id} className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-sky-800">{publication.reference_code}</span><SjStatusBadge state={publication.state} /></div>
                    <h3 className="mt-3 text-xl font-bold text-slate-950">{version?.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{CATEGORY_LABEL[publication.asset_category]} · {[version?.city_regency, version?.province].filter(Boolean).join(", ")}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row"><SjSecondaryButton className="w-full sm:w-auto" onClick={() => begin({ kind: "publication", item: publication }, "revision")}><RotateCcw className="size-4" aria-hidden="true" />Minta revisi</SjSecondaryButton><SjPrimaryButton className="w-full sm:w-auto" onClick={() => begin({ kind: "publication", item: publication }, "approve")}><BadgeCheck className="size-4" aria-hidden="true" />Setujui & tayangkan</SjPrimaryButton></div>
                </div>
                <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 lg:grid-cols-2">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sumber internal</p>{publication.review_source.type === "MANUAL" ? <div className="mt-2 space-y-2 text-sm text-slate-700"><p><span className="font-semibold">Alasan:</span> {publication.review_source.reason || "Tidak tersedia"}</p><p><span className="font-semibold">Bukti:</span> {publication.review_source.evidence_document ? `${publication.review_source.evidence_document.document_number} · ${publication.review_source.evidence_document.document_name}` : "Dokumen tidak dapat diakses"}</p></div> : <div className="mt-2 space-y-2 text-sm text-slate-700"><p><span className="font-semibold">Agunan:</span> {publication.review_source.collateral?.collateral_number || "Tanpa nomor"}</p><p>{publication.review_source.collateral?.collateral_type || publication.review_source.collateral?.description || "Rincian agunan tidak tersedia"}</p></div>}</div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Gambar dan kontak</p><p className="mt-2 text-sm text-slate-700">{version?.media.length ?? 0} gambar · {version?.whatsapp_contact?.label ?? "Kontak belum tersedia"}</p>{(version?.media.some((media) => !media.central_ready)) ? <p className="mt-2 text-sm font-semibold text-amber-700">Ada gambar yang belum siap di pusat.</p> : null}</div>
                </div>
                <div><p className="text-sm font-bold text-slate-900">Deskripsi publik</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{version?.description}</p></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(version?.attributes ?? {}).map(([key, value]) => <div key={key} className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{ATTRIBUTE_LABEL[key] ?? key}</p><p className="mt-1 font-semibold text-slate-950">{VOCABULARY_LABEL[String(value)] ?? String(value)}</p></div>)}</div>
              </article>;
            })}</div>}
          </SjSection>

          {(profile || contacts.length > 0) ? <div className="grid gap-5 xl:grid-cols-2">
            {profile ? <SjSection title="Profil BPRS" description="Identitas yang akan tampil pada website publik."><div className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">{profile.display_name}</h3><p className="mt-1 text-sm text-slate-500">{profile.public_slug} · {profile.city_regency}, {profile.province}</p></div><SjStatusBadge state={profile.state} /></div><p className="text-sm leading-6 text-slate-700">{profile.short_description}</p><p className={`text-sm font-semibold ${profile.logo_ready ? "text-emerald-700" : "text-amber-700"}`}>{profile.logo_ready ? "Logo sudah siap disinkronkan." : "Logo belum selesai disinkronkan."}</p><div className="flex flex-wrap gap-2"><SjSecondaryButton onClick={() => begin({ kind: "profile", item: profile }, "revision")}>Minta perbaikan</SjSecondaryButton><SjPrimaryButton onClick={() => begin({ kind: "profile", item: profile }, "approve")}>Setujui profil</SjPrimaryButton></div></div></SjSection> : null}
            {contacts.length > 0 ? <SjSection title="Kontak WhatsApp" description="Nomor marketing yang dapat dipakai oleh beberapa katalog."><div className="divide-y divide-slate-100">{contacts.map((contact) => <article key={contact.id} className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{contact.label}</h3><p className="mt-1 text-sm text-slate-600">{contact.phone_e164}</p></div><SjStatusBadge state={contact.state} /></div><div className="flex flex-wrap gap-2"><SjSecondaryButton onClick={() => begin({ kind: "contact", item: contact }, "revision")}>Minta perbaikan</SjSecondaryButton><SjPrimaryButton onClick={() => begin({ kind: "contact", item: contact }, "approve")}>Verifikasi kontak</SjPrimaryButton></div></article>)}</div></SjSection> : null}
          </div> : null}
        </>
      )}

      {mediaWaiting > 0 ? <SetupState variant="error" title={`${mediaWaiting} gambar belum siap`} description="Publikasi tidak dapat disetujui sampai semua gambar selesai disinkronkan." /> : null}

      <DashboardModal
        isOpen={Boolean(target)}
        onClose={closeModal}
        closeDisabled={saving}
        maxWidth="lg"
        title={mode === "approve" ? "Setujui pengajuan?" : "Minta revisi?"}
        description={mode === "approve" ? `${targetLabel(target)} akan diproses sesuai statusnya.` : `Catatan perbaikan untuk ${targetLabel(target)} akan terlihat oleh pembuat.`}
        footer={<><SjSecondaryButton disabled={saving} onClick={closeModal}>Batal</SjSecondaryButton><SjPrimaryButton loading={saving} onClick={() => void submitDecision()}>{mode === "approve" ? "Ya, setujui" : "Kirim catatan"}</SjPrimaryButton></>}
      >
        {mode === "revision" ? <div className="space-y-2"><label htmlFor="sj-review-revision-reason" className="block text-sm font-semibold text-slate-700">Bagian yang perlu diperbaiki <span className="text-rose-600">*</span></label><SetupTextarea id="sj-review-revision-reason" rows={5} minLength={5} maxLength={500} value={reason} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "sj-review-revision-error sj-review-revision-count" : "sj-review-revision-help sj-review-revision-count"} onChange={(event) => { setReason(event.target.value); if (event.target.value.trim().length >= 5) setReasonError(null); }} placeholder="Contoh: Foto bagian depan belum jelas. Mohon unggah ulang." className={reasonError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : undefined} /><div className="flex items-start justify-between gap-4 text-xs leading-5"><p id={reasonError ? "sj-review-revision-error" : "sj-review-revision-help"} role={reasonError ? "alert" : undefined} className={reasonError ? "font-semibold text-rose-700" : "text-slate-500"}>{reasonError ?? "Tuliskan catatan yang spesifik agar pembuat memahami perbaikannya."}</p><p id="sj-review-revision-count" className="shrink-0 tabular-nums text-slate-500">{reason.length}/500</p></div></div> : <DashboardNotice tone="amber" title="Periksa sekali lagi sebelum menyetujui" description={<>Pastikan informasi, sumber, gambar, lokasi, dan kontak sudah benar. {approvalNotice}</>} />}
      </DashboardModal>
    </DashboardPageShell>
  );
}
