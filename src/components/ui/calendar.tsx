"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-lg border bg-white p-3 text-gray-900",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months,
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "h-8 w-8 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "h-8 w-8 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex items-center justify-center h-8 w-full px-10",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-8 gap-2",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-md border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 w-full opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm text-gray-900"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 text-gray-900 [&>svg]:text-gray-500 [&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-gray-500 rounded-md flex-1 font-medium text-[0.8rem] select-none",
          defaultClassNames.weekday,
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-8",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-gray-500",
          defaultClassNames.week_number,
        ),
        day: cn(
          "relative w-full h-full p-0 text-center group/day aspect-square select-none",
          defaultClassNames.day,
        ),
        range_start: cn(
          "rounded-l-md bg-blue-600",
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          "rounded-none bg-blue-50",
          defaultClassNames.range_middle,
        ),
        range_end: cn("rounded-r-md bg-blue-600", defaultClassNames.range_end),
        today: cn("rounded-md", defaultClassNames.today),
        outside: cn("text-gray-400", defaultClassNames.outside),
        disabled: cn("text-gray-300 opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  modifiers,
  children,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSingleSelected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;

  const isRangeStart = modifiers.range_start;
  const isRangeEnd = modifiers.range_end;
  const isRangeMiddle = modifiers.range_middle;

  return (
    <button
      ref={ref}
      type="button"
      data-selected-single={isSingleSelected}
      data-range-start={isRangeStart}
      data-range-end={isRangeEnd}
      data-range-middle={isRangeMiddle}
      className={cn(
        "flex aspect-square w-full min-w-8 flex-col items-center justify-center rounded-md text-sm leading-none transition-colors",
        "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200",
        modifiers.today && !modifiers.selected ? "border border-blue-200" : "",
        modifiers.disabled ? "pointer-events-none opacity-40" : "",
        modifiers.outside ? "text-gray-400" : "text-gray-900",
        isSingleSelected ? "bg-blue-600 text-white hover:bg-blue-600" : "",
        isRangeMiddle ? "bg-blue-50 text-blue-700 rounded-none" : "",
        isRangeStart ? "bg-blue-600 text-white rounded-l-md" : "",
        isRangeEnd ? "bg-blue-600 text-white rounded-r-md" : "",
        defaultClassNames.day,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { Calendar, CalendarDayButton };
