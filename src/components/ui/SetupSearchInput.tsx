"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { Search } from "lucide-react";

import {
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
} from "./setupPageStyles";

type SetupSearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  containerClassName?: string;
  iconClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SetupSearchInput({
  label,
  id,
  className,
  containerClassName,
  iconClassName,
  inputClassName,
  labelClassName,
  type = "text",
  ...props
}: SetupSearchInputProps) {
  return (
    <div className={containerClassName}>
      {label ? (
        <label
          className={joinClasses(SETUP_PAGE_SEARCH_LABEL_CLASS, "block", labelClassName)}
          htmlFor={id}
        >
          {label}
        </label>
      ) : null}
      <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
        <Search
          className={joinClasses(SETUP_PAGE_SEARCH_ICON_CLASS, iconClassName)}
          aria-hidden="true"
        />
        <input
          {...props}
          id={id}
          type={type}
          className={joinClasses(SETUP_PAGE_SEARCH_INPUT_CLASS, inputClassName, className)}
        />
      </div>
    </div>
  );
}
