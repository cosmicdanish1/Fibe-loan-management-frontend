import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, RotateCcw, ShieldOff, UserMinus, UserPlus } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import AwDialog from '@/components/shared/kit/AwDialog';

interface GuardAction { key: string; label: string; hint: string }
interface ApproverRow { userid: number; username: string; level: string; enabled: boolean; enrolled: boolean; approver: boolean; active: boolean }

type Dlg = null | { key: string; label: string };

/**
 * Approver codes for sensitive actions (ES-116 / ES-124).
 *
 * An administrator picks existing users as approvers (same right as in the Access Privilege Matrix).
 * Each approver has their own authenticator (My Profile). Whoever performs a protected action asks an
 * approver for their current code. Switching a protection OFF needs the logged-in admin's password
 * plus an approver's code.
 */
const ApprovalGuardsCard: React.FC = () => {
  const [actions, setActions] = useState<GuardAction[]>([]);
  const [guards, setGuards] = useState<Record<string, { enabled: boolean }>>({});
  const [approvers, setApprovers] = useState<ApproverRow[]>([]);
  const [ownApproval, setOwnApproval] = useState(false);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pick, setPick] = useState('');

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), 6000);
  };

  const load = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([apiService.twoFaGetGuards(), apiService.twoFaGetSettings()]);
      setActions(g.actions); setGuards(g.guards); setApprovers(g.approvers);
      setOwnApproval(!!s.settings.approverCanApproveOwn);
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Could not load approver settings');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const close = () => { setDlg(null); setPw(''); setCode(''); setErr(''); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const current = useMemo(() => approvers.filter((a) => a.approver), [approvers]);
  const candidates = useMemo(() => approvers.filter((a) => !a.approver && a.enabled), [approvers]);
  const activeCount = current.filter((a) => a.active).length;

  const changeApprover = async (id: number, add: boolean, name: string) => {
    try {
      const r = await apiService.twoFaSetApprovers(add ? [id] : [], add ? [] : [id]);
      setApprovers(r.approvers);
      flash('ok', add ? `${name} is now an approver. They must set up their authenticator in My Profile before their code counts.` : `${name} is no longer an approver. Their code stops working immediately.`);
      setPick('');
    } catch (e) { flash('err', e instanceof Error ? e.message : 'Could not change approver'); }
  };

  const toggle = async (a: GuardAction) => {
    const on = !!guards[a.key]?.enabled;
    if (on) { setDlg({ key: a.key, label: a.label }); return; } // OFF needs password + an approver's code
    try {
      const r = await apiService.twoFaSaveGuards({ [a.key]: { enabled: true } });
      setGuards(r.guards); if (r.approvers) setApprovers(r.approvers);
      flash('ok', `${a.label}: an approver's code is now required. Applies immediately.`);
    } catch (e) { flash('err', e instanceof Error ? e.message : 'Could not switch on'); }
  };

  const saveOwn = async (v: boolean) => {
    try { await apiService.twoFaSaveSettings({ approverCanApproveOwn: v }); setOwnApproval(v); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Could not save'); }
  };

  return (
    <section className="aw-card">
      <div className="aw-card-head">
        <span className="aw-card-icon"><KeyRound size={14} /></span>
        <h2 className="aw-card-title">Approvers &amp; approval codes</h2>
      </div>
      <p className="aw-meta">
        Choose existing users as <strong>approvers</strong> (you can also do this with the <em>Approver (OTP)</em> right in the Access Privilege Matrix).
        Each approver uses <strong>their own</strong> authenticator, set up in My Profile. To perform a protected action, the person doing the work asks an approver for the current
        6-digit code and types it in; each code works once and the audit log names the approver. Switch <strong>OFF</strong> and the window works exactly as before.
      </p>

      {msg && (
        <div className={`aw-alert ${msg.kind === 'ok' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status">
          {msg.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<div>{msg.text}</div>
        </div>
      )}

      <div className="aw-panel" style={{ textAlign: 'left' }}>
        <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <p className="aw-strong">Approvers ({activeCount} active)</p>
            <span className="aw-meta">An approver counts once they hold the right <em>and</em> have set up their authenticator.</span>
          </div>
          <div className="aw-inline" style={{ gap: 6, alignItems: 'center' }}>
            <select className="aw-select" aria-label="Add approver" value={pick} onChange={(e) => setPick(e.target.value)} style={{ minWidth: 190 }}>
              <option value="">Add an approver…</option>
              {candidates.map((u) => <option key={u.userid} value={u.userid}>{u.username}{u.level ? ` (${u.level})` : ''}</option>)}
            </select>
            <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" disabled={!pick}
              onClick={() => { const u = candidates.find((c) => String(c.userid) === pick); if (u) changeApprover(u.userid, true, u.username); }}>
              <UserPlus size={12} /> Add
            </button>
          </div>
        </div>
        {current.length === 0 ? (
          <p className="aw-meta" style={{ marginTop: 8 }}>No approver yet. Add at least one, then switch the protections on.</p>
        ) : (
          <div className="aw-rows" style={{ marginTop: 8 }}>
            {current.map((a) => (
              <div key={a.userid} className="aw-row aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <strong>{a.username}</strong> <span className="aw-meta">{a.level}</span>
                </div>
                <div className="aw-inline" style={{ gap: 8, alignItems: 'center' }}>
                  {!a.enabled ? <span className="aw-pill tone-danger">Account disabled</span>
                    : a.enrolled ? <span className="aw-pill tone-success">Active</span>
                    : <span className="aw-pill">Needs authenticator (My Profile)</span>}
                  <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => changeApprover(a.userid, false, a.username)}>
                    <UserMinus size={12} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="aw-inline" style={{ gap: 8, cursor: 'pointer', alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" checked={ownApproval} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} onChange={() => saveOwn(!ownApproval)} />
          An approver may approve an action they are performing themselves
        </label>
      </div>

      <div className="aw-stack" style={{ gap: 10 }}>
        {actions.map((a) => {
          const on = !!guards[a.key]?.enabled;
          return (
            <div key={a.key} className="aw-panel" style={{ textAlign: 'left' }}>
              <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <p className="aw-strong">{a.label}</p>
                  <span className="aw-meta">{a.hint}</span>
                </div>
                <label className="aw-inline" style={{ gap: 8, cursor: activeCount > 0 || on ? 'pointer' : 'not-allowed', alignItems: 'center', fontWeight: 600 }}>
                  <input type="checkbox" role="switch" aria-label={'Require approver code for ' + a.label} checked={on}
                    disabled={activeCount === 0 && !on}
                    style={{ width: 18, height: 18, accentColor: 'var(--aw-accent)' }} onChange={() => toggle(a)} />
                  {on ? 'Code required' : 'Off'}
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Switching a protection OFF: password + an approver's code */}
      <AwDialog open={!!dlg} title="Switch protection off" onClose={close} icon={<ShieldOff size={14} />} maxWidth="26rem" compact>
        {dlg && (
          <form className="aw-stack" style={{ gap: 8 }} onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await apiService.twoFaSaveGuards({ [dlg.key]: { enabled: false } }, { password: pw, code });
              setGuards(r.guards); if (r.approvers) setApprovers(r.approvers);
              flash('ok', `${dlg.label}: no approver code needed any more.`);
              close();
            });
          }}>
            <span className="aw-meta">Switching <strong>{dlg.label}</strong> off removes the approval step. Enter <strong>your password</strong> and a <strong>current code from an approver</strong> (not your own).</span>
            <input className="aw-input" type="password" placeholder="Your password" aria-label="Your password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
            <input className="aw-input" inputMode="numeric" placeholder="6-digit approver code (or approver recovery code)" aria-label="Approver code" value={code} onChange={(e) => setCode(e.target.value)} />
            {err && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{err}</div></div>}
            <div className="aw-btn-row">
              <button type="button" className="aw-btn aw-btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="aw-btn aw-btn-danger" disabled={busy || !pw}>{busy && <RotateCcw size={13} className="aw-spin" />} Switch off</button>
            </div>
          </form>
        )}
      </AwDialog>
    </section>
  );
};

export default ApprovalGuardsCard;
