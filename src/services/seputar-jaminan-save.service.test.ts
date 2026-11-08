import { describe,it,expect,vi } from 'vitest';
import { sjSaveService,validateSaveReceipt } from './seputar-jaminan-save.service';
import api from '@/lib/axios';
vi.mock('@/lib/axios',()=>({default:{post:vi.fn(),get:vi.fn()}}));
const id='10000000-0000-4000-8000-000000000001';
const receipt={operation_id:id,kind:'CONTACT',intent:'SAVE_AND_SUBMIT',resource_id:'10000000-0000-4000-8000-000000000002',lock_version:2,state:'IN_REVIEW',completed_at:'2026-09-27T06:00:00Z'};
describe('SJ save receipt',()=>{
  it('keeps a saved initial publication distinct from submitted content',()=>{
    const partial={...receipt,kind:'PUBLICATION',state:'DRAFT',submission_error:'Foto belum siap.'};
    expect(validateSaveReceipt(partial,id)).toEqual(partial);
    for(const value of [{...partial,submission_error:null},{...partial,kind:'CONTACT'},{...partial,state:'IN_REVIEW'}])expect(()=>validateSaveReceipt(value,id)).toThrow();
  });
  it('validates identity, result state, version and time, not HTTP success alone',()=>{
    expect(validateSaveReceipt(receipt,id)).toEqual(receipt);
    for(const value of [{},{...receipt,operation_id:receipt.resource_id},{...receipt,state:'PUBLISHED'},{...receipt,lock_version:-1},{...receipt,completed_at:'invalid'}])expect(()=>validateSaveReceipt(value,id)).toThrow();
  });
  it('binds response to request kind and resource',async()=>{
    vi.mocked(api.post).mockResolvedValue({data:{success:true,data:receipt}});
    await expect(sjSaveService.execute(id,{kind:'PROFILE',intent:'SAVE_AND_SUBMIT',draft:{}})).rejects.toThrow('tidak cocok');
  });
  it('keeps NOT_RECORDED separate from completed and malformed responses',async()=>{
    vi.mocked(api.get).mockResolvedValue({data:{success:true,data:{status:'NOT_RECORDED',receipt:null}}});
    expect(await sjSaveService.read(id)).toBeNull();
    vi.mocked(api.get).mockResolvedValue({data:{success:true,data:{}}});
    await expect(sjSaveService.read(id)).rejects.toThrow();
  });
});
