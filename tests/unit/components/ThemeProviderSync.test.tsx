// ES-668: the look is loaded on every login and every change is saved to the server by itself.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import themeReducer, { setTheme } from '../../../src/store/slices/themeSlice';

let auth = { isAuthenticated: true, user: { id: 1, username: 'a' } as any };
vi.mock('../../../src/auth/context/AuthContext', () => ({ useAuth: () => auth }));

const api = vi.hoisted(() => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
}));
vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('../../../src/config/motion', () => ({ useMotion: () => ({ resolved: { mode: 'off', lite: false } }) }));

import ThemeProvider from '../../../src/components/shared/ThemeProvider';

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

describe('ThemeProvider sync (ES-668)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    api.getUserPreferences.mockReset();
    api.updateUserPreferences.mockReset().mockResolvedValue({ success: true });
    auth = { isAuthenticated: true, user: { id: 1, username: 'a' } };
  });
  afterEach(() => vi.useRealTimers());

  const mount = () => {
    const store = configureStore({ reducer: { theme: themeReducer } });
    const ui = () => <Provider store={store}><ThemeProvider><div /></ThemeProvider></Provider>;
    const r = render(ui());
    return { store, rerender: () => r.rerender(ui()) };
  };

  it('the default look is sky blue', () => {
    const { store } = mount();
    expect(store.getState().theme.accentColor).toBe('#0ea5e9');
  });

  it('loads the saved look again for the next person after a logout and login', async () => {
    api.getUserPreferences
      .mockResolvedValueOnce({ success: true, data: { accentColor: '#111111', fontScale: 1.2 } })
      .mockResolvedValueOnce({ success: true, data: { accentColor: '#222222', fontScale: 0.9 } });
    const { store, rerender } = mount();
    await flush();
    expect(store.getState().theme.accentColor).toBe('#111111');

    auth = { isAuthenticated: false, user: null };
    rerender(); await flush();
    auth = { isAuthenticated: true, user: { id: 2, username: 'b' } };
    rerender(); await flush();

    expect(api.getUserPreferences).toHaveBeenCalledTimes(2);
    expect(store.getState().theme.accentColor).toBe('#222222');
    expect(store.getState().theme.fontScale).toBe(0.9);
  });

  it('saves a change by itself, sending only what changed', async () => {
    api.getUserPreferences.mockResolvedValue({ success: true, data: { accentColor: '#111111', fontScale: 1 } });
    const { store } = mount();
    await flush();
    expect(api.updateUserPreferences).not.toHaveBeenCalled(); // loading the server copy is not a change

    act(() => { store.dispatch(setTheme({ fontScale: 1.2 })); });
    await act(async () => { vi.advanceTimersByTime(900); });
    expect(api.updateUserPreferences).toHaveBeenCalledTimes(1);
    expect(api.updateUserPreferences).toHaveBeenCalledWith({ fontScale: 1.2 });
  });
});
