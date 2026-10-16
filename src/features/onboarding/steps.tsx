import React from 'react';
import { Compass, KeyRound, RotateCcw, Sparkles, UserRound } from 'lucide-react';
import type { User } from '../../auth/types/auth.types';
import type { OnboardingStatus } from './onboardingApi';
import ProfileStep from './ProfileStep';
import PasswordStep from './PasswordStep';

export interface StepContext {
  user: User;
  /** Go to the next step (or finish on the last one). */
  next: () => void;
  /** Tell the dialog this step's task is done, so its button changes from "Skip" to "Next". */
  setDone: (done: boolean) => void;
}

/**
 * Ordered list of walkthrough steps. The engine (OnboardingHost) only knows this
 * contract, so the other ES-146 stories (tour, slides, checklist) plug in by adding an entry here.
 */
export interface OnboardingStep {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  /** For optional steps: label of the forward button until the step's task is done, e.g. "Skip for now". */
  skipLabel?: string;
  /** Hide the step for some users (role-based tours) or situations (already done before). */
  enabled?: (user: User, status: OnboardingStatus | null) => boolean;
  render: (ctx: StepContext) => React.ReactNode;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <li className="ob-feature">
    <div className="ob-feature-icon">{icon}</div>
    <div><b>{title}</b><span>{text}</span></div>
  </li>
);

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome aboard',
    subtitle: 'A quick start, about a minute',
    icon: <Sparkles size={22} />,
    render: ({ user }) => (
      <>
        <p className="ob-lead">Hello <strong>{user.username}</strong>, here is what happens next. You can skip at any time.</p>
        <ul className="ob-features">
          <Feature icon={<UserRound size={18} />} title="Your profile" text="See how your account is set up." />
          <Feature icon={<KeyRound size={18} />} title="Your own password" text="Optional: replace the one you were given." />
          <Feature icon={<Compass size={18} />} title="A quick tour" text="Hand-drawn pointers, then slides on how loans and day-end work." />
          <Feature icon={<RotateCcw size={18} />} title="Come back any time" text="Help › Replay Tour runs this again." />
        </ul>
      </>
    ),
  },
  {
    id: 'profile',
    title: 'Your profile',
    subtitle: 'This is how the system knows you',
    icon: <UserRound size={22} />,
    render: ({ user }) => <ProfileStep user={user} />,
  },
  {
    id: 'password',
    title: 'Set your own password',
    subtitle: 'Optional, you can do it later in Change Password',
    icon: <KeyRound size={22} />,
    skipLabel: 'Skip for now',
    // Only for a first walkthrough: replaying the tour later should not ask again.
    enabled: (_user, status) => !status?.completedAt,
    render: ({ user, next, setDone }) => <PasswordStep user={user} onDone={() => { setDone(true); next(); }} onChanged={() => setDone(true)} />,
  },
];

