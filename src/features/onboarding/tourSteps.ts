import type { User } from '../../auth/types/auth.types';
import { allowedLabels, Highlight, isAdminUser, joinNames } from './roleAccess';
import { tLabel } from '../../i18n';

export type DoodleKind = 'circle' | 'underline' | 'box';

/**
 * One stop of the doodle tour. `target` is a CSS selector for a real element of the dashboard
 * window (mostly `data-tour` attributes). A step whose target is not on screen is skipped, so
 * hidden widgets or menus the user has no rights to never leave a dangling arrow.
 *
 * Role-based tours (ES-149): `enabled` can drop a step for some users, `textFor` words a step
 * differently for administrators, and `highlights` appends "You can use ..." naming only the
 * windows from the list that this user's rights allow.
 */
export interface TourStep {
  id: string;
  target: string;
  title: string;
  text: string;
  doodle: DoodleKind;
  enabled?: (user: User) => boolean;
  textFor?: (user: User) => string;
  highlights?: Highlight[];
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'menu-admin', target: '[data-tour="menu-admin"]', doodle: 'underline',
    title: tLabel('Administration'), text: 'The tools your role allows in this menu.',
    textFor: (u) => (isAdminUser(u)
      ? 'The controls only administrators see: day-end, users and security, financial year closing and business rules.'
      : 'The few tools your role allows in this menu.'),
    highlights: [
      { action: 'LOAN_APP', label: tLabel('Loan Application') }, { action: 'DAY_END', label: tLabel('Day-End') },
      { action: 'USER_MANAGEMENT', label: tLabel('user management') }, { action: 'CHANGE_PASSWORD', label: tLabel('Change Password') },
    ] },
  { id: 'menu-masters', target: '[data-tour="menu-masters"]', doodle: 'underline',
    title: tLabel('Masters'), text: 'The reference data everything else relies on.',
    highlights: [
      { action: 'MEMBER_MASTER', label: tLabel('Member Master') }, { action: 'SAVING_AC_OPENING', label: tLabel('Saving A/c Opening') },
      { action: 'RD_MEMBER_SETUP', label: tLabel('RD Member Setup') }, { action: 'WING_OFFICE_MASTER', label: tLabel('Wing / Office Master') },
    ] },
  { id: 'menu-transaction', target: '[data-tour="menu-transaction"]', doodle: 'underline',
    title: tLabel('Transaction'), text: 'Your daily work is entered and passed here.',
    highlights: [
      { action: 'LOAN_PAYMENT', label: tLabel('Loan Payment') }, { action: 'LOAN_REPAYMENT', label: tLabel('Loan Repayment') },
      { action: 'RECEIPT_PAYMENT', label: tLabel('Receipt') }, { action: 'PASS_TRANSACTIONS', label: tLabel('Pass Transactions') },
      { action: 'GENERATE', label: tLabel('Demand Generate') }, { action: 'IMPORT_DEMAND_LIST', label: tLabel('Import Demand List') },
    ] },
  { id: 'menu-reports', target: '[data-tour="menu-reports"]', doodle: 'underline',
    title: tLabel('Reports'), text: 'Daily, monthly and yearly reports, ready to view or print in the familiar layout.' },
  { id: 'menu-utility', target: '[data-tour="menu-utility"]', doodle: 'underline',
    title: tLabel('Utility'), text: 'Handy tools. Stuck? Open Support Desk here to raise a ticket with the support team.',
    highlights: [
      { action: 'CALCULATOR', label: tLabel('Calculator') }, { action: 'EMI_CHART', label: tLabel('EMI Chart') },
      { action: 'DATABASE_BACKUP', label: tLabel('Database BackUp') },
    ] },
  { id: 'search', target: '[data-tour="search"]', doodle: 'box',
    title: tLabel('Find anything fast'), text: 'Type part of a window name, like "loan" or "day end", and jump straight to it.' },
  { id: 'notifications', target: '[data-tour="notifications"]', doodle: 'circle',
    title: tLabel('Notifications'), text: 'Reminders and alerts that need your attention show up under the bell.' },
  { id: 'connection', target: '[data-tour="connection"]', doodle: 'circle',
    title: tLabel('Server connection'), text: 'Green means you are connected to the server. If it turns red, tell your administrator.' },
  { id: 'profile-menu', target: '[data-tour="profile-menu"]', doodle: 'box',
    title: tLabel('Your account'), text: 'Open My Profile, change your password or log out from here.' },
  { id: 'quick-actions', target: '[data-bento-cell="quickActions"]', doodle: 'box',
    title: tLabel('Quick actions'), text: 'One-click shortcuts to the windows you use most. You can choose them in Settings.' },
  { id: 'notice-board', target: '[data-bento-cell="noticeBoard"]', doodle: 'box',
    title: tLabel('Notice board'), text: 'Post short notes for everyone to see, like a holiday or a cut-off time.' },
  { id: 'menu-help', target: '[data-tour="menu-help"]', doodle: 'underline',
    title: tLabel('Need this again?'), text: 'Help › Replay Tour runs this walkthrough, and How It Works replays the slides.' },
  { id: 'menu-settings', target: '[data-tour="menu-settings"]', doodle: 'underline',
    title: tLabel('Make it yours'), text: 'Colours, text size, dashboard widgets and when this tour appears: all in Settings.',
    textFor: (u) => (isAdminUser(u)
      ? 'Colours and widgets for you, and for everyone: notifications, approvers and the default for this tour.'
      : 'Colours, text size, dashboard widgets and when this tour appears: all in Settings.') },
];

export const TOUR_STEP_PREFIX = 'tour:';

/** The caption for a step, worded for this user and naming only the windows they may open. */
export const stepText = (step: TourStep, user: User): string => {
  const base = step.textFor ? step.textFor(user) : step.text;
  const names = step.highlights ? allowedLabels(user, step.highlights) : [];
  return names.length ? `${base} You can use ${joinNames(names)}.` : base;
};

const visible = (el: Element | null) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The steps that can actually be shown right now for this user (target on screen, step enabled). */
export const availableTourSteps = (user: User): TourStep[] =>
  TOUR_STEPS.filter((s) => (!s.enabled || s.enabled(user)) && visible(document.querySelector(s.target)));
