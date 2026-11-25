// Change Password: the legacy steps (Test1212 / Test1212 -> Test@1212), the rules, the server's answers, and stress runs.
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { api, auth, progress } = vi.hoisted(() => ({
  api: { post: vi.fn() },
  auth: { user: { username: 'Test1212' } as any },
  progress: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/auth/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../../../src/features/onboarding/onboardingApi', () => ({ markProgress: progress }));
vi.mock('../../../src/i18n', () => ({
  default: { t: (s: string, o?: any) => (o ? s.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(o[k])) : s) },
}));

import { useChangePassword } from '../../../src/service/Administration/Security/ChangePassword/hook/useChangePassword';
import { passwordProblems, PASSWORD_MAX, PASSWORD_MIN } from '../../../src/utils/passwordPolicy';

describe('password rule', () => {
  it('is 8 to 64 characters', () => expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([8, 64]));
  it.each([
    ['Test@1212', []], ['Test1212', []], ['Abcdef1x', []], ['Aa1' + 'x'.repeat(61), []],
    ['abc', ['short', 'upper', 'digit']], ['abcdefgh', ['upper', 'digit']], ['ABCDEFG1', ['lower']], ['Abcdefgh', ['digit']],
    ['Aa1' + 'x'.repeat(62), ['long']], ['$2b$Abcdef1', ['hashlike']], ['$2a$Abcdef1', ['hashlike']], ['$2y$Abcdef1', ['hashlike']],
    ['Ab1$2b$xyzzy', []],
  ])('%j -> %j', (pw, want) => expect(passwordProblems(pw)).toEqual(want));
});

const mount = () => renderHook(() => useChangePassword());
const fill = (h: any, o: Record<string, string> = {}) => act(() => {
  for (const [k, v] of Object.entries({ currentPassword: 'Test1212', newPassword: 'Test@1212', confirmPassword: 'Test@1212', ...o })) h.result.current.updateField(k, v);
});
const submit = async (h: any) => { let r: any; await act(async () => { r = await h.result.current.submitPasswordChange(); }); return r; };

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { username: 'Test1212' };
  localStorage.clear();
  api.post.mockResolvedValue({ success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
});

describe('the legacy steps', () => {
  it('the person is always the signed-in one (the name cannot be changed on this window)', () => {
    const h = mount();
    expect(h.result.current.formData.userName).toBe('Test1212');
  });

  it('Test1212 -> Test@1212: valid, sends the signed-in name, keeps working with the fresh session, clears the form', async () => {
    const h = mount(); fill(h);
    const r = await submit(h);
    expect(r).toEqual({ success: true });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/change-password', { username: 'Test1212', currentPassword: 'Test1212', newPassword: 'Test@1212' });
    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    expect(progress).toHaveBeenCalledWith('password');
    expect(h.result.current.formData).toMatchObject({ userName: 'Test1212', currentPassword: '', newPassword: '', confirmPassword: '' });
  });
});

describe('rules on the screen (nothing is sent when one fails)', () => {
  it.each([
    ['no current password', { currentPassword: '' }, /Current password is required/],
    ['no new password', { newPassword: '', confirmPassword: '' }, /New password is required/],
    ['no confirmation', { confirmPassword: '' }, /Confirm password is required/],
    ['confirmation differs', { confirmPassword: 'Test@1213' }, /do not match/],
    ['new = current', { currentPassword: 'Test@1212' }, /different from current/],
    ['too short', { newPassword: 'Ab1', confirmPassword: 'Ab1' }, /at least 8/],
    ['no capital', { newPassword: 'test@1212', confirmPassword: 'test@1212' }, /uppercase/],
    ['no small letter', { newPassword: 'TEST@1212', confirmPassword: 'TEST@1212' }, /lowercase/],
    ['no number', { newPassword: 'Test@abcd', confirmPassword: 'Test@abcd' }, /number/],
    ['65 characters', { newPassword: 'Aa1' + 'x'.repeat(62), confirmPassword: 'Aa1' + 'x'.repeat(62) }, /at most 64/],
    ['starts like a hash', { newPassword: '$2b$Abcdef1', confirmPassword: '$2b$Abcdef1' }, /must not start with/],
  ])('%s', async (_n, patch, text) => {
    const h = mount(); fill(h, patch as any);
    const r = await submit(h);
    expect(r.success).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
    expect(h.result.current.validateForm().errors.join(' ')).toMatch(text as RegExp);
  });
});

describe('the server answers', () => {
  it.each([
    ['wrong current password', { success: false, message: 'Current password is incorrect' }],
    ['locked after 5 wrong tries', { success: false, message: 'Too many failed password change attempts. Try again in 15 minute(s).' }],
    ['used before', { success: false, message: 'Choose a password you have not used before (not your last 5).' }],
    ['rule named by the server', { success: false, message: 'Password must be 8 to 64 characters with an uppercase letter, a lowercase letter and a number, and must not start with $2a$, $2b$ or $2y$.' }],
  ])('%s: shown as it is, the typed values stay, no session is touched', async (_n, reply) => {
    api.post.mockResolvedValue(reply);
    const h = mount(); fill(h);
    const r = await submit(h);
    expect(r).toEqual({ success: false, error: reply.message });
    expect(h.result.current.errors.general).toBe(reply.message);
    expect(h.result.current.formData.newPassword).toBe('Test@1212');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(progress).not.toHaveBeenCalled();
  });

  it('a connection failure is shown and the form is usable again', async () => {
    api.post.mockRejectedValue(new Error('Network down'));
    const h = mount(); fill(h);
    const r = await submit(h);
    expect(r.error).toBe('Network down');
    expect(h.result.current.isLoading).toBe(false);
    api.post.mockResolvedValue({ success: true, data: {} });
    expect((await submit(h)).success).toBe(true);
  });

  it('a success without a session in the answer still ends cleanly', async () => {
    api.post.mockResolvedValue({ success: true });
    const h = mount(); fill(h);
    expect((await submit(h)).success).toBe(true);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('stress', () => {
  it('Save pressed 8 times at once sends ONE request (the others would meet the changed password and show a false error)', async () => {
    let finish!: (v: any) => void;
    api.post.mockImplementation(() => new Promise(r => { finish = r; }));
    const h = mount(); fill(h);
    let all!: Promise<any[]>;
    act(() => { all = Promise.all(Array.from({ length: 8 }, () => h.result.current.submitPasswordChange())); });
    await act(async () => { finish({ success: true, data: { accessToken: 'a' } }); await all; });
    const results = await all;
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(results.filter(r => r.success)).toHaveLength(1);
  });

  it('after a failed change the next try is allowed', async () => {
    api.post.mockResolvedValueOnce({ success: false, message: 'Current password is incorrect' });
    const h = mount(); fill(h);
    expect((await submit(h)).success).toBe(false);
    expect((await submit(h)).success).toBe(true);
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('typing 500 times in the box keeps the form consistent and clears an error when typing starts', async () => {
    const h = mount(); fill(h);
    api.post.mockResolvedValueOnce({ success: false, message: 'x' });
    await submit(h);
    act(() => { h.result.current.updateField('newPassword', 'Test@1212'); });
    for (let i = 0; i < 500; i++) act(() => { h.result.current.updateField('newPassword', 'Aa1' + 'y'.repeat(i % 50)); });
    expect(h.result.current.formData.newPassword.startsWith('Aa1')).toBe(true);
    await waitFor(() => expect(h.result.current.isLoading).toBe(false));
  });

  it('the name follows the signed-in person if the session changes', async () => {
    const h = mount();
    auth.user = { username: 'Other1' };
    h.rerender();
    await waitFor(() => expect(h.result.current.formData.userName).toBe('Other1'));
  });
});
