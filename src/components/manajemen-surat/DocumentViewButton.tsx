"use client";

import type { ButtonHTMLAttributes, MouseEventHandler } from "react";
import { Eye } from "lucide-react";

export default function DocumentViewButton({
  onClick,
  title = "View dokumen",
  className = "",
  disabled = false,
  label = "View",
}: {
  onClick: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  className?: string;
  disabled?: ButtonHTMLAttributes<HTMLButtonElement>["disabled"];
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-view-pdf btn-sm ${className}`.trim()}
      title={title}
      aria-label={title}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
