"use client";

import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";

type UiverseCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
  size?: number;
  className?: string;
};

export default function UiverseCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  ariaLabel,
  size,
  className,
}: UiverseCheckboxProps) {
  const id = useId();
  const labelId = `${id}-label`;

  return (
    <div className={["uiverse-checkbox", className].filter(Boolean).join(" ")}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="uiverse-checkbox__input"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : undefined}
      />
      <label htmlFor={id} className="uiverse-checkbox__label" id={labelId}>
        <span
          className="uiverse-checkbox__check"
          style={
            size
              ? ({ ["--uicheck-size"]: `${size}px` } as CSSProperties)
              : undefined
          }
          aria-hidden="true"
        >
          <svg
            width="18px"
            height="18px"
            viewBox="0 0 18 18"
            aria-hidden="true"
          >
            <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z" />
            <polyline points="1 9 7 14 15 4" />
          </svg>
        </span>
        {label ? <span className="uiverse-checkbox__text">{label}</span> : null}
      </label>
    </div>
  );
}
