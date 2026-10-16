import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { apiService } from '../../../../../services/api';

type Policy = 'off' | 'optional' | 'all';

interface Settings {
  policy: Policy;
  maxAttempts: number;
  lockoutMinutes: number;
  forgotAuthenticator: boolean;
  loginCode: boolean;
  rememberDays: number;
  monthlyCheckDays: number;
  // Not edited here, sent back unchanged
  [k: string]: unknown;
}

const POLICY_HELP: Record<Policy, string> = {
  off: 'Switched off. Nobody is asked for a code and nobody can set it up.',
  optional: 'Each person may turn it on for themselves. Anyone who has turned it on, or was marked "Require 2FA", is asked for a code at sign-in.',
  all: 'Mandatory. Everyone must set up 2FA; anyone who has not is asked to scan their QR at their next sign-in.',
};

/** Policy & limits (administrators only). Kept deliberately short. */
const PolicyPanel: React.FC = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), 6000);
  };
  const load = useCallback(async () => {
    try { const r = await apiService.twoFaGetSettings(); setS(r.settings); setSaved(r.settings); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Could not load'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const keys = ['policy', 'maxAttempts', 'lockoutMinutes', 'forgotAuthenticator', 'loginCode', 'rememberDays', 'monthlyCheckDays'] as const;
  const dirty = useMemo(() => !!s && !!saved && keys.some((k) => s[k] !== saved[k]), [s, saved]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends (typeof keys)[number]>(k: K, v: Settings[K]) => setS((p) => (p ? { ...p, [k]: v } : p));
  const num = (v: string) => (v === '' ? NaN : Number(v));

  const save = async () => {
    if (!s) return;
    if (s.policy === 'all' && saved?.policy !== 'all'
      && !window.confirm('Make two-factor authentication mandatory for EVERYONE?\n\nAnyone who has not set it up will be asked to scan their QR at their next sign-in.')) return;
    setBusy(true);
    try {
      const patch = Object.fromEntries(keys.map((k) => [k, s[k]]));
      const r = await apiService.twoFaSaveSettings(patch);
      setS(r.settings); setSaved(r.settings);
      flash('ok', 'Saved. Sign-in changes apply from the next sign-in.');
    } catch (e) { flash('err', e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  };

  if (!s) return <p className="aw-meta">{msg ? msg.text : 'Loading…'}</p>;

  return (
    <section className="aw-card">
      <div className="aw-card-head">
        <span className="aw-card-icon"><ShieldCheck size={14} /></span>
        <h2 className="aw-card-title">Policy &amp; limits</h2>
        <button type="button" className="aw-btn aw-btn-primary" style={{ marginLeft: 'auto' }} disabled={!dirty || busy} onClick={save}>
          {busy ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />} Save
        </button>
      </div>

      {msg && (
        <div className={`aw-alert ${msg.kind === 'ok' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status">
          {msg.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<div>{msg.text}</div>
        </div>
      )}

      <div className="aw-two" style={{ gap: 12 }}>
        <div>
          <label className="aw-label" htmlFor="tf-policy">Two-factor sign-in</label>
          <select id="tf-policy" className="aw-select" value={s.policy} onChange={(e) => set('policy', e.target.value as Policy)}>
            <option value="off">Off</option>
            <option value="optional">Optional</option>
            <option value="all">Required for everyone</option>
          </select>
          <p className="aw-meta" style={{ marginTop: 6 }}>{POLICY_HELP[s.policy]}</p>
        </div>
        <div>
          <label className="aw-label" htmlFor="tf-login">Sign-in code</label>
          <label className="aw-inline" style={{ gap: 8, cursor: 'pointer', alignItems: 'center', height: 'var(--aw-control-h)' }}>
            <input id="tf-login" type="checkbox" checked={s.loginCode !== false} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }}
              onChange={() => set('loginCode', s.loginCode === false)} />
            Ask for the authenticator code when signing in
          </label>
          <p className="aw-meta" style={{ marginTop: 6 }}>
            Untick to sign in with username and password only. Forgot-password codes and approver codes keep working.
          </p>
        </div>
        <div>
          <label className="aw-label" htmlFor="tf-forgot">Forgot password</label>
          <label className="aw-inline" style={{ gap: 8, cursor: 'pointer', alignItems: 'center', height: 'var(--aw-control-h)' }}>
            <input id="tf-forgot" type="checkbox" checked={!!s.forgotAuthenticator} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }}
              onChange={() => set('forgotAuthenticator', !s.forgotAuthenticator)} />
            Allow resetting a password with the authenticator code
          </label>
        </div>
        <div>
          <label className="aw-label" htmlFor="tf-att">Wrong codes before lockout</label>
          <input id="tf-att" className="aw-input" type="number" min={3} max={20} value={Number.isNaN(s.maxAttempts) ? '' : s.maxAttempts} onChange={(e) => set('maxAttempts', num(e.target.value))} />
        </div>
        <div>
          <label className="aw-label" htmlFor="tf-lock">Lockout length (minutes)</label>
          <input id="tf-lock" className="aw-input" type="number" min={1} max={1440} value={Number.isNaN(s.lockoutMinutes) ? '' : s.lockoutMinutes} onChange={(e) => set('lockoutMinutes', num(e.target.value))} />
        </div>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary className="aw-meta" style={{ cursor: 'pointer' }}>Remembered devices (from the Forgot-password work, under review)</summary>
        <div className="aw-two" style={{ gap: 12, marginTop: 8 }}>
          <div>
            <label className="aw-label" htmlFor="tf-remember">Remember this device (days)</label>
            <input id="tf-remember" className="aw-input" type="number" min={0} max={365} value={Number.isNaN(s.rememberDays) ? '' : s.rememberDays} onChange={(e) => set('rememberDays', num(e.target.value))} />
            <p className="aw-meta" style={{ marginTop: 6 }}>0 = a code is asked at every sign-in.</p>
          </div>
          <div>
            <label className="aw-label" htmlFor="tf-monthly">Ask for a code at least every (days)</label>
            <input id="tf-monthly" className="aw-input" type="number" min={0} max={365} value={Number.isNaN(s.monthlyCheckDays) ? '' : s.monthlyCheckDays} onChange={(e) => set('monthlyCheckDays', num(e.target.value))} />
            <p className="aw-meta" style={{ marginTop: 6 }}>Even on a remembered device. 0 = never.</p>
          </div>
        </div>
      </details>
    </section>
  );
};

export default PolicyPanel;
