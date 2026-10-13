/**
 * Shared CSV helpers.
 * csvCell: null-safe, keeps numbers (including 0) as-is, doubles embedded quotes,
 * and neutralises spreadsheet formula injection (cells starting with = + - @).
 */
export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value);
  if (/^[\t\r ]*[=+@-]/.test(text) && !/^[-+]?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const csvRow = (cells: unknown[]): string => cells.map(csvCell).join(',');

export const round2 = (n: number): number => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
