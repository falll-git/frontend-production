import type { InputHTMLAttributes } from "react";

type SetupTextInputProps = InputHTMLAttributes<HTMLInputElement>;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SetupTextInput({
  className,
  type = "text",
  ...props
}: SetupTextInputProps) {
  return (
    <input
      type={type}
      className={joinClasses("app-input", className)}
      data-ui-control={type === "date" || type === "month" ? "date" : "input"}
      {...props}
    />
  );
}
