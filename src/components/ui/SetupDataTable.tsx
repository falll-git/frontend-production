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
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
} from "@/components/ui/setupPageStyles";
import { cn } from "@/lib/utils";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupState from "@/components/ui/SetupState";
import { SetupTableSkeletonRows } from "@/components/ui/SetupSkeleton";
import type { LucideIcon } from "lucide-react";

export type SetupTableVariant =
  | "default"
  | "crud"
  | "document"
  | "workflow"
  | "portfolio"
  | "nested"
  | "report"
  | "matrix";

export type SetupTableDensity = "compact" | "normal" | "comfortable";

type SetupDataTableProps = ComponentPropsWithoutRef<"table"> & {
  variant?: SetupTableVariant;
  density?: SetupTableDensity;
};

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
  variant = "default",
  density = "normal",
  ...props
}: SetupDataTableProps) {
  const headerLabels = getTableHeaderLabels(children);

  return (
    <table
      className={cn(
        "setup-responsive-table",
        `setup-responsive-table--${variant}`,
        `setup-responsive-table--density-${density}`,
        SETUP_PAGE_MODERN_TABLE_CLASS,
        className,
      )}
      data-table-variant={variant}
      data-table-density={density}
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

type SetupTableCardProps = ComponentPropsWithoutRef<"div"> & {
  variant?: SetupTableVariant;
  scroll?: boolean;
  scrollClassName?: string;
};

export function SetupTableScroll({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("setup-table-scroll", SETUP_PAGE_TABLE_SCROLL_CLASS, className)}
      {...props}
    />
  );
}

export function SetupTableCard({
  className,
  children,
  variant = "default",
  scroll = true,
  scrollClassName,
  ...props
}: SetupTableCardProps) {
  return (
    <div
      className={cn(
        "setup-table-card",
        `setup-table-card--${variant}`,
        SETUP_PAGE_TABLE_CARD_CLASS,
        className,
      )}
      data-table-card-variant={variant}
      {...props}
    >
      {scroll ? (
        <SetupTableScroll className={scrollClassName}>
          {children}
        </SetupTableScroll>
      ) : (
        children
      )}
    </div>
  );
}

type SetupTableTextProps = ComponentPropsWithoutRef<"span"> & {
  as?: "span" | "p" | "div";
};

export function SetupTableCode({
  className,
  children,
  title,
  as: Component = "span",
  ...props
}: SetupTableTextProps) {
  const inferredTitle = title ?? (getTextContent(children) || undefined);

  return (
    <Component
      className={cn("setup-table-code", className)}
      title={inferredTitle}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SetupTablePrimaryText({
  className,
  children,
  title,
  as: Component = "p",
  ...props
}: SetupTableTextProps) {
  const inferredTitle = title ?? (getTextContent(children) || undefined);

  return (
    <Component
      className={cn("setup-table-primary-text", className)}
      title={inferredTitle}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SetupTableSecondaryText({
  className,
  children,
  title,
  as: Component = "p",
  ...props
}: SetupTableTextProps) {
  const inferredTitle = title ?? (getTextContent(children) || undefined);

  return (
    <Component
      className={cn("setup-table-secondary-text", className)}
      title={inferredTitle}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SetupTableNumber({
  className,
  children,
  as: Component = "span",
  ...props
}: SetupTableTextProps) {
  return (
    <Component className={cn("setup-table-number", className)} {...props}>
      {children}
    </Component>
  );
}

export function SetupTableMoney({
  className,
  children,
  as: Component = "span",
  ...props
}: SetupTableTextProps) {
  return (
    <Component className={cn("setup-table-money", className)} {...props}>
      {children}
    </Component>
  );
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
  loadingRows?: number;
  loadingColumns?: number;
};

export function SetupDataTableEmptyRow({
  className,
  children,
  colSpan,
  state,
  description,
  action,
  secondaryAction,
  icon,
  tone = "neutral",
  isFiltered = false,
  loadingRows,
  loadingColumns,
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

  if (inferredState === "loading") {
    return (
      <SetupTableSkeletonRows
        colSpan={colSpan}
        rows={loadingRows}
        columns={loadingColumns ?? Math.min(Math.max(colSpan, 3), 7)}
        className={className}
      />
    );
  }

  return (
    <SetupDataTableRow>
      <SetupDataTableCell
        className={cn(SETUP_PAGE_MODERN_EMPTY_CELL_CLASS, className)}
        colSpan={colSpan}
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
