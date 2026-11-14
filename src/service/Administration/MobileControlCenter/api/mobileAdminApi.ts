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

export interface FeatureFlagRow { key: string; enabled: boolean; description: string | null; updatedBy: string | null; updatedAt: string }
export interface AppVersionRow { platform: 'android' | 'ios'; latestVersion: string | null; minSupportedVersion: string | null; storeUrl: string | null; message: string | null; updatedBy: string | null; updatedAt: string }
export interface FeaturesState { flags: FeatureFlagRow[]; versions: AppVersionRow[]; maintenance: { enabled: boolean; message: string } }

export interface AuditRow {
  id: number; at: string; mbno: string | null; event: string; result: string | null; method: string | null; endpoint: string | null;
  statusCode: number | null; deviceRef: string | null; ip: string | null; appVersion: string | null; platform: string | null; detail: Record<string, unknown> | null;
}
export interface AuditFilter { mbno?: string; event?: string; result?: string; ip?: string; deviceId?: string; from?: string; to?: string; limit?: number; offset?: number }
export interface Monitors {
  last24h: { loginFailed: number; loginOk: number; appCodeFailed: number; activationFailed: number; lockouts: number; tokenReuse: number };
  topFailingIps: Array<{ ip: string; failures: number; members: number }>;
  topFailingMembers: Array<{ mbno: string; failures: number }>;
  lockedAccounts: number;
  activeBlocks: number;
}
export interface BlockRow { id: number; kind: 'IP' | 'DEVICE'; value: string; reason: string | null; blockedBy: string | null; blockedAt: string }

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

  // Features and releases (ES-241)
  features: () => call<FeaturesState>(apiService.get(`${base}/features`), 'Could not load the features'),
  setFlag: (key: string, enabled: boolean) => call<{ key: string; enabled: boolean }>(apiService.post(`${base}/features/flags/${key}`, { enabled }), 'Could not change the switch'),
  setVersion: (platform: string, v: { latestVersion: string; minSupportedVersion: string; storeUrl?: string | undefined; message?: string | undefined }) =>
    call<{ platform: string }>(apiService.post(`${base}/features/versions/${platform}`, v), 'Could not save the versions'),
  setMaintenance: (enabled: boolean, text: string) => call<{ enabled: boolean }>(apiService.post(`${base}/features/maintenance`, { enabled, message: text }), 'Could not change maintenance mode'),

  // Security and audit (ES-243)
  monitors: () => call<Monitors>(apiService.get(`${base}/monitors`), 'Could not load the monitors'),
  audit: (f: AuditFilter) => call<AuditRow[]>(apiService.get(`${base}/audit`, { params: { ...f } }), 'Could not search the audit trail'),
  auditExport: (f: AuditFilter) => call<{ fileName: string; csv: string }>(apiService.get(`${base}/audit/export`, { params: { ...f, limit: undefined, offset: undefined } }), 'Could not export'),
  blocklist: () => call<BlockRow[]>(apiService.get(`${base}/blocklist`), 'Could not load the block list'),
  blockTarget: (kind: 'IP' | 'DEVICE', value: string, reason: string) => call<{ id: number }>(apiService.post(`${base}/blocklist`, { kind, value, reason }), 'Could not block'),
  unblockTarget: (id: number) => call<{ unblocked: true }>(apiService.post(`${base}/blocklist/${id}/unblock`), 'Could not lift the block'),
};
