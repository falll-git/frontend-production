import { findRowAction } from './rowAction.test-helper';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getPublicationPage:vi.fn(),getPublication:vi.fn(),getSettings:vi.fn(),getPublicObservation:vi.fn(),getHistory:vi.fn(),showToast:vi.fn(),getMediaBlob:vi.fn()}));
vi.mock('@/services/seputar-jaminan.service',()=>({seputarJaminanService:mocks}));
vi.mock('@/components/ui/AppToastProvider',()=>({useAppToast:()=>({showToast:mocks.showToast})}));
vi.mock('@/hooks/useProtectedAction',()=>({useProtectedAction:()=>({ensureCapability:()=>false,ensureFeature:()=>false,hasCapability:()=>false})}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),usePathname:()=>'/dashboard/seputar-jaminan/publikasi'}));
import Catalog from './SeputarJaminanCatalogClient';
const version={id:'v',version_number:1,state:'DRAFT',title:'Tanah panjang '.repeat(15),description:'Informasi draf',city_regency:'Bogor',province:'Jawa Barat',attributes:{land_area_m2:12},media:[],whatsapp_contact:null};
const asset={id:'asset-test',reference_code:'SJ-TEST',source_type:'COLLATERAL',asset_category:'LAND',state:'DRAFT',sync_state:'ACKNOWLEDGED',title:version.title,cover:null,current_version:version,published_version:null,lock_version:1};
beforeEach(()=>{
 vi.clearAllMocks();window.history.replaceState(null,'','/dashboard/seputar-jaminan/publikasi?category=LAND&search=tanah');
 mocks.getPublicationPage.mockResolvedValue({items:[asset],page_info:{next_cursor:null}});mocks.getPublication.mockResolvedValue(asset);mocks.getSettings.mockResolvedValue({review_authority:'central',review_submission_ready:true});
 mocks.getPublicObservation.mockResolvedValue({scope:'SJ_PUBLIC_API',freshness:'CHECK_TIME_ONLY',version_evidence:'UNAVAILABLE',last_success:null,latest_attempt:null});mocks.getHistory.mockResolvedValue({items:[],page_info:{next_cursor:null}});
});
it('keeps list context in URL, restores Back/Forward and never prefetches row details',async()=>{
 render(<Catalog/>);const trigger=await screen.findByRole('button',{name:/^Aksi publikasi /});expect(mocks.getPublication).not.toHaveBeenCalled();
 fireEvent.click(trigger);fireEvent.click(screen.getByRole('menuitem',{name:'Lihat detail'}));await screen.findByRole('region',{name:'Versi kerja di bank'});expect(location.search).toContain('detail=asset-test');expect(location.search).toContain('category=LAND');
 act(()=>history.back());await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(location.search).toContain('search=tanah');
 act(()=>history.forward());await screen.findByRole('region',{name:'Versi kerja di bank'});fireEvent.click(screen.getByRole('button',{name:'Kembali ke daftar'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(mocks.getPublicationPage).toHaveBeenCalledTimes(1);
});
it('reopens a bookmarked detail and close stays in the same filtered list',async()=>{
 history.replaceState(null,'','/dashboard/seputar-jaminan/publikasi?category=LAND&detail=asset-test');render(<Catalog/>);
 await screen.findByRole('region',{name:'Versi kerja di bank'});fireEvent.click(screen.getByRole('button',{name:'Kembali ke daftar'}));await waitFor(()=>expect(location.search).toBe('?category=LAND'));
});
it('removes each active filter and resets the cursor with no made-up total',async()=>{
 render(<Catalog/>);await screen.findByRole('button',{name:/^Aksi publikasi /});fireEvent.click(screen.getByRole('button',{name:'Hapus filter Tanah'}));await waitFor(()=>expect(mocks.getPublicationPage).toHaveBeenLastCalledWith({limit:20,search:'tanah'}));
 fireEvent.click(screen.getByRole('button',{name:'Atur ulang'}));await waitFor(()=>expect(mocks.getPublicationPage).toHaveBeenLastCalledWith({limit:20}));expect(screen.getByText('Urutan: terbaru dibuat')).toBeVisible();
});
it('offers a labelled keyboard-focusable region for a wide publication table',async()=>{
 render(<Catalog/>);await screen.findByRole('button',{name:/^Aksi publikasi /});
 const region=screen.getByRole('region',{name:'Gulir tabel publikasi'});
 expect(within(region).getByRole('table',{name:'Daftar publikasi Seputar Jaminan'})).toBeVisible();
 expect(region).toHaveAttribute('tabindex','0');region.focus();expect(region).toHaveFocus();
});
it('reserves the requested page slots while loading and keeps one stable refresh icon',async()=>{
 let finish:(value:unknown)=>void=()=>{};
 mocks.getPublicationPage.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 render(<Catalog/>);
 const table=screen.getByRole('table',{name:'Daftar publikasi Seputar Jaminan'});
 expect(table.querySelectorAll('tbody tr')).toHaveLength(20);
 expect(table.querySelector('tbody tr td')).toHaveClass('[&>div]:min-h-16');
 const refresh=screen.getByRole('button',{name:'Muat ulang daftar publikasi'});
 expect(refresh).toBeDisabled();expect(refresh).toHaveAttribute('aria-busy','true');
 expect(refresh.querySelectorAll('svg')).toHaveLength(1);
 expect(screen.queryByText('20 publikasi pada halaman ini')).not.toBeInTheDocument();
 await act(async()=>finish({items:[asset],page_info:{next_cursor:null}}));
 expect(await screen.findByRole('button',{name:/^Aksi publikasi /})).toBeVisible();
 expect(refresh).toBeEnabled();expect(refresh).not.toHaveAttribute('aria-busy');
 expect(refresh.querySelectorAll('svg')).toHaveLength(1);
});
it('does not silently honor unsupported sorting from a URL',async()=>{
 history.replaceState(null,'','/dashboard/seputar-jaminan/publikasi?sort=price');render(<Catalog/>);expect(await screen.findByText(/Urutan pada tautan ini tidak didukung/)).toBeVisible();expect(mocks.getPublicationPage).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Atur ulang'}));await screen.findByRole('button',{name:/^Aksi publikasi /});
});
it('shows failed detail with retry instead of using the list row as detail',async()=>{
 mocks.getPublication.mockRejectedValueOnce(new Error('Detail tidak dapat dimuat'));render(<Catalog/>);fireEvent.click(await findRowAction('Lihat detail'));
 const dialog=await screen.findByRole('dialog');await within(dialog).findByText('Detail belum dapat dimuat');expect(within(dialog).queryByRole('region',{name:'Versi kerja di bank'})).not.toBeInTheDocument();
 fireEvent.click(within(dialog).getByRole('button',{name:'Coba lagi'}));await screen.findByRole('region',{name:'Versi kerja di bank'});
});
it('does not replace an open detail with a late request for another asset',async()=>{
 let finish:(value:unknown)=>void=()=>{};mocks.getPublication.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 render(<Catalog/>);fireEvent.click(await findRowAction('Lihat detail'));await screen.findByText('Memuat detail publikasi…');
 act(()=>{history.replaceState(null,'','/dashboard/seputar-jaminan/publikasi');window.dispatchEvent(new PopStateEvent('popstate'));});await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 await act(async()=>finish(asset));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps denied actions unavailable and ACK separate from visibility',async()=>{
 render(<Catalog/>);await screen.findByRole('button',{name:/^Aksi publikasi /});const edit=await findRowAction('Ubah');expect(edit).toHaveAttribute('aria-disabled','true');fireEvent.click(edit);expect(mocks.getPublication).not.toHaveBeenCalled();expect(screen.getByText('Lihat hasil pengecekan')).toBeVisible();expect(screen.queryByText(/^Tayang$/)).not.toBeInTheDocument();
});
it('uses the API cursor and restores pagination through browser Back',async()=>{
 mocks.getPublicationPage.mockImplementation(async(query)=>({items:[asset],page_info:{next_cursor:query.cursor?null:'opaque-api-cursor'}}));
 render(<Catalog/>);await waitFor(()=>expect(screen.getByRole('button',{name:'publikasi berikutnya'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'publikasi berikutnya'}));
 await waitFor(()=>expect(mocks.getPublicationPage).toHaveBeenLastCalledWith({limit:20,category:'LAND',search:'tanah',cursor:'opaque-api-cursor'}));
 expect(await screen.findByRole('button',{name:'publikasi berikutnya'})).toBeDisabled();
 await waitFor(()=>expect(screen.getByRole('button',{name:'publikasi sebelumnya'})).toBeEnabled());
 act(()=>history.back());await waitFor(()=>expect(mocks.getPublicationPage).toHaveBeenLastCalledWith({limit:20,category:'LAND',search:'tanah'}));
});
it('distinguishes no matches, empty catalogue and API failure with retry',async()=>{
 mocks.getPublicationPage.mockResolvedValue({items:[],page_info:{next_cursor:null}});render(<Catalog/>);
 expect(await screen.findByText('Publikasi tidak ditemukan')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Atur ulang'}));
 expect(await screen.findByText('Belum ada publikasi')).toBeVisible();mocks.getPublicationPage.mockRejectedValueOnce(new Error('Jaringan tidak tersedia'));
 fireEvent.click(screen.getByRole('button',{name:'Muat ulang daftar publikasi'}));expect(await screen.findByText('Publikasi belum dapat dimuat')).toBeVisible();expect(screen.queryByText('Belum ada publikasi')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Coba muat ulang daftar'}));expect(await screen.findByText('Belum ada publikasi')).toBeVisible();
});

it('recovers a failed filter after another filter succeeds without requiring manual reload', async () => {
 mocks.getPublicationPage.mockRejectedValueOnce(new Error('Filter A temporarily unavailable'));
 render(<Catalog/>);
 expect(await screen.findByText('Filter A temporarily unavailable')).toBeVisible();
 act(() => { history.pushState(null, '', '/dashboard/seputar-jaminan/publikasi?category=BUILDING'); window.dispatchEvent(new PopStateEvent('popstate')); });
 expect(await screen.findByRole('button', {name:/^Aksi publikasi /})).toBeVisible();
 act(() => { history.pushState(null, '', '/dashboard/seputar-jaminan/publikasi?category=LAND&search=tanah'); window.dispatchEvent(new PopStateEvent('popstate')); });
 await waitFor(() => expect(mocks.getPublicationPage).toHaveBeenCalledTimes(3));
 expect(await screen.findByRole('button', {name:/^Aksi publikasi /})).toBeVisible();
 expect(screen.queryByText('Filter A temporarily unavailable')).not.toBeInTheDocument();
 expect(screen.queryByText('Publikasi belum dapat dimuat')).not.toBeInTheDocument();
});

it('does not clear the active filter error when an older filter succeeds late', async () => {
 let finishOld!: (value: unknown) => void;
 mocks.getPublicationPage
  .mockImplementationOnce(() => new Promise(resolve => { finishOld=resolve; }))
  .mockRejectedValueOnce(new Error('Current filter unavailable'));
 render(<Catalog/>);
 act(() => { history.pushState(null, '', '/dashboard/seputar-jaminan/publikasi?category=BUILDING'); window.dispatchEvent(new PopStateEvent('popstate')); });
 expect(await screen.findByText('Current filter unavailable')).toBeVisible();
 await act(async () => { finishOld({items:[asset],page_info:{next_cursor:null}}); });
 expect(screen.getByText('Current filter unavailable')).toBeVisible();
 expect(screen.getByText('Publikasi belum dapat dimuat')).toBeVisible();
 expect(screen.queryByRole('button', {name:/^Aksi publikasi /})).not.toBeInTheDocument();
});
