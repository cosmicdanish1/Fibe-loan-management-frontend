import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Copy, Download, KeyRound, RotateCcw, ShieldCheck, Smartphone } from 'lucide-react';
import { apiService } from '../../services/api';
import { TwoFaChallenge } from '../types/auth.types';

interface Props {
  challenge: TwoFaChallenge;
  /** Called with the full auth response once the second step is done. */
  onComplete: (authData: any) => void;
  onBack: () => void;
}

/** Shared "save these codes" panel, also used from My Profile. */
export const RecoveryCodesPanel: React.FC<{ codes: string[]; onAck?: () => void; ackLabel?: string }> = ({ codes, onAck, ackLabel }) => {
  const [saved, setSaved] = useState(false);
  const text = codes.join('\n');
  const copy = () => { try { navigator.clipboard?.writeText(text); } catch { /* clipboard blocked */ } };
  const download = () => {
    const blob = new Blob([`Recovery codes - each works once.\n\n${text}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="aw-stack" style={{ gap: 10 }}>
      <div className="aw-alert aw-alert-warning" role="status">
        <AlertCircle size={16} />
        <div>Save these recovery codes now. They are shown only once. Each one works a single time if you lose your phone.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
        {codes.map((c) => <div key={c} className="aw-card" style={{ padding: '6px 10px', textAlign: 'center' }}>{c}</div>)}
      </div>
      <div className="aw-inline" style={{ gap: 8 }}>
        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={copy}><Copy size={13} /> Copy</button>
        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={download}><Download size={13} /> Download</button>
      </div>
      {onAck && (
        <>
          <label className="aw-inline" style={{ gap: 8, cursor: 'pointer', alignItems: 'center', fontWeight: 600 }}>
            <input type="checkbox" checked={saved} onChange={() => setSaved((s) => !s)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
            I have saved my recovery codes
          </label>
          <button type="button" className="aw-btn aw-btn-primary" disabled={!saved} onClick={onAck}>{ackLabel || 'Continue'}</button>
        </>
      )}
    </div>
  );
};

/** Shows QR + manual key and asks for the first code. Used at login (forced enrolment) and in My Profile. */
export const EnrolPanel: React.FC<{
  setup: { secret: string; qrDataUrl: string };
  busy: boolean;
  onSubmit: (code: string) => void;
  error?: string;
}> = ({ setup, busy, onSubmit, error }) => {
  const [code, setCode] = useState('');
  return (
    <div className="aw-stack" style={{ gap: 10 }}>
      <p className="aw-meta">1. Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy) and scan this QR code.</p>
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <img src={setup.qrDataUrl} alt="Authenticator QR code" width={200} height={200} style={{ background: '#fff', borderRadius: 8, padding: 6 }} />
      </div>
      <details>
        <summary className="aw-meta" style={{ cursor: 'pointer' }}>Can't scan? Enter the key manually</summary>
        <code style={{ display: 'block', marginTop: 6, wordBreak: 'break-all', userSelect: 'all', fontWeight: 600 }}>{setup.secret}</code>
      </details>
      <p className="aw-meta">2. Type the 6-digit code the app shows.</p>
      <input className="aw-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" value={code} disabled={busy}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter' && code.replace(/\s/g, '').length === 6) onSubmit(code); }}
        style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6 }} />
      {error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>}
      <button type="button" className="aw-btn aw-btn-primary" disabled={busy || code.replace(/\s/g, '').length !== 6} onClick={() => onSubmit(code)}>
        {busy && <RotateCcw size={14} className="aw-spin" />} Verify &amp; turn on
      </button>
    </div>
  );
};

const TwoFaStep: React.FC<Props> = ({ challenge, onComplete, onBack }) => {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [pending, setPending] = useState<any>(null); // auth response held back while recovery codes are shown
  const [codes, setCodes] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [useRecovery]);

  // Forced enrolment: fetch the QR as soon as the step opens.
  useEffect(() => {
    if (challenge.mode !== 'enrol') return;
    let cancelled = false;
    apiService.twoFaLoginEnrolBegin(challenge.challengeToken)
      .then((s) => { if (!cancelled) setSetup(s); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start set-up'); });
    return () => { cancelled = true; };
  }, [challenge]);

  const verify = async () => {
    if (busy || !code.trim()) return;
    setBusy(true); setError('');
    try {
      const auth = await apiService.twoFaLoginVerify(challenge.username, challenge.challengeToken, code, remember);
      onComplete(auth);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setCode('');
    } finally { setBusy(false); }
  };

  const confirmEnrol = async (c: string) => {
    setBusy(true); setError('');
    try {
      const res = await apiService.twoFaLoginEnrolConfirm(challenge.challengeToken, c);
      setPending(res);
      setCodes(res.recoveryCodes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally { setBusy(false); }
  };

  const title = challenge.mode === 'enrol' ? 'Set up two-factor authentication' : 'Two-factor authentication';

  return (
    <div className="aw-card aw-fade-in" style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', border: '1px solid var(--aw-border)' }}>
          {challenge.mode === 'enrol' ? <Smartphone size={26} /> : <ShieldCheck size={26} />}
        </div>
        <h2 className="aw-card-title">{title}</h2>
        <p className="aw-meta">
          {challenge.mode === 'enrol'
            ? 'Your administrator requires two-factor authentication for your account.'
            : useRecovery ? 'Enter one of your recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}
        </p>
      </div>

      {challenge.mode === 'enrol' ? (
        codes ? (
          <RecoveryCodesPanel codes={codes} ackLabel="Continue to the app" onAck={() => onComplete(pending)} />
        ) : setup ? (
          <EnrolPanel setup={setup} busy={busy} onSubmit={confirmEnrol} error={error} />
        ) : (
          <>
            {error ? <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>
              : <p className="aw-meta" style={{ textAlign: 'center' }}>Preparing…</p>}
          </>
        )
      ) : (
        <form className="aw-stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <div className="aw-input-wrap has-icon">
            <KeyRound size={14} />
            <input ref={inputRef} className="aw-input" value={code} disabled={busy} autoComplete="one-time-code"
              inputMode={useRecovery ? 'text' : 'numeric'} maxLength={useRecovery ? 12 : 7}
              placeholder={useRecovery ? 'XXXX-XXXX' : '123456'}
              onChange={(e) => { setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d ]/g, '')); setError(''); }}
              style={{ textAlign: 'center', fontSize: 18, letterSpacing: useRecovery ? 2 : 6 }} />
          </div>
          {challenge.rememberDays > 0 && !useRecovery && (
            <label className="aw-inline" style={{ gap: 8, cursor: 'pointer', alignItems: 'center', fontWeight: 600 }}>
              <input type="checkbox" checked={remember} onChange={() => setRemember((r) => !r)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
              Remember this device for {challenge.rememberDays} days
            </label>
          )}
          {error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>}
          <button type="submit" className="aw-btn aw-btn-primary" disabled={busy || !code.trim()}>
            {busy && <RotateCcw size={14} className="aw-spin" />} {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" disabled={busy}
            onClick={() => { setUseRecovery((r) => !r); setCode(''); setError(''); }}>
            {useRecovery ? 'Use my authenticator app instead' : 'Use a recovery code'}
          </button>
        </form>
      )}

      {!codes && (
        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" disabled={busy} onClick={onBack}>Back to sign in</button>
      )}
    </div>
  );
};

export default TwoFaStep;
