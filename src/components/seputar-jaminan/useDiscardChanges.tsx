"use client";

import { useEffect, useRef, useState } from "react";
import DashboardModal from "@/components/ui/DashboardModal";
import usePageScrollLock from "@/hooks/usePageScrollLock";
import { SjPrimaryButton, SjSecondaryButton } from "./SeputarJaminanUI";

/** Local editor protection; never saves or changes business state on dismissal. */
export default function useDiscardChanges(open: boolean, value: unknown, close: () => void, busy = false, initialValue?: unknown) {
  const serialized = JSON.stringify(value);
  const initialSerialized = JSON.stringify(initialValue ?? value);
  const initial = useRef<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  usePageScrollLock(open && confirm);
  useEffect(() => {
    if (!open) initial.current = null;
    else if (initial.current === null) initial.current = initialSerialized;
  }, [open, initialSerialized]);
  useEffect(() => {
    if (!open) return;
    const guard = (event: BeforeUnloadEvent) => {
      if (initial.current !== serialized) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [open, serialized]);
  return {
    requestClose: () => {
      if (busy) return;
      if (initial.current !== null && initial.current !== serialized) setConfirm(true);
      else close();
    },
    confirmation: <DashboardModal isOpen={open && confirm} onClose={() => setConfirm(false)} maxWidth="md"
      title="Tinggalkan perubahan?" description="Isian yang belum disimpan akan hilang. Data yang sudah tersimpan tidak dihapus."
      footer={<><SjSecondaryButton onClick={() => setConfirm(false)}>Lanjut mengisi</SjSecondaryButton><SjPrimaryButton onClick={() => { setConfirm(false); close(); }}>Tinggalkan perubahan</SjPrimaryButton></>}>
      <p className="text-sm text-slate-600">Pilih lanjut mengisi jika masih ingin menyimpan perubahan ini.</p>
    </DashboardModal>,
  };
}
