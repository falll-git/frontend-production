"use client";

import useSjListQuery from "./useSjListQuery";
import { formatSjDate } from "./presentation";
import { sjAction } from './actionAvailability';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Eye, RefreshCw, Send } from "lucide-react";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import useSeputarJaminanModalScrollLock from "@/components/seputar-jaminan/useSeputarJaminanModalScrollLock";
import DashboardModal from "@/components/ui/DashboardModal";
import DashboardNotice from "@/components/ui/DashboardNotice";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTablePrimaryText,
  SetupTableScroll,
  SetupTableSecondaryText,
} from "@/components/ui/SetupDataTable";
import SjCursorNavigation from './SjCursorNavigation';
import SetupSelect from "@/components/ui/SetupSelect";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import SetupStatusBadge, { type SetupStatusTone } from "@/components/ui/SetupStatusBadge";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { SjChangeRequest, SjSettings, SjSubmission } from "@/types/seputar-jaminan.types";
import {
  SJ_CONTACTS,
  SJ_PROFILE,
  SJ_PUBLICATIONS,
  SJ_SUBMISSIONS,
  ATTRIBUTE_LABEL,
  PUBLICATION_STATE_LABEL,
  ENTITY_STATE_LABEL,
  VOCABULARY_LABEL,
  SjPageHeader,
  SJ_TABLE_LOADING_CLASS,
  SjPrimaryButton,
  SjSecondaryButton,
  SjSection,
  SjStatusBadge,
  readableError,
} from "./SeputarJaminanUI";
import { CHANGE_REQUEST_LABEL } from "./SeputarJaminanChangeRequestModal";
import { submissionNextStep } from './submissionNextStep';
import { DELIVERY_LABEL, APPLICATION_LABEL, CHANGE_STATE_LABEL } from './labels';

const KIND_LABEL = {
  PROFILE: "Profil BPRS",
  CONTACT: "Kontak WhatsApp",
  PUBLICATION: "Publikasi",
} as const;

const REQUEST_LABEL = {
  CREATE: "Pengajuan baru",
  CHANGE: "Perubahan",
} as const;

function toneFor(value: string): SetupStatusTone {
  if (["RECEIVED_BY_CONTROL", "APPLIED_BY_BANK"].includes(value)) return "emerald";
  if (["DELIVERY_FAILED", "DECISION_REJECTED_BY_BANK"].includes(value)) return "red";
  if (["SENDING_TO_CONTROL", "WAITING_FOR_DECISION"].includes(value)) return "amber";
  return "slate";
}

function correctionHref(item: SjSubmission) {
  if (item.kind === "PROFILE") return SJ_PROFILE;
  if (item.kind === "CONTACT") return `${SJ_CONTACTS}?detail=${encodeURIComponent(item.resource_id)}${item.review_state === 'REVISION_REQUIRED' ? '&edit=1' : ''}`;
  return `${SJ_PUBLICATIONS}?detail=${encodeURIComponent(item.resource_id)}`;
}

function snapshotRows(snapshot: Record<string, unknown>) {
  const fields = new Set(['public_name','display_name','short_description','public_slug','office_city_regency','office_province','website_url','title','description','category','subcategory','reference_code','location','attributes','media','label','phone_e164','next_confirmation_at']);
  return Object.entries(snapshot).filter(([key, value]) => {
    if (!fields.has(key)) return false;
    return value !== undefined && value !== null && value !== "";
  });
}

function snapshotValue(value: unknown, key: string) {
  if (key === "next_confirmation_at" && typeof value === "string") return formatSjDate(value);
  if (key === 'media' && Array.isArray(value)) return `${value.length} foto diajukan. Lihat data terkait untuk memeriksa kesiapan media.`;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const labels = key === 'attributes' ? ATTRIBUTE_LABEL : key === 'location' ? {city_regency:'Kota / kabupaten',province:'Provinsi'} : {};
    return Object.entries(value).filter(([name,v]) => Object.hasOwn(labels,name) && (typeof v==='string'||typeof v==='number')).map(([name,v]) => `${labels[name as keyof typeof labels]}: ${typeof v==='string' ? VOCABULARY_LABEL[v] ?? v : v}`).join('\n') || 'Belum ada rincian.';
  }
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "string") return VOCABULARY_LABEL[value] ?? ({TANAH:'Tanah',BANGUNAN:'Bangunan',MESIN_PERALATAN:'Mesin dan peralatan',KENDARAAN:'Kendaraan'} as Record<string,string>)[value] ?? value;
  if (typeof value === "number") return String(value);
  return 'Rincian belum dapat ditampilkan.';
}

function snapshotLabel(key: string) {
  const labels: Record<string, string> = { public_name: 'Nama BPRS', display_name: 'Nama BPRS', short_description: 'Deskripsi singkat', public_slug: 'Alamat profil', office_city_regency: 'Kota / kabupaten', office_province: 'Provinsi', website_url: 'Website', title: 'Judul aset', description: 'Deskripsi', city_regency: 'Kota / kabupaten', province: 'Provinsi', label: 'Nama kontak', phone_e164: 'Nomor WhatsApp', category: 'Jenis aset', subcategory:'Rincian jenis', reference_code:'Kode aset', location:'Lokasi', next_confirmation_at:'Konfirmasi berikutnya saat diajukan', attributes: 'Spesifikasi', media: 'Foto yang diajukan' };
  return labels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SeputarJaminanSubmissionsClient() {
  const { hasCapability } = useProtectedAction();
  const [items, setItems] = useState<SjSubmission[]>([]);
  const [settings, setSettings] = useState<SjSettings | null>(null);
  const [changeRequests, setChangeRequests] = useState<SjChangeRequest[]>([]);
  const { params: listQuery, update: updateListQuery } = useSjListQuery();
  const tab = listQuery.get('tab') ?? 'content';
  const validTab = tab === 'content' || tab === 'changes';
  const detailId = listQuery.get(tab === 'changes' ? 'change' : 'submission') ?? '';
  const changeCursor = listQuery.get('changes_cursor') ?? '';
  const changeState = listQuery.get('changes_state') ?? '';
  const changeAction = listQuery.get('changes_action') ?? '';
  const [changeNextCursor, setChangeNextCursor] = useState<string | null>(null);
  const [resubmitReason, setResubmitReason] = useState("");
  const [resubmitError,setResubmitError]=useState<string|null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const kind = listQuery.get("kind") ?? "";
  const setKind = (value: string) => updateListQuery({kind: value, page: '', cursor: '', submission: ''});
  const state = listQuery.get("state") ?? "";
  const setState = (value: string) => updateListQuery({state: value, page: '', cursor: '', submission: ''});
  const cursor = listQuery.get('cursor') ?? '';
  const legacyPage = listQuery.get('page');
  const legacyChangePage = listQuery.get('changes_page');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState('');
  const requestKey = JSON.stringify(tab === 'changes' ? [tab, changeCursor, changeState, changeAction, legacyChangePage] : [tab, kind, state, cursor, legacyPage]);
  const loading = pending || loadedQuery !== requestKey;
  const [requestError, setRequestError] = useState<{key: string; message: string} | null>(null);
  const error = requestError?.key === requestKey ? requestError.message : null;
  const loadSequence = useRef(0);
  const selected = !loading && !error && tab === 'content' ? items.find(item => item.id === detailId) ?? null : null;
  const selectedChange = !loading && !error && tab === 'changes' ? changeRequests.find(item => item.id === detailId) ?? null : null;
  const canEditRequests = hasCapability(SJ_SUBMISSIONS, 'update');
  const relatedChangeHref = selectedChange?.resource_kind === 'PUBLICATION' ? `${SJ_PUBLICATIONS}?detail=${encodeURIComponent(selectedChange.resource_id)}`
    : selectedChange?.resource_kind === 'PROFILE' ? SJ_PROFILE
    : selectedChange?.resource_kind === 'CONTACT' ? `${SJ_CONTACTS}?detail=${encodeURIComponent(selectedChange.resource_id)}` : null;
  const closeDetail = () => updateListQuery({submission: '', change: ''});
  const openChange = (request: SjChangeRequest) => { setResubmitError(null); setResubmitReason(request.reason); updateListQuery({change:request.id}); };

  const [reasonSelection, setReasonSelection] = useState<SjChangeRequest | null>(null);
  if (reasonSelection !== selectedChange) {
    setReasonSelection(selectedChange);
    setResubmitReason(selectedChange?.reason ?? '');
    setResubmitError(null);
  }

  const { showToast } = useAppToast();
  useSeputarJaminanModalScrollLock(Boolean(selected) || Boolean(selectedChange));

  const load = useCallback(() => {
    const sequence = ++loadSequence.current;
    const readPage = () => {
      if (!validTab) throw new Error('Tab pada tautan ini tidak dikenali. Pilih salah satu tab di atas.');
      const legacy = tab === 'changes' ? legacyChangePage : legacyPage;
      if (legacy !== null && legacy !== '1') throw new Error('Tautan halaman lama tidak dapat dipakai. Kembali ke awal daftar.');
      const pageRequest = tab === 'changes'
        ? seputarJaminanService.getChangeRequestPage({ ...(changeCursor ? {cursor:changeCursor} : {}), ...(changeState ? {state:changeState} : {}), ...(changeAction ? {action:changeAction} : {}), limit:20 })
        : seputarJaminanService.getSubmissionPage({ ...(cursor ? {cursor} : {}), limit:20, ...(kind ? {kind} : {}), ...(state ? {state} : {}) });
      return Promise.all([pageRequest, seputarJaminanService.getSettings()] as const);
    };
    let request: ReturnType<typeof readPage>;
    try { request = readPage(); } catch (failure) { request = Promise.reject(failure); }
    return request.then(([result, nextSettings]) => {
      if (sequence !== loadSequence.current) return;
      setRequestError(null);
      if (tab === 'changes') { setChangeRequests(result.items as SjChangeRequest[]); setChangeNextCursor(result.page_info.next_cursor); }
      else { setItems(result.items as SjSubmission[]); setNextCursor(result.page_info.next_cursor); }
      setSettings(nextSettings);
    }).catch((loadError) => {
      if (sequence !== loadSequence.current) return;
      setRequestError({key: requestKey, message: readableError(loadError)});
    }).finally(() => {
      if (sequence === loadSequence.current) { setPending(false); setLoadedQuery(requestKey); }
    });
  }, [kind, cursor, state, changeCursor, changeState, changeAction, legacyPage, legacyChangePage, tab, validTab, requestKey, setNextCursor, setChangeNextCursor, setPending, setLoadedQuery]);
  const reload = async () => { setPending(true); setRequestError(null); await load(); };

  const invalidateLoad = useCallback(() => { ++loadSequence.current; }, []);
  useEffect(() => {
    void load();
    return invalidateLoad;
  }, [load, invalidateLoad]);

  const selectedRows = useMemo(
    () => selected ? snapshotRows(selected.snapshot) : [],
    [selected],
  );

  const resubmit = async () => {
    if (!selectedChange || !canEditRequests || resubmitting) return;
    setResubmitError(null);
    const decision=sjAction({lock_version:selectedChange.request_version,action_availability:selectedChange.action_availability},'resubmit');
    if(!decision.available){setResubmitError(decision.reason || 'Permintaan belum bisa diajukan ulang.');return;}
    const reason = resubmitReason.trim();
    if (reason.length < 10) {
      setResubmitError("Jelaskan perbaikan sedikitnya 10 karakter.");
      return;
    }
    setResubmitting(true);
    try {
      await seputarJaminanService.resubmitChangeRequest(selectedChange.id, selectedChange.request_version, reason);
      showToast("Permintaan perubahan diajukan ulang.", "success");
      closeDetail();
      await reload();
    } catch (submitError) {
      setResubmitError(readableError(submitError));
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <DashboardPageShell spacing="lg" animated>
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Pengajuan"
        description="Periksa pengajuan dan tindak lanjuti catatan pemeriksa."
        icon={ClipboardList}
        action={(
          <SjSecondaryButton loading={loading} onClick={() => void reload()}>
            {!loading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
            Muat ulang
          </SjSecondaryButton>
        )}
      />
      {settings?.review_authority === "central" && !settings.review_submission_ready ? (
        <DashboardNotice
          tone="amber"
          title="Pemeriksaan pusat belum siap menerima pengajuan"
          description="Draf tetap aman di Ruwang. Pengiriman dinonaktifkan sampai penerima Control dikonfigurasi dan tervalidasi."
        />
      ) : null}
      {settings?.review_authority === "local" ? (
        <DashboardNotice
          tone="sky"
          title="Bank ini masih menggunakan pemeriksaan lokal"
          description="Pengajuan diperiksa oleh pemeriksa bank."
        >
          {hasCapability('/dashboard/seputar-jaminan/pemeriksaan','read') ? <Link className="inline-flex font-bold text-sky-800 underline underline-offset-2" href="/dashboard/seputar-jaminan/pemeriksaan">Buka pemeriksaan lokal</Link> : null}
        </DashboardNotice>
      ) : null}

      <div role="tablist" aria-label="Jenis pengajuan" className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
        {([{id:'content',label:'Pengajuan konten'},{id:'changes',label:'Penarikan & pencabutan'}] as const).map((item,index) => <button key={item.id} id={`sj-submissions-tab-${item.id}`} role="tab" type="button" aria-selected={tab===item.id} aria-controls="sj-submissions-panel" tabIndex={tab===item.id || !validTab && index===0 ? 0 : -1}
          className={`min-h-11 min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none sm:flex-none ${tab===item.id?'bg-white text-[#0d5a8f] shadow-sm':'text-slate-600 hover:text-slate-900'}`}
          onClick={()=>updateListQuery({tab:item.id,submission:'',change:''})}
          onKeyDown={event=>{const id=event.key==='Home'?'content':event.key==='End'?'changes':['ArrowLeft','ArrowRight'].includes(event.key)?index===0?'changes':'content':null;if(id){event.preventDefault();updateListQuery({tab:id,submission:'',change:''});document.getElementById(`sj-submissions-tab-${id}`)?.focus();}}}>{item.label}</button>)}
      </div>
      <div id="sj-submissions-panel" role="tabpanel" aria-labelledby={validTab?`sj-submissions-tab-${tab}`:undefined} aria-label={!validTab?'Tautan tidak valid':undefined} tabIndex={0}>
      {!validTab ? <DashboardNotice tone="amber" title="Tab tidak dikenali" description="Pilih Pengajuan konten atau Penarikan & pencabutan." /> : null}
      {tab === 'content' ? <SjSection title="Daftar pengajuan" description={loading ? "Memuat pengajuan…" : error ? "Jumlah pengajuan belum dapat dimuat." : `${items.length} pengajuan pada halaman ini`}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 sm:p-5" aria-label="Filter pengajuan">
          <SetupSelect value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Filter jenis pengajuan">
            <option value="">Semua jenis</option>
            <option value="PROFILE">Profil BPRS</option>
            <option value="CONTACT">Kontak WhatsApp</option>
            <option value="PUBLICATION">Publikasi</option>
          </SetupSelect>
          <SetupSelect value={state} onChange={(event) => setState(event.target.value)} aria-label="Filter status pemeriksaan">
            <option value="">Semua status pemeriksaan</option>
            <option value="IN_REVIEW">Menunggu pemeriksaan</option>
            <option value="REVISION_REQUIRED">Perlu diperbaiki</option>
            <option value="APPROVED">Disetujui</option>
            <option value="VERIFIED">Disetujui untuk profil/kontak</option>
          </SetupSelect>
        </div>
        {kind || state ? <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 pb-4 text-sm">
          {kind ? <SjSecondaryButton onClick={() => setKind('')}>Hapus jenis: {KIND_LABEL[kind as keyof typeof KIND_LABEL] ?? kind}</SjSecondaryButton> : null}
          {state ? <SjSecondaryButton onClick={() => setState('')}>Hapus filter status</SjSecondaryButton> : null}
          <SjSecondaryButton onClick={() => updateListQuery({kind:'',state:'',cursor:'',page:''})}>Atur ulang pengajuan</SjSecondaryButton>
        </div> : null}
        <p className="px-4 py-3 text-xs text-slate-500">Pengajuan terbaru ditampilkan lebih dulu. Jumlah hanya untuk halaman ini.</p>

        <SetupTableScroll aria-label="Gulir tabel pengajuan">
        <SetupDataTable variant="crud" density="compact" className="lg:min-w-[900px]" style={{tableLayout:'fixed'}} aria-label="Daftar pengajuan Seputar Jaminan">
          <SetupDataTableColGroup>
            <SetupDataTableCol className="w-[24%]" />
            <SetupDataTableCol className="w-[20%]" />
            <SetupDataTableCol className="w-[20%]" />
            <SetupDataTableCol className="w-[20%]" />
            <SetupDataTableCol className="w-[16%]" />
          </SetupDataTableColGroup>
          <SetupDataTableHead>
            <SetupDataTableRow>
              <SetupDataTableHeaderCell>Objek</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Diajukan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pemeriksaan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pengiriman</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className="text-center" data-table-action="true">Aksi</SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {loading ? (
              <SetupDataTableEmptyRow colSpan={5} state="loading" className={SJ_TABLE_LOADING_CLASS} loadingRows={3} loadingColumns={5}>Memuat pengajuan…</SetupDataTableEmptyRow>
            ) : error ? (
              <SetupDataTableEmptyRow colSpan={5} state="error" description={error}>Pengajuan belum dapat dimuat</SetupDataTableEmptyRow>
            ) : items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={5} icon={ClipboardList} isFiltered={Boolean(kind || state)} description={kind || state ? "Ubah filter untuk melihat pengajuan lain." : "Pengajuan profil, kontak, dan publikasi akan tampil di sini setelah dikirim."}>Belum ada pengajuan</SetupDataTableEmptyRow>
            ) : items.map((item) => (
              <SetupDataTableRow key={item.id}>
                <SetupDataTableCell>
                  <SetupTablePrimaryText style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{item.resource_label}</SetupTablePrimaryText>
                  <SetupTableSecondaryText className="mt-1">{KIND_LABEL[item.kind]} · {REQUEST_LABEL[item.request_kind]} · Versi {item.version_number}</SetupTableSecondaryText>
                </SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupTablePrimaryText style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{item.submitted_by?.name ?? "Pengguna tidak tersedia"}</SetupTablePrimaryText>
                  <SetupTableSecondaryText className="mt-1">{formatSjDate(item.submitted_at)}</SetupTableSecondaryText>
                </SetupDataTableCell>
                <SetupDataTableCell><SjStatusBadge state={item.review_state} /></SetupDataTableCell>
                <SetupDataTableCell>
                  <SetupStatusBadge status={item.delivery_state} label={DELIVERY_LABEL[item.delivery_state]} tone={toneFor(item.delivery_state)} showIcon={item.delivery_state === "DELIVERY_FAILED"} />
                </SetupDataTableCell>
                <SetupDataTableCell className="text-center" actionColumn><SetupActionMenu label={`Aksi pengajuan ${item.resource_label}`} menuLabel={`Aksi pengajuan ${item.resource_label}`} items={[{key:'detail',label:'Lihat detail',icon:Eye,onClick:()=>updateListQuery({submission:item.id})}]} /></SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
        </SetupTableScroll>
        {!error ? <SjCursorNavigation key={`${kind}:${state}`} busy={loading} label="pengajuan" count={items.length} cursor={cursor} next={nextCursor} onNavigate={value => updateListQuery({cursor:value,page:''})} /> : null}
        {error && (cursor || legacyPage) ? <SjSecondaryButton onClick={() => updateListQuery({cursor:'',page:'',submission:''})}>Kembali ke awal daftar</SjSecondaryButton> : null}
      </SjSection> : null}

      {tab === 'changes' ? <SjSection title="Penarikan & pencabutan" description={loading ? 'Memuat permintaan…' : error ? 'Jumlah permintaan belum dapat dimuat.' : `${changeRequests.length} permintaan pada halaman ini · termasuk arsip dan konfirmasi ulang.`}>
        <div aria-label="Filter permintaan perubahan" className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
          <SetupSelect aria-label="Status permintaan perubahan" value={changeState} onChange={event => updateListQuery({changes_state:event.target.value,changes_cursor:'',changes_page:''})}>
            <option value="">Semua status permintaan</option>
            {Object.entries(CHANGE_STATE_LABEL).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </SetupSelect>
          <SetupSelect aria-label="Jenis permintaan perubahan" value={changeAction} onChange={event => updateListQuery({changes_action:event.target.value,changes_cursor:'',changes_page:''})}>
            <option value="">Semua jenis permintaan</option>
            {Object.entries(CHANGE_REQUEST_LABEL).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </SetupSelect>
          {changeState || changeAction ? <SjSecondaryButton onClick={() => updateListQuery({changes_state:'',changes_action:'',changes_cursor:'',changes_page:''})}>Atur ulang permintaan</SjSecondaryButton> : null}
        </div>
        {error ? <DashboardNotice tone="amber" title="Permintaan perubahan belum dapat dimuat" description={error} /> : <>
        <SetupDataTable variant="crud" density="compact" className="[table-layout:fixed]" aria-label="Daftar permintaan perubahan publik">
          <SetupDataTableColGroup><SetupDataTableCol className="w-[36%]" /><SetupDataTableCol className="w-[22%]" /><SetupDataTableCol className="w-[30%]" /><SetupDataTableCol className="w-[12%]" /></SetupDataTableColGroup>
          <SetupDataTableHead><SetupDataTableRow><SetupDataTableHeaderCell>Permintaan</SetupDataTableHeaderCell><SetupDataTableHeaderCell>Diajukan</SetupDataTableHeaderCell><SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell><SetupDataTableHeaderCell className="text-center">Aksi</SetupDataTableHeaderCell></SetupDataTableRow></SetupDataTableHead>
          <SetupDataTableBody>{loading ? <SetupDataTableEmptyRow colSpan={4} state="loading" className={SJ_TABLE_LOADING_CLASS} loadingRows={2} loadingColumns={4}>Memuat permintaan…</SetupDataTableEmptyRow> : changeRequests.length === 0 ? <SetupDataTableEmptyRow colSpan={4} icon={ClipboardList} description="Permintaan penarikan, arsip, atau pencabutan akan tampil di sini.">Belum ada permintaan perubahan</SetupDataTableEmptyRow> : changeRequests.map((request) => <SetupDataTableRow key={request.id}><SetupDataTableCell><SetupTablePrimaryText style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{request.impact.target_label}</SetupTablePrimaryText><SetupTableSecondaryText className="mt-1">{CHANGE_REQUEST_LABEL[request.action]}</SetupTableSecondaryText></SetupDataTableCell><SetupDataTableCell><SetupTablePrimaryText>Versi {request.request_version}</SetupTablePrimaryText><SetupTableSecondaryText className="mt-1">{formatSjDate(request.submitted_at)}</SetupTableSecondaryText></SetupDataTableCell><SetupDataTableCell><SetupStatusBadge status={request.state} label={CHANGE_STATE_LABEL[request.state]} tone={request.state === "COMPLETED" ? "emerald" : ["REJECTED", "FAILED"].includes(request.state) ? "red" : ["IN_REVIEW", "REVISION_REQUIRED", "APPLIED"].includes(request.state) ? "amber" : "slate"} showIcon={["FAILED", "REJECTED"].includes(request.state)} /></SetupDataTableCell><SetupDataTableCell className="text-center"><SetupActionMenu label={`Aksi permintaan ${request.impact.target_label}`} menuLabel={`Aksi permintaan ${request.impact.target_label}`} items={[{key:"detail",label:"Lihat detail",icon:Eye,onClick:()=>openChange(request)}]} /></SetupDataTableCell></SetupDataTableRow>)}</SetupDataTableBody>
        </SetupDataTable>
        <SjCursorNavigation key={`${changeState}:${changeAction}`} busy={loading} label="permintaan perubahan" count={changeRequests.length} cursor={changeCursor} next={changeNextCursor} onNavigate={value => updateListQuery({changes_cursor:value,changes_page:''})} />
        </>}
      </SjSection> : null}

      {error && validTab ? <div className="mt-3"><SjSecondaryButton onClick={()=>void reload()}>Coba lagi</SjSecondaryButton>{tab==='changes'&&(changeCursor||legacyChangePage)?<SjSecondaryButton onClick={()=>updateListQuery({changes_cursor:'',changes_page:'',change:''})}>Kembali ke awal permintaan</SjSecondaryButton>:null}</div> : null}
      {!loading && !error && validTab && detailId && !selected && !selectedChange ? <DashboardNotice tone="amber" title="Detail tidak ada pada halaman ini" description="Periksa filter atau halaman daftar. Tidak ada data lain yang dibuka sebagai pengganti."><SjSecondaryButton onClick={closeDetail}>Tutup rincian</SjSecondaryButton></DashboardNotice> : null}
      </div>

      <DashboardModal
        isOpen={Boolean(selected)}
        onClose={closeDetail}
        maxWidth="3xl"
        title={selected ? selected.resource_label.length > 72 ? `${selected.resource_label.slice(0, 72)}…` : selected.resource_label : "Detail pengajuan"}
        ariaLabel={selected?.resource_label ?? "Detail pengajuan"}
        description={selected ? `${KIND_LABEL[selected.kind]} · ${REQUEST_LABEL[selected.request_kind]} · Versi ${selected.version_number}` : undefined}
        footer={selected?.review_state === "REVISION_REQUIRED" && hasCapability(correctionHref(selected), 'read') && hasCapability(correctionHref(selected), 'update') ? (
          <Link className="uiverse-modal-button uiverse-modal-button--primary" href={correctionHref(selected)} onClick={closeDetail}>Perbaiki pengajuan</Link>
        ) : selected && hasCapability(correctionHref(selected), 'read') ? (
          <Link className="uiverse-modal-button uiverse-modal-button--secondary" href={correctionHref(selected)} onClick={closeDetail}>{selected.kind === 'PROFILE' ? 'Lihat profil BPRS' : selected.kind === 'CONTACT' ? 'Lihat kontak' : 'Lihat publikasi'}</Link>
        ) : undefined}
      >
        {selected ? (
          <div
            className="space-y-5 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30"
            tabIndex={0}
            aria-label="Isi detail pengajuan"
          >
            {selected.resource_label.length > 72 ? <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{selected.resource_label}</p> : null}
            {selected.reviewer_note ? <DashboardNotice tone="amber" title="Catatan pemeriksa" description={selected.reviewer_note} /> : null}
            <DashboardNotice tone="sky" title="Langkah berikutnya" description={submissionNextStep(selected)} />
            <SetupRecordDetailSection title="Status pengajuan" rows={[
              {label:"Pemeriksaan",value:<SjStatusBadge state={selected.review_state} />},
              {label:"Pengiriman ke pemeriksa",value:<SetupStatusBadge status={selected.delivery_state} label={DELIVERY_LABEL[selected.delivery_state]} tone={toneFor(selected.delivery_state)} />},
              {label:"Keputusan di bank",value:<SetupStatusBadge status={selected.bank_application_state} label={APPLICATION_LABEL[selected.bank_application_state]} tone={toneFor(selected.bank_application_state)} showIcon={selected.bank_application_state === "DECISION_REJECTED_BY_BANK"} />},
              {label:"Diajukan",value:<time dateTime={selected.submitted_at}>{formatSjDate(selected.submitted_at)}</time>},
            ]} />
            <SetupRecordDetailSection title={`Data yang diajukan · versi ${selected.version_number}`}
              description="Data saat diajukan, bukan versi publik. Nomor versi bank dan SJ berbeda."
              rows={selectedRows.map(([key,value])=>({label:snapshotLabel(key),value:snapshotValue(value,key),wide:key==='description'||key==='short_description',valueClassName:'[overflow-wrap:anywhere]'}))}
            />
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        isOpen={Boolean(selectedChange)}
        onClose={closeDetail}
        closeDisabled={resubmitting}
        maxWidth="2xl"
        title={selectedChange ? selectedChange.impact.target_label.length > 72 ? `${selectedChange.impact.target_label.slice(0, 72)}…` : selectedChange.impact.target_label : "Detail permintaan perubahan"}
        ariaLabel={selectedChange?.impact.target_label ?? "Detail permintaan perubahan"}
        description={selectedChange ? `${CHANGE_REQUEST_LABEL[selectedChange.action]} · Versi ${selectedChange.request_version}` : undefined}
        footer={canEditRequests && selectedChange?.state === "REVISION_REQUIRED" && sjAction({lock_version:selectedChange.request_version,action_availability:selectedChange.action_availability},'resubmit').reason_code!=='PERMISSION_DENIED' ? <><SjSecondaryButton disabled={resubmitting} onClick={closeDetail}>Batal</SjSecondaryButton><SjPrimaryButton loading={resubmitting} disabled={!sjAction({lock_version:selectedChange.request_version,action_availability:selectedChange.action_availability},'resubmit').available} onClick={() => void resubmit()}><Send className="size-4" aria-hidden="true" />Ajukan ulang</SjPrimaryButton></> : undefined}
      >
        {selectedChange ? <div className="space-y-5">
          {selectedChange.impact.target_label.length > 72 ? <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{selectedChange.impact.target_label}</p> : null}
          <DashboardNotice tone="sky" title="Langkah berikutnya" description={selectedChange.state === 'REVISION_REQUIRED' ? 'Perbaiki alasan sesuai catatan pemeriksa, lalu ajukan ulang jika diizinkan.' : selectedChange.state === 'IN_REVIEW' ? 'Tunggu keputusan pemeriksa. Permintaan ini belum membuktikan perubahan sudah diterapkan.' : selectedChange.state === 'REJECTED' ? 'Permintaan ditolak. Baca catatan pemeriksa sebelum menyiapkan permintaan baru dari data terkait.' : selectedChange.state === 'FAILED' ? 'Penerapan atau pengiriman bermasalah. Minta pengelola memeriksa penyebabnya; jangan membuat permintaan ganda.' : 'Keputusan sudah diterapkan di bank. Status permintaan bukan bukti perubahan sudah terlihat di website SJ.'} />
          {selectedChange.state==='REVISION_REQUIRED'&&!sjAction({lock_version:selectedChange.request_version,action_availability:selectedChange.action_availability},'resubmit').available ? <DashboardNotice tone="amber" title="Belum bisa diajukan ulang" description={sjAction({lock_version:selectedChange.request_version,action_availability:selectedChange.action_availability},'resubmit').reason || 'Muat ulang untuk memeriksa izin dan keadaan terbaru.'} /> : null}
          {selectedChange.reviewer_note ? <DashboardNotice tone="amber" title="Catatan pemeriksa" description={selectedChange.reviewer_note} /> : null}
          <SetupRecordDetailSection title="Rincian permintaan perubahan" rows={[
            ["Status", CHANGE_STATE_LABEL[selectedChange.state]],
            ["Versi data saat diajukan", selectedChange.expected_resource_version == null ? 'Belum tersedia' : String(selectedChange.expected_resource_version)],
            ["Status objek saat diajukan", PUBLICATION_STATE_LABEL[selectedChange.impact.current_state] ?? ENTITY_STATE_LABEL[selectedChange.impact.current_state] ?? "Status belum dikenali"],
            ["Publikasi terdampak", String(selectedChange.impact.affected_publications)],
            ["Media terdampak", String(selectedChange.impact.affected_media)],
            ["Diajukan", formatSjDate(selectedChange.submitted_at)],
            ["Keputusan pemeriksa", selectedChange.decided_at ? formatSjDate(selectedChange.decided_at) : "Belum tersedia"],
            ["Diterapkan bank", selectedChange.applied_at ? formatSjDate(selectedChange.applied_at) : "Belum"],
            ["Permintaan selesai", selectedChange.completed_at ? formatSjDate(selectedChange.completed_at) : "Belum"],
          ].map(([label, value]) => ({label, value, valueClassName:"[overflow-wrap:anywhere]"}))} />
          {selectedChange.impact.blockers.length ? <DashboardNotice tone="amber" title="Ketergantungan terdeteksi" description={selectedChange.impact.blockers.join(" ")} /> : null}
          {relatedChangeHref && hasCapability(relatedChangeHref,'read') ? <Link className="inline-flex min-h-11 items-center font-semibold text-sky-800 underline underline-offset-2" href={relatedChangeHref} onClick={closeDetail}>Lihat data terkait</Link> : null}
          {resubmitError ? <p id="sj-request-error" role="alert" className="text-sm text-rose-700">{resubmitError}</p> : null}
          {selectedChange.state === "REVISION_REQUIRED" ? <label className="block space-y-2 text-sm font-semibold text-slate-700">Alasan yang diperbarui <span className="text-rose-600">*</span><SetupTextarea aria-describedby={resubmitError ? "sj-request-error" : undefined} rows={5} minLength={10} maxLength={1000} disabled={resubmitting || !canEditRequests || !sjAction({lock_version:selectedChange.request_version,action_availability:selectedChange.action_availability},'resubmit').available} value={resubmitReason} onChange={(event) => setResubmitReason(event.target.value)} /></label> : <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Alasan bank</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedChange.reason}</p></div>}
        </div> : null}
      </DashboardModal>
    </DashboardPageShell>
  );
}
