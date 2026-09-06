import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import { AuthContextType, AuthState, User, LoginCredentials } from '../types/auth.types';
import { apiService } from '../../services/api';
import { IS_MAIN_WINDOW } from '../../utils/windowIdentity';

type AuthAction =
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Inactivity timeout logic removed as per user request


// Id of the current app launch, supplied by the Electron main process (see
// main.ts APP_RUN_ID). Undefined when running in a plain browser.
const APP_RUN_ID: string | undefined = (window as any).electronAPI?.appRunId;

// Every key that makes up a logged-in session, including the API tokens.
const SESSION_KEYS = [
  'isAuthenticated',
  'user',
  'sessionStartTime',
  'lastActivity',
  'accessToken',
  'refreshToken',
  'appRunId',
];

const clearStoredSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  // Also drop the token ApiService holds in memory, which localStorage removal
  // alone would leave behind.
  apiService.clearAuth();
};

// A stored session only counts if it was created by THIS run of the app.
// Closing and reopening the app mints a new run id, so the old session is
// rejected here and the user has to log in again.
//
// In a browser there is no run id, so this check is skipped and the previous
// persist-across-reload behaviour is kept for dev.
const isSessionFromCurrentRun = (): boolean => {
  if (!APP_RUN_ID) return true;
  return localStorage.getItem('appRunId') === APP_RUN_ID;
};

// Check authentication state
const getInitialState = (): AuthState => {
  const currentTime = Date.now();

  // Discard anything left over from a previous launch before reading it.
  if (!isSessionFromCurrentRun()) {
    console.log('[Auth] Session belongs to a previous app run — requiring login');
    clearStoredSession();
  }

  // Update last activity immediately (this window is now active)
  localStorage.setItem('lastActivity', currentTime.toString());

  // Check if session is valid (within 6 hours)
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userData = localStorage.getItem('user');
  const sessionStartTime = localStorage.getItem('sessionStartTime');

  if (isAuthenticated && userData && sessionStartTime) {
    try {
      // Check if session is still valid (Absolute limit removed)
      const user = JSON.parse(userData);
      console.log('[Auth] Found valid session for user:', user.username);

      return {
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      console.error('[Auth] Error parsing session data:', error);
      clearStoredSession();
    }
  }

  // No valid session found
  console.log('[Auth] No valid session found');
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialState();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  console.log('[AuthReducer] Processing action:', action.type, { payload: action.type === 'LOGIN_SUCCESS' ? { ...action.payload, password: '***' } : action });

  switch (action.type) {
    case 'LOGIN_REQUEST':
      return { ...state, isLoading: true, error: null };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload,
        error: null
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: action.payload,
      };

    case 'LOGOUT':
      // NOT `...initialState` — that's a module-level constant captured once at
      // app startup (whatever the session was AT THAT TIME), so spreading it
      // here just restored the pre-logout logged-in state instead of clearing
      // it, silently no-opping every logout.
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('[AuthProvider] Initializing AuthProvider');

  // Initialize state with loading true
  const [state, dispatch] = useReducer(authReducer, {
    ...initialState,
    isLoading: true
  });

  // Activity monitoring removed as per user request

  // Cross-window logout channel. When any window logs out (explicitly or via
  // session expiry), every other window flips to logged-out so the login form
  // is shown ONLY on the main dashboard window — never on a tool window.
  const authChannelRef = useRef<BroadcastChannel | null>(null);

  // Clear any existing session
  const clearSession = () => {
    console.log('[Auth] Clearing existing session');
    clearStoredSession();
  };

  // Set up the cross-window logout channel (must run before the session-expiry
  // listener below so the channel ref is available to it).
  useEffect(() => {
    const bc = new BroadcastChannel('lms_auth');
    authChannelRef.current = bc;
    bc.onmessage = (e) => {
      if (e.data?.type === 'logout') {
        console.log('[Auth] Received cross-window logout');
        dispatch({ type: 'LOGOUT' });
        // Child windows close themselves via ProtectedRoute; the sender already
        // asked the main process to tidy up, so we don't re-broadcast here.
      }
    };
    return () => { bc.close(); authChannelRef.current = null; };
  }, []);

  // Initialize auth state on component mount
  useEffect(() => {
    // Listen for session expiry triggered by API service
    const handleSessionExpired = () => {
      console.log('[Auth] Session expired — forcing logout');
      dispatch({ type: 'LOGOUT' });
      // BUG FIX: this used to also call authLogout() (app.quit()) unconditionally,
      // so a single child/tool window's own background token-refresh failure
      // could kill the ENTIRE application out from under every other open
      // window — reproduced via the LogOut User admin screen. ProtectedRoute's
      // own isAuthenticated effect already does the correct per-window thing
      // (dashboard: quit; child window: close just itself), so only broadcast
      // to other windows when the shared session itself is what ended — i.e.
      // this is the dashboard. A lone child window's own hiccup should only
      // take itself down, not the whole app.
      if (IS_MAIN_WINDOW) {
        authChannelRef.current?.postMessage({ type: 'logout' });
      }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state');

        // Same guard as getInitialState — a session from an earlier launch of
        // the app must never be restored.
        if (!isSessionFromCurrentRun()) {
          console.log('[Auth] Stale session from previous app run - showing login form');
          clearStoredSession();
          dispatch({ type: 'LOGOUT' });
          return;
        }

        // Check if we have a valid session from getInitialState
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const userData = localStorage.getItem('user');
        const sessionStartTime = localStorage.getItem('sessionStartTime');

        if (isAuthenticated && userData && sessionStartTime) {
          try {
            // Session is valid if authenticated (Absolute limit removed)
            const user = JSON.parse(userData);
            console.log('[Auth] Restoring valid session for user:', user.username);
            dispatch({ type: 'LOGIN_SUCCESS', payload: user });
            return;
          } catch (error) {
            console.error('[Auth] Error restoring session:', error);
            clearSession();
          }
        }

        // No valid session
        console.log('[Auth] No valid session - showing login form');
        dispatch({ type: 'LOGOUT' });
      } catch (error) {
        console.error('[Auth] Error during initialization:', error);
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: 'Failed to initialize authentication'
        });
      }
    };

    initializeAuth();
  }, []);

  // Session timeout checker removed as per user request


  // Login function
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    console.log('[Auth] Login attempt with credentials:', { username: credentials.username });
    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      // Login with the backend API
      console.log('[Auth] Attempting backend API login...');
      const apiResponse = await apiService.login(credentials);

      if (apiResponse.success && apiResponse.data) {
        // The response.data contains the auth response with user, accessToken, etc.
        const userData = apiResponse.data.user;

        if (!userData) {
          console.error('[Auth] No user data in response:', apiResponse.data);
          throw new Error('Invalid response structure: missing user data');
        }

        console.log('[Auth] Backend API login successful!', {
          username: userData.username,
          role: userData.role,
          permissions: userData.permissions
        });

        // Store session data with start time
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('sessionStartTime', Date.now().toString());
        localStorage.setItem('lastActivity', Date.now().toString());
        // Tie the session to this launch — see isSessionFromCurrentRun.
        if (APP_RUN_ID) localStorage.setItem('appRunId', APP_RUN_ID);

        console.log('[Auth] Session started at:', new Date().toLocaleString());
        // Absolute expiry removed

        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });

        // Hand off to the dashboard. The session is already in localStorage
        // above, and the dashboard window shares that storage (same origin), so
        // it reads the session itself — nothing is passed through this call.
        // No-op outside the logon dialog (e.g. in a plain browser).
        (window as any).electronAPI?.loginSuccess?.();

        return true;
      } else {
        throw new Error(apiResponse.error || 'Backend login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to connect to server. Please ensure the backend is running.';

      console.error('[Auth] Login error:', errorMessage);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Logout function
  const logout = (): void => {
    console.log('[Auth] Logging out');
    const currentUser = state.user?.username || 'unknown';
    console.log(`[Auth] Logging out user: ${currentUser}`);

    clearSession();
    dispatch({ type: 'LOGOUT' });

    // Flip every other window to logged-out. ProtectedRoute's own
    // isAuthenticated effect handles this window's own teardown (quit if
    // it's the dashboard, close if it's a child window) — this only needs
    // to notify the others. The explicit Logout button only exists in the
    // dashboard's UserProfileMenu today, so IS_MAIN_WINDOW is true here in
    // practice, but the guard keeps this correct if that ever changes.
    if (IS_MAIN_WINDOW) {
      authChannelRef.current?.postMessage({ type: 'logout' });
    }

    console.log('[Auth] User session cleared');
  };

  // Clear error function
  const clearError = (): void => {
    console.log('[Auth] Clearing error');
    dispatch({ type: 'CLEAR_ERROR' });
  };

  console.log('[AuthProvider] Rendering with state:', state);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
