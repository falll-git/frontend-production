"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";

/** Keep each result attached to the request (including its access scope) that produced it. */
export function useDebtorRequest<T>(
  request: () => Promise<T>,
  fallbackMessage: string,
  {
    enabled = true,
    notifyError = true,
    clearDataOnError = false,
  }: {
    enabled?: boolean;
    notifyError?: boolean;
    clearDataOnError?: boolean;
  } = {},
) {
  const { showToast } = useAppToast();
  const { role, status, user } = useAuth();
  const canRequest = enabled && status === "authenticated";
  const requestKey = useMemo(
    () => ({ request, canRequest, role, user }),
    [canRequest, request, role, user],
  );
  const [snapshot, setSnapshot] = useState<{
    key: typeof requestKey;
    data: T | null;
    error: string | null;
  } | null>(null);
  const [reloadingKey, setReloadingKey] = useState<typeof requestKey | null>(null);
  const requestSequence = useRef(0);
  const activeRequest = useRef<typeof requestKey | null>(null);

  const run = useCallback(() => {
    if (activeRequest.current !== requestKey) return Promise.resolve();
    const sequence = ++requestSequence.current;
    return request().then(
      (data) => {
        if (sequence !== requestSequence.current) return;
        setSnapshot({ key: requestKey, data, error: null });
        setReloadingKey(null);
      },
      (error: unknown) => {
        if (sequence !== requestSequence.current) return;
        const message = error instanceof Error ? error.message : fallbackMessage;
        setSnapshot((current) => ({
          key: requestKey,
          data:
            !clearDataOnError && current?.key === requestKey ? current.data : null,
          error: message,
        }));
        setReloadingKey(null);
        if (notifyError) showToast(message, "error");
      },
    );
  }, [clearDataOnError, fallbackMessage, notifyError, request, requestKey, showToast]);

  useEffect(() => {
    if (!canRequest) return;
    activeRequest.current = requestKey;
    void run();
    return () => {
      // Invalidate late responses on a new request, revoked access, or unmount.
      requestSequence.current += 1;
      activeRequest.current = null;
    };
  }, [canRequest, requestKey, run]);

  const reload = useCallback(async () => {
    if (activeRequest.current !== requestKey) return;
    setReloadingKey(requestKey);
    await run();
  }, [requestKey, run]);

  const updateData = useCallback(
    (update: (current: T) => T) => {
      setSnapshot((current) =>
        current?.key === requestKey && current.data !== null
          ? { ...current, data: update(current.data) }
          : current,
      );
    },
    [requestKey],
  );

  const isCurrent = canRequest && snapshot?.key === requestKey;
  const isReloading = reloadingKey === requestKey;
  return {
    data: isCurrent ? snapshot.data : null,
    errorMessage: isCurrent && !isReloading ? snapshot.error : null,
    isLoading: canRequest && (!isCurrent || isReloading),
    reload,
    updateData,
  };
}
