import { apiService } from '../../services/api';

export type OnboardingMode = 'first' | 'always' | 'never';
export type UserOnboardingMode = OnboardingMode | 'default';

export interface TermsStatus { version: string; accepted: boolean; acceptedAt: string | null }
export interface TermsDocument { version: string; text: string }

export interface OnboardingProfile {
  username: string;
  fullName: string;
  email: string | null;
  role: string | null;
  avatar: string | null;
  memberSince: string | null;
  lastLogin: string | null;
}

export type ChecklistItemId = 'terms' | 'profile' | 'password' | 'twofa' | 'tour' | 'slides' | 'windows';
export interface ChecklistStatus {
  items: { id: ChecklistItemId; done: boolean }[];
  doneCount: number;
  total: number;
  dismissed: boolean;
  windowsOpened: number;
  windowsNeeded: number;
}

export interface OnboardingReport {
  totalUsers: number;
  started: number;
  completed: number;
  tourDone: number;
  slidesDone: number;
  steps: { step: string; reached: number; skipped: number }[];
  terms: {
    version: string;
    accepted: number;
    pending: { username: string }[];
    pendingTotal: number;
    recent: { username: string; version: string; acceptedAt: string }[];
  };
}

export type OnboardingEventName = 'start' | 'replay' | 'dialog_step' | 'skip' | 'tour_step' | 'tour_done' | 'slides_done';

export interface OnboardingStatus {
  terms: TermsStatus;
  shouldShow: boolean;
  effectiveMode: OnboardingMode;
  globalMode: OnboardingMode;
  userMode: UserOnboardingMode;
  completedAt: string | null;
  lastStep: string | null;
}

/** Fired on window to start the walkthrough on demand (Help > Replay Tour). */
export const ONBOARDING_REPLAY_EVENT = 'onboarding:replay';
/** Fired on window when checklist progress changed, so the checklist can refresh. */
export const ONBOARDING_PROGRESS_EVENT = 'onboarding:progress';
/** Fired on window to open the getting-started checklist (Help > Getting Started). */
export const ONBOARDING_CHECKLIST_EVENT = 'onboarding:checklist';
/** Fired on window to open the "How it works" slides (Help > How It Works). */
export const ONBOARDING_SLIDES_EVENT = 'onboarding:slides';

// apiService never throws: a failed call comes back as { success: false, error }. Turn that into a
// real error so callers cannot mistake it for data (e.g. recording a terms acceptance that failed).
const unwrap = (res: any) => {
  if (res?.success === false) throw new Error(res.message || res.error || 'Request failed');
  return res?.data ?? res;
};

export const onboardingApi = {
  status: async (): Promise<OnboardingStatus> => unwrap(await apiService.get('/onboarding/status')),
  profile: async (): Promise<OnboardingProfile | null> => unwrap(await apiService.get('/onboarding/profile')),
  terms: async (): Promise<TermsDocument> => unwrap(await apiService.get('/onboarding/terms')),
  acceptTerms: async (version: string): Promise<TermsStatus> =>
    unwrap(await apiService.post('/onboarding/terms/accept', { version })),
  complete: async (version?: string): Promise<OnboardingStatus> =>
    unwrap(await apiService.post('/onboarding/complete', { version })),
  saveStep: async (step: string): Promise<void> => { await apiService.post('/onboarding/step', { step }); },
  setPreference: async (mode: UserOnboardingMode): Promise<OnboardingStatus> =>
    unwrap(await apiService.put('/onboarding/preference', { mode })),
  setGlobalMode: async (mode: OnboardingMode): Promise<{ globalMode: OnboardingMode }> =>
    unwrap(await apiService.put('/onboarding/global-mode', { mode })),
  checklist: async (): Promise<ChecklistStatus> => unwrap(await apiService.get('/onboarding/checklist')),
  showChecklist: async (): Promise<ChecklistStatus> => unwrap(await apiService.post('/onboarding/checklist/show')),
  report: async (): Promise<OnboardingReport> => unwrap(await apiService.get('/onboarding/report')),
};

/**
 * Ticks a checklist item (profile, password, tour, slides, dismissed, window:<ACTION>) and tells the
 * checklist to refresh. Fire-and-forget: progress tracking must never get in the user's way.
 */
export const markProgress = (item: string): void => {
  apiService.post('/onboarding/checklist', { item })
    .then((res: any) => { if (res?.success !== false) window.dispatchEvent(new Event(ONBOARDING_PROGRESS_EVENT)); })
    .catch(() => undefined);
};

const openedThisSession = new Set<string>();
/** Counts a menu window towards "open three windows", once per window per app run. */
export const markWindowOpened = (action: string): void => {
  if (!/^[A-Z0-9_]{2,40}$/.test(action) || openedThisSession.has(action)) return;
  openedThisSession.add(action);
  markProgress(`window:${action}`);
};

/** Records a walkthrough event for the admin insights. Fire-and-forget. */
export const trackEvent = (event: OnboardingEventName, step?: string): void => {
  apiService.post('/onboarding/event', { event, step }).catch(() => undefined);
};
