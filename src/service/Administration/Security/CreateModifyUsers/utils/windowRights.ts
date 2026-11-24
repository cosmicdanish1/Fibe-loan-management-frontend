// Create / Modify Users: the pure rules of the window-rights lists and of who may be given which level (ES-645, ES-647).

export interface MenuRow { menuid: number; menuname?: string; menudesc?: string }
export interface MenuItem { id: number; label: string }
export interface LevelRow { userlevelid: number; userlevel: string }

/** The name shown for a window: its description when it has letters, else the menu name made readable */
export function menuLabel(m: MenuRow): string {
  const desc = (m.menudesc || '').trim();
  if (desc && /[a-zA-Z]/.test(desc)) return desc;
  const name = String(m.menuname || '').replace(/^mnu/i, '').replace(/_/g, ' ');
  if (name.includes(' ')) return name.trim();
  return name.replace(/([A-Z])/g, ' $1').trim() || String(m.menuname || `Window ${m.menuid}`);
}

export const toItems = (menus: MenuRow[]): MenuItem[] =>
  menus.map(m => ({ id: Number(m.menuid), label: menuLabel(m) })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

/** Levels that always have every window: nothing to pick for them */
export const isUnrestrictedRole = (role: string) => ['system', 'administrator'].includes(String(role || '').toLowerCase());

/** A role value ('branch_manager') against the legacy level name ('BRANCH MANAGER') */
export const levelIdForRole = (levels: LevelRow[], role: string): number | null => {
  const want = String(role || '').replace(/_/g, ' ').toUpperCase();
  const hit = levels.find(l => String(l.userlevel).replace(/_/g, ' ').toUpperCase() === want);
  return hit ? Number(hit.userlevelid) : null;
};

/** Move windows between the two lists; a window already on the target side is not added twice */
export function moveIds(granted: number[], ids: number[], toGranted: boolean): number[] {
  if (toGranted) return [...new Set([...granted, ...ids])];
  const drop = new Set(ids);
  return granted.filter(g => !drop.has(g));
}

export const sameSet = (a: number[], b: number[]) => a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;

/**
 * The levels the signed-in person may give: only a SYSTEM user may give SYSTEM, only an administrator (or SYSTEM)
 * may give ADMINISTRATOR. The server checks the same again.
 */
export function levelsFor<T extends { value: string }>(all: T[], actorRole: string): T[] {
  const a = String(actorRole || '').toLowerCase();
  const sys = a === 'system' || a === 'sample_1';
  const admin = sys || a === 'administrator' || a === 'admin';
  return all.filter(l => {
    const v = String(l.value).toLowerCase();
    if (v === 'system') return sys;
    if (v === 'administrator') return admin;
    return true;
  });
}

/** A "username already exists" answer from the server, in whatever words the layers put around it */
export const isDuplicateUserError = (message: string) => /username already exists/i.test(message || '');
