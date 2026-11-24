// Create / Modify Users: window rights lists (ES-645), who may give which level (ES-647), user name rules (ES-649),
// the save / update flow, the "user already exists" question, and double-submit / race stress runs.
import { render, screen, fireEvent, waitFor, within, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

const { api, dialog } = vi.hoisted(() => ({
  api: {
    getRolePermissions: vi.fn(), getUsers: vi.fn(), getUserByUsername: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(),
    getRoleMenus: vi.fn(), getRoleLevels: vi.fn(), getRoleDefaultRights: vi.fn(), getUserMenuRights: vi.fn(),
  },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: any) => (o ? s.replace(/\{\{(\d)\}\}/g, (_m, i) => String(o[i])) : s) }) }));

import { useUserManagement } from '../../../src/service/Administration/Security/CreateModifyUsers/hook/useUserManagement';
import { useWindowRights } from '../../../src/service/Administration/Security/CreateModifyUsers/hook/useWindowRights';
import WindowRightsPanel from '../../../src/service/Administration/Security/CreateModifyUsers/components/WindowRightsPanel';
import {
  menuLabel, toItems, isUnrestrictedRole, levelIdForRole, moveIds, sameSet, levelsFor, isDuplicateUserError,
} from '../../../src/service/Administration/Security/CreateModifyUsers/utils/windowRights';

const MENUS = [
  { menuid: 1, menuname: 'mnuPassTrans', menudesc: 'Pass Transactions' },
  { menuid: 2, menuname: 'mnuLoanApp', menudesc: 'Loan Application' },
  { menuid: 3, menuname: 'mnuMemberMaster', menudesc: '' },
  { menuid: 13, menuname: 'USER_MANAGEMENT', menudesc: 'Create / Modify Users' },
];
const LEVELS = [
  { userlevelid: 0, userlevel: 'SYSTEM' }, { userlevelid: 1, userlevel: 'ADMINISTRATOR' }, { userlevelid: 2, userlevel: 'BRANCH MANAGER' },
  { userlevelid: 5, userlevel: 'CLERK' }, { userlevelid: 6, userlevel: 'AUDITOR' },
];

describe('pure rules', () => {
  it('window names: description when it has letters, else the menu name made readable', () => {
    expect(menuLabel(MENUS[0]!)).toBe('Pass Transactions');
    expect(menuLabel(MENUS[2]!)).toBe('Member Master');
    expect(menuLabel({ menuid: 9, menuname: 'RD_FY_CLOSING', menudesc: '12' })).toBe('RD FY CLOSING');
    expect(menuLabel({ menuid: 9, menuname: '', menudesc: '' })).toBe('Window 9');
    expect(toItems(MENUS).map(m => m.label)).toEqual(['Create / Modify Users', 'Loan Application', 'Member Master', 'Pass Transactions']);
  });
  it('unrestricted levels', () => {
    expect(['system', 'administrator', 'ADMINISTRATOR'].every(isUnrestrictedRole)).toBe(true);
    expect(['clerk', '', undefined as any].some(isUnrestrictedRole)).toBe(false);
  });
  it('role value against the legacy level name', () => {
    expect(levelIdForRole(LEVELS, 'branch_manager')).toBe(2);
    expect(levelIdForRole(LEVELS, 'clerk')).toBe(5);
    expect(levelIdForRole(LEVELS, 'nobody')).toBeNull();
    expect(levelIdForRole(LEVELS, '')).toBeNull();
  });
  it('moving windows never duplicates and never loses', () => {
    expect(moveIds([1, 2], [2, 3], true)).toEqual([1, 2, 3]);
    expect(moveIds([1, 2, 3], [2, 9], false)).toEqual([1, 3]);
    expect(moveIds([1], [], true)).toEqual([1]);
    expect(sameSet([1, 2], [2, 1])).toBe(true);
    expect(sameSet([1, 2], [1, 3])).toBe(false);
  });
  it('only a SYSTEM user is offered SYSTEM, only administrators ADMINISTRATOR', () => {
    const all = ['system', 'administrator', 'clerk'].map(value => ({ value }));
    expect(levelsFor(all, 'system').map(l => l.value)).toEqual(['system', 'administrator', 'clerk']);
    expect(levelsFor(all, 'administrator').map(l => l.value)).toEqual(['administrator', 'clerk']);
    expect(levelsFor(all, 'clerk').map(l => l.value)).toEqual(['clerk']);
    expect(levelsFor(all, '').map(l => l.value)).toEqual(['clerk']);
  });
  it('only a taken user name triggers the modify question, not a taken e-mail', () => {
    expect(isDuplicateUserError('Username already exists')).toBe(true);
    expect(isDuplicateUserError('Email already exists')).toBe(false);
    expect(isDuplicateUserError('')).toBe(false);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  dialog.mockResolvedValue(undefined);
  api.getRoleMenus.mockResolvedValue({ success: true, data: MENUS });
  api.getRoleLevels.mockResolvedValue({ success: true, data: LEVELS });
  api.getRoleDefaultRights.mockImplementation(async (id: number) => ({ success: true, data: id === 5 ? [1, 2] : [3] }));
  api.getUserMenuRights.mockResolvedValue({ success: true, data: { userlevelid: 5, granted: [2, 13] } });
  api.getRolePermissions.mockResolvedValue({ success: true, data: [{ role: 'clerk', permissions: ['read_member', 'read_loan'] }, { role: 'auditor', permissions: ['read_loan'] }] });
  api.getUsers.mockResolvedValue({ success: true, data: { users: [], total: 0 } });
  api.createUser.mockResolvedValue({ success: true, data: {} });
  api.updateUser.mockResolvedValue({ success: true, data: {} });
  api.getUserByUsername.mockResolvedValue({ success: true, data: { users: [] } });
});
afterEach(() => { vi.restoreAllMocks(); });

describe('useWindowRights', () => {
  const mount = async (args: { role: string; userId: number | null }) => {
    const h = renderHook((p: { role: string; userId: number | null }) => useWindowRights(p), { initialProps: args });
    await waitFor(() => expect(h.result.current.menus.length).toBe(4));
    return h;
  };

  it('a new user starts from the level defaults', async () => {
    const h = await mount({ role: 'clerk', userId: null });
    await waitFor(() => expect(h.result.current.loaded).toBe(true));
    expect(h.result.current.granted.sort()).toEqual([1, 2]);
    expect(api.getRoleDefaultRights).toHaveBeenCalledWith(5);
    expect(api.getUserMenuRights).not.toHaveBeenCalled();
    expect(h.result.current.menuIdsToSave()!.sort()).toEqual([1, 2]);
  });

  it('an existing user shows their own rights while the level is unchanged', async () => {
    const h = await mount({ role: 'clerk', userId: 7 });
    await waitFor(() => expect(h.result.current.loaded).toBe(true));
    expect(h.result.current.granted).toEqual([2, 13]);
    expect(api.getRoleDefaultRights).not.toHaveBeenCalled();
  });

  it('changing the level of an existing user shows the NEW level defaults', async () => {
    const h = await mount({ role: 'clerk', userId: 7 });
    await waitFor(() => expect(h.result.current.granted).toEqual([2, 13]));
    h.rerender({ role: 'auditor', userId: 7 });
    await waitFor(() => expect(h.result.current.granted).toEqual([3]));
    expect(api.getRoleDefaultRights).toHaveBeenCalledWith(6);
  });

  it('moving windows marks it changed and the save list follows; moving nothing changes nothing', async () => {
    const h = await mount({ role: 'clerk', userId: null });
    await waitFor(() => expect(h.result.current.loaded).toBe(true));
    act(() => h.result.current.move([], true));
    expect(h.result.current.dirty).toBe(false);
    act(() => h.result.current.move([13], true));
    act(() => h.result.current.move([1], false));
    expect(h.result.current.dirty).toBe(true);
    expect(h.result.current.menuIdsToSave()!.sort((a, b) => a - b)).toEqual([2, 13]);
  });

  it('administrators and SYSTEM have nothing to pick and send no list', async () => {
    const h = await mount({ role: 'administrator', userId: null });
    await waitFor(() => expect(h.result.current.loaded).toBe(true));
    expect(h.result.current.unrestricted).toBe(true);
    expect(h.result.current.menuIdsToSave()).toBeNull();
    expect(api.getRoleDefaultRights).not.toHaveBeenCalled();
  });

  it('no level yet: nothing is sent', async () => {
    const h = await mount({ role: '', userId: null });
    expect(h.result.current.menuIdsToSave()).toBeNull();
  });

  it('a failed load shows the reason, sends nothing, and Try again loads', async () => {
    api.getRoleDefaultRights.mockRejectedValueOnce(new Error('Server down'));
    const h = await mount({ role: 'clerk', userId: null });
    await waitFor(() => expect(h.result.current.error).toBe('Server down'));
    expect(h.result.current.menuIdsToSave()).toBeNull();
    await act(async () => { await h.result.current.reload(); });
    expect(h.result.current.error).toBeNull();
    expect(h.result.current.granted.sort()).toEqual([1, 2]);
  });

  it('an older level answering late never overwrites the level now chosen', async () => {
    let slow!: (v: any) => void;
    api.getRoleDefaultRights.mockImplementation((id: number) => (id === 5 ? new Promise(r => { slow = r; }) : Promise.resolve({ success: true, data: [3] })));
    const h = await mount({ role: 'clerk', userId: null });
    h.rerender({ role: 'auditor', userId: null });
    await waitFor(() => expect(h.result.current.granted).toEqual([3]));
    await act(async () => { slow({ success: true, data: [1, 2] }); });
    expect(h.result.current.granted).toEqual([3]);
  });

  it('reset clears the lists', async () => {
    const h = await mount({ role: 'clerk', userId: null });
    await waitFor(() => expect(h.result.current.loaded).toBe(true));
    act(() => h.result.current.reset());
    expect(h.result.current.granted).toEqual([]);
    expect(h.result.current.menuIdsToSave()).toBeNull();
  });
});

describe('WindowRightsPanel', () => {
  const items = toItems(MENUS);
  const show = (over: Partial<React.ComponentProps<typeof WindowRightsPanel>> = {}) => {
    const onMove = vi.fn();
    render(<WindowRightsPanel menus={items} granted={[1]} loading={false} error={null} unrestricted={false} noLevel={false} onMove={onMove} onRetry={vi.fn()} {...over} />);
    return onMove;
  };
  const allowed = () => within(screen.getByRole('listbox', { name: 'Windows allowed' }));
  const notAllowed = () => within(screen.getByRole('listbox', { name: 'Windows not allowed' }));

  it('splits the windows into allowed and not allowed, with counts', () => {
    show();
    expect(allowed().getByText('Pass Transactions')).toBeInTheDocument();
    expect(notAllowed().getByText('Loan Application')).toBeInTheDocument();
    expect(notAllowed().queryByText('Pass Transactions')).not.toBeInTheDocument();
    expect(screen.getByText('1 windows')).toBeInTheDocument();
    expect(screen.getByText('3 windows')).toBeInTheDocument();
  });

  it('select one and press Allow selected; Ctrl+click picks several', () => {
    const onMove = show();
    fireEvent.click(notAllowed().getByText('Loan Application'));
    fireEvent.click(notAllowed().getByText('Member Master'), { ctrlKey: true });
    fireEvent.click(screen.getByLabelText('Allow selected'));
    expect(onMove).toHaveBeenCalledWith([2, 3].sort(), true);
  });

  it('double click moves one window; Remove all shown takes every shown window back', () => {
    const onMove = show({ granted: [1, 2] });
    fireEvent.doubleClick(notAllowed().getByText('Member Master'));
    expect(onMove).toHaveBeenLastCalledWith([3], true);
    fireEvent.click(screen.getByLabelText('Remove all shown'));
    expect(onMove).toHaveBeenLastCalledWith(expect.arrayContaining([1, 2]), false);
  });

  it('search narrows both lists, and Allow all shown only moves what is shown', () => {
    const onMove = show();
    fireEvent.change(screen.getByLabelText('Search windows'), { target: { value: 'member' } });
    expect(notAllowed().getByText('Member Master')).toBeInTheDocument();
    expect(notAllowed().queryByText('Loan Application')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Allow all shown'));
    expect(onMove).toHaveBeenCalledWith([3], true);
  });

  it('the buttons are off until something is selected', () => {
    show();
    expect(screen.getByLabelText('Allow selected')).toBeDisabled();
    expect(screen.getByLabelText('Remove selected')).toBeDisabled();
  });

  it('says what is going on instead of showing empty lists: no level, unrestricted level, failed load', () => {
    const { unmount } = render(<WindowRightsPanel menus={items} granted={[]} loading={false} error={null} unrestricted={false} noLevel onMove={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText('Choose a user level first')).toBeInTheDocument();
    unmount();
    const b = render(<WindowRightsPanel menus={items} granted={[]} loading={false} error={null} unrestricted noLevel={false} onMove={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText('Every window')).toBeInTheDocument();
    b.unmount();
    const onRetry = vi.fn();
    render(<WindowRightsPanel menus={items} granted={[]} loading={false} error="Server down" unrestricted={false} noLevel={false} onMove={vi.fn()} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('stress: 800 windows draw and a search over them stays quick', () => {
    const many = Array.from({ length: 800 }, (_, i) => ({ id: i + 100, label: `Window number ${i}` }));
    const t0 = performance.now();
    show({ menus: many, granted: many.slice(0, 300).map(m => m.id) });
    fireEvent.change(screen.getByLabelText('Search windows'), { target: { value: 'number 79' } });
    expect(performance.now() - t0).toBeLessThan(8000);
    expect(notAllowed().getAllByRole('option').length).toBeGreaterThan(5);
  });
});

describe('useUserManagement', () => {
  const ref = <T,>(v: T) => ({ current: v }) as React.MutableRefObject<T>;
  const mount = async (menuIds: number[] | null = [1, 2]) => {
    const getMenuIds = ref<() => number[] | null>(() => menuIds);
    const onSaved = ref<() => void>(vi.fn());
    const h = renderHook(() => useUserManagement({ getMenuIds, onSaved }));
    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalled());
    await waitFor(() => expect(h.result.current.formData.availablePermissions.length).toBe(2));
    return { ...h, getMenuIds, onSaved };
  };
  const fill = (h: any, o: Record<string, any> = {}) => act(() => {
    for (const [k, v] of Object.entries({ username: 'Test123', password: 'Abcdef1', confirmPassword: 'Abcdef1', userLevel: 'clerk', ...o })) h.result.current.updateFormData(k, v);
  });

  it('choosing a level fills the role permissions for a new user', async () => {
    const h = await mount(); fill(h);
    expect(h.result.current.formData.assignedPermissions.sort()).toEqual(['read_loan', 'read_member']);
  });

  it('create: trimmed name, generated e-mail, the window rights, then the form clears and the rights are told to reset', async () => {
    const h = await mount(); fill(h, { username: '  Test123  ' });
    await act(async () => { await h.result.current.saveUser(); });
    expect(api.createUser).toHaveBeenCalledTimes(1);
    expect(api.createUser.mock.calls[0]![0]).toMatchObject({ username: 'Test123', email: 'test123@bank.local', role: 'clerk', menuIds: [1, 2], password: 'Abcdef1', isActive: true });
    expect(h.onSaved.current).toHaveBeenCalled();
    expect(h.result.current.formData.username).toBe('');
  });

  it('no window list for administrators: none is sent', async () => {
    const h = await mount(null); fill(h, { userLevel: 'administrator' });
    await act(async () => { await h.result.current.saveUser(); });
    expect(api.createUser.mock.calls[0]![0]).not.toHaveProperty('menuIds');
  });

  it.each([
    ['empty name', { username: '  ' }, /mandatory/],
    ['no level', { userLevel: '' }, /mandatory/],
    ['name over 20 characters', { username: 'a'.repeat(21) }, /up to 20/],
    ['name with a space', { username: 'two words' }, /up to 20/],
    ['name with a symbol', { username: 'bob@home' }, /up to 20/],
    ['no password', { password: '', confirmPassword: '' }, /Password is required/],
    ['short password', { password: 'abc', confirmPassword: 'abc' }, /at least 6/],
    ['passwords that differ', { confirmPassword: 'Other123' }, /do not match/],
    ['bad e-mail', { email: 'nope' }, /Email address is not valid/],
  ])('refuses %s and sends nothing', async (_n, patch, text) => {
    const h = await mount(); fill(h, patch as any);
    await act(async () => { await h.result.current.saveUser(); });
    expect(api.createUser).not.toHaveBeenCalled();
    expect(dialog).toHaveBeenCalledWith('warning', 'Validation', expect.stringMatching(text as RegExp), expect.anything());
  });

  it('a person with no window at all is refused on the screen', async () => {
    const h = await mount([]); fill(h);
    await act(async () => { await h.result.current.saveUser(); });
    expect(api.createUser).not.toHaveBeenCalled();
    expect(dialog).toHaveBeenCalledWith('warning', 'Validation', 'Give this person at least one window', expect.anything());
  });

  it('a taken user name asks "modify or disable?"; Yes loads that user, No does nothing more', async () => {
    api.createUser.mockResolvedValue({ success: false, message: 'Username already exists' });
    api.getUserByUsername.mockResolvedValue({ success: true, data: { users: [{ id: 9, username: 'Test123', email: 'a@b.c', firstName: 'T', lastName: 'U', role: 'clerk', permissions: ['read_member'], isActive: true }] } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const h = await mount(); fill(h);
    await act(async () => { await h.result.current.saveUser(); });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(api.getUserByUsername).toHaveBeenCalledWith('Test123');
    await waitFor(() => expect(h.result.current.isUpdating).toBe(true));
    expect(h.result.current.existingUserId).toBe(9);
    expect(dialog).not.toHaveBeenCalledWith('error', expect.anything(), expect.anything(), expect.anything());

    const h2 = await mount(); fill(h2);
    confirm.mockReturnValue(false); api.getUserByUsername.mockClear();
    await act(async () => { await h2.result.current.saveUser(); });
    expect(api.getUserByUsername).not.toHaveBeenCalled();
    expect(h2.result.current.isUpdating).toBe(false);
  });

  it('a taken e-mail is an error, not the modify question', async () => {
    api.createUser.mockResolvedValue({ success: false, message: 'Email already exists' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const h = await mount(); fill(h);
    await act(async () => { await h.result.current.saveUser(); });
    expect(confirm).not.toHaveBeenCalled();
    expect(dialog).toHaveBeenCalledWith('error', 'Identity Synchronization Error', expect.anything(), expect.stringContaining('Email already exists'));
  });

  it('modify: updates by id, keeps the account state, leaves the password alone when blank', async () => {
    const h = await mount();
    act(() => h.result.current.loadUser({ id: 9, username: 'Bob', email: 'b@x.com', firstName: 'B', lastName: 'C', role: 'clerk', permissions: ['read_member'], isActive: false } as any));
    await act(async () => { await h.result.current.saveUser(); });
    expect(api.updateUser).toHaveBeenCalledTimes(1);
    const [id, body] = api.updateUser.mock.calls[0]!;
    expect(id).toBe(9);
    expect(body).toMatchObject({ username: 'Bob', role: 'clerk', isActive: false, menuIds: [1, 2] });
    expect(body).not.toHaveProperty('password');
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it('a server refusal is shown with its reason and the form keeps what was typed', async () => {
    api.createUser.mockResolvedValue({ success: false, message: 'Only an administrator can create or assign the ADMINISTRATOR level.' });
    const h = await mount(); fill(h);
    await act(async () => { await h.result.current.saveUser(); });
    expect(dialog).toHaveBeenCalledWith('error', 'Identity Synchronization Error', expect.anything(), expect.stringContaining('ADMINISTRATOR level'));
    expect(h.result.current.formData.username).toBe('Test123');
    expect(h.onSaved.current).not.toHaveBeenCalled();
  });

  it('a failed lookup is shown (it used to do nothing)', async () => {
    api.getUserByUsername.mockResolvedValue({ success: false, message: 'Forbidden' });
    const h = await mount(); fill(h);
    await act(async () => { await h.result.current.fetchUser('Test123'); });
    expect(dialog).toHaveBeenCalledWith('error', 'Search Failed', expect.anything(), 'Forbidden');
  });

  it('stress: Save pressed 5 times at once sends one request', async () => {
    let finish!: (v: any) => void;
    api.createUser.mockImplementation(() => new Promise(r => { finish = r; }));
    const h = await mount(); fill(h);
    let all!: Promise<unknown>;
    act(() => { all = Promise.all([1, 2, 3, 4, 5].map(() => h.result.current.saveUser())); });
    await act(async () => { finish({ success: true, data: {} }); await all; });
    expect(api.createUser).toHaveBeenCalledTimes(1);
  });
});
