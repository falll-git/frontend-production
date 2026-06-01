"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  id?: string;
  name?: string;
  value: string;
  options?: SearchableSelectOption[];
  selectedOption?: SearchableSelectOption | null;
  loadOptions?: (query: string) => Promise<SearchableSelectOption[]>;
  onChange: (value: string, option?: SearchableSelectOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  buttonClassName?: string;
  maxVisibleOptions?: number;
  debounceMs?: number;
};

const DEFAULT_MAX_VISIBLE_OPTIONS = 50;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function mergeOptions(options: SearchableSelectOption[]) {
  const seen = new Set<string>();
  const merged: SearchableSelectOption[] = [];

  for (const option of options) {
    if (!option.value || seen.has(option.value)) continue;
    seen.add(option.value);
    merged.push(option);
  }

  return merged;
}

export default function SearchableSelect({
  id,
  name,
  value,
  options = [],
  selectedOption,
  loadOptions,
  onChange,
  placeholder = "Pilih data",
  searchPlaceholder = "Cari data...",
  emptyLabel = "Data tidak ditemukan",
  loadingLabel = "Memuat data...",
  disabled = false,
  required = false,
  clearable = true,
  className,
  buttonClassName,
  maxVisibleOptions = DEFAULT_MAX_VISIBLE_OPTIONS,
  debounceMs = 250,
}: SearchableSelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<SearchableSelectOption[]>([]);
  const [lastSelectedOption, setLastSelectedOption] =
    useState<SearchableSelectOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const allKnownOptions = useMemo(
    () =>
      mergeOptions([
        ...(selectedOption ? [selectedOption] : []),
        ...(lastSelectedOption ? [lastSelectedOption] : []),
        ...options,
        ...asyncOptions,
      ]),
    [asyncOptions, lastSelectedOption, options, selectedOption],
  );

  const currentOption = useMemo(
    () => allKnownOptions.find((option) => option.value === value) ?? null,
    [allKnownOptions, value],
  );

  const visibleOptions = useMemo(() => {
    if (loadOptions) {
      return mergeOptions(asyncOptions).slice(0, maxVisibleOptions);
    }

    const keyword = normalizeText(query);
    const filtered = keyword
      ? options.filter((option) => {
          const label = normalizeText(option.label);
          const description = normalizeText(option.description ?? "");
          return label.includes(keyword) || description.includes(keyword);
        })
      : options;

    return mergeOptions(filtered).slice(0, maxVisibleOptions);
  }, [asyncOptions, loadOptions, maxVisibleOptions, options, query]);
  const safeActiveIndex =
    visibleOptions.length > 0
      ? Math.min(activeIndex, visibleOptions.length - 1)
      : 0;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!wrapperRef.current?.contains(target)) close();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !loadOptions) return undefined;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setHasLoadError(false);
      loadOptions(query)
        .then((result) => {
          if (requestIdRef.current !== requestId) return;
          setAsyncOptions(result);
          setActiveIndex(0);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setAsyncOptions([]);
          setHasLoadError(true);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setIsLoading(false);
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, isOpen, loadOptions, query]);

  const handleSelect = (option: SearchableSelectOption) => {
    if (option.disabled) return;
    setLastSelectedOption(option);
    onChange(option.value, option);
    close();
  };

  const handleClear = () => {
    setLastSelectedOption(null);
    onChange("", null);
    setQuery("");
    setIsOpen(false);
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      open();
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions[safeActiveIndex];
      if (option) handleSelect(option);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        id={controlId}
        type="button"
        className={cn(
          "app-select searchable-select-trigger flex min-h-[44px] items-center justify-between gap-3 text-left",
          !currentOption && "text-gray-400",
          buttonClassName,
        )}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        data-required={required || undefined}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="min-w-0 flex-1 truncate">
          {currentOption?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {clearable && value && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              className="inline-flex size-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Bersihkan pilihan"
              onClick={(event) => {
                event.stopPropagation();
                handleClear();
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
            </span>
          ) : null}
          <ChevronDown className="size-4 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5"
        >
          <div className="relative border-b border-gray-100">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              className="h-11 w-full border-0 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0"
              placeholder={searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>{loadingLabel}</span>
              </div>
            ) : null}

            {!isLoading && hasLoadError ? (
              <div className="px-3 py-3 text-sm text-red-600">
                Gagal memuat data. Coba cari ulang.
              </div>
            ) : null}

            {!isLoading && !hasLoadError && visibleOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500">{emptyLabel}</div>
            ) : null}

            {!isLoading && !hasLoadError
              ? visibleOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === safeActiveIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                        isActive ? "bg-sky-50 text-gray-950" : "text-gray-700",
                        option.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-sky-50 hover:text-gray-950",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0 text-[#157ec3]",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
