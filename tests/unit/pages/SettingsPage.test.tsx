// Settings window: smoke test of the shell, the tabs per role and the Developer tab (administrator only, ES-623).
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const { api, auth } = vi.hoisted(() => ({
  api: new Proxy({
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
  } as Record<string, any>, {
    // every other api call used by a Settings section answers "nothing yet"
    get: (t, k: string) => (k in t ? t[k] : (t[k] = vi.fn(async () => ({ success: true, data: {} })))),
  }),
  auth: { user: { username: 'danish', role: 'administrator' } as any },
}));

vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/auth/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock('../../../src/components/license/LicenseContext', () => ({ useLicense: () => ({ status: { state: 'active' }, refresh: vi.fn() }) }));
vi.mock('../../../src/features/onboarding/onboardingApi', () => ({ onboardingApi: new Proxy({}, { get: () => vi.fn(async () => ({})) }) }));

import SettingsPage from '../../../src/components/settings/SettingsPage';
import themeReducer from '../../../src/store/slices/themeSlice';

const renderPage = () => render(
  <Provider store={configureStore({ reducer: { theme: themeReducer } as any })}>
    <SettingsPage />
  </Provider>,
);

describe('Settings window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear(); localStorage.clear();
    auth.user = { username: 'danish', role: 'administrator' };
    api.getUserPreferences.mockResolvedValue({ success: true, data: {} });
    api.updateUserPreferences.mockResolvedValue({ success: true, data: {} });
  });

  it('opens on Appearance and loads the user\'s saved preferences once', async () => {
    renderPage();
    await waitFor(() => expect(api.getUserPreferences).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText(/Appearance/i).length).toBeGreaterThan(0);
  });

  it('an administrator is offered the admin sections (alerts, assistant, approvers)', async () => {
    renderPage();
    await waitFor(() => expect(api.getUserPreferences).toHaveBeenCalled());
    const text = document.body.textContent || '';
    for (const tab of ['Notifications', 'Approvers', 'AI Assistant', 'Forgot Password']) expect(text).toContain(tab);
  });

  it('a normal user does not see the admin-only sections', async () => {
    auth.user = { username: 'clerk', role: 'user' };
    renderPage();
    await waitFor(() => expect(api.getUserPreferences).toHaveBeenCalled());
    const text = document.body.textContent || '';
    for (const tab of ['Notifications', 'Approvers', 'AI Assistant', 'Forgot Password']) expect(text).not.toContain(tab);
  });

  it('a failed preferences load does not break the window', async () => {
    api.getUserPreferences.mockRejectedValue(new Error('offline'));
    renderPage();
    await waitFor(() => expect(api.getUserPreferences).toHaveBeenCalled());
    expect(screen.getAllByText(/Appearance/i).length).toBeGreaterThan(0);
  });

  // ---- ES-623: the Developer tab is administrator-only ----
  it('an administrator sees the Dev lock button, and a saved developer flag opens the Developer tab', async () => {
    sessionStorage.setItem('developerModeEnabled', 'true');
    renderPage();
    await waitFor(() => expect(document.body.textContent).toContain('Developer'));
    expect(document.body.textContent).toContain('Dev Active');
  });

  it('without the flag the Developer tab stays hidden for an administrator and the lock button is offered', async () => {
    renderPage();
    await waitFor(() => expect(api.getUserPreferences).toHaveBeenCalled());
    expect(document.body.textContent).toContain('Dev Locked');
    expect(document.body.textContent).not.toContain('Dev Active');
  });

  it('a normal user gets neither the lock button nor the Developer tab, even with the flag typed into the console', async () => {
    auth.user = { username: 'clerk', role: 'user' };
    sessionStorage.setItem('developerModeEnabled', 'true');
    renderPage();
    await waitFor(() => expect(api.getUserPreferences).toHaveBeenCalled());
    const text = document.body.textContent || '';
    expect(text).not.toContain('Developer');
    expect(text).not.toContain('Dev Locked');
    expect(text).not.toContain('Dev Active');
  });
});
