import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Typography, Alert, Card, Row, Col } from 'antd';
import { LockOutlined, UserOutlined, CloseOutlined, UndoOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { IS_LOGIN_WINDOW } from '../../utils/windowIdentity';
import fibeLogo from '../../assets/fibe-logo.png';

const { Title } = Typography;

const ACCENT = '#2ee0a4';
const REMEMBERED_USERNAME_KEY = 'lms_remembered_username';

// Dialog keyframes, scoped under .fibe-login-scope. Kept separate from the
// rest of the app's CSS: input.css kills all animation/transition durations
// globally ("fast, snappy business application" — see its GLOBAL FONT/DISABLE
// ANIMATIONS comment) because a business form re-animating on every keystroke
// screen would be a nuisance. The logon dialog is shown once per session and
// isn't a data-entry form, so it opts back in locally — the `revert` rules
// below only win inside .fibe-login-scope because a class selector is more
// specific than the global rule's bare `*`, even though both are !important.
const DIALOG_STYLE = `
  /* The app's global body rule sets line-height: 1.5, which is fine for
     data-entry forms but inflates every text block in this compact dialog
     well past what its pixel dimensions were designed around. Tighten it
     back down locally — plain specificity (no !important) is enough since
     the global rule targets <body> directly, not a lower-specificity
     inherited value. */
  .fibe-login-scope { line-height: 1.3; }
  .fibe-login-scope, .fibe-login-scope *, .fibe-login-scope *::before, .fibe-login-scope *::after {
    animation-duration: revert !important;
    animation-delay: revert !important;
    animation-iteration-count: revert !important;
    transition-duration: revert !important;
    transition-delay: revert !important;
  }
  .fibe-login-scope input::placeholder { color: rgba(230,237,243,.30); }
  .fibe-login-scope input:-webkit-autofill {
    -webkit-text-fill-color: #e6edf3;
    -webkit-box-shadow: 0 0 0 1000px #151d29 inset;
  }
  @keyframes fibeRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes fibeSpin { to { transform: rotate(360deg); } }
  @keyframes fibeDrift { 0% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(18px,-22px,0) scale(1.08); } 100% { transform: translate3d(0,0,0) scale(1); } }
  @keyframes fibeSweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
  @keyframes fibeDraw { to { stroke-dashoffset: 0; } }
  @keyframes fibePop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes fibeRing { 0% { transform: scale(.6); opacity: .7; } 100% { transform: scale(1.9); opacity: 0; } }
  @keyframes fibeBar { from { width: 0%; } to { width: 100%; } }
  .fibe-login-scope .fibe-titlebar-btn:hover { background: rgba(255,255,255,.08); color: #e6edf3; }
  .fibe-login-scope .fibe-titlebar-close:hover { background: #d9455f !important; color: #fff !important; }
  .fibe-login-scope .fibe-reveal-btn:hover { background: rgba(255,255,255,.07); color: #e6edf3; }
  .fibe-login-scope .fibe-remember-btn:hover { color: #e6edf3 !important; }
  .fibe-login-scope .fibe-forgot-link:hover { color: ${ACCENT} !important; }
  .fibe-login-scope .fibe-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 16px 34px rgba(22,163,123,.42); filter: brightness(1.05); }
  .fibe-login-scope .fibe-submit-btn:active { transform: translateY(1px); }
  .fibe-login-scope .fibe-clear-btn:hover { background: rgba(255,255,255,.07); color: #e6edf3; border-color: rgba(255,255,255,.24); }
  .fibe-login-scope .fibe-cancel-btn:hover { background: rgba(217,69,95,.16); border-color: rgba(217,69,95,.5); color: #ffb3c0; }
`;

const LoginForm: React.FC = () => {
  console.log('[LoginForm] Rendering LoginForm component');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog-only field state — the logon dialog uses hand-rolled inputs
  // instead of antd's Form so the custom bordered/icon/focus-ring look from
  // the design can be matched exactly.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [focusField, setFocusField] = useState<'user' | 'pass' | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [success, setSuccess] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  console.log('[LoginForm] Auth state:', { isAuthenticated, isLoading, error });

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

  const onFinish = async (values: { username: string; password: string }) => {
    console.log('[LoginForm] Form submitted with values:', { username: values.username });
    try {
      setIsSubmitting(true);
      console.log('[LoginForm] Calling login function...');
      await login(values);
      console.log('[LoginForm] Login successful, should be redirected soon');
    } catch (err) {
      console.error('[LoginForm] Login failed:', err);
    } finally {
      console.log('[LoginForm] Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    form.resetFields();
    clearError();
  };

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

  const handleDialogSubmit = async (e: React.FormEvent) => {
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
      await login({ username, password });
      if (remember) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
      setSuccess(true);
    } catch (err) {
      console.error('[LoginForm] Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClear = () => {
    setUsername('');
    setPassword('');
    setFieldError('');
    clearError();
  };

  const displayedError = fieldError || error;
  const busy = isSubmitting || isLoading;

  const fieldStyle = (key: 'user' | 'pass'): React.CSSProperties =>
    focusField === key
      ? { borderColor: ACCENT, boxShadow: '0 0 0 3px rgba(46,224,164,.14)' }
      : { borderColor: 'rgba(255,255,255,.11)', boxShadow: 'none' };

  if (IS_LOGIN_WINDOW) {
    return (
      <div
        className="fibe-login-scope"
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: '#0d131c',
          display: 'flex',
          flexDirection: 'column',
          color: '#e6edf3',
        }}
      >
        <style>{DIALOG_STYLE}</style>

        {/* Decorative background: drifting glow blobs, dot grid, faint rings */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 460, height: 460, left: -160, top: -150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,123,.30), transparent 66%)', filter: 'blur(12px)', animation: 'fibeDrift 18s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, right: -140, bottom: -130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,120,214,.20), transparent 68%)', filter: 'blur(14px)', animation: 'fibeDrift 24s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'radial-gradient(rgba(230,237,243,.28) 1px, transparent 1px)', backgroundSize: '26px 26px', maskImage: 'radial-gradient(120% 90% at 50% 20%, #000 20%, transparent 78%)', WebkitMaskImage: 'radial-gradient(120% 90% at 50% 20%, #000 20%, transparent 78%)' }} />
          <svg viewBox="0 0 400 400" style={{ position: 'absolute', width: 520, height: 520, left: '50%', top: '46%', transform: 'translate(-50%,-50%)', opacity: 0.05 }}>
            <circle cx="200" cy="200" r="120" fill="none" stroke={ACCENT} strokeWidth={1.5} />
            <circle cx="200" cy="200" r="168" fill="none" stroke={ACCENT} strokeWidth={1} />
            <circle cx="200" cy="200" r="72" fill="none" stroke={ACCENT} strokeWidth={2} />
            <path d="M20 300 L110 240 L180 268 L268 178 L332 214 L380 150" fill="none" stroke={ACCENT} strokeWidth={2} />
          </svg>
        </div>

        {/* Title bar — replaces the OS chrome on this frameless window */}
        <div
          style={{
            WebkitAppRegion: 'drag',
            position: 'relative',
            flex: '0 0 auto',
            height: 46,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px 0 16px',
            background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.01))',
            borderBottom: '1px solid rgba(255,255,255,.07)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, boxShadow: '0 0 10px rgba(46,224,164,.9)' }} />
            <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(230,237,243,.72)' }}>
              Fibe Loan Management
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              type="button"
              title="Minimize"
              onClick={handleMinimize}
              className="fibe-titlebar-btn"
              style={{ width: 38, height: 32, border: 0, background: 'transparent', color: 'rgba(230,237,243,.55)', borderRadius: 6, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12"><path d="M1 6h10" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" /></svg>
            </button>
            <button
              type="button"
              title="Close"
              onClick={handleCancel}
              className="fibe-titlebar-btn fibe-titlebar-close"
              style={{ width: 38, height: 32, border: 0, background: 'transparent', color: 'rgba(230,237,243,.55)', borderRadius: 6, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', flex: '1 1 auto', display: 'flex', flexDirection: 'column', padding: '20px 46px 0' }}>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fibeRise .5s ease both' }}>
            <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(160deg, #ffffff, #e8f4ef)', display: 'grid', placeItems: 'center', boxShadow: '0 14px 34px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.10)' }}>
              <img src={fibeLogo} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 21, fontWeight: 600, letterSpacing: '-.015em' }}>Welcome back</div>
            <div style={{ marginTop: 3, fontSize: 13, color: 'rgba(230,237,243,.48)' }}>Sign in to your loan management workspace</div>
          </div>

          <div style={{ height: 1, margin: '14px 0 14px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent)' }} />

          <form onSubmit={handleDialogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fibeRise .5s .08s ease both' }}>

            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(230,237,243,.46)', marginBottom: 5 }}>
                Username
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 44, padding: '0 15px', borderRadius: 10, background: 'rgba(255,255,255,.035)', border: `1px solid ${fieldStyle('user').borderColor}`, boxShadow: fieldStyle('user').boxShadow as string, transition: 'border-color .18s ease, box-shadow .18s ease, background .18s ease' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flex: '0 0 auto', color: 'rgba(230,237,243,.42)' }}>
                  <circle cx="8" cy="5.2" r="2.9" stroke="currentColor" strokeWidth={1.3} />
                  <path d="M2.6 13.6c.7-2.8 2.8-4.2 5.4-4.2s4.7 1.4 5.4 4.2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
                </svg>
                <input
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldError(''); clearError(); }}
                  onFocus={() => setFocusField('user')}
                  onBlur={() => setFocusField(null)}
                  placeholder="Enter your username"
                  autoComplete="off"
                  disabled={busy}
                  style={{ flex: '1 1 auto', minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: '#e6edf3', fontSize: 14.5, letterSpacing: '.01em' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(230,237,243,.46)', marginBottom: 5 }}>
                Password
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 44, padding: '0 8px 0 15px', borderRadius: 10, background: 'rgba(255,255,255,.035)', border: `1px solid ${fieldStyle('pass').borderColor}`, boxShadow: fieldStyle('pass').boxShadow as string, transition: 'border-color .18s ease, box-shadow .18s ease, background .18s ease' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flex: '0 0 auto', color: 'rgba(230,237,243,.42)' }}>
                  <rect x="3" y="7" width="10" height="6.6" rx="1.8" stroke="currentColor" strokeWidth={1.3} />
                  <path d="M5.4 7V5.3a2.6 2.6 0 015.2 0V7" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
                </svg>
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldError(''); clearError(); }}
                  onFocus={() => setFocusField('pass')}
                  onBlur={() => setFocusField(null)}
                  type={reveal ? 'text' : 'password'}
                  placeholder="Enter your password"
                  disabled={busy}
                  style={{ flex: '1 1 auto', minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: '#e6edf3', fontSize: 14.5, letterSpacing: '.01em' }}
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="fibe-reveal-btn"
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  style={{ flex: '0 0 auto', width: 34, height: 34, display: 'grid', placeItems: 'center', border: 0, borderRadius: 8, background: 'transparent', color: 'rgba(230,237,243,.45)', cursor: 'pointer' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1.6 8S4.1 3.9 8 3.9 14.4 8 14.4 8 11.9 12.1 8 12.1 1.6 8 1.6 8z" stroke="currentColor" strokeWidth={1.3} />
                    <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth={1.3} />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -2 }}>
              <button
                type="button"
                onClick={() => setRemember((r) => !r)}
                className="fibe-remember-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'rgba(230,237,243,.62)', fontSize: 13 }}
              >
                <span style={{ width: 17, height: 17, borderRadius: 5, display: 'grid', placeItems: 'center', border: `1px solid ${remember ? ACCENT : 'rgba(255,255,255,.20)'}`, background: remember ? ACCENT : 'transparent', transition: 'all .16s ease' }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: remember ? 1 : 0 }}>
                    <path d="M2 6.3l2.6 2.6L10 3.4" stroke="#07120e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Remember me
              </button>
              <button
                type="button"
                onClick={() => alert('Contact your system administrator to reset your password.')}
                className="fibe-forgot-link"
                style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontSize: 13, color: 'rgba(230,237,243,.5)' }}
              >
                Forgot password?
              </button>
            </div>

            {displayedError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(217,69,95,.10)', border: '1px solid rgba(217,69,95,.34)', animation: 'fibeRise .28s ease both' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flex: '0 0 auto', marginTop: 1, color: '#ff7b90' }}>
                  <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth={1.3} />
                  <path d="M8 4.8v3.7M8 10.9v.1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
                <div style={{ fontSize: 13, lineHeight: 1.45, color: '#ffb3c0' }}>{displayedError}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="fibe-submit-btn"
              style={{ position: 'relative', overflow: 'hidden', height: 44, marginTop: 0, border: 0, borderRadius: 11, cursor: busy ? 'default' : 'pointer', background: 'linear-gradient(135deg, #16a37b, #22c58f)', color: '#04150f', fontSize: 15.5, fontWeight: 600, letterSpacing: '.01em', boxShadow: '0 12px 28px rgba(22,163,123,.30)', transition: 'transform .14s ease, box-shadow .2s ease, filter .2s ease', opacity: busy ? 0.85 : 1 }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {busy && (
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(4,21,15,.28)', borderTopColor: '#04150f', animation: 'fibeSpin .7s linear infinite' }} />
                )}
                {busy ? 'Signing in…' : 'Sign In'}
              </span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                onClick={handleDialogClear}
                disabled={busy}
                className="fibe-clear-btn"
                style={{ height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,.13)', background: 'rgba(255,255,255,.03)', color: 'rgba(230,237,243,.78)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .16s ease' }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13 8a5 5 0 11-1.6-3.7" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" /><path d="M13.2 2v3h-3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" /></svg>
                Clear
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="fibe-cancel-btn"
                style={{ height: 40, borderRadius: 10, border: '1px solid rgba(217,69,95,.28)', background: 'rgba(217,69,95,.06)', color: '#ff8398', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .16s ease' }}
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /></svg>
                Cancel
              </button>
            </div>
          </form>

          <div style={{ marginTop: 'auto', padding: '10px 0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(230,237,243,.32)', letterSpacing: '.02em' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: '0 0 8px rgba(46,224,164,.8)' }} />
              Secure connection
            </div>
            {appVersion && <div style={{ fontVariantNumeric: 'tabular-nums' }}>Version {appVersion}</div>}
          </div>
        </div>

        {success && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(9,14,20,.90)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', animation: 'fibeRise .32s ease both' } as React.CSSProperties}>
            <div style={{ position: 'relative', width: 96, height: 96, display: 'grid', placeItems: 'center' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(46,224,164,.55)', animation: 'fibeRing 1.5s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(46,224,164,.35)', animation: 'fibeRing 1.5s .45s ease-out infinite' }} />
              <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'linear-gradient(135deg, #16a37b, #24d69b)', display: 'grid', placeItems: 'center', boxShadow: '0 16px 40px rgba(22,163,123,.45)', animation: 'fibePop .45s cubic-bezier(.2,.9,.3,1.2) both' }}>
                <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                  <path d="M10 19.6l6.2 6.2L28 13.6" stroke="#04150f" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={30} strokeDashoffset={30} style={{ animation: 'fibeDraw .42s .22s ease forwards' }} />
                </svg>
              </div>
            </div>
            <div style={{ marginTop: 26, fontSize: 21, fontWeight: 600, animation: 'fibeRise .4s .18s ease both' }}>Signed in</div>
            <div style={{ fontSize: 13.5, color: 'rgba(230,237,243,.5)', animation: 'fibeRise .4s .26s ease both' }}>Preparing your dashboard…</div>
            <div style={{ marginTop: 24, width: 172, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.09)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #16a37b, #2ee0a4)', animation: 'fibeBar 1.5s .2s ease-out both' }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const body = (
    <>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>Login</Title>

        {error && (
          <Alert
            message="Login Failed"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '24px' }}
            closable
            onClose={clearError}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{
              required: true,
              message: 'Please input your username!'
            }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Enter your username"
              size="large"
              disabled={isSubmitting}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{
              required: true,
              message: 'Please input your password!'
            }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Enter your password"
              size="large"
              disabled={isSubmitting}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting || isLoading}
              block
              size="large"
              style={{ marginBottom: '12px' }}
            >
              Sign In
            </Button>

            <Row gutter={16}>
              <Col span={12}>
                <Button
                  htmlType="button"
                  onClick={handleClear}
                  block
                  size="large"
                  icon={<UndoOutlined />}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  htmlType="button"
                  onClick={handleCancel}
                  block
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
    </>
  );

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <Card hoverable>{body}</Card>
    </div>
  );
};

export default LoginForm;
