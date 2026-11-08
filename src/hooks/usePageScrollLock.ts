"use client";

import { useEffect } from 'react';

// The dashboard gives both html and body overflow-y:auto. Locking only body
// leaves the document scrollable behind dialogs and mobile navigation.
let owners = 0;
let previous: { body: string; root: string; gutter: string } | null = null;

export default function usePageScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    if (owners++ === 0) {
      previous = { body: document.body.style.overflow, root: root.style.overflow, gutter: root.style.scrollbarGutter };
      root.style.scrollbarGutter = 'stable';
      root.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    return () => {
      owners--;
      if (owners === 0 && previous) {
        document.body.style.overflow = previous.body;
        root.style.overflow = previous.root;
        root.style.scrollbarGutter = previous.gutter;
        previous = null;
      }
    };
  }, [enabled]);
}
