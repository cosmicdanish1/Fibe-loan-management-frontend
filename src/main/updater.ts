import { app, BrowserWindow, ipcMain, net } from 'electron';
import { autoUpdater } from 'electron-updater';
import { classifyUpdate, type UpdateKind } from './updatePolicy';

// Public GitHub repo that holds the installers only (no source). Must match
// build.publish in package.json.
const RELEASES_OWNER = 'cosmicdanish1';
const RELEASES_REPO = 'fibe-loan-releases';

const FIRST_CHECK_DELAY_MS = 30 * 1000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  version?: string | undefined;
  notes?: string | undefined;
  kind?: UpdateKind | undefined;
  requiresBackend?: string | undefined;
  backendVersion?: string | undefined;
  dayEndInProgress?: boolean | undefined;
  progress?: number | undefined;
  installOnQuit?: boolean | undefined;
  releaseUrl?: string | undefined;
  error?: string | undefined;
}

interface UpdateInfoFile {
  version?: string;
  requiresBackend?: string;
  notes?: string;
}

interface BackendHealth {
  version?: string;
  dayEndInProgress?: boolean;
}

let state: UpdateState = { status: 'idle', currentVersion: app.getVersion() };
let resolveApiUrl: () => Promise<{ url: string | null; configured: boolean }> = async () => ({ url: null, configured: false });
let checking = false;

function setState(patch: Partial<UpdateState>) {
  state = { ...state, ...patch };
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('updater:state', state);
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await net.fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchBackendHealth(): Promise<BackendHealth | null> {
  try {
    const { url } = await resolveApiUrl();
    if (!url) return null;
    return await fetchJson<BackendHealth>(`${url}/health`);
  } catch {
    return null;
  }
}

function releaseTagUrl(version: string) {
  return `https://github.com/${RELEASES_OWNER}/${RELEASES_REPO}/releases/tag/v${version}`;
}

async function checkNow(): Promise<UpdateState> {
  if (checking || state.status === 'downloading' || state.status === 'downloaded') return state;
  checking = true;
  setState({ status: 'checking', error: undefined });
  try {
    const result = await autoUpdater.checkForUpdates();
    const info = result?.updateInfo;
    if (!info || !result?.isUpdateAvailable) {
      setState({ status: 'idle', version: undefined, kind: undefined });
      return state;
    }

    const infoFile = await fetchJson<UpdateInfoFile>(
      `https://github.com/${RELEASES_OWNER}/${RELEASES_REPO}/releases/download/v${info.version}/update-info.json`,
    );
    const health = await fetchBackendHealth();
    const notes = infoFile?.notes ?? (typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined);

    setState({
      status: 'available',
      version: info.version,
      notes,
      requiresBackend: infoFile?.requiresBackend,
      backendVersion: health?.version,
      kind: classifyUpdate(health?.version, infoFile?.requiresBackend),
      dayEndInProgress: !!health?.dayEndInProgress,
      releaseUrl: releaseTagUrl(info.version),
    });
  } catch (e: any) {
    setState({ status: 'error', error: String(e?.message ?? e) });
  } finally {
    checking = false;
  }
  return state;
}

// Re-read the day-end flag right before acting; the value from the check may be hours old.
async function dayEndRunningNow(): Promise<boolean> {
  const health = await fetchBackendHealth();
  return !!health?.dayEndInProgress;
}

export function initUpdater(options: {
  resolveServerUrl: () => Promise<{ url: string | null; configured: boolean }>;
}) {
  resolveApiUrl = options.resolveServerUrl;

  ipcMain.handle('updater:get-state', () => state);

  // Dev runs and unpackaged builds have no app-update.yml, so there is nothing to check.
  if (!app.isPackaged) {
    ipcMain.handle('updater:check', () => state);
    ipcMain.handle('updater:download', () => ({ ok: false, error: 'Updates are disabled in development.' }));
    ipcMain.handle('updater:install', () => ({ ok: false, error: 'Updates are disabled in development.' }));
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = console;

  autoUpdater.on('download-progress', (p) => setState({ status: 'downloading', progress: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', () => setState({ status: 'downloaded', progress: 100 }));
  autoUpdater.on('error', (e) => {
    // checkNow reports its own errors; this catches download/install failures.
    if (state.status === 'downloading') setState({ status: 'available', error: String(e?.message ?? e) });
  });

  ipcMain.handle('updater:check', () => checkNow());

  ipcMain.handle('updater:download', async () => {
    if (state.status !== 'available') return { ok: false, error: 'No update is ready to download.' };
    if (state.kind !== 'minor') return { ok: false, error: 'This update needs a server update first.' };
    if (await dayEndRunningNow()) return { ok: false, error: 'Day-end is running. Try again once it finishes.' };
    setState({ status: 'downloading', progress: 0, error: undefined });
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (e: any) {
      setState({ status: 'available', error: String(e?.message ?? e) });
      return { ok: false, error: String(e?.message ?? e) };
    }
  });

  ipcMain.handle('updater:install', async (_event, when: 'now' | 'on-quit') => {
    if (state.status !== 'downloaded') return { ok: false, error: 'The update has not been downloaded yet.' };
    if (when === 'on-quit') {
      autoUpdater.autoInstallOnAppQuit = true;
      setState({ installOnQuit: true });
      return { ok: true };
    }
    if (await dayEndRunningNow()) return { ok: false, error: 'Day-end is running. Install after it finishes.' };
    // silent install, then relaunch the app
    autoUpdater.quitAndInstall(true, true);
    return { ok: true };
  });

  setTimeout(() => void checkNow(), FIRST_CHECK_DELAY_MS);
  setInterval(() => void checkNow(), CHECK_INTERVAL_MS);
}
