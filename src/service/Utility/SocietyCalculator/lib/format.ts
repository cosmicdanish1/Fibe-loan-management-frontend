// Formatting helpers shared by every Society Calculator tab.

const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const plain2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹ with paise (the society works in paise for schedules). */
export const money = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? '-' : inr2.format(n));
/** ₹ whole rupees (for big headline figures whose value is already a whole rupee). */
export const money0 = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? '-' : inr0.format(n));
export const num2 = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? '-' : plain2.format(n));

/** Typed text -> number, or NaN when empty / not a number (so the caller can wait instead of sending garbage). */
export const toNum = (s: string): number => (s.trim() === '' ? NaN : Number(s));

/** Allow only digits and one decimal point while typing. */
export const cleanDecimal = (s: string): string => {
  const x = s.replace(/[^0-9.]/g, '');
  const i = x.indexOf('.');
  return i === -1 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, '');
};
export const cleanInt = (s: string): string => s.replace(/[^0-9]/g, '');

export const todayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-08' -> 'Aug 2026' */
export const monthLabel = (ym: string): string => {
  const [y = 0, m = 0] = ym.split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : ym;
};
/** '2026-08-15' -> '15 Aug 2026' */
export const dateLabel = (ymd: string | null): string => {
  if (!ymd) return '-';
  const [y = 0, m = 0, d = 0] = ymd.split('-').map(Number);
  return m >= 1 && m <= 12 ? `${d} ${MONTHS[m - 1]} ${y}` : ymd;
};

/** Copy text to the clipboard (works in the Electron renderer and in a browser). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
