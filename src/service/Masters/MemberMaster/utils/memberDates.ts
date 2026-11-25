// Date rules of the Member Master window (ES-382). Pure functions, no React, so they can be tested alone.

/** The legacy data stores "no date" as 1900-01-01 (1,540 retirement dates). Anything before 1901 means "no date". */
export function isPlaceholderDate(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(String(v));
  const year = m ? Number(m[1]) : new Date(String(v)).getFullYear();
  return Number.isFinite(year) && year < 1901;
}

/** A stored date for the screen: the placeholder becomes empty. */
export function cleanDate(v: unknown): string {
  return v === null || v === undefined || isPlaceholderDate(v) ? '' : String(v);
}

const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
};

/**
 * Age in whole years on a given day (the legacy shows the age AT THE MEMBERSHIP DATE; with no membership date, today).
 * Returns null when the birth date is missing or the day is before the birth.
 */
export function ageOn(dobIso: string, asOfIso?: string): number | null {
  const b = parts(dobIso);
  if (!b) return null;
  const t = asOfIso ? parts(asOfIso) : null;
  const now = new Date();
  const a = t ?? { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  let age = a.y - b.y;
  if (a.m < b.m || (a.m === b.m && a.d < b.d)) age--;
  return age < 0 ? null : age;
}

/** The legacy fills Retirement Date as the last day of the month in which the member turns 60. */
export function retirementDateFor(dobIso: string, retirementAge = 60): string {
  const b = parts(dobIso);
  if (!b) return '';
  const y = b.y + retirementAge;
  const last = new Date(Date.UTC(y, b.m, 0)).getUTCDate(); // day 0 of the next month = last day of this month
  return `${y}-${String(b.m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/** Problems with the date fields of the form, as plain messages (empty list = fine). */
export function dateProblems(f: { dateOfBirth?: string; membershipDate?: string; retirementDate?: string }): string[] {
  const out: string[] = [];
  const dob = parts(f.dateOfBirth || '');
  const memb = parts(f.membershipDate || '');
  const ret = f.retirementDate && !isPlaceholderDate(f.retirementDate) ? parts(f.retirementDate) : null;
  const key = (p: { y: number; m: number; d: number }) => p.y * 10000 + p.m * 100 + p.d;
  if (dob && memb && key(memb) < key(dob)) out.push('Membership Date cannot be before the Date of Birth');
  if (dob && ret && key(ret) <= key(dob)) out.push('Retirement Date must be after Date of Birth');
  return out;
}
