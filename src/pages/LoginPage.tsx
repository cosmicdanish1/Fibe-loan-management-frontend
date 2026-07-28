import React from 'react';
import { LoginForm } from '../auth/components';
import { IS_LOGIN_WINDOW } from '../utils/windowIdentity';

const LoginPage: React.FC = () => {
  console.log('[LoginPage] Rendering LoginPage');

  // Logon dialog: the form fills the window. No page background and no
  // centering gutter — those are what made the form look like a card floating
  // inside a second window.
  //
  // The window is frameless, so this bar replaces the OS title bar: it carries
  // the title, provides the drag region, and holds the only close affordance.
  if (IS_LOGIN_WINDOW) {
    const accent = 'var(--accent-color, #ec4899)';

    const handleClose = () => {
      // Closing the logon dialog means the user never signed in — end the app,
      // the same as Cancel.
      (window as any).electronAPI?.quitApp?.();
    };

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div
          style={{
            WebkitAppRegion: 'drag',
            background: accent,
            color: '#fff',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px 0 16px',
            flexShrink: 0,
            userSelect: 'none',
          } as React.CSSProperties}
        >
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
            Fibe Loan Management
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              WebkitAppRegion: 'no-drag',
              width: 32,
              height: 32,
              border: 'none',
              background: 'transparent',
              color: '#fff',
              fontSize: 16,
              lineHeight: 1,
              cursor: 'pointer',
              borderRadius: 4,
            } as React.CSSProperties}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
