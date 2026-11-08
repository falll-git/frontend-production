import {StrictMode} from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {validateSjResponse} from '@/services/seputar-jaminan.response';
const mocks=vi.hoisted(()=>({getPublicObservation:vi.fn(),checkPublicObservation:vi.fn(),allowed:true}));
vi.mock('@/services/seputar-jaminan.service',()=>({seputarJaminanService:mocks}));
vi.mock('@/hooks/useProtectedAction',()=>({useProtectedAction:()=>({hasCapability:()=>mocks.allowed})}));
import ObservationComponent from './SeputarJaminanObservation';
function Observation(props:React.ComponentProps<typeof ObservationComponent>){return <ObservationComponent {...props} subject={{lock_version:1,action_availability:{scope:'START_ACTION',expected_version:1,revalidated_on_submit:true,actions:{check_public:{available:true,reason:null,reason_code:null,mode:'DIRECT'}}}}}/>;}
const fact={id:'observed',state:'AVAILABLE',started_at:'2026-09-20T01:00:00.000Z',checked_at:'2026-09-20T01:00:01.000Z',source_origin:'https://sj.example',public_identity:'SJ-ABCDEFGH',institution_slug:'bank-uji',observed_version:null,failure_code:null};
const evidence={scope:'SJ_PUBLIC_API',version_evidence:'UNAVAILABLE',freshness:'CHECK_TIME_ONLY',last_success:fact,latest_attempt:fact};
beforeEach(()=>{mocks.allowed=true;mocks.getPublicObservation.mockResolvedValue(evidence);mocks.checkPublicObservation.mockReset();});
it('preserves success and date when latest manual check times out',async()=>{
  mocks.checkPublicObservation.mockResolvedValue({...evidence,latest_attempt:{...fact,id:'failed',state:'FAILED',failure_code:'TIMEOUT',started_at:'2026-09-20T02:00:00.000Z',checked_at:'2026-09-20T02:00:08.000Z'}});
  render(<Observation kind="publication" id="asset"/>);
  expect(await screen.findByText('Tampil saat dicek')).toBeInTheDocument();
  expect(screen.getByText('SJ-ABCDEFGH')).toBeVisible();
  expect(screen.queryByText(/https:\/\/sj.example/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Cek sekarang'}));
  expect(await screen.findByText(/Belum bisa dicek: waktu tunggu habis/)).toBeInTheDocument();
  expect(screen.getByText('Tampil saat dicek')).toBeInTheDocument();
  expect(screen.getByText('Tampil saat dicek').parentElement?.querySelector('time')).toHaveAttribute('datetime',fact.checked_at);
  expect(screen.getByText(/Percobaan terbaru:/).querySelector('time')).toHaveAttribute('datetime','2026-09-20T02:00:08.000Z');
  expect(mocks.checkPublicObservation).toHaveBeenCalledWith('publication','asset');
});
it('shows the start time of an unfinished attempt without inventing a result',async()=>{
  mocks.getPublicObservation.mockResolvedValue({...evidence,last_success:null,latest_attempt:{...fact,state:'PENDING',checked_at:null}});
  render(<Observation kind="publication" id="asset"/>);
  await screen.findByText(/Pengecekan belum selesai/);
  expect(screen.getByText(/Mulai diperiksa:/).querySelector('time')).toHaveAttribute('datetime',fact.started_at);
  expect(screen.getByText('Belum ada hasil pengecekan')).toBeInTheDocument();
  expect(screen.queryByText('Tidak ditemukan saat dicek')).not.toBeInTheDocument();
});
it('read-only permission cannot start a new observation',async()=>{
  mocks.allowed=false;render(<Observation kind="profile" id="profile"/>);
  await screen.findByText('Tampil saat dicek');
  expect(screen.queryByRole('button',{name:'Cek sekarang'})).not.toBeInTheDocument();
  expect(screen.getByText('Hasil dari layanan publik SJ, berlaku saat dicek. Versi publik belum bisa dicocokkan. Status aset dicek terpisah.')).toBeInTheDocument();
});
it('late response from previous selected asset does not replace the new asset',async()=>{
  let finish!:(v:unknown)=>void;mocks.getPublicObservation.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));
  const view=render(<Observation kind="publication" id="old"/>);
  view.rerender(<Observation kind="publication" id="new"/>);
  await screen.findByText('Tampil saat dicek');finish({...evidence,last_success:null,latest_attempt:null});
  await waitFor(()=>expect(screen.getByText('Tampil saat dicek')).toBeInTheDocument());
});
it('StrictMode cleanup invalidates the first request without cancelling the current request',async()=>{
  let finish!:(v:unknown)=>void;
  mocks.getPublicObservation.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));
  render(<StrictMode><Observation kind="publication" id="asset"/></StrictMode>);
  await screen.findByText('Tampil saat dicek');
  await act(async()=>finish({...evidence,last_success:null,latest_attempt:null}));
  expect(screen.getByText('Tampil saat dicek')).toBeInTheDocument();
  expect(screen.queryByText('Belum ada hasil pengecekan')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Cek sekarang'})).not.toBeDisabled();
});
it('an unmounted request cannot replace evidence after mounting the same asset again',async()=>{
  let finish!:(v:unknown)=>void;
  mocks.getPublicObservation.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));
  const first=render(<Observation kind="publication" id="asset"/>);first.unmount();
  render(<Observation kind="publication" id="asset"/>);await screen.findByText('Tampil saat dicek');
  await act(async()=>finish({...evidence,last_success:null,latest_attempt:null}));
  expect(screen.getByText('Tampil saat dicek')).toBeInTheDocument();
});
it('wire rejects fabricated public versions, malformed outcomes and success without latest attempt',()=>{
  expect(()=>validateSjResponse('observationEvidence',evidence)).not.toThrow();
  for(const value of [{...evidence,last_success:{...fact,observed_version:4}},{...evidence,last_success:{...fact,state:'FAILED',failure_code:'TIMEOUT'}},
    {...evidence,last_success:{...fact,checked_at:null}},{...evidence,latest_attempt:null},{...evidence,scope:'BROWSER_RENDERED'}]){
    expect(()=>validateSjResponse('observationEvidence',value)).toThrow();
  }
});
it('initial loading and network failure are not empty or negative public observations',async()=>{
  let reject!:(error:Error)=>void;
  mocks.getPublicObservation.mockReturnValueOnce(new Promise((_,r)=>{reject=r;}));
  render(<Observation kind="publication" id="asset"/>);
  expect(screen.getByRole('status')).toHaveTextContent('Memuat hasil pengecekan');
  expect(screen.queryByText('Belum ada hasil pengecekan')).not.toBeInTheDocument();
  reject(new Error('Jaringan tidak tersedia.'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Jaringan tidak tersedia.');
  expect(screen.queryByText('Tidak ditemukan saat dicek')).not.toBeInTheDocument();
  expect(screen.queryByText('Belum ada hasil pengecekan')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Muat ulang'}));
  expect(await screen.findByText('Tampil saat dicek')).toBeInTheDocument();
});
