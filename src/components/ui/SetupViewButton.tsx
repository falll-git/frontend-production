"use client";

import type { ButtonHTMLAttributes, MouseEventHandler } from "react";
import { Eye } from "lucide-react";

type SetupViewButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  onClick: MouseEventHandler<HTMLButtonElement>;
  label?: string;
};

const VIEW_BUTTON_CLASS =
  "uiverse-modal-button uiverse-modal-button--neutral";

export default function SetupViewButton({
  onClick,
  title = "View dokumen",
  className = "",
  disabled = false,
  label = "View",
  type = "button",
  ...props
}: SetupViewButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${VIEW_BUTTON_CLASS} ${className}`.trim()}
      title={title}
      aria-label={props["aria-label"] ?? title}
      {...props}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
