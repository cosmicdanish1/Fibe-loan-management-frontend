import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, RotateCcw, Save, ShieldCheck, Unlock, UserX } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import ApprovalGuardsCard from '../components/ApprovalGuardsCard';

type Policy = 'off' | 'optional' | 'roles' | 'all';

interface Settings {
  policy: Policy;
  requiredLevelIds: number[];
  graceDays: number;
  rememberDays: number;
  recoveryCount: number;
  maxAttempts: number;
  lockoutMinutes: number;
  issuer: string;
}
interface Level { id: number; name: string }
interface UserRow { userid: number; username: string; level: string; levelId: number; enabled: boolean; enrolled: boolean; locked: boolean; required: boolean; enrolledAt?: string }

const POLICY_HELP: Record<Policy, string> = {
  off: 'Switched off. Nobody is asked for a code and no one can enrol.',
  optional: 'Users may turn it on themselves from My Profile. Enrolled users are always asked for a code.',
  roles: 'Mandatory for the selected user levels. Everyone else may opt in.',
  all: 'Mandatory for every user.',
};

const TwoFactorSettings: React.FC = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [filter, setFilter] = useState('');

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), 5000);
  };

  const load = useCallback(async () => {
    try {
      const [cfg, list] = await Promise.all([apiService.twoFaGetSettings(), apiService.twoFaAdminUsers()]);
      setS(cfg.settings); setSaved(cfg.settings); setLevels(cfg.levels); setUsers(list);
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Could not load settings (administrators only)');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => !!s && !!saved && JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => (p ? { ...p, [k]: v } : p));
  const num = (v: string) => (v === '' ? NaN : Number(v));

  const save = async () => {
    if (!s) return;
    if (s.policy === 'roles' && s.requiredLevelIds.length === 0) {
      flash('err', 'Pick at least one user level, or choose a different policy.');
      return;
    }
    setBusy(true);
    try {
      const r = await apiService.twoFaSaveSettings(s);
      setS(r.settings); setSaved(r.settings);
      flash('ok', 'Settings saved. Sign-in changes apply from the next sign-in.');
      setUsers(await apiService.twoFaAdminUsers());
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Save failed');
    } finally { setBusy(false); }
  };

  const reset = async (u: UserRow) => {
    if (!window.confirm(`Reset two-factor authentication for ${u.username}?\n\nTheir authenticator and recovery codes will be removed and they must set it up again.`)) return;
    try { await apiService.twoFaAdminReset(u.userid); flash('ok', `2FA reset for ${u.username}`); setUsers(await apiService.twoFaAdminUsers()); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Reset failed'); }
  };
  const unlock = async (u: UserRow) => {
    try { await apiService.twoFaAdminUnlock(u.userid); flash('ok', `${u.username} unlocked`); setUsers(await apiService.twoFaAdminUsers()); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Unlock failed'); }
  };

  const shown = users.filter((u) => !filter || u.username.toLowerCase().includes(filter.toLowerCase()));
  const enrolledCount = users.filter((u) => u.enrolled).length;

  if (!s) {
    return (
      <div className="app-window">
        <div className="aw-header aw-ambient"><div className="min-w-0"><h1 className="aw-title">Two-Factor Authentication</h1><p className="aw-desc">Loading…</p></div></div>
        <div className="aw-content">{msg && <div className="aw-alert aw-alert-danger"><AlertCircle size={16} /><div>{msg.text}</div></div>}</div>
      </div>
    );
  }

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Two-Factor Authentication</h1>
          <p className="aw-desc">Authenticator-app codes for sign-in. Policy, limits and per-user status.</p>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><ShieldCheck size={12} /> {enrolledCount} of {users.length} enrolled</span>
          <button type="button" className="aw-btn aw-btn-primary" disabled={!dirty || busy} onClick={save}>
            {busy ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />} Save settings
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack" style={{ maxWidth: 1100 }}>
          {msg && (
            <div className={`aw-alert ${msg.kind === 'ok' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status">
              {msg.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<div>{msg.text}</div>
            </div>
          )}

          <section className="aw-card">
            <div className="aw-card-head"><span className="aw-card-icon"><ShieldCheck size={14} /></span><h2 className="aw-card-title">Policy</h2></div>
            <div className="aw-two" style={{ gap: 12 }}>
              <div>
                <label className="aw-label" htmlFor="tf-policy">Two-factor policy</label>
                <select id="tf-policy" className="aw-select" value={s.policy} onChange={(e) => set('policy', e.target.value as Policy)}>
                  <option value="off">Off</option>
                  <option value="optional">Optional</option>
                  <option value="roles">Required for selected user levels</option>
                  <option value="all">Required for everyone</option>
                </select>
                <p className="aw-meta" style={{ marginTop: 6 }}>{POLICY_HELP[s.policy]}</p>
              </div>
              <div>
                <label className="aw-label" htmlFor="tf-grace">Grace period (days)</label>
                <input id="tf-grace" className="aw-input" type="number" min={0} max={365} value={Number.isNaN(s.graceDays) ? '' : s.graceDays}
                  onChange={(e) => set('graceDays', num(e.target.value))} disabled={s.policy === 'off' || s.policy === 'optional'} />
                <p className="aw-meta" style={{ marginTop: 6 }}>Users who must enrol can still sign in without it for this long after the policy turns on. 0 = they must enrol at their next sign-in.</p>
              </div>
            </div>
            {s.policy === 'roles' && (
              <div style={{ marginTop: 10 }}>
                <span className="aw-label">Required for these user levels</span>
                <div className="aw-inline" style={{ flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
                  {levels.map((l) => (
                    <label key={l.id} className="aw-inline" style={{ gap: 6, cursor: 'pointer', alignItems: 'center' }}>
                      <input type="checkbox" checked={s.requiredLevelIds.includes(l.id)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }}
                        onChange={() => set('requiredLevelIds', s.requiredLevelIds.includes(l.id) ? s.requiredLevelIds.filter((x) => x !== l.id) : [...s.requiredLevelIds, l.id])} />
                      {l.name || `Level ${l.id}`}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="aw-card">
            <div className="aw-card-head"><span className="aw-card-icon"><KeyRound size={14} /></span><h2 className="aw-card-title">Codes &amp; limits</h2></div>
            <div className="aw-two" style={{ gap: 12 }}>
              <div>
                <label className="aw-label" htmlFor="tf-issuer">Issuer name</label>
                <input id="tf-issuer" className="aw-input" maxLength={40} value={s.issuer} onChange={(e) => set('issuer', e.target.value)} />
                <p className="aw-meta" style={{ marginTop: 6 }}>Shown in the authenticator app. Applies to new set-ups only.</p>
              </div>
              <div>
                <label className="aw-label" htmlFor="tf-remember">Remember this device (days)</label>
                <input id="tf-remember" className="aw-input" type="number" min={0} max={365} value={Number.isNaN(s.rememberDays) ? '' : s.rememberDays}
                  onChange={(e) => set('rememberDays', num(e.target.value))} />
                <p className="aw-meta" style={{ marginTop: 6 }}>0 = off: a code is asked at every sign-in.</p>
              </div>
              <div>
                <label className="aw-label" htmlFor="tf-rec">Recovery codes per user</label>
                <input id="tf-rec" className="aw-input" type="number" min={4} max={20} value={Number.isNaN(s.recoveryCount) ? '' : s.recoveryCount}
                  onChange={(e) => set('recoveryCount', num(e.target.value))} />
              </div>
              <div>
                <label className="aw-label" htmlFor="tf-att">Max wrong codes before lockout</label>
                <input id="tf-att" className="aw-input" type="number" min={3} max={20} value={Number.isNaN(s.maxAttempts) ? '' : s.maxAttempts}
                  onChange={(e) => set('maxAttempts', num(e.target.value))} />
              </div>
              <div>
                <label className="aw-label" htmlFor="tf-lock">Lockout length (minutes)</label>
                <input id="tf-lock" className="aw-input" type="number" min={1} max={1440} value={Number.isNaN(s.lockoutMinutes) ? '' : s.lockoutMinutes}
                  onChange={(e) => set('lockoutMinutes', num(e.target.value))} />
              </div>
            </div>
          </section>

          <ApprovalGuardsCard />

          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><UserX size={14} /></span><h2 className="aw-card-title">Users</h2>
              <input className="aw-input" style={{ marginLeft: 'auto', maxWidth: 220 }} placeholder="Filter by name" aria-label="Filter users" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <div className="aw-table-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
              <table className="aw-table">
                <thead><tr><th>User</th><th>Level</th><th>Required</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {shown.map((u) => (
                    <tr key={u.userid} style={u.enabled ? undefined : { opacity: 0.55 }}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.level || '-'}</td>
                      <td>{u.required ? 'Yes' : '-'}</td>
                      <td>
                        {u.locked ? <span className="aw-pill tone-danger">Locked</span>
                          : u.enrolled ? <span className="aw-pill tone-success">Enrolled</span>
                          : <span className="aw-pill">Not set up</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="aw-inline" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          {u.locked && <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => unlock(u)}><Unlock size={12} /> Unlock</button>}
                          {u.enrolled && <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" onClick={() => reset(u)}><RotateCcw size={12} /> Reset 2FA</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan={5} className="aw-meta" style={{ textAlign: 'center' }}>No users</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="aw-meta">Reset removes a user's authenticator and recovery codes (use it when someone loses their phone and their codes). They set it up again at their next sign-in. Resets are logged.</p>
          </section>
        </div>
      </div>

      <div className="aw-footer"><span>Two-Factor Authentication</span><span>{dirty ? 'Unsaved changes' : 'Saved'}</span></div>
    </div>
  );
};

export default TwoFactorSettings;
