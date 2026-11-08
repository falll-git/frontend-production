import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {Pencil,Send,Archive} from 'lucide-react';
import SjRecordActions from './SjRecordActions';
import type {SjActionAvailability} from '@/types/seputar-jaminan.types';
import {PUBLICATION_STATE_LABEL,SYNC_STATE_LABEL,DELIVERY_LABEL,CHANGE_STATE_LABEL} from './labels';
const allowed={available:true,reason:null,reason_code:null,mode:'DIRECT' as const};
const action=vi.fn();
const actions=[{name:'submit',label:'Ajukan',icon:Send,primary:true,onClick:action},{name:'edit_draft',label:'Ubah',icon:Pencil,primary:true,onClick:action},{name:'archive',label:'Arsipkan',icon:Archive,destructive:true,onClick:action}];
const subject=(entries:SjActionAvailability['actions'],version=1)=>({lock_version:version,action_availability:{scope:'START_ACTION' as const,expected_version:1,revalidated_on_submit:true as const,actions:entries}});
it('keeps decision, delivery, quarantine and public visibility separate',()=>{
 expect(PUBLICATION_STATE_LABEL.PUBLISHED).not.toMatch(/tampil|tayang/i);
 expect(SYNC_STATE_LABEL.ACKNOWLEDGED).toBe('Diterima tujuan');
 expect(DELIVERY_LABEL.RECEIVED_BY_CONTROL).toBe('Diterima pemeriksa');
 expect(SYNC_STATE_LABEL.QUARANTINED).not.toBe(SYNC_STATE_LABEL.RETRYING);
 expect(CHANGE_STATE_LABEL.REJECTED).not.toBe(CHANGE_STATE_LABEL.REVISION_REQUIRED);
 expect(CHANGE_STATE_LABEL.COMPLETED).toBe('Selesai');
 expect(CHANGE_STATE_LABEL.COMPLETED).not.toMatch(/pusat|terkirim|tampil|tayang/i);
 expect(CHANGE_STATE_LABEL.APPLIED).toBe('Diterapkan di bank');
});
it('selects one available primary and moves secondary actions into the existing keyboard menu',async()=>{
 const user=userEvent.setup();render(<SjRecordActions subject={subject({submit:allowed,edit_draft:allowed,archive:allowed})} actions={actions}/>);
 expect(screen.getByRole('button',{name:'Ajukan'})).toBeEnabled();
 expect(screen.queryByRole('button',{name:'Ubah'})).not.toBeInTheDocument();
 const trigger=screen.getByRole('button',{name:'Aksi lainnya'});await user.click(trigger);
 expect(screen.getByRole('menuitem',{name:'Ubah'})).toBeVisible();
 expect(screen.getByRole('menuitem',{name:'Arsipkan'})).toBeVisible();
 await user.keyboard('{Escape}');expect(trigger).toHaveFocus();
});
it('hides denied actions but explains blocked actions, including a stale assessment',async()=>{
 const user=userEvent.setup();const view=render(<SjRecordActions subject={subject({submit:{...allowed,available:false,reason:'Logo belum siap.',reason_code:'LOGO_NOT_READY'},edit_draft:allowed,archive:{...allowed,available:false,reason:'Tidak diizinkan',reason_code:'PERMISSION_DENIED'}})} actions={actions}/>);
 expect(screen.getByRole('button',{name:'Ubah'})).toBeEnabled();
 await user.click(screen.getByRole('button',{name:'Aksi lainnya'}));
 expect(screen.getByRole('menuitem',{name:/Ajukan/})).toHaveAttribute('aria-disabled','true');
 expect(screen.getByText('Logo belum siap.')).toBeVisible();
 expect(screen.queryByRole('menuitem',{name:'Arsipkan'})).not.toBeInTheDocument();
 await user.keyboard('{Escape}');view.rerender(<SjRecordActions subject={subject({submit:allowed},2)} actions={[actions[0]]}/>);
 expect(screen.getByRole('button',{name:'Ajukan'})).toBeDisabled();
 expect(screen.getByRole('status')).toHaveTextContent('Muat ulang');
});
it('disables all actions while saving and renders nothing when every action is forbidden',()=>{
 const view=render(<SjRecordActions busy subject={subject({submit:allowed})} actions={[actions[0]]}/>);
 expect(screen.getByRole('button',{name:'Ajukan'})).toBeDisabled();
 view.rerender(<SjRecordActions subject={subject({submit:{...allowed,available:false,reason:'Tidak diizinkan',reason_code:'PERMISSION_DENIED'}})} actions={[actions[0]]}/>);
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
