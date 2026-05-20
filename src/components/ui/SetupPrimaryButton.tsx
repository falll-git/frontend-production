"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type SetupPrimaryButtonSize = "default" | "sm";

type SetupPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  count?: ReactNode;
  size?: SetupPrimaryButtonSize;
};

const SIZE_CLASS_MAP: Record<SetupPrimaryButtonSize, string> = {
  default: "h-11 px-4",
  sm: "min-h-[36px] px-3 text-sm",
};

export default function SetupPrimaryButton({
  icon,
  count,
  size = "default",
  className = "",
  children,
  type = "button",
  ...props
}: SetupPrimaryButtonProps) {
  return (
    <button
      type={type}
      className={`uiverse-modal-button uiverse-modal-button--primary ${SIZE_CLASS_MAP[size]} ${className}`.trim()}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined ? (
        <span className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-gray-800 tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );
}
