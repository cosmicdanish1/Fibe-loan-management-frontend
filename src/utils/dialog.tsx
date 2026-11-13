import React from 'react';
import { Modal, message } from 'antd';
import i18n from '../i18n';
import { friendlyError, ApiFailure, FriendlyError } from './friendlyError';

/**
 * One place for message dialogs (ES-467). It replaces the 54 local copies of `showDialog`:
 *  - inside the Electron app it still uses the native message box (same look as before);
 *  - everywhere else (browser, dev server, tests) it shows an antd dialog, so a message is never silently dropped.
 */
type Kind = 'info' | 'warning' | 'error';
const t = (s: string) => (i18n.isInitialized ? (i18n.t(s, { defaultValue: s }) as string) : s);

function antdDialog(kind: Kind, title: string, body: React.ReactNode): Promise<void> {
  return new Promise<void>((resolve) => {
    const open = kind === 'error' ? Modal.error : kind === 'warning' ? Modal.warning : Modal.info;
    open({ title, content: body, okText: t('OK'), onOk: () => resolve(), afterClose: () => resolve(), centered: true });
  });
}

const lines = (text: string) => (
  <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
);

/** Old style used by 25 screens: (type, message, detail). Native box title is the app name. */
export async function showDialog3(type: Kind, message: string, detail = ''): Promise<void> {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title: 'electron-react-ts', message, detail, buttons: ['OK'], defaultId: 0 });
    return;
  }
  await antdDialog(type, message, detail ? lines(detail) : undefined);
}

/** Old style used by 29 screens: (type, title, message, detail). */
export async function showDialog4(type: Kind, title: string, message: string, detail = ''): Promise<void> {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message, detail, buttons: ['OK'], defaultId: 0 });
    return;
  }
  await antdDialog(type, title, <>{lines(message)}{detail ? lines(detail) : null}</>);
}

function ErrorBody({ fe }: { fe: FriendlyError }) {
  return (
    <div>
      {fe.lines.map((l, i) => (<div key={i} style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>{l}</div>))}
      {fe.reference && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#8a94a0' }}>
          {t('Reference')}: <span style={{ fontFamily: 'monospace' }}>{fe.reference}</span>{' '}
          <a onClick={() => { try { navigator.clipboard?.writeText(fe.reference as string); } catch { /* clipboard may be blocked */ } }} style={{ marginLeft: 6, cursor: 'pointer' }}>{t('Copy')}</a>
        </div>
      )}
    </div>
  );
}

/**
 * Show a failed API call to the user: what failed and what to do, in plain words, with the technical reference id in small
 * grey text so support can find the log line. `action` finishes "Could not ...", e.g. notifyError(res, 'save the loan').
 */
export function notifyError(res: ApiFailure | null | undefined, action?: string): Promise<void> {
  const fe = friendlyError(res, action ? t(action) : undefined, (k, o) => i18n.t(k, o as any) as string);
  return antdDialog('error', fe.headline, <ErrorBody fe={fe} />);
}

/** True when an API call came back as a failure (apiService.request never throws; it returns success:false). */
export function isFailure(res: unknown): boolean {
  return !!res && typeof res === 'object' && (res as { success?: unknown }).success === false;
}

/**
 * A small non-blocking message for a failure the user did not click for directly (a list or default value that
 * loads when a window opens): "Could not load the head list: <plain reason>". Several of these in a row show once
 * per action name, so a window that loads five lists does not stack five toasts.
 */
const recentToasts = new Map<string, number>();
export function toastError(res: ApiFailure | null | undefined, action: string): void {
  const now = Date.now();
  if ((recentToasts.get(action) ?? 0) > now - 4000) return;
  recentToasts.set(action, now);
  const fe = friendlyError(res, t(action), (k, o) => i18n.t(k, o as any) as string);
  message.error({ content: `${fe.headline}. ${fe.lines[0] ?? ''}`.trim(), duration: 6 });
}
