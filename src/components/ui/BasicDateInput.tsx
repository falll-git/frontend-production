"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { formatDate, parseDateString, todayIsoDate, toIsoDate } from "@/lib/utils/date";

type BasicDateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (nextValue: string) => void;
};

const DATE_INPUT_BUTTON_CLASS =
  "flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 text-left text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-[#1773B0] focus:ring-3 focus:ring-[#1773B0]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

const MONTH_FORMATTER = new Intl.DateTimeFormat("id-ID", {
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
  const width = Math.min(320, Math.max(260, window.innerWidth - 32));
  const estimatedHeight = 368;
  const left = Math.min(
    Math.max(16, rect.left),
    Math.max(16, window.innerWidth - width - 16),
  );
  const opensAbove =
    rect.bottom + 8 + estimatedHeight > window.innerHeight &&
    rect.top > estimatedHeight;

  return {
    left,
    top: opensAbove ? rect.top - estimatedHeight - 8 : rect.bottom + 8,
    width,
  } satisfies React.CSSProperties;
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

      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node | null;
        if (!target) return;
        if (triggerRef.current?.contains(target)) return;
        if (popupRef.current?.contains(target)) return;
        setOpen(false);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown, {
        passive: true,
      });
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
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
    };

    const handleSelectToday = () => {
      const nextToday = todayIsoDate();
      onChange(nextToday);
      setViewMonth(startOfMonth(parseDateString(nextToday) ?? today));
      setOpen(false);
    };

    const handleClear = () => {
      onChange("");
      setOpen(false);
    };

    return (
      <div className="relative">
        <button
          id={id}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={props["aria-label"] ?? placeholder}
          aria-expanded={open}
          aria-haspopup="dialog"
          data-required={required ? "true" : undefined}
          className={[DATE_INPUT_BUTTON_CLASS, className]
            .filter(Boolean)
            .join(" ")}
          onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
          onClick={() => setOpen((prev) => !prev)}
          onFocus={onFocus as React.FocusEventHandler<HTMLButtonElement>}
        >
          <span className={displayValue ? "text-gray-800" : "text-gray-400"}>
            {displayValue || placeholder}
          </span>
          <CalendarDays
            className="h-4 w-4 shrink-0 text-gray-400"
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

        {open ? (
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Pilih tanggal"
            className="fixed z-[10000] rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
            style={popupStyle}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">
                {MONTH_FORMATTER.format(viewMonth)}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                  onClick={() => setViewMonth((prev) => addMonths(prev, -1))}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                  onClick={() => setViewMonth((prev) => addMonths(prev, 1))}
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-1 text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  {label}
                </div>
              ))}

              {calendarDays.map((date) => {
                const isoDate = toIsoDate(date);
                const isCurrentMonth = date.getMonth() === viewMonth.getMonth();
                const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                const isToday = isSameDay(date, today);

                return (
                  <button
                    key={isoDate}
                    type="button"
                    className={[
                      "flex h-9 w-full items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20",
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
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                onClick={handleClear}
              >
                Bersihkan
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1773B0] transition hover:bg-[#1773B0]/10 focus:outline-none focus:ring-2 focus:ring-[#1773B0]/20"
                onClick={handleSelectToday}
              >
                Hari ini
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);

export default BasicDateInput;
