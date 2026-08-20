"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { getAnchoredPopupPosition } from "@/lib/ui/anchored-popup";
import { focusAdjacentToElement } from "@/lib/ui/focus-navigation";

type BasicMonthInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (nextValue: string) => void;
};

const MONTH_INPUT_BUTTON_CLASS =
  "flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white px-4 text-left text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-[#1773B0] focus:ring-3 focus:ring-[#1773B0]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
});

const MONTH_VALUE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

function normalizeMonthInputValue(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value.trim());
  return match ? match[0] : "";
}

function monthDate(value: string) {
  const normalized = normalizeMonthInputValue(value);
  if (!normalized) return null;
  const [year, month] = normalized.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function toMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function getPopupPosition(trigger: HTMLButtonElement | null) {
  if (!trigger) return {};

  const rect = trigger.getBoundingClientRect();
  return getAnchoredPopupPosition(rect, {
    estimatedHeight: 330,
    minimumUsableHeight: 240,
    minimumWidth: 260,
    preferredWidth: 320,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }) satisfies React.CSSProperties;
}

const BasicMonthInput = React.forwardRef<
  HTMLInputElement,
  BasicMonthInputProps
>(function BasicMonthInput(
  {
    value,
    onChange,
    className,
    placeholder = "Pilih bulan",
    disabled,
    id,
    name,
    required,
    onBlur,
    onFocus,
    ...props
  },
  ref,
) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popupRef = React.useRef<HTMLDivElement | null>(null);
  const popupId = React.useId();
  const normalizedValue = normalizeMonthInputValue(value);
  const selectedMonth = React.useMemo(
    () => monthDate(normalizedValue),
    [normalizedValue],
  );
  const currentMonth = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(
    () => selectedMonth?.getFullYear() ?? currentMonth.getFullYear(),
  );
  const [popupStyle, setPopupStyle] = React.useState<React.CSSProperties>({});
  const displayValue = selectedMonth
    ? MONTH_VALUE_FORMATTER.format(selectedMonth)
    : "";

  React.useEffect(() => {
    if (open) {
      setViewYear(selectedMonth?.getFullYear() ?? currentMonth.getFullYear());
    }
  }, [currentMonth, open, selectedMonth]);

  React.useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      setPopupStyle(getPopupPosition(triggerRef.current));
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    updatePosition();
    const focusTimer = window.setTimeout(() => {
      const target =
        popupRef.current?.querySelector<HTMLButtonElement>(
          '[data-month-selected="true"]',
        ) ??
        popupRef.current?.querySelector<HTMLButtonElement>(
          '[data-month-current="true"]',
        ) ??
        popupRef.current?.querySelector<HTMLButtonElement>(
          '[data-month-index="0"]',
        );
      target?.focus();
    }, 0);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const closeAndFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelectMonth = (monthIndex: number) => {
    onChange(toMonthValue(viewYear, monthIndex));
    closeAndFocus();
  };

  const handleSelectCurrentMonth = () => {
    onChange(toMonthValue(currentMonth.getFullYear(), currentMonth.getMonth()));
    closeAndFocus();
  };

  const handleClear = () => {
    onChange("");
    closeAndFocus();
  };

  const handleMonthKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    monthIndex: number,
  ) => {
    const movement: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
      Home: -monthIndex,
      End: 11 - monthIndex,
    };
    const offset = movement[event.key];
    if (offset === undefined) return;

    const nextIndex = Math.max(0, Math.min(11, monthIndex + offset));
    const buttons = popupRef.current?.querySelectorAll<HTMLButtonElement>(
      "[data-month-index]",
    );
    event.preventDefault();
    buttons?.[nextIndex]?.focus();
  };

  const handlePopupKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    event.preventDefault();
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    setOpen(false);
    if (trigger) {
      focusAdjacentToElement(trigger, event.shiftKey ? -1 : 1, popup);
    }
  };

  return (
    <div className="relative w-full min-w-0 max-w-full" data-ui-control="month">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={props["aria-label"] ?? placeholder}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popupId : undefined}
        data-required={required ? "true" : undefined}
        className={[MONTH_INPUT_BUTTON_CLASS, className]
          .filter(Boolean)
          .join(" ")}
        onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
        onClick={() => setOpen((current) => !current)}
        onFocus={onFocus as React.FocusEventHandler<HTMLButtonElement>}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            displayValue ? "text-gray-800" : "text-gray-600"
          }`}
        >
          {displayValue || placeholder}
        </span>
        <CalendarDays
          className="h-4 w-4 shrink-0 text-gray-600"
          aria-hidden="true"
        />
      </button>

      <input
        ref={ref}
        type="hidden"
        name={name}
        value={normalizedValue}
        readOnly
      />

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              id={popupId}
              ref={popupRef}
                  role="dialog"
                  aria-label="Pilih bulan"
                  onKeyDown={handlePopupKeyDown}
              className="fixed z-[10000] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
              style={popupStyle}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {viewYear}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                    onClick={() => setViewYear((year) => year - 1)}
                    aria-label="Tahun sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                    onClick={() => setViewYear((year) => year + 1)}
                    aria-label="Tahun berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const optionDate = new Date(viewYear, monthIndex, 1);
                  const isSelected =
                    selectedMonth?.getFullYear() === viewYear &&
                    selectedMonth.getMonth() === monthIndex;
                  const isCurrent =
                    currentMonth.getFullYear() === viewYear &&
                    currentMonth.getMonth() === monthIndex;

                  return (
                    <button
                      key={monthIndex}
                      type="button"
                      data-month-index={monthIndex}
                      data-month-selected={isSelected ? "true" : undefined}
                      data-month-current={isCurrent ? "true" : undefined}
                      aria-label={MONTH_VALUE_FORMATTER.format(optionDate)}
                      aria-current={isCurrent ? "date" : undefined}
                      className={[
                        "min-h-11 rounded-lg border px-2 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20",
                        isSelected
                          ? "border-[#1773B0] bg-[#1773B0] text-white shadow-sm hover:bg-[#12699f]"
                          : "border-transparent text-gray-800 hover:bg-gray-100",
                        !isSelected && isCurrent
                          ? "border-[#1773B0]/30 text-[#1773B0]"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleSelectMonth(monthIndex)}
                      onKeyDown={(event) =>
                        handleMonthKeyDown(event, monthIndex)
                      }
                    >
                      {MONTH_LABEL_FORMATTER.format(optionDate)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <button
                  type="button"
                  className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                  onClick={handleClear}
                >
                  Bersihkan
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-[#1773B0] transition hover:bg-[#1773B0]/10 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                  onClick={handleSelectCurrentMonth}
                >
                  Bulan ini
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});

export default BasicMonthInput;
