import ExcelJS from "exceljs";

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

export async function exportToExcel(options: ExportOptions): Promise<void> {
  try {
    const { filename, sheetName, columns, data, title } = options;
    if (typeof window === "undefined") return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ruang Arsip";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    let startRow = 1;
    if (title) {
      worksheet.insertRow(1, [title]);
      worksheet.mergeCells(1, 1, 1, columns.length);
      const titleCell = worksheet.getCell("A1");
      titleCell.font = { bold: true, size: 14, color: { argb: "FF157EC3" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(1).height = 30;
      startRow = 2;

      const headerRow = worksheet.getRow(startRow);
      columns.forEach((col, index) => {
        headerRow.getCell(index + 1).value = col.header;
      });
    }

    const headerRowIndex = title ? 2 : 1;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF157EC3" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0D5A8F" } },
        left: { style: "thin", color: { argb: "FF0D5A8F" } },
        bottom: { style: "thin", color: { argb: "FF0D5A8F" } },
        right: { style: "thin", color: { argb: "FF0D5A8F" } },
      };
    });

    data.forEach((item, index) => {
      const rowData: unknown[] = columns.map((col) => item[col.key] ?? "");
      const row = worksheet.addRow(rowData);

      const isEvenRow = index % 2 === 0;
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEvenRow ? "FFF8FAFC" : "FFFFFFFF" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle" };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.xlsx`;
    link.click();

    window.URL.revokeObjectURL(url);
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
