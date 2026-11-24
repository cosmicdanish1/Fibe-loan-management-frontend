// Head Addition / Modification: the pure rules of the screen (tree order, totals, form checks, response shape).
// Kept apart from the page so they can be tested without drawing anything.

export interface FlatEntry {
  code: string;
  parentCode: string;
  headName: string;
  headType: string | null;
  interest: string;
  pflag: string;
  hposition: string | null;
  opBal: string | number | null;
  opening: string | number;
  debit: string | number;
  credit: string | number;
  balance: string | number;
}

export interface HeadForm {
  code: string;
  parentCode: string;
  headName: string;
  headType: string;
  interest: string;
  pflag: string;
  hposition: string;
  opBal: string;
}

export interface TreeRow {
  entry: FlatEntry;
  depth: number;
  isSection: boolean;
  hasChildren: boolean;
}

/** The four sections, in the order the books are read: liabilities, assets, income, expenditure */
export const SECTION_ROOTS = ['L1000', 'A1000', 'I1000', 'E1000'] as const;

export const SECTION_NAMES: Record<string, string> = { L: 'Liabilities', A: 'Assets', I: 'Income', E: 'Expenditure' };

/** What a head is for. The type decides how the rest of the app finds it (cash, bank list, loan heads ...) */
export const HEAD_TYPES: Array<{ value: string; label: string }> = [
  { value: 'OTH', label: 'OTH · Other' },
  { value: 'BANK', label: 'BANK · Bank account' },
  { value: 'CINH', label: 'CINH · Cash in hand' },
  { value: 'RLN', label: 'RLN · Regular loan' },
  { value: 'ALN', label: 'ALN · Emergency loan' },
  { value: 'SHR', label: 'SHR · Share' },
  { value: 'CD', label: 'CD · Compulsory deposit' },
  { value: 'MD', label: 'MD · Member deposit' },
  { value: 'MD1', label: 'MD1 · Member deposit 1' },
];

export const BLANK_FORM: HeadForm = {
  code: '', parentCode: '', headName: '', headType: 'OTH',
  interest: 'N', pflag: '', hposition: '', opBal: '0',
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** The list may come back as the array itself or still wrapped once ({ data: [...] }); anything else is "no list" */
export function unwrapHeads(res: any): FlatEntry[] | null {
  if (!res || res.success === false) return null;
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return null;
}

function hpos(h: string | null | undefined): number | null {
  if (h === null || h === undefined || h === '' || h === '0') return null;
  const p = parseInt(h, 10);
  return Number.isNaN(p) ? null : p;
}

/** Position first (heads without one come first, as in the legacy screen), then code */
export function sortEntries(entries: FlatEntry[]): FlatEntry[] {
  return [...entries].sort((a, b) => {
    const ap = hpos(a.hposition), bp = hpos(b.hposition);
    if (ap === null && bp === null) return a.code.localeCompare(b.code);
    if (ap === null) return -1;
    if (bp === null) return 1;
    return ap - bp || a.code.localeCompare(b.code);
  });
}

/** Heads of one section (code letter), without the section head itself */
export const sectionMembers = (flat: FlatEntry[], rootCode: string) =>
  flat.filter(e => e.code !== rootCode && e.code.startsWith(rootCode.charAt(0)));

/**
 * The rows to draw. Without a search each section is a tree: a head sits under its parent, indented by depth.
 * With a search the matching heads are listed flat. A collapsed section shows only its own row.
 */
export function buildRows(flat: FlatEntry[], search: string, expanded: Set<string>): TreeRow[] {
  const term = search.trim().toLowerCase();
  const rows: TreeRow[] = [];
  const childrenOf = new Map<string, FlatEntry[]>();
  for (const e of flat) {
    const list = childrenOf.get(e.parentCode) ?? [];
    list.push(e);
    childrenOf.set(e.parentCode, list);
  }

  for (const rootCode of SECTION_ROOTS) {
    const root = flat.find(e => e.code === rootCode);
    if (!root) continue;
    const members = sectionMembers(flat, rootCode);

    if (term) {
      const hits = sortEntries(members.filter(e => e.code.toLowerCase().includes(term) || (e.headName || '').toLowerCase().includes(term)));
      if (hits.length === 0) continue;
      rows.push({ entry: root, depth: 0, isSection: true, hasChildren: true });
      hits.forEach(e => rows.push({ entry: e, depth: 0, isSection: false, hasChildren: (childrenOf.get(e.code) ?? []).length > 0 }));
      continue;
    }

    rows.push({ entry: root, depth: 0, isSection: true, hasChildren: true });
    if (!expanded.has(rootCode)) continue;

    const seen = new Set<string>([rootCode]);
    const walk = (parent: string, depth: number) => {
      for (const e of sortEntries(childrenOf.get(parent) ?? [])) {
        if (seen.has(e.code) || e.code === rootCode) continue; // a loop in bad data must not hang the screen
        seen.add(e.code);
        const kids = childrenOf.get(e.code) ?? [];
        rows.push({ entry: e, depth, isSection: false, hasChildren: kids.length > 0 });
        walk(e.code, depth + 1);
      }
    };
    walk(rootCode, 0);
    // heads of this section whose parent is missing or in another section would vanish: list them at the end
    for (const e of sortEntries(members.filter(m => !seen.has(m.code)))) {
      seen.add(e.code);
      rows.push({ entry: e, depth: 0, isSection: false, hasChildren: false });
    }
  }
  return rows;
}

export interface Totals { opening: number; debit: number; credit: number; balance: number }

export function totalsOf(entries: FlatEntry[]): Totals {
  return entries.reduce<Totals>((s, e) => ({
    opening: s.opening + num(e.opening), debit: s.debit + num(e.debit),
    credit: s.credit + num(e.credit), balance: s.balance + num(e.balance),
  }), { opening: 0, debit: 0, credit: 0, balance: 0 });
}

export const isAccount = (e: FlatEntry) => !(SECTION_ROOTS as readonly string[]).includes(e.code) && e.code !== 'M1000';

/** Indian grouping, two decimals, blank for zero (the legacy screen leaves zero cells empty) */
export function fmt(v: string | number | null | undefined): string {
  const n = num(v);
  if (n === 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The section letter a head belongs to (its code letter) */
export const sectionOf = (code: string) => (code || '').charAt(0).toUpperCase();

/** First problem in the Add / Edit form, or null. The server checks the same things again. */
export function validateHeadForm(f: HeadForm, mode: 'add' | 'edit', existingCodes: Set<string>): string | null {
  const code = f.code.trim().toUpperCase();
  const parent = f.parentCode.trim().toUpperCase();
  if (!code) return 'Code is required';
  if (!/^[A-Z0-9]{1,5}$/.test(code)) return 'Code must be 1 to 5 letters or digits';
  if (mode === 'add' && existingCodes.has(code)) return `Head ${code} already exists`;
  if (!parent) return 'Parent head is required';
  if (parent === code) return 'A head cannot be its own parent';
  if (sectionOf(code) !== sectionOf(parent)) return `Code must start with ${sectionOf(parent)}, the section of ${parent}`;
  if (!f.headName.trim()) return 'Head name is required';
  if (f.headName.trim().length > 100) return 'Head name can be at most 100 characters';
  if (!f.pflag.trim()) return 'P flag is required';
  if (f.opBal.trim() !== '' && !Number.isFinite(Number(f.opBal))) return 'Opening balance must be a number';
  return null;
}

/** The body sent to the server */
export function toPayload(f: HeadForm, mode: 'add' | 'edit') {
  return {
    code: f.code.trim().toUpperCase(),
    parentCode: f.parentCode.trim().toUpperCase(),
    headName: f.headName.trim(),
    headType: f.headType || 'OTH',
    interest: f.interest,
    pflag: f.pflag,
    hposition: f.hposition ? parseInt(f.hposition, 10) : null,
    opBal: parseFloat(f.opBal) || 0,
    isNew: mode === 'add',
  };
}
