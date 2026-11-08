'use client';
import { useEffect, useRef, useState } from 'react';
import { sjSaveService, type SjSaveRequest, type SjSaveReceipt } from '@/services/seputar-jaminan-save.service';

const uncertainMessage = 'Hasil penyimpanan belum bisa dipastikan. Periksa kembali sebelum membuat perubahan lain.';

/** Keep the exact request identity while its outcome is uncertain. Never retry with a new key. */
export default function useSjSaveOperation() {
  const active = useRef(false);
  const pending = useRef<{id:string;request:SjSaveRequest}|null>(null);
  const [uncertain,setUncertain] = useState(false);
  useEffect(() => {
    const guard = (event:BeforeUnloadEvent) => {
      if (pending.current) { event.preventDefault(); event.returnValue=''; }
    };
    window.addEventListener('beforeunload',guard);
    return () => window.removeEventListener('beforeunload',guard);
  },[]);
  const run = async (request:SjSaveRequest):Promise<SjSaveReceipt|null> => {
    if (active.current) return null;
    active.current = true;
    const wasPending = Boolean(pending.current);
    const operation = pending.current ?? {id:crypto.randomUUID(),request:structuredClone(request)};
    pending.current = operation;
    let replayExecuted = false;
    const complete = (receipt:SjSaveReceipt) => {
      if (receipt.kind !== operation.request.kind || receipt.intent !== operation.request.intent
        || (operation.request.resource_id && receipt.resource_id !== operation.request.resource_id)) throw Error('Hasil penyimpanan tidak cocok.');
      pending.current=null;setUncertain(false);return receipt;
    };
    try {
      if (wasPending) {
        const receipt = await sjSaveService.read(operation.id);
        if (receipt) return complete(receipt);
      }
      replayExecuted = true;
      return complete(await sjSaveService.execute(operation.id,operation.request));
    } catch(error) {
      // A previous request may already have committed, even if a retry now returns 409.
      let checkedAbsent = false;
      try {
        const receipt = await sjSaveService.read(operation.id);
        if (receipt) return complete(receipt);
        checkedAbsent = true;
      } catch { /* Keep uncertainty; no success or failure inferred from a failed check. */ }
      const failure = error as {statusCode?:number;response?:{status?:number}};
      const status = failure?.statusCode ?? failure?.response?.status;
      // A same-key replay reaches the serialized server transaction. A business
      // conflict plus a successful absent-receipt check permits correction;
      // failed reads/auth checks alone never resolve an uncertain outcome.
      if (status && ((!wasPending && [400,401,403,404,409,422].includes(status))
        || (wasPending && replayExecuted && checkedAbsent && status === 409))) {
        pending.current=null;setUncertain(false);throw error;
      }
      setUncertain(true);throw Error(uncertainMessage);
    } finally { active.current=false; }
  };
  return {run,uncertain,isRunning:()=>active.current};
}
