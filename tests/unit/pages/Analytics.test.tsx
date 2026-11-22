// Live Ops Center (FullScreenAnalytics) and Analytics Hub (AnalyticsDashboard). it.fails = KNOWN BUG (Jira).
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, track } = vi.hoisted(() => ({ api: { get: vi.fn() }, track: vi.fn() }));

vi.mock('../../../src/services/api', () => ({ default: api, apiService: api }));
vi.mock('../../../src/hooks/useAnalytics', () => ({ useComponentAnalytics: () => ({ trackFeatureUsage: track }) }));
// charts need a real layout engine; here every chart part is a plain pass-through box
vi.mock('recharts', () => {
  const box = (name: string) => ({ children }: any) => <div data-chart={name}>{children}</div>;
  return { Tooltip: box('Tooltip'), Legend: box('Legend'), ResponsiveContainer: box('ResponsiveContainer'), PieChart: box('PieChart'), Pie: box('Pie'), Cell: box('Cell') };
});

import FullScreenAnalytics from '../../../src/service/Administration/FullScreenAnalytics/page/FullScreenAnalytics';
import AnalyticsDashboard from '../../../src/service/Administration/AnalyticsDashboard/page/AnalyticsDashboard';

// the backend wraps twice: { success, data: { success, data: <payload> } }
const wrapped = (payload: any) => ({ success: true, data: { success: true, data: payload } });
const USERS = [
  { user_id: 1, username: 'danish', user_role: 'administrator', last_activity: '2026-11-22T10:00:00.000Z', session_count: '7', feature_usage_count: 41, error_count: 2 },
  { user_id: 2, member_number: 'MEM002', last_activity: null, session_count: 0 },
];

describe('Live Ops Center (FullScreenAnalytics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation(async (url: string) => {
      if (url === '/analytics/status') return wrapped({ active_sessions: 20, total_errors: 12, unresolved_errors: 5 });
      if (url === '/analytics/users') return wrapped(USERS);
      return { success: false };
    });
  });

  it('shows the real counts from the server (two-level wrapped reply)', async () => {
    render(<FullScreenAnalytics />);
    expect(await screen.findByText('20')).toBeInTheDocument();      // active sessions
    expect(screen.getByText('12')).toBeInTheDocument();             // total errors
    expect(screen.getByText('5')).toBeInTheDocument();              // unresolved
    expect(screen.getByText('2')).toBeInTheDocument();              // active users = rows returned
    expect(screen.getByText(/Connected ·/)).toBeInTheDocument();
  });

  it('asks the server for the chosen time range', async () => {
    render(<FullScreenAnalytics />);
    await screen.findByText('20');
    const call = api.get.mock.calls.find(c => c[0] === '/analytics/users')!;
    const since = new Date(call[1].params.start_date).getTime();
    expect(Date.now() - since).toBeGreaterThan(23 * 3600e3);        // default 24 h
    expect(Date.now() - since).toBeLessThan(25 * 3600e3);
    expect(call[1].params.limit).toBe(50);
  });

  it('charts that the server does not provide say "No data", not invented numbers', async () => {
    render(<FullScreenAnalytics />);
    await screen.findByText('20');
    expect(screen.getAllByText('No data available').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/does not provide a traffic time series/)).toBeInTheDocument();
  });

  it('the Users view lists each user, with — where a value is missing', async () => {
    render(<FullScreenAnalytics />);
    await screen.findByText('20');
    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    expect(await screen.findByText('danish')).toBeInTheDocument();
    expect(screen.getByText('administrator')).toBeInTheDocument();
    expect(screen.getByText('MEM002')).toBeInTheDocument();
    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('when the service is not reachable it says so and shows — instead of zeros', async () => {
    api.get.mockResolvedValue({ success: false, message: 'Network down' });
    render(<FullScreenAnalytics />);
    expect(await screen.findByText(/Not connected - Network down/)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('a thrown error is shown as not connected', async () => {
    api.get.mockRejectedValue(new Error('boom'));
    render(<FullScreenAnalytics />);
    expect(await screen.findByText(/Not connected - boom/)).toBeInTheDocument();
  });

  it('Refresh loads the data again', async () => {
    render(<FullScreenAnalytics />);
    await screen.findByText('20');
    const before = api.get.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(before));
  });
});

describe('Analytics Hub (AnalyticsDashboard)', () => {
  beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue({ success: false }); });

  it('opens with its sections and range buttons and records that it was viewed', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByRole('heading', { name: /Analytics Hub/ })).toBeInTheDocument();
    for (const s of ['Overview', 'Traffic', 'Features', 'Errors', 'Reports']) expect(screen.getAllByRole('tab', { name: new RegExp(s) }).length).toBeGreaterThan(0);
    for (const r of ['7D', '30D', '90D']) expect(screen.getByRole('tab', { name: r })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ featureName: 'Dashboard Load' }));
  });

  it('changing the range changes the heading text', () => {
    render(<AnalyticsDashboard />);
    fireEvent.click(screen.getByRole('tab', { name: '30D' }));
    expect(screen.getByText(/Last 30 days/)).toBeInTheDocument();
  });

  // ---- KNOWN BUGS ----
  it.fails('BUG: the window must get its numbers from the server (it asks for nothing)', () => {
    render(<AnalyticsDashboard />);
    expect(api.get).toHaveBeenCalled();
  });

  it.fails('BUG: no fixed sample figures (1,247 sessions, 12%, 5,632 page views, 23 errors) may be shown as real', () => {
    render(<AnalyticsDashboard />);
    expect(screen.queryByText('1,247')).not.toBeInTheDocument();
    expect(screen.queryByText('5,632')).not.toBeInTheDocument();
  });

  it.fails('BUG: Export must do something (download or call the server)', () => {
    render(<AnalyticsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    expect(api.get).toHaveBeenCalled();
  });

  it.fails('BUG: switching the section (Traffic / Features / Errors / Reports) must change the content, not only the title', () => {
    const { container } = render(<AnalyticsDashboard />);
    const before = container.querySelector('.aw-content')!.innerHTML;
    fireEvent.click(screen.getByRole('tab', { name: /Traffic/ }));
    expect(container.querySelector('.aw-content')!.innerHTML).not.toBe(before);
  });
});
