import type { SelectHTMLAttributes } from "react";

type SetupSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SetupSelect({
  className,
  children,
  ...props
}: SetupSelectProps) {
  return (
    <select className={joinClasses("select", className)} {...props}>
      {children}
    </select>
  );
}
