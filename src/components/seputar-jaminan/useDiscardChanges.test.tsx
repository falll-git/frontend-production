import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import DashboardModal from '@/components/ui/DashboardModal';
import useDiscardChanges from './useDiscardChanges';

function Editor() {
  const [open,setOpen]=useState(true),[value,setValue]=useState('');
  const guard=useDiscardChanges(open,value,()=>setOpen(false));
  return <><DashboardModal isOpen={open} onClose={guard.requestClose} title="Editor tes"><label>Nama<input value={value} onChange={e=>setValue(e.target.value)}/></label><button onClick={guard.requestClose}>Batal</button></DashboardModal>{guard.confirmation}</>;
}
it('closes pristine forms directly',()=>{render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Batal'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();});
it('keeps dirty input on Escape and lets the user continue or discard explicitly',async()=>{
  const user=userEvent.setup();render(<Editor/>);await user.type(screen.getByLabelText('Nama'),'Belum disimpan');
  await user.keyboard('{Escape}');expect(screen.getByRole('dialog',{name:'Tinggalkan perubahan?'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Lanjut mengisi'}));expect(screen.getByLabelText('Nama')).toHaveValue('Belum disimpan');
  fireEvent.click(screen.getByRole('button',{name:'Batal'}));await user.click(screen.getByRole('button',{name:'Tinggalkan perubahan'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
