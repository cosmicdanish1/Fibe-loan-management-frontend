import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../../services/api';

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

// How long the app waits for the server to record the sign-out before it quits anyway (an offline PC must still be able to exit).
const SIGN_OUT_WAIT_MS = 1500;

const ExitOption1: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const signOutRef = useRef<Promise<unknown>>(Promise.resolve());
  const quitStarted = useRef(false);

  const handleExit = useCallback(() => {
    // ES-621: the server is told the user signed out (the login log row is closed) before the app quits.
    signOutRef.current = Promise.resolve(apiService.logout()).catch(() => undefined);
    setIsExiting(true);
    setShowConfirmation(false);
  }, []);

  // Cancel: back to where the user came from. When this window was opened on its own there is no page to go back to,
  // so the window itself closes (ES-621: navigate(-1) alone left the user stuck).
  const handleCancel = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    } else if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('window-close');
    } else {
      window.close();
    }
  }, [navigate]);

  // ESC cancels, as the footer says (ES-621).
  useEffect(() => {
    if (!showConfirmation) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirmation, handleCancel]);

  // The progress bar: 2% every 20 ms.
  useEffect(() => {
    if (!isExiting) return;
    const interval = setInterval(() => setProgress(prev => Math.min(100, prev + 2)), 20);
    return () => clearInterval(interval);
  }, [isExiting]);

  // At 100%: wait (briefly) for the sign-out, then quit the app.
  useEffect(() => {
    if (progress < 100 || quitStarted.current) return;
    quitStarted.current = true;
    const quit = () => {
      if (window.electronAPI) {
        window.electronAPI.quitApp();
        setTimeout(() => { window.electronAPI?.forceQuitApp(); }, 1000);
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('app-quit');
        setTimeout(() => { window.electron?.ipcRenderer.send('app-quit-force'); }, 1000);
      } else if (window.opener) {
        window.close();
      } else {
        try {
          window.open('', '_self', '');
          window.close();
        } catch {
          // Silent fail
        }
      }
    };
    Promise.race([signOutRef.current, new Promise(resolve => setTimeout(resolve, SIGN_OUT_WAIT_MS))]).then(quit);
  }, [progress]);

  const exitMessages = useMemo(() => [
    t('Signing you out...'),
    t('Closing windows...'),
    t('Almost done...'),
    t('See you soon!'),
  ], [t]);

  const currentMessage = useMemo(() => {
    const index = Math.floor((progress / 100) * exitMessages.length);
    return exitMessages[Math.min(index, exitMessages.length - 1)];
  }, [progress, exitMessages]);

  const steps = [
    { label: t('Signed out'), at: 20 },
    { label: t('Closed'), at: 50 },
    { label: t('Done'), at: 80 },
  ];

  return (
    <div className="app-window aw-calm">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Exit Application')}</h1>
          <p className="aw-desc">{t('Paper White Technology - LMS')}</p>
        </div>
      </div>

      <div className="aw-content" style={{ display: 'grid', placeItems: 'center' }}>
        {showConfirmation && (
          <section className="aw-card aw-fade-in" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
            <div className="aw-card-icon" style={{ margin: '0 auto', width: 52, height: 52, ['--aw-tone' as any]: 'var(--aw-danger)' }}>
              <AlertTriangle size={26} style={{ color: 'var(--aw-danger)' }} />
            </div>
            <h2 className="aw-title" style={{ textAlign: 'center' }}>{t('Exit Application')}</h2>
            <p className="aw-meta">{t('Are you sure you want to exit Paper White Technology - LMS?')}</p>

            <div className="aw-alert aw-alert-danger" role="alert" style={{ textAlign: 'left' }}>
              <div>
                <strong>{t('Important Notice')}</strong>
                <p>{t("All unsaved changes will be lost. Make sure you've saved your work before exiting.")}</p>
              </div>
            </div>

            <div className="aw-btn-row" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary" style={{ flex: 1 }}>
                <X size={14} /> {t('Cancel')}
              </button>
              <button type="button" onClick={handleExit} className="aw-btn aw-btn-danger" style={{ flex: 1 }}>
                <LogOut size={14} /> {t('Exit')}
              </button>
            </div>
          </section>
        )}

        {isExiting && (
          <section className="aw-card aw-fade-in" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
            <div className="aw-card-icon" style={{ margin: '0 auto', width: 52, height: 52 }}>
              <LogOut size={26} />
            </div>
            <h2 className="aw-title" style={{ textAlign: 'center' }}>{t('Goodbye!')}</h2>
            <p className="aw-meta">{t('Thank you for using Paper White Technology')}</p>

            <div className="aw-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('Exit progress')}>
              <span style={{ width: `${progress}%`, transition: 'width .3s linear' }} />
            </div>
            <div className="aw-row" style={{ borderBottom: 0 }}>
              <span className="aw-meta">{currentMessage}</span>
              <strong>{progress}%</strong>
            </div>

            <div className="aw-inline" style={{ justifyContent: 'center', gap: 16 }}>
              {steps.map(step => (
                <span key={step.label} className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: progress > step.at ? 1 : 0.4, transition: 'opacity .3s' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--aw-success)' }} /> {step.label}
                </span>
              ))}
            </div>
            <p className="aw-meta">{t('See you soon!')}</p>
          </section>
        )}
      </div>

      <div className="aw-footer">
        <span>{showConfirmation ? t('Press ESC to cancel') : t('Closing application…')}</span>
        <span>{t('Exit')}</span>
      </div>
    </div>
  );
};

export default ExitOption1;
