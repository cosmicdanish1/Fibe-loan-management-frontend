import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';
import { IS_MAIN_WINDOW } from '../../utils/windowIdentity';

interface ProtectedRouteProps {
  children?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Only show loading on initial mount or when auth state changes
    if (!isLoading) {
      console.log('[ProtectedRoute] Auth state resolved:', { isAuthenticated });
      setIsCheckingAuth(false);
    }
  }, [isLoading, isAuthenticated]);

  // On logout, a child/tool window must NOT show its own login form — it closes
  // itself so re-authentication happens only on the main dashboard window.
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !IS_MAIN_WINDOW) {
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

  // If not authenticated:
  //  - Main dashboard window → show the login form.
  //  - Child/tool window → render a neutral placeholder while it closes (the
  //    effect above triggers the close); never show a login form here.
  if (!isAuthenticated) {
    if (!IS_MAIN_WINDOW) {
      console.log('[ProtectedRoute] Not authenticated in child window — closing, no login shown');
      return (
        <div className="flex items-center justify-center min-h-screen text-gray-500">
          <Spin size="large" tip="Signing out…">
            <div className="w-full h-32" />
          </Spin>
        </div>
      );
    }

    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          message: 'Please log in to continue'
        }}
        replace
      />
    );
  }

  // If authenticated, render the protected content
  console.log('[ProtectedRoute] User authenticated, rendering protected content');

  // Render protected content
  console.log('[ProtectedRoute] Rendering protected content');
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
