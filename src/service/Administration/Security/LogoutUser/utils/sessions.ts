// Pure helpers of the Logout User window (kept out of the page so they can be tested alone).

export interface LiveUser {
  userId: number;
  username: string;
  fullName: string | null;
  role: string;
  live: boolean;
  loginDate: string | null;
  loginTime: string | null;
  loginAt: string | null;
  logoutTime: string | null;
  sessionMinutes: number | null;
  lastSeen: string | null;
  host: string | null;
  ip: string | null;
  version: string | null;
}

/** "AB" from "Asha Rao", "am" from "amit" (two letters, upper case). */
export function initials(u: Pick<LiveUser, 'username' | 'fullName'>): string {
  const words = (u.fullName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return ((words[0] ?? '').charAt(0) + (words[1] ?? '').charAt(0)).toUpperCase();
  const base = (words[0] || u.username || '?').replace(/[^A-Za-z0-9]/g, '');
  return (base.slice(0, 2) || '?').toUpperCase();
}

/** 95 -> "1 h 35 min", 8 -> "8 min", 0 -> "under a minute", null -> "". */
export function durationText(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !isFinite(minutes) || minutes < 0) return '';
  if (minutes < 1) return 'under a minute';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** The server's 24-hour "HH:MM:SS" (or 12-hour legacy text) shown as it is; empty gives a dash. */
export function timeText(t: string | null | undefined): string {
  return t && t.trim() ? t.trim() : '—';
}

/** "2026-08-25" -> "25 Aug 2026" without any time-zone shift. */
export function dateText(d: string | null | undefined): string {
  const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
  if (!m) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${m[3]} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

/** The search box matches the user name, the full name and the role, in any letter case. */
export function filterUsers(users: LiveUser[], search: string, liveOnly: boolean): LiveUser[] {
  const q = search.trim().toLowerCase();
  return users.filter((u) => {
    if (liveOnly && !u.live) return false;
    if (!q) return true;
    return [u.username, u.fullName ?? '', u.role].some((x) => x.toLowerCase().includes(q));
  });
}

/** Share of the largest value, 0..100 (a bar width); a zero maximum gives 0. */
export function barPercent(value: number, max: number): number {
  if (!max || max <= 0 || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

/** The busiest hours, most sign-ins first (ties: the earlier hour), zero-hours left out. */
export function busiestHours(hours: { hour: number; sessions: number }[], n = 5) {
  return [...hours].filter((h) => h.sessions > 0).sort((a, b) => b.sessions - a.sessions || a.hour - b.hour).slice(0, n);
}

/** 9 -> "9 am", 0 -> "12 am", 12 -> "12 pm", 15 -> "3 pm". */
export function hourText(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm';
  const x = h % 12 === 0 ? 12 : h % 12;
  return `${x} ${suffix}`;
}
