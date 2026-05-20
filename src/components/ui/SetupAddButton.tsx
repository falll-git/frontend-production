"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Plus } from "lucide-react";

type SetupAddButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: ReactNode;
  icon?: ReactNode;
};

export default function SetupAddButton({
  label,
  icon,
  className = "",
  type = "button",
  ...props
}: SetupAddButtonProps) {
  return (
    <button
      type={type}
      className={`uiverse-add-user-button ${className}`.trim()}
      {...props}
    >
      <span className="uiverse-add-user-button__text">{label}</span>
      <span className="uiverse-add-user-button__icon">
        {icon ?? (
          <Plus
            className="uiverse-add-user-button__svg"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}
