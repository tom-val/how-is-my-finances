import * as XLSX from "xlsx";
import type { ImportMonth, ImportExpense } from "@shared/types/import";

export type ImportFormat = "tomas" | "ugne";

export interface ParsedExcelData {
  categories: string[];
  months: ImportMonth[];
  totalExpenses: number;
  totalIncomes: number;
}

const MONTH_SHEET_REGEX = /^(\d{4})-(\d{2})$/;
const FALLBACK_CATEGORY = "Kita";

/** Format-specific configuration */
const FORMAT_CONFIG = {
  tomas: {
    salaryCellRef: "J3",
    dataStartRow: 7, // 1-indexed
  },
  ugne: {
    salaryCellRef: "H3",
    dataStartRow: 2, // 1-indexed
  },
} as const;

/**
 * Parse an Excel file into structured import data.
 *
 * Supports two formats:
 * - "tomas" (Alga.xlsx): salary in J3, expenses from row 7, columns A–F (item, amount, vendor, date, category, comment)
 * - "ugne" (Finansai): salary in H3, expenses from row 2, columns A–D (item, amount, date, category)
 *
 * Both formats expect:
 * - "Kategorijos" sheet: category names in column B
 * - "YYYY-MM" sheets: month data with expenses
 * - "YYYY-MM kred" sheets: skipped
 */
export function parseExcelFile(data: ArrayBuffer, format: ImportFormat): ParsedExcelData {
  const workbook = XLSX.read(data, { type: "array" });

  const categories = parseCategoriesSheet(workbook);
  const months = parseMonthSheets(workbook, categories, format);

  const totalExpenses = months.reduce((sum, m) => sum + m.expenses.length, 0);
  const totalIncomes = months.reduce((sum, m) => sum + m.incomes.length, 0);

  return { categories, months, totalExpenses, totalIncomes };
}

function parseCategoriesSheet(workbook: XLSX.WorkBook): string[] {
  const sheet = workbook.Sheets["Kategorijos"];
  if (!sheet) {
    return [FALLBACK_CATEGORY];
  }

  const categories: string[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "B1");

  // Categories are in column B (index 1), starting from row 2 (index 1)
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: range.s.c })];
    if (cell && typeof cell.v === "string" && cell.v.trim()) {
      const name = cell.v.trim();
      if (!categories.includes(name)) {
        categories.push(name);
      }
    }
  }

  // Ensure fallback category exists
  if (!categories.includes(FALLBACK_CATEGORY)) {
    categories.push(FALLBACK_CATEGORY);
  }

  return categories;
}

function parseMonthSheets(
  workbook: XLSX.WorkBook,
  categories: string[],
  format: ImportFormat,
): ImportMonth[] {
  const months: ImportMonth[] = [];
  const config = FORMAT_CONFIG[format];

  for (const sheetName of workbook.SheetNames) {
    const match = MONTH_SHEET_REGEX.exec(sheetName);
    if (!match) continue; // Skip non-month sheets (kred, Kategorijos, etc.)

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const salary = parseSalary(sheet, config.salaryCellRef);
    const expenses = format === "tomas"
      ? parseExpensesTomas(sheet, year, month, categories, config.dataStartRow)
      : parseExpensesUgne(sheet, year, month, categories, config.dataStartRow);

    // Salary is stored on the month record — no separate income entries needed
    months.push({ year, month, salary, expenses, incomes: [] });
  }

  // Sort by date ascending
  months.sort((a, b) => a.year - b.year || a.month - b.month);

  return months;
}

function parseSalary(sheet: XLSX.WorkSheet, cellRef: string): number {
  const cell = sheet[cellRef];
  if (!cell) return 0;

  const value = typeof cell.v === "number" ? cell.v : parseFloat(String(cell.v));
  return isNaN(value) ? 0 : Math.round(value * 100) / 100;
}

/**
 * Tomas format: A=item, B=amount, C=vendor, D=date, E=category, F=comment
 * Data starts at row 7 (1-indexed). Category header checked at row 6.
 */
function parseExpensesTomas(
  sheet: XLSX.WorkSheet,
  year: number,
  month: number,
  categories: string[],
  dataStartRow: number,
): ImportExpense[] {
  const expenses: ImportExpense[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");

  // Check if category column (E) has data by looking at the header row (row before data)
  const hasCategoryColumn = hasColumn(sheet, dataStartRow - 2, 4);

  for (let row = dataStartRow - 1; row <= range.e.r; row++) {
    const itemName = getCellString(sheet, row, 0); // Column A
    const amount = getCellNumber(sheet, row, 1); // Column B
    const vendor = getCellString(sheet, row, 2); // Column C
    const dateValue = getCellDate(sheet, row, 3, year, month); // Column D
    const categoryName = hasCategoryColumn
      ? getCellString(sheet, row, 4) // Column E
      : "";
    const comment = getCellString(sheet, row, 5); // Column F

    // Skip rows with no item name or zero/empty amount
    if (!itemName || !amount || amount <= 0) continue;

    const resolvedCategory = categoryName && categories.includes(categoryName)
      ? categoryName
      : FALLBACK_CATEGORY;

    expenses.push({
      itemName,
      amount: Math.round(amount * 100) / 100,
      categoryName: resolvedCategory,
      vendor: vendor || undefined,
      expenseDate: dateValue,
      comment: comment || undefined,
    });
  }

  return expenses;
}

/**
 * Ugnė format: A=item, B=amount, C=date, D=category (no vendor, no comment)
 * Data starts at row 2 (1-indexed).
 */
function parseExpensesUgne(
  sheet: XLSX.WorkSheet,
  year: number,
  month: number,
  categories: string[],
  dataStartRow: number,
): ImportExpense[] {
  const expenses: ImportExpense[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");

  for (let row = dataStartRow - 1; row <= range.e.r; row++) {
    const itemName = getCellString(sheet, row, 0); // Column A
    const amount = getCellNumber(sheet, row, 1); // Column B
    const dateValue = getCellDate(sheet, row, 2, year, month); // Column C
    const categoryName = getCellString(sheet, row, 3); // Column D

    // Skip rows with no item name or zero/empty amount
    if (!itemName || !amount || amount <= 0) continue;

    const resolvedCategory = categoryName && categories.includes(categoryName)
      ? categoryName
      : FALLBACK_CATEGORY;

    expenses.push({
      itemName,
      amount: Math.round(amount * 100) / 100,
      categoryName: resolvedCategory,
      vendor: undefined,
      expenseDate: dateValue,
      comment: undefined,
    });
  }

  return expenses;
}

function hasColumn(sheet: XLSX.WorkSheet, row: number, col: number): boolean {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  return cell != null && cell.v != null && String(cell.v).trim() !== "";
}

function getCellString(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell || cell.v == null) return "";
  return String(cell.v).trim();
}

function getCellNumber(sheet: XLSX.WorkSheet, row: number, col: number): number {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell || cell.v == null) return 0;

  const value = typeof cell.v === "number" ? cell.v : parseFloat(String(cell.v));
  return isNaN(value) ? 0 : value;
}

function getCellDate(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
  fallbackYear: number,
  fallbackMonth: number,
): string {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];

  if (cell) {
    // SheetJS stores dates as numbers with type "n" and format "d"
    if (cell.t === "n" && cell.v != null) {
      const date = XLSX.SSF.parse_date_code(cell.v as number);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }

    // Try parsing as string date
    if (cell.v != null) {
      const str = String(cell.v).trim();
      if (str) {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split("T")[0];
        }
      }
    }
  }

  // Fallback: 1st of the month
  return `${fallbackYear}-${String(fallbackMonth).padStart(2, "0")}-01`;
}
