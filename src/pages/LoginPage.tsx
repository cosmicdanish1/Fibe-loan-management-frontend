import React from 'react';
import { LoginForm } from '../auth/components';
import { IS_LOGIN_WINDOW } from '../utils/windowIdentity';

const LoginPage: React.FC = () => {
  console.log('[LoginPage] Rendering LoginPage');

  // Logon dialog: the form fills the window, and draws its own dark title
  // bar (app name, minimize, close, drag region) — the window is frameless,
  // so LoginForm supplies the only chrome there is. See LoginForm's
  // IS_LOGIN_WINDOW branch.
  if (IS_LOGIN_WINDOW) {
    return <LoginForm />;
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
