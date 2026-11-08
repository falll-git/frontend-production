import { findRowAction } from './rowAction.test-helper';
import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from "vitest";
import SeputarJaminanProfileContactClient from "./SeputarJaminanProfileContactClient";
const saveApi=vi.hoisted(()=>({execute:vi.fn(),read:vi.fn()}));
vi.mock('@/services/seputar-jaminan-save.service',()=>({sjSaveService:saveApi}));

const service=vi.hoisted(()=>({getProfile:vi.fn(),getMediaRecord:vi.fn(),getMediaBlob:vi.fn(),getSettings:vi.fn(),getContacts:vi.fn(),getContact:vi.fn(),getContactPage:vi.fn(),contactCommand:vi.fn(),getHistory:vi.fn(),saveProfile:vi.fn(),profileCommand:vi.fn(),createContact:vi.fn(),updateContact:vi.fn(),uploadMedia:vi.fn()}));
vi.mock("@/services/seputar-jaminan.service",()=>({seputarJaminanService:service}));
vi.mock("@/hooks/useProtectedAction",()=>({useProtectedAction:()=>({hasCapability:()=>true,hasFeature:()=>false,ensureCapability:()=>true})}));
vi.mock("@/components/ui/AppToastProvider",()=>({useAppToast:()=>({showToast:vi.fn()})}));
describe("SJ profile read errors",()=>{
  beforeEach(()=>{
    saveApi.read.mockResolvedValue(null);
    window.history.replaceState(null,'','/dashboard/seputar-jaminan/kontak');
    service.getProfile.mockResolvedValue(null);
    service.getMediaRecord.mockResolvedValue(null);
    service.getMediaBlob.mockRejectedValue(new Error('Pratinjau tidak tersedia.'));
    service.getSettings.mockResolvedValue({review_authority:"local"});
    service.getHistory.mockResolvedValue({items:[],page_info:{next_cursor:null}});
    service.getContact.mockImplementation(async id => (await service.getContactPage()).items.find((contact:{id:string})=>contact.id===id));
  });
  it('keeps the same focused search input while an actual typing request is pending',async()=>{
    const contact={id:'search-contact',label:'Kontak awal',phone_e164:'+628123456789',state:'DRAFT',sync_state:'NOT_QUEUED',lock_version:1};
    let finish!:(value:unknown)=>void;
    const delayed=new Promise(resolve=>{finish=resolve;});
    service.getContactPage.mockReset().mockResolvedValueOnce({items:[contact],page_info:{next_cursor:null}}).mockImplementation(()=>delayed);
    const user=userEvent.setup();
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    const input=await screen.findByRole('textbox',{name:'Cari nama kontak'});
    try {
      await user.click(input);
      await user.type(input,'Kontak pengukuran');
      await waitFor(()=>expect(service.getContactPage.mock.calls.length).toBeGreaterThan(1));
      expect(input.isConnected).toBe(true);
      expect(screen.getByRole('textbox',{name:'Cari nama kontak'})).toBe(input);
      expect(input).toHaveFocus();
      expect(input).toHaveValue('Kontak pengukuran');
      expect(new URL(window.location.href).searchParams.get('search')).toBe('Kontak pengukuran');
    } finally {
      await act(async()=>finish({items:[{...contact,label:'Kontak pengukuran'}],page_info:{next_cursor:null}}));
    }
  });
  it('opens readonly contact details from the shared menu even when edit is unavailable, with focus and no disclosure',async()=>{
    service.getContactPage.mockResolvedValue({items:[{id:'c-detail',label:'Kontak panjang '.repeat(20),phone_e164:'+628123456789',state:'VERIFIED',sync_state:'FAILED',lock_version:2,is_default:true,
      approved_version:{id:'v1',version_number:1,label:'Marketing lama',phone_e164:'+628111112222'},
      pending_version:{id:'v2',version_number:2},
      action_availability:{scope:'START_ACTION',expected_version:2,revalidated_on_submit:true,actions:{edit_draft:{available:false,reason:'Tidak memiliki izin ubah.',reason_code:'FORBIDDEN',mode:'DIRECT'}}}
    }],page_info:{next_cursor:null}});
    const user=userEvent.setup();const {container}=render(<SeputarJaminanProfileContactClient view="contacts"/>);
    const trigger=await screen.findByRole('button',{name:/^Aksi kontak /});
    await user.click(trigger);
    expect(screen.getByRole('menuitem',{name:'Ubah'})).toHaveAttribute('aria-disabled','true');
    await user.click(screen.getByRole('menuitem',{name:'Lihat detail'}));
    const dialog=screen.getByRole('dialog',{name:'Detail kontak WhatsApp'});
    expect(await within(dialog).findByText(/nomor berakhir 2222/)).toBeVisible();
    expect(within(dialog).getByText(/Perubahan versi 2 belum menggantikan/)).toBeVisible();
    expect(within(dialog).queryByText('+628111112222')).not.toBeInTheDocument();
    expect(container.querySelector('details, summary')).toBeNull();
    expect(dialog.querySelector('details, summary')).toBeNull();
    await waitFor(()=>expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.documentElement.style.overflow).toBe('hidden');
    for(let i=0;i<5;i++){await user.tab();expect(dialog.contains(document.activeElement)).toBe(true);}
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.documentElement.style.overflow).not.toBe('hidden');
    expect(service.contactCommand).not.toHaveBeenCalled();
    expect(service.updateContact).not.toHaveBeenCalled();
  });
  it('opens revision directly by ID even outside searched pages, never by a similar name',async()=>{
    window.history.replaceState(null,'','/dashboard/seputar-jaminan/kontak?detail=target-contact&edit=1&search=Marketing');
    const other={id:'other-contact',label:'Marketing lain',phone_e164:'+62811112222',state:'VERIFIED',sync_state:'ACKNOWLEDGED',lock_version:1};
    const target={...other,id:'target-contact',label:'Nama sudah berubah',state:'REJECTED',rejection_reason:'Perbaiki nomor kontak.',action_availability:{scope:'START_ACTION',expected_version:1,revalidated_on_submit:true,actions:{edit_draft:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}};
    service.getContactPage.mockResolvedValue({items:[other],page_info:{next_cursor:'next-contact'}});
    service.getContact.mockResolvedValue(target);
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    const dialog=await screen.findByRole('dialog',{name:'Perbaiki kontak WhatsApp'});
    expect(within(dialog).queryByText('Marketing lain')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Nama kontak/)).toHaveValue('Nama sudah berubah');
    expect(within(dialog).getByText('Perbaiki nomor kontak.')).toBeVisible();
    expect(service.getContact).toHaveBeenCalledWith('target-contact');
    expect(service.getContactPage).toHaveBeenCalledTimes(1);
    expect(service.updateContact).not.toHaveBeenCalled();
  });
  it('keeps invalid contact input in the dialog and does not call the API',async()=>{
    service.getContactPage.mockResolvedValue({items:[],page_info:{next_cursor:null}});
    service.getSettings.mockResolvedValue({review_authority:'local',entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{create_contact:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Tambah kontak'}));
    fireEvent.change(screen.getByLabelText(/Nama kontak/),{target:{value:'Marketing'}});
    fireEvent.click(screen.getByRole('button',{name:'Simpan draf'}));
    expect(await screen.findByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveApi.execute).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nama kontak/)).toHaveValue('Marketing');
    expect(service.createContact).not.toHaveBeenCalled();
  });
  it.each([[404,'Kontak tidak ditemukan'],[403,'Akses kontak dibatasi'],[503,'Kontak belum dapat dimuat']])('distinguishes by-ID error %s without substituting list data',async(status,title)=>{
    window.history.replaceState(null,'','/dashboard/seputar-jaminan/kontak?detail=missing');
    service.getContactPage.mockResolvedValue({items:[{id:'other',label:'Same name',phone_e164:'+62811112222',state:'DRAFT',sync_state:'NOT_QUEUED'}],page_info:{next_cursor:null}});
    service.getContact.mockRejectedValue(Object.assign(new Error('Gangguan layanan.'),{statusCode:status}));
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    const dialog=await screen.findByRole('dialog');
    expect(await within(dialog).findByText(title)).toBeVisible();
    expect(within(dialog).queryByText('Same name')).not.toBeInTheDocument();
    if(status===503) expect(within(dialog).getByRole('button',{name:'Coba lagi'})).toBeVisible();
    else expect(within(dialog).queryByRole('button',{name:'Coba lagi'})).not.toBeInTheDocument();
    expect(service.contactCommand).not.toHaveBeenCalled();
  });
  it('rejects late detail responses after closing the requested identity',async()=>{
    let finish!: (v:unknown)=>void;
    service.getContact.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    service.getContactPage.mockResolvedValue({items:[],page_info:{next_cursor:null}});
    window.history.replaceState(null,'','/dashboard/seputar-jaminan/kontak?detail=old');
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    await screen.findByText('Memuat kontak…');
    fireEvent.click(screen.getByRole('button',{name:'Tutup'}));
    await act(async()=>finish({id:'old',label:'Late data',phone_e164:'+62811112222',state:'DRAFT'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Late data')).not.toBeInTheDocument();
  });
  it('retains an edited contact when the server rejects its old version',async()=>{
    service.getContactPage.mockResolvedValue({items:[{id:'c',label:'Marketing',phone_e164:'+628123456789',state:'REJECTED',sync_state:'NOT_QUEUED',lock_version:2,action_availability:{scope:'START_ACTION',expected_version:2,revalidated_on_submit:true,actions:{edit_draft:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}}],page_info:{next_cursor:null}});
    saveApi.execute.mockRejectedValue(Object.assign(new Error('Data sudah berubah. Muat ulang sebelum mencoba lagi.'),{response:{status:409}}));
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    fireEvent.click(await findRowAction('Perbaiki kontak'));
    fireEvent.change(screen.getByLabelText(/Nama kontak/),{target:{value:'Perubahan belum tersimpan'}});
    fireEvent.click(screen.getByRole('button',{name:'Simpan draf'}));
    expect(await screen.findByText('Data sudah berubah. Muat ulang sebelum mencoba lagi.')).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('sj-save-error')).toHaveFocus());
    expect(screen.getByLabelText(/Nama kontak/)).toHaveValue('Perubahan belum tersimpan');
    // The modal correctly hides background controls from the accessibility tree.
    expect(screen.getByText('Muat ulang',{selector:'button'})).toBeDisabled();
    expect(saveApi.execute).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({kind:'CONTACT',intent:'SAVE_DRAFT',resource_id:'c',draft:expect.objectContaining({expected_version:2,label:'Perubahan belum tersimpan'})}));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('shows inline profile validation without creating a draft',async()=>{
    service.getSettings.mockResolvedValue({review_authority:'local',entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{create_profile:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Buat profil'}));
    fireEvent.click(screen.getByRole('button',{name:'Simpan draf'}));
    expect(await screen.findByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveApi.execute).not.toHaveBeenCalled();
    expect(screen.getByText('Nama publik BPRS harus berisi sedikitnya 3 karakter.')).toBeInTheDocument();
    expect(service.saveProfile).not.toHaveBeenCalled();
  });
  it('rejects invalid logo files and keeps a failed valid upload retryable',async()=>{
    service.getSettings.mockResolvedValue({review_authority:'local',entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{create_profile:{available:true,reason:null,reason_code:null,mode:'DIRECT'},upload_media:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    service.uploadMedia.mockRejectedValue(new Error('Penyimpanan logo tidak dapat dihubungi.'));
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Buat profil'}));
    const input=screen.getByLabelText(/Pilih file logo/);
    fireEvent.change(input,{target:{files:[new File(['invalid'],'logo.txt',{type:'text/plain'})]}});
    expect(await screen.findByText('Gunakan gambar JPG, PNG, atau WebP yang valid.')).toBeInTheDocument();
    expect(service.uploadMedia).not.toHaveBeenCalled();
    const file=new File(['test-only-payload'],'logo.png',{type:'image/png'});
    fireEvent.change(input,{target:{files:[file]}});
    expect(await screen.findByText('Penyimpanan logo tidak dapat dihubungi.')).toBeInTheDocument();
    expect(service.uploadMedia).toHaveBeenCalledWith(file,'BPRS_PUBLIC_MARK');
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Coba lagi'}));});
    expect(service.uploadMedia).toHaveBeenCalledTimes(2);
    // Byte decoding/real upload is covered by the disposable backend workflow, not this UI mock.
  });
  it('submits the explicit draft version instead of treating a successful read as approval',async()=>{
    service.getProfile.mockResolvedValue({id:'p',display_name:'BPRS Uji',state:'DRAFT',sync_state:'NOT_QUEUED',lock_version:7,logo_ready:false,current_version_id:null,action_availability:{scope:'START_ACTION',expected_version:7,revalidated_on_submit:true,actions:{submit:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    service.profileCommand.mockResolvedValue({});
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    const submit=await screen.findByRole('button',{name:'Ajukan'});
    await act(async()=>{fireEvent.click(submit);});
    expect(service.profileCommand).toHaveBeenCalledWith('submit',7);
    expect(screen.queryByText('Profil ditemukan saat pemeriksaan terakhir')).not.toBeInTheDocument();
  });
  it('keeps a failed profile submission visible without switching to reviewed or public state',async()=>{
    service.getProfile.mockResolvedValue({id:'p',display_name:'BPRS Uji',state:'DRAFT',sync_state:'NOT_QUEUED',lock_version:7,logo_media_id:'',logo_ready:false,current_version_id:null,action_availability:{scope:'START_ACTION',expected_version:7,revalidated_on_submit:true,actions:{submit:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    service.profileCommand.mockRejectedValue(new Error('Pengajuan tidak dapat dikirim. Coba lagi nanti.'));
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    const submit=await screen.findByRole('button',{name:'Ajukan'});
    await act(async()=>{fireEvent.click(submit);});
    expect(screen.getByText('Tindakan belum selesai')).toBeVisible();
    expect(screen.getByText('Pengajuan tidak dapat dikirim. Coba lagi nanti.')).toBeVisible();
    expect(screen.getByText('Logo belum diisi')).toBeVisible();
    expect(service.getMediaBlob).not.toHaveBeenCalled();
    expect(submit).not.toBeDisabled();
    expect(screen.queryByText('Profil ditemukan saat pemeriksaan terakhir')).not.toBeInTheDocument();
  });
  it("reports a failed logo request rather than pretending there are no logos",async()=>{
    service.getProfile.mockResolvedValue({id:'profile',logo_media_id:'older-logo'});
    service.getMediaRecord.mockRejectedValue(new Error("Koneksi logo terputus"));
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    expect(await screen.findByText("Profil BPRS belum dapat dimuat")).toBeInTheDocument();
    expect(screen.getByText("Koneksi logo terputus")).toBeInTheDocument();
    expect(service.getMediaRecord).toHaveBeenCalledWith('older-logo');
  });
  it('does not submit a draft contact when the server denies the action',async()=>{
    service.getContactPage.mockResolvedValue({items:[{
      id:'contact', label:'Marketing', phone_e164:'+628123456789', state:'DRAFT', sync_state:'NOT_QUEUED', lock_version:2,
      action_availability:{scope:'START_ACTION',expected_version:2,revalidated_on_submit:true,actions:{
        edit_draft:{available:true,reason:null,reason_code:null,mode:'DIRECT'},
        submit:{available:false,reason:'Fitur ini belum diaktifkan.',reason_code:'FEATURE_DISABLED',mode:'DIRECT'},
      }},
    }],page_info:{next_cursor:null}});
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    const submit=await findRowAction('Ajukan');
    expect(submit).toHaveAttribute('aria-disabled','true');
    expect(screen.getByText('Fitur ini belum diaktifkan.')).toBeInTheDocument();
    fireEvent.click(submit);
    expect(service.contactCommand).not.toHaveBeenCalled();
  });
  it('keeps creation disabled when no server assessment was supplied',async()=>{
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    const button=await screen.findByRole('button',{name:'Buat profil'});
    expect(button).toBeDisabled();fireEvent.click(button);
    expect(screen.queryByRole('button',{name:'Simpan draf'})).not.toBeInTheDocument();
    expect(screen.getByText('Muat ulang untuk memeriksa tindakan yang tersedia.')).toBeInTheDocument();
  });
  const editableProfile={id:'p',display_name:'BPRS Uji',public_slug:'bprs-uji',city_regency:'Bogor',province:'Jawa Barat',short_description:'Deskripsi profil BPRS untuk pengujian.',logo_media_id:'logo',logo_ready:true,website_url:null,state:'REVISION_REQUIRED',sync_state:'NOT_QUEUED',lock_version:7,current_version_id:null,rejection_reason:'Perbaiki alamat kantor.',action_availability:{scope:'START_ACTION',expected_version:7,revalidated_on_submit:true,actions:{edit_draft:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}};
  it('keeps reviewer notes next to the editable form and returns focus without saving on cancel',async()=>{
    service.getProfile.mockResolvedValue(editableProfile);
    const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="profile"/>);
    await user.click(await screen.findByRole('button',{name:'Perbaiki profil'}));
    const form=screen.getByRole('group',{name:'Formulir profil BPRS'});
    expect(within(form).getByText('Catatan pemeriksa')).toBeVisible();
    expect(within(form).getByText('Perbaiki alamat kantor.')).toBeVisible();
    expect(screen.getByLabelText(/Nama publik BPRS/)).toHaveFocus();
    await user.click(screen.getByRole('button',{name:'Batal'}));
    expect(screen.getByRole('button',{name:'Perbaiki profil'})).toHaveFocus();
    expect(service.saveProfile).not.toHaveBeenCalled();
  });
  it('locks the form during save, preserves all edits on conflict, and guards dismissal',async()=>{
    service.getProfile.mockResolvedValue(editableProfile);
    let reject!:(error:Error)=>void;
    saveApi.execute.mockImplementation(()=>new Promise((_resolve,r)=>{reject=r;}));
    const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="profile"/>);
    await user.click(await screen.findByRole('button',{name:'Perbaiki profil'}));
    const name=screen.getByLabelText(/Nama publik BPRS/);
    await user.clear(name);await user.type(name,'Nama yang diperbaiki');
    await user.click(screen.getByRole('button',{name:'Simpan draf'}));
    expect(name).toBeDisabled();expect(screen.getByRole('button',{name:'Batal'})).toBeDisabled();
    expect(saveApi.execute).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({kind:'PROFILE',intent:'SAVE_DRAFT',draft:expect.objectContaining({expected_version:7,display_name:'Nama yang diperbaiki'})}));
    await act(async()=>reject(Object.assign(new Error('Versi sudah berubah. Muat ulang data.'),{response:{status:409}})));
    expect(await screen.findByText('Versi sudah berubah. Muat ulang data.')).toBeVisible();
    await waitFor(() => expect(document.getElementById('sj-save-error')).toHaveFocus());
    expect(name).toHaveValue('Nama yang diperbaiki');expect(name).not.toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Batal'}));
    expect(screen.getByRole('dialog',{name:'Tinggalkan perubahan?'})).toBeVisible();
    await user.keyboard('{Escape}');expect(name).toHaveValue('Nama yang diperbaiki');
    expect(saveApi.execute).toHaveBeenCalledTimes(1);
  });
  it.each(['IN_REVIEW','HIDDEN'])('respects the server action for %s without inventing a public state',async state=>{
    service.getProfile.mockResolvedValue({...editableProfile,state,rejection_reason:null});
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    await screen.findByRole('heading',{name:'Profil kerja'});
    expect(screen.queryByRole('button',{name:'Ajukan'})).not.toBeInTheDocument();
    if(state==='IN_REVIEW')expect(screen.queryByRole('button',{name:'Siapkan perubahan'})).not.toBeInTheDocument();
    else expect(screen.getByRole('button',{name:'Siapkan perubahan'})).toBeEnabled();
    expect(service.profileCommand).not.toHaveBeenCalled();
  });
  it('hides denied profile actions even for an approved profile',async()=>{
    service.getProfile.mockResolvedValue({...editableProfile,state:'VERIFIED',rejection_reason:null,action_availability:{scope:'START_ACTION',expected_version:7,revalidated_on_submit:true,actions:{edit_draft:{available:false,reason:'Tidak punya izin.',reason_code:'PERMISSION_DENIED',mode:'DIRECT'}}}});
    render(<SeputarJaminanProfileContactClient view="profile"/>);
    await screen.findByRole('heading',{name:'Profil kerja'});
    expect(screen.queryByRole('button',{name:'Ajukan perubahan'})).not.toBeInTheDocument();
  });
  it('restores saved logo metadata after discarding an uploaded replacement, without silently saving',async()=>{
    service.getProfile.mockResolvedValue(editableProfile);
    const oldLogo={id:'logo',file_name:'logo-lama.png',mime_type:'image/png',size_bytes:100,width:10,height:10,central_ready:true};
    service.getMediaRecord.mockResolvedValue(oldLogo);
    service.uploadMedia.mockResolvedValue({...oldLogo,id:'replacement',file_name:'logo-baru.png',central_ready:false});
    service.getSettings.mockResolvedValue({review_authority:'local',entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{upload_media:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="profile"/>);
    await user.click(await screen.findByRole('button',{name:'Perbaiki profil'}));
    fireEvent.change(screen.getByLabelText(/Pilih file logo/),{target:{files:[new File(['UI-only'],'logo-baru.png',{type:'image/png'})]}});
    expect(await screen.findByText('logo-baru.png')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Batal'}));
    await user.click(screen.getByRole('button',{name:'Tinggalkan perubahan'}));
    await user.click(screen.getByRole('button',{name:'Perbaiki profil'}));
    expect(screen.getByText('logo-lama.png')).toBeVisible();
    expect(screen.queryByText('logo-baru.png')).not.toBeInTheDocument();
    expect(service.saveProfile).not.toHaveBeenCalled();
  });
  it.each([true,false])('uses the server creation decision, available=%s',async(available)=>{
    service.getContactPage.mockResolvedValue({items:[],page_info:{next_cursor:null}});
    service.getSettings.mockResolvedValue({review_authority:'local',entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{
      create_contact:{available,reason:available?null:'Pembuatan draf belum diaktifkan.',reason_code:available?null:'FEATURE_DISABLED',mode:'DIRECT'},
    }}});
    render(<SeputarJaminanProfileContactClient view="contacts"/>);
    const button=await screen.findByRole('button',{name:'Tambah kontak'});
    if(available)expect(button).not.toBeDisabled();else expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(Boolean(screen.queryByRole('dialog',{name:'Tambah kontak WhatsApp'}))).toBe(available);
    if(!available)expect(screen.getByText('Pembuatan draf belum diaktifkan.')).toBeInTheDocument();
  });

  describe('contact list request isolation',()=>{
    const contact=(id:string,label=id)=>({id,label,phone_e164:'+628123456789',state:'DRAFT',sync_state:'NOT_QUEUED',lock_version:3,
      action_availability:{scope:'START_ACTION',expected_version:3,revalidated_on_submit:true,actions:{submit:{available:true,reason:null,reason_code:null,mode:'DIRECT'},edit_draft:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}});
    const page=(items:ReturnType<typeof contact>[],cursor:string|null=null)=>({items,page_info:{next_cursor:cursor}});
    const permittedSettings={review_authority:'local',review_enabled:true,entry_actions:{scope:'START_ACTION',expected_version:null,revalidated_on_submit:true,actions:{create_contact:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}};
    const deferred=<T,>()=>{let resolve!:(value:T)=>void, reject!:(reason:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
    const search=()=>screen.getByRole('textbox',{name:'Cari nama kontak'});
    beforeEach(()=>{
      service.getContactPage.mockReset().mockResolvedValue(page([contact('awal','Kontak awal')]));
      service.getSettings.mockReset().mockResolvedValue(permittedSettings);
      service.contactCommand.mockReset().mockResolvedValue({});
    });

    it('debounces search only, preserves the input on error, and explicitly refreshes settings',async()=>{
      const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="contacts"/>);
      await screen.findByText('Kontak awal');
      const input=search();await user.click(input);
      vi.useFakeTimers();
      try {
        fireEvent.change(input,{target:{value:'M'}});
        fireEvent.change(input,{target:{value:'Ma'}});
        fireEvent.change(input,{target:{value:'Marketing'}});
        await act(async()=>vi.advanceTimersByTimeAsync(249));
        expect(service.getContactPage).toHaveBeenCalledTimes(1);
        expect(service.getSettings).toHaveBeenCalledTimes(1);
        service.getContactPage.mockRejectedValueOnce(new Error('Pencarian belum dapat dimuat.'));
        await act(async()=>vi.advanceTimersByTimeAsync(1));
        expect(service.getContactPage).toHaveBeenLastCalledWith({limit:20,search:'Marketing'});
        expect(service.getContactPage).toHaveBeenCalledTimes(2);
        expect(service.getSettings).toHaveBeenCalledTimes(1);
        expect(search()).toBe(input);expect(input).toHaveFocus();expect(input).toHaveValue('Marketing');
        expect(screen.getByText('Pencarian belum dapat dimuat.')).toBeVisible();
        expect(screen.queryByText('Tidak ada kontak yang cocok')).not.toBeInTheDocument();
        expect(screen.queryByText('Kontak awal')).not.toBeInTheDocument();
      } finally {vi.useRealTimers();}
      await user.click(screen.getByRole('button',{name:'Muat ulang'}));
      await screen.findByText('Kontak awal');
      expect(service.getSettings).toHaveBeenCalledTimes(2);
      expect(service.getContactPage).toHaveBeenLastCalledWith({limit:20,search:'Marketing'});
      expect(search()).toBe(input);expect(input).toHaveValue('Marketing');
    });

    it('keeps settings bootstrap independent of typing and fails closed after a failed refresh',async()=>{
      const bootstrap=deferred<typeof permittedSettings>();
      service.getSettings.mockImplementationOnce(()=>bootstrap.promise);
      const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="contacts"/>);
      await screen.findByText('Kontak awal');
      expect(screen.getByRole('button',{name:'Tambah kontak'})).toBeDisabled();
      await user.type(search(),'Marketing');
      await waitFor(()=>expect(service.getContactPage).toHaveBeenLastCalledWith({limit:20,search:'Marketing'}));
      expect(service.getSettings).toHaveBeenCalledTimes(1);
      await act(async()=>bootstrap.resolve(permittedSettings));
      expect(screen.getByRole('button',{name:'Tambah kontak'})).toBeEnabled();
      service.getSettings.mockRejectedValueOnce(new Error('Pengaturan tidak dapat dihubungi.'));
      await user.click(screen.getByRole('button',{name:'Muat ulang'}));
      await screen.findByText('Pengaturan tidak dapat dihubungi.');
      expect(screen.getByRole('button',{name:'Tambah kontak'})).toBeDisabled();
      await user.click(await findRowAction('Ajukan'));
      expect(service.contactCommand).not.toHaveBeenCalled();
      const input=search();await user.clear(input);await user.type(input,'Lain');
      await waitFor(()=>expect(service.getContactPage).toHaveBeenLastCalledWith({limit:20,search:'Lain'}));
      expect(service.getSettings).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Pengaturan tidak dapat dihubungi.')).toBeVisible();
      expect(screen.getByRole('button',{name:'Tambah kontak'})).toBeDisabled();
    });

    it.each(['resolve','reject'] as const)('ignores a late first-page %s from an older search',async outcome=>{
      const old=deferred<ReturnType<typeof page>>(), latest=deferred<ReturnType<typeof page>>();
      service.getContactPage.mockImplementation(params=>params.search==='A'?old.promise:params.search==='B'?latest.promise:Promise.resolve(page([contact('awal')])));
      const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="contacts"/>);await screen.findByText('awal');
      await user.type(search(),'A');await waitFor(()=>expect(service.getContactPage).toHaveBeenCalledWith({limit:20,search:'A'}));
      await user.clear(search());await user.type(search(),'B');await waitFor(()=>expect(service.getContactPage).toHaveBeenCalledWith({limit:20,search:'B'}));
      await act(async()=>latest.resolve(page([contact('hasil-b')],'cursor-b')));
      await screen.findByText('hasil-b');
      await act(async()=>outcome==='resolve'?old.resolve(page([contact('hasil-a')],'cursor-a')):old.reject(new Error('Error lama')));
      expect(screen.getByText('hasil-b')).toBeVisible();
      expect(screen.queryByText('hasil-a')).not.toBeInTheDocument();
      expect(screen.queryByText('Error lama')).not.toBeInTheDocument();
      expect(search()).toHaveValue('B');
    });

    it('does not append old rows or release the busy state of a newer append',async()=>{
      const old=deferred<ReturnType<typeof page>>(), latest=deferred<ReturnType<typeof page>>();
      service.getContactPage.mockImplementation(params=>params.cursor==='cursor-a'?old.promise:params.cursor==='cursor-b'?latest.promise:Promise.resolve(params.search==='B'?page([contact('b1')],'cursor-b'):page([contact('a1')],'cursor-a')));
      const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="contacts"/>);await screen.findByText('a1');
      await user.click(screen.getByRole('button',{name:'Muat kontak berikutnya'}));
      await user.type(search(),'B');await screen.findByText('b1');
      await user.click(screen.getByRole('button',{name:'Muat kontak berikutnya'}));
      await act(async()=>old.resolve(page([contact('a2')])));
      expect(screen.getByRole('button',{name:'Muat kontak berikutnya'})).toBeDisabled();
      expect(screen.queryByText('a2')).not.toBeInTheDocument();
      await act(async()=>latest.resolve(page([contact('b1'),contact('b2')])));
      await screen.findByText('b2');expect(screen.getAllByText('b1')).toHaveLength(1);
      expect(service.getContactPage).toHaveBeenLastCalledWith({limit:20,cursor:'cursor-b',search:'B'});
    });

    it('refreshes the current URL search after a pending command, not its old closure',async()=>{
      const command=deferred<unknown>();service.contactCommand.mockImplementationOnce(()=>command.promise);
      service.getContactPage.mockImplementation(params=>Promise.resolve(page([contact(params.search==='B'?'hasil-b':'awal')])));
      const user=userEvent.setup();render(<SeputarJaminanProfileContactClient view="contacts"/>);await screen.findByText('awal');
      await user.click(await findRowAction('Ajukan'));
      await user.type(search(),'B');await screen.findByText('hasil-b');
      await act(async()=>command.resolve({}));
      await waitFor(()=>expect(service.getSettings).toHaveBeenCalledTimes(2));
      expect(service.getContactPage).toHaveBeenLastCalledWith({limit:20,search:'B'});
      expect(service.contactCommand).toHaveBeenCalledWith('awal','submit',3);
      expect(screen.getByText('hasil-b')).toBeVisible();expect(search()).toHaveValue('B');
    });

    it('restores search results with Back/Forward and retains unrelated query fields',async()=>{
      window.history.replaceState(null,'','/dashboard/seputar-jaminan/kontak?search=Awal&retained=yes#hasil');
      service.getContactPage.mockImplementation(params=>Promise.resolve(page([contact(params.search||'kosong')])));
      const {unmount}=render(<SeputarJaminanProfileContactClient view="contacts"/>);await screen.findByText('Awal');
      await act(async()=>{window.history.pushState(null,'','?search=Baru&retained=yes#hasil');window.dispatchEvent(new PopStateEvent('popstate'));});
      await screen.findByText('Baru');expect(search()).toHaveValue('Baru');
      act(()=>window.history.back());await screen.findByText('Awal');expect(search()).toHaveValue('Awal');
      act(()=>window.history.forward());await screen.findByText('Baru');
      expect(new URL(window.location.href).searchParams.get('retained')).toBe('yes');expect(window.location.hash).toBe('#hasil');
      unmount();
    });

    it('ignores old contact/settings responses after changing view and after unmount',async()=>{
      const settings=deferred<typeof permittedSettings>(), contacts=deferred<ReturnType<typeof page>>();
      service.getSettings.mockImplementationOnce(()=>settings.promise).mockResolvedValue(permittedSettings);
      service.getContactPage.mockImplementationOnce(()=>contacts.promise);
      const {rerender,unmount}=render(<SeputarJaminanProfileContactClient view="contacts"/>);
      rerender(<SeputarJaminanProfileContactClient view="profile"/>);
      await screen.findByRole('button',{name:'Buat profil'});
      await act(async()=>{contacts.resolve(page([contact('lama')]));settings.resolve({...permittedSettings,entry_actions:{...permittedSettings.entry_actions,actions:{create_contact:{...permittedSettings.entry_actions.actions.create_contact,available:false}}}});});
      expect(screen.queryByText('lama')).not.toBeInTheDocument();
      expect(screen.queryByText('Tindakan kontak belum dapat diperiksa')).not.toBeInTheDocument();
      const after=deferred<ReturnType<typeof page>>();service.getContactPage.mockImplementationOnce(()=>after.promise);
      rerender(<SeputarJaminanProfileContactClient view="contacts"/>);
      await waitFor(()=>expect(service.getContactPage.mock.calls.length).toBe(2));
      unmount();await act(async()=>after.resolve(page([contact('setelah-unmount')])));
      expect(screen.queryByText('setelah-unmount')).not.toBeInTheDocument();
    });
  });
});
