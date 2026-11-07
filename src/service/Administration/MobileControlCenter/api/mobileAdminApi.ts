import { apiService } from '../../../../services/api';

// Staff API of the Mobile Control Center (backend: /admin/mobile/*). The authenticator-code prompt for sensitive actions
// is handled centrally by apiService (services/authCodeGate.ts), so no window needs its own code-entry UI.

export type AccessStatus = 'NOT_ACTIVATED' | 'REQUEST_PENDING' | 'ACTIVE' | 'LOCKED' | 'BLOCKED' | 'DEACTIVATED';
export type PhoneStatus = 'OK' | 'MISSING' | 'INVALID' | 'SHARED';

export interface MemberRow {
  mbno: string;
  name: string;
  accessStatus: AccessStatus;
  phoneStatus: PhoneStatus;
  lastLogin: string | null;
}

export interface MemberDetail {
  member: { mbno: string; name: string; isActive: boolean; phone: string | null; phoneStatus: PhoneStatus; phoneSharedCount: number };
  access: { status: AccessStatus; failedAttempts: number; lockedUntil?: string | null; activatedAt?: string | null; blockedReason?: string | null; blockedBy?: string | null };
  devices: Array<{ id: number; platform: string | null; model: string | null; appVersion: string | null; lastSeen: string | null; revoked: boolean; since: string }>;
  codes: Array<{ issuedBy: string; issuedAt: string; expiresAt: string; usedAt: string | null; burned: boolean; wrongAttempts: number }>;
  requests: Array<{ id: number; status: string; match: RequestMatch | null; createdAt: string; handledBy: string | null; handledAt: string | null; note: string | null }>;
  recentActivity: Array<{ at: string; event: string; result: string | null; detail: Record<string, unknown> | null }>;
}

export interface RequestMatch {
  dob: boolean;
  pan: boolean;
  phone: boolean;
  phoneStatus: PhoneStatus;
  phoneSharedCount: number;
}

export interface ActivationRequestRow {
  id: number;
  mbno: string;
  name: string;
  status: 'NEW' | 'CALLED_BACK' | 'APPROVED' | 'REJECTED';
  match: RequestMatch | null;
  phone: string | null;
  createdAt: string;
  handledBy: string | null;
  handledAt: string | null;
  note: string | null;
}

export interface IssuedCode {
  code: string;
  display: string;
  expiresAt: string;
  memberName: string;
}

export interface PhoneQualitySummary {
  activeMembers: number;
  ok: number;
  missing: number;
  invalid: number;
  shared: number;
  canSelfActivate: number;
  sharedNumbers: Array<{ phone: string; members: number }>;
}
export interface PhoneQualityMember { mbno: string; name: string; phone: string | null; sharedCount: number }

const unwrap = (raw: any) => (raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw);

async function call<T>(p: Promise<any>, fallback: string): Promise<T> {
  const raw = await p;
  if (raw?.success === false) throw new Error(raw.message || raw.error || fallback);
  return unwrap(raw) as T;
}

const base = '/admin/mobile';

export const mobileAdminApi = {
  phoneQuality: () => call<PhoneQualitySummary>(apiService.get(`${base}/phone-quality`), 'Could not load the phone report'),
  phoneQualityMembers: (status: string, offset = 0) =>
    call<PhoneQualityMember[]>(apiService.get(`${base}/phone-quality/members`, { params: { status, offset, limit: 100 } }), 'Could not load the list'),
  searchMembers: (q: string) => call<MemberRow[]>(apiService.get(`${base}/members`, { params: { q } }), 'Search failed'),
  memberDetail: (mbno: string) => call<MemberDetail>(apiService.get(`${base}/members/${mbno}`), 'Could not load the member'),
  issueCode: (mbno: string) => call<IssuedCode>(apiService.post(`${base}/members/${mbno}/activation-code`), 'Could not issue the code'),
  resetMpin: (mbno: string) => call<IssuedCode>(apiService.post(`${base}/members/${mbno}/reset-mpin`), 'Could not reset the MPIN'),
  unlock: (mbno: string) => call<{ status: string }>(apiService.post(`${base}/members/${mbno}/unlock`), 'Could not unlock'),
  block: (mbno: string, reason: string) => call<{ status: string }>(apiService.post(`${base}/members/${mbno}/block`, { reason }), 'Could not block'),
  unblock: (mbno: string) => call<{ status: string }>(apiService.post(`${base}/members/${mbno}/unblock`), 'Could not unblock'),
  signOutAll: (mbno: string) => call<{ devicesRevoked: number }>(apiService.post(`${base}/members/${mbno}/sign-out-all`), 'Could not sign out'),
  verifyAppCode: (mbno: string, code: string) =>
    call<{ result: 'ok' | 'wrong' | 'locked' | 'replay' | 'no_secret' | 'no_device' }>(apiService.post(`${base}/members/${mbno}/verify-app-code`, { code }), 'Could not check the code'),
  listRequests: (status: string) => call<ActivationRequestRow[]>(apiService.get(`${base}/activation-requests`, { params: { status } }), 'Could not load requests'),
  calledBack: (id: number, note?: string) => call<{ status: string }>(apiService.post(`${base}/activation-requests/${id}/called-back`, note ? { note } : {}), 'Could not save'),
  approve: (id: number) => call<IssuedCode>(apiService.post(`${base}/activation-requests/${id}/approve`), 'Could not approve'),
  reject: (id: number, note?: string) => call<{ status: string }>(apiService.post(`${base}/activation-requests/${id}/reject`, note ? { note } : {}), 'Could not reject'),
};
