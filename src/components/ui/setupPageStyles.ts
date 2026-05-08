export const SETUP_PAGE_SEARCH_CARD_CLASS =
  "rounded-lg border border-gray-200 bg-white p-4";

export const SETUP_PAGE_WIDTH_SM_CLASS = "w-full max-w-[560px]";

export const SETUP_PAGE_WIDTH_MD_CLASS = "w-full max-w-[860px]";

export const SETUP_PAGE_WIDTH_LG_CLASS = "w-full max-w-[900px]";

export const SETUP_PAGE_WIDTH_XL_CLASS = "w-full max-w-[1040px]";

export const SETUP_PAGE_WIDTH_2XL_CLASS = "w-full max-w-[1280px]";

export const SETUP_PAGE_ADD_BUTTON_CLASS = "btn btn-upload";

export const SETUP_PAGE_SEARCH_LABEL_CLASS =
  "mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500";

export const SETUP_PAGE_SEARCH_WRAPPER_CLASS = "relative";

export const SETUP_PAGE_SEARCH_ICON_CLASS =
  "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400";

export const SETUP_PAGE_SEARCH_INPUT_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#1773B0] focus:ring-3 focus:ring-[#1773B0]/10";

export const SETUP_PAGE_TABLE_CARD_CLASS =
  "overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm";

export const SETUP_PAGE_TABLE_SCROLL_CLASS = "overflow-x-auto";

export const SETUP_PAGE_TABLE_CLASS =
  "min-w-full divide-y-2 divide-gray-200 text-sm";

export const SETUP_PAGE_TABLE_HEAD_CLASS = "text-center";

export const SETUP_PAGE_TABLE_BODY_CLASS = "divide-y divide-gray-200";

export const SETUP_PAGE_TABLE_HEADER_CELL_CLASS =
  "px-3 py-3 !text-center text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 whitespace-nowrap";

export const SETUP_PAGE_TABLE_ROW_CLASS =
  "h-[64px] text-gray-900 transition-colors hover:bg-gray-50";

export const SETUP_PAGE_TABLE_CELL_CLASS =
  "px-3 py-3 !text-center align-middle whitespace-nowrap";

export const SETUP_PAGE_COMPACT_ROW_CLASS =
  "h-[58px] text-gray-900 transition-colors hover:bg-gray-50";

export const SETUP_PAGE_COMPACT_CELL_CLASS =
  "px-3 py-2.5 !text-center align-middle whitespace-nowrap";

export const SETUP_PAGE_NUMBER_HEADER_CELL_CLASS =
  `${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-16`;

export const SETUP_PAGE_NUMBER_CELL_CLASS =
  `${SETUP_PAGE_TABLE_CELL_CLASS} w-16 text-sm text-gray-500 tabular-nums`;

export const SETUP_PAGE_ACTION_HEADER_CELL_CLASS =
  `${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-24 !text-center`;

export const SETUP_PAGE_ACTION_CELL_CLASS =
  `${SETUP_PAGE_TABLE_CELL_CLASS} w-24 !text-center`;

export const SETUP_PAGE_STATUS_HEADER_CELL_CLASS =
  `${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-28 !text-center`;

export const SETUP_PAGE_STATUS_CELL_CLASS =
  `${SETUP_PAGE_TABLE_CELL_CLASS} w-28 !text-center`;

export const SETUP_PAGE_EMPTY_STATE_CELL_CLASS =
  "h-32 px-3 text-center align-middle text-sm text-gray-500";

export function getSetupPageEmptyStateCopy(entityLabel: string) {
  return `Belum ada data ${entityLabel}.`;
}
