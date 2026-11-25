// Logout User: the live-user cards (green dot, faded offline cards, one-click logout), refresh, search, the Analytics tab,
// and the pure helpers.
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, dlg, auth } = vi.hoisted(() => ({
  api: { getLiveUsers: vi.fn(), getSessionAnalytics: vi.fn(), forceLogoutUser: vi.fn() },
  dlg: vi.fn(),
  auth: { user: { username: 'AdminDanish' } as any },
}));

vi.mock('../../../src/services/api', () => ({ default: api, apiService: api }));
vi.mock('../../../src/auth/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dlg }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string, o?: any) => (o ? s.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(o[k])) : s) }),
}));

import LogoutUser, { LIVE_REFRESH_MS } from '../../../src/service/Administration/Security/LogoutUser/page/LogoutUser';
import {
  initials, durationText, timeText, dateText, filterUsers, barPercent, busiestHours, hourText,
} from '../../../src/service/Administration/Security/LogoutUser/utils/sessions';

const U = (id: number, username: string, o: any = {}) => ({
  userId: id, username, fullName: null, role: 'CLERK', live: false, loginDate: '2026-08-25', loginTime: '09:00:00', loginAt: null,
  logoutTime: null, sessionMinutes: null, lastSeen: null, host: null, ip: null, version: null, ...o,
});
const LIVE = (users: any[]) => ({ success: true, data: { generatedAt: '', liveCount: users.filter((u) => u.live).length, totalCount: users.length, users } });
const BASE = [
  U(1, 'AdminDanish', { live: true, role: 'ADMINISTRATOR', sessionMinutes: 95, host: 'PC-1', ip: '10.0.0.1', fullName: 'Danish Q' }),
  U(2, 'amit', { live: true, sessionMinutes: 8, host: 'PC-2' }),
  U(3, 'zed', { live: false, loginTime: '08:00:00' }),
];
const STATS = {
  days: 30,
  totals: { sessions: 12, people: 3, avgMinutes: 65, neverClosed: 2, neverSignedIn: 4, liveNow: 2 },
  perDay: [{ day: '2026-11-24', sessions: 5, people: 2 }, { day: '2026-11-25', sessions: 7, people: 3 }],
  hours: [{ hour: 9, sessions: 6 }, { hour: 14, sessions: 3 }, { hour: 3, sessions: 0 }],
  topUsers: [{ username: 'amit', sessions: 7, lastLogin: null }, { username: 'zed', sessions: 2, lastLogin: null }],
};

let confirmSpy: any;
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { username: 'AdminDanish' };
  api.getLiveUsers.mockResolvedValue(LIVE(BASE));
  api.getSessionAnalytics.mockResolvedValue({ success: true, data: STATS });
  api.forceLogoutUser.mockResolvedValue({ success: true });
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { confirmSpy.mockRestore(); vi.useRealTimers(); });

const mount = async () => { render(<LogoutUser />); await screen.findByTestId('lu-card-amit'); };

describe('the live cards', () => {
  it('one card per user; live cards have the green dot and a Log out button, the offline card is faded with neither', async () => {
    await mount();
    for (const n of ['AdminDanish', 'amit']) {
      const c = screen.getByTestId(`lu-card-${n}`);
      expect(c).toHaveAttribute('data-live', 'true');
      expect(within(c).getByRole('img', { name: 'Live' })).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: `Log out ${n}` })).toBeInTheDocument();
    }
    const off = screen.getByTestId('lu-card-zed');
    expect(off).toHaveAttribute('data-live', 'false');
    expect(off.className).toMatch(/is-off/);
    expect(within(off).queryByRole('img', { name: 'Live' })).toBeNull();
    expect(within(off).queryByRole('button')).toBeNull();
  });

  it('a live card shows the sign-in time with how long, the login date and the computer; an offline card says last sign-in', async () => {
    await mount();
    const a = screen.getByTestId('lu-card-AdminDanish');
    expect(a).toHaveTextContent('09:00:00 · 1 h 35 min');
    expect(a).toHaveTextContent('25 Aug 2026');
    expect(a).toHaveTextContent('PC-1 · 10.0.0.1');
    expect(a).toHaveTextContent('Danish Q · ADMINISTRATOR');
    expect(screen.getByTestId('lu-card-zed')).toHaveTextContent('Last sign-in');
  });

  it('the header chip counts the live people', async () => {
    await mount();
    expect(screen.getByTestId('lu-live-chip')).toHaveTextContent('2 live now');
  });

  it('the signed-in administrator\'s own card is marked You', async () => {
    await mount();
    expect(within(screen.getByTestId('lu-card-AdminDanish')).getByText('You')).toBeInTheDocument();
    expect(within(screen.getByTestId('lu-card-amit')).queryByText('You')).toBeNull();
  });
});

describe('one-click logout', () => {
  it('asks once, then logs the user out, fades the card at once and refreshes', async () => {
    await mount();
    api.getLiveUsers.mockResolvedValue(LIVE([BASE[0], { ...BASE[1], live: false }, BASE[2]])); // what the server says after the logout
    fireEvent.click(screen.getByRole('button', { name: 'Log out amit' }));
    await waitFor(() => expect(api.forceLogoutUser).toHaveBeenCalledWith('amit'));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Log out "amit"/);
    await waitFor(() => expect(screen.getByTestId('lu-card-amit')).toHaveAttribute('data-live', 'false'));
    expect(api.getLiveUsers).toHaveBeenCalledTimes(2);
  });

  it('cancel does nothing', async () => {
    confirmSpy.mockReturnValue(false);
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Log out amit' }));
    await act(async () => {});
    expect(api.forceLogoutUser).not.toHaveBeenCalled();
    expect(screen.getByTestId('lu-card-amit')).toHaveAttribute('data-live', 'true');
  });

  it('logging out yourself gets the stronger warning text', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Log out AdminDanish' }));
    await waitFor(() => expect(api.forceLogoutUser).toHaveBeenCalledWith('AdminDanish'));
    expect(confirmSpy.mock.calls[0][0]).toMatch(/your own account/);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/application closes/);
  });

  it('the name is matched without regard to letter case for "You"', async () => {
    auth.user = { username: 'admindanish' };
    await mount();
    expect(within(screen.getByTestId('lu-card-AdminDanish')).getByText('You')).toBeInTheDocument();
  });

  it('a refused logout shows the reason and leaves the card live', async () => {
    api.forceLogoutUser.mockResolvedValue({ success: false, error: 'Not allowed' });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Log out amit' }));
    await waitFor(() => expect(dlg).toHaveBeenCalledWith('error', 'Logout failed', 'Not allowed', ''));
    expect(screen.getByTestId('lu-card-amit')).toHaveAttribute('data-live', 'true');
  });

  it('a connection failure shows a message and the buttons work again', async () => {
    api.forceLogoutUser.mockRejectedValueOnce(new Error('Network down'));
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Log out amit' }));
    await waitFor(() => expect(dlg).toHaveBeenCalledWith('error', 'Logout failed', 'Network down', ''));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Log out amit' })).not.toBeDisabled());
  });

  it('while one logout is running the other Log out buttons are disabled (no double click)', async () => {
    let finish!: (v: any) => void;
    api.forceLogoutUser.mockImplementation(() => new Promise((r) => { finish = r; }));
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Log out amit' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Log out AdminDanish' })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Log out amit' }));
    expect(api.forceLogoutUser).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ success: true }); });
  });
});

describe('search, filter, refresh', () => {
  it('search matches name, full name and role in any letter case', async () => {
    await mount();
    const box = screen.getByLabelText('Search users');
    fireEvent.change(box, { target: { value: 'DANISH' } });
    expect(screen.queryByTestId('lu-card-amit')).toBeNull();
    expect(screen.getByTestId('lu-card-AdminDanish')).toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'clerk' } });
    expect(screen.getByTestId('lu-card-amit')).toBeInTheDocument();
    expect(screen.queryByTestId('lu-card-AdminDanish')).toBeNull();
    fireEvent.change(box, { target: { value: 'nobody' } });
    expect(screen.getByText('No users match.')).toBeInTheDocument();
  });

  it('Live only hides the faded cards; Everyone brings them back', async () => {
    await mount();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Live only' }));
    expect(screen.queryByTestId('lu-card-zed')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Everyone' }));
    expect(screen.getByTestId('lu-card-zed')).toBeInTheDocument();
  });

  it('Live only with nobody live says so', async () => {
    api.getLiveUsers.mockResolvedValue(LIVE([U(3, 'zed')]));
    render(<LogoutUser />);
    await screen.findByTestId('lu-card-zed');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Live only' }));
    expect(screen.getByText('Nobody is live right now.')).toBeInTheDocument();
  });

  it('the Refresh button reloads', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(api.getLiveUsers).toHaveBeenCalledTimes(2));
  });

  it('the list refreshes by itself and stops when the window closes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const r = render(<LogoutUser />);
    await screen.findByTestId('lu-card-amit');
    expect(api.getLiveUsers).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS); });
    expect(api.getLiveUsers).toHaveBeenCalledTimes(2);
    r.unmount();
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS * 3); });
    expect(api.getLiveUsers).toHaveBeenCalledTimes(2);
  });

  it('a person who went offline between two refreshes turns faded and the chip count drops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<LogoutUser />);
    await screen.findByTestId('lu-card-amit');
    api.getLiveUsers.mockResolvedValue(LIVE([BASE[0], { ...BASE[1], live: false }, BASE[2]]));
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS); });
    await waitFor(() => expect(screen.getByTestId('lu-card-amit')).toHaveAttribute('data-live', 'false'));
    expect(screen.getByTestId('lu-live-chip')).toHaveTextContent('1 live now');
  });

  it('a server failure shows a note, keeps the old cards, and the next refresh recovers', async () => {
    await mount();
    api.getLiveUsers.mockRejectedValueOnce(new Error('down'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the users');
    expect(screen.getByTestId('lu-card-amit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('300 users render as 300 cards (stress)', async () => {
    api.getLiveUsers.mockResolvedValue(LIVE(Array.from({ length: 300 }, (_, i) => U(i + 1, 'user' + (i + 1), { live: i % 3 === 0 }))));
    render(<LogoutUser />);
    await screen.findByTestId('lu-card-user1');
    expect(document.querySelectorAll('[data-testid^="lu-card-"]')).toHaveLength(300);
    expect(document.querySelectorAll('[data-live="true"]')).toHaveLength(100);
  });
});

describe('the Analytics tab', () => {
  const open = async () => { await mount(); fireEvent.click(screen.getByRole('tab', { name: /Analytics/ })); await screen.findByTestId('lu-stat-sessions'); };

  it('is not asked for until the tab is opened', async () => {
    await mount();
    expect(api.getSessionAnalytics).not.toHaveBeenCalled();
  });

  it('shows the four numbers, the chart, the most active people, the busiest hours and the things to look at', async () => {
    await open();
    expect(api.getSessionAnalytics).toHaveBeenCalledWith(30);
    expect(screen.getByTestId('lu-stat-sessions')).toHaveTextContent('12');
    expect(screen.getByTestId('lu-stat-people')).toHaveTextContent('3');
    expect(screen.getByTestId('lu-stat-avg')).toHaveTextContent('1 h 5 min');
    expect(screen.getByTestId('lu-stat-live')).toHaveTextContent('2');
    expect(screen.getByRole('img', { name: 'Sign-ins per day' })).toBeInTheDocument();
    expect(within(screen.getByTestId('lu-top')).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['amit7', 'zed2']);
    expect(within(screen.getByTestId('lu-hours')).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['9 am6', '2 pm3']);
    expect(screen.getByTestId('lu-never-in')).toHaveTextContent('4');
    expect(screen.getByTestId('lu-never-closed')).toHaveTextContent('2');
  });

  it('changing the period asks again with that many days', async () => {
    await open();
    fireEvent.click(screen.getByRole('checkbox', { name: '7 days' }));
    await waitFor(() => expect(api.getSessionAnalytics).toHaveBeenLastCalledWith(7));
    fireEvent.click(screen.getByRole('checkbox', { name: '90 days' }));
    await waitFor(() => expect(api.getSessionAnalytics).toHaveBeenLastCalledWith(90));
  });

  it('no data: dashes and empty-state lines instead of a broken chart', async () => {
    api.getSessionAnalytics.mockResolvedValue({ success: true, data: { days: 30, totals: { sessions: 0, people: 0, avgMinutes: null, neverClosed: 0, neverSignedIn: 0, liveNow: 0 }, perDay: [], hours: [], topUsers: [] } });
    await open();
    expect(screen.getByTestId('lu-stat-avg')).toHaveTextContent('—');
    expect(screen.getAllByText('No sign-ins in this period.')).toHaveLength(2);
  });

  it('a server failure shows a note', async () => {
    api.getSessionAnalytics.mockRejectedValue(new Error('down'));
    await mount();
    fireEvent.click(screen.getByRole('tab', { name: /Analytics/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the analytics');
  });

  it('going back to Live users shows the cards again', async () => {
    await open();
    fireEvent.click(screen.getByRole('tab', { name: /Live users/ }));
    expect(screen.getByTestId('lu-card-amit')).toBeInTheDocument();
  });
});

describe('helpers', () => {
  it.each([
    [{ username: 'amit', fullName: null }, 'AM'], [{ username: 'a', fullName: null }, 'A'], [{ username: 'x', fullName: 'Asha Rao' }, 'AR'],
    [{ username: 'x', fullName: 'Solo' }, 'SO'], [{ username: '__', fullName: null }, '?'], [{ username: 'ab', fullName: '  ' }, 'AB'],
  ])('initials %j -> %s', (u, want) => expect(initials(u as any)).toBe(want));

  it.each([[null, ''], [undefined, ''], [-1, ''], [0, 'under a minute'], [8, '8 min'], [60, '1 h'], [95, '1 h 35 min'], [1500, '25 h']])(
    'durationText %j -> %j', (m, want) => expect(durationText(m as any)).toBe(want));

  it.each([[null, '—'], ['', '—'], ['  ', '—'], ['09:40:00', '09:40:00'], [' 10:14:36 PM ', '10:14:36 PM']])('timeText %j -> %j', (t, want) => expect(timeText(t as any)).toBe(want));

  it.each([['2026-08-25', '25 Aug 2026'], ['2026-11-14T00:00:00.000Z', '14 Nov 2026'], [null, '—'], ['x', '—']])('dateText %j -> %j', (d, want) => expect(dateText(d as any)).toBe(want));

  it('filterUsers: live only and text combine', () => {
    const list = [U(1, 'amit', { live: true }), U(2, 'amita', { live: false }), U(3, 'bob', { live: true, role: 'MANAGER' })] as any[];
    expect(filterUsers(list, 'AMIT', false).map((u) => u.userId)).toEqual([1, 2]);
    expect(filterUsers(list, 'amit', true).map((u) => u.userId)).toEqual([1]);
    expect(filterUsers(list, 'manager', false).map((u) => u.userId)).toEqual([3]);
    expect(filterUsers(list, '  ', false)).toHaveLength(3);
  });

  it.each([[5, 10, 50], [10, 10, 100], [0, 10, 0], [5, 0, 0], [20, 10, 100], [1, 3, 33]])('barPercent(%j, %j) = %j', (v, m, want) => expect(barPercent(v, m)).toBe(want));

  it('busiestHours: most first, ties by earlier hour, zeros dropped, at most 5', () => {
    const hours = [{ hour: 3, sessions: 0 }, { hour: 9, sessions: 4 }, { hour: 8, sessions: 4 }, { hour: 14, sessions: 9 }, ...[1, 2, 4, 5].map((h) => ({ hour: 10 + h, sessions: h }))];
    expect(busiestHours(hours)).toHaveLength(5);
    expect(busiestHours(hours)[0].hour).toBe(14);
    expect(busiestHours(hours).slice(0, 2).map((h) => h.hour)).toEqual([14, 15]);
    expect(busiestHours(hours).slice(2, 4).map((h) => h.hour)).toEqual([8, 9]);
    expect(busiestHours(hours).some((h) => h.sessions === 0)).toBe(false);
  });

  it.each([[0, '12 am'], [9, '9 am'], [11, '11 am'], [12, '12 pm'], [15, '3 pm'], [23, '11 pm']])('hourText %j -> %s', (h, want) => expect(hourText(h)).toBe(want));
});
