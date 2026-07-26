import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import { AuthContextType, AuthState, User, LoginCredentials } from '../types/auth.types';
import { apiService } from '../../services/api';

type AuthAction =
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Inactivity timeout logic removed as per user request


// Check authentication state
const getInitialState = (): AuthState => {
  const currentTime = Date.now();

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
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('lastActivity');
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
      return {
        ...initialState,
        isLoading: false
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

  // Ask the main (Electron) process to close all child windows and focus the
  // dashboard. No-op in a plain browser.
  const closeChildWindowsAndFocusMain = () => {
    (window as any).electronAPI?.authLogout?.();
  };

  // Clear any existing session
  const clearSession = () => {
    console.log('[Auth] Clearing existing session');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStartTime');
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
      authChannelRef.current?.postMessage({ type: 'logout' });
      closeChildWindowsAndFocusMain();
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state');

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

        console.log('[Auth] Session started at:', new Date().toLocaleString());
        // Absolute expiry removed

        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
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

    // Flip every other window to logged-out, then have the main process close
    // child windows and focus the dashboard so login shows only there.
    authChannelRef.current?.postMessage({ type: 'logout' });
    closeChildWindowsAndFocusMain();

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
