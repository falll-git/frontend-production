"use client";

import { useCallback, useSyncExternalStore } from "react";

const eventName = "sj-list-query-change";
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(eventName, notify);
  };
}
const snapshot = () => window.location.search;
const serverSnapshot = () => "";

// Keep list navigation in the URL without reloading the authenticated shell.
// Next supports native history; retain unrelated query keys and the hash.
export default function useSjListQuery() {
  const search = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const params = new URLSearchParams(search);
  const update = useCallback((values: Record<string, string | number>, replace = false) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value === "" || ((key === "page" || key === "changes_page") && value === 1)) url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    }
    const destination = url.pathname + url.search + url.hash;
    if (destination === window.location.pathname + window.location.search + window.location.hash) return;
    if (replace) window.history.replaceState(null, "", destination);
    else window.history.pushState(null, "", destination);
    window.dispatchEvent(new Event(eventName));
  }, []);
  return { params, update };
}
