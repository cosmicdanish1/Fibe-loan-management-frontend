import React from 'react';
import { LoginForm } from '../auth/components';

const LoginPage: React.FC = () => {
  // The form is a full window on the shared kit: in the frameless logon dialog
  // its header doubles as the drag bar and window controls (see LoginForm's
  // IS_LOGIN_WINDOW branches); in a normal window it is the same layout.
  return <LoginForm />;
};

export default LoginPage;
