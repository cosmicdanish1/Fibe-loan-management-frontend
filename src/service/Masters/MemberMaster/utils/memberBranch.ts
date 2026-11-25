// Division / RO (wing) and Branch (office) of a member, and the free-text "Branch MS No" box. Pure functions.
// The Division / RO and Branch lists come from the database (Wing / Office Master); nothing is typed into the screen.

export interface WingRow { wingId: string; wingName: string }
export interface OfficeRow { officeId: number; officeName: string; wingId: string }

/** "5 - DALLI RAJHRA": how an office is listed in the Branch box. */
export function officeLabel(o: Pick<OfficeRow, 'officeId' | 'officeName'>): string {
  return `${o.officeId} - ${String(o.officeName ?? '').trim()}`;
}

/** "BHILAI": how a wing is listed in the Division / RO box. */
export function wingLabel(w: Pick<WingRow, 'wingId' | 'wingName'>): string {
  const name = String(w.wingName ?? '').trim();
  return name || String(w.wingId ?? '').trim();
}

/** The offices that belong to the chosen wing (all of them while no wing is chosen). */
export function officesForWing<T extends OfficeRow>(offices: T[], wingId: string): T[] {
  const w = String(wingId ?? '').trim();
  return w ? offices.filter((o) => String(o.wingId ?? '').trim() === w) : offices;
}

/**
 * The wing code for a member's stored wing. Members saved by an earlier version of this screen hold the wing NAME
 * ("BHILAI") instead of its code ("1"); a name that matches a wing is turned into that wing's code. A value that matches
 * nothing is kept as it is so that it stays visible.
 */
export function resolveWingCode(stored: unknown, wings: WingRow[]): string {
  const s = String(stored ?? '').trim();
  if (!s) return '';
  if (wings.some((w) => String(w.wingId).trim() === s)) return s;
  const byName = wings.find((w) => String(w.wingName ?? '').trim().toUpperCase() === s.toUpperCase());
  return byName ? String(byName.wingId).trim() : s;
}

/** The office number from the Branch box value (a number as text), or null when nothing valid is chosen. */
export function parseOfficeNo(branch: unknown): number | null {
  const t = String(branch ?? '').trim();
  return /^\d+$/.test(t) && Number(t) > 0 ? Number(t) : null;
}

/** The Branch box value for a member's stored office number ('' when it has none). */
export function officeCode(officeno: unknown): string {
  const n = parseOfficeNo(officeno);
  return n === null ? '' : String(n);
}

/** Problems with Division / RO and Branch as plain messages (empty = fine). */
export function orgProblems(divisionRo: string, branch: string): string[] {
  const out: string[] = [];
  if (!String(divisionRo ?? '').trim()) out.push('Division/RO is required');
  if (parseOfficeNo(branch) === null) out.push('Branch is required');
  return out;
}

/** The Branch must be an office of the chosen Division / RO. */
export function branchBelongsToWing(branch: string, wingId: string, offices: OfficeRow[]): boolean {
  const n = parseOfficeNo(branch);
  if (n === null) return false;
  const o = offices.find((x) => x.officeId === n);
  return !!o && String(o.wingId ?? '').trim() === String(wingId ?? '').trim();
}

/**
 * The Branch MS No box. Earlier saves of this screen stored the chosen Branch text ("5-DALLI RAJHRA-DALLI RAJHRA-03")
 * in this column; such a value is the branch, not an MS number, so it is not shown here. A real MS number (or nothing)
 * is kept as it is.
 */
export function cleanBranchMsNo(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return /^\d{1,4}-[^-]+-[^-]+-\d+$/.test(s) ? '' : s;
}
