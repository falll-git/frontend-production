"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { MoveHorizontal } from "lucide-react";

export const IDEB_DETAIL_TABS = [
  { id: "SUMMARY", label: "Ringkasan" },
  { id: "FACILITIES", label: "Fasilitas" },
  { id: "COLLATERAL", label: "Agunan & Penjamin" },
  { id: "CONCLUSION", label: "Kesimpulan" },
] as const;

export type IdebDetailTab = (typeof IDEB_DETAIL_TABS)[number]["id"];

const SCROLL_EDGE_TOLERANCE_PX = 6;

function tabElementId(tab: IdebDetailTab) {
  return `ideb-detail-tab-${tab.toLowerCase()}`;
}

export function getIdebDetailTabElementId(tab: IdebDetailTab) {
  return tabElementId(tab);
}

export default function IdebDetailTabNavigation({
  activeTab,
  onChange,
}: {
  activeTab: IdebDetailTab;
  onChange: (tab: IdebDetailTab) => void;
}) {
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const hintId = useId();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const tabList = tabListRef.current;
    if (!tabList) return;

    const maxScrollLeft = Math.max(0, tabList.scrollWidth - tabList.clientWidth);
    setCanScrollLeft(tabList.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
    setCanScrollRight(
      tabList.scrollLeft < maxScrollLeft - SCROLL_EDGE_TOLERANCE_PX,
    );
  }, []);

  const keepTabVisible = useCallback(
    (tab: IdebDetailTab) => {
      const button = tabListRef.current?.querySelector<HTMLButtonElement>(
        `[data-ideb-detail-tab="${tab}"]`,
      );
      button?.scrollIntoView?.({ block: "nearest", inline: "nearest" });

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(updateScrollIndicators);
      } else {
        updateScrollIndicators();
      }
    },
    [updateScrollIndicators],
  );

  useEffect(() => {
    const tabList = tabListRef.current;
    if (!tabList) return;

    const handleScroll = () => updateScrollIndicators();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScrollIndicators);

    updateScrollIndicators();
    tabList.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollIndicators);
    resizeObserver?.observe(tabList);

    return () => {
      tabList.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollIndicators);
      resizeObserver?.disconnect();
    };
  }, [updateScrollIndicators]);

  useEffect(() => {
    keepTabVisible(activeTab);
  }, [activeTab, keepTabVisible]);

  const focusAndActivate = (index: number) => {
    const tab = IDEB_DETAIL_TABS[index];
    if (!tab) return;

    onChange(tab.id);
    const button = tabListRef.current?.querySelector<HTMLButtonElement>(
      `[data-ideb-detail-tab="${tab.id}"]`,
    );
    button?.focus();
    keepTabVisible(tab.id);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % IDEB_DETAIL_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + IDEB_DETAIL_TABS.length) % IDEB_DETAIL_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = IDEB_DETAIL_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      focusAndActivate(nextIndex);
    }
  };

  return (
    <div className="space-y-1.5">
      <span id={hintId} className="sr-only">
        Geser ke samping untuk melihat tab lainnya.
      </span>
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div
          ref={tabListRef}
          className="flex min-w-0 max-w-full scroll-smooth gap-1 overflow-x-auto p-1"
          role="tablist"
          aria-label="Bagian detail IDEB"
          aria-describedby={hintId}
          aria-orientation="horizontal"
          data-testid="ideb-detail-tablist"
        >
          {IDEB_DETAIL_TABS.map((tab, index) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={tabElementId(tab.id)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="ideb-detail-panel"
                tabIndex={active ? 0 : -1}
                data-ideb-detail-tab={tab.id}
                className={`min-h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-[#157ec3] shadow-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
                onClick={() => onChange(tab.id)}
                onFocus={() => keepTabVisible(tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {canScrollLeft ? (
          <span
            data-testid="ideb-tab-fade-left"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-9 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent md:hidden"
            aria-hidden="true"
          />
        ) : null}
        {canScrollRight ? (
          <span
            data-testid="ideb-tab-fade-right"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-9 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent md:hidden"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {canScrollLeft || canScrollRight ? (
        <p
          className="flex items-center gap-1.5 px-1 text-xs font-medium text-slate-500 md:hidden"
          data-testid="ideb-tab-visible-scroll-hint"
        >
          <MoveHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Geser untuk melihat tab lainnya
        </p>
      ) : null}
    </div>
  );
}
