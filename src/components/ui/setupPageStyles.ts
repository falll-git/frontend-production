export const SETUP_PAGE_SEARCH_CARD_CLASS =
  "rounded-lg border border-gray-200 bg-white p-4";

export const SETUP_PAGE_PANEL_CLASS =
  "rounded-lg border border-gray-200 bg-white p-5 shadow-sm";

export const SETUP_PAGE_PANEL_HEADER_CLASS =
  "flex flex-col gap-4 border-b border-gray-100 bg-gray-50 px-6 py-5 lg:flex-row lg:items-start lg:justify-between";

export const SETUP_PAGE_ICON_TILE_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900";

export const SETUP_PAGE_SEGMENTED_GROUP_CLASS =
  "inline-flex max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm";

export const SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS =
  "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors";

export const SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS =
  "bg-[#157ec3] text-white shadow-sm";

export const SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS =
  "text-gray-600 hover:bg-gray-50 hover:text-gray-900";

export const SETUP_PAGE_BACK_BUTTON_CLASS =
  "uiverse-modal-button uiverse-modal-button--neutral";

export const SETUP_PAGE_PRIMARY_BUTTON_CLASS =
  "uiverse-modal-button uiverse-modal-button--primary";

export const SETUP_PAGE_SUCCESS_BUTTON_CLASS =
  "uiverse-modal-button uiverse-modal-button--success";

export const SETUP_PAGE_EMPTY_PANEL_CLASS =
  "rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm";

export const SETUP_PAGE_WIDTH_SM_CLASS = "w-full";

export const SETUP_PAGE_WIDTH_MD_CLASS = "w-full";

export const SETUP_PAGE_WIDTH_LG_CLASS = "w-full";

export const SETUP_PAGE_WIDTH_XL_CLASS = "w-full";

export const SETUP_PAGE_WIDTH_2XL_CLASS = "w-full";

export const SETUP_PARAMETER_PAGE_WIDTH_SM_CLASS =
  "mx-auto w-full max-w-[720px]";

export const SETUP_PARAMETER_PAGE_WIDTH_MD_CLASS =
  "mx-auto w-full max-w-[960px]";

export const SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS =
  "mx-auto w-full max-w-[1120px]";

export const SETUP_PARAMETER_PAGE_WIDTH_XL_CLASS =
  "mx-auto w-full max-w-[1280px]";

export const SETUP_PAGE_SEARCH_LABEL_CLASS =
  "mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500";

export const SETUP_PAGE_SEARCH_WRAPPER_CLASS = "relative";

export const SETUP_PAGE_SEARCH_ICON_CLASS =
  "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400";

export const SETUP_PAGE_SEARCH_INPUT_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#1773B0] focus:ring-3 focus:ring-[#1773B0]/10";

export const SETUP_PAGE_TABLE_CARD_CLASS =
  "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";

export const SETUP_PAGE_TABLE_SCROLL_CLASS =
  "w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [contain:inline-size]";

export const SETUP_PAGE_TABLE_HEAD_CLASS = "text-center";

export const SETUP_PAGE_TABLE_ROW_CLASS =
  "h-[58px] border-b border-slate-100 text-slate-900 transition-colors hover:bg-slate-50/70";

export const SETUP_PAGE_MODERN_TABLE_CLASS =
  "w-full table-auto border-separate border-spacing-0 text-sm";

export const SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS =
  "bg-slate-50/90 *:font-semibold *:text-slate-600";

export const SETUP_PAGE_MODERN_TABLE_ROW_CLASS =
  "border-b border-slate-100 transition-colors hover:bg-slate-50/70 *:text-slate-800";

export const SETUP_PAGE_MODERN_HEADER_CELL_CLASS =
  "px-3 py-2.5 align-middle whitespace-nowrap border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.04em] text-slate-500";

export const SETUP_PAGE_MODERN_CELL_CLASS =
  "px-3 py-2.5 align-middle text-sm leading-5 text-slate-700";

export const SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS =
  "w-14 px-3 py-2.5 align-middle whitespace-nowrap border-b border-slate-200 text-center text-xs font-semibold uppercase tracking-[0.04em] text-slate-500";

export const SETUP_PAGE_MODERN_NUMBER_CELL_CLASS =
  "w-14 px-3 py-2.5 text-center align-middle text-sm tabular-nums text-slate-500";

export const SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS =
  `${SETUP_PAGE_MODERN_HEADER_CELL_CLASS} text-center`;

export const SETUP_PAGE_MODERN_CENTER_CELL_CLASS =
  `${SETUP_PAGE_MODERN_CELL_CLASS} text-center`;

export const SETUP_PAGE_MODERN_EMPTY_CELL_CLASS =
  "px-3 py-10 text-center text-sm font-medium text-slate-500";

export function getSetupPageEmptyStateCopy(entityLabel: string) {
  return `Belum ada data ${entityLabel}.`;
}
