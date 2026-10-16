import type { CSSProperties } from 'react';
import { glassVars, useUiPrefs } from '../../services/uiPrefs';

/**
 * The walkthrough wears the same liquid-glass as the notification panel, so it follows the same
 * Settings switch (System & Window > Notifications: glass on/off and strength).
 */
export const useGlass = (): CSSProperties => {
  const { notif } = useUiPrefs();
  return glassVars(notif.glass, notif.glassStrength);
};
