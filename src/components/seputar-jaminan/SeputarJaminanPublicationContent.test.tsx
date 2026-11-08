import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import type {SjPublication} from '@/types/seputar-jaminan.types';
const api=vi.hoisted(()=>({getMediaBlob:vi.fn()}));
vi.mock('@/services/seputar-jaminan.service',()=>({seputarJaminanService:api}));
import Content,{SjPublicationThumbnail,SjPublicationObservationContext,SjPublicationListObservation} from './SeputarJaminanPublicationContent';
import type {SjObservationEvidence} from '@/types/seputar-jaminan.types';
import {SjMediaPreview} from './SeputarJaminanMedia';
const version={id:'working',version_number:2,title:'Draf '.repeat(60),description:'Deskripsi versi kerja',city_regency:'Bandung',province:'Jawa Barat',attributes:{},media:[],whatsapp_contact:{label:'Marketing',phone_ending:'1234'}};
it('renders bounded list evidence without treating failed checks or ACK as public absence',()=>{
 const fact={state:'AVAILABLE' as const,started_at:'2026-09-23T00:00:00Z',checked_at:'2026-09-23T00:00:01Z',observed_version:1};
 const row={observation_summary:{scope:'SJ_PUBLIC_API',freshness:'CHECK_TIME_ONLY',last_success:fact,latest_attempt:{...fact,state:'FAILED',observed_version:null}},state:'DRAFT',sync_state:'ACKNOWLEDGED'} as SjPublication;
 const inspect=vi.fn();const {rerender}=render(<SjPublicationListObservation publication={row} onInspect={inspect}/>);
 expect(screen.getByText('Tampil saat dicek')).toBeVisible();expect(screen.getByText(/Pengecekan terbaru gagal/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Rincian pengecekan'}));expect(inspect).toHaveBeenCalledOnce();
 rerender(<SjPublicationListObservation publication={{...row,observation_summary:null}} onInspect={inspect}/>);
 expect(screen.queryByText('Tampil saat dicek')).toBeNull();expect(screen.getByRole('button',{name:'Lihat hasil pengecekan'})).toBeVisible();
});
beforeEach(()=>{api.getMediaBlob.mockResolvedValue(new Blob(['not-an-image']));URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();});
for(const [category,key,value]of [['LAND','land_area_m2',12],['BUILDING','building_area_m2',120],['MACHINE_EQUIPMENT','model_or_type','Mesin uji'],['VEHICLE','mileage_km',0]] as const){
 it(`renders ${category} attributes without guessing public content`,()=>{
  const row={asset_category:category,source_type:'COLLATERAL',current_version:{...version,attributes:{[key]:value}},published_version:{...version,id:'approved',version_number:1,title:'Judul disetujui',description:'Deskripsi versi disetujui'}} as unknown as SjPublication;
  const {container}=render(<Content publication={row}/>);
  expect(within(screen.getByRole('region',{name:'Versi kerja di bank'})).getByText(String(value))).toBeVisible();
  expect(screen.getByText(/Versi bank di bawah bukan bukti penayangan/)).toBeVisible();
  expect(container.querySelector('details, summary')).toBeNull();
  expect(within(screen.getByRole('region',{name:'Versi disetujui di bank'})).getByText('Judul disetujui')).toBeVisible();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
}
it('does not request a blank photo and distinguishes it from a failed photo',()=>{
 render(<SjPublicationThumbnail publication={{cover:null} as SjPublication}/>);
 expect(screen.getByRole('img',{name:'Belum ada foto aset'})).toBeVisible();expect(api.getMediaBlob).not.toHaveBeenCalled();
});
it('shows only observed public content, retaining evidence after a failed attempt',()=>{
 const base={id:'proof',started_at:'2026-09-23T00:00:00Z',checked_at:'2026-09-23T00:00:01Z',source_origin:'https://api.example',public_identity:'SJ-ABCDEFGH',institution_slug:'bank-uji',failure_code:null};
 const evidence:SjObservationEvidence={scope:'SJ_PUBLIC_API',freshness:'CHECK_TIME_ONLY',version_evidence:'SOURCE_PUBLICATION_EVENT',last_success:{...base,state:'AVAILABLE',observed_version:7,publication_snapshot:{title:'Judul publik lama',description:'Deskripsi publik',category:'KENDARAAN',city_regency:'Bandung',province:'Jawa Barat',attributes:{mileage_km:0},photo_count:1,public_updated_at:'2026-09-23T00:00:00Z',public_page_url:'https://catalog.example/aset/SJ-ABCDEFGH'}},latest_attempt:{...base,id:'failed',state:'FAILED',observed_version:null,failure_code:'TIMEOUT'}};
 const {rerender}=render(<SjPublicationObservationContext evidence={evidence}/>);
 expect(screen.getByText('Judul publik lama')).toBeVisible();expect(screen.getByText('0')).toBeVisible();
 expect(screen.getByRole('link',{name:/Buka aset di SJ/})).toHaveAttribute('href','https://catalog.example/aset/SJ-ABCDEFGH');
 expect(screen.getByText(/bukan nomor revisi draf bank/)).toBeVisible();
 rerender(<SjPublicationObservationContext evidence={{...evidence,last_success:{...evidence.last_success!,state:'NOT_FOUND',observed_version:null,publication_snapshot:null}}}/>);
 expect(screen.queryByText('Judul publik lama')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('shows retry if a downloaded image cannot decode and releases blob URLs',async()=>{
 const {unmount}=render(<SjMediaPreview compact mediaId="photo" alt="Foto uji"/>);
 await waitFor(()=>expect(api.getMediaBlob).toHaveBeenCalledWith('photo','thumbnail'));
 fireEvent.error(await screen.findByRole('img',{name:'Foto uji'}));
 fireEvent.click(await screen.findByRole('button',{name:'Muat ulang pratinjau Foto uji'}));
 await waitFor(()=>expect(api.getMediaBlob).toHaveBeenCalledTimes(2));unmount();expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it('allows retry after a media API error without a perpetual skeleton',async()=>{
 api.getMediaBlob.mockRejectedValueOnce(new Error('offline'));
 render(<SjMediaPreview mediaId="photo" alt="Foto jaringan"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Muat ulang pratinjau Foto jaringan'}));
 expect(await screen.findByRole('img',{name:'Foto jaringan'})).toBeVisible();
 expect(api.getMediaBlob).toHaveBeenLastCalledWith('photo',undefined);
});
