import writeExcelFile, {
  type CellObject,
  type Row,
  type SheetData,
} from "write-excel-file/browser";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  sheetName: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  title?: string;
}

function formatExportDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function hasDateToken(value: string): boolean {
  return (
    /\d{8}/.test(value) ||
    /\d{4}-\d{2}-\d{2}/.test(value) ||
    /\d{2}-\d{2}-\d{4}/.test(value)
  );
}

function sanitizeExportFileName(value: string): string {
  const withoutExtension = value.replace(/\.xlsx$/i, "");
  const normalized = withoutExtension
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return normalized || "export";
}

function buildExportFileName(filename: string): string {
  const sanitized = sanitizeExportFileName(filename);
  const withDate = hasDateToken(sanitized)
    ? sanitized
    : `${sanitized}-${formatExportDate()}`;

  return `${withDate}.xlsx`;
}

export async function exportToExcel(options: ExportOptions): Promise<void> {
  try {
    const { filename, sheetName, columns, data, title } = options;
    if (typeof window === "undefined") return;

    const headerCell = (value: string): CellObject => ({
      value,
      fontWeight: "bold",
      fontSize: 11,
      textColor: "#FFFFFF",
      backgroundColor: "#157EC3",
      borderColor: "#0D5A8F",
      borderStyle: "thin",
      align: "center",
      alignVertical: "center",
      height: 24,
      wrap: true,
    });

    const bodyCell = (value: unknown, isEvenRow: boolean): CellObject => ({
      value: value == null ? "" : String(value),
      fontSize: 11,
      backgroundColor: isEvenRow ? "#F8FAFC" : "#FFFFFF",
      borderColor: "#E2E8F0",
      borderStyle: "thin",
      alignVertical: "center",
      wrap: true,
    });

    const sheetData: SheetData = [];

    if (title) {
      const titleRow: Row = [
        {
          value: title,
          columnSpan: columns.length,
          fontWeight: "bold",
          fontSize: 14,
          textColor: "#157EC3",
          align: "center",
          alignVertical: "center",
          height: 30,
        },
      ];
      for (let index = 1; index < columns.length; index += 1) {
        titleRow.push(null);
      }
      sheetData.push(titleRow);
    }

    sheetData.push(columns.map((column) => headerCell(column.header)));

    data.forEach((item, index) => {
      const isEvenRow = index % 2 === 0;
      sheetData.push(columns.map((column) => bodyCell(item[column.key], isEvenRow)));
    });

    await writeExcelFile(sheetData, {
      sheet: sheetName,
      columns: columns.map((column) => ({ width: column.width || 20 })),
      stickyRowsCount: title ? 2 : 1,
      showGridLines: false,
    }).toFile(buildExportFileName(filename));
  } catch {
    return;
  }
}

export function formatDateForExcel(dateString: string): string {
  return dateString;
}

export function formatCurrencyForExcel(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
