"use client";

import { useCallback, useEffect, useRef } from "react";

interface ObjectUrlRegistry {
  createObjectUrl: (file: File) => string;
  revokeObjectUrl: (url?: string) => void;
  replaceObjectUrl: (file: File | null, currentUrl?: string) => string | undefined;
}

export function useObjectUrlRegistry(): ObjectUrlRegistry {
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const createObjectUrl = useCallback((file: File): string => {
    const nextUrl = URL.createObjectURL(file);
    objectUrlsRef.current.add(nextUrl);
    return nextUrl;
  }, []);

  const revokeObjectUrl = useCallback((url?: string): void => {
    if (!url?.startsWith("blob:")) {
      return;
    }

    objectUrlsRef.current.delete(url);
    URL.revokeObjectURL(url);
  }, []);

  const replaceObjectUrl = useCallback(
    (file: File | null, currentUrl?: string): string | undefined => {
      if (!file) {
        return currentUrl;
      }

      revokeObjectUrl(currentUrl);
      return createObjectUrl(file);
    },
    [createObjectUrl, revokeObjectUrl],
  );

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
      objectUrls.clear();
    };
  }, []);

  return {
    createObjectUrl,
    revokeObjectUrl,
    replaceObjectUrl,
  };
}
