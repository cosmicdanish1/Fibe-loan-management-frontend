import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, KeyRound, Mail, RotateCcw, ShieldCheck, Smartphone, User } from 'lucide-react';
import { apiService } from '../../services/api';
import PasswordInput from '../../components/shared/PasswordInput';

interface Props {
  initialUsername?: string;
  onBack: () => void;
}

type Methods = { authenticator: boolean; email: { available: boolean; comingSoon: boolean }; contactAdmin: boolean };
type Stage = 'choose' | 'code' | 'password' | 'done';

const RULE = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/** "Forgot password?" on the sign-in page: pick a method, prove it with the authenticator code, set a new password. */
const ForgotPasswordStep: React.FC<Props> = ({ initialUsername = '', onBack }) => {
  const [methods, setMethods] = useState<Methods | null>(null);
  const [stage, setStage] = useState<Stage>('choose');
  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiService.forgotMethods()
      .then(setMethods)
      .catch(() => setMethods({ authenticator: false, email: { available: false, comingSoon: true }, contactAdmin: true }));
  }, []);
  useEffect(() => { if (stage === 'code') codeRef.current?.focus(); }, [stage, useRecovery]);

  const verify = async () => {
    if (busy) return;
    if (!username.trim() || !code.trim()) { setError('Enter your username and the code.'); return; }
    setBusy(true); setError('');
    try {
      const r = await apiService.forgotVerify(username.trim(), code);
      setToken(r.resetToken); setCode(''); setStage('password');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setCode('');
    } finally { setBusy(false); }
  };

  const reset = async () => {
    if (busy) return;
    if (pw.length < 8 || !RULE.test(pw)) { setError('Use at least 8 characters with an uppercase letter, a lowercase letter and a number.'); return; }
    if (pw !== pw2) { setError('The two passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await apiService.forgotReset(token, pw);
      setPw(''); setPw2(''); setStage('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the password');
    } finally { setBusy(false); }
  };

  const err = error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>;
  const optionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%' };

  return (
    <div className="aw-card aw-fade-in" style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', border: '1px solid var(--aw-border)' }}>
          {stage === 'done' ? <CheckCircle2 size={26} /> : <KeyRound size={26} />}
        </div>
        <h2 className="aw-card-title">{stage === 'done' ? 'Password changed' : 'Reset your password'}</h2>
        <p className="aw-meta">
          {stage === 'choose' && 'Choose how you want to verify it is you.'}
          {stage === 'code' && (useRecovery ? 'Enter one of your recovery codes.' : 'Enter your username and the 6-digit code from your authenticator app.')}
          {stage === 'password' && 'Code accepted. Choose a new password.'}
          {stage === 'done' && 'You can now sign in with your new password.'}
        </p>
      </div>

      {stage === 'choose' && (
        <div className="aw-stack" style={{ gap: 8 }}>
          {methods === null ? <p className="aw-meta" style={{ textAlign: 'center' }}>Loading…</p> : (
            <>
              <button type="button" className="aw-btn aw-btn-secondary" disabled={!methods.authenticator} style={optionStyle}
                onClick={() => { setError(''); setStage('code'); }}>
                <Smartphone size={16} />
                <span style={{ flex: 1 }}>
                  <strong>Authenticator code</strong>
                  <span className="aw-meta" style={{ display: 'block' }}>{methods.authenticator ? 'Use the code from your phone app' : 'Switched off by your administrator'}</span>
                </span>
                {methods.authenticator && <ChevronRight size={14} />}
              </button>
              <button type="button" className="aw-btn aw-btn-secondary" disabled style={optionStyle} aria-disabled="true">
                <Mail size={16} />
                <span style={{ flex: 1 }}>
                  <strong>Email OTP</strong>
                  <span className="aw-meta" style={{ display: 'block' }}>A code sent to your email address</span>
                </span>
                <span className="aw-pill">Coming soon</span>
              </button>
              <div className="aw-alert" role="note" style={{ marginTop: 4 }}>
                <ShieldCheck size={16} />
                <div>Don't have an authenticator set up, or lost your phone? Ask your administrator to reset your password.</div>
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'code' && (
        <form className="aw-stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <div className="aw-input-wrap has-icon">
            <User size={14} />
            <input className="aw-input" value={username} disabled={busy} autoComplete="off" placeholder="Username"
              onChange={(e) => { setUsername(e.target.value); setError(''); }} />
          </div>
          <div className="aw-input-wrap has-icon">
            <KeyRound size={14} />
            <input ref={codeRef} className="aw-input" value={code} disabled={busy} autoComplete="one-time-code"
              inputMode={useRecovery ? 'text' : 'numeric'} maxLength={useRecovery ? 12 : 7}
              placeholder={useRecovery ? 'XXXX-XXXX' : '123456'}
              onChange={(e) => { setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d ]/g, '')); setError(''); }}
              style={{ textAlign: 'center', fontSize: 18, letterSpacing: useRecovery ? 2 : 6 }} />
          </div>
          {err}
          <button type="submit" className="aw-btn aw-btn-primary" disabled={busy || !username.trim() || !code.trim()}>
            {busy && <RotateCcw size={14} className="aw-spin" />} {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" disabled={busy}
            onClick={() => { setUseRecovery((r) => !r); setCode(''); setError(''); }}>
            {useRecovery ? 'Use my authenticator app instead' : 'Use a recovery code'}
          </button>
        </form>
      )}

      {stage === 'password' && (
        <form className="aw-stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); reset(); }}>
          <PasswordInput withIcon className="aw-input" value={pw} disabled={busy} autoComplete="new-password" placeholder="New password"
              onChange={(e) => { setPw(e.target.value); setError(''); }} />
          <PasswordInput withIcon className="aw-input" value={pw2} disabled={busy} autoComplete="new-password" placeholder="Confirm new password"
              onChange={(e) => { setPw2(e.target.value); setError(''); }} />
          <p className="aw-meta">At least 8 characters, with an uppercase letter, a lowercase letter and a number.</p>
          {err}
          <button type="submit" className="aw-btn aw-btn-primary" disabled={busy || !pw || !pw2}>
            {busy && <RotateCcw size={14} className="aw-spin" />} {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}

      {stage === 'done' ? (
        <button type="button" className="aw-btn aw-btn-primary" onClick={onBack}>Back to sign in</button>
      ) : (
        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" disabled={busy}
          onClick={() => (stage === 'code' ? (setStage('choose'), setError('')) : onBack())}>
          {stage === 'code' ? 'Choose another method' : 'Back to sign in'}
        </button>
      )}
    </div>
  );
};

export default ForgotPasswordStep;
