import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Top-bar notification + search appearance (Settings → System & Windows).
 * Stored per desktop install in localStorage and synced between windows, so the
 * Settings window changes the dashboard live.
 */

export type NotifStyle = 'panel' | 'bubble';
export type Shape = 'soft' | 'round';
export type ToastPosition = 'top-right' | 'top-center' | 'bottom-right';

export interface NotifPrefs {
  style: NotifStyle;        // panel = one tidy card, bubble = each alert is its own floating bubble
  shape: Shape;             // soft = rounded corners, round = fully round (pill) shapes
  glass: boolean;           // liquid-glass: semi-transparent + blur
  glassStrength: number;    // 0 (almost clear) … 100 (solid)
  animations: boolean;
  toasts: boolean;          // pop-up when a NEW alert arrives
  toastPosition: ToastPosition;
}

export interface SearchPrefs {
  shape: Shape;
  glass: boolean;
  glassStrength: number;
  animations: boolean;
  learn: boolean;           // rank by what the user usually opens
}

export interface UiPrefs {
  notif: NotifPrefs;
  search: SearchPrefs;
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  notif: { style: 'panel', shape: 'soft', glass: true, glassStrength: 72, animations: true, toasts: true, toastPosition: 'top-right' },
  search: { shape: 'round', glass: true, glassStrength: 72, animations: true, learn: true },
};

const PREFS_KEY = 'lms-ui-prefs';
const USAGE_KEY = 'lms-search-usage';
const CHANNEL = 'lms_ui_prefs';

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}

export function readUiPrefs(): UiPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    const d = DEFAULT_UI_PREFS;
    const n = { ...d.notif, ...(raw.notif || {}) };
    const s = { ...d.search, ...(raw.search || {}) };
    return {
      notif: {
        style: n.style === 'bubble' ? 'bubble' : 'panel',
        shape: n.shape === 'round' ? 'round' : 'soft',
        glass: n.glass !== false,
        glassStrength: clamp(n.glassStrength, 0, 100, d.notif.glassStrength),
        animations: n.animations !== false,
        toasts: n.toasts !== false,
        toastPosition: ['top-right', 'top-center', 'bottom-right'].includes(n.toastPosition) ? n.toastPosition : 'top-right',
      },
      search: {
        shape: s.shape === 'soft' ? 'soft' : 'round',
        glass: s.glass !== false,
        glassStrength: clamp(s.glassStrength, 0, 100, d.search.glassStrength),
        animations: s.animations !== false,
        learn: s.learn !== false,
      },
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

export function saveUiPrefs(next: UiPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(next);
    bc.close();
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent('lms-ui-prefs'));
}

/** Live prefs: updates when changed here, in Settings, or in any other window. */
export function useUiPrefs(): UiPrefs {
  const [prefs, setPrefs] = useState<UiPrefs>(readUiPrefs);
  useEffect(() => {
    const refresh = () => setPrefs(readUiPrefs());
    const onStorage = (e: StorageEvent) => { if (e.key === PREFS_KEY) refresh(); };
    window.addEventListener('lms-ui-prefs', refresh);
    window.addEventListener('storage', onStorage);
    let bc: BroadcastChannel | null = null;
    try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = refresh; } catch { /* unsupported */ }
    return () => {
      window.removeEventListener('lms-ui-prefs', refresh);
      window.removeEventListener('storage', onStorage);
      bc?.close();
    };
  }, []);
  return prefs;
}

/** CSS custom properties for the liquid-glass look at a given strength (0-100). */
export function glassVars(glass: boolean, strength: number): CSSProperties {
  // Clear glass keeps ~28% body, solid is 100%. Blur only exists while it is see-through.
  const alpha = glass ? 0.28 + (strength / 100) * 0.64 : 1;
  return {
    ['--tb-alpha' as string]: alpha.toFixed(2),
    ['--tb-blur' as string]: glass ? `${Math.round(10 + (1 - strength / 100) * 14)}px` : '0px',
  };
}

// ─── Search usage learning ───────────────────────────────────────────────────

export interface UsageEntry {
  count: number;
  last: number;                        // epoch ms of the last pick
  queries: Record<string, number>;     // what the user had typed when they picked this
}
export type UsageMap = Record<string, UsageEntry>;

export function readSearchUsage(): UsageMap {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

export function recordSearchPick(id: string, query: string): void {
  try {
    const usage = readSearchUsage();
    const e = usage[id] || { count: 0, last: 0, queries: {} };
    e.count += 1;
    e.last = Date.now();
    const q = query.trim().toLowerCase();
    if (q) e.queries[q] = (e.queries[q] || 0) + 1;
    usage[id] = e;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch { /* storage unavailable */ }
}

export function clearSearchUsage(): void {
  try { localStorage.removeItem(USAGE_KEY); } catch { /* ignore */ }
}

/**
 * Learned boost for an item. Typing "i" after repeatedly picking Interest
 * Calculation with "i"/"int"/"inte" gives it a big lift; plain popularity adds a
 * smaller lift that fades if the item has not been used for a while.
 */
export function usageBoost(entry: UsageEntry | undefined, query: string): number {
  if (!entry) return 0;
  const q = query.trim().toLowerCase();
  let affinity = 0;
  if (q) {
    for (const [typed, n] of Object.entries(entry.queries)) {
      if (typed.startsWith(q) || q.startsWith(typed)) affinity += n;
    }
  }
  const ageDays = (Date.now() - entry.last) / 86_400_000;
  const recency = Math.max(0.35, 1 - ageDays / 60);
  const popularity = Math.log2(1 + entry.count) * 7 * recency;
  const learned = Math.min(70, Math.log2(1 + affinity) * 28);
  return popularity + learned;
}
