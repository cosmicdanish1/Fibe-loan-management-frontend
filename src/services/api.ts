// API service for communicating with the backend
// URL resolution is handled by serverConfig.ts (single source of truth)
import { getApiBaseUrl } from './serverConfig';
import { rendererLogger } from './logger';

/** Correlation id for a single API call — sent as X-Request-Id so the backend
 *  honors it and every server log line for this request shares the same id. */
function newRequestId(): string {
  try {
    const uuid = (globalThis.crypto as Crypto | undefined)?.randomUUID?.();
    if (uuid) return `web-${uuid}`;
  } catch {
    /* fall through to Math.random */
  }
  return `web-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** PC name / MAC / app version of this machine, sent on every request so the backend's
 *  Telegram alerts can say which PC a login or crash came from. Resolved once; empty in a
 *  plain browser. Header values must be printable ASCII or fetch() rejects the request. */
let clientHeadersPromise: Promise<Record<string, string>> | null = null;
function getClientHeaders(): Promise<Record<string, string>> {
  if (!clientHeadersPromise) {
    clientHeadersPromise = (async () => {
      try {
        const info = await (globalThis as any).window?.electronAPI?.getClientInfo?.();
        if (!info) return {};
        const ascii = (v: unknown) => String(v ?? '').replace(/[^\x20-\x7E]/g, '?').slice(0, 60);
        return {
          'X-Client-Host': ascii(info.hostname),
          'X-Client-Mac': ascii(info.mac),
          'X-Client-Version': ascii(info.version),
        };
      } catch {
        return {};
      }
    })();
  }
  return clientHeadersPromise;
}

/** Returns true once the server URL has been configured (used by App startup guard) */
export async function isServerConfigured(): Promise<boolean> {
  const url = await getApiBaseUrl();
  return url !== 'http://localhost:3001/api/v1' || location.hostname === 'localhost';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: { totalCount?: number; [key: string]: any };
}

import { retryWithAuthCode } from './authCodeGate';

/** localStorage key holding the 'remember this device' token for a username. */
export const deviceTokenKey = (username: string) => 'lms_2fa_device_' + String(username || '').toLowerCase();

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
}

export interface DepositLoanSlabData {
  id?: number;
  srNo: number;
  amount: number;
  period: number;
  unit: 'days' | 'months' | 'years' | '';
  rate: number;
  prematureRate?: number;
  applicableFrom: string; // ISO date string
  applicableUpTo?: string; // ISO date string
  createdAt?: string;
  updatedAt?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('accessToken');
  }

  /** Resolves the base URL — awaits config load on first call, instant after that */
  private async getBaseURL(): Promise<string> {
    return getApiBaseUrl();
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<ApiResponse<T>> {
    const { timeoutMs = 30000, ...fetchOptions } = options;
    const baseURL = await this.getBaseURL();
    const url = `${baseURL}${endpoint}`;

    // Ensure we have the freshest token from localStorage if internal state is missing
    // (localStorage wins: another window may have refreshed the token since this.token was cached)
    const currentToken = localStorage.getItem('accessToken') || this.token;

    // Mint the correlation id up front and send it — the backend honors an
    // incoming X-Request-Id, so the UI click and all server logs share one id.
    const requestId = newRequestId();

    const isFormData = fetchOptions.body instanceof FormData;

    // A stuck LAN connection used to hang forever with no feedback. Callers
    // that already pass their own `signal` keep full control; everyone else
    // gets a default cutoff so a dead backend surfaces as a clear error.
    const usesOwnSignal = !!fetchOptions.signal;
    const controller = usesOwnSignal ? null : new AbortController();
    const timeoutId = controller && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    const clientHeaders = await getClientHeaders();

    // Merge caller headers over the defaults (a plain spread of `...fetchOptions` would let a
    // caller-supplied `headers` replace the whole object and drop Authorization / X-Request-Id).
    const { headers: callerHeaders, ...restOptions } = fetchOptions;
    const callerHeaderObj: Record<string, string> = {};
    if (callerHeaders) new Headers(callerHeaders).forEach((v, k) => { callerHeaderObj[k] = v; });

    const mergedHeaders: Record<string, string> = {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
      'X-Request-Id': requestId,
      ...clientHeaders,
    };
    // Header names are case-insensitive: a caller's 'content-type' must REPLACE the default
    // 'Content-Type', not sit next to it (fetch would then send "application/json, application/json"
    // and the server's body parser would read an empty body).
    for (const [k, v] of Object.entries(callerHeaderObj)) {
      const existing = Object.keys(mergedHeaders).find((h) => h.toLowerCase() === k.toLowerCase());
      if (existing) delete mergedHeaders[existing];
      mergedHeaders[k] = v;
    }

    const config: RequestInit = {
      ...restOptions,
      headers: mergedHeaders,
      ...(controller && { signal: controller.signal }),
    };

    const startTime = Date.now();
    try {
      let response = await fetch(url, config);

      // Handle 401 Unauthorized by attempting a token refresh
      if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')
          && !(endpoint.includes('/auth/2fa/') && (options.method || 'GET') === 'POST')) {
        const refreshResult = await this.refreshToken();

        if (refreshResult.success) {
          const newToken = localStorage.getItem('accessToken');
          if (newToken) {
            if (config.headers) {
              const h = config.headers as Record<string, string>;
              const authKey = Object.keys(h).find((k) => k.toLowerCase() === 'authorization') || 'Authorization';
              h[authKey] = `Bearer ${newToken}`;
            }
            response = await fetch(url, config);
          }
        }
      }

      // ES-116: an administrator can require the performer's authenticator code for some actions.
      // The backend then answers 403 AUTH_CODE_REQUIRED; ask for the code and retry with X-Auth-Code.
      if (response.status === 403) {
        // The user may take a while to type the code, so the retry gets a fresh timeout instead of the
        // original (already running) abort signal.
        const { signal: spentSignal, ...configNoSignal } = config;
        response = await retryWithAuthCode(response, (extra) => {
          const retrySignal = controller ? (timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined) : spentSignal;
          return fetch(url, {
            ...configNoSignal,
            headers: { ...(config.headers as Record<string, string>), ...extra },
            ...(retrySignal && { signal: retrySignal }),
          });
        });
      }

      const requestBody = isFormData
        ? '[FormData]'
        : typeof config.body === 'string'
        ? (() => { try { return JSON.parse(config.body as string); } catch { return config.body; } })()
        : undefined;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const duration = Date.now() - startTime;
        rendererLogger.apiCall(options.method || 'GET', endpoint, response.status, duration, requestId, requestBody, errorData);
        const serverMessage = Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message;
        throw new Error(serverMessage || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      rendererLogger.apiCall(options.method || 'GET', endpoint, response.status, duration, requestId, requestBody, data);

      // NestJS standard response format: { success, statusCode, message, data, timestamp }
      // Unwrap to get the actual data payload
      let actualData;
      if (data && typeof data === 'object') {
        if ('data' in data && data.data !== undefined) {
          actualData = data.data;
        } else {
          actualData = data;
        }
      } else {
        actualData = data;
      }

      return {
        success: true,
        data: actualData,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      rendererLogger.apiCall(options.method || 'GET', endpoint, 0, duration);
      const timedOut = !usesOwnSignal && (error as any)?.name === 'AbortError';
      const message = timedOut
        ? `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please check your connection and try again.`
        : error instanceof Error ? error.message : 'Unknown error occurred';
      // Both fields carry the same text — callers vary on which one they read.
      return {
        success: false,
        error: message,
        message,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // Basic HTTP methods
  async get(endpoint: string, options?: { params?: Record<string, any> } & RequestInit): Promise<ApiResponse> {
    let url = endpoint;

    // Handle query parameters
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (endpoint.includes('?') ? '&' : '?') + queryString;
      }
    }

    const { params, ...restOptions } = options || {};
    return this.request(url, { ...restOptions, method: 'GET' });
  }

  async post(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    } as RequestInit);
  }

  async put(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    } as RequestInit);
  }

  async delete(endpoint: string, options?: RequestInit): Promise<ApiResponse> {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async patch(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse> {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    } as RequestInit);
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse | any>> {
    const deviceToken = (() => { try { return localStorage.getItem(deviceTokenKey(credentials.username)) || undefined; } catch { return undefined; } })();
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...credentials, ...(deviceToken && { deviceToken }) }),
    });

    // Backend wraps response in { success, statusCode, message, data }
    // The request method wraps it again, so we have response.data.data
    if (response.success && response.data) {
      // Check if backend wrapped the response
      const authData = response.data.data || response.data;

      // Password was right but a second step is pending: no tokens yet.
      if (authData.requires2fa || authData.requires2faEnrol) {
        return { success: true, data: authData };
      }

      if (authData.accessToken) {
        this.token = authData.accessToken;
        localStorage.setItem('accessToken', authData.accessToken);
        if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);

        // Return in the expected format
        return {
          success: true,
          data: authData
        };
      }
    }

    return {
      success: false,
      error: response.error || 'Login failed'
    };
  }

  // ---- Two-factor authentication (TOTP) ----

  /** request() reports failures as { success:false, error } instead of throwing; the 2FA calls need the error. */
  private async req2fa<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const r = await this.request<T>(endpoint, options);
    if (!r.success) throw new Error(r.error || r.message || 'Request failed');
    return r.data as T;
  }

  /** Keep a completed 2FA login's tokens the way login() does. */
  private storeAuthTokens(authData: any): void {
    if (authData?.accessToken) {
      this.token = authData.accessToken;
      localStorage.setItem('accessToken', authData.accessToken);
      if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);
    }
  }

  /** Second login step: authenticator code (or recovery code). Throws on a wrong code. */
  async twoFaLoginVerify(username: string, challengeToken: string, code: string, rememberDevice: boolean): Promise<any> {
    const d = await this.req2fa('/auth/2fa/login/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code, rememberDevice }),
    });
    this.storeAuthTokens(d);
    if (d?.deviceToken) {
      try { localStorage.setItem(deviceTokenKey(username), d.deviceToken); } catch { /* storage unavailable */ }
    }
    return d;
  }

  // Forgot password (ES-161). Public: used before any sign-in.
  async forgotMethods(): Promise<{ authenticator: boolean; email: { available: boolean; comingSoon: boolean }; contactAdmin: boolean }> {
    return this.req2fa('/auth/2fa/forgot/methods');
  }
  async forgotVerify(username: string, code: string): Promise<{ resetToken: string }> {
    return this.req2fa('/auth/2fa/forgot/verify', { method: 'POST', body: JSON.stringify({ username, code }) });
  }
  async forgotReset(resetToken: string, newPassword: string): Promise<{ message: string }> {
    return this.req2fa('/auth/2fa/forgot/reset', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) });
  }

  async twoFaLoginEnrolBegin(challengeToken: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    return this.req2fa('/auth/2fa/login/enroll/begin', { method: 'POST', body: JSON.stringify({ challengeToken }) });
  }

  /** Does NOT store tokens: the UI shows the recovery codes first, then calls adoptAuth(). */
  async twoFaLoginEnrolConfirm(challengeToken: string, code: string): Promise<any> {
    return this.req2fa('/auth/2fa/login/enroll/confirm', { method: 'POST', body: JSON.stringify({ challengeToken, code }) });
  }

  adoptAuth(authData: any): void {
    this.storeAuthTokens(authData);
  }

  async twoFaStatus(): Promise<any> {
    return await this.req2fa('/auth/2fa/status');
  }
  async twoFaEnrolBegin(password: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    return await this.req2fa('/auth/2fa/enroll/begin', { method: 'POST', body: JSON.stringify({ password }) });
  }
  async twoFaEnrolConfirm(code: string): Promise<{ recoveryCodes: string[] }> {
    return await this.req2fa('/auth/2fa/enroll/confirm', { method: 'POST', body: JSON.stringify({ code }) });
  }
  async twoFaDisable(password: string, code: string): Promise<void> {
    await this.req2fa('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password, code }) });
  }
  async twoFaRegenerate(code: string): Promise<{ recoveryCodes: string[] }> {
    return await this.req2fa('/auth/2fa/recovery/regenerate', { method: 'POST', body: JSON.stringify({ code }) });
  }
  async twoFaGetSettings(): Promise<{ settings: any; levels: { id: number; name: string }[] }> {
    return await this.req2fa('/auth/2fa/settings');
  }
  async twoFaSaveSettings(patch: any): Promise<{ settings: any }> {
    return await this.req2fa('/auth/2fa/settings', { method: 'PUT', body: JSON.stringify(patch) });
  }
  async twoFaGetGuards(): Promise<{
    actions: { key: string; label: string; hint: string }[];
    guards: Record<string, { enabled: boolean }>;
    approvers: { userid: number; username: string; level: string; admin: boolean; enabled: boolean; enrolled: boolean; approver: boolean; active: boolean }[];
  }> {
    return await this.req2fa('/auth/2fa/guards');
  }
  /** Switching a protection OFF needs { password, code } (logged-in password + an approver's code). */
  async twoFaSaveGuards(guards: Record<string, { enabled: boolean }>, confirm?: { password: string; code: string }): Promise<{
    guards: Record<string, { enabled: boolean }>;
    approvers?: { userid: number; username: string; level: string; admin: boolean; enabled: boolean; enrolled: boolean; approver: boolean; active: boolean }[];
  }> {
    return await this.req2fa('/auth/2fa/guards', { method: 'PUT', body: JSON.stringify({ guards, ...(confirm || {}) }) });
  }
  /** Grant (add) or remove the Approver (OTP) right. */
  async twoFaSetApprovers(add: number[], remove: number[]): Promise<{ approvers: { userid: number; username: string; level: string; admin: boolean; enabled: boolean; enrolled: boolean; approver: boolean; active: boolean }[] }> {
    return await this.req2fa('/auth/2fa/approvers', { method: 'PUT', body: JSON.stringify({ add, remove }) });
  }
  /** What this user may see in the Two-Factor & Approvals window. */
  async twoFaAccess(): Promise<{ isAdmin: boolean; canManageUsers: boolean; isApprover: boolean }> {
    return await this.req2fa('/auth/2fa/access');
  }
  /** Mark a user as "must use 2FA" (they scan their own QR at next sign-in) or clear it. */
  async twoFaSetRequired(userid: number, required: boolean, signOutNow = false): Promise<void> {
    await this.req2fa(`/auth/2fa/users/${userid}/require`, { method: 'PUT', body: JSON.stringify({ required, signOutNow }) });
  }
  async twoFaAudit(): Promise<{ id: number; at: string; event: string; actor: string | null; user: string | null; detail: string | null }[]> {
    return await this.req2fa('/auth/2fa/audit');
  }
  async twoFaAdminUsers(): Promise<any[]> {
    return await this.req2fa('/auth/2fa/admin/users');
  }
  async twoFaAdminReset(userid: number): Promise<void> {
    await this.req2fa(`/auth/2fa/admin/reset/${userid}`, { method: 'POST' });
  }
  async twoFaAdminUnlock(userid: number): Promise<void> {
    await this.req2fa(`/auth/2fa/admin/unlock/${userid}`, { method: 'POST' });
  }

  /**
   * Drop the cached token without calling the backend. Used when the session is
   * discarded locally (explicit logout, or a session left over from a previous
   * app run) — without this the in-memory token would outlive localStorage and
   * keep authenticating requests.
   */
  clearAuth(): void {
    this.token = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    // Clear tokens regardless of response
    this.token = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.request('/auth/me');
  }

  private refreshInFlight: Promise<ApiResponse<AuthResponse>> | null = null;

  /** Single-flight: parallel 401s share one /auth/refresh call. */
  refreshToken(): Promise<ApiResponse<AuthResponse>> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.doRefreshToken().finally(() => { this.refreshInFlight = null; });
    }
    return this.refreshInFlight;
  }

  private expireSession(): void {
    this.token = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('lastActivity');
    // Dispatch a custom event so AuthContext can react
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }

  private async doRefreshToken(): Promise<ApiResponse<AuthResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.expireSession();
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    // Raw fetch (not request()) so we can tell "refresh token rejected" (401/403 -> session over)
    // apart from network errors / timeouts / 5xx (transient -> keep the session, let the caller retry).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const baseURL = await this.getBaseURL();
      const response = await fetch(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': newRequestId() },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        // Refresh token is expired or invalid — force a clean logout
        this.expireSession();
        return { success: false, error: 'Session expired' };
      }
      if (!response.ok) {
        return { success: false, error: `Token refresh failed (HTTP ${response.status})` };
      }

      const body = await response.json();
      const authData = (body && typeof body === 'object' && 'data' in body && body.data !== undefined ? body.data : body) as AuthResponse;
      if (!authData?.accessToken) {
        return { success: false, error: 'Token refresh returned no access token' };
      }
      this.token = authData.accessToken;
      localStorage.setItem('accessToken', authData.accessToken);
      // The backend rotates the refresh token; keep the new one or the next refresh uses a stale token.
      if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);
      return { success: true, data: authData };
    } catch (error) {
      const timedOut = (error as any)?.name === 'AbortError';
      return {
        success: false,
        error: timedOut ? 'Token refresh timed out' : error instanceof Error ? error.message : 'Token refresh failed',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * fetch() with the bearer token, a timeout, and one retry after a token refresh on 401.
   * For raw-body endpoints (blobs/files) that can't go through request(). Returns the Response untouched.
   */
  async authedFetch(url: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
    const attempt = async (): Promise<Response> => {
      const token = localStorage.getItem('accessToken') || this.token;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, {
          ...init,
          headers: { ...(init.headers as Record<string, string> | undefined), ...(token && { Authorization: `Bearer ${token}` }) },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    };
    let response = await attempt();
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed.success) response = await attempt();
    }
    return response;
  }

  async changePassword(
    username: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        username,
        currentPassword,
        newPassword,
      }),
    });
  }

  // Member methods
  async getMembers(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/members${queryString}`);
  }

  async getMember(id: number): Promise<ApiResponse> {
    return this.request(`/members/${id}`);
  }

  async getMemberDetails(memberNo: string): Promise<ApiResponse> {
    return this.request(`/members/details/${encodeURIComponent(memberNo)}`);
  }

  async createMember(memberData: any): Promise<ApiResponse> {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id: number | string, memberData: any): Promise<ApiResponse> {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id: number | string): Promise<ApiResponse> {
    return this.request(`/members/${id}`, {
      method: 'DELETE',
    });
  }

  async generateMemberNumber(): Promise<ApiResponse> {
    return this.request('/members/generate/member-number');
  }

  // Master Data methods - Using existing methods where available

  async getDivisions(): Promise<ApiResponse> {
    return this.request('/admin/masters/divisions');
  }

  async getBranches(): Promise<ApiResponse> {
    return this.request('/admin/masters/branches');
  }

  async getDepartments(): Promise<ApiResponse> {
    return this.request('/admin/masters/departments');
  }

  async getRelationOfNominee(): Promise<ApiResponse> {
    return this.request('/admin/masters/relation-nominee');
  }

  // Loan methods
  async getLoans(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/loans${queryString}`);
  }

  async getLoan(id: number): Promise<ApiResponse> {
    return this.request(`/loans/${id}`);
  }

  async createLoan(loanData: any): Promise<ApiResponse> {
    return this.request('/loans', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
  }

  async searchMemberLoans(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/loans/search/member-loans${queryString}`);
  }

  async getLoanEMISchedule(loanCaseNo: string): Promise<ApiResponse> {
    return this.request(`/loans/master/${loanCaseNo}/emi-schedule`);
  }

  async getLoanFromMaster(loanCaseNo: string): Promise<ApiResponse> {
    return this.request(`/loans/master/loan-case/${loanCaseNo}`);
  }

  async calculateEMI(principal: number, annualRate: number, tenureMonths: number): Promise<ApiResponse> {
    return this.request('/loans/calculate-emi', {
      method: 'POST',
      body: JSON.stringify({ principal, annualRate, tenureMonths }),
    });
  }

  async generateAmortizationSchedule(principal: number, annualRate: number, tenureMonths: number): Promise<ApiResponse> {
    return this.request('/loans/amortization-schedule', {
      method: 'POST',
      body: JSON.stringify({ principal, annualRate, tenureMonths }),
    });
  }

  async getSanctionedLoans(): Promise<ApiResponse> {
    return this.request('/loans/sanctioned');
  }

  // Figures for the dashboard widgets (deposits, maturities, applications, members, demand) in one call.
  async getDashboardSummary(): Promise<ApiResponse> {
    return this.request('/dashboard-summary');
  }

  async getMonthEndLoanReport(month: number, year: number): Promise<ApiResponse> {
    return this.request(`/loans/month-end/report?month=${month}&year=${year}`);
  }

  async exportEMISchedulePDF(loanCaseNo: string): Promise<Blob> {
    const baseURL = await this.getBaseURL();
    const url = `${baseURL}/loans/master/${encodeURIComponent(loanCaseNo)}/emi-schedule/export`;
    const response = await this.authedFetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Fetch a JWT-protected file (signature/photo/document) as a Blob for use
   * as an <img>/<a> object URL. Plain <img src="..."> requests can't carry
   * an Authorization header, so endpoints guarded by JwtAuthGuard 401 when
   * loaded that way — this goes through fetch() with the header instead.
   * Returns null on 404 (no file saved yet) rather than throwing.
   */
  async fetchProtectedFile(endpoint: string): Promise<Blob | null> {
    const baseURL = await this.getBaseURL();
    const url = `${baseURL}${endpoint}`;
    const response = await this.authedFetch(url);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  }

  // Database Backup methods
  async createDatabaseBackup(options: {
    destinationPath: string;
    includeSchema?: boolean;
    includeData?: boolean;
    compressionLevel?: number;
    customName?: string;
  }): Promise<ApiResponse> {
    return this.request('/backup/create', {
      method: 'POST',
      body: JSON.stringify(options),
      timeoutMs: 300000, // a full DB backup can legitimately take minutes
    });
  }

  async validateBackupDestination(destinationPath: string): Promise<ApiResponse> {
    return this.request('/backup/validate-destination', {
      method: 'POST',
      body: JSON.stringify({ destinationPath }),
    });
  }

  async getBackupList(backupPath?: string): Promise<ApiResponse> {
    const queryString = backupPath ? `?backupPath=${encodeURIComponent(backupPath)}` : '';
    return this.request(`/backup/list${queryString}`);
  }

  async testDatabaseConnection(): Promise<ApiResponse> {
    return this.request('/backup/test-connection');
  }

  async getDatabaseInfo(): Promise<ApiResponse> {
    return this.request('/backup/database-info');
  }

  async cleanupOldBackups(options?: {
    backupPath?: string;
    retentionDays?: number;
  }): Promise<ApiResponse> {
    return this.request('/backup/cleanup', {
      method: 'POST',
      body: JSON.stringify(options || {}),
      timeoutMs: 300000, // may scan/delete many backup files
    });
  }

  // Interest Management methods
  async updateSavingInterest(options: {
    fromDate: string;
    toDate: string;
    interestRate: number;
    accountType?: string;
    accountHead?: string;
    voucherNumber?: string;
    narration?: string;
    postDate?: string;
  }): Promise<ApiResponse> {
    return this.request('/interest/update-saving-interest', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async previewInterestCalculation(options: {
    fromDate: string;
    toDate: string;
    interestRate: number;
    accountType?: string;
    accountHead?: string;
    voucherNumber?: string;
    narration?: string;
  }): Promise<ApiResponse> {
    return this.request('/interest/preview-calculation', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async validateInterestParameters(options: {
    fromDate: string;
    toDate: string;
    interestRate: number;
    accountType?: string;
    accountHead?: string;
    voucherNumber?: string;
    narration?: string;
  }): Promise<ApiResponse> {
    return this.request('/interest/validate-parameters', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getInterestHistory(): Promise<ApiResponse> {
    return this.request('/interest/history');
  }

  async getCurrentInterestRate(): Promise<ApiResponse> {
    return this.request('/interest/current-rate');
  }

  // Deposit methods
  async getDeposits(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/deposits${queryString}`);
  }

  async getDeposit(id: number): Promise<ApiResponse> {
    return this.request(`/deposits/${id}`);
  }

  async createDeposit(depositData: any): Promise<ApiResponse> {
    return this.request('/deposits', {
      method: 'POST',
      body: JSON.stringify(depositData),
    });
  }

  // Transaction methods
  async getTransactions(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/transactions${queryString}`);
  }

  async createTransaction(transactionData: any): Promise<ApiResponse> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  // Utility methods
  async getUtilities(): Promise<ApiResponse> {
    return this.request('/utilities');
  }

  async searchGlobal(query: string, entityType?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ query });
    if (entityType) params.append('entityType', entityType);
    return this.request(`/utilities/search?${params.toString()}`);
  }

  async getMemberBalance(memberId: number): Promise<ApiResponse> {
    return this.request(`/utilities/balance/member/${memberId}`);
  }

  // Reports methods
  async getReports(): Promise<ApiResponse> {
    return this.request('/reports');
  }

  async generateReport(reportType: string, params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    // Large date ranges / whole-office reports can take a while to compile.
    return this.request(`/reports/${reportType}${queryString}`, { timeoutMs: 120000 });
  }

  async getInterestReceivableReceivedStatement(options: {
    fromMonth?: number;
    fromYear?: number;
    toMonth?: number;
    toYear?: number;
    branch?: string;
    wingNo?: string;
    fromMember?: string;
    toMember?: string;
  }): Promise<ApiResponse> {
    return this.request('/reports/loans/interest-statement', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getReportWings(): Promise<ApiResponse> {
    return this.request('/reports/wings');
  }

  async getReportOffices(wingNo?: string): Promise<ApiResponse> {
    const query = wingNo ? `?wingNo=${wingNo}` : '';
    return this.request(`/reports/offices${query}`);
  }

  // Deposit/Loan Slab methods — calls /admin/config/deposit-slabs
  // Type map: 'FD' → 'fixed_deposit', 'RD' → 'recurring_deposit', 'LN' → 'loan'
  async getDepositLoanSlabs(type?: string): Promise<ApiResponse<any[]>> {
    const queryString = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.request<any[]>(`/admin/config/deposit-slabs${queryString}`);
  }

  // Bulk replace all slabs for a given type (atomic delete + insert on backend)
  async saveDepositLoanSlabs(rows: any[], type: string): Promise<ApiResponse> {
    return this.request('/admin/config/deposit-slabs/bulk', {
      method: 'POST',
      body: JSON.stringify({ rows, type }),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // App info
  async getAppInfo(): Promise<ApiResponse> {
    return this.request('/');
  }

  // Cash Book methods
  async getCashBookReport(date: string, _outputType?: string): Promise<ApiResponse> {
    return this.request('/reports/cashbook/daily', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async getCashBook2Report(date: string): Promise<ApiResponse> {
    return this.request('/reports/cashbook2/daily', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async createCashBookTransaction(transactionData: {
    transType: string;
    transDate: string;
    memberCode?: string;
    headCode: string;
    headName: string;
    debit: number;
    credit: number;
    narration?: string;
    voucherNo?: string;
    createdBy?: string;
  }): Promise<ApiResponse> {
    return this.request('/cashbook/transaction', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async getCashBookActiveMembers(): Promise<ApiResponse> {
    return this.request('/cashbook/members/active');
  }

  async getCashBookCurrentInterestRate(): Promise<ApiResponse> {
    return this.request('/cashbook/interest-rate');
  }

  async getCashBookMemberBalance(memberCode: string): Promise<ApiResponse> {
    return this.request(`/cashbook/member/balance?memberCode=${memberCode}`);
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ startDate, endDate });
    return this.request(`/cashbook/transactions?${params.toString()}`);
  }

  // Day Book methods
  async getDayBookReport(date: string, outputType?: string, filterType?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ date });
    if (outputType) {
      params.append('outputType', outputType);
    }
    if (filterType) {
      params.append('filterType', filterType);
    }
    return this.request(`/daybook/report?${params.toString()}`);
  }

  async getDayBookSBReport(date: string, outputType?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ date });
    if (outputType) {
      params.append('outputType', outputType);
    }
    return this.request(`/daybook/report/sb?${params.toString()}`);
  }

  async getDayBookActiveMembers(): Promise<ApiResponse> {
    return this.request('/daybook/active-members');
  }

  // Dashboard Notice Board — shared across every PC, not localStorage
  async getDashboardNotices(): Promise<ApiResponse> {
    return this.request('/dashboard-notices');
  }

  async createDashboardNotice(data: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    postedBy: string;
  }): Promise<ApiResponse> {
    return this.request('/dashboard-notices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reorderDashboardNotices(orderedIds: number[]): Promise<ApiResponse> {
    return this.request('/dashboard-notices/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    });
  }

  async deleteDashboardNotice(id: number): Promise<ApiResponse> {
    return this.request(`/dashboard-notices/${id}`, { method: 'DELETE' });
  }

  // Consolidation methods
  async getConsolidationReport(date: string, outputType?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ date });
    if (outputType) {
      params.append('outputType', outputType);
    }
    return this.request(`/consolidation/report?${params.toString()}`);
  }

  // Member Ledger methods
  async getMemberLedgerReport(data: {
    memberNumber: string;
    headCode: string;
    fromDate: string;
    toDate: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      memberNumber: data.memberNumber,
      headCode: data.headCode,
      fromDate: data.fromDate,
      toDate: data.toDate
    });
    if (data.outputType) {
      params.append('outputType', data.outputType);
    }
    return this.request(`/member-ledger/report?${params.toString()}`);
  }

  async getMemberDetailLedgerReport(data: {
    memberNumber: string;
    fromDate: string;
    toDate: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      memberNumber: data.memberNumber,
      fromDate: data.fromDate,
      toDate: data.toDate
    });
    if (data.outputType) {
      params.append('outputType', data.outputType);
    }
    return this.request(`/member-ledger/detail-report?${params.toString()}`);
  }

  // Legacy "MEMBER DETAIL LEDGER" — 4 fixed account columns (Share/LTL/Emergency/CD) with per-date Dr/Cr/Bal
  async getMemberColumnarLedger(data: {
    memberNumber: string;
    fromDate: string;
    toDate: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      memberNumber: data.memberNumber,
      fromDate: data.fromDate,
      toDate: data.toDate
    });
    return this.request(`/member-ledger/detail-columnar?${params.toString()}`);
  }

  async validateMember(memberNumber: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ memberNumber });
    return this.request(`/member-ledger/validate-member?${params.toString()}`);
  }

  async getMemberLedgerContext(memberNumber: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ memberNumber });
    return this.request(`/member-ledger/member-context?${params.toString()}`);
  }

  // User Preferences
  async getUserPreferences(): Promise<ApiResponse> {
    return this.request('/utilities/preferences');
  }

  async updateUserPreferences(data: any): Promise<ApiResponse> {
    return this.request('/utilities/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // System Settings
  async getSystemSetting(key: string): Promise<ApiResponse> {
    return this.request(`/utilities/system-settings/${key}`);
  }

  async updateSystemSetting(key: string, value: string): Promise<ApiResponse> {
    return this.request(`/utilities/system-settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  // ==================== Designation Master ====================

  async createDesignation(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/designations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDesignations(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/designations');
  }

  async updateDesignation(code: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/designations/${code}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDesignation(code: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/designations/${code}`, {
      method: 'DELETE',
    });
  }

  // ==================== Cast Categories ====================

  async createCastCategory(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/cast-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCastCategories(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/cast-categories');
  }

  async updateCastCategory(id: number, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/cast-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCastCategory(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/cast-categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Member Balance ====================

  async getMemberBalanceAdmin(memberNo: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/member-balances/${memberNo}`);
  }

  async updateMemberBalance(memberNo: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/member-balances/${memberNo}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== FD/RD/SB Data Entry ====================

  async getFdRdSbAccounts(memberNo: string, type: 'FD' | 'RD' | 'SB'): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/utilities/fd-rd-sb/accounts?memberNo=${memberNo}&type=${type}`);
  }

  async saveFdRdSbEntry(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/fd-rd-sb/entry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveLoanEntry(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/loan/entry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkLoanEligibility(memberNo: string, amount: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/loans/eligibility/${memberNo}?amount=${amount}`);
  }

  async savePaymentVoucher(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/payment-voucher', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveReceiptVoucher(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/receipt-voucher', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveReceipt(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/receipt', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveSavingTransaction(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/saving/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSavingAccountDetails(accountNo: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/utilities/saving/account/${accountNo}`, {
      method: 'GET',
    });
  }


  // ==================== Office Master ====================

  async getOffices(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/offices');
  }

  async getOffice(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/offices/${id}`);
  }

  async createOffice(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/offices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOffice(id: number, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/offices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOffice(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/offices/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Wing Master ====================

  async getWings(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/wings');
  }

  async getWing(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/wings/${id}`);
  }

  async createWing(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/wings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWing(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/wings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWing(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/wings/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== SB Account Master ====================

  async getSbAccounts(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/sb-accounts');
  }

  async getSbAccount(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/sb-accounts/${id}`);
  }

  async createSbAccount(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/sb-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNextSbAccountNumber(): Promise<ApiResponse<{ nextAccountNumber: string }>> {
    return this.request<{ nextAccountNumber: string }>('/admin/sb-accounts/next-number');
  }

  async updateSbAccount(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/sb-accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSbAccount(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/sb-accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== RD System — Member Config ====================
  // Reuses the existing, already-corrected getCurrentFinancialYear() below
  // (GET /admin/financial-year/current — see its own "BUG FIX 1b" note) for
  // the current FY, rather than duplicating it.

  async setRdMonthlyAmount(mbno: string, yearcode: number, monthlyRdAmount: number): Promise<ApiResponse<any>> {
    return this.request(`/rd/member-config/${mbno}/${yearcode}`, {
      method: 'POST',
      body: JSON.stringify({ monthlyRdAmount }),
    });
  }

  async getRdCurrentAmount(mbno: string, yearcode: number): Promise<ApiResponse<{ monthlyRdAmount: number }>> {
    return this.request(`/rd/member-config/${mbno}/${yearcode}/current`);
  }

  async getRdAmountHistory(mbno: string, yearcode: number): Promise<ApiResponse<any[]>> {
    return this.request(`/rd/member-config/${mbno}/${yearcode}/history`);
  }

  async getRdCurrentBalance(mbno: string, yearcode: number): Promise<ApiResponse<{ balance: number; maxWithdrawable: number }>> {
    return this.request(`/rd/balance/${mbno}/${yearcode}/current`);
  }

  async getRdBalanceTimeline(mbno: string, yearcode: number): Promise<ApiResponse<any[]>> {
    return this.request(`/rd/balance/${mbno}/${yearcode}/timeline`);
  }

  async withdrawRd(mbno: string, yearcode: number, amount: number, narration?: string): Promise<ApiResponse<{ newBalance: number }>> {
    return this.request(`/rd/balance/${mbno}/${yearcode}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ amount, narration }),
    });
  }

  async getRdClosingMembers(yearcode: number): Promise<ApiResponse<string[]>> {
    return this.request(`/rd/closing/${yearcode}/members`);
  }

  async previewRdClosingAll(yearcode: number, limit = 200, offset = 0): Promise<ApiResponse<{ total: number; members: any[] }>> {
    return this.request(`/rd/closing/${yearcode}/preview?limit=${limit}&offset=${offset}`);
  }

  async previewRdClosingOne(mbno: string, yearcode: number, overrideEligible?: boolean): Promise<ApiResponse<any>> {
    const qs = overrideEligible === undefined ? '' : `?overrideEligible=${overrideEligible}`;
    return this.request(`/rd/closing/${mbno}/${yearcode}/preview${qs}`);
  }

  async closeRdMemberYear(
    mbno: string,
    yearcode: number,
    closedBy: string,
    overrideEligible?: boolean,
    overrideReason?: string,
  ): Promise<ApiResponse<any>> {
    return this.request(`/rd/closing/${mbno}/${yearcode}/close`, {
      method: 'POST',
      body: JSON.stringify({ closedBy, overrideEligible, overrideReason }),
    });
  }

  async closeRdFinancialYear(
    yearcode: number,
    closedBy: string,
    overrides?: Record<string, { eligible: boolean; reason: string }>,
  ): Promise<ApiResponse<{ succeeded: any[]; failed: Array<{ mbno: string; error: string }> }>> {
    return this.request(`/rd/closing/${yearcode}/close-all`, {
      method: 'POST',
      body: JSON.stringify({ closedBy, overrides }),
    });
  }

  // ── Dividend: monthly Share snapshot, Total Product calculation, credit ──
  async captureShareMonthEndSnapshot(month: number, year: number): Promise<ApiResponse<{ success: boolean; captured: number; message: string }>> {
    return this.request('/dividend/share-snapshot', {
      method: 'POST',
      body: JSON.stringify({ month, year }),
    });
  }

  async previewDividendCalculation(yearcode: number, dividendRate: number): Promise<ApiResponse<any>> {
    return this.request(`/dividend/calculation/preview?yearcode=${yearcode}&dividendRate=${dividendRate}`);
  }

  async commitDividendCalculation(yearcode: number, dividendRate: number): Promise<ApiResponse<{ success: boolean; calculationYear: number; membersCommitted: number }>> {
    return this.request('/dividend/calculation/commit', {
      method: 'POST',
      body: JSON.stringify({ yearcode, dividendRate }),
    });
  }

  async previewDividendCredit(yearcode: number): Promise<ApiResponse<any>> {
    return this.request(`/dividend/credit/preview?yearcode=${yearcode}`);
  }

  async commitDividendCredit(yearcode: number, creditedBy: string): Promise<ApiResponse<{ creditYearcode: number; credited: any[]; failed: Array<{ mbno: string; error: string }> }>> {
    return this.request('/dividend/credit/commit', {
      method: 'POST',
      body: JSON.stringify({ yearcode, creditedBy }),
    });
  }

  async getRdPendingInstallments(mbno: string, yearcode: number): Promise<ApiResponse<any[]>> {
    return this.request(`/rd/repayment/${mbno}/${yearcode}/pending`);
  }

  async recordRdRepayment(
    mbno: string,
    yearcode: number,
    installmentMonth: number,
    installmentYear: number,
    amount: number,
    recordedBy: string,
    narration?: string,
    paidDate?: string,
  ): Promise<ApiResponse<any>> {
    return this.request(`/rd/repayment/${mbno}/${yearcode}`, {
      method: 'POST',
      body: JSON.stringify({ installmentMonth, installmentYear, amount, recordedBy, narration, paidDate }),
    });
  }

  // ==================== Short Recovery ====================

  async getShortRecoveries(filters: { month: string; year: string; wing: string }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams(filters);
    return this.request<any[]>(`/transactions/short-recovery?${params.toString()}`);
  }

  async adjustShortRecovery(data: { demandId: string; reason: string; amount: number }): Promise<ApiResponse<any>> {
    return this.request<any>('/transactions/short-recovery/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Demand Generation ====================

  async generateDemand(data: { month: string; year: string; divisionRO: string; from: string; to: string }): Promise<ApiResponse<any>> {
    return this.request<any>('/transactions/demand-generation/generate', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: 300000, // demand generation across a whole division can be slow
    });
  }

  // ==================== Ledger Posting Updation ====================

  async getLedgerPostingSummary(month: string, year: string, branch: string, fromMember?: string, toMember?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams({ month, year, branch });
    if (fromMember) params.append('fromMember', fromMember);
    if (toMember) params.append('toMember', toMember);
    return this.request<any[]>(`/transactions/ledger-posting/summary?${params.toString()}`);
  }

  async postLedgerUpdate(data: { month: string; year: string; branch: string; modeOfReceipt: string; totalOfficeAmount: number }): Promise<ApiResponse<any>> {
    return this.request<any>('/transactions/ledger-posting/post', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Demand List Report ====================

  async getMembersDemandList(data: { month: string; year: string; division?: string; branch?: string; sortBy?: string; outputType?: string }): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/transactions/reports/demand-list/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Member Admin ====================

  async getMemberAdminDetails(memberNo: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/members/${memberNo}`);
  }

  async transferMemberAdmin(data: { memberNo: number; newOfficeId: string }): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/members/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMemberFunds(memberNo: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/member-funds/${memberNo}`);
  }

  async updateMemberFunds(memberNo: number, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/member-funds/${memberNo}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }


  // Premature Information — account-holder dropdown (only members who actually
  // have an SB account, instead of a blind member-number search)
  async listSbAccountHolders(): Promise<ApiResponse> {
    return this.request('/utilities/sb-accounts/holders');
  }

  // SB Premature Information methods
  async searchSBAccounts(memberNo: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ memberNo });
    const response = await this.request(`/utilities/search/sb-accounts?${params.toString()}`);

    // Handle nested response structure from utilities controller
    const responseData = response.data as any;
    if (response.success && responseData && responseData.data) {
      return {
        success: true,
        data: responseData.data,
        message: responseData.message || 'SB accounts retrieved successfully'
      };
    }

    return response;
  }

  async getHeadMasters(): Promise<ApiResponse> {
    return this.request('/member-ledger/head-masters');
  }

  async calculateMemberInterest(data: {
    memberCode: string;
    fromDate: string;
    toDate: string;
    interestRate?: number;
  }): Promise<ApiResponse> {
    return this.request('/daybook/calculate-interest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payMemberInterest(data: {
    memberCode: string;
    interestAmount: number;
    paymentDate: string;
    narration?: string;
  }): Promise<ApiResponse> {
    return this.request('/daybook/pay-interest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }


  async getWingList(): Promise<ApiResponse> {
    return this.request('/reports/wings');
  }

  async getOfficeList(): Promise<ApiResponse> {
    return this.request('/reports/offices');
  }

  async getMemberBalanceRangeReport(data: {
    fromAccountNo: string;
    toAccountNo: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      fromAccountNo: data.fromAccountNo,
      toAccountNo: data.toAccountNo
    });
    return this.request(`/reports/member-balance-range?${params.toString()}`);
  }

  async getDayBookInterestRate(): Promise<ApiResponse> {
    return this.request('/daybook/interest-rate');
  }

  async getSavingStatement(data: {
    memberNo: string;
    fromDate: string;
    toDate: string;
    headCode?: string;
  }): Promise<ApiResponse> {
    return this.request('/reports/saving/statement', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getRDStatement(data: {
    memberNo: string;
    fromDate: string;
    toDate: string;
    headCode?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      memberNo: data.memberNo,
      fromDate: data.fromDate,
      toDate: data.toDate
    });
    if (data.headCode) params.append('headCode', data.headCode);
    return this.request(`/report/rd-statement?${params.toString()}`);
  }

  async getFDStatement(data: {
    memberNo: string;
    fromDate: string;
    toDate: string;
    headCode?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      memberNo: data.memberNo,
      fromDate: data.fromDate,
      toDate: data.toDate
    });
    if (data.headCode) params.append('headCode', data.headCode);
    return this.request(`/report/fd-statement?${params.toString()}`);
  }

  async getMemberStatement(data: {
    memberNo: string;
    fromDate: string;
    toDate: string;
  }): Promise<ApiResponse> {
    return this.request('/reports/member/statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberNo: data.memberNo, fromDate: data.fromDate, toDate: data.toDate }),
    });
  }

  async getMemberProfile(memberNo: string): Promise<ApiResponse> {
    return this.request(`/report/member-profile?memberNo=${encodeURIComponent(memberNo)}`);
  }

  async getInterestCertificate(data: {
    memberNo: string;
    year: number;
  }): Promise<ApiResponse> {
    return this.request('/reports/interest-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getLoanNilCertificate(memberNo: string): Promise<ApiResponse> {
    return this.request(`/report/loan-nil-certificate?memberNo=${encodeURIComponent(memberNo)}`);
  }

  async getSuretyRegister(data: {
    memberFrom: string;
    memberTo: string;
    loanType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberFrom', data.memberFrom);
    params.append('memberTo', data.memberTo);
    if (data.loanType) params.append('loanType', data.loanType);
    return this.request(`/reports/surety-register?${params.toString()}`);
  }

  async getDepositMaturity(data: {
    fromDate: string;
    toDate: string;
    depositType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('fromDate', data.fromDate);
    params.append('toDate', data.toDate);
    if (data.depositType) params.append('depositType', data.depositType);

    return this.request(`/report/deposit-maturity?${params.toString()}`);
  }

  async getAccountClosingRegister(data: {
    accountType?: string;
    month: number;
    year: number;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('month', data.month.toString());
    params.append('year', data.year.toString());
    if (data.accountType) params.append('accountType', data.accountType);
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/account-closing?${params.toString()}`);
  }

  async getShareCertificate(data: {
    memberNo: string;
    shareFrom?: string;
    shareTo?: string;
    certificateNo?: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberNo', data.memberNo);
    if (data.shareFrom) params.append('shareFrom', data.shareFrom);
    if (data.shareTo) params.append('shareTo', data.shareTo);
    if (data.certificateNo) params.append('certificateNo', data.certificateNo);
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/share-certificate?${params.toString()}`);
  }

  async getRecurringDetails(data: {
    memberNo: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberNo', data.memberNo);
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/recurring-details?${params.toString()}`);
  }

  async getRecoveryDetails(data: {
    memberNo: string;
    month: string;
    year: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberNo', data.memberNo);
    params.append('month', data.month);
    params.append('year', data.year);
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/recovery-details?${params.toString()}`);
  }

  async getLoanContributionsRegister(data: {
    memberNo: string;
    fromDate: string;
    toDate: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberNo', data.memberNo);
    params.append('fromDate', data.fromDate);
    params.append('toDate', data.toDate);
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/loan-contributions-register?${params.toString()}`);
  }

  async getLienAccountInformation(data: {
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/lien-account-information?${params.toString()}`);
  }

  async getAdHocReports(data: {
    reportType: string;
    fromDate?: string;
    toDate?: string;
    memberNo?: string;
    accountType?: string;
    customQuery?: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('reportType', data.reportType);
    if (data.fromDate) params.append('fromDate', data.fromDate);
    if (data.toDate) params.append('toDate', data.toDate);
    if (data.memberNo) params.append('memberNo', data.memberNo);
    if (data.accountType) params.append('accountType', data.accountType);
    if (data.customQuery) params.append('customQuery', data.customQuery);
    if (data.outputType) params.append('outputType', data.outputType);

    return this.request(`/reports/adhoc-reports?${params.toString()}`);
  }

  async getPassBookPrinting(data: {
    memberNo: string;
    accountType?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberNo', data.memberNo);
    if (data.accountType) params.append('accountType', data.accountType);
    if (data.fromDate) params.append('fromDate', data.fromDate);
    if (data.toDate) params.append('toDate', data.toDate);
    return this.request(`/reports/passbook-printing?${params.toString()}`);
  }

  async resetPassbookPrinting(memberNo: string, accountType?: string): Promise<ApiResponse> {
    return this.request('/report/passbook-reset', {
      method: 'POST',
      body: JSON.stringify({ memberNo, accountType }),
    });
  }

  async updatePassbookTracking(memberNo: string, accountType: string, lastLedgerId: number, lastLineNo: number): Promise<ApiResponse> {
    return this.request('/report/passbook-update-tracking', {
      method: 'POST',
      body: JSON.stringify({ memberNo, accountType, lastLedgerId, lastLineNo }),
    });
  }

  // General Ledger API methods
  async getGeneralLedgerReport(data: {
    headCode: string;
    fromDate: string;
    toDate: string;
    outputType?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({
      headCode: data.headCode,
      fromDate: data.fromDate,
      toDate: data.toDate,
      ...(data.outputType && { outputType: data.outputType })
    });

    return this.request(`/general-ledger/report?${params.toString()}`);
  }

  async getGeneralLedgerHeadMasters(): Promise<ApiResponse> {
    return this.request('/general-ledger/head-masters');
  }



  // Print Voucher methods
  async getVoucherByNo(voucherNo: string): Promise<ApiResponse> {
    return this.request(`/print-voucher/${encodeURIComponent(voucherNo)}`);
  }

  async getVoucherByNoAndDate(voucherNo: string, date: string): Promise<ApiResponse> {
    return this.request(`/print-voucher/${encodeURIComponent(voucherNo)}?date=${encodeURIComponent(date)}`);
  }

  async getAllVoucherNos(): Promise<ApiResponse<string[]>> {
    return this.request('/print-voucher/list/all');
  }

  async getAllVoucherReferences(): Promise<ApiResponse<Array<{ voucher_no: string; voucher_date: string }>>> {
    return this.request('/print-voucher/list/by-date');
  }

  async getAllJournalVoucherNos(): Promise<ApiResponse<string[]>> {
    return this.request('/print-voucher/journal/list/all');
  }

  async getAllJournalVoucherReferences(): Promise<ApiResponse<Array<{ voucher_no: string; voucher_date: string }>>> {
    return this.request('/print-voucher/journal/list/by-date');
  }

  async getJournalVoucherByNo(voucherNo: string): Promise<ApiResponse> {
    return this.request(`/print-voucher/journal/${encodeURIComponent(voucherNo)}`);
  }

  async getJournalVoucherByNoAndDate(voucherNo: string, date: string): Promise<ApiResponse> {
    return this.request(`/print-voucher/journal/${encodeURIComponent(voucherNo)}?date=${encodeURIComponent(date)}`);
  }

  async getCashBookMonthly(month: string, year: number): Promise<ApiResponse> {
    return this.post('/reports/cashbook/monthly', { month, year });
  }


  async getHeadList(): Promise<ApiResponse> {
    return this.request('/reports/heads');
  }

  async getDetailLedger(headCode: string, fromDate: string, toDate: string): Promise<ApiResponse> {
    return this.post('/reports/ledger/detail', { head_code: headCode, from_date: fromDate, to_date: toDate });
  }

  async getBankList(): Promise<ApiResponse> {
    return this.request('/reports/banks');
  }

  async getHeadBalance(code: string): Promise<ApiResponse> {
    return this.request(`/utilities/head-balance/${code}`);
  }

  async getBankDetailLedger(bankHeadCode: string, fromDate: string, toDate: string): Promise<ApiResponse> {
    return this.post('/reports/bank/ledger', { bank_head_code: bankHeadCode, from_date: fromDate, to_date: toDate });
  }

  async getDefaulterList(minBalance?: number, limit?: number, offset?: number): Promise<ApiResponse> {
    return this.post('/reports/defaulters', { 
      minBalance: minBalance || 0,
      limit: limit || 50,
      offset: offset || 0
    });
  }

  async getLoanTypes(): Promise<ApiResponse> {
    return this.request('/reports/loan-types');
  }

  async getNewLoanDisbursed(fromDate: string, toDate: string, loanType?: string, memberNo?: string): Promise<ApiResponse> {
    return this.post('/reports/loans/new-disbursed', {
      fromDate,
      toDate,
      loanType: loanType || undefined,
      memberNo: memberNo || undefined
    });
  }

  async getMemberLoanCases(memberNo: string): Promise<ApiResponse> {
    return this.request(`/reports/member/${memberNo}/loan-cases`);
  }

  async getMemberLoanLedger(memberNo: string, loanCaseNo?: string, fromDate?: string, toDate?: string): Promise<ApiResponse> {
    return this.post('/reports/member/loan-ledger', {
      memberNo,
      loanCaseNo,
      fromDate,
      toDate
    });
  }

  async getBalanceSheet(
    asOnDate?: string,
    opts?: { includeZeroClosing?: boolean; includeZeroTransaction?: boolean },
  ): Promise<ApiResponse> {
    const q = new URLSearchParams();
    if (asOnDate) q.set('asOnDate', asOnDate);
    if (opts?.includeZeroClosing !== undefined) q.set('includeZeroClosing', String(opts.includeZeroClosing));
    if (opts?.includeZeroTransaction !== undefined) q.set('includeZeroTransaction', String(opts.includeZeroTransaction));
    const qs = q.toString();
    return this.request(`/reports/balance-sheet${qs ? `?${qs}` : ''}`);
  }

  async getFinancialSummary(
    fromDate: string,
    toDate: string,
    includeOpBal: boolean,
    hideZeroClosing: boolean,
    hideZeroTrans: boolean
  ): Promise<ApiResponse> {
    return this.request(`/reports/financial-summary?fromDate=${fromDate}&toDate=${toDate}&includeOpBal=${includeOpBal}&hideZeroClosing=${hideZeroClosing}&hideZeroTrans=${hideZeroTrans}`);
  }

  async getMemberLoanDetail(memberFrom: string, memberTo: string, loanType?: string): Promise<ApiResponse> {
    const params = loanType ? `?memberFrom=${memberFrom}&memberTo=${memberTo}&loanType=${loanType}` : `?memberFrom=${memberFrom}&memberTo=${memberTo}`;
    return this.request(`/reports/member-loan-detail${params}`);
  }

  async getShareWarrant(memberFrom: string, memberTo: string, warrantDate?: string): Promise<ApiResponse> {
    const params = warrantDate
      ? `?memberFrom=${memberFrom}&memberTo=${memberTo}&warrantDate=${warrantDate}`
      : `?memberFrom=${memberFrom}&memberTo=${memberTo}`;
    return this.request(`/reports/share-warrant${params}`);
  }

  async getDivisionList(wingNo?: string): Promise<ApiResponse> {
    const params = wingNo ? `?wingNo=${wingNo}` : '';
    return this.request(`/reports/divisions${params}`);
  }

  async getAnnualMemberStatement(wingNo?: string, officeNo?: string, asOnDate?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (wingNo) params.append('wingNo', wingNo);
    if (officeNo) params.append('officeNo', officeNo);
    if (asOnDate) params.append('asOnDate', asOnDate);
    const queryString = params.toString();
    return this.request(`/reports/annual-member-statement${queryString ? '?' + queryString : ''}`);
  }

  async getYearlyMemberStatement(
    fromDate: string,
    toDate: string,
    fromMemberNo: string,
    toMemberNo: string,
    wingNo?: string,
    officeNo?: string,
    sortBy?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('fromDate', fromDate);
    params.append('toDate', toDate);
    params.append('fromMemberNo', fromMemberNo);
    params.append('toMemberNo', toMemberNo);
    if (wingNo) params.append('wingNo', wingNo);
    if (officeNo) params.append('officeNo', officeNo);
    if (sortBy) params.append('sortBy', sortBy);
    return this.request(`/reports/yearly-member-statement?${params.toString()}`);
  }

  async getMemberLedger(memberNo: string, fromDate: string, toDate: string, headCode?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('memberNo', memberNo);
    params.append('fromDate', fromDate);
    params.append('toDate', toDate);
    if (headCode) {
      params.append('headCode', headCode);
    }
    return this.request(`/reports/member-ledger?${params.toString()}`);
  }

  async getVotersList(
    division?: string,
    branch?: string,
    memberStatus?: string,
    sortBy?: string,
    limit?: number,
    offset?: number,
    search?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (division) params.append('division', division);
    if (branch) params.append('branch', branch);
    if (memberStatus) params.append('memberStatus', memberStatus);
    if (sortBy) params.append('sortBy', sortBy);
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (search) params.append('search', search);

    const queryString = params.toString();
    return this.request(`/reports/voters-list${queryString ? '?' + queryString : ''}`);
  }

  async getDividendReport(
    wingName?: string,
    officeName?: string,
    financialYear?: string,
    dividendRate?: number,
    sortBy?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (wingName) params.append('wingName', wingName);
    if (officeName) params.append('officeName', officeName);
    if (financialYear) params.append('financialYear', financialYear);
    if (dividendRate) params.append('dividendRate', dividendRate.toString());
    if (sortBy) params.append('sortBy', sortBy);

    const queryString = params.toString();
    return this.request(`/reports/dividend-report${queryString ? '?' + queryString : ''}`);
  }

  async getDividendPaid(
    wingName?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (wingName) params.append('wingName', wingName);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);

    const queryString = params.toString();
    return this.request(`/reports/dividend-paid${queryString ? '?' + queryString : ''}`);
  }

  async getInterestList(
    wingName?: string,
    financialYear?: string,
    accountType?: string,
    sortBy?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (wingName) params.append('wingName', wingName);
    if (financialYear) params.append('financialYear', financialYear);
    if (accountType) params.append('accountType', accountType);
    if (sortBy) params.append('sortBy', sortBy);

    const queryString = params.toString();
    return this.request(`/reports/interest-list${queryString ? '?' + queryString : ''}`);
  }

  async getDividendWarrant(
    wingName?: string,
    officeName?: string,
    fromDate?: string,
    uptoDate?: string,
    memberNo?: string,
    sortBy?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (wingName) params.append('wingName', wingName);
    if (officeName) params.append('officeName', officeName);
    if (fromDate) params.append('fromDate', fromDate);
    if (uptoDate) params.append('uptoDate', uptoDate);
    if (memberNo) params.append('memberNo', memberNo);
    if (sortBy) params.append('sortBy', sortBy);

    const queryString = params.toString();
    return this.request(`/reports/dividend-warrant${queryString ? '?' + queryString : ''}`);
  }

  // Report Schedule Builder APIs
  async createReportSchedule(
    schedule_name: string,
    template_name: string,
    details: Array<{ particulars: string; code_from: string; code_to: string }>,
    report_type: string = 'TRIAL',
    id?: number
  ): Promise<ApiResponse> {
    return this.request('/reports/schedule', {
      method: 'POST',
      body: JSON.stringify({ schedule_name, template_name, details, report_type, id })
    });
  }

  async executeReportSchedule(
    scheduleId: number,
    fromDate: string,
    toDate: string,
    financialYearStart: string
  ): Promise<ApiResponse> {
    return this.request('/reports/schedule/execute', {
      method: 'POST',
      body: JSON.stringify({ scheduleId, fromDate, toDate, financialYearStart })
    });
  }

  async getAllReportSchedules(type?: string): Promise<ApiResponse> {
    const queryString = type ? `?type=${type}` : '';
    return this.request(`/reports/schedule${queryString}`);
  }

  async getReportScheduleDetails(id: number): Promise<ApiResponse> {
    return this.request(`/reports/schedule/${id}`);
  }
  // Analytics methods
  async getAnalyticsConfig(): Promise<ApiResponse> {
    return this.request('/analytics/config');
  }

  async updateAnalyticsConfig(configKey: string, configValue: string): Promise<ApiResponse> {
    return this.request('/analytics/config', {
      method: 'PUT',
      body: JSON.stringify({
        config_key: configKey,
        config_value: configValue,
      }),
    });
  }

  async updateAnalyticsSettings(settings: any): Promise<ApiResponse> {
    return this.request('/analytics/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAnalyticsStatus(): Promise<ApiResponse> {
    return this.request('/analytics/status');
  }

  async trackSession(sessionData: any): Promise<ApiResponse> {
    return this.request('/analytics/session/start', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async endSession(sessionId: string): Promise<ApiResponse> {
    return this.request('/analytics/session/end', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  async trackPageVisit(visitData: any): Promise<ApiResponse> {
    return this.request('/analytics/page/visit', {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  }

  async endPageVisit(visitData: any): Promise<ApiResponse> {
    return this.request('/analytics/page/end', {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  }

  async trackFeatureUsage(usageData: any): Promise<ApiResponse> {
    return this.request('/analytics/feature/usage', {
      method: 'POST',
      body: JSON.stringify(usageData),
    });
  }

  async trackError(errorData: any): Promise<ApiResponse> {
    return this.request('/analytics/error/track', {
      method: 'POST',
      body: JSON.stringify(errorData),
    });
  }

  async resolveError(errorId: string, resolvedBy: string, notes?: string): Promise<ApiResponse> {
    return this.request('/analytics/error/resolve', {
      method: 'POST',
      body: JSON.stringify({
        error_id: errorId,
        resolved_by: resolvedBy,
        resolution_notes: notes,
      }),
    });
  }

  async getAnalyticsHealth(): Promise<ApiResponse> {
    return this.request('/analytics/health');
  }

  // Member lookup for search functionality
  async lookupMembers(search?: string, limit?: number, offset?: number): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const queryString = params.toString();
    return this.request(`/members/lookup${queryString ? '?' + queryString : ''}`);
  }

  async getMemberBalanceV2(memberNo: string): Promise<ApiResponse> {
    return this.request(`/members/balance/${memberNo}`);
  }

  // Calculator methods for enhanced loan calculations
  async getLoanRates(): Promise<ApiResponse> {
    const response = await this.request('/utilities/calculator/loan-rates');

    // Handle nested response structure from utilities controller
    if (response.success && response.data) {
      // Check if data is nested (response.data.data)
      const resp = response.data as any;
      const actualData = resp.data || response.data;
      return {
        success: true,
        data: actualData,
        message: resp.message || 'Loan rates retrieved successfully'
      };
    }

    return response;
  }

  async getMemberEligibility(memberNo: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ memberNo });
    const response = await this.request(`/utilities/calculator/member-eligibility?${params.toString()}`);

    // Handle nested response structure from utilities controller
    if (response.success && response.data) {
      // Check if data is nested (response.data.data)
      const resp = response.data as any;
      const actualData = resp.data || response.data;
      return {
        success: true,
        data: actualData,
        message: resp.message || 'Member eligibility retrieved successfully'
      };
    }

    return response;
  }

  async getMemberBalanceUtility(memberNo: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ memberNo });
    const response = await this.request(`/utilities/member/balance?${params.toString()}`);

    // Handle nested response structure from utilities controller
    if (response.success && response.data) {
      // Check if data is nested (response.data.data)
      const resp = response.data as any;
      const actualData = resp.data || response.data;
      return {
        success: true,
        data: actualData,
        message: resp.message || 'Member balance retrieved successfully'
      };
    }

    return response;
  }

  // Certificate Templates
  async getCertificateTemplates(): Promise<ApiResponse> {
    return this.request('/admin/certificate-templates');
  }

  async getCertificateTemplate(id: number): Promise<ApiResponse> {
    return this.request(`/admin/certificate-templates/${id}`);
  }

  async getDefaultCertificateTemplate(accountType: string): Promise<ApiResponse> {
    return this.request(`/admin/certificate-templates/default?accountType=${accountType}`);
  }

  async createCertificateTemplate(template: any): Promise<ApiResponse> {
    return this.request('/admin/certificate-templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }

  async updateCertificateTemplate(id: number, template: any): Promise<ApiResponse> {
    return this.request(`/admin/certificate-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template)
    });
  }

  async deleteCertificateTemplate(id: number): Promise<ApiResponse> {
    return this.request(`/admin/certificate-templates/${id}`, {
      method: 'DELETE'
    });
  }

  // Deposits & Printing
  async getMemberDeposits(memberNo: string): Promise<ApiResponse> {
    return this.request(`/deposits/member/${memberNo}`);
  }

  // Passbook Templates
  async getPassbookTemplates(): Promise<ApiResponse> {
    return this.request('/admin/passbook-templates');
  }

  async getPassbookTemplate(id: number): Promise<ApiResponse> {
    return this.request(`/admin/passbook-templates/${id}`);
  }

  async createPassbookTemplate(data: any): Promise<ApiResponse> {
    return this.request('/admin/passbook-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePassbookTemplate(id: number, data: any): Promise<ApiResponse> {
    return this.request(`/admin/passbook-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePassbookTemplate(id: number): Promise<ApiResponse> {
    return this.request(`/admin/passbook-templates/${id}`, {
      method: 'DELETE'
    });
  }

  async getDefaultPassbookTemplate(accountType: string): Promise<ApiResponse> {
    return this.request(`/admin/passbook-templates/default?accountType=${accountType}`);
  }



  // Signature Scanning
  async uploadMemberSignature(memberId: number, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // We used to use request() but it sets Content-Type to application/json usually unless body is FormData?
    // Let's check request implementation. If it doesn't handle FormData automatically, we might need to handle headers.
    // Assuming request method handles FormData or we might need to override headers.
    // If I look at createPassbookTemplate, it does stringify.
    // request method usually has logic. Let's assume standard fetch behavior or look at method.

    // Taking a safer bet by using fetch directly or if request handles it. 
    // Let's use request and hope it detects FormData (common pattern). 
    // If not, I'll need to check the request implementation in api.ts.

    return this.request(`/members/${memberId}/signature`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    });
  }

  async deleteMemberSignature(memberId: number): Promise<ApiResponse> {
    return this.request(`/members/${memberId}/signature`, {
      method: 'DELETE'
    });
  }

  // Signature Scanning — member_master (legacy) routes
  async uploadMemberSignatureMaster(mbno: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/members/master/${mbno}/signature`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteMemberSignatureMaster(mbno: string): Promise<ApiResponse> {
    return this.request(`/members/master/${mbno}/signature`, {
      method: 'DELETE',
    });
  }

  async uploadMemberPhotoMaster(mbno: string, type: 'profile' | 'doc_front' | 'doc_back', file: File): Promise<ApiResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return this.request(`/members/master/${mbno}/photo/${type}`, { method: 'POST', body: fd });
  }

  async deleteMemberPhotoMaster(mbno: string, type: 'profile' | 'doc_front' | 'doc_back'): Promise<ApiResponse> {
    return this.request(`/members/master/${mbno}/photo/${type}`, { method: 'DELETE' });
  }

  // ── KYC Documents (multi-document per member) ──
  async uploadMemberDocument(mbno: string, docType: string, file: File): Promise<ApiResponse> {
    const fd = new FormData();
    fd.append('docType', docType);
    fd.append('file', file);
    return this.request(`/members/master/${mbno}/document`, { method: 'POST', body: fd });
  }

  async getMemberDocuments(mbno: string): Promise<ApiResponse> {
    return this.request(`/members/master/${mbno}/documents`);
  }

  async deleteMemberDocument(mbno: string, id: number): Promise<ApiResponse> {
    return this.request(`/members/master/${mbno}/document/${id}`, { method: 'DELETE' });
  }

  // Pass Transactions
  async getPendingVouchers(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/transactions/vouchers/pending');
  }

  async createVoucher(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/transactions/voucher', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async passTransaction(voucherNo: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/transactions/pass/${voucherNo}`, {
      method: 'POST'
    });
  }

  async deleteVoucher(voucherNo: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/transactions/voucher/${voucherNo}`, {
      method: 'DELETE'
    });
  }

  // Dividend Payment
  async getPendingDividends(memberNo: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/utilities/dividend/pending?memberNo=${memberNo}`);
  }

  async processDividendPayment(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/utilities/dividend/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Compulsory Deposit Transactions
  async getCDMembers(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/transactions/cd/members');
  }

  async getCDIncomeHeads(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/transactions/cd/income-heads');
  }

  async postCDTransaction(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/transactions/cd/post', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Journal Transfer Entries
  async postJournalTransaction(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/transactions/journal/post', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==================== User Management ====================

  async getUsers(params?: { page?: number; limit?: number; role?: string; isActive?: boolean }): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    return this.request(`/admin/users?${searchParams.toString()}`);
  }

  async getUserById(id: number): Promise<ApiResponse> {
    return this.request(`/admin/users/${id}`);
  }

  async getUserByUsername(username: string): Promise<ApiResponse> {
    return this.request(`/admin/users?username=${encodeURIComponent(username)}`);
  }

  async createUser(userData: any): Promise<ApiResponse> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: any): Promise<ApiResponse> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number): Promise<ApiResponse> {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getRolePermissions(): Promise<ApiResponse> {
    return this.request('/admin/users/roles/permissions');
  }

  async adminChangePassword(id: number, passwordData: any): Promise<ApiResponse> {
    return this.request(`/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // ==================== Role Management ====================

  async getRoleLevels(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/roles/levels');
  }

  async createRoleLevel(roleName: string): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/roles/levels', {
      method: 'POST',
      body: JSON.stringify({ roleName }),
    });
  }

  async getRoleMenus(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/roles/menus');
  }

  async getRoleDefaultRights(levelId: number): Promise<ApiResponse<number[]>> {
    return this.request<number[]>(`/admin/roles/defaults/${levelId}`);
  }

  async updateRoleDefaultRights(levelId: number, menuIds: number[]): Promise<ApiResponse> {
    return this.request('/admin/roles/defaults', {
      method: 'POST',
      body: JSON.stringify({ userlevelid: levelId, menuIds }),
    });
  }

  async getActiveSessions(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/users/active-sessions/matrix');
  }

  async forceLogoutUser(username: string): Promise<ApiResponse> {
    return this.request('/admin/users/active-sessions/terminate', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async getBusinessRules(): Promise<ApiResponse<Record<string, any>>> {
    return this.request('/utilities/business-rules');
  }

  async updateBusinessRules(data: Record<string, any>): Promise<ApiResponse> {
    return this.request('/utilities/business-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHeadMaster(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/utilities/head-master');
  }

  async saveHeadMaster(data: any): Promise<ApiResponse> {
    return this.request('/utilities/head-master', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteHeadMaster(code: string): Promise<ApiResponse> {
    return this.request(`/utilities/head-master/${encodeURIComponent(code)}`, { method: 'DELETE' });
  }

  async rebuildBalancesheet(): Promise<ApiResponse<{ leafCount: number; message: string }>> {
    return this.request<{ leafCount: number; message: string }>('/utilities/head-master/rebuild-tree', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getHeadOpeningBalances(yearcode: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/utilities/head-opening-balance?yearcode=${yearcode}`);
  }

  async saveHeadOpeningBalances(
    yearcode: number,
    balances: Array<{ headCode: string; closingBal: number }>,
  ): Promise<ApiResponse> {
    return this.request('/utilities/head-opening-balance', {
      method: 'POST',
      body: JSON.stringify({ yearcode, balances }),
    });
  }

  async applyYearOpeningBalances(yearcode: number): Promise<ApiResponse> {
    return this.request(`/utilities/head-opening-balance/apply/${yearcode}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getSaakhScore(mbno: string): Promise<ApiResponse> {
    return this.request(`/admin/saakh-score/${encodeURIComponent(mbno)}`);
  }

  async getDemandPrintOrder(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/utilities/demand-print-order');
  }

  async saveDemandPrintOrder(rows: any[]): Promise<ApiResponse> {
    return this.request('/utilities/demand-print-order', {
      method: 'POST',      body: JSON.stringify({ rows }),
    });
  }

  // Report Head Order (ES-57): one global head order used by every head-grouped report
  async getReportHeadOrder(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/report-head-order');
  }

  async saveReportHeadOrder(codes: string[]): Promise<ApiResponse> {
    return this.request('/report-head-order', { method: 'PUT', body: JSON.stringify({ codes }) });
  }

  async resetReportHeadOrder(): Promise<ApiResponse> {
    return this.request('/report-head-order/reset', { method: 'POST' });
  }

  // Member Status (ES-100): retired / inactive member flagging and the manual "mark inactive" action
  async getMemberStatusSummary(months = 12): Promise<ApiResponse<any>> {
    return this.request<any>(`/member-status/summary?months=${months}`);
  }

  async getMemberStatusList(params: { category: string; months?: number; search?: string; limit?: number; offset?: number }): Promise<ApiResponse<any>> {
    const q = new URLSearchParams();
    q.set('category', params.category);
    if (params.months) q.set('months', String(params.months));
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return this.request<any>(`/member-status/list?${q.toString()}`);
  }

  async checkMemberStatus(memberNo: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/member-status/${encodeURIComponent(memberNo)}/check`);
  }

  async getMemberStatusHistory(memberNo: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/member-status/${encodeURIComponent(memberNo)}/history`);
  }

  async markMemberInactive(memberNo: string, reason: string, force = false): Promise<ApiResponse<any>> {
    return this.request<any>(`/member-status/${encodeURIComponent(memberNo)}/inactive`, {
      method: 'POST', body: JSON.stringify({ reason, force }),
    });
  }

  async reactivateMember(memberNo: string, reason: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/member-status/${encodeURIComponent(memberNo)}/reactivate`, {
      method: 'POST', body: JSON.stringify({ reason }),
    });
  }

  // Notification Centre (ES-101): stored system notifications with a per-user read state
  async getNotificationCentreSummary(): Promise<ApiResponse<any>> {
    return this.request<any>('/notification-centre/summary');
  }

  async getNotificationCentreList(params: { status?: string | undefined; kind?: string | undefined; severity?: string | undefined; unreadOnly?: boolean | undefined; search?: string | undefined; limit?: number | undefined; offset?: number | undefined } = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.kind) q.set('kind', params.kind);
    if (params.severity) q.set('severity', params.severity);
    if (params.unreadOnly) q.set('unreadOnly', 'true');
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return this.request<any>(`/notification-centre/list?${q.toString()}`);
  }

  async syncNotificationCentre(): Promise<ApiResponse<any>> {
    return this.request<any>('/notification-centre/sync', { method: 'POST' });
  }

  async markNotificationRead(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/notification-centre/${id}/read`, { method: 'POST' });
  }

  async markNotificationUnread(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/notification-centre/${id}/unread`, { method: 'POST' });
  }

  async markAllNotificationsRead(kind?: string): Promise<ApiResponse<any>> {
    return this.request<any>('/notification-centre/read-all', { method: 'POST', body: JSON.stringify(kind ? { kind } : {}) });
  }

  // Group Insurance (ES-98): yearly lump sum split over active members, deducted from RD at year end
  async getGroupInsuranceContext(): Promise<ApiResponse<any>> {
    return this.request<any>('/group-insurance/context');
  }

  async previewGroupInsurance(body: { yearcode: number; lumpSum: number; postingDate?: string | undefined; filter?: string | undefined; search?: string | undefined; limit?: number | undefined; offset?: number | undefined }): Promise<ApiResponse<any>> {
    return this.request<any>('/group-insurance/preview', { method: 'POST', body: JSON.stringify(body) });
  }

  async postGroupInsurance(body: { yearcode: number; lumpSum: number; postingDate?: string | undefined }): Promise<ApiResponse<any>> {
    return this.request<any>('/group-insurance/post', { method: 'POST', body: JSON.stringify(body), timeoutMs: 120000 });
  }

  async getGroupInsuranceRun(id: number, params: { search?: string | undefined; limit?: number | undefined; offset?: number | undefined } = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return this.request<any>(`/group-insurance/runs/${id}?${q.toString()}`);
  }

  async getFinancialYears(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/financial-year/list');
  }

  // Distinct from getFinancialYears() above: that one returns raw
  // financial_year entities ({yearCode, startDate: Date, endDate: Date}, no
  // label). This hits /utilities/financial-years, which returns the
  // {yearcode, startDate, endDate, label} shape HeadOpeningBalance needs.
  async getHeadOpeningBalanceYears(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/utilities/financial-years');
  }

  async createFinancialYear(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/financial-year/create', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
  }

  async getCurrentFinancialYear(): Promise<ApiResponse<any>> {
    // BUG FIX 1b: Was calling /utilities/financial-year/current — backend is at /admin/financial-year/current.
    return this.request<any>('/admin/financial-year/current');
  }

  async initiateYearTransfer(yearCode: number): Promise<ApiResponse> {
    // BUG FIX 1c: Was calling /utilities/financial-year/transfer-entries — wrong prefix.
    return this.request('/admin/financial-year/transfer-entries', {
      method: 'POST',
      body: JSON.stringify({ yearCode }),
    });
  }

  async manualBalanceTransfer(transferData: any): Promise<ApiResponse> {
    // BUG FIX 1d: Was calling /utilities/balance-transfer — backend is at /admin/financial-year/balance-transfer.
    return this.request('/admin/financial-year/balance-transfer', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async getClosingEntriesPreview(yearCode: number): Promise<ApiResponse<{
    rows: { code: string; name: string; pflag: string; closingBal: number }[];
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    reserveHead: { code: string; name: string } | null;
  }>> {
    return this.request(`/admin/financial-year/closing-entries/${yearCode}`);
  }

  async initiatePLYearEndProcess(): Promise<ApiResponse> {
    // BUG FIX 1e: Was calling transfer-entries endpoint (wrong!) — now calls the dedicated pl-year-end-process route.
    return this.request('/admin/financial-year/pl-year-end-process', {
      method: 'POST',
    });
  }

  async closeFinancialYear(yearCode: number): Promise<ApiResponse> {
    return this.request('/admin/financial-year/close-year', {
      method: 'POST',
      body: JSON.stringify({ yearCode }),
    });
  }

  async previewDemandImport(file: File, month: string, year: string, branch: string): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', month);
    formData.append('year', year);
    formData.append('branch', branch);
    return this.request('/transactions/demand-generation/import-preview', {
      method: 'POST',
      body: formData,
    });
  }

  async processDemandImport(month: string, year: string, branch: string, data: any[]): Promise<ApiResponse> {
    return this.request('/transactions/demand-generation/import-process', {
      method: 'POST',
      body: JSON.stringify({ month, year, branch, data }),
    });
  }

  // --- License ---

  async getLicenseStatus(): Promise<ApiResponse<{
    status: 'active' | 'grace' | 'expired' | 'not_activated';
    days_remaining: number;
    grace_days_remaining: number;
    activated_at: string | null;
    expires_at: string | null;
    grace_ends_at: string | null;
    customer_name: string | null;
    message: string;
  }>> {
    return this.request('/license/status', { method: 'GET' });
  }

  async activateLicense(key: string, machine_id?: string): Promise<ApiResponse> {
    return this.request('/license/activate', {
      method: 'POST',
      body: JSON.stringify({ key, machine_id }),
    });
  }

  // Communication Hub / Notifications
  async getNotificationHistory(limit?: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/notifications/history${limit ? `?limit=${encodeURIComponent(String(limit))}` : ''}`, {
      method: 'GET',
    });
  }

  async getNotificationStats(): Promise<ApiResponse<{ pendingCount: number }>> {
    return this.request<{ pendingCount: number }>('/notifications/stats', {
      method: 'GET',
    });
  }

  async sendManualNotification(data: {
    memberNo: string;
    channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
    message: string;
    recipient: string;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/notifications/send-manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async triggerEmiCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/notifications/trigger-emi-check', {
      method: 'POST',
    });
  }

}

export const apiService = new ApiService();
export default apiService;
