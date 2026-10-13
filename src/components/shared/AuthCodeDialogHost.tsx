import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { AuthCodeAsk, registerAuthCodePrompter } from '../../services/authCodeGate';

/**
 * The prompt behind the authenticator-code gate (ES-116). Mounted once per window; it only
 * appears when the backend asks for a code for a protected action.
 */
const AuthCodeDialogHost: React.FC = () => {
  const [ask, setAsk] = useState<AuthCodeAsk | null>(null);
  const [code, setCode] = useState('');
  const resolver = useRef<((v: string | null) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAuthCodePrompter((a) => new Promise<string | null>((resolve) => {
      resolver.current?.(null); // a newer prompt replaces an unanswered one
      resolver.current = resolve;
      setCode('');
      setAsk(a);
    }));
    return () => registerAuthCodePrompter(null);
  }, []);

  useEffect(() => { if (ask) setTimeout(() => inputRef.current?.focus(), 30); }, [ask]);

  const finish = useCallback((value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setAsk(null);
    setCode('');
  }, []);

  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask, finish]);

  if (!ask) return null;
  const ready = code.replace(/\s/g, '').length === 6;

  return (
    <div className="app-window" style={{ position: 'fixed', inset: 0, height: 'auto', minHeight: 0, background: 'transparent', zIndex: 100000 }}>
      <div className="aw-modal-backdrop" onClick={() => finish(null)}>
        <div className="aw-modal" role="dialog" aria-modal="true" aria-label="Approver code" style={{ maxWidth: '24rem', height: 'auto', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
          <form className="aw-stack" style={{ padding: 18, gap: 10 }} onSubmit={(e) => { e.preventDefault(); if (ready) finish(code.replace(/\s/g, '')); }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <span className="aw-card-icon" style={{ width: 44, height: 44, borderRadius: 14 }}><ShieldCheck size={22} /></span>
              <h2 className="aw-card-title">Approver code needed</h2>
              <p className="aw-meta">To continue with <strong>{ask.label}</strong>, ask an approver for the current 6-digit code from their authenticator app and enter it here.</p>
            </div>
            <div className="aw-input-wrap has-icon">
              <KeyRound size={14} />
              <input ref={inputRef} className="aw-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456"
                value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: 6 }} />
            </div>
            {ask.note && <div className="aw-alert aw-alert-danger" role="alert"><div>{ask.note}</div></div>}
            <div className="aw-btn-row">
              <button type="button" className="aw-btn aw-btn-secondary" onClick={() => finish(null)}>Cancel</button>
              <button type="submit" className="aw-btn aw-btn-primary" disabled={!ready}>Confirm</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthCodeDialogHost;
