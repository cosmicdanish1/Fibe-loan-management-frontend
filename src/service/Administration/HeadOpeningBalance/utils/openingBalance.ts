// Head Opening Balance: the pure rules of the screen (amount typing, side totals, balance check, rows).
import { FlatEntry, SECTION_ROOTS, buildRows, TreeRow } from '../../HeadAdditionModification/utils/headTree';

export { SECTION_ROOTS };

export interface OpeningEntry extends FlatEntry {
  openingBal: number;
  hasYearData: boolean;
  edited: boolean;
}

export interface FinancialYear { yearcode: number; startDate: string; endDate: string; label: string; closed?: boolean }

/** What the server sends for one head */
export function toEntry(r: any): OpeningEntry {
  return {
    code: String(r.code ?? '').trim(),
    parentCode: String(r.parentCode ?? '').trim(),
    headName: String(r.headName ?? ''),
    headType: r.headType ?? null,
    interest: 'N', pflag: '', hposition: null, opBal: 0,
    opening: 0, debit: 0, credit: 0, balance: 0,
    openingBal: Number.isFinite(Number(r.openingBal)) ? Number(r.openingBal) : 0,
    hasYearData: Boolean(r.hasYearData),
    edited: false,
  };
}

/**
 * Text typed into an amount box. "", "-", "5." and "-.5" are still being typed, so they are kept as text and count as
 * "no new number yet" (null); anything that is not a plain decimal number is rejected (undefined).
 */
export function parseAmount(text: string): number | null | undefined {
  const t = text.trim();
  if (t === '' || t === '-' || t === '.' || t === '-.') return null;
  if (!/^-?\d*\.?\d*$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const isHead = (e: { code: string }) => !(SECTION_ROOTS as readonly string[]).includes(e.code) && e.code !== 'M1000';

export interface Sides { assets: number; expenditure: number; liabilities: number; income: number; debit: number; credit: number; difference: number; balanced: boolean }

/** Assets and Expenditure sit on the debit side, Liabilities and Income on the credit side. Balanced to the paisa. */
export function sidesOf(entries: Array<{ code: string; openingBal: number }>): Sides {
  const sum = (letter: string) => round2(entries.filter(e => isHead(e) && e.code.startsWith(letter)).reduce((s, e) => s + e.openingBal, 0));
  const assets = sum('A'), expenditure = sum('E'), liabilities = sum('L'), income = sum('I');
  const debit = round2(assets + expenditure), credit = round2(liabilities + income);
  const difference = round2(debit - credit);
  return { assets, expenditure, liabilities, income, debit, credit, difference, balanced: Math.round(difference * 100) === 0 };
}

export const sectionSum = (entries: OpeningEntry[], root: string) =>
  round2(entries.filter(e => isHead(e) && e.code.startsWith(root.charAt(0))).reduce((s, e) => s + e.openingBal, 0));

export const openingRows = (entries: OpeningEntry[], search: string, expanded: Set<string>): TreeRow[] => buildRows(entries, search, expanded);

/** Indian grouping with two decimals; a minus stays visible; zero shows as 0.00 (an opening balance of zero is a value) */
export function money(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The body sent to the server: every head, rounded to the paisa */
export const toBalances = (entries: OpeningEntry[]) =>
  entries.filter(isHead).map(e => ({ headCode: e.code, closingBal: round2(e.openingBal) }));
