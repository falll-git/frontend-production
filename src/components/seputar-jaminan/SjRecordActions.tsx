"use client";

import type { LucideIcon } from 'lucide-react';
import {useId} from 'react';
import SetupActionMenu from '@/components/ui/SetupActionMenu';
import type { SjActionAvailability } from '@/types/seputar-jaminan.types';
import { sjAction } from './actionAvailability';
import { SjPrimaryButton } from './SeputarJaminanUI';

type Action = { name: string; label: string; icon: LucideIcon; onClick: () => void; primary?: boolean; destructive?: boolean };

/** Bank-specific adapter; rendering and menu keyboard behavior stay shared. */
export default function SjRecordActions({subject,actions,busy=false,label='Aksi lainnya'}:{
  subject:{lock_version:number;action_availability?:SjActionAvailability};actions:Action[];busy?:boolean;label?:string;
}) {
  const reasonId=useId();
  const visible=actions.map(action=>({...action,assessment:sjAction(subject,action.name)}))
    .filter(action=>action.assessment.reason_code!=='PERMISSION_DENIED');
  const candidates=visible.filter(action=>action.primary);
  const primary=candidates.find(action=>action.assessment.available) ?? candidates[0];
  const secondary=visible.filter(action=>action!==primary);
  if(!visible.length)return null;
  return <div className="flex w-full flex-wrap items-center justify-end gap-2">
    {primary?<SjPrimaryButton loading={busy} disabled={!primary.assessment.available} aria-describedby={!primary.assessment.available?reasonId:undefined} onClick={primary.onClick}>
      <primary.icon aria-hidden="true" className="size-4"/>{primary.label}
    </SjPrimaryButton>:null}
    {secondary.length?<SetupActionMenu label={label} menuLabel={label} showDisabledItems items={secondary.map(action=>({
      key:action.name,label:action.label,icon:action.icon,tone:action.destructive?'red':'blue',onClick:action.onClick,
      disabled:busy||!action.assessment.available,disabledReason:busy?'Tunggu proses selesai.':action.assessment.reason||undefined,
    }))}/>:null}
    {primary&&!primary.assessment.available?<p id={reasonId} className="w-full text-sm text-slate-600" role="status">{primary.assessment.reason||'Belum bisa dilakukan. Muat ulang lalu coba lagi.'}</p>:null}
  </div>;
}
