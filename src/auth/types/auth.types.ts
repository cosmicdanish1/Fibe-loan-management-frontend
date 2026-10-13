export interface User {
  id: number;
  username: string;
  email?: string;
  role?: string;
  permissions?: string[];
  /** Navbar action codes this user may open (menu-level rights from Configure
   * UserLevel Default Rights). null/undefined means unrestricted. */
  allowedActions?: string[] | null;
}

/** Returned by login() when the password was right but a second step is required. */
export interface TwoFaChallenge {
  mode: 'verify' | 'enrol';
  challengeToken: string;
  username: string;
  /** >0 when the admin allows "remember this device" (days) */
  rememberDays: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean | TwoFaChallenge>;
  /** Completes a login from a full auth response (used after the 2FA step). */
  finishLogin: (authData: any) => boolean;
  logout: () => void;
  clearError: () => void;
}
