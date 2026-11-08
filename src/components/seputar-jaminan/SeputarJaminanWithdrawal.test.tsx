import { findRowAction } from './rowAction.test-helper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const saveApi=vi.hoisted(()=>({execute:vi.fn(),read:vi.fn()}));
vi.mock('@/services/seputar-jaminan-save.service',()=>({sjSaveService:saveApi}));

const mocks = vi.hoisted(() => ({
  getPublicationPage: vi.fn(), getPublication: vi.fn(), getSettings: vi.fn(),
  unpublishPublication: vi.fn(), publicationCommand: vi.fn(), ensureFeature: vi.fn(), showToast: vi.fn(),
  getPublicObservation: vi.fn(), createPublicationChangeRequest: vi.fn(),
  getTaxonomy: vi.fn(), getProfile: vi.fn(), getContactPage: vi.fn(), getEligibleCollaterals: vi.fn(), getPage: vi.fn(), updatePublication: vi.fn(),
  getMediaBlob: vi.fn().mockRejectedValue(new Error('Preview deliberately unavailable in this action test')),
}));
vi.mock('@/services/seputar-jaminan.service', () => ({seputarJaminanService: mocks}));
vi.mock('@/services/arsip.service', () => ({arsipService: {getPage: mocks.getPage}}));
vi.mock('@/components/ui/AppToastProvider', () => ({useAppToast: () => ({showToast: mocks.showToast})}));
vi.mock('@/hooks/useProtectedAction', () => ({useProtectedAction: () => ({
  ensureFeature: mocks.ensureFeature, ensureCapability: () => true, hasCapability: () => true,
})}));
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn(), replace: vi.fn()}), usePathname: () => '/dashboard/seputar-jaminan/publikasi'}));

import Catalog from './SeputarJaminanCatalogClient';

const version = {id:'approved',version_number:1,state:'APPROVED',title:'Aset versi lama',description:'Informasi aset',
  city_regency:'Bandung',province:'Jawa Barat',media:[],attributes:{},whatsapp_contact:null,
  submitted_at:null,approved_at:null,rejection_reason:null};
const asset = {id:'asset-test',reference_code:'SJ-TEST',source_type:'COLLATERAL',asset_category:'LAND',
  state:'DRAFT',sync_state:'ACKNOWLEDGED',lock_version:7,aggregate_version:1,title:'Draf baru',owner_division:null,
  current_version:{...version,id:'draft',state:'DRAFT',title:'Draf baru'},published_version:version,
  workflow_eligibility:{withdrawal:{eligible:true,reason:null as string | null}}};

async function open(row = asset, authority = 'local') {
  const assessed={...row,action_availability:{scope:'START_ACTION',expected_version:row.lock_version,revalidated_on_submit:true,actions:{
    edit_draft:{available:true,reason:null,reason_code:null,mode:'DIRECT'},
    check_public:{available:true,reason:null,reason_code:null,mode:'DIRECT'},
    submit:{available:false,reason:'Gambar belum siap.',reason_code:'DEPENDENCY_NOT_READY',mode:'DIRECT'},
    unpublish:{available:row.workflow_eligibility.withdrawal.eligible,reason:row.workflow_eligibility.withdrawal.reason,reason_code:row.workflow_eligibility.withdrawal.eligible?null:'WITHDRAWAL_BLOCKED',mode:authority==='central'?'REQUEST_CONTROL':'DIRECT'},
    archive:{available:authority==='central'||row.state==='UNPUBLISHED',reason:authority==='central'||row.state==='UNPUBLISHED'?null:'Tarik dahulu.',reason_code:authority==='central'||row.state==='UNPUBLISHED'?null:'WITHDRAW_FIRST',mode:authority==='central'?'REQUEST_CONTROL':'DIRECT'},
  }}};
  mocks.getPublicationPage.mockResolvedValue({items:[assessed],page_info:{next_cursor:null}});
  mocks.getPublication.mockResolvedValue(assessed);
  mocks.getSettings.mockResolvedValue({review_authority:authority,review_submission_ready:true});
  render(<Catalog/>);
  fireEvent.click(await findRowAction('Lihat detail'));
  await screen.findByRole('dialog');
  await screen.findByText('Belum ada hasil pengecekan');
}

describe('withdrawal from actual catalogue detail', () => {
  it('keeps archive failure beside the reason without a duplicate error toast',async()=>{
    mocks.createPublicationChangeRequest.mockRejectedValueOnce(new Error('Permintaan belum terkirim. Coba lagi.'));
    await open(asset,'central');
    fireEvent.click(screen.getByRole('button',{name:'Aksi publikasi'}));fireEvent.click(screen.getByRole('menuitem',{name:'Ajukan arsip'}));
    fireEvent.change(screen.getByRole('textbox',{name:/Alasan dan dampak/}),{target:{value:'Alasan pengarsipan untuk pemeriksaan.'}});
    fireEvent.click(screen.getByRole('button',{name:'Kirim permintaan'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Permintaan belum terkirim.');
    expect(screen.getByRole('dialog',{name:'Ajukan arsip'})).toBeVisible();
    expect(mocks.createPublicationChangeRequest).toHaveBeenCalledWith('asset-test','ARCHIVE_PUBLICATION',7,'Alasan pengarsipan untuk pemeriksaan.');
    expect(mocks.showToast).not.toHaveBeenCalled();
  });
  it('requires a separate archive confirmation and never calls withdrawal for it',async()=>{
    mocks.publicationCommand.mockResolvedValue({});
    await open({...asset,state:'UNPUBLISHED'});
    fireEvent.click(screen.getByRole('button',{name:'Aksi publikasi'}));fireEvent.click(screen.getByRole('menuitem',{name:'Arsipkan publikasi'}));
    expect(screen.getByText(/dipindahkan ke arsip, bukan dihapus/)).toBeVisible();expect(mocks.publicationCommand).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Ya, arsipkan publikasi'}));await waitFor(()=>expect(mocks.publicationCommand).toHaveBeenCalledWith('asset-test','archive',7));expect(mocks.unpublishPublication).not.toHaveBeenCalled();
  });
  it('never chooses an arbitrary contact, keeps manual selection and shows four ordered sections',async()=>{
    mocks.getTaxonomy.mockResolvedValue({categories:[{code:'LAND',items:[{id:'taxonomy',code:'LAND_TEST',label:'Tanah uji'}]}],vocabularies:{contour:[],road_access:[]}});
    mocks.getProfile.mockResolvedValue({state:'VERIFIED',current_version_id:'profile-v'});
    const contacts=[{id:'a',label:'Kontak A',state:'VERIFIED',current_version_id:'a-v',phone_e164:'+628111111111',is_default:false,revoked_at:null},{id:'b',label:'Kontak dicabut',state:'VERIFIED',current_version_id:'b-v',phone_e164:'+628111111112',is_default:true,revoked_at:'2026-09-27T00:00:00Z'}];
    mocks.getContactPage.mockResolvedValue({items:contacts,page_info:{next_cursor:null}});
    mocks.getSettings.mockResolvedValue({entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{create_publication:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    mocks.getPublicationPage.mockResolvedValue({items:[],page_info:{next_cursor:null}});
    render(<Catalog/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Buat publikasi'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Buat publikasi'}));
    const select=await screen.findByRole('combobox',{name:/Kontak WhatsApp/});expect(select).toHaveValue('');
    expect(screen.queryByRole('option',{name:/Kontak dicabut/})).toBeNull();
    fireEvent.change(select,{target:{value:'a-v'}});fireEvent.change(screen.getByRole('textbox',{name:/Judul publikasi/}),{target:{value:'Judul baru'}});expect(select).toHaveValue('a-v');
    const titles=Array.from(screen.getByRole('dialog').querySelectorAll('h3')).map(el=>el.textContent);
    expect(titles).toEqual(['Data aset','Lokasi dan spesifikasi','Foto','Kontak']);
  });
  it('preselects only an eligible default contact, which can be replaced',async()=>{
    mocks.getTaxonomy.mockResolvedValue({categories:[{code:'LAND',items:[]}],vocabularies:{}});
    mocks.getProfile.mockResolvedValue({state:'VERIFIED',current_version_id:'profile-v'});
    mocks.getContactPage.mockResolvedValue({items:['a','b'].map(id=>({id,label:'Marketing '+id,state:'VERIFIED',current_version_id:id+'-v',phone_e164:'+628111111111',is_default:id==='b',revoked_at:null})),page_info:{next_cursor:null}});
    mocks.getSettings.mockResolvedValue({entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{create_publication:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    mocks.getPublicationPage.mockResolvedValue({items:[],page_info:{next_cursor:null}});
    render(<Catalog/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Buat publikasi'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Buat publikasi'}));
    const select=await screen.findByRole('combobox',{name:/Kontak WhatsApp/});expect(select).toHaveValue('b-v');expect(screen.getByRole('option',{name:/Marketing b.*utama/})).toBeInTheDocument();
    fireEvent.change(select,{target:{value:'a-v'}});expect(select).toHaveValue('a-v');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null,'','/dashboard/seputar-jaminan/publikasi');
    mocks.ensureFeature.mockReturnValue(true);
    mocks.unpublishPublication.mockResolvedValue({});
    mocks.getPublicObservation.mockResolvedValue({scope:'SJ_PUBLIC_API',version_evidence:'UNAVAILABLE',freshness:'CHECK_TIME_ONLY',last_success:null,latest_attempt:null});
  });
  it('preserves the draft warning and sends the displayed version only after confirmation',async()=>{
    await open();
    fireEvent.click(screen.getByRole('button',{name:'Aksi publikasi'}));fireEvent.click(screen.getByRole('menuitem',{name:'Tarik dari website'}));
    expect(screen.getByText(/Draf perubahan tetap tersimpan/)).toBeInTheDocument();
    expect(mocks.unpublishPublication).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Ya, tarik dari website'}));
    await waitFor(()=>expect(mocks.unpublishPublication).toHaveBeenCalledWith('asset-test',7,'OWNER_REQUEST'));
    expect(mocks.ensureFeature).toHaveBeenCalledWith('/dashboard/seputar-jaminan/pengajuan','sj_unpublish');
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('does not send a local command when the feature permission is denied',async()=>{
    mocks.ensureFeature.mockReturnValue(false);
    await open();
    fireEvent.click(screen.getByRole('button',{name:'Aksi publikasi'}));fireEvent.click(screen.getByRole('menuitem',{name:'Tarik dari website'}));
    fireEvent.click(screen.getByRole('button',{name:'Ya, tarik dari website'}));
    expect(mocks.unpublishPublication).not.toHaveBeenCalled();
  });
  it('keeps a conflicting operation open and requires refreshed detail before retry',async()=>{
    mocks.unpublishPublication.mockRejectedValueOnce(new Error('Versi sudah berubah. Muat ulang data.'));
    await open();fireEvent.click(screen.getByRole('button',{name:'Aksi publikasi'}));fireEvent.click(screen.getByRole('menuitem',{name:'Tarik dari website'}));
    fireEvent.click(screen.getByRole('button',{name:'Ya, tarik dari website'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Versi sudah berubah.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();expect(location.search).toContain('detail=asset-test');
    fireEvent.click(screen.getByRole('button',{name:'Muat ulang detail'}));
    await waitFor(()=>expect(mocks.getPublication).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Ya, tarik dari website'})).not.toBeInTheDocument();
  });
  it('does not offer direct withdrawal under central authority',async()=>{
    await open(asset,'central');
    expect(screen.queryByRole('button',{name:'Tarik dari website'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Aksi publikasi'}));
    expect(screen.getByRole('menuitem',{name:'Ajukan penarikan'})).toBeInTheDocument();
    expect(screen.getByRole('menuitem',{name:'Ajukan arsip'})).toBeInTheDocument();
    expect(screen.queryByRole('menuitem',{name:'Tarik dari website'})).not.toBeInTheDocument();
    expect(mocks.unpublishPublication).not.toHaveBeenCalled();
  });
  it('does not offer media removal without the server decision, even with menu permission',async()=>{
    const row={...asset,current_version:{...asset.current_version,media:[{id:'media',file_name:'foto.webp',width:640,height:480,central_ready:true}]}};
    await open(row as typeof asset,'central');
    const button=screen.getByRole('button',{name:'Ajukan pencabutan'});
    expect(button).toBeDisabled();fireEvent.click(button);
    expect(screen.getByRole('dialog',{name:'Draf baru'})).toBeInTheDocument();
    expect(screen.getByText('Muat ulang untuk memeriksa tindakan yang tersedia.')).toBeInTheDocument();
  });
  it('shows the server reason instead of inferring eligibility from an ACK',async()=>{
    const row={...asset,workflow_eligibility:{withdrawal:{eligible:false,reason:'Pemeriksaan perubahan belum selesai.'}}};
    await open(row);
    expect(screen.getByText('Pemeriksaan perubahan belum selesai.')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Tarik dari website'})).not.toBeInTheDocument();
  });
  it('keeps edited input and expected version after a draft save conflict',async()=>{
    mocks.getTaxonomy.mockResolvedValue({categories:[{code:'LAND',items:[{id:'taxonomy',code:'LAND_TEST',label:'Tanah uji'}]}],vocabularies:{contour:[],road_access:[]}});
    mocks.getProfile.mockResolvedValue({state:'VERIFIED',current_version_id:'profile-v'});
    mocks.getContactPage.mockResolvedValue({items:[{id:'contact',label:'Kontak uji',state:'VERIFIED',current_version_id:'contact-v',phone_e164:'+628111111111'}],page_info:{next_cursor:null}});
    mocks.getEligibleCollaterals.mockResolvedValue({items:[]});mocks.getPage.mockResolvedValue({items:[]});
    saveApi.read.mockResolvedValue(null);
    saveApi.execute.mockRejectedValueOnce(Object.assign(new Error('Versi sudah berubah. Muat ulang data.'),{response:{status:409}}));
    const row={...asset,current_version:{...asset.current_version,subcategory:'LAND_TEST',profile_version_id:'profile-v',description:'Deskripsi publik untuk pengujian konflik.',attributes:{land_area_m2:120},whatsapp_contact:{id:'contact',version_id:'contact-v',label:'Kontak uji',phone_ending:'1111'},media:[{id:'photo',file_name:'photo.png',state:'READY',central_ready:true,is_cover:true,alt_text:'Tanah untuk uji',mime_type:'image/png',width:400,height:300,size_bytes:500}]}};
    await open(row as unknown as typeof asset);fireEvent.click(screen.getByRole('button',{name:'Ajukan perubahan'}));
    const input=await screen.findByRole('textbox',{name:/Judul publikasi/});fireEvent.change(input,{target:{value:'Perubahan belum tersimpan'}});
    fireEvent.click(screen.getByRole('button',{name:'Simpan draf'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Versi sudah berubah.');
    expect(input).toHaveValue('Perubahan belum tersimpan');expect(saveApi.execute).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({kind:'PUBLICATION',intent:'SAVE_DRAFT',resource_id:'asset-test',draft:expect.objectContaining({expected_version:7,title:'Perubahan belum tersimpan'})}));
    expect(screen.getByRole('dialog',{name:'Ajukan perubahan publikasi'})).toBeInTheDocument();
    expect(mocks.getPublicationPage).toHaveBeenCalledTimes(1);
  });
  it('binds a new edit to the current approved profile without changing the old snapshot',async()=>{
    mocks.getTaxonomy.mockResolvedValue({categories:[{code:'LAND',items:[{id:'taxonomy',code:'LAND_TEST',label:'Tanah uji'}]}],vocabularies:{contour:[],road_access:[]}});
    mocks.getProfile.mockResolvedValue({state:'VERIFIED',current_version_id:'profile-v2',display_name:'Profil yang disetujui terbaru'});
    mocks.getContactPage.mockResolvedValue({items:[{id:'contact',label:'Kontak uji',state:'VERIFIED',current_version_id:'contact-v',phone_e164:'+628111111111'}],page_info:{next_cursor:null}});
    mocks.getEligibleCollaterals.mockResolvedValue({items:[]});mocks.getPage.mockResolvedValue({items:[]});
    saveApi.read.mockResolvedValue(null);
    saveApi.execute.mockRejectedValueOnce(Object.assign(new Error('Konflik tes; isian dipertahankan.'),{response:{status:409}}));
    const row={...asset,current_version:{...asset.current_version,subcategory:'LAND_TEST',profile_version_id:'profile-v1',description:'Deskripsi publik untuk pengujian profil lama.',attributes:{land_area_m2:120},whatsapp_contact:{id:'contact',version_id:'contact-v',label:'Kontak uji',phone_ending:'1111'},media:[{id:'photo',file_name:'photo.png',state:'READY',central_ready:true,is_cover:true,alt_text:'Tanah untuk uji',mime_type:'image/png',width:400,height:300,size_bytes:500}]}};
    await open(row as unknown as typeof asset);fireEvent.click(screen.getByRole('button',{name:'Ajukan perubahan'}));
    await screen.findByText('Profil yang disetujui terbaru');fireEvent.click(screen.getByRole('button',{name:'Simpan draf'}));
    await waitFor(()=>expect(saveApi.execute).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({kind:'PUBLICATION',intent:'SAVE_DRAFT',draft:expect.objectContaining({profile_version_id:'profile-v2',expected_version:7})})));
    expect(row.current_version.profile_version_id).toBe('profile-v1');
    expect(saveApi.execute).toHaveBeenCalledTimes(1);
  });
});
