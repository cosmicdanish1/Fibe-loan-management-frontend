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
};
