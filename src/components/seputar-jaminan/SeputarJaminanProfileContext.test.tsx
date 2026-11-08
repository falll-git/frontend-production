import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it} from 'vitest';
import type {SjContact,SjObservationEvidence,SjProfile} from '@/types/seputar-jaminan.types';
import {SjContactContext,SjContactDetails,SjProfileObservationContext,SjProfilePreparation} from './SeputarJaminanProfileContext';
import {SjProfileVersions} from './SeputarJaminanWorkflow';

const profile={id:'p',state:'VERIFIED',display_name:'Nama BPRS '.repeat(30),public_slug:'bprs-uji',city_regency:'Bandung',province:'Jawa Barat',short_description:'Layanan untuk masyarakat',logo_media_id:'logo',logo_ready:true,lock_version:3} as SjProfile;
const fact={id:'f',state:'AVAILABLE',started_at:'2026-09-22T01:00:00Z',checked_at:'2026-09-22T01:00:01Z',source_origin:'https://api.example',public_identity:'bprs-uji',institution_slug:'bprs-uji',observed_version:null,failure_code:null} as const;
const evidence={scope:'SJ_PUBLIC_API',version_evidence:'UNAVAILABLE',freshness:'CHECK_TIME_ONLY',last_success:fact,latest_attempt:fact} as SjObservationEvidence;
const contact={id:'c',label:'Kontak '.repeat(30),phone_e164:'+628123456789',state:'VERIFIED',sync_state:'ACKNOWLEDGED',lock_version:2,approved_version:{id:'v1',version_number:1,label:'Layanan lama',phone_e164:'+628111112222',checksum:'test'},pending_version:{id:'v2',version_number:2,state:'IN_REVIEW',label:'Perubahan',phone_e164:'+628333334444',checksum:'test'}} as SjContact;

it('does not promote bank approval or ACK to a public profile',()=>{
  render(<SjProfileObservationContext profile={profile} evidence={null}/>);
  expect(screen.getByText('Penayangan profil belum terkonfirmasi')).toBeVisible();
  expect(screen.queryByText('Profil ditemukan saat pemeriksaan terakhir')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('preserves old positive evidence with a hidden profile, pending revision and failed latest check',()=>{
  render(<SjProfileObservationContext profile={{...profile,state:'HIDDEN',pending_version:{id:'v9',version_number:9,state:'IN_REVIEW',payload:{public_name:'Perubahan baru'},checksum:'test'}}} evidence={{...evidence,latest_attempt:{...fact,state:'FAILED',failure_code:'TIMEOUT'}}}/>);
  expect(screen.getByText('Profil ditemukan saat pemeriksaan terakhir')).toBeVisible();
  expect(screen.getByText(/Data profil dari pengecekan terakhir/)).toBeVisible();
  expect(screen.getByText(/Perubahan versi 9 masih diproses/)).toBeVisible();
  expect(screen.getByText(/Profil disembunyikan di bank/)).toBeVisible();
  expect(screen.getByText(/Detail versi publik dan tautan profil belum tersedia/)).toBeVisible();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('renders a negative completed check distinctly from unknown',()=>{
  render(<SjProfileObservationContext profile={profile} evidence={{...evidence,last_success:{...fact,state:'NOT_FOUND'}}}/>);
  expect(screen.getByText('Profil tidak ditemukan saat pemeriksaan terakhir')).toBeVisible();
});
it('renders actual public snapshot separately from newer bank draft and preserves it after timeout',()=>{
  const observed={...fact,observed_version:7,profile_snapshot:{public_name:'Nama publik sebelumnya',short_description:'Deskripsi publik',office_city_regency:'Bandung',office_province:'Jawa Barat',published_asset_count:0,public_page_url:'https://catalog.example/bprs/bprs-uji'}};
  render(<SjProfileObservationContext profile={{...profile,display_name:'Draf yang belum disetujui'}} evidence={{...evidence,version_evidence:'SOURCE_PROFILE_EVENT',last_success:observed,latest_attempt:{...fact,state:'FAILED',failure_code:'TIMEOUT'}}}/>);
  expect(screen.getByText('Nama publik sebelumnya')).toBeVisible();
  expect(screen.queryByText('Draf yang belum disetujui')).not.toBeInTheDocument();
  expect(screen.getByText('0 aset tersedia saat pemeriksaan.')).toBeVisible();
  expect(screen.getByText(/Versi pengiriman SJ 7/)).toBeVisible();
  expect(screen.getByRole('link',{name:/Buka profil di SJ/})).toHaveAttribute('href','https://catalog.example/bprs/bprs-uji');
});
it('shows partial identity, media readiness and denied next step without invented percentage',()=>{
  render(<SjProfilePreparation profile={{...profile,state:'DRAFT',display_name:'',logo_media_id:'',logo_ready:false,action_availability:{scope:'START_ACTION',expected_version:3,revalidated_on_submit:true,actions:{submit:{available:false,reason:'Logo belum siap.',reason_code:'LOGO_NOT_READY',mode:'DIRECT'}}}}}/>);
  expect(screen.getByText('Belum diisi: Nama BPRS, Logo.')).toBeVisible();
  expect(screen.getByText('Logo belum siap.')).toBeVisible();
  expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
});
it('separates contact verification and delivery with no disclosure and bank versions distinct',()=>{
  const {container}=render(<><SjContactContext contact={contact}/><SjContactDetails contact={contact}/></>);
  expect(screen.getByText('Pemeriksaan kontak')).toBeVisible();
  expect(screen.getByText('Pengiriman ke SJ')).toBeVisible();
  expect(container.querySelector('details, summary')).toBeNull();
  expect(screen.getByText(/Disetujui di bank: versi 1/)).toBeVisible();
  expect(screen.getByText(/nomor berakhir 2222/)).toBeVisible();
  expect(screen.queryByText('+628111112222')).not.toBeInTheDocument();
  expect(screen.getByText(/Perubahan versi 2 belum menggantikan/)).toBeVisible();
  expect(screen.queryByText(/Rincian pemakai/)).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('shows server-owned usage restriction, not a guessed count',async()=>{
  render(<SjContactContext contact={{...contact,action_availability:{scope:'START_ACTION',expected_version:2,revalidated_on_submit:true,actions:{revoke:{available:false,reason:'Kontak masih dipakai versi yang disetujui.',reason_code:'CONTACT_IN_USE',mode:'REQUEST_CONTROL'}}}}}/>);
  expect(screen.getByText('Kontak masih dipakai. Ganti kontak pada publikasi terkait sebelum mencabutnya.')).toBeVisible();
  expect(screen.queryByText(/0 publikasi/)).not.toBeInTheDocument();
});
it('keeps revoked contact and failed delivery distinct with no approved content',async()=>{
  render(<><SjContactContext contact={{...contact,state:'REVOKED',sync_state:'FAILED',approved_version:null,pending_version:null}}/><SjContactDetails contact={{...contact,state:'REVOKED',sync_state:'FAILED',approved_version:null,pending_version:null}}/></>);
  expect(screen.getByText('Belum ada versi kontak yang disetujui di bank.')).toBeVisible();
  expect(screen.getByText('Kontak sudah dicabut di bank dan tidak dapat dipilih lagi.')).toBeVisible();
});
it('distinguishes fields absent in an older profile snapshot from explicitly empty fields',async()=>{
  render(<SjProfileVersions profile={{...profile,approved_version:{id:'old',version_number:1,payload:{public_name:'Nama versi lama',website_url:null},checksum:'test'},pending_version:{id:'new',version_number:2,state:'DRAFT',payload:{public_name:'Nama perubahan',website_url:'https://example.test',office_city_regency:'Bandung'},checksum:'test-new'}}}/>);
  await userEvent.click(screen.getByRole('button',{name:'Bandingkan versi'}));
  expect(screen.getAllByText('Tidak tercatat pada versi ini.').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Belum diisi')).toHaveLength(1);
  expect(screen.queryByText(profile.public_slug)).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Kota / kabupaten'})).toBeVisible();
  expect(screen.queryByText('Kota / kabupaten · Berbeda')).not.toBeInTheDocument();
});

it('omits profile comparisons without two versions and for identical content with different version IDs',()=>{
  const payload={public_name:'BPRS',short_description:'Deskripsi',public_mark:'same-logo'};
  const approved={id:'old',version_number:1,payload,checksum:'old'};
  const {rerender}=render(<SjProfileVersions profile={{...profile,approved_version:approved,pending_version:null}}/>);
  expect(screen.queryByRole('button',{name:'Bandingkan versi'})).not.toBeInTheDocument();
  rerender(<SjProfileVersions profile={{...profile,approved_version:approved,pending_version:{...approved,id:'new',version_number:2,checksum:'new',state:'IN_REVIEW',payload:{...payload,profile_updated_at:'2026-09-27'}}}}/>);
  expect(screen.queryByRole('button',{name:'Bandingkan versi'})).not.toBeInTheDocument();
});

it('compares only changed profile fields and logo without leaking raw media IDs',async()=>{
  const payload={public_name:'Tetap sama',public_mark:'old-private-id',short_description:'Lama'};
  render(<SjProfileVersions profile={{...profile,approved_version:{id:'a',version_number:1,payload,checksum:'a'},pending_version:{id:'b',version_number:2,state:'IN_REVIEW',payload:{...payload,public_mark:'new-private-id',short_description:'Baru'},checksum:'b'}}}/>);
  await userEvent.click(screen.getByRole('button',{name:'Bandingkan versi'}));
  expect(screen.getByText('Deskripsi · Berbeda')).toBeVisible();
  expect(screen.getByText('Logo · Berbeda')).toBeVisible();
  expect(screen.queryByText('Tetap sama')).not.toBeInTheDocument();
  expect(screen.queryByText(/private-id/)).not.toBeInTheDocument();
});

it('does not equate bank and SJ logo identifiers',()=>{
  render(<SjProfileVersions profile={{...profile,approved_version:{id:'a',version_number:1,payload:{public_mark:'same-text'},checksum:'a'},pending_version:{id:'b',version_number:2,state:'DRAFT',payload:{logo_media_id:'same-text'},checksum:'b'}}}/>);
  expect(screen.getByText('Logo kedua versi belum bisa dibandingkan dari data yang tersedia.')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Bandingkan versi'})).not.toBeInTheDocument();
});
