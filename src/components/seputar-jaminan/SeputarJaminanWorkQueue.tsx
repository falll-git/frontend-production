"use client";

import { useEffect } from "react";
import SetupState from "@/components/ui/SetupState";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { SJ_SUBMISSIONS } from "./SeputarJaminanUI";
import useSjListQuery from "./useSjListQuery";
import SeputarJaminanSubmissionsClient from "./SeputarJaminanSubmissionsClient";

export default function SeputarJaminanWorkQueue() {
  const { hasCapability } = useProtectedAction();
  const { params, update } = useSjListQuery();
  const legacyDelivery = params.get("view") === "pengiriman";
  useEffect(() => {
    // Replace the retired view, retaining filters/cursors and Back/Forward.
    if (legacyDelivery) update({ view: "" }, true);
  }, [legacyDelivery, update]);
  // Monitoring permission never grants access to submission data.
  if (!hasCapability(SJ_SUBMISSIONS, "read")) {
    return <SetupState title="Tidak ada akses" description="Akun Anda belum memiliki izin untuk melihat pengajuan." />;
  }
  return <SeputarJaminanSubmissionsClient />;
}
