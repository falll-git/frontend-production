"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import { formatSjDate } from './presentation';
import {RefreshCw} from 'lucide-react';
import SetupState from '@/components/ui/SetupState';
import {useProtectedAction} from '@/hooks/useProtectedAction';
import {seputarJaminanService} from '@/services/seputar-jaminan.service';
import type {SjObservationEvidence, SjProfile, SjActionAvailability} from '@/types/seputar-jaminan.types';
import {sjAction} from './actionAvailability';
import { SjProfileObservationContext } from './SeputarJaminanProfileContext';
import { SjPublicationObservationContext } from './SeputarJaminanPublicationContent';
import {SjSecondaryButton,SJ_PROFILE,SJ_PUBLICATIONS,readableError} from './SeputarJaminanUI';

export default function SeputarJaminanObservation({kind,id,profile,subject}:{kind:'profile'|'publication';id:string;profile?:SjProfile;subject?:{lock_version:number;action_availability?:SjActionAvailability}}){
  const [evidence,setEvidence]=useState<SjObservationEvidence|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const sequence=useRef(0),{hasCapability}=useProtectedAction();
  const load=useCallback(async(check=false)=>{
    const request=++sequence.current;setBusy(true);setError(null);
    try{const result=await (check?seputarJaminanService.checkPublicObservation(kind,id):seputarJaminanService.getPublicObservation(kind,id));
      if(request===sequence.current)setEvidence(result);
    }catch(e){if(request===sequence.current)setError(readableError(e));}
    finally{if(request===sequence.current)setBusy(false);}
  },[kind,id]);
  const invalidateLoad=useCallback(()=>{sequence.current++;},[]);
  useEffect(()=>{setEvidence(null);void load();return invalidateLoad;},[load,invalidateLoad]);
  const success=evidence?.last_success,latest=evidence?.latest_attempt;
  const time=success?.checked_at?formatSjDate(success.checked_at):null;
  const attemptTime=latest?formatSjDate(latest.checked_at||latest.started_at):null;
  const checkAction=sjAction(subject??profile,'check_public');
  const canCheck=hasCapability(kind==='profile'?SJ_PROFILE:SJ_PUBLICATIONS,'update')&&checkAction.reason_code!=='PERMISSION_DENIED';
  return <section aria-label="Pemeriksaan ketersediaan publik" aria-busy={busy} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
    {kind==='profile' && profile ? <SjProfileObservationContext profile={profile} evidence={evidence} /> : null}
    {kind==='publication'?<SjPublicationObservationContext evidence={evidence}/>:null}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-slate-900">Ketersediaan di SJ</h3>
      {canCheck?<SjSecondaryButton disabled={busy||!checkAction.available} onClick={()=>void load(true)}>
        <RefreshCw aria-hidden="true" className="size-4" />{busy?'Memeriksa…':'Cek sekarang'}
      </SjSecondaryButton>:null}
    </div>
    <div aria-live="polite" className="space-y-1 text-sm text-slate-600">
      {canCheck&&!checkAction.available?<p>{checkAction.reason}</p>:null}
      {success?<p className="break-all text-xs">{success.public_identity}</p>:null}
      {!evidence && busy ? <SetupState compact variant="loading" title="Memuat hasil pengecekan…" /> : !evidence && error ? null : <p className="font-medium text-slate-900"><span>{success?success.state==='AVAILABLE'?'Tampil saat dicek':'Tidak ditemukan saat dicek':'Belum ada hasil pengecekan'}</span>{time&&success?.checked_at?<> · <time dateTime={success.checked_at}>{time}</time></>:null}</p>}
      {latest?.state==='FAILED'?<p className="text-amber-800">{latest.failure_code==='TIMEOUT'?'Belum bisa dicek: waktu tunggu habis.':latest.failure_code==='IDENTITY_UNCONFIRMED'?'Belum bisa dicek: identitas BPRS belum cocok.':'Pengecekan terbaru gagal.'}{success?' Hasil sebelumnya tetap ditampilkan.':null}</p>:null}
      {latest?.state==='PENDING'?<p>Pengecekan belum selesai.</p>:null}
      {latest&&attemptTime&&['FAILED','PENDING'].includes(latest.state)?<p>{latest.state==='PENDING'?'Mulai diperiksa':'Percobaan terbaru'}: <time dateTime={latest.checked_at||latest.started_at}>{attemptTime}</time></p>:null}
      <p className="text-xs">Hasil dari layanan publik SJ, berlaku saat dicek.{evidence?.version_evidence==='UNAVAILABLE'?' Versi publik belum bisa dicocokkan.':''}{kind==='profile'?' Status aset dicek terpisah.':''}</p>
      {error?<p role="alert">Belum bisa dicek. {error}{success?' Hasil sebelumnya tetap ditampilkan.':''} <button type="button" className="min-h-11 font-semibold underline" disabled={busy} onClick={()=>void load()}>Muat ulang</button></p>:null}
    </div>
  </section>;
}
