"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import SjRecordActions from "./SjRecordActions";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { SETUP_PAGE_TABLE_CARD_CLASS } from "@/components/ui/setupPageStyles";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import { sjAction } from './actionAvailability';
import type {
  SjContact,
  SjProfile,
  SjReviewPublication,
  SjSettings,
} from "@/types/seputar-jaminan.types";
import {
  ATTRIBUTE_LABEL,
  CATEGORY_LABEL,
  SJ_SUBMISSIONS,
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
  const access = useProtectedAction();
  const scope = `${access.hasCapability('/dashboard/seputar-jaminan/profil', 'read')}:${access.hasCapability('/dashboard/seputar-jaminan/kontak', 'read')}`;
  return <ReviewSession key={scope} />;
}

function ReviewSession() {
  const [publications, setPublications] = useState<SjReviewPublication[]>([]);
  const [profile, setProfile] = useState<SjProfile | null>(null);
  const [contacts, setContacts] = useState<SjContact[]>([]);
  const [cursors,setCursors]=useState<{publication:string|null;contact:string|null}>({publication:null,contact:null});
  const [moreBusy,setMoreBusy]=useState(false),[moreError,setMoreError]=useState<string|null>(null);
  const [settings, setSettings] = useState<SjSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [mode, setMode] = useState<"approve" | "revision">("approve");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useSeputarJaminanModalScrollLock(Boolean(target));
  const { showToast } = useAppToast();
  const access = useProtectedAction();
  const canReadProfile = access.hasCapability("/dashboard/seputar-jaminan/profil", "read");
  const canReadContacts = access.hasCapability("/dashboard/seputar-jaminan/kontak", "read");

  const load = useCallback(() => {
    const sequence = ++loadSequence.current;
    const readReview = () => Promise.all([
        seputarJaminanService.getReviewPage({limit:20}),
        canReadProfile ? seputarJaminanService.getProfile() : Promise.resolve(null),
        canReadContacts ? seputarJaminanService.getContactPage({limit:20,state:'IN_REVIEW'}) : Promise.resolve(null),
        seputarJaminanService.getSettings(),
      ] as const);
    let request: ReturnType<typeof readReview>;
    try {
      request = readReview();
    } catch (error) { request = Promise.reject(error); }
    return request.then(([nextPublications, nextProfile, nextContacts, nextSettings]) => {
      if (sequence !== loadSequence.current) return;
      setPublications(nextPublications.items);
      setProfile(nextProfile?.state === "IN_REVIEW" ? nextProfile : null);
      setContacts(nextContacts?.items ?? []);
      setCursors({publication:nextPublications.page_info.next_cursor,contact:nextContacts?.page_info.next_cursor ?? null});
      setMoreError(null);
      setSettings(nextSettings);
    }).catch((loadError) => {
      if (sequence !== loadSequence.current) return;
      setError(readableError(loadError));
    }).finally(() => {
      if (sequence === loadSequence.current) setLoading(false);
    });
  }, [canReadProfile, canReadContacts]);
  const reload = async () => { setLoading(true); setError(null); await load(); };
  const more=async(kind:'publication'|'contact')=>{
    const cursor=cursors[kind];if(!cursor||moreBusy)return;const sequence=loadSequence.current;setMoreBusy(true);setMoreError(null);
    try{
      if(kind==='publication'){
        const page=await seputarJaminanService.getReviewPage({cursor,limit:20});
        if(sequence===loadSequence.current){setPublications(rows=>[...rows,...page.items.filter(item=>!rows.some(old=>old.id===item.id))]);setCursors(old=>({...old,publication:page.page_info.next_cursor}));}
      }else{
        const page=await seputarJaminanService.getContactPage({cursor,limit:20,state:'IN_REVIEW'});
        if(sequence===loadSequence.current){setContacts(rows=>[...rows,...page.items.filter(item=>!rows.some(old=>old.id===item.id))]);setCursors(old=>({...old,contact:page.page_info.next_cursor}));}
      }
    }catch(e){if(sequence===loadSequence.current)setMoreError(readableError(e));}finally{setMoreBusy(false);}
  };

  const invalidateLoad = useCallback(() => { ++loadSequence.current; }, []);
  useEffect(() => {
    void load();
    return invalidateLoad;
  }, [load, invalidateLoad]);

  const total = publications.length + contacts.length + (profile ? 1 : 0);
  const centralReview = settings?.review_authority === "central";
  const mediaWaiting = useMemo(
    () => publications.reduce(
      (sum, publication) => sum + (publication.current_version?.media.filter((media) => !media.central_ready).length ?? 0),
      0,
    ),
    [publications],
  );

  const begin = (nextTarget: ReviewTarget, nextMode: "approve" | "revision") => {
    if (centralReview) return;
    setDecisionError(null);
    const action = sjAction(nextTarget.item, nextMode === 'revision' ? 'request_revision' : nextTarget.kind === 'publication' ? 'approve' : 'verify');
    if (!action.available) { showToast(action.reason || 'Tindakan belum tersedia.', 'warning'); return; }
    const feature = nextTarget.kind === "publication"
      ? nextMode === "approve" ? "sj_publish" : "sj_review"
      : nextTarget.kind === "profile" ? "sj_profile_verify" : "sj_contact_verify";
    if (!access.ensureFeature(SJ_SUBMISSIONS, feature)) return;
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
    setDecisionError(null);
    const action = sjAction(target.item, mode === 'revision' ? 'request_revision' : target.kind === 'publication' ? 'approve' : 'verify');
    if (centralReview || !action.available || action.mode !== 'DIRECT') return;
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
      await reload();
    } catch (decisionError) {
      setDecisionError(readableError(decisionError));
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
    ? "Persetujuan katalog akan memasukkannya ke antrean pengiriman. Ini belum berarti aset sudah tampil."
    : target?.kind === "profile"
      ? "Persetujuan profil akan memverifikasi identitas BPRS untuk katalog publik."
      : "Persetujuan kontak akan memverifikasi nomor WhatsApp untuk katalog publik.";

  return (
    <DashboardPageShell spacing="lg" animated className="[overflow-wrap:anywhere]">
      {(!canReadProfile || !canReadContacts) && <DashboardNotice tone="amber" title="Daftar mengikuti izin akses Anda" description="Profil atau kontak yang tidak dapat Anda akses tidak diperiksa di halaman ini. Ini bukan berarti pengajuannya kosong." />}
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Pemeriksaan publikasi"
        description="Periksa isi publik, sumber data, gambar, profil, dan kontak. Pemeriksa harus berbeda dari pembuat atau pengaju."
        icon={ClipboardCheck}
        action={<SjSecondaryButton loading={loading} onClick={() => void reload()}>{!loading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}Muat ulang</SjSecondaryButton>}
      />

      {loading ? <SetupState variant="loading" title="Memuat daftar pemeriksaan…" /> : error ? <SetupState variant="error" title="Daftar pemeriksaan belum dapat dimuat" description={error} /> : total === 0 ? <SetupState title="Tidak ada pengajuan yang menunggu" description="Tidak ada pengajuan yang menunggu dalam daftar ini." icon={BadgeCheck} className="max-w-none text-slate-900" /> : (
        <>
          {centralReview ? <DashboardNotice tone="sky" title="Pemeriksaan dilakukan melalui Ruwang Control" description="Pengajuan di halaman ini hanya dapat ditinjau. Setujui dan minta revisi dilakukan oleh operator pusat agar tidak ada dua jalur keputusan aktif." /> : null}
          <section aria-label="Ringkasan antrean pemeriksaan" className={SETUP_PAGE_TABLE_CARD_CLASS}>
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="size-6 shrink-0 text-sky-700" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold tabular-nums text-slate-950">{total}</p>
                  <p className="text-sm text-slate-600">Pengajuan dimuat, bukan total seluruh antrean</p>
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-sky-800">{publication.reference_code}</span><SjStatusBadge state={publication.state} /></div>
                    <h3 className="mt-3 text-xl font-bold text-slate-950">{version?.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{CATEGORY_LABEL[publication.asset_category]} · {[version?.city_regency, version?.province].filter(Boolean).join(", ")}</p>
                  </div>
                  {!centralReview ? <SjRecordActions subject={publication} busy={saving} label={`Aksi pemeriksaan ${targetLabel({kind:"publication",item:publication})}`} actions={[{name:"approve",label:"Setujui & kirim",icon:BadgeCheck,primary:true,onClick:()=>begin({kind:"publication",item:publication},"approve")},{name:"request_revision",label:"Minta perbaikan",icon:RotateCcw,onClick:()=>begin({kind:"publication",item:publication},"revision")}]}/> : null}
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
{profile ? <SjSection title="Profil BPRS" description="Identitas yang akan tampil pada website publik."><div className="space-y-4 p-5"><div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between"><div className="min-w-0 flex-1"><h3 className="text-lg font-bold text-slate-950">{profile.display_name}</h3><p className="mt-1 text-sm text-slate-500">{profile.public_slug} · {profile.city_regency}, {profile.province}</p></div><div className="shrink-0"><SjStatusBadge state={profile.state} /></div></div><p className="text-sm leading-6 text-slate-700">{profile.short_description}</p><p className={`text-sm font-semibold ${profile.logo_ready ? "text-emerald-700" : "text-amber-700"}`}>{profile.logo_ready ? "Logo sudah siap disinkronkan." : "Logo belum selesai disinkronkan."}</p>{!centralReview ? <SjRecordActions subject={profile} busy={saving} label={`Aksi pemeriksaan ${targetLabel({kind:"profile",item:profile})}`} actions={[{name:"verify",label:"Setujui profil",icon:BadgeCheck,primary:true,onClick:()=>begin({kind:"profile",item:profile},"approve")},{name:"request_revision",label:"Minta perbaikan",icon:RotateCcw,onClick:()=>begin({kind:"profile",item:profile},"revision")}]}/> : null}</div></SjSection> : null}
            {contacts.length > 0 ? <SjSection title="Kontak WhatsApp" description="Nomor marketing yang dapat dipakai oleh beberapa katalog."><div className="divide-y divide-slate-100">{contacts.map((contact) => <article key={contact.id} className="space-y-3 p-5"><div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between"><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-950">{contact.label}</h3><p className="mt-1 text-sm text-slate-600">{contact.phone_e164}</p></div><div className="shrink-0"><SjStatusBadge state={contact.state} /></div></div>{!centralReview ? <SjRecordActions subject={contact} busy={saving} label={`Aksi pemeriksaan ${targetLabel({kind:"contact",item:contact})}`} actions={[{name:"verify",label:"Verifikasi kontak",icon:BadgeCheck,primary:true,onClick:()=>begin({kind:"contact",item:contact},"approve")},{name:"request_revision",label:"Minta perbaikan",icon:RotateCcw,onClick:()=>begin({kind:"contact",item:contact},"revision")}]}/> : null}</article>)}</div></SjSection> : null}
          </div> : null}
          <div className="flex flex-wrap gap-3">
            {cursors.publication?<SjSecondaryButton disabled={moreBusy} onClick={()=>void more('publication')}>Muat katalog berikutnya</SjSecondaryButton>:null}
            {cursors.contact?<SjSecondaryButton disabled={moreBusy} onClick={()=>void more('contact')}>Muat kontak berikutnya</SjSecondaryButton>:null}
            {moreError?<p role="alert" className="w-full text-sm text-rose-700">{moreError}</p>:null}
          </div>
        </>
      )}

      {mediaWaiting > 0 ? <SetupState variant="error" title={`${mediaWaiting} gambar belum siap`} description="Publikasi tidak dapat disetujui sampai semua gambar selesai disinkronkan." /> : null}

      <DashboardModal
        isOpen={Boolean(target)}
        onClose={closeModal}
        closeDisabled={saving}
        maxWidth="lg"
        title={mode === "approve" ? "Setujui pengajuan?" : "Minta revisi?"}
        description={mode === "approve" ? "Pengajuan akan diproses sesuai keputusan dan izin Anda." : "Catatan perbaikan akan terlihat oleh pembuat."}
        footer={<><SjSecondaryButton disabled={saving} onClick={closeModal}>Batal</SjSecondaryButton><SjPrimaryButton loading={saving} onClick={() => void submitDecision()}>{mode === "approve" ? "Ya, setujui" : "Kirim catatan"}</SjPrimaryButton></>}
      >
          {decisionError?<p role="alert" className="mb-4 text-sm text-rose-700">{decisionError}</p>:null}
          <div className="mb-4 min-w-0 space-y-1 text-sm [overflow-wrap:anywhere]"><p className="font-semibold text-slate-600">Pengajuan yang diperiksa</p><p className="text-slate-900">{targetLabel(target)}</p></div>
        {mode === "revision" ? <div className="space-y-2"><label htmlFor="sj-review-revision-reason" className="block text-sm font-semibold text-slate-700">Bagian yang perlu diperbaiki <span className="text-rose-600">*</span></label><SetupTextarea id="sj-review-revision-reason" rows={5} minLength={5} maxLength={500} value={reason} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "sj-review-revision-error sj-review-revision-count" : "sj-review-revision-help sj-review-revision-count"} onChange={(event) => { setReason(event.target.value); if (event.target.value.trim().length >= 5) setReasonError(null); }} placeholder="Contoh: Foto bagian depan belum jelas. Mohon unggah ulang." className={reasonError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : undefined} /><div className="flex items-start justify-between gap-4 text-xs leading-5"><p id={reasonError ? "sj-review-revision-error" : "sj-review-revision-help"} role={reasonError ? "alert" : undefined} className={reasonError ? "font-semibold text-rose-700" : "text-slate-500"}>{reasonError ?? "Tuliskan catatan yang spesifik agar pembuat memahami perbaikannya."}</p><p id="sj-review-revision-count" className="shrink-0 tabular-nums text-slate-500">{reason.length}/500</p></div></div> : <DashboardNotice tone="amber" title="Periksa sekali lagi sebelum menyetujui" description={<>Pastikan informasi, sumber, gambar, lokasi, dan kontak sudah benar. {approvalNotice}</>} />}
      </DashboardModal>
    </DashboardPageShell>
  );
}
