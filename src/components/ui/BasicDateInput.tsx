"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  formatDate,
  parseDateString,
  todayIsoDate,
  toIsoDate,
} from "@/lib/utils/date";
import { getAnchoredPopupPosition } from "@/lib/ui/anchored-popup";
import { focusAdjacentToElement } from "@/lib/ui/focus-navigation";

type BasicDateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (nextValue: string) => void;
};

const DATE_INPUT_BUTTON_CLASS =
  "flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white px-4 text-left text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-[#1773B0] focus:ring-3 focus:ring-[#1773B0]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

const MONTH_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function normalizeDateInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoDate) return isoDate[1];

  const parsedDate = parseDateString(trimmed);
  return parsedDate ? toIsoDate(parsedDate) : "";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarDays(viewMonth: Date) {
  const firstDay = startOfMonth(viewMonth);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    return day;
  });
}

function getPopupPosition(trigger: HTMLButtonElement | null) {
  if (!trigger) return {};

  const rect = trigger.getBoundingClientRect();
  return getAnchoredPopupPosition(rect, {
    estimatedHeight: 420,
    minimumUsableHeight: 280,
    minimumWidth: 296,
    // Pada viewport tablet/desktop, 366px memberi ruang minimum 44px untuk
    // ketujuh tombol hari setelah padding dan gap kalender diperhitungkan.
    // Helper posisi tetap mengecilkan popup pada viewport HP agar tidak
    // menimbulkan overflow horizontal.
    preferredWidth: 366,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }) satisfies React.CSSProperties;
}

const BasicDateInput = React.forwardRef<HTMLInputElement, BasicDateInputProps>(
  function BasicDateInput(
    {
      value,
      onChange,
      className,
      placeholder = "Pilih tanggal",
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
    const [open, setOpen] = React.useState(false);
    const [popupStyle, setPopupStyle] = React.useState<React.CSSProperties>({});
    const normalizedValue = normalizeDateInputValue(value);
    const selectedDate = React.useMemo(
      () => (normalizedValue ? parseDateString(normalizedValue) : undefined),
      [normalizedValue],
    );
    const today = React.useMemo(() => startOfDay(new Date()), []);
    const [viewMonth, setViewMonth] = React.useState(() =>
      startOfMonth(selectedDate ?? today),
    );
    const calendarDays = React.useMemo(
      () => buildCalendarDays(viewMonth),
      [viewMonth],
    );
    const displayValue = normalizedValue ? formatDate(normalizedValue) : "";

    React.useEffect(() => {
      if (!open) return;
      const nextViewMonth = startOfMonth(selectedDate ?? today);
      setViewMonth((currentViewMonth) =>
        currentViewMonth.getFullYear() === nextViewMonth.getFullYear() &&
        currentViewMonth.getMonth() === nextViewMonth.getMonth()
          ? currentViewMonth
          : nextViewMonth,
      );
    }, [open, selectedDate, today]);

    React.useEffect(() => {
      if (!open) return;

      const updatePosition = () => {
        setPopupStyle(getPopupPosition(triggerRef.current));
      };

      updatePosition();
      const focusTimer = window.setTimeout(() => {
        const target =
          popupRef.current?.querySelector<HTMLButtonElement>(
            '[data-calendar-selected="true"]',
          ) ??
          popupRef.current?.querySelector<HTMLButtonElement>(
            '[data-calendar-today="true"]',
          ) ??
          popupRef.current?.querySelector<HTMLButtonElement>(
            '[data-calendar-current-month="true"]',
          );
        target?.focus();
      }, 0);

      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node | null;
        if (!target) return;
        if (triggerRef.current?.contains(target)) return;
        if (popupRef.current?.contains(target)) return;
        setOpen(false);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown, {
        passive: true,
      });
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.clearTimeout(focusTimer);
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [open]);

    const handleSelectDate = (date: Date) => {
      onChange(toIsoDate(date));
      setOpen(false);
      triggerRef.current?.focus();
    };

    const handleSelectToday = () => {
      const nextToday = todayIsoDate();
      onChange(nextToday);
      setViewMonth(startOfMonth(parseDateString(nextToday) ?? today));
      setOpen(false);
      triggerRef.current?.focus();
    };

    const handleClear = () => {
      onChange("");
      setOpen(false);
      triggerRef.current?.focus();
    };

    const handleDayKeyDown = (
      event: React.KeyboardEvent<HTMLButtonElement>,
      index: number,
    ) => {
      const movement: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -(index % 7),
        End: 6 - (index % 7),
      };
      const offset = movement[event.key];
      if (offset === undefined) return;

      const nextIndex = Math.max(0, Math.min(calendarDays.length - 1, index + offset));
      const buttons = popupRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-calendar-date]",
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
      <div
        className="relative w-full min-w-0 max-w-full"
        data-ui-control="date"
      >
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
          className={[DATE_INPUT_BUTTON_CLASS, className]
            .filter(Boolean)
            .join(" ")}
          onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
          onClick={() => setOpen((prev) => !prev)}
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
                aria-label="Pilih tanggal"
                onKeyDown={handlePopupKeyDown}
                className="fixed z-[10000] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-2 shadow-xl sm:p-4"
                style={popupStyle}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {MONTH_FORMATTER.format(viewMonth)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                      onClick={() =>
                        setViewMonth((prev) => addMonths(prev, -1))
                      }
                      aria-label="Bulan sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                      onClick={() => setViewMonth((prev) => addMonths(prev, 1))}
                      aria-label="Bulan berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-0 text-center sm:gap-1">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="py-1 text-xs font-semibold uppercase tracking-wide text-gray-400"
                    >
                      {label}
                    </div>
                  ))}

                  {calendarDays.map((date, index) => {
                    const isoDate = toIsoDate(date);
                    const isCurrentMonth =
                      date.getMonth() === viewMonth.getMonth();
                    const isSelected = selectedDate
                      ? isSameDay(date, selectedDate)
                      : false;
                    const isToday = isSameDay(date, today);

                    return (
                      <button
                        key={isoDate}
                        type="button"
                        data-calendar-date={isoDate}
                        data-calendar-selected={isSelected ? "true" : undefined}
                        data-calendar-today={isToday ? "true" : undefined}
                        data-calendar-current-month={
                          isCurrentMonth ? "true" : undefined
                        }
                        aria-label={FULL_DATE_FORMATTER.format(date)}
                        aria-current={isToday ? "date" : undefined}
                        className={[
                          "flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20",
                          isSelected
                            ? "border-[#1773B0] bg-[#1773B0] text-white shadow-sm hover:bg-[#12699f]"
                            : "border-transparent text-gray-800 hover:bg-gray-100",
                          !isSelected && isToday
                            ? "border-[#1773B0]/30 text-[#1773B0]"
                            : "",
                          !isCurrentMonth && !isSelected
                            ? "text-gray-400 hover:text-gray-600"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleSelectDate(date)}
                        onKeyDown={(event) => handleDayKeyDown(event, index)}
                      >
                        {date.getDate()}
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
                    onClick={handleSelectToday}
                  >
                    Hari ini
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  },
);

export default BasicDateInput;
