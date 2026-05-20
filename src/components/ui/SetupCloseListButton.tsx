"use client";

import type { ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";

type SetupCloseListButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SetupCloseListButton({
  className = "",
  type = "button",
  children = "Tutup List",
  ...props
}: SetupCloseListButtonProps) {
  return (
    <button
      type={type}
      className={`uiverse-modal-button uiverse-modal-button--neutral ${className}`.trim()}
      {...props}
    >
      <X className="h-4 w-4" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}
