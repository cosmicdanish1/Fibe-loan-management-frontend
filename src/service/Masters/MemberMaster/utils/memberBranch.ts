// Branch of a member (the office number) and the separate free-text "Branch MS No" box. Pure functions.

/** The Branch dropdown values: "<office number>-<name>". */
export const BRANCH_OPTIONS: readonly string[] = [
  '1-BHILAI-BHILAI-61',
  '2-POWER HOUSE-POWER HOUSE-94',
  '3-RISALI-RISALI-99',
  '4-NANDINI-NANDINI-13',
  '5-DALLI RAJHRA-DALLI RAJHRA-03',
  '6-MECON-BHILAI-90',
];

/** The dropdown value for a member's office number, or '' when no option has that number. */
export function branchForOffice(officeno: unknown): string {
  const n = String(officeno ?? '').trim();
  if (!/^\d+$/.test(n)) return '';
  return BRANCH_OPTIONS.find((b) => b.split('-')[0] === String(Number(n))) ?? '';
}

/**
 * The Branch MS No box. Earlier saves of this screen stored the chosen Branch text in this column; such a value is the
 * branch, not an MS number, so it is not shown here. A real MS number (or nothing) is kept as it is.
 */
export function cleanBranchMsNo(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return BRANCH_OPTIONS.includes(s) ? '' : s;
}
