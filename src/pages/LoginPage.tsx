import React from 'react';
import { LoginForm } from '../auth/components';

const LoginPage: React.FC = () => {
  console.log('[LoginPage] Rendering LoginPage');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
