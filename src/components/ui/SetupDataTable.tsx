import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_EMPTY_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
} from "@/components/ui/setupPageStyles";
import { cn } from "@/lib/utils";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupState from "@/components/ui/SetupState";
import type { LucideIcon } from "lucide-react";

function getTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim();
  }

  if (Array.isArray(node)) {
    return node.map(getTextContent).filter(Boolean).join(" ").trim();
  }

  if (!isValidElement(node)) {
    return "";
  }

  return getTextContent((node.props as { children?: ReactNode }).children);
}

function collectHeaderLabels(node: ReactNode, labels: string[] = []) {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === SetupDataTableHeaderCell) {
      labels.push(getTextContent((child.props as { children?: ReactNode }).children));
      return;
    }

    collectHeaderLabels((child.props as { children?: ReactNode }).children, labels);
  });

  return labels;
}

function getTableHeaderLabels(children: ReactNode) {
  let labels: string[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== SetupDataTableHead) return;

    labels = collectHeaderLabels(
      (child.props as { children?: ReactNode }).children,
    );
  });

  return labels;
}

function cloneCellWithMobileLabel(
  child: ReactNode,
  label: string | undefined,
): ReactNode {
  if (!isValidElement(child) || child.type !== SetupDataTableCell) {
    return child;
  }

  const props = child.props as SetupDataTableCellProps;
  if (props.colSpan && props.colSpan > 1) return child;

  return cloneElement(child as ReactElement<SetupDataTableCellProps>, {
    mobileLabel: props.mobileLabel || label || undefined,
  });
}

function cloneRowWithMobileLabels(
  row: ReactNode,
  labels: string[],
): ReactNode {
  if (Array.isArray(row)) {
    return row.map((item) => cloneRowWithMobileLabels(item, labels));
  }

  if (!isValidElement(row)) return row;

  if (row.type !== SetupDataTableRow) {
    return cloneElement(
      row as ReactElement<{ children?: ReactNode }>,
      undefined,
      cloneBodyRows(
        (row.props as { children?: ReactNode }).children,
        labels,
      ),
    );
  }

  let cellIndex = 0;
  const children = Children.map(
    (row.props as { children?: ReactNode }).children,
    (child) => {
      if (isValidElement(child) && child.type === SetupDataTableCell) {
        const label = labels[cellIndex];
        cellIndex += 1;
        return cloneCellWithMobileLabel(child, label);
      }

      return child;
    },
  );

  return cloneElement(row as ReactElement<{ children?: ReactNode }>, undefined, children);
}

function cloneBodyRows(children: ReactNode, labels: string[]): ReactNode {
  return Children.map(children, (child) => cloneRowWithMobileLabels(child, labels));
}

function applyMobileLabels(children: ReactNode, labels: string[]): ReactNode {
  if (labels.length === 0) return children;

  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    if (child.type === SetupDataTableBody) {
      return cloneElement(
        child as ReactElement<{ children?: ReactNode }>,
        undefined,
        cloneBodyRows(
          (child.props as { children?: ReactNode }).children,
          labels,
        ),
      );
    }

    return child;
  });
}

export function SetupDataTable({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  const headerLabels = getTableHeaderLabels(children);

  return (
    <table
      className={cn(
        "setup-responsive-table",
        SETUP_PAGE_MODERN_TABLE_CLASS,
        className,
      )}
      {...props}
    >
      {applyMobileLabels(children, headerLabels)}
    </table>
  );
}

export function SetupDataTableHead({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn("setup-responsive-table__head ltr:text-left rtl:text-right", className)}
      {...props}
    />
  );
}

export function SetupDataTableBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn("setup-responsive-table__body divide-y divide-gray-200", className)}
      {...props}
    />
  );
}

export function SetupDataTableRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return <tr className={cn("setup-responsive-table__row", className)} {...props} />;
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

type SetupDataTableCellProps = ComponentPropsWithoutRef<"td"> & {
  mobileLabel?: string;
};

export function SetupDataTableCell({
  className,
  mobileLabel,
  ...props
}: SetupDataTableCellProps) {
  return (
    <td
      className={cn(
        "setup-responsive-table__cell",
        SETUP_PAGE_MODERN_CELL_CLASS,
        className,
      )}
      data-mobile-label={mobileLabel || undefined}
      {...props}
    />
  );
}

export function SetupDataTableColGroup(
  { className, ...props }: ComponentPropsWithoutRef<"colgroup">,
) {
  return (
    <colgroup
      className={cn("setup-responsive-table__colgroup", className)}
      {...props}
    />
  );
}

export function SetupDataTableCol(props: ComponentPropsWithoutRef<"col">) {
  return <col {...props} />;
}

type SetupDataTableEmptyRowProps = ComponentPropsWithoutRef<"td"> & {
  colSpan: number;
  state?: "empty" | "loading" | "error";
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: LucideIcon | null;
  tone?: "neutral" | "debitur" | "legal" | "import" | "parameter";
  isFiltered?: boolean;
};

export function SetupDataTableEmptyRow({
  className,
  children,
  state,
  description,
  action,
  secondaryAction,
  icon,
  tone = "neutral",
  isFiltered = false,
  ...props
}: SetupDataTableEmptyRowProps) {
  const text = getTextContent(children);
  const inferredState =
    state ??
    (text.toLowerCase().startsWith("memuat")
      ? "loading"
      : text.toLowerCase().startsWith("gagal")
        ? "error"
        : "empty");

  return (
    <SetupDataTableRow>
      <SetupDataTableCell
        className={cn(SETUP_PAGE_MODERN_EMPTY_CELL_CLASS, className)}
        {...props}
      >
        {inferredState === "empty" ? (
          <SetupEmptyState
            title={children}
            description={description}
            action={action}
            secondaryAction={secondaryAction}
            icon={icon}
            tone={tone}
            isFiltered={isFiltered}
            variant="table"
          />
        ) : (
          <SetupState
            variant={inferredState}
            title={children}
            description={description}
            compact
          />
        )}
      </SetupDataTableCell>
    </SetupDataTableRow>
  );
}
