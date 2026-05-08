"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  formatDateDisplay,
  parseDateString,
  toIsoDate,
} from "@/lib/utils/date";

function parseSelectedDate(value: string) {
  return parseDateString(value);
}

type DatePickerInputProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function DatePickerInput({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  disabled,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const selected = React.useMemo(() => parseSelectedDate(value), [value]);

  React.useEffect(() => {
    if (!open) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        zIndex: 9999,
      });
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(target)) setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "input flex items-center justify-between gap-3 text-left",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? formatDateDisplay(value, placeholder) : placeholder}
        </span>
        <CalendarIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
      </button>

      {open && (
        <div style={dropdownStyle} className="w-fit rounded-lg border bg-white shadow-sm">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
            className="rounded-lg border-0"
          />
        </div>
      )}
    </div>
  );
}
