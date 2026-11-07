import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, RefreshCw, UploadCloud, CheckCircle2, AlertCircle, ServerCog, Trash2 } from 'lucide-react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useTranslation } from 'react-i18next';

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

  const pending = status?.pending ?? null;
  const last = status?.lastUpdate ?? null;
  const canApply = !!status?.canSelfUpdate && !!pending && confirmText.trim().toUpperCase() === CONFIRM_WORD && !applying;

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('System Update')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ServerCog size={12} /> {t('Update the server software from a release file. A database backup is taken first.')}
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={() => void load()} disabled={loading || applying} className="aw-icon-btn" aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
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
          <div className="aw-stack" style={{ maxWidth: 820, margin: '0 auto' }}>
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

            <section className="aw-card">
              <div className="aw-card-head"><span className="aw-card-title">{t('This server')}</span></div>
              <div className="aw-facts">
                <div><span className="aw-muted">{t('Installed version')}</span> <strong>{status?.currentVersion ?? '…'}</strong></div>
                <div><span className="aw-muted">{t('Node')}</span> <strong>{status?.nodeVersion ?? '…'}</strong></div>
                <div><span className="aw-muted">{t('Backup tool (pg_dump)')}</span> <strong>{status ? (status.pgDumpFound ? t('Found') : t('Not found')) : '…'}</strong></div>
              </div>
              {status && !status.canSelfUpdate && (
                <div className="aw-alert aw-alert-warning" style={{ marginTop: 12 }}>
                  <AlertCircle size={16} /><span>{t('Updates cannot be applied from here: {{1}}', { 1: status.reason })}</span>
                </div>
              )}
              {status && status.canSelfUpdate && !status.pgDumpFound && (
                <div className="aw-alert aw-alert-warning" style={{ marginTop: 12 }}>
                  <AlertCircle size={16} /><span>{t('The database backup tool was not found. The update will stop before changing anything. Set PG_DUMP_PATH in the server settings.')}</span>
                </div>
              )}
            </section>

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
                      <p className="aw-muted" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  <p className="aw-muted" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                <button type="button" className="aw-btn aw-btn-ghost" style={{ marginTop: 6 }} onClick={() => copy(pending.sha256)}>{t('Copy checksum')}</button>

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
        )}
      </div>
    </div>
  );
};

export default SystemUpdate;
