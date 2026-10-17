import { useEffect, useState } from 'react';

const KEY = 'onboarding.calm';

/** True when the person asked for no motion: in Settings > Welcome Tour, or in the operating system. */
export const prefersCalm = (): boolean => {
  try { if (localStorage.getItem(KEY) === '1') return true; } catch { /* storage unavailable */ }
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
};

/** Settings switch. Written to localStorage, which every window of the app shares. */
export const setCalmPreference = (on: boolean): void => {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('onboarding:calm'));
};

export const getCalmPreference = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

/** Re-renders when the setting changes (here or in another window). */
export const useCalm = (): boolean => {
  const [calm, setCalm] = useState(prefersCalm);
  useEffect(() => {
    const refresh = () => setCalm(prefersCalm());
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    window.addEventListener('onboarding:calm', refresh);
    window.addEventListener('storage', refresh);
    mq?.addEventListener?.('change', refresh);
    return () => {
      window.removeEventListener('onboarding:calm', refresh);
      window.removeEventListener('storage', refresh);
      mq?.removeEventListener?.('change', refresh);
    };
  }, []);
  return calm;
};
