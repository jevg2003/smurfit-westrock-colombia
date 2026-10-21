export type CsvCell = string | number | boolean | null | undefined;

export interface CsvOptions {
  /**
   * Prefixes text cells that start with `=`, `+`, `-`, `@`, tab or carriage return with `'`,
   * so a spreadsheet does not run them as formulas. Numbers are left as they are.
   */
  neutralizeFormulas?: boolean;
}

const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: CsvCell, neutralizeFormulas: boolean): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (neutralizeFormulas && typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Pure CSV serializer (RFC 4180 quoting, `\n` line breaks, no trailing newline). */
export function toCsv(columns: readonly string[], rows: readonly (readonly CsvCell[])[], options: CsvOptions = {}): string {
  const neutralize = options.neutralizeFormulas ?? false;
  return [columns.map((column) => escapeCell(column, false)), ...rows.map((row) => row.map((cell) => escapeCell(cell, neutralize)))]
    .map((line) => line.join(","))
    .join("\n");
}
