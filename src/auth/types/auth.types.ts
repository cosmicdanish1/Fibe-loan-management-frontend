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
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}
