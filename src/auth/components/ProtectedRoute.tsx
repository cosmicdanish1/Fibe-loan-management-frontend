import React, { ReactNode, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';
import { IS_MAIN_WINDOW } from '../../utils/windowIdentity';

interface ProtectedRouteProps {
  children?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Only show loading on initial mount or when auth state changes
    if (!isLoading) {
      console.log('[ProtectedRoute] Auth state resolved:', { isAuthenticated });
      setIsCheckingAuth(false);
    }
  }, [isLoading, isAuthenticated]);

  // Losing the session tears the app down rather than showing a login form:
  //  - child/tool window → close just that window
  //  - dashboard         → quit, since login now lives in its own dialog that
  //                        only exists at startup, so there is nothing to
  //                        return to. Relaunching brings the dialog back.
  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    if (IS_MAIN_WINDOW) {
      console.log('[ProtectedRoute] Session lost on the dashboard — quitting');
      (window as any).electronAPI?.authLogout?.();
    } else {
      console.log('[ProtectedRoute] Logged out in a child window — closing it');
      (window as any).electronAPI?.closeWindow?.();
    }
  }, [isLoading, isAuthenticated]);

  // Show loading spinner while checking auth state
  if (isLoading || isCheckingAuth) {
    console.log('[ProtectedRoute] Checking authentication status...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Verifying session...">
          <div className="w-full h-32" />
        </Spin>
      </div>
    );
  }

  // Not authenticated — never render a login form here. The effect above is
  // already closing this window (or quitting); show a neutral placeholder until
  // it does.
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated — tearing down, no login shown');
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        <Spin size="large" tip="Signing out…">
          <div className="w-full h-32" />
        </Spin>
      </div>
    );
  }

  // If authenticated, render the protected content
  console.log('[ProtectedRoute] User authenticated, rendering protected content');

  // Render protected content
  console.log('[ProtectedRoute] Rendering protected content');
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
