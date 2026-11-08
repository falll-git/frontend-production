import type { SjActionAvailability, SjSettings, SjMedia } from '@/types/seputar-jaminan.types';

type ActionSubject = { lock_version: number; action_availability?: SjActionAvailability };

/** A read-time assessment is not a transaction result. The API still rechecks it. */
export function sjAction(subject: ActionSubject | null | undefined, name: string) {
  const availability = subject?.action_availability;
  if (!availability || availability.scope !== 'START_ACTION' ||
      availability.expected_version !== subject?.lock_version ||
      availability.revalidated_on_submit !== true || !availability.actions[name]) {
    return { available: false, reason: 'Muat ulang untuk memeriksa tindakan yang tersedia.', reason_code: 'ASSESSMENT_UNAVAILABLE', mode: 'DIRECT' as const };
  }
  return availability.actions[name];
}

export function sjActionButton(subject: ActionSubject | null | undefined, name: string) {
  const action = sjAction(subject, name);
  return { disabled: !action.available, title: action.reason || undefined };
}

export function sjEntryAction(settings:SjSettings|null|undefined,name:string){
  const a=settings?.entry_actions;
  if(!a||a.scope!=='START_ACTION'||a.expected_version!==null||a.revalidated_on_submit!==true||!a.actions[name]){
    return {available:false,reason:'Muat ulang untuk memeriksa tindakan yang tersedia.',reason_code:'ASSESSMENT_UNAVAILABLE',mode:'DIRECT' as const};
  }
  return a.actions[name];
}
export function sjEntryButton(settings:SjSettings|null|undefined,name:string){
  const a=sjEntryAction(settings,name);return {disabled:!a.available,title:a.reason||undefined};
}
export function sjMediaAction(media:SjMedia,name:string){
  const a=media.action_availability;
  if(!a||a.scope!=='START_ACTION'||a.expected_version!==null||a.revalidated_on_submit!==true||!a.actions[name]){
    return {available:false,reason:'Muat ulang untuk memeriksa tindakan yang tersedia.',reason_code:'ASSESSMENT_UNAVAILABLE',mode:'DIRECT' as const};
  }
  return a.actions[name];
}
