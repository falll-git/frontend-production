import type { ReactNode } from "react";

type DashboardPageShellVariant = "wide" | "form";
type DashboardPageShellSpacing = "none" | "md" | "lg";

const VARIANT_CLASS = {
  wide: "mx-auto w-full max-w-[1600px] min-w-0 overflow-x-clip",
  form: "mx-auto w-full max-w-5xl min-w-0 overflow-x-clip",
} satisfies Record<DashboardPageShellVariant, string>;

const SPACING_CLASS = {
  none: "",
  md: "space-y-6",
  lg: "space-y-8",
} satisfies Record<DashboardPageShellSpacing, string>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardPageShell({
  children,
  variant = "wide",
  spacing = "none",
  animated = true,
  className,
}: {
  children: ReactNode;
  variant?: DashboardPageShellVariant;
  spacing?: DashboardPageShellSpacing;
  animated?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        VARIANT_CLASS[variant],
        animated && "animate-fade-in",
        SPACING_CLASS[spacing],
        className,
      )}
    >
      {children}
    </div>
  );
}
