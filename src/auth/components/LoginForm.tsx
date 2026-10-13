import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, RotateCcw, X, Minus, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TwoFaChallenge } from '../types/auth.types';
import TwoFaStep from './TwoFaStep';
import { IS_LOGIN_WINDOW } from '../../utils/windowIdentity';
import fibeLogo from '../../assets/fibe-logo.png';
import { apiService } from '../../services/api';
import LoadingAnimation from '../../components/loaders/LoadingAnimation';

const apiServiceAdopt = (authData: any) => apiService.adoptAuth(authData);

const REMEMBERED_USERNAME_KEY = 'lms_remembered_username';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, finishLogin, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [challenge, setChallenge] = useState<TwoFaChallenge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldError, setFieldError] = useState('');
  const [success, setSuccess] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Redirect if already authenticated.
  //
  // Skipped in the logon dialog: there, the main process opens the dashboard in
  // its own window and closes this one. Navigating would briefly paint the full
  // dashboard inside the 520px dialog first.
  useEffect(() => {
    if (isAuthenticated && !isLoading && !IS_LOGIN_WINDOW) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!IS_LOGIN_WINDOW) return;
    const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (remembered) setUsername(remembered);
    (window as any).electronAPI?.getAppVersion?.()
      .then((v: string) => setAppVersion(v))
      .catch(() => {});
  }, []);

  const handleCancel = () => {
    // In the logon dialog, Cancel means "don't sign in" — there is no app
    // behind it yet, so quit outright, as the legacy software does.
    if (IS_LOGIN_WINDOW) {
      (window as any).electronAPI?.quitApp?.();
      return;
    }

    // Elsewhere just close the window.
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.closeWindow) {
      electronAPI.closeWindow();
    } else {
      window.close();
    }
  };

  const handleMinimize = () => {
    (window as any).electronAPI?.minimizeWindow?.();
  };

  // Runs once a login is fully complete (password-only, or after the 2FA step).
  const afterLogin = () => {
    if (IS_LOGIN_WINDOW) {
      if (remember) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
      setSuccess(true);
    }
  };

  const handleTwoFaComplete = (authData: any) => {
    try {
      apiServiceAdopt(authData);
      finishLogin(authData);
      afterLogin();
    } catch (e) {
      console.error('[LoginForm] Completing 2FA login failed:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading || success) return;
    if (!username.trim()) {
      setFieldError('Please enter your username to continue.');
      return;
    }
    if (!password) {
      setFieldError('Please enter your password to continue.');
      return;
    }
    setFieldError('');
    try {
      setIsSubmitting(true);
      const result = await login({ username, password });
      if (typeof result === 'object') {
        // Password accepted; a second step (authenticator code / set-up) is next.
        setChallenge(result);
        return;
      }
      afterLogin();
    } catch (err) {
      console.error('[LoginForm] Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setUsername('');
    setPassword('');
    setFieldError('');
    clearError();
  };

  const displayedError = fieldError || error;
  const busy = isSubmitting || isLoading;
  const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div className="app-window login-shell">
      {/* Drag bar + window controls of the frameless logon dialog */}
      {IS_LOGIN_WINDOW && (
        <div className="login-bar" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="aw-actions" style={noDrag}>
            <button type="button" className="aw-icon-btn is-sm" onClick={handleMinimize} aria-label="Minimize" data-tip="Minimize" data-tip-pos="bottom-end"><Minus size={14} /></button>
            <button type="button" className="aw-icon-btn is-sm is-danger" onClick={handleCancel} aria-label="Close" data-tip="Close" data-tip-pos="bottom-end"><X size={14} /></button>
          </div>
        </div>
      )}

      <div className="login-stage">
        <div className="login-brand aw-fade-in">
          <div className="login-mark"><img src={fibeLogo} alt="" /></div>
          <div>
            <h1 className="login-name">Fibe <span>Loan Management</span></h1>
            <p className="login-tag">Sign in to your loan management workspace</p>
          </div>
        </div>

        {challenge ? (
          <TwoFaStep challenge={challenge} onComplete={handleTwoFaComplete} onBack={() => { setChallenge(null); setPassword(''); clearError(); }} />
        ) : (
        <form onSubmit={handleSubmit} className="aw-card login-card aw-fade-in" noValidate>
          <div className="login-card-head">
            <h2>Welcome back</h2>
            <p className="aw-meta">Enter your credentials to continue</p>
          </div>

          <div>
            <label className="aw-label" htmlFor="login-username">Username</label>
            <div className="aw-input-wrap has-icon">
              <User size={14} />
              <input id="login-username" className="aw-input" value={username} autoComplete="off" disabled={busy}
                placeholder="Enter your username"
                onChange={(e) => { setUsername(e.target.value); setFieldError(''); clearError(); }} />
            </div>
          </div>

          <div>
            <label className="aw-label" htmlFor="login-password">Password</label>
            <div className="aw-input-wrap has-icon has-action">
              <Lock size={14} />
              <input id="login-password" className="aw-input" value={password} disabled={busy}
                type={reveal ? 'text' : 'password'} placeholder="Enter your password"
                onChange={(e) => { setPassword(e.target.value); setFieldError(''); clearError(); }} />
              <button type="button" className="aw-input-action" onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide password' : 'Show password'} data-tip={reveal ? 'Hide password' : 'Show password'} data-tip-pos="bottom-end">
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="login-row">
            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={() => setRemember((r) => !r)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
              Remember me
            </label>
            <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm"
              onClick={() => alert('Contact your system administrator to reset your password.')}>
              Forgot password?
            </button>
          </div>

          {displayedError && (
            <div className="aw-alert aw-alert-danger aw-fade-in" role="alert">
              <AlertCircle size={16} />
              <div>{displayedError}</div>
            </div>
          )}

          <button type="submit" disabled={busy} className="aw-btn aw-btn-primary login-submit">
            {busy && <RotateCcw size={14} className="aw-spin" />}
            {busy ? 'Signing in…' : 'Sign In'}
            {!busy && <ArrowRight size={16} className="login-arrow" />}
          </button>

          <div className="login-secondary">
            <button type="button" onClick={handleClear} disabled={busy} className="aw-btn aw-btn-ghost aw-btn-sm"><RotateCcw size={13} /> Clear</button>
            <span className="login-sep" />
            <button type="button" onClick={handleCancel} disabled={busy} className="aw-btn aw-btn-ghost aw-btn-sm aw-btn-danger-text"><X size={13} /> Cancel</button>
          </div>
        </form>
        )}

        <div className="login-trust aw-fade-in">
          <span className="login-chip"><ShieldCheck size={12} /> Secure connection</span>
          <span className="login-chip"><Lock size={12} /> Encrypted session</span>
        </div>
      </div>

      <div className="aw-footer">
        <span>{appVersion ? `Version ${appVersion}` : ''}</span>
      </div>

      {success && (
        <div className="aw-modal-backdrop aw-fade-in" style={{ position: 'absolute', inset: 0 }}>
          <div className="aw-card" style={{ alignItems: 'center', textAlign: 'center', minWidth: 260 }}>
            <CheckCircle2 size={44} style={{ color: 'var(--aw-success)' }} />
            <h2 className="aw-card-title">Signed in</h2>
            <p className="aw-meta">Preparing your dashboard…</p>
            <LoadingAnimation height={84} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
