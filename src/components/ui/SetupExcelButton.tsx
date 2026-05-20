"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { FileSpreadsheet } from "lucide-react";

type SetupExcelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  label?: string;
};

const EXCEL_BUTTON_CLASS =
  "uiverse-modal-button uiverse-modal-button--success";

const SPINNER_STYLE = {
  ["--spinner-size"]: "16px",
  ["--spinner-border"]: "2px",
  ["--spinner-track"]: "rgba(5, 150, 105, 0.18)",
  ["--spinner-head"]: "#059669",
} as CSSProperties;

export default function SetupExcelButton({
  loading = false,
  label = "Export Excel",
  className = "",
  disabled,
  type = "button",
  ...props
}: SetupExcelButtonProps) {
  return (
    <button
      type={type}
      className={`${EXCEL_BUTTON_CLASS} ${className}`.trim()}
      disabled={disabled || loading}
      title={props.title ?? label}
      {...props}
    >
      {loading ? (
        <span
          className="button-spinner uiverse-modal-button__spinner"
          style={SPINNER_STYLE}
          aria-hidden="true"
        />
      ) : (
        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
