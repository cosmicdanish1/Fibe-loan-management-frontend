import type { User } from '../../auth/types/auth.types';
import { isActionAllowed } from '../../config/menuActions';

/**
 * What the walkthrough knows about the person: it follows the same menu rights the Navbar uses
 * (Configure UserLevel Default Rights), not role names, because user levels are free-form.
 * `allowedActions` of null/undefined means unrestricted, which is how administrators arrive.
 */
export const isUnrestricted = (user: User): boolean => !user.allowedActions;

export const isAdminUser = (user: User): boolean =>
  isUnrestricted(user) || ['administrator', 'admin', 'system'].includes(String(user.role || '').toLowerCase());

/** True if the user may open at least one of these menu actions. */
export const canUseAny = (user: User, ...actions: string[]): boolean =>
  actions.some((a) => isActionAllowed(user.allowedActions, a));

export interface Highlight { action: string; label: string }

/** "A, B and C" (at most `max` names, then "and N more"). */
export const joinNames = (names: string[], max = 4): string => {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  const list = more > 0 ? [...shown, `${more} more`] : shown;
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

/** The labels from `highlights` that this user may actually open. */
export const allowedLabels = (user: User, highlights: Highlight[]): string[] =>
  highlights.filter((h) => isActionAllowed(user.allowedActions, h.action)).map((h) => h.label);
