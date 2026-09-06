import React, { ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';
import { IS_MAIN_WINDOW } from '../../utils/windowIdentity';
import { ROUTE_TO_ACTION, isActionAllowed } from '../../config/menuActions';

interface ProtectedRouteProps {
  children?: ReactNode;
}

const AccessDenied: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen text-center gap-3 px-6">
    <p className="text-lg font-semibold text-slate-700">Access Denied</p>
    <p className="text-sm text-slate-500 max-w-sm">
      Your role does not have rights to this screen. Ask an administrator to grant
      access via Configure UserLevel Default Rights.
    </p>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Only show loading on initial mount or when auth state changes
    if (!isLoading) {
      console.log('[ProtectedRoute] Auth state resolved:', { isAuthenticated });
      setIsCheckingAuth(false);
    }
  }, [isLoading, isAuthenticated]);

  // Losing the session tears this window down:
  //  - child/tool window → close just that window
  //  - dashboard         → close the dashboard; the main process reopens the
  //                        login dialog in its place (see the 'auth-logout'
  //                        IPC handler in main.ts) so the user lands back on
  //                        the logon screen without relaunching the app.
  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    if (IS_MAIN_WINDOW) {
      console.log('[ProtectedRoute] Session lost on the dashboard — returning to login');
      (window as any).electronAPI?.authLogout?.();
      // Closing the dashboard can stall if another open window (e.g. a
      // report/tool window) is slow to close, leaving this window sitting on
      // the "Signing out…" placeholder. Force-exit after a grace period as a
      // last resort — same fallback ExitOption1 uses. This only fires if this
      // renderer is somehow still alive after the grace period; normally the
      // dashboard window (and this effect with it) is gone well before then.
      const forceTimer = setTimeout(() => {
        console.log('[ProtectedRoute] Graceful teardown did not complete — forcing exit');
        (window as any).electronAPI?.forceQuitApp?.();
      }, 1500);
      return () => clearTimeout(forceTimer);
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

  // Menu-level rights check — only applies to windows with a mapped action
  // (ROUTE_TO_ACTION); dashboard, login, settings, etc. are never gated. This
  // catches direct navigation to a window the Navbar already hid (e.g. a
  // stale shortcut, or IPC deep link), since hiding the menu item alone
  // doesn't stop the route itself from rendering.
  const routeAction = ROUTE_TO_ACTION[location.pathname];
  if (routeAction && !isActionAllowed(user?.allowedActions, routeAction)) {
    console.log('[ProtectedRoute] Access denied for route:', location.pathname);
    return <AccessDenied />;
  }

  // If authenticated, render the protected content
  console.log('[ProtectedRoute] User authenticated, rendering protected content');

  // Render protected content
  console.log('[ProtectedRoute] Rendering protected content');
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
