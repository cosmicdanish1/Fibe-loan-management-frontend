import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, RefreshCw, UploadCloud, CheckCircle2, AlertCircle, ServerCog, Trash2, Download, ChevronRight } from 'lucide-react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useTranslation } from 'react-i18next';
import compatibility from '../compatibility.json';
import releaseNotes from '../../../../features/onboarding/whatsNew/releaseNotes.json';
import './SystemUpdate.css';

interface AppUpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  packaged?: boolean;
  checkedAt?: string;
  version?: string;
  whatsNew?: { new?: string[]; improved?: string[]; fixed?: string[]; title?: string };
  highlights?: string[];
  kind?: 'minor' | 'major' | 'unverified';
  requiresBackend?: string;
  backendMax?: string | null;
  backendVersion?: string;
  dayEndInProgress?: boolean;
  progress?: number;
  installOnQuit?: boolean;
  error?: string;
}

interface Notes { title?: string; new?: string[]; improved?: string[]; fixed?: string[] }

const cmpVer = (a: string, b: string): number => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
};
const inRange = (backend: string, min: string, max: string | null | undefined) =>
  cmpVer(backend, min) >= 0 && (!max || cmpVer(backend, max) <= 0);
const rangeLabel = (min: string, max: string | null | undefined) => (max ? `${min} to ${max}` : `${min} or newer`);

const getUpdater = () => (window as any).electronAPI?.updater as undefined | {
  getState: () => Promise<AppUpdateState | null>;
  check: () => Promise<AppUpdateState | null>;
  download: () => Promise<{ ok: boolean; error?: string } | null>;
  install: (when: 'now' | 'on-quit') => Promise<{ ok: boolean; error?: string } | null>;
  onState: (cb: (s: AppUpdateState) => void) => () => void;
};

const NotesBlock: React.FC<{ notes: Notes | null; empty: string }> = ({ notes, empty }) => {
  if (!notes) return <p className="aw-muted" style={{ margin: 0 }}>{empty}</p>;
  const groups: [string, string[] | undefined][] = [['New', notes.new], ['Improved', notes.improved], ['Fixed', notes.fixed]];
  return (
    <>
      {groups.filter(([, items]) => items && items.length).map(([label, items]) => (
        <div className="su-notes-group" key={label}>
          <div className="su-notes-label">{label}</div>
          <ul className="su-notes-list">{items!.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      ))}
    </>
  );
};

interface PendingRelease {
  size: number;
  sha256: string;
  manifest: { version: string; nodeMajor?: number; migrations?: string[] };
  uploadedBy: string | null;
  uploadedAt: string;
}

interface LastUpdate {
  state: 'running' | 'success' | 'rolled-back' | 'failed';
  step?: string;
  from?: string;
  to?: string;
  requestedBy?: string | null;
  startedAt?: string;
  finishedAt?: string;
  backup?: string;
  error?: string;
  note?: string;
}

interface UpdateStatus {
  currentVersion: string;
  nodeVersion: string;
  serviceName: string;
  canSelfUpdate: boolean;
  reason: string | null;
  pgDumpFound: boolean;
  remoteConfigured: boolean;
  pending: PendingRelease | null;
  lastUpdate: LastUpdate | null;
}

interface RemoteCheck {
  installed: string;
  updateAvailable: boolean;
  latest: { version: string; notes: string; zipSize: number; publishedAt: string | null } | null;
}

interface DownloadJob {
  state: 'idle' | 'downloading' | 'done' | 'failed';
  version?: string;
  received: number;
  total: number;
  error?: string;
}

const CONFIRM_WORD = 'UPDATE';
const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const POLL_MS = 3000;
const POLL_GIVE_UP_MS = 15 * 60 * 1000;

const unwrap = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res);
const errorOf = (res: any, fallback: string) => res?.error || res?.message || fallback;
const sizeLabel = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const stateText: Record<LastUpdate['state'], string> = {
  running: 'In progress',
  success: 'Completed',
  'rolled-back': 'Failed, previous version restored',
  failed: 'Failed, nothing was changed',
};

const SystemUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['administrator', 'admin', 'system'].includes(String(user?.role || '').toLowerCase());

  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyTarget, setApplyTarget] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res: any = await apiService.get('/system-update/status');
      if (res?.success === false) setError(errorOf(res, 'Could not load update status.'));
      else { setStatus(unwrap(res) as UpdateStatus); setError(null); }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const upload = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) { setError('Choose the .zip release file.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res: any = await apiService.request('/system-update/upload', { method: 'POST', body: fd, timeoutMs: UPLOAD_TIMEOUT_MS });
      if (res?.success === false) setError(errorOf(res, 'Upload failed.'));
      else { message.success(t('Release checked and ready to apply.')); await load(); }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const [remote, setRemote] = useState<RemoteCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const jobPollRef = useRef<number | null>(null);
  useEffect(() => () => { if (jobPollRef.current) window.clearInterval(jobPollRef.current); }, []);

  const checkRemote = async () => {
    setError(null);
    setChecking(true);
    try {
      const res: any = await apiService.get('/system-update/remote/check');
      if (res?.success === false) setError(errorOf(res, 'Could not check for updates.'));
      else setRemote(unwrap(res) as RemoteCheck);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setChecking(false);
    }
  };

  const downloadRemote = async () => {
    setError(null);
    try {
      const res: any = await apiService.post('/system-update/remote/download');
      if (res?.success === false) { setError(errorOf(res, 'Could not start the download.')); return; }
      setJob(unwrap(res) as DownloadJob);
      jobPollRef.current = window.setInterval(async () => {
        try {
          const p: any = await apiService.get('/system-update/remote/progress');
          const next = unwrap(p) as DownloadJob;
          setJob(next);
          if (next.state === 'done' || next.state === 'failed') {
            if (jobPollRef.current) window.clearInterval(jobPollRef.current);
            jobPollRef.current = null;
            if (next.state === 'failed') setError(next.error ?? 'The download failed.');
            else message.success(t('Release downloaded, verified and ready to apply.'));
            await load();
          }
        } catch { /* keep polling; the server may be busy */ }
      }, 1500);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const discard = async () => {
    const res: any = await apiService.delete('/system-update/pending');
    if (res?.success === false) setError(errorOf(res, 'Could not discard the release.'));
    setConfirmText('');
    await load();
  };

  // The server goes down and comes back; wait for /health to report the new version, then read the
  // result the updater wrote (it may also report a rollback, in which case the old version returns).
  const waitForRestart = (targetVersion: string) => {
    const startedAt = Date.now();
    let sawDowntime = false;
    pollRef.current = window.setInterval(async () => {
      let version: string | null = null;
      try {
        const res: any = await apiService.get('/health');
        version = unwrap(res)?.version ?? null;
      } catch { version = null; }

      if (version === null) sawDowntime = true;
      const back = version !== null && (sawDowntime || version === targetVersion);
      const gaveUp = Date.now() - startedAt > POLL_GIVE_UP_MS;
      if (back || gaveUp) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setApplying(false);
        setApplyTarget(null);
        setConfirmText('');
        if (gaveUp && !back) setError('The server has not come back yet. Check the server PC and the update log in its logs folder.');
        await load();
      }
    }, POLL_MS);
  };

  const apply = async () => {
    if (!status?.pending) return;
    setError(null);
    try {
      const res: any = await apiService.post('/system-update/apply');
      if (res?.success === false) { setError(errorOf(res, 'Could not start the update.')); return; }
      setApplying(true);
      setApplyTarget(status.pending.manifest.version);
      waitForRestart(status.pending.manifest.version);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const copy = (text: string) => { void navigator.clipboard?.writeText(text).then(() => message.success(t('Copied'))); };

  // ---- Frontend (this app) ----
  const [app, setApp] = useState<AppUpdateState | null>(null);
  const [appBusy, setAppBusy] = useState(false);
  const [appMsg, setAppMsg] = useState<string | null>(null);
  const [notesTab, setNotesTab] = useState<'frontend' | 'backend'>('frontend');

  useEffect(() => {
    const u = getUpdater();
    if (!u) return;
    let gone = false;
    u.getState().then((s) => { if (!gone && s) setApp(s); }).catch(() => { /* optional */ });
    const off = u.onState((s) => setApp(s));
    return () => { gone = true; off?.(); };
  }, []);

  const runApp = async (fn: () => Promise<{ ok: boolean; error?: string } | AppUpdateState | null> | undefined) => {
    setAppBusy(true); setAppMsg(null);
    try {
      const res: any = await fn();
      if (res && res.ok === false) setAppMsg(res.error ?? 'Something went wrong.');
    } catch (e: any) { setAppMsg(String(e?.message ?? e)); } finally { setAppBusy(false); }
  };

  const updater = getUpdater();
  const installedFront = app?.currentVersion ?? '';
  const backendNow = app?.backendVersion ?? status?.currentVersion ?? '';
  const frontAvailable = app && (app.status === 'available' || app.status === 'downloading' || app.status === 'downloaded') ? app.version ?? null : null;
  const dev = app ? app.packaged === false : false;

  const rows = compatibility.rows as { frontend: string; backendMin: string; backendMax: string | null }[];
  const shownRows = [...rows];
  if (app?.version && app.requiresBackend && !rows.some((r) => r.frontend === app.version)) {
    shownRows.unshift({ frontend: app.version, backendMin: app.requiresBackend, backendMax: app.backendMax ?? null });
  }
  const myRow = rows.find((r) => r.frontend === installedFront);
  const pairOk = myRow && backendNow ? inRange(backendNow, myRow.backendMin, myRow.backendMax) : null;

  const installedNotes = (releaseNotes.releases as any[]).find((r) => r.version === installedFront) as Notes | undefined;
  const latestFrontNotes: Notes | null = app?.whatsNew ?? (app?.highlights ? { new: app.highlights } : null);

  const remoteNotes = remote?.latest?.notes ?? '';

  const pending = status?.pending ?? null;
  const last = status?.lastUpdate ?? null;
  const canApply = !!status?.canSelfUpdate && !!pending && confirmText.trim().toUpperCase() === CONFIRM_WORD && !applying;

  let frontLine: { tone: 'ok' | 'new' | 'warn' | 'bad'; text: string };
  if (!updater) frontLine = { tone: 'warn', text: t('Updates can only be installed from the desktop app.') };
  else if (dev) frontLine = { tone: 'warn', text: t('This is a development build. App updates are switched off.') };
  else if (app?.status === 'error') frontLine = { tone: 'bad', text: app.error ?? t('The check failed.') };
  else if (frontAvailable && app?.kind === 'major') frontLine = { tone: 'warn', text: t('Version {{1}} needs server {{2}} or newer. Update the server first.', { 1: frontAvailable, 2: app.requiresBackend }) };
  else if (frontAvailable && app?.kind === 'unverified') frontLine = { tone: 'warn', text: t('Version {{1}} is available, but the server version could not be read, so it is not safe to install yet.', { 1: frontAvailable }) };
  else if (frontAvailable) frontLine = { tone: 'new', text: t('Version {{1}} is available.', { 1: frontAvailable }) };
  else if (app?.checkedAt) frontLine = { tone: 'ok', text: t('Up to date.') };
  else frontLine = { tone: 'warn', text: t('Not checked yet.') };

  const backendHasNew = !!remote?.updateAvailable && !!remote.latest;
  let backLine: { tone: 'ok' | 'new' | 'warn'; text: string };
  if (backendHasNew) backLine = { tone: 'new', text: t('Version {{1}} is available. Update it on the server.', { 1: remote!.latest!.version }) };
  else if (remote?.latest) backLine = { tone: 'ok', text: t('Up to date.') };
  else if (remote) backLine = { tone: 'warn', text: t('No published server release found yet.') };
  else if (status?.remoteConfigured) backLine = { tone: 'warn', text: t('Not checked yet.') };
  else backLine = { tone: 'warn', text: t('Updated by hand on the server PC. Automatic check is not set up here.') };

  return (
    <div className="app-window aw-calm">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('System Update')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ServerCog size={12} /> {t('Versions of this app and the server, what changed, and which pairs work together.')}
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={() => { void load(); void updater?.check(); }} disabled={loading || applying} className="aw-icon-btn" aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
            <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Close')}</button>
        </div>
      </div>

      <div className="aw-content">
        {!isAdmin ? (
          <section className="aw-card" style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="aw-alert aw-alert-warning"><AlertCircle size={16} /><span>{t('Only an administrator can update the server.')}</span></div>
          </section>
        ) : (
          <div className="aw-stack" style={{ maxWidth: 960, margin: '0 auto' }}>
            {error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}

            {applying && (
              <div className="aw-alert aw-alert-info" role="status">
                <RefreshCw size={16} className="aw-spin" />
                <span>
                  {t('Updating the server to')} <strong>{applyTarget}</strong>. The server will stop and restart, and you will be
                  signed out of anything that needs it. Please keep this window open and do not switch the server off.
                </span>
              </div>
            )}

            <div className="su-grid">
              {/* ---- App (frontend) ---- */}
              <section className="aw-card su-product">
                <div className="su-product-head">
                  <div>
                    <div className="su-product-name">{t('App')}</div>
                    <div className="su-product-sub">{t('The program installed on this PC')}</div>
                  </div>
                  <button type="button" className="aw-btn aw-btn-secondary" disabled={!updater || dev || appBusy || app?.status === 'checking' || app?.status === 'downloading'} onClick={() => void runApp(() => updater?.check())}>
                    <RefreshCw size={13} className={app?.status === 'checking' ? 'aw-spin' : ''} /> {t('Check')}
                  </button>
                </div>
                <div className="su-versions">
                  <div><div className="su-ver-label">{t('Installed')}</div><div className="su-ver-num">{installedFront || '…'}</div></div>
                  <div><div className="su-ver-label">{t('Latest')}</div><div className={`su-ver-num ${frontAvailable ? 'is-new' : 'is-none'}`}>{frontAvailable ?? (app?.checkedAt && !dev ? installedFront : '–')}</div></div>
                </div>
                <div className="su-status"><span className={`su-dot ${frontLine.tone}`} /><span>{frontLine.text}</span></div>
                {appMsg && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><span>{appMsg}</span></div>}
                {app?.dayEndInProgress && frontAvailable && <div className="su-status"><span className="su-dot warn" /><span>{t('Day-end is running. Install after it finishes.')}</span></div>}
                {app?.status === 'downloading' && <div className="su-progress" role="progressbar" aria-valuenow={app.progress ?? 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${app.progress ?? 0}%` }} /></div>}
                <div className="su-actions">
                  {app?.status === 'available' && (
                    <button type="button" className="aw-btn aw-btn-primary" disabled={appBusy || app.kind !== 'minor' || !!app.dayEndInProgress} onClick={() => void runApp(() => updater?.download())}>
                      <Download size={13} /> {t('Download {{1}}', { 1: app.version })}
                    </button>
                  )}
                  {app?.status === 'downloading' && <button type="button" className="aw-btn aw-btn-primary" disabled>{t('Downloading')} {app.progress ?? 0}%</button>}
                  {app?.status === 'downloaded' && (
                    <>
                      <button type="button" className="aw-btn aw-btn-primary" disabled={appBusy || !!app.dayEndInProgress} onClick={() => void runApp(() => updater?.install('now'))}>{t('Restart and install')}</button>
                      <button type="button" className="aw-btn aw-btn-secondary" disabled={appBusy || app.installOnQuit} onClick={() => void runApp(() => updater?.install('on-quit'))}>{app.installOnQuit ? t('Will install when you close the app') : t('Install when I close the app')}</button>
                    </>
                  )}
                </div>
                {app?.checkedAt && <div className="su-meta"><span>{t('Last checked')} <strong>{dayjs(app.checkedAt).format('DD MMM YYYY HH:mm')}</strong></span></div>}
              </section>

              {/* ---- Server (backend) ---- */}
              <section className="aw-card su-product">
                <div className="su-product-head">
                  <div>
                    <div className="su-product-name">{t('Server')}</div>
                    <div className="su-product-sub">{t('The program on the server PC, with the database')}</div>
                  </div>
                  <button type="button" className="aw-btn aw-btn-secondary" disabled={!status?.remoteConfigured || checking || applying || job?.state === 'downloading'} onClick={() => void checkRemote()} data-tip={status?.remoteConfigured ? undefined : t('No update token on this server')}>
                    <RefreshCw size={13} className={checking ? 'aw-spin' : ''} /> {t('Check')}
                  </button>
                </div>
                <div className="su-versions">
                  <div><div className="su-ver-label">{t('Installed')}</div><div className="su-ver-num">{status?.currentVersion ?? '…'}</div></div>
                  <div><div className="su-ver-label">{t('Latest')}</div><div className={`su-ver-num ${backendHasNew ? 'is-new' : 'is-none'}`}>{remote?.latest?.version ?? '–'}</div></div>
                </div>
                <div className="su-status"><span className={`su-dot ${backLine.tone}`} /><span>{backLine.text}</span></div>
                <div className="su-meta">
                  <span>Node <strong>{status?.nodeVersion ?? '…'}</strong></span>
                  <span>{t('Backup tool')} <strong>{status ? (status.pgDumpFound ? t('Found') : t('Not found')) : '…'}</strong></span>
                </div>
              </section>
            </div>

            {/* ---- Compatibility ---- */}
            <section className="aw-card">
              <div className="su-section-head">
                <span className="su-section-title">{t('Which app works with which server')}</span>
                <span className="su-section-hint">{t('Install the server first, then the app')}</span>
              </div>
              {pairOk !== null && (
                <div className="su-pair">
                  <span className={`su-dot ${pairOk ? 'ok' : 'bad'}`} style={{ marginTop: 0 }} />
                  <span>{pairOk
                    ? t('App {{1}} and server {{2}} work together.', { 1: installedFront, 2: backendNow })
                    : t('App {{1}} needs server {{2}}. This server is {{3}}.', { 1: installedFront, 2: rangeLabel(myRow!.backendMin, myRow!.backendMax), 3: backendNow })}</span>
                </div>
              )}
              <table className="su-table">
                <thead><tr><th>{t('App version')}</th><th>{t('Works with server')}</th></tr></thead>
                <tbody>
                  {shownRows.map((r) => (
                    <tr key={r.frontend} className={r.frontend === installedFront ? 'is-current' : ''}>
                      <td>{r.frontend}{r.frontend === installedFront && <span className="su-tag">{t('installed')}</span>}{r.frontend === frontAvailable && <span className="su-tag">{t('available')}</span>}</td>
                      <td>{rangeLabel(r.backendMin, r.backendMax)}{backendNow && inRange(backendNow, r.backendMin, r.backendMax) && <span className="su-tag">{t('matches this server')}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ---- Release notes ---- */}
            <section className="aw-card">
              <div className="su-section-head"><span className="su-section-title">{t('What changed')}</span></div>
              <div className="su-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={notesTab === 'frontend'} className={`su-tab ${notesTab === 'frontend' ? 'is-on' : ''}`} onClick={() => setNotesTab('frontend')}>{t('App')}</button>
                <button type="button" role="tab" aria-selected={notesTab === 'backend'} className={`su-tab ${notesTab === 'backend' ? 'is-on' : ''}`} onClick={() => setNotesTab('backend')}>{t('Server')}</button>
              </div>
              {notesTab === 'frontend' ? (
                <>
                  {frontAvailable && (
                    <div className="su-notes-group">
                      <p className="su-notes-title">{t('In {{1}}, available now', { 1: frontAvailable })}</p>
                      <NotesBlock notes={latestFrontNotes} empty={t('No notes were published for this version.')} />
                    </div>
                  )}
                  <p className="su-notes-title">{t('In {{1}}, installed', { 1: installedFront || '…' })}</p>
                  <NotesBlock notes={installedNotes ?? null} empty={t('No notes for this version.')} />
                </>
              ) : (
                <>
                  {backendHasNew && remoteNotes && (
                    <div className="su-notes-group">
                      <p className="su-notes-title">{t('In {{1}}, available now', { 1: remote!.latest!.version })}</p>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: '20px' }}>{remoteNotes}</p>
                    </div>
                  )}
                  {!backendHasNew && <p className="aw-muted" style={{ margin: 0 }}>{status?.remoteConfigured ? t('Press Check on the server card to read the notes of the newest server release.') : t('Server release notes are not available here. They come with the release file you were given.')}</p>}
                </>
              )}
            </section>

            {/* ---- Server update by file (hand work) ---- */}
            <section className="aw-card">
              <details className="su-adv" open={!!pending || (!!last && last.state !== 'success')}>
                <summary><ChevronRight size={14} /> {t('Update the server from here')}</summary>
                <div className="su-adv-body">
                  <p className="aw-muted" style={{ margin: 0 }}>{t('Normally the server is updated by hand on the server PC. This does the same from here: a database backup is taken first, and the old version is restored if anything fails.')}</p>
                  {status && !status.canSelfUpdate && (
                    <div className="aw-alert aw-alert-warning">
                      <AlertCircle size={16} /><span>{t('Updates cannot be applied from here: {{1}}', { 1: status.reason })}</span>
                    </div>
                  )}
                  {status && status.canSelfUpdate && !status.pgDumpFound && (
                    <div className="aw-alert aw-alert-warning">
                      <AlertCircle size={16} /><span>{t('The database backup tool was not found. The update will stop before changing anything. Set PG_DUMP_PATH in the server settings.')}</span>
                    </div>
                  )}
                    {last && (
                      <section className="aw-card">
                        <div className="aw-card-head"><span className="aw-card-title">{t('Last update')}</span></div>
                        <div className={`aw-alert ${last.state === 'success' ? 'aw-alert-success' : last.state === 'running' ? 'aw-alert-info' : 'aw-alert-danger'}`}>
                          {last.state === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          <span>
                            <strong>{stateText[last.state]}</strong>{last.from && last.to ? `: ${last.from} → ${last.to}` : ''}
                            {last.finishedAt ? ` (${dayjs(last.finishedAt).format('DD MMM YYYY HH:mm')})` : ''}
                          </span>
                        </div>
                        {last.error && <p className="aw-muted" style={{ margin: '8px 0 0' }}>{last.error}</p>}
                        {last.note && <p className="aw-muted" style={{ margin: '4px 0 0' }}>{last.note}</p>}
                        {last.backup && <p className="aw-muted" style={{ margin: '4px 0 0' }}>{t('Database backup: {{1}}', { 1: last.backup })}</p>}
                      </section>
                    )}

                    {!pending && (
                      <section className="aw-card">
                        <div className="aw-card-head"><span className="aw-card-title">1. {t('Get the release')}</span></div>

                        {status?.remoteConfigured ? (
                          <>
                            <p className="aw-muted" style={{ margin: '0 0 12px' }}>
                              {t('The server can look for the newest published release itself and download it. The file is checked against its checksum before it can be used.')}
                            </p>
                            <div className="aw-actions">
                              <button type="button" className="aw-btn aw-btn-primary" disabled={checking || uploading || applying || job?.state === 'downloading' || !status?.canSelfUpdate} onClick={() => void checkRemote()}>
                                {checking ? t('Checking…') : t('Check for updates')}
                              </button>
                            </div>
                            {remote && !remote.latest && (
                              <div className="aw-alert aw-alert-info" style={{ marginTop: 12 }}><AlertCircle size={16} /><span>{t('No published release was found yet.')}</span></div>
                            )}
                            {remote && remote.latest && !remote.updateAvailable && (
                              <div className="aw-alert aw-alert-success" style={{ marginTop: 12 }}><CheckCircle2 size={16} /><span>{t('This server is up to date (version {{1}}).', { 1: remote.installed })}</span></div>
                            )}
                            {remote && remote.latest && remote.updateAvailable && (
                              <div className="aw-panel" style={{ marginTop: 12 }}>
                                <p style={{ margin: 0 }}><strong>{t('Version')} {remote.latest.version}</strong> is available ({sizeLabel(remote.latest.zipSize)}). You have {remote.installed}.</p>
                                {remote.latest.notes && <p className="aw-muted" style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{remote.latest.notes}</p>}
                                <div className="aw-actions" style={{ marginTop: 12 }}>
                                  <button type="button" className="aw-btn aw-btn-primary" disabled={job?.state === 'downloading'} onClick={() => void downloadRemote()}>{t('Download version {{1}}', { 1: remote.latest.version })}</button>
                                </div>
                              </div>
                            )}
                            {job?.state === 'downloading' && (
                              <p className="aw-muted" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <UploadCloud size={14} /> {t('Downloading')} {job.version}: {sizeLabel(job.received)}{job.total ? ` of ${sizeLabel(job.total)}` : ''}…
                              </p>
                            )}
                            <p className="aw-muted" style={{ margin: '16px 0 8px' }}>{t('Or, if this server has no internet access, choose a release file you were given:')}</p>
                          </>
                        ) : (
                          <p className="aw-muted" style={{ margin: '0 0 12px' }}>
                            {t('Automatic download is not set up on this server (no update token in its settings). Choose the')} <strong>fibe-backend-x.y.z.zip</strong> file you were given.
                            It is checked first; nothing on the server changes yet.
                          </p>
                        )}
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".zip"
                          disabled={uploading || applying || !status?.canSelfUpdate}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
                        />
                        {uploading && (
                          <p className="aw-muted" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UploadCloud size={14} /> {t('Uploading and checking, this can take a few minutes for a large file…')}
                          </p>
                        )}
                      </section>
                    )}

                    {pending && (
                      <section className="aw-card">
                        <div className="aw-card-head"><span className="aw-card-title">2. {t('Check and apply')}</span></div>
                        <div className="aw-facts">
                          <div><span className="aw-muted">{t('New version')}</span> <strong>{pending.manifest.version}</strong></div>
                          <div><span className="aw-muted">{t('File size')}</span> <strong>{sizeLabel(pending.size)}</strong></div>
                          <div><span className="aw-muted">{t('Uploaded by')}</span> <strong>{pending.uploadedBy ?? 'unknown'}</strong></div>
                          <div><span className="aw-muted">{t('Database changes')}</span> <strong>{t('{{1}} files checked on start', { 1: pending.manifest.migrations?.length ?? 0 })}</strong></div>
                        </div>
                        <p className="aw-muted" style={{ margin: '12px 0 4px' }}>
                          Checksum (compare with the <strong>.sha256</strong> file next to the release you downloaded):
                        </p>
                        <code style={{ display: 'block', wordBreak: 'break-all', fontSize: 12 }}>{pending.sha256}</code>
                        <button type="button" className="aw-btn aw-btn-ghost" style={{ marginTop: 8 }} onClick={() => copy(pending.sha256)}>{t('Copy checksum')}</button>

                        <div className="aw-alert aw-alert-warning" style={{ margin: '16px 0 12px' }}>
                          <AlertCircle size={16} />
                          <span>
                            {t('Applying stops the server for a few minutes and signs everyone out. Do it when nobody is working and day-end is not running. If anything goes wrong the previous version is restored automatically.')}
                          </span>
                        </div>

                        <span className="aw-label">{t('Type')} <strong>{CONFIRM_WORD}</strong> {t('to confirm')}</span>
                        <input
                          className="aw-input"
                          value={confirmText}
                          disabled={applying}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder={CONFIRM_WORD}
                          autoComplete="off"
                          style={{ maxWidth: 220 }}
                        />
                        <div className="aw-actions" style={{ marginTop: 12 }}>
                          <button type="button" className="aw-btn aw-btn-primary" disabled={!canApply} onClick={() => void apply()}>
                            {t('Apply update')}
                          </button>
                          <button type="button" className="aw-btn aw-btn-secondary" disabled={applying} onClick={() => void discard()}>
                            <Trash2 size={13} /> {t('Discard')}
                          </button>
                        </div>
                      </section>
                    )}

                </div>
              </details>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemUpdate;
