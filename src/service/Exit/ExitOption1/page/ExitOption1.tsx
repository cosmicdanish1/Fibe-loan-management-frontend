import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertTriangle, CheckCircle2, X } from 'lucide-react';

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

const ExitOption1: React.FC = () => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExit = useCallback(() => {
    setIsExiting(true);
    setShowConfirmation(false);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);

          if (window.electronAPI) {
            window.electronAPI.quitApp();
            setTimeout(() => {
              if (window.electronAPI) {
                window.electronAPI.forceQuitApp();
              }
            }, 1000);
          }
          else if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('app-quit');
            setTimeout(() => {
              if (window.electron?.ipcRenderer) {
                window.electron.ipcRenderer.send('app-quit-force');
              }
            }, 1000);
          }
          else if (window.opener) {
            window.close();
          } else {
            try {
              window.open('', '_self', '');
              window.close();
            } catch (e) {
              // Silent fail
            }
          }

          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(interval);
  }, []);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const exitMessages = useMemo(() => [
    'Saving your session...',
    'Closing connections...',
    'Finalizing data...',
    'Almost done...',
    'See you soon!'
  ], []);

  const currentMessage = useMemo(() => {
    const index = Math.floor((progress / 100) * exitMessages.length);
    return exitMessages[Math.min(index, exitMessages.length - 1)];
  }, [progress, exitMessages]);

  const steps = [
    { label: 'Saved', at: 20 },
    { label: 'Closed', at: 50 },
    { label: 'Done', at: 80 },
  ];

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Exit Application</h1>
          <p className="aw-desc">Paper White Technology - LMS</p>
        </div>
      </div>

      <div className="aw-content" style={{ display: 'grid', placeItems: 'center' }}>
        {showConfirmation && (
          <section className="aw-card aw-fade-in" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
            <div className="aw-card-icon" style={{ margin: '0 auto', width: 52, height: 52, ['--aw-tone' as any]: 'var(--aw-danger)' }}>
              <AlertTriangle size={26} style={{ color: 'var(--aw-danger)' }} />
            </div>
            <h2 className="aw-title" style={{ textAlign: 'center' }}>Exit Application</h2>
            <p className="aw-meta">Are you sure you want to exit Paper White Technology - LMS?</p>

            <div className="aw-alert aw-alert-danger" role="alert" style={{ textAlign: 'left' }}>
              <div>
                <strong>Important Notice</strong>
                <p>All unsaved changes will be lost. Make sure you've saved your work before exiting.</p>
              </div>
            </div>

            <div className="aw-btn-row" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary" style={{ flex: 1 }}>
                <X size={14} /> Cancel
              </button>
              <button type="button" onClick={handleExit} className="aw-btn aw-btn-danger" style={{ flex: 1 }}>
                <LogOut size={14} /> Exit
              </button>
            </div>
          </section>
        )}

        {isExiting && (
          <section className="aw-card aw-fade-in" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
            <div className="aw-card-icon" style={{ margin: '0 auto', width: 52, height: 52 }}>
              <LogOut size={26} />
            </div>
            <h2 className="aw-title" style={{ textAlign: 'center' }}>Goodbye!</h2>
            <p className="aw-meta">Thank you for using Paper White Technology</p>

            <div className="aw-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Exit progress">
              <span style={{ width: `${progress}%`, transition: 'width .3s linear' }} />
            </div>
            <div className="aw-row" style={{ borderBottom: 0 }}>
              <span className="aw-meta">{currentMessage}</span>
              <strong>{progress}%</strong>
            </div>

            <div className="aw-inline" style={{ justifyContent: 'center', gap: 16 }}>
              {steps.map(step => (
                <span key={step.label} className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: progress > step.at ? 1 : 0.4, transition: 'opacity .3s' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--aw-success)' }} /> {step.label}
                </span>
              ))}
            </div>
            <p className="aw-meta">See you soon!</p>
          </section>
        )}
      </div>

      <div className="aw-footer">
        <span>{showConfirmation ? 'Press ESC to cancel' : 'Closing application…'}</span>
        <span>Exit</span>
      </div>
    </div>
  );
};

export default ExitOption1;
