import type { ComponentPropsWithoutRef } from "react";

import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_EMPTY_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
} from "@/components/ui/setupPageStyles";

function cn(...classes: Array<string | false | null | undefined>) {
  const tokens = classes
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);

  return Array.from(new Set(tokens)).join(" ");
}

export function SetupDataTable({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <table
      className={cn(SETUP_PAGE_MODERN_TABLE_CLASS, className)}
      {...props}
    />
  );
}

export function SetupDataTableHead({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("ltr:text-left rtl:text-right", className)} {...props} />;
}

export function SetupDataTableBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={cn("divide-y divide-gray-200", className)} {...props} />;
}

export function SetupDataTableRow(props: ComponentPropsWithoutRef<"tr">) {
  return <tr {...props} />;
}

export function SetupDataTableHeaderCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn(SETUP_PAGE_MODERN_HEADER_CELL_CLASS, className)}
      {...props}
    />
  );
}

export function SetupDataTableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td className={cn(SETUP_PAGE_MODERN_CELL_CLASS, className)} {...props} />
  );
}

export function SetupDataTableColGroup(
  props: ComponentPropsWithoutRef<"colgroup">,
) {
  return <colgroup {...props} />;
}

export function SetupDataTableCol(props: ComponentPropsWithoutRef<"col">) {
  return <col {...props} />;
}

type SetupDataTableEmptyRowProps = ComponentPropsWithoutRef<"td"> & {
  colSpan: number;
};

export function SetupDataTableEmptyRow({
  className,
  children,
  ...props
}: SetupDataTableEmptyRowProps) {
  return (
    <SetupDataTableRow>
      <SetupDataTableCell
        className={cn(SETUP_PAGE_MODERN_EMPTY_CELL_CLASS, className)}
        {...props}
      >
        {children}
      </SetupDataTableCell>
    </SetupDataTableRow>
  );
}
