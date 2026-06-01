import type { TextareaHTMLAttributes } from "react";

type SetupTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SetupTextarea({
  className,
  ...props
}: SetupTextareaProps) {
  return <textarea className={joinClasses("app-textarea", className)} {...props} />;
}
