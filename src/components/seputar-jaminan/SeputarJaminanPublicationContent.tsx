"use client";

import { ImageOff } from 'lucide-react';
import type { ReactNode } from 'react';
import SetupRecordDetailSection from '@/components/ui/SetupRecordDetailSection';
import SetupStatusBadge from '@/components/ui/SetupStatusBadge';
import { formatSjDate } from './presentation';
import type { SjObservationEvidence, SjPublication, SjPublicationVersion } from '@/types/seputar-jaminan.types';
import { ATTRIBUTE_LABEL, CATEGORY_LABEL, VOCABULARY_LABEL } from './SeputarJaminanUI';
import { SjMediaPreview } from './SeputarJaminanMedia';

export function SjPublicationThumbnail({publication}:{publication:SjPublication}) {
  return publication.cover?.id ? <SjMediaPreview compact mediaId={publication.cover.id} alt={`Foto ${publication.title || publication.reference_code}`} className="h-16 w-20 shrink-0" />
    : <div role="img" aria-label="Belum ada foto aset" className="flex h-16 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"><ImageOff aria-hidden="true" className="size-5"/><span className="text-[10px]">Tanpa foto</span></div>;
}

type MediaAction = (media: SjPublicationVersion['media'][number]) => ReactNode;
export function SjPublicationListObservation({publication,onInspect}:{publication:SjPublication;onInspect:()=>void}) {
  const summary=publication.observation_summary,success=summary?.last_success,latest=summary?.latest_attempt;
  const label=success?.state==='AVAILABLE'?'Tampil saat dicek':success?.state==='NOT_FOUND'?'Tidak tampil saat dicek':latest?.state==='FAILED'?'Belum bisa dicek':latest?.state==='PENDING'?'Pengecekan berlangsung':null;
  return <div className="space-y-1">
    {label?<SetupStatusBadge status={success?.state||latest?.state||'UNKNOWN'} label={label} tone={success?.state==='AVAILABLE'?'emerald':'slate'} wrap/>:null}
    {success?.checked_at?<p className="text-xs text-slate-600">{formatSjDate(success.checked_at)}</p>:null}
    {success&&latest?.state==='FAILED'?<p className="text-xs text-amber-800">Pengecekan terbaru gagal. Hasil sebelumnya tetap ditampilkan.</p>:null}
    <button type="button" onClick={onInspect} className="min-h-11 text-left text-sm font-semibold text-[#1773B0] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{label?'Rincian pengecekan':'Lihat hasil pengecekan'}</button>
  </div>;
}
function VersionContent({version,label,mediaAction}:{version:SjPublicationVersion|null;label:string;mediaAction?:MediaAction}) {
  if(!version)return <section aria-label={label} className="space-y-2 rounded-lg border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">{label}</h3><p className="text-sm text-slate-600">Data versi belum tersedia.</p></section>;
  const entries=Object.entries(version.attributes).filter(([key,value])=>Object.hasOwn(ATTRIBUTE_LABEL,key)&&value!==null&&value!==undefined&&value!=='');
  return <section aria-label={label} className="min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
    <div><h3 className="text-sm font-semibold text-slate-900">{label} · versi {version.version_number}</h3><p className="mt-1 break-words text-base font-bold text-slate-900 [overflow-wrap:anywhere]">{version.title || 'Judul belum diisi'}</p></div>
    <SetupRecordDetailSection title="Informasi aset" rows={[
      {label:'Lokasi',value:[version.city_regency,version.province].filter(Boolean).join(', ')||'Belum diisi'},
      {label:'Kontak terkait',value:version.whatsapp_contact?`${version.whatsapp_contact.label} · nomor berakhir ${version.whatsapp_contact.phone_ending}`:'Belum ada kontak pada versi ini'},
      {label:'Deskripsi',value:version.description||'Belum diisi',wide:true},
      ...entries.map(([key,value])=>({label:ATTRIBUTE_LABEL[key],value:typeof value==='string'?VOCABULARY_LABEL[value]||value:String(value)})),
    ].map(row=>({...row,valueClassName:'[overflow-wrap:anywhere]'}))} />
    {version.media.length?<ul aria-label={`Foto ${label.toLowerCase()}`} className="grid min-w-0 gap-4 sm:grid-cols-2">{version.media.map((media,index)=><li key={media.id} className="min-w-0 space-y-2"><SjMediaPreview mediaId={media.id} alt={media.alt_text||`Foto aset ${index+1}`} fit="contain" className="aspect-[4/3] w-full"/><p className="break-words text-sm text-slate-700 [overflow-wrap:anywhere]">{media.is_cover?'Foto utama · ':''}{media.alt_text||media.file_name}</p><p className="break-words text-xs text-slate-500">{media.file_name} · {media.width}×{media.height}px · {media.central_ready?'Media tercatat siap di SJ':'Media belum tercatat siap di SJ'}</p>{mediaAction?.(media)}</li>)}</ul>:<p className="flex items-center gap-2 text-sm text-slate-500"><ImageOff aria-hidden="true" className="size-5"/>Belum ada foto pada versi ini.</p>}
  </section>;
}

export default function SjPublicationContent({publication,mediaAction}:{publication:SjPublication;mediaAction?:MediaAction}) {
  const different=publication.current_version?.id!==publication.published_version?.id;
  return <div className="min-w-0 space-y-4">
    <p className="text-sm text-slate-600">{CATEGORY_LABEL[publication.asset_category]} · {publication.source_type==='COLLATERAL'?'Agunan Ruwang':'Input manual dengan dokumen bukti'}</p>
    <p className="text-sm text-slate-600">Isi yang tersedia di SJ dicatat terpisah di hasil pemeriksaan publik. Versi bank di bawah bukan bukti penayangan.</p>
    {different&&publication.published_version?<p className="text-sm font-medium text-amber-800">Ada versi kerja yang berbeda. Perubahan ini belum menggantikan versi yang disetujui di bank.</p>:null}
    <VersionContent label="Versi kerja di bank" version={publication.current_version} mediaAction={mediaAction}/>
    {different&&publication.published_version?<VersionContent label="Versi disetujui di bank" version={publication.published_version}/>:<p className="text-sm text-slate-600">{publication.published_version?'Versi kerja sama dengan versi yang disetujui di bank. Penayangan tetap diperiksa secara terpisah.':'Belum ada versi yang disetujui di bank.'}</p>}
  </div>;
}

export function SjPublicationObservationContext({evidence}:{evidence:SjObservationEvidence|null}){
  const fact=evidence?.last_success,snapshot=fact?.state==='AVAILABLE'?fact.publication_snapshot:null;
  if(!snapshot)return null;
  const categories={TANAH:'Tanah',BANGUNAN:'Bangunan',MESIN_PERALATAN:'Mesin dan peralatan',KENDARAAN:'Kendaraan'};
  return <section aria-label="Isi aset saat dicek" className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
    <h3 className="font-semibold text-slate-900">Isi aset saat dicek</h3>
    <p className="break-words font-semibold [overflow-wrap:anywhere]">{snapshot.title}</p>
    <p className="break-words">{categories[snapshot.category]} · {snapshot.city_regency}, {snapshot.province}</p>
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{snapshot.description}</p>
    <SetupRecordDetailSection title="Spesifikasi saat dicek" rows={Object.entries(snapshot.attributes).map(([key,value])=>({label:ATTRIBUTE_LABEL[key]||key,value:typeof value==='string'?VOCABULARY_LABEL[value]||value:String(value),valueClassName:'[overflow-wrap:anywhere]'}))} />
    <p>{snapshot.photo_count} foto tercatat saat dicek. Foto dan kontak terkini dapat dilihat di SJ.</p>
    <p className="text-xs text-slate-500">{fact?.observed_version?`Versi pengiriman SJ: ${fact.observed_version}. Ini bukan nomor revisi draf bank.`:'SJ belum memberikan nomor versi untuk hasil ini.'} Data ini salinan hasil pemeriksaan, bukan jaminan masih tersedia sekarang.</p>
    {snapshot.public_page_url?<a href={snapshot.public_page_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-700 underline underline-offset-4">Buka aset di SJ <span className="sr-only">(tab baru)</span></a>:<p className="text-slate-500">Tautan website SJ belum tersedia.</p>}
  </section>;
}
