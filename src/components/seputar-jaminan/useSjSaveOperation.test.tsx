import { act,renderHook } from '@testing-library/react';
import { beforeEach,expect,it,vi } from 'vitest';
import useSjSaveOperation from './useSjSaveOperation';
import { sjSaveService,type SjSaveReceipt } from '@/services/seputar-jaminan-save.service';
vi.mock('@/services/seputar-jaminan-save.service',()=>({sjSaveService:{execute:vi.fn(),read:vi.fn()}}));
const request={kind:'CONTACT' as const,intent:'SAVE_AND_SUBMIT' as const,draft:{label:'Kontak'}};
const receipt=(id:string):SjSaveReceipt=>({operation_id:id,kind:'CONTACT',intent:'SAVE_AND_SUBMIT',resource_id:'10000000-0000-4000-8000-000000000002',lock_version:2,state:'IN_REVIEW',completed_at:'2026-09-27T06:00:00Z'});
beforeEach(()=>vi.clearAllMocks());
it('blocks two clicks synchronously',async()=>{
  let resolve!:(r:SjSaveReceipt)=>void;
  vi.mocked(sjSaveService.execute).mockImplementation(id=>new Promise(r=>{resolve=()=>r(receipt(id));}));
  const {result}=renderHook(()=>useSjSaveOperation());
  await act(async()=>{const first=result.current.run(request);expect(await result.current.run(request)).toBeNull();resolve(receipt(''));await first;});
  expect(sjSaveService.execute).toHaveBeenCalledTimes(1);
});
it('lost response is checked without duplicating committed submission',async()=>{
  let key='';
  vi.mocked(sjSaveService.execute).mockImplementation(async id=>{key=id;throw Error('timeout');});
  vi.mocked(sjSaveService.read).mockImplementation(async()=>receipt(key));
  const {result}=renderHook(()=>useSjSaveOperation());
  await act(async()=>{expect(await result.current.run(request)).toEqual(receipt(key));});
  expect(result.current.uncertain).toBe(false);
  expect(sjSaveService.execute).toHaveBeenCalledTimes(1);
});
it('unknown results retain the original key and original payload',async()=>{
  vi.mocked(sjSaveService.execute).mockRejectedValueOnce(Error('offline')).mockImplementation(async id=>receipt(id));
  vi.mocked(sjSaveService.read).mockResolvedValue(null);
  const {result}=renderHook(()=>useSjSaveOperation());
  await act(async()=>{await expect(result.current.run(request)).rejects.toThrow('belum bisa dipastikan');});
  expect(result.current.uncertain).toBe(true);
  await act(async()=>{await result.current.run({...request,draft:{label:'Must not replace pending request'}});});
  expect(vi.mocked(sjSaveService.execute).mock.calls[1]).toEqual(vi.mocked(sjSaveService.execute).mock.calls[0]);
  expect(result.current.uncertain).toBe(false);
});
it('allows correcting a rejected same-key replay only after an absent receipt is verified',async()=>{
  vi.mocked(sjSaveService.execute).mockRejectedValueOnce(Error('offline')).mockRejectedValueOnce(Object.assign(Error('Data berubah'),{statusCode:409}));
  vi.mocked(sjSaveService.read).mockResolvedValue(null);
  const {result}=renderHook(()=>useSjSaveOperation());
  await act(async()=>{await expect(result.current.run(request)).rejects.toThrow('belum bisa dipastikan');});
  await act(async()=>{await expect(result.current.run(request)).rejects.toThrow('Data berubah');});
  expect(result.current.uncertain).toBe(false);
  expect(vi.mocked(sjSaveService.execute).mock.calls[1]).toEqual(vi.mocked(sjSaveService.execute).mock.calls[0]);
});
it('a failed recovery read never retries or clears uncertainty',async()=>{
  vi.mocked(sjSaveService.execute).mockRejectedValue(Error('offline'));
  vi.mocked(sjSaveService.read).mockRejectedValue(Error('offline'));
  const {result}=renderHook(()=>useSjSaveOperation());
  await act(async()=>{await expect(result.current.run(request)).rejects.toThrow('belum bisa dipastikan');});
  await act(async()=>{await expect(result.current.run(request)).rejects.toThrow('belum bisa dipastikan');});
  expect(sjSaveService.execute).toHaveBeenCalledTimes(1);
  expect(result.current.uncertain).toBe(true);
});
