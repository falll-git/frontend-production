"use client";

import type { SjContact, SjObservationEvidence, SjProfile } from '@/types/seputar-jaminan.types';
import { SjStatusBadge } from './SeputarJaminanUI';
import { sjAction } from './actionAvailability';

export function SjProfileObservationContext({ profile, evidence }: { profile: SjProfile; evidence: SjObservationEvidence | null }) {
  const fact = evidence?.last_success;
  const available = fact?.state === 'AVAILABLE';
  const snapshot = available ? fact.profile_snapshot : null;
  return <div className="space-y-2 border-b border-slate-200 pb-3">
    <h3 className="text-base font-semibold text-slate-900">{available ? 'Profil ditemukan saat pemeriksaan terakhir' : fact?.state === 'NOT_FOUND' ? 'Profil tidak ditemukan saat pemeriksaan terakhir' : 'Penayangan profil belum terkonfirmasi'}</h3>
    <p className="text-sm leading-6 text-slate-600">{available
      ? 'Data profil dari pengecekan terakhir.'
      : 'Pratinjau profil kerja bukan bukti profil sudah tampil.'}</p>
    {snapshot ? <section aria-label="Profil publik saat dicek" className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 break-words">
      <h4 className="font-semibold text-slate-900">Profil publik saat dicek</h4>
      <p className="font-medium">{snapshot.public_name}</p>
      <p>{snapshot.short_description}</p>
      <p>{snapshot.office_city_regency}, {snapshot.office_province}</p>
      <p>{snapshot.published_asset_count} aset tersedia saat pemeriksaan.</p>
      <p>{fact?.observed_version ? `Versi pengiriman SJ ${fact.observed_version}. Nomor ini bukan nomor revisi draf bank.` : 'Nomor versi belum tersedia dari SJ.'}</p>
      {snapshot.public_page_url ? <a href={snapshot.public_page_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center font-semibold text-sky-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-sky-600">Buka profil di SJ<span className="sr-only"> (tab baru)</span></a>
        : <p>Alamat website profil belum tersedia. Hasil pemeriksaan tetap tersimpan.</p>}
    </section> : available ? <p className="text-sm text-slate-600">Detail versi publik dan tautan profil belum tersedia dari hasil pemeriksaan.</p> : null}
    {profile.pending_version ? <p className="text-sm text-slate-700">Perubahan versi {profile.pending_version.version_number} masih diproses di bank. Hasil pemeriksaan publik tidak otomatis berlaku untuk perubahan ini.</p> : null}
    {profile.state === 'HIDDEN' ? <p className="text-sm font-medium text-amber-800">Profil disembunyikan di bank. Periksa hasil terbaru untuk mengetahui keadaan di SJ; hasil lama tetap menjadi catatan.</p> : null}
  </div>;
}

export function SjProfilePreparation({ profile }: { profile: SjProfile }) {
  const missing = [!profile.display_name?.trim() && 'Nama BPRS', !profile.public_slug?.trim() && 'Alamat profil',
    !profile.city_regency?.trim() && 'Kota/kabupaten', !profile.province?.trim() && 'Provinsi',
    !profile.short_description?.trim() && 'Deskripsi', !profile.logo_media_id && 'Logo'].filter(Boolean);
  const action = sjAction(profile, profile.state === 'DRAFT' ? 'submit' : 'edit_draft');
  return <section aria-label="Kelengkapan profil" className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
    <h3 className="font-semibold text-slate-900">Persiapan profil</h3>
    <p>{missing.length ? `Belum diisi: ${missing.join(', ')}.` : 'Identitas dasar sudah diisi.'}</p>
    <p>{profile.logo_ready ? 'Logo siap digunakan.' : 'Logo belum siap. Periksa unggahannya.'}</p>
    <p>{profile.state === 'IN_REVIEW' ? 'Pengajuan sedang diperiksa. Tunggu keputusan; tidak perlu mengirim ulang.'
      : profile.state === 'HIDDEN' ? 'Profil disembunyikan di bank. Tindakan selanjutnya mengikuti izin dan keputusan yang tersedia.'
        : action.available ? profile.state === 'DRAFT' ? 'Langkah berikutnya: ajukan profil untuk diperiksa.' : 'Anda dapat menyiapkan perubahan melalui tombol yang tersedia.'
          : action.reason || 'Muat ulang untuk memeriksa tindakan yang tersedia.'}</p>
  </section>;
}

export function SjContactContext({ contact, showUsageReason=true, compact=false }: { contact: SjContact; showUsageReason?: boolean; compact?: boolean }) {
  const revoke = sjAction(contact, 'revoke');
  return <div className="space-y-2 text-left">
    <div>{!compact ? <p className="mb-1 text-xs text-slate-500">Pemeriksaan kontak</p> : null}<SjStatusBadge state={contact.state} /></div>
    {(!compact || contact.sync_state !== 'NOT_QUEUED') ? <div><p className="mb-1 text-xs text-slate-500">Pengiriman ke SJ</p><SjStatusBadge state={contact.sync_state} kind="sync" /></div> : null}
    {!compact && showUsageReason && revoke.reason_code === 'CONTACT_IN_USE' ? <p className="text-sm text-amber-800">Kontak masih dipakai. Ganti kontak pada publikasi terkait sebelum mencabutnya.</p> : null}
  </div>;
}

export function SjContactDetails({ contact }: { contact: SjContact }) {
  const revoke = sjAction(contact, 'revoke');
  return <section aria-label="Versi dan pemakaian" className="space-y-2 text-sm text-slate-600 break-words [overflow-wrap:anywhere]">
        <h3 className="font-semibold text-slate-900">Versi dan pemakaian</h3>
        {contact.is_default ? <p>Kontak utama menjadi pilihan awal saat membuat publikasi. Kontak tiap publikasi tetap dipilih terpisah.</p> : null}
        {contact.approved_version ? <p>Disetujui di bank: versi {contact.approved_version.version_number} · {contact.approved_version.label} · nomor berakhir {contact.approved_version.phone_e164.slice(-4)}.</p> : <p>Belum ada versi kontak yang disetujui di bank.</p>}
        {contact.pending_version && contact.approved_version ? <p>Perubahan versi {contact.pending_version.version_number} belum menggantikan versi yang disetujui.</p> : null}
        {revoke.reason_code === 'CONTACT_IN_USE' ? <p>Masih dipakai publikasi. Rincian pemakai belum tersedia.</p> : null}
        {contact.state === 'REVOKED' ? <p>Kontak sudah dicabut di bank dan tidak dapat dipilih lagi.</p> : null}
  </section>;
}
