import React, { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Progress } from 'antd';
import { useTranslation } from 'react-i18next';

// Mirrors UpdateState in main/updater.ts (the main process owns the rules; this only renders them).
interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  version?: string;
  notes?: string;
  highlights?: string[];
  kind?: 'minor' | 'major' | 'unverified';
  requiresBackend?: string;
  backendVersion?: string;
  dayEndInProgress?: boolean;
  progress?: number;
  installOnQuit?: boolean;
  releaseUrl?: string;
  error?: string;
}

interface UpdaterBridge {
  getState: () => Promise<UpdateState | null>;
  download: () => Promise<{ ok: boolean; error?: string } | null>;
  install: (when: 'now' | 'on-quit') => Promise<{ ok: boolean; error?: string } | null>;
  onState: (callback: (state: UpdateState) => void) => () => void;
}

const getBridge = (): UpdaterBridge | undefined => (window as any).electronAPI?.updater;
const openExternal = (url: string) => (window as any).electronAPI?.openExternal?.(url);

const dismissedKey = (version: string) => `update-dismissed-${version}`;
const isDismissed = (version?: string) => {
  if (!version) return false;
  try { return sessionStorage.getItem(dismissedKey(version)) === '1'; } catch { return false; }
};

const UpdateNotice: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) return;
    let cancelled = false;
    bridge.getState().then((s) => { if (!cancelled && s) setState(s); }).catch(() => { /* optional feature */ });
    // The preload hands the callback (event, state) -> we forward only the state.
    const off = bridge.onState((s) => setState(s));
    return () => { cancelled = true; off?.(); };
  }, []);

  const later = useCallback(() => {
    if (state?.version) {
      try { sessionStorage.setItem(dismissedKey(state.version), '1'); } catch { /* ignore */ }
    }
    setHidden(true);
  }, [state?.version]);

  const run = useCallback(async (action: () => Promise<{ ok: boolean; error?: string } | null> | undefined) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await action();
      if (res && !res.ok) setMessage(res.error ?? 'Something went wrong.');
    } catch (e: any) {
      setMessage(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, []);

  const bridge = getBridge();
  if (!bridge || !state || hidden) return null;
  const visible = state.status === 'available' || state.status === 'downloading' || state.status === 'downloaded';
  if (!visible || (state.status === 'available' && isDismissed(state.version))) return null;

  const installable = state.kind === 'minor';
  const downloading = state.status === 'downloading';
  const downloaded = state.status === 'downloaded';

  return (
    <Modal
      open
      centered
      width={480}
      closable={!downloading}
      maskClosable={false}
      keyboard={!downloading}
      onCancel={later}
      title={t('A new version is available')}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {!downloading && <Button onClick={later}>{t('Later')}</Button>}
          {state.status === 'available' && installable && (
            <Button type="primary" loading={busy} disabled={!!state.dayEndInProgress} onClick={() => run(() => bridge.download())}>
              {t('Update now')}
            </Button>
          )}
          {state.status === 'available' && !installable && state.releaseUrl && (
            <Button onClick={() => openExternal(state.releaseUrl!)}>{t('View release')}</Button>
          )}
          {downloaded && !state.installOnQuit && (
            <Button loading={busy} onClick={() => run(() => bridge.install('on-quit'))}>{t('Install when I close')}</Button>
          )}
          {downloaded && (
            <Button type="primary" loading={busy} onClick={() => run(() => bridge.install('now'))}>{t('Restart and install')}</Button>
          )}
        </div>
      }
    >
      <p style={{ margin: '0 0 8px', fontSize: 15 }}>
        {t('Version {{1}} is ready. You are on version {{2}}. Please update.', { 1: state.version, 2: state.currentVersion })}
      </p>

      {!installable && state.status === 'available' && (
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>
          {state.kind === 'major'
            ? t('This update needs a server update first. Please contact support before installing it.')
            : t('We could not confirm this update is compatible with your server. Please contact support.')}
        </p>
      )}

      {downloading && <Progress percent={state.progress ?? 0} size="small" />}

      {downloaded && (
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>
          {state.installOnQuit ? t('Downloaded. It will install when you close the app.') : t('Downloaded and ready to install.')}
        </p>
      )}

      {state.dayEndInProgress && installable && state.status === 'available' && (
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>{t('Day-end is running. You can update once it finishes.')}</p>
      )}

      {message && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#b42330' }}>{message}</p>}
    </Modal>
  );
};

export default UpdateNotice;
