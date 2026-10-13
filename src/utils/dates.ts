/**
 * Local-calendar date helpers.
 *
 * `new Date().toISOString().split('T')[0]` returns the UTC date, which is the
 * PREVIOUS day in IST between 00:00 and 05:30. Use these helpers wherever a
 * "today"/local calendar date is meant.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** YYYY-MM-DD built from LOCAL date getters. */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-04-01 of the Indian financial year (Apr-Mar) containing `d`. */
export function indianFinancialYearStart(d: Date = new Date()): string {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${year}-04-01`;
}

/** True when both ISO dates are present and `from` is later than `to`. */
export function isFromAfterTo(from: string, to: string): boolean {
  if (!from || !to) return false;
  return from > to;
}
