import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, ShieldCheck, ShieldOff } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import PasswordInput from '../../../../../components/shared/PasswordInput';
import { EnrolPanel, RecoveryCodesPanel } from '../../../../../auth/components/TwoFaStep';
import { useTranslation } from 'react-i18next';

type View = 'home' | 'password' | 'enrol' | 'codes' | 'disable';

/**
 * ES-179: "Loan approvals" authenticator for approvers. A separate authenticator entry (own QR, own recovery codes):
 * only its code approves loan actions (Early Closure, Pass, Re-agreement, Reverse); the personal login code never does.
 * Shown only to administrators who hold the Approver (OTP) right.
 */
const LoanApprovalCard: React.FC = () => {
  const { t } = useTranslation();
  const [loan, setLoan] = useState<{ isApprover: boolean; enrolled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [view, setView] = useState<View>('home');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try { const s = await apiService.twoFaStatus(); setLoan(s?.loan || null); } catch { setLoan(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const home = () => { setView('home'); setPassword(''); setCode(''); setSetup(null); setError(''); refresh(); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  };

  if (!loan || !loan.isApprover) return null;

  const errBox = error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>;

  return (
    <div className="aw-panel aw-fade-in" style={{ textAlign: 'left', marginTop: 12 }}>
      <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p className="aw-strong">{t('Loan approvals authenticator')}</p>
        {loan.enrolled
          ? <span className="aw-pill tone-success"><CheckCircle2 size={12} /> {t('On')}</span>
          : <span className="aw-pill">{t('Not set up')}</span>}
      </div>

      {view === 'home' && (
        <div className="aw-stack" style={{ gap: 8 }}>
          <span className="aw-meta">
            {t('A separate code, used only to approve loan actions (Early Closure, Pass, Re-agreement, Reverse). Your personal sign-in code does not work for these.')}
          </span>
          {loan.enrolled ? (
            <>
              <span className="aw-meta">{t('Recovery codes left:')} <strong>{loan.recoveryCodesRemaining}</strong></span>
              <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setView('disable')}><ShieldOff size={12} /> {t('Turn off')}</button>
            </>
          ) : (
            <>
              <span className="aw-meta">{t('Until you set this up, you are not counted as an approver and your code cannot approve loan actions.')}</span>
              <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setView('password')}><ShieldCheck size={12} /> {t('Set up')}</button>
            </>
          )}
        </div>
      )}

      {view === 'password' && (
        <form className="aw-stack" style={{ gap: 8 }} onSubmit={(e) => {
          e.preventDefault();
          run(async () => { setSetup(await apiService.twoFaLoanEnrolBegin(password)); setView('enrol'); setPassword(''); });
        }}>
          <span className="aw-meta">{t('Confirm your password to continue.')}</span>
          <PasswordInput className="aw-input" placeholder={t('Your password')} aria-label={t('Your password')} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          {errBox}
          <div className="aw-btn-row">
            <button type="button" className="aw-btn aw-btn-secondary" onClick={home}>{t('Cancel')}</button>
            <button type="submit" className="aw-btn aw-btn-primary" disabled={busy || !password}>{busy && <RotateCcw size={13} className="aw-spin" />} {t('Continue')}</button>
          </div>
        </form>
      )}

      {view === 'enrol' && setup && (
        <>
          <EnrolPanel setup={setup} busy={busy} error={error}
            onSubmit={(c) => run(async () => { const r = await apiService.twoFaLoanEnrolConfirm(c); setCodes(r.recoveryCodes); setView('codes'); })} />
          <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={home}>{t('Cancel')}</button>
        </>
      )}

      {view === 'codes' && <RecoveryCodesPanel codes={codes} ackLabel="Done" onAck={home} />}

      {view === 'disable' && (
        <form className="aw-stack" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await apiService.twoFaLoanDisable(password, code); home(); }); }}>
          <span className="aw-meta">{t('Enter your password and a current loan-approval code to turn it off. You will no longer be able to approve loan actions.')}</span>
          <PasswordInput className="aw-input" placeholder={t('Your password')} aria-label={t('Your password')} value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="aw-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder={t('6-digit code')} aria-label={t('Authenticator code')} value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} />
          {errBox}
          <div className="aw-btn-row">
            <button type="button" className="aw-btn aw-btn-secondary" onClick={home}>{t('Cancel')}</button>
            <button type="submit" className="aw-btn aw-btn-danger" disabled={busy || !password || code.replace(/\s/g, '').length !== 6}>
              {busy && <RotateCcw size={13} className="aw-spin" />} {t('Turn off')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LoanApprovalCard;
