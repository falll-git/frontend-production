"use client";

import { useEffect } from "react";

export default function useSeputarJaminanModalScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [enabled]);
}
