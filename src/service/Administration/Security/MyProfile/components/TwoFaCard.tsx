import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, ShieldCheck, ShieldOff } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import { EnrolPanel, RecoveryCodesPanel } from '../../../../../auth/components/TwoFaStep';

type View = 'home' | 'password' | 'enrol' | 'codes' | 'disable' | 'regen';

/** "Authenticator app" block for My Profile > Security: turn 2FA on/off, regenerate recovery codes. */
const TwoFaCard: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [view, setView] = useState<View>('home');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try { setStatus(await apiService.twoFaStatus()); } catch { setStatus(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const home = () => { setView('home'); setPassword(''); setCode(''); setSetup(null); setError(''); refresh(); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  };

  if (!status) return null;
  if (!status.available) {
    return (
      <div className="aw-panel"><p className="aw-strong">Authenticator app</p>
        <span className="aw-meta">Two-factor authentication is switched off by your administrator.</span></div>
    );
  }

  const errBox = error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>;

  return (
    <div className="aw-panel aw-fade-in" style={{ textAlign: 'left' }}>
      <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p className="aw-strong">Authenticator app (two-factor)</p>
        {status.enrolled
          ? <span className="aw-pill tone-success"><CheckCircle2 size={12} /> On</span>
          : <span className="aw-pill">Off</span>}
      </div>

      {view === 'home' && (
        <div className="aw-stack" style={{ gap: 8 }}>
          {status.enrolled ? (
            <>
              <span className="aw-meta">Sign-in asks for a 6-digit code from your phone. Recovery codes left: <strong>{status.recoveryCodesRemaining}</strong>
                {status.recoveryCodesRemaining <= 2 && ' (running low: generate new ones)'}.</span>
              <div className="aw-inline" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => setView('regen')}>New recovery codes</button>
                <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" disabled={status.required} onClick={() => setView('disable')}
                  title={status.required ? 'Your administrator requires two-factor authentication' : undefined}><ShieldOff size={12} /> Turn off</button>
              </div>
              {status.required && <span className="aw-meta">Your administrator requires two-factor authentication, so it can't be turned off.</span>}
            </>
          ) : (
            <>
              <span className="aw-meta">
                Add a second step to sign-in using an authenticator app on your phone.
                {status.required && status.graceDaysLeft ? ` Required: please set it up within ${status.graceDaysLeft} day(s).` : ''}
              </span>
              <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setView('password')}><ShieldCheck size={12} /> Set up</button>
            </>
          )}
        </div>
      )}

      {view === 'password' && (
        <form className="aw-stack" style={{ gap: 8 }} onSubmit={(e) => {
          e.preventDefault();
          run(async () => { setSetup(await apiService.twoFaEnrolBegin(password)); setView('enrol'); setPassword(''); });
        }}>
          <span className="aw-meta">Confirm your password to continue.</span>
          <input className="aw-input" type="password" placeholder="Your password" aria-label="Your password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          {errBox}
          <div className="aw-btn-row">
            <button type="button" className="aw-btn aw-btn-secondary" onClick={home}>Cancel</button>
            <button type="submit" className="aw-btn aw-btn-primary" disabled={busy || !password}>{busy && <RotateCcw size={13} className="aw-spin" />} Continue</button>
          </div>
        </form>
      )}

      {view === 'enrol' && setup && (
        <>
          <EnrolPanel setup={setup} busy={busy} error={error}
            onSubmit={(c) => run(async () => { const r = await apiService.twoFaEnrolConfirm(c); setCodes(r.recoveryCodes); setView('codes'); })} />
          <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={home}>Cancel</button>
        </>
      )}

      {view === 'codes' && <RecoveryCodesPanel codes={codes} ackLabel="Done" onAck={home} />}

      {(view === 'disable' || view === 'regen') && (
        <form className="aw-stack" style={{ gap: 8 }} onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (view === 'disable') { await apiService.twoFaDisable(password, code); home(); }
            else { const r = await apiService.twoFaRegenerate(code); setCodes(r.recoveryCodes); setCode(''); setView('codes'); }
          });
        }}>
          <span className="aw-meta">{view === 'disable' ? 'Enter your password and a current code to turn two-factor authentication off.' : 'Enter a current 6-digit code. Your old recovery codes will stop working.'}</span>
          {view === 'disable' && <input className="aw-input" type="password" placeholder="Your password" aria-label="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          <input className="aw-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="6-digit code" aria-label="Authenticator code" value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} autoFocus />
          {errBox}
          <div className="aw-btn-row">
            <button type="button" className="aw-btn aw-btn-secondary" onClick={home}>Cancel</button>
            <button type="submit" className={`aw-btn ${view === 'disable' ? 'aw-btn-danger' : 'aw-btn-primary'}`}
              disabled={busy || code.replace(/\s/g, '').length !== 6 || (view === 'disable' && !password)}>
              {busy && <RotateCcw size={13} className="aw-spin" />} {view === 'disable' ? 'Turn off' : 'Generate'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TwoFaCard;
