// Exit Application window (ES-621): ESC cancels, Cancel works in its own window, Exit signs the user out before quitting.
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, navigate } = vi.hoisted(() => ({ api: { logout: vi.fn() }, navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));

import ExitOption1 from '../../../src/service/Exit/ExitOption1/page/ExitOption1';

// the bar ticks every 20 ms; advancing tick by tick (as the real clock does) keeps React's updates from being batched together
const tick = async (ms: number) => { for (let i = 0; i < ms / 20; i++) await act(async () => { vi.advanceTimersByTime(20); }); };
const setHistory = (n: number) => Object.defineProperty(window.history, 'length', { configurable: true, value: n });

describe('Exit Application window', () => {
  const quitApp = vi.fn();
  const forceQuitApp = vi.fn();
  const closeWindow = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockClear(); quitApp.mockClear(); forceQuitApp.mockClear(); closeWindow.mockClear();
    api.logout.mockReset(); api.logout.mockResolvedValue({ success: true });
    (window as any).electronAPI = { quitApp, forceQuitApp, closeWindow };
    setHistory(2);
  });
  afterEach(() => { vi.useRealTimers(); delete (window as any).electronAPI; delete (window as any).electron; });

  it('asks for confirmation first, with the unsaved-changes warning', () => {
    render(<ExitOption1 />);
    expect(screen.getAllByText('Exit Application').length).toBeGreaterThan(0);
    expect(screen.getByText(/All unsaved changes will be lost/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Exit$/ })).toBeInTheDocument();
    expect(quitApp).not.toHaveBeenCalled();
    expect(api.logout).not.toHaveBeenCalled();
  });

  it('Cancel goes back one page and does not quit or sign out', () => {
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(navigate).toHaveBeenCalledWith(-1);
    expect(quitApp).not.toHaveBeenCalled();
    expect(api.logout).not.toHaveBeenCalled();
  });

  it('Cancel in a window opened on its own (nothing to go back to) closes that window', () => {
    setHistory(1);
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(navigate).not.toHaveBeenCalled();
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });

  it('ESC cancels, as the footer says', () => {
    render(<ExitOption1 />);
    expect(screen.getByText('Press ESC to cancel')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('other keys do not cancel, and ESC does nothing once the exit has started', async () => {
    render(<ExitOption1 />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Exit$/ }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Exit signs the user out at once, shows the progress, then quits the app at 100% and force-quits a second later', async () => {
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /^Exit$/ }));
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByText(/All unsaved changes/)).not.toBeInTheDocument();
    await tick(20 * 25);
    expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(40);
    expect(quitApp).not.toHaveBeenCalled();
    await tick(20 * 30);
    expect(quitApp).toHaveBeenCalledTimes(1);
    expect(forceQuitApp).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(forceQuitApp).toHaveBeenCalledTimes(1);
  });

  it('the app still quits when the server never answers the sign-out (after a short wait)', async () => {
    api.logout.mockReturnValue(new Promise(() => undefined));
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /^Exit$/ }));
    await tick(20 * 55);                       // bar finished
    expect(quitApp).not.toHaveBeenCalled();    // still waiting for the server
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(quitApp).toHaveBeenCalledTimes(1);
  });

  it('the app still quits when the sign-out fails', async () => {
    api.logout.mockRejectedValue(new Error('offline'));
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /^Exit$/ }));
    await tick(20 * 55);
    expect(quitApp).toHaveBeenCalledTimes(1);
  });

  it('quits only once, however long the window stays open', async () => {
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /^Exit$/ }));
    await tick(20 * 70);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(quitApp).toHaveBeenCalledTimes(1);
    expect(api.logout).toHaveBeenCalledTimes(1);
  });

  it('uses the legacy IPC channel when only window.electron is present', async () => {
    delete (window as any).electronAPI;
    const send = vi.fn();
    (window as any).electron = { ipcRenderer: { send, on: vi.fn(), removeAllListeners: vi.fn() } };
    render(<ExitOption1 />);
    fireEvent.click(screen.getByRole('button', { name: /^Exit$/ }));
    await tick(20 * 60);
    expect(send).toHaveBeenCalledWith('app-quit');
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(send).toHaveBeenCalledWith('app-quit-force');
  });
});
