import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, LogOut, RotateCcw, Unlock, UserCheck, UserX } from 'lucide-react';
import PasswordInput from '../../../../../components/shared/PasswordInput';
import { apiService } from '../../../../../services/api';
import AwDialog from '@/components/shared/kit/AwDialog';

interface UserRow { userid: number; username: string; level: string; enabled: boolean; enrolled: boolean; locked: boolean; required: boolean; requiredFlag: boolean }

/**
 * Users tab (administrators and holders of the "Manage Two-Factor" right).
 * "Require 2FA" does not create a code for anyone: the person scans their OWN QR at their next sign-in,
 * so the person helping never sees their secret.
 */
const UsersPanel: React.FC<{ isAdmin: boolean; onOpenPolicy?: (() => void) | undefined }> = ({ isAdmin, onOpenPolicy }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState('');
  // The person an administrator is about to mark as "must set up 2FA" (asks when it should apply).
  const [ask, setAsk] = useState<UserRow | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  // Password reset by an administrator, for a person who is not an administrator.
  const [pwFor, setPwFor] = useState<UserRow | null>(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const isAdminLevel = (level: string) => ['ADMINISTRATOR', 'SYSTEM'].includes(String(level || '').toUpperCase());
  const closePw = () => { setPwFor(null); setPw1(''); setPw2(''); setPwErr(''); };
  const savePw = async () => {
    if (!pwFor) return;
    if (pw1.length < 6) { setPwErr('The password must be at least 6 characters.'); return; }
    if (pw1 !== pw2) { setPwErr('The two passwords do not match.'); return; }
    setPwBusy(true); setPwErr('');
    try {
      const r: any = await apiService.adminChangePassword(pwFor.userid, { newPassword: pw1 });
      if (r && r.success === false) throw new Error(r.message || r.error || 'Could not reset the password');
      flash('ok', `Password reset for ${pwFor.username}. Tell them the new password; they can change it after signing in.`);
      closePw();
    } catch (e) { setPwErr(e instanceof Error ? e.message : 'Could not reset the password'); }
    finally { setPwBusy(false); }
  };

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), 6000);
  };
  const load = useCallback(async () => {
    try { setUsers(await apiService.twoFaAdminUsers()); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Could not load users'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<void>, okText: string) => {
    try { await fn(); flash('ok', okText); await load(); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Failed'); }
  };

  const shown = users.filter((u) => !filter || u.username.toLowerCase().includes(filter.toLowerCase()));
  const enrolled = users.filter((u) => u.enrolled).length;
  // When the policy is "Required for everyone" every row is required by the policy and the per-person boxes are locked.
  const policyForcesAll = users.some((u) => u.required && !u.requiredFlag);

  return (
    <section className="aw-card">
      <div className="aw-card-head">
        <span className="aw-card-icon"><UserX size={14} /></span>
        <h2 className="aw-card-title">Users ({enrolled} of {users.length} have set up 2FA)</h2>
        <input className="aw-input" style={{ marginLeft: 'auto', maxWidth: 220 }} placeholder="Filter by name" aria-label="Filter users" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <p className="aw-meta">
        <strong>Require 2FA</strong> makes a person set up their own authenticator at their next sign-in (they scan their own QR; you never see it).
        <strong> Reset</strong> removes a person's authenticator and recovery codes when they lose their phone and their codes.
        {!isAdmin && ' Administrator accounts can only be managed by an administrator.'}
      </p>

      {policyForcesAll && (
        <div className="aw-alert aw-alert-warning" role="status">
          <AlertCircle size={16} />
          <div>
            The policy is <strong>Required for everyone</strong>, so everyone is already required to set up 2FA and the boxes below are locked.
            To choose individual people, change the policy to <strong>Optional</strong>{isAdmin && onOpenPolicy ? <> in <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={onOpenPolicy}>Policy &amp; limits</button></> : ' (ask an administrator)'}.
          </div>
        </div>
      )}

      {msg && (
        <div className={`aw-alert ${msg.kind === 'ok' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status">
          {msg.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<div>{msg.text}</div>
        </div>
      )}

      <div className="aw-table-wrap" style={{ maxHeight: 460, overflow: 'auto' }}>
        <table className="aw-table">
          <thead><tr><th>User</th><th>Level</th><th>Status</th><th>Require 2FA</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.userid} style={u.enabled ? undefined : { opacity: 0.55 }}>
                <td><strong>{u.username}</strong></td>
                <td>{u.level || '-'}</td>
                <td>
                  {u.locked ? <span className="aw-pill tone-danger">Locked</span>
                    : u.enrolled ? <span className="aw-pill tone-success">Set up</span>
                    : u.required ? <span className="aw-pill tone-danger">Must set up</span>
                    : <span className="aw-pill">Not set up</span>}
                </td>
                <td>
                  <label className="aw-inline" style={{ gap: 6, cursor: 'pointer', alignItems: 'center' }}>
                    <input type="checkbox" role="switch" aria-label={'Require 2FA for ' + u.username} title={u.required && !u.requiredFlag ? 'Locked: the policy requires 2FA for everyone' : undefined} checked={u.required}
                      disabled={u.required && !u.requiredFlag /* required for everyone by policy */}
                      style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }}
                      onChange={() => {
                        if (u.requiredFlag) { void act(() => apiService.twoFaSetRequired(u.userid, false), `${u.username} is no longer required to use 2FA`); return; }
                        // Someone who has not set up 2FA yet: ask WHEN it should apply (sign out now / next sign-in / do nothing).
                        if (!u.enrolled) { setAsk(u); return; }
                        void act(() => apiService.twoFaSetRequired(u.userid, true), `${u.username} is now required to use 2FA`);
                      }} />
                    {u.required ? (u.requiredFlag ? 'Required' : 'Required (policy)') : 'No'}
                  </label>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="aw-inline" style={{ justifyContent: 'flex-end', gap: 6 }}>
                    {isAdmin && !isAdminLevel(u.level) && (
                      <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => setPwFor(u)}>
                        <KeyRound size={12} /> Reset password
                      </button>
                    )}
                    {u.locked && (
                      <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => act(() => apiService.twoFaAdminUnlock(u.userid), `${u.username} unlocked`)}>
                        <Unlock size={12} /> Unlock
                      </button>
                    )}
                    {u.enrolled && (
                      <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" onClick={() => {
                        if (window.confirm(`Reset two-factor authentication for ${u.username}?\n\nTheir authenticator and recovery codes will be removed and they must set it up again.\n\nBefore you continue, make sure you are really speaking to ${u.username} (call them back or see them in person). Anyone who can read out a name could otherwise ask for a reset.`)) {
                          void act(() => apiService.twoFaAdminReset(u.userid), `2FA reset for ${u.username}. They can now sign in with their password and set up again. If they also forgot their password, set a temporary one in Create / Modify Users.`);
                        }
                      }}>
                        <RotateCcw size={12} /> Reset
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="aw-meta" style={{ textAlign: 'center' }}>No users</td></tr>}
          </tbody>
        </table>
      </div>

      <AwDialog open={!!pwFor} title="Reset password" onClose={closePw} icon={<KeyRound size={14} />} maxWidth="26rem" compact>
        {pwFor && (
          <form className="aw-stack" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); void savePw(); }}>
            <span className="aw-meta">Set a new password for <strong>{pwFor.username}</strong>. Only administrators can do this, and only for people who are not administrators.</span>
            <label className="aw-label" htmlFor="pwr-1">New password</label>
            <PasswordInput id="pwr-1" className="aw-input" autoFocus value={pw1} onChange={(e) => setPw1(e.target.value)} />
            <label className="aw-label" htmlFor="pwr-2">Type it again</label>
            <PasswordInput id="pwr-2" className="aw-input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {pwErr && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{pwErr}</div></div>}
            <div className="aw-btn-row">
              <button type="button" className="aw-btn aw-btn-secondary" onClick={closePw}>Cancel</button>
              <button type="submit" className="aw-btn aw-btn-primary" disabled={pwBusy || !pw1}>{pwBusy && <RotateCcw size={13} className="aw-spin" />} Reset password</button>
            </div>
          </form>
        )}
      </AwDialog>

      {/* Three choices: sign out now, at their next sign-in, or do nothing */}
      <AwDialog open={!!ask} title="Require 2FA" onClose={() => setAsk(null)} icon={<UserCheck size={14} />} maxWidth="28rem" compact>
        {ask && (
          <div className="aw-stack" style={{ gap: 10 }}>
            <p className="aw-meta"><strong>{ask.username}</strong> will have to set up 2FA. When should it start?</p>
            <button type="button" className="aw-btn aw-btn-danger" style={{ justifyContent: 'flex-start' }}
              onClick={() => { const u = ask; setAsk(null); void act(() => apiService.twoFaSetRequired(u.userid, true, true), `${u.username} was signed out and must set up 2FA when signing in again`); }}>
              <LogOut size={14} /> Sign them out now
            </button>
            <span className="aw-meta" style={{ marginTop: -6 }}>Their current session ends right away. They must set up 2FA as soon as they sign in again.</span>
            <button type="button" className="aw-btn aw-btn-primary" style={{ justifyContent: 'flex-start' }}
              onClick={() => { const u = ask; setAsk(null); void act(() => apiService.twoFaSetRequired(u.userid, true, false), `${u.username} must set up 2FA at their next sign-in`); }}>
              <UserCheck size={14} /> At their next sign-in
            </button>
            <span className="aw-meta" style={{ marginTop: -6 }}>They keep working now and must set up 2FA the next time they sign in.</span>
            <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setAsk(null)}>Cancel (do nothing)</button>
          </div>
        )}
      </AwDialog>
    </section>
  );
};

export default UsersPanel;
