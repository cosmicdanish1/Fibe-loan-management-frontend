import notes from './releaseNotes.json';

export interface Release {
  version: string;
  date?: string;
  title?: string;
  new?: string[];
  improved?: string[];
  fixed?: string[];
}

export const RELEASES: Release[] = (notes as { releases: Release[] }).releases;

/** At most this many releases are shown at once; a person who skipped many updates sees the newest ones. */
export const MAX_RELEASES = 4;

// "1.10.0" > "1.9.0". Plain x.y.z versions only (same rule as main/updatePolicy.ts).
export const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
};

const newestFirst = (list: Release[]) => [...list].sort((a, b) => compareVersions(b.version, a.version));

/**
 * The releases a person has not seen yet: newer than the last version they saw, up to the version
 * that is running. When nothing was ever recorded (`lastSeen` null) only the running version's notes
 * are shown, not the whole history.
 */
export const selectUnseen = (releases: Release[], current: string, lastSeen: string | null): Release[] => {
  const upToCurrent = newestFirst(releases.filter((r) => compareVersions(r.version, current) <= 0));
  if (!lastSeen) return upToCurrent.slice(0, 1);
  return upToCurrent.filter((r) => compareVersions(r.version, lastSeen) > 0).slice(0, MAX_RELEASES);
};

/** For Help > What's New: the latest releases, whether or not they were seen. */
export const selectLatest = (releases: Release[], current: string, count = 3): Release[] =>
  newestFirst(releases.filter((r) => compareVersions(r.version, current) <= 0)).slice(0, count);

/** True when the person last saw an older version than the one running now (or nothing was recorded). */
export const isUpgrade = (current: string, lastSeen: string | null): boolean =>
  !lastSeen || compareVersions(lastSeen, current) < 0;

let cachedVersion: Promise<string | undefined> | undefined;
/** The running app version, from the Electron main process. Undefined outside Electron (browser dev). */
export const getAppVersion = (): Promise<string | undefined> => {
  if (!cachedVersion) {
    const api = (window as any).electronAPI;
    cachedVersion = Promise.resolve(api?.getAppVersion?.()).then((v) => (typeof v === 'string' && /^\d+\.\d+\.\d+/.test(v) ? v.split('-')[0] : undefined)).catch(() => undefined);
  }
  return cachedVersion;
};
