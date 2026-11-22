// My Profile window: own name, role, sign-ins and the password dialog. Nothing here may be invented data.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, auth, pwd } = vi.hoisted(() => ({
  api: { get: vi.fn() },
  auth: { user: { username: 'danish', role: 'administrator', email: 'session@x.test' } as any },
  pwd: {
    formData: { currentPassword: '', newPassword: '', confirmPassword: '' },
    errors: {} as any,
    isLoading: false,
    updateField: vi.fn(),
    submitPasswordChange: vi.fn(),
    resetForm: vi.fn(),
  },
}));

vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/auth/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../../../src/services/apiVersionConfig', () => ({ getApiBaseUrlSync: () => 'http://192.168.1.20:3001/api/v1' }));
vi.mock('../../../src/utils/eggHunt', () => ({ GOLD_GLOW_STYLE: {}, useEggHunt: () => ({ completed: false }) }));
vi.mock('../../../src/service/Administration/Security/ChangePassword/hook/useChangePassword', () => ({ useChangePassword: () => pwd }));

import MyProfile from '../../../src/service/Administration/Security/MyProfile/page/MyProfile';

const LOGINS = [
  { loginDate: '2026-11-22T10:00:00.000Z', loginTime: '15:30:12', logoutTime: null, active: true },
  { loginDate: '2026-11-21T04:00:00.000Z', loginTime: '09:30:00', logoutTime: '17:45:00', active: false },
];

const mockApi = (me: any, logins: any) => api.get.mockImplementation(async (url: string) => {
  if (url === '/auth/me') { if (me instanceof Error) throw me; return { success: true, data: me }; }
  if (url.startsWith('/auth/me/recent-logins')) { if (logins instanceof Error) throw logins; return { success: true, data: logins }; }
  return { success: true, data: null };
});

describe('My Profile window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pwd.errors = {}; pwd.isLoading = false;
    pwd.submitPasswordChange.mockResolvedValue({ success: true });
    auth.user = { username: 'danish', role: 'administrator', email: 'session@x.test' };
    mockApi({ fullName: 'Danish Qureshi', email: 'danish@society.test', role: 'administrator' }, LOGINS);
  });

  it('shows the name, e-mail, username and role from the server', async () => {
    render(<MyProfile />);
    expect((await screen.findAllByText('Danish Qureshi')).length).toBeGreaterThan(0);
    expect(screen.getByText('danish@society.test')).toBeInTheDocument();
    expect(screen.getAllByText('danish').length).toBeGreaterThan(0);
    expect(screen.getAllByText('administrator').length).toBeGreaterThan(0);
  });

  it('what the system does not hold (phone, department) says "Not recorded", not made-up text', async () => {
    render(<MyProfile />);
    await screen.findAllByText('Danish Qureshi');
    expect(screen.getAllByText('Not recorded').length).toBe(2);
  });

  it('shows the last sign-in, the server name and the recent sign-ins with open/closed state', async () => {
    render(<MyProfile />);
    await waitFor(() => expect(screen.getByText('Session still open')).toBeInTheDocument());
    expect(screen.getByText('192.168.1.20:3001')).toBeInTheDocument();
    expect(screen.getByText('Signed out at 17:45')).toBeInTheDocument();
    expect(screen.getAllByText('Signed in').length).toBe(2);
    expect(screen.getAllByText(/22 Nov 2026, 15:30/).length).toBe(2); // the rail and the list
  });

  it('with no sign-ins recorded it says so', async () => {
    mockApi({ fullName: 'Danish Qureshi' }, []);
    render(<MyProfile />);
    expect(await screen.findByText('No sign-ins recorded yet')).toBeInTheDocument();
  });

  it('falls back to the session username and e-mail when the profile call fails', async () => {
    mockApi(new Error('offline'), new Error('offline'));
    render(<MyProfile />);
    expect((await screen.findAllByText('danish')).length).toBeGreaterThan(0);
    expect(screen.getByText('session@x.test')).toBeInTheDocument();
    expect(await screen.findByText('No sign-ins recorded yet')).toBeInTheDocument();
  });

  it('asks for at most 5 sign-ins', async () => {
    render(<MyProfile />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/me/recent-logins?limit=5'));
  });

  it('the Security tab offers the password dialog and the Two-Factor window', async () => {
    render(<MyProfile />);
    await screen.findAllByText('Danish Qureshi');
    fireEvent.click(screen.getByRole('button', { name: /Security & authentication/ }));
    expect(screen.getByText('Password management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Two-Factor & Approvals/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Change password/ }));
    expect(await screen.findByPlaceholderText('Current password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
  });

  it('a successful password change closes the dialog and says other sessions were signed out', async () => {
    render(<MyProfile />);
    await screen.findAllByText('Danish Qureshi');
    fireEvent.click(screen.getByRole('button', { name: /Security & authentication/ }));
    fireEvent.click(screen.getByRole('button', { name: /Change password/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Update password/ }));
    await waitFor(() => expect(pwd.submitPasswordChange).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Password updated\. Your other sessions were signed out\./)).toBeInTheDocument();
  });

  it('a failed password change keeps the dialog open and shows the server error', async () => {
    pwd.submitPasswordChange.mockResolvedValue({ success: false });
    pwd.errors = { general: 'Current password is wrong' };
    render(<MyProfile />);
    await screen.findAllByText('Danish Qureshi');
    fireEvent.click(screen.getByRole('button', { name: /Security & authentication/ }));
    fireEvent.click(screen.getByRole('button', { name: /Change password/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Update password/ }));
    await waitFor(() => expect(pwd.submitPasswordChange).toHaveBeenCalled());
    expect(screen.getByText('Current password is wrong')).toBeInTheDocument();
    expect(screen.queryByText(/Password updated/)).not.toBeInTheDocument();
  });
});
