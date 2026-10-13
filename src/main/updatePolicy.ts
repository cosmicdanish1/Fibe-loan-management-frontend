// Pure update rules, kept free of Electron imports so they can be unit-tested.

// minor      = frontend-only: the backend this PC talks to already meets the release's
//              requiresBackend, so a one-click install is safe.
// major      = the release needs a newer backend. Never installable from the app; the
//              backend is updated first, then the installer is run by hand.
// unverified = could not read the backend version or the release's requirements.
//              Treated like major: if we cannot prove it is safe, we do not offer it.
export type UpdateKind = 'minor' | 'major' | 'unverified';

// "1.10.0" > "1.9.0". Pre-release tags are ignored; versions here are plain x.y.z.
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function classifyUpdate(backendVersion: string | undefined, requiresBackend: string | undefined): UpdateKind {
  if (!backendVersion || backendVersion === 'unknown' || !requiresBackend) return 'unverified';
  return compareVersions(backendVersion, requiresBackend) >= 0 ? 'minor' : 'major';
}
