// The window-rights lists of Create / Modify Users (ES-645): which windows one person may open.
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../../../../services/api';
import { MenuItem, LevelRow, toItems, levelIdForRole, isUnrestrictedRole, moveIds } from '../utils/windowRights';

interface Args {
  /** The level chosen on the screen ('clerk', 'branch_manager' ...) */
  role: string;
  /** The user being modified, or null for a new user */
  userId: number | null;
}

export function useWindowRights({ role, userId }: Args) {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [granted, setGranted] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // only the newest answer may fill the lists
  const seq = useRef(0);
  const lastLoad = useRef('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [m, l] = await Promise.all([apiService.getRoleMenus(), apiService.getRoleLevels()]);
        if (!live) return;
        if (m?.success && Array.isArray(m.data)) setMenus(toItems(m.data));
        if (l?.success && Array.isArray(l.data)) setLevels(l.data as LevelRow[]);
      } catch (e: any) {
        if (live) setError(e?.message || 'The window list could not be loaded');
      }
    })();
    return () => { live = false; };
  }, []);

  const unrestricted = isUnrestrictedRole(role);

  const reload = useCallback(async () => {
    const mySeq = ++seq.current;
    if (!role || isUnrestrictedRole(role)) { setGranted([]); setLoaded(true); setDirty(false); return; }
    setLoading(true);
    setError(null);
    try {
      let ids: number[] | null = null;
      if (userId !== null) {
        const r = await apiService.getUserMenuRights(userId);
        if (r?.success && r.data) {
          // the person's own rights, unless their level changed on the screen: then the new level's defaults
          const sameLevel = levelIdForRole(levels, role) === Number(r.data.userlevelid);
          ids = sameLevel ? (r.data.granted as number[]) : null;
        }
      }
      if (ids === null) {
        const levelId = levelIdForRole(levels, role);
        if (levelId === null) { ids = []; }
        else {
          const d = await apiService.getRoleDefaultRights(levelId);
          ids = d?.success && Array.isArray(d.data) ? (d.data as number[]) : [];
        }
      }
      if (mySeq !== seq.current) return;
      setGranted([...new Set(ids)]);
      setLoaded(true);
      setDirty(false);
    } catch (e: any) {
      if (mySeq !== seq.current) return;
      setError(e?.message || 'The window rights could not be loaded');
      setLoaded(false);
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, [role, userId, levels]);

  // load whenever the person or the level changes (and once the level list is known)
  useEffect(() => {
    const key = `${userId ?? 'new'}|${role}|${levels.length}`;
    if (!role || levels.length === 0 || lastLoad.current === key) return;
    lastLoad.current = key;
    void reload();
  }, [role, userId, levels, reload]);

  const move = useCallback((ids: number[], toGranted: boolean) => {
    if (ids.length === 0) return;
    setGranted(g => moveIds(g, ids, toGranted));
    setDirty(true);
  }, []);

  const reset = useCallback(() => {
    seq.current++;
    lastLoad.current = '';
    setGranted([]);
    setLoaded(false);
    setDirty(false);
    setError(null);
  }, []);

  /** What goes to the server: null when this level has nothing to pick (administrator / SYSTEM) or nothing is loaded */
  const menuIdsToSave = (): number[] | null => (unrestricted || !loaded ? null : granted);

  return { menus, granted, loaded, loading, error, dirty, unrestricted, move, reload, reset, menuIdsToSave };
}
