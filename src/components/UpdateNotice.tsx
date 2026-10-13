import React, { useCallback, useEffect, useState } from 'react';
import { Button, Progress, theme } from 'antd';

// Mirrors UpdateState in main/updater.ts (the main process owns the rules; this only renders them).
interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  version?: string;
  notes?: string;
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
  const { token } = theme.useToken();
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

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 1000,
        width: 340,
        padding: 16,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgElevated,
        color: token.colorText,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {installable ? `Update ${state.version} available` : `Major update ${state.version} available`}
      </div>
      <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 8 }}>
        You are on version {state.currentVersion}.
      </div>

      {state.notes && state.status === 'available' && (
        <div style={{ fontSize: 12, maxHeight: 96, overflowY: 'auto', whiteSpace: 'pre-wrap', marginBottom: 8 }}>
          {state.notes}
        </div>
      )}

      {!installable && state.status === 'available' && (
        <div style={{ fontSize: 12, marginBottom: 12 }}>
          {state.kind === 'major'
            ? 'This update needs a server update first. Please contact support before installing it.'
            : 'We could not confirm this update is compatible with your server. Please contact support.'}
        </div>
      )}

      {state.status === 'downloading' && <Progress percent={state.progress ?? 0} size="small" />}

      {state.status === 'downloaded' && (
        <div style={{ fontSize: 12, marginBottom: 12 }}>
          {state.installOnQuit
            ? 'Downloaded. It will install when you close the app.'
            : 'Downloaded and ready to install.'}
        </div>
      )}

      {state.dayEndInProgress && installable && state.status === 'available' && (
        <div style={{ fontSize: 12, color: token.colorWarning, marginBottom: 12 }}>
          Day-end is running. You can update once it finishes.
        </div>
      )}

      {message && <div style={{ fontSize: 12, color: token.colorError, marginBottom: 8 }}>{message}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {state.status === 'available' && installable && (
          <Button
            type="primary"
            size="small"
            loading={busy}
            disabled={!!state.dayEndInProgress}
            onClick={() => run(() => bridge.download())}
          >
            Download update
          </Button>
        )}
        {state.status === 'available' && !installable && state.releaseUrl && (
          <Button size="small" onClick={() => openExternal(state.releaseUrl!)}>View release</Button>
        )}
        {state.status === 'downloaded' && (
          <>
            {!state.installOnQuit && (
              <Button size="small" loading={busy} onClick={() => run(() => bridge.install('on-quit'))}>
                Install when I close
              </Button>
            )}
            <Button type="primary" size="small" loading={busy} onClick={() => run(() => bridge.install('now'))}>
              Restart &amp; install
            </Button>
          </>
        )}
        {state.status !== 'downloading' && (
          <Button size="small" type="text" onClick={later}>Later</Button>
        )}
      </div>
    </div>
  );
};

export default UpdateNotice;
