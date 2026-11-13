import { useEffect, useSyncExternalStore } from 'react';
import { apiService } from '../services/api';

/**
 * The Easter-egg hunt: which eggs the signed-in user has found (kept on the server), plus a small
 * local queue so an egg seen before sign-in (login window) is counted once the user is in.
 * Everything here is best-effort: it must never throw into the app.
 */
export interface EggProgress { found: string[]; total: number; completed: boolean }

const PENDING_KEY = 'kova:eggs-pending';
export const EGG_COMPLETE_EVENT = 'kova:eggs-complete';

let state: EggProgress = { found: [], total: 6, completed: false };
let loaded = false;
let flushing = false;
const subs = new Set<() => void>();

const publish = (p: EggProgress) => { state = p; subs.forEach((f) => f()); };

const readPending = (): string[] => {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
};
const writePending = (list: string[]) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch { /* ignore */ }
};
const unwrap = (r: any): EggProgress | null => {
  const d = r?.data?.data ?? r?.data;
  return d && Array.isArray(d.found) ? d : null;
};

/** Load this user's progress from the server (call once the user is signed in). */
export async function loadEggs(): Promise<void> {
  try {
    if (!localStorage.getItem('accessToken')) return;
    const p = unwrap(await apiService.request('/easter-eggs/me', { method: 'GET' }));
    if (p) { loaded = true; publish(p); }
    await flushEggs();
  } catch { /* progress is optional */ }
}

/** Send any eggs waiting in the local queue. */
export async function flushEggs(): Promise<void> {
  if (flushing || !localStorage.getItem('accessToken')) return;
  flushing = true;
  try {
    for (const id of readPending()) {
      const p = unwrap(await apiService.post('/easter-eggs/found', { egg: id }));
      if (!p) break;
      writePending(readPending().filter((x) => x !== id));
      const wasDone = state.completed;
      publish(p);
      if (p.completed && !wasDone && loaded) window.dispatchEvent(new CustomEvent(EGG_COMPLETE_EVENT));
    }
  } catch { /* try again next time */ } finally { flushing = false; }
}

/** Record that an egg was found. Safe to call anywhere, any number of times. */
export function reportEgg(id: string): void {
  try {
    if (state.found.includes(id)) return;
    const pending = readPending();
    if (!pending.includes(id)) writePending([...pending, id]);
    void flushEggs();
  } catch { /* never break the host screen */ }
}

/** Golden ring + glow for the avatar of a user who found every egg. Spread into an element's style. */
export const GOLD_GLOW_STYLE = {
  boxShadow: '0 0 0 2px #f5c542, 0 0 12px 3px rgba(245,197,66,0.75)',
} as const;

export function useEggHunt(): EggProgress {
  // Tool windows are separate pages with their own state: load progress on first use.
  useEffect(() => { if (!loaded) void loadEggs(); }, []);
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => state,
  );
}
