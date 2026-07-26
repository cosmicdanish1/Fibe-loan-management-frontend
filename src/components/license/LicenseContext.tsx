import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';

export type LicenseStatus = 'checking' | 'not_activated' | 'active' | 'grace' | 'expired';

interface LicenseState {
  status: LicenseStatus;
  daysRemaining: number;
  graceDaysRemaining: number;
  message: string;
  customerName: string | null;
  expiresAt: string | null;
}

interface LicenseContextValue extends LicenseState {
  refresh: () => Promise<void>;
  isInitializing: boolean;
}

const defaultState: LicenseState = {
  status: 'checking',
  daysRemaining: 0,
  graceDaysRemaining: 0,
  message: '',
  customerName: null,
  expiresAt: null,
};

const LicenseContext = createContext<LicenseContextValue>({
  ...defaultState,
  refresh: async () => {},
  isInitializing: true,
});

export const useLicense = () => useContext(LicenseContext);

function mapPayload(payload: any): LicenseState {
  return {
    status: payload?.status ?? 'not_activated',
    daysRemaining: payload?.days_remaining ?? 0,
    graceDaysRemaining: payload?.grace_days_remaining ?? 0,
    message: payload?.message ?? '',
    customerName: payload?.customer_name ?? null,
    expiresAt: payload?.expires_at ?? null,
  };
}

/**
 * Returns a LicenseState when the backend responds definitively.
 * Returns null when the backend is unreachable / times out — callers must
 * NOT downgrade the current status to 'not_activated' on a null result.
 */
async function fetchFreshStatus(): Promise<LicenseState | null> {
  try {
    const res = await apiService.getLicenseStatus();
    if (res.success && res.data) {
      const payload = (res.data as any).data || res.data;
      return mapPayload(payload);
    }
    // Backend responded but gave no usable data → treat as not activated
    return { ...defaultState, status: 'not_activated' };
  } catch {
    // Network error / backend not ready — do NOT downgrade to not_activated
    return null;
  }
}

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LicenseState>(defaultState);
  const [isInitializing, setIsInitializing] = useState(true);

  /**
   * refresh() — hits the backend API directly.
   * Only updates state when the backend gives a definitive answer.
   * A null result (network error / backend not ready) is ignored so we never
   * wrongly downgrade an already-active license to 'not_activated'.
   */
  const refresh = useCallback(async () => {
    const fresh = await fetchFreshStatus();
    if (fresh === null) return; // backend unreachable — keep current state
    setState(fresh);
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.updateLicenseCache) {
        electronAPI.updateLicenseCache(fresh);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // On mount:
    // 1. Immediately apply whatever the main-process cached (disk-persisted),
    //    so the app opens instantly without waiting for the backend.
    // 2. Always fire a background refresh so the status is confirmed / updated.
    //    If the backend is unreachable, refresh() is a no-op (won't downgrade).
    (async () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.getLicenseStatus) {
          const cached = await electronAPI.getLicenseStatus();
          if (cached) {
            setState(mapPayload(cached));
            // Don't return — still refresh in background to confirm/update status
          }
        }
      } catch {}
      // Background refresh: confirms the cached state or updates it.
      // Safe to call even after a cache hit — null result is ignored.
      await refresh();
      // Only show the banner after the first real API check completes
      setIsInitializing(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LicenseContext.Provider value={{ ...state, refresh, isInitializing }}>
      {children}
    </LicenseContext.Provider>
  );
};
