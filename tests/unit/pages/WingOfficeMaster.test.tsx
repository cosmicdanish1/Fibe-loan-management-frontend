// Wing / Office Master (frontend): the rules, the Office form with Division / RO = wing and the "..." button,
// the Wing form with State 1 / 0, and the messages. The API is mocked.
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, shown } = vi.hoisted(() => ({
  api: { getWings: vi.fn(), getWing: vi.fn(), createWing: vi.fn(), updateWing: vi.fn(), getOffice: vi.fn(), createOffice: vi.fn(), updateOffice: vi.fn() },
  shown: vi.fn(),
}));
vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => {} }));
vi.mock('@/utils/dialog', () => ({ isFailure: (r: any) => !!r && r.success === false, toastError: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import {
  isValidState, stateText, parseBranchNo, officeProblems, buildOfficePayload, wingLabel, movedText, STATE_MESSAGE,
} from '../../../src/service/Masters/WingOfficeMaster/utils/officeRules';
import { useOfficeMaster } from '../../../src/service/Masters/WingOfficeMaster/hook/useOfficeMaster';
import { useWingMaster } from '../../../src/service/Masters/WingOfficeMaster/hook/useWingMaster';
import WingOfficeMaster from '../../../src/service/Masters/WingOfficeMaster/page/WingOfficeMaster';

const WINGS = [{ wingId: '1', wingName: 'BHILAI', state: 1 }, { wingId: '2', wingName: 'RAIPUR', state: 0 }];
const form = (o: any = {}) => ({ branchNo: '', name: 'X', wingId: '1', divisionNo: '', address: '', city: '', ...o });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  (window as any).electronAPI = { showMessageBox: shown.mockResolvedValue({ response: 0 }) };
  api.getWings.mockResolvedValue({ success: true, data: WINGS });
  api.getOffice.mockResolvedValue({ success: true, data: { officeId: 5, officeName: 'DALLI RAJHRA', wingId: '1', division: 3, address: 'A', city: 'C' } });
  api.createOffice.mockResolvedValue({ success: true, data: { officeId: 7 } });
  api.updateOffice.mockResolvedValue({ success: true, data: { officeId: 5, membersMoved: 0 } });
  api.createWing.mockResolvedValue({ success: true });
  api.updateWing.mockResolvedValue({ success: true });
  api.getWing.mockResolvedValue({ success: true, data: { wingId: '1', wingName: 'BHILAI', state: 1 } });
});

describe('rules', () => {
  it.each([['1', true], ['0', true], [1, true], [0, true], [' 1 ', true], ['4', false], ['', false], [null, false], ['XX', false], ['01', false]])('state %j valid = %s', (v, want) => expect(isValidState(v)).toBe(want));
  it.each([[1, '1'], [0, '0'], ['0', '0'], [null, '1'], [undefined, '1'], ['x', '1']])('stateText %j -> %s', (v, want) => expect(stateText(v)).toBe(want));
  it('branch number: blank = new, otherwise a whole number of 1 or more', () => {
    expect(parseBranchNo('')).toEqual({ ok: true, value: null });
    expect(parseBranchNo('  ')).toEqual({ ok: true, value: null });
    expect(parseBranchNo('5')).toEqual({ ok: true, value: 5 });
    for (const bad of ['0', '-3', '1.5', 'abc', '5x', '99999999999']) expect(parseBranchNo(bad).ok).toBe(false);
  });
  it('problems: name, wing, city length, division number', () => {
    expect(officeProblems(form())).toEqual([]);
    expect(officeProblems(form({ name: ' ' }))).toEqual(['Office name is required.']);
    expect(officeProblems(form({ wingId: '' }))[0]).toMatch(/Division \/ RO is required/);
    expect(officeProblems(form({ city: 'C'.repeat(21) }))[0]).toMatch(/at most 20/);
    expect(officeProblems(form({ divisionNo: 'x' }))[0]).toMatch(/Division No/);
    expect(officeProblems(form({ branchNo: 'abc' }))[0]).toMatch(/Branch No/);
  });
  it('payload: blank Branch No and Division No are left out; typed ones are numbers; text is trimmed', () => {
    expect(buildOfficePayload(form({ name: ' N ', address: ' A ', city: ' C ' }))).toEqual({ officeName: 'N', wingId: '1', address: 'A', city: 'C' });
    expect(buildOfficePayload(form({ branchNo: '9', divisionNo: '61' }))).toMatchObject({ officeId: 9, division: 61 });
  });
  it('wing label and moved-members sentence', () => {
    expect(wingLabel({ wingId: '1', wingName: 'BHILAI' })).toBe('BHILAI (1)');
    expect(wingLabel({ wingId: '1', wingName: '' })).toBe('1');
    expect(movedText(0)).toBe('');
    expect(movedText(1)).toBe('1 active member of this office moved to the new wing.');
    expect(movedText(352)).toBe('352 active members of this office moved to the new wing.');
  });
});

describe('Office form: Division / RO is the wing', () => {
  const mount = async () => { const h = renderHook(() => useOfficeMaster()); await waitFor(() => expect(h.result.current.wings.length).toBe(2)); return h; };

  it('the wings are loaded for the Division / RO box (code and name)', async () => {
    const h = await mount();
    expect(h.result.current.wings).toEqual([{ wingId: '1', wingName: 'BHILAI', state: '1' }, { wingId: '2', wingName: 'RAIPUR', state: '0' }]);
  });
  it('loading office 5 fills name, wing, division number, address and city', async () => {
    const h = await mount();
    await act(async () => { await h.result.current.fetchOffice('5'); });
    expect(h.result.current.data).toMatchObject({ name: 'DALLI RAJHRA', wingId: '1', divisionNo: '3', address: 'A', city: 'C' });
  });
  it('an office that is not found switches to new mode and tells the user', async () => {
    api.getOffice.mockRejectedValue(new Error('404'));
    const h = await mount();
    act(() => h.result.current.updateName('KEEP'));
    await act(async () => { await h.result.current.fetchOffice('99'); });
    expect(h.result.current.data.name).toBe('');
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: 'No Existing Office' }));
  });
  it('a non-numeric Branch No is not looked up', async () => {
    const h = await mount();
    await act(async () => { await h.result.current.fetchOffice('abc'); });
    expect(api.getOffice).not.toHaveBeenCalled();
  });
  it('a new branch (blank Branch No): created WITHOUT a number so the server gives it; the number shown afterwards is the server\'s', async () => {
    const h = await mount();
    act(() => { h.result.current.updateName('NEW BRANCH'); h.result.current.updateWingId('1'); h.result.current.updateCity('BHILAI'); });
    await act(async () => { await h.result.current.save(); });
    expect(api.createOffice).toHaveBeenCalledWith({ officeName: 'NEW BRANCH', wingId: '1', address: '', city: 'BHILAI' });
    expect(h.result.current.data.branchNo).toBe('7');
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: 'Office Master Saved Successfully!', detail: expect.stringContaining('OFFICE NO   : 7') }));
  });
  it('after the save the next save updates (no second create)', async () => {
    const h = await mount();
    act(() => { h.result.current.updateName('NEW'); h.result.current.updateWingId('1'); });
    await act(async () => { await h.result.current.save(); });
    await act(async () => { await h.result.current.save(); });
    expect(api.createOffice).toHaveBeenCalledTimes(1);
    expect(api.updateOffice).toHaveBeenCalledTimes(1);
    expect(api.updateOffice.mock.calls[0]![0]).toBe(7);
  });
  it('a loaded office is updated; moving it to another wing says how many members moved', async () => {
    api.updateOffice.mockResolvedValue({ success: true, data: { officeId: 5, membersMoved: 352 } });
    const h = await mount();
    act(() => h.result.current.updateBranchNo('5')); // the user types the number, then loads it
    await act(async () => { await h.result.current.fetchOffice('5'); });
    act(() => h.result.current.updateWingId('2'));
    await act(async () => { await h.result.current.save(); });
    expect(api.updateOffice).toHaveBeenCalledWith(5, expect.objectContaining({ officeId: 5, wingId: '2' }));
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining('352 active members of this office moved to the new wing.') }));
  });
  it('the wing shown in the saved message is the wing name with its code', async () => {
    const h = await mount();
    act(() => { h.result.current.updateName('N'); h.result.current.updateWingId('2'); });
    await act(async () => { await h.result.current.save(); });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining('DIVISION/RO : RAIPUR (2)') }));
  });
  it.each([
    ['no name', { name: '' }, /Office name is required/], ['no wing', { wing: '' }, /Division \/ RO is required/],
  ])('%s: warned, nothing sent', async (_n, patch: any, msg) => {
    const h = await mount();
    act(() => { h.result.current.updateName('name' in patch ? patch.name : 'X'); h.result.current.updateWingId('wing' in patch ? patch.wing : '1'); });
    await act(async () => { await h.result.current.save(); });
    expect(api.createOffice).not.toHaveBeenCalled();
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: expect.stringMatching(msg) }));
  });
  it('a refused save shows the server\'s reason; the form is kept', async () => {
    api.createOffice.mockResolvedValue({ success: false, message: 'Division / RO "9" does not exist.' });
    const h = await mount();
    act(() => { h.result.current.updateName('N'); h.result.current.updateWingId('9'); });
    await act(async () => { await h.result.current.save(); });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', detail: 'Division / RO "9" does not exist.' }));
    expect(h.result.current.data.name).toBe('N');
  });
  it('a network failure is reported', async () => {
    api.createOffice.mockRejectedValue(new Error('down'));
    const h = await mount();
    act(() => { h.result.current.updateName('N'); h.result.current.updateWingId('1'); });
    await act(async () => { await h.result.current.save(); });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unable to Connect to Server' }));
  });
  it('Purge clears the form and goes back to new mode', async () => {
    const h = await mount();
    await act(async () => { await h.result.current.fetchOffice('5'); });
    act(() => h.result.current.reset());
    expect(h.result.current.data).toEqual({ branchNo: '', name: '', wingId: '', divisionNo: '', address: '', city: '' });
    act(() => { h.result.current.updateName('N'); h.result.current.updateWingId('1'); });
    await act(async () => { await h.result.current.save(); });
    expect(api.createOffice).toHaveBeenCalled();
  });
  it('the wing list failing to load leaves the box empty, no crash', async () => {
    api.getWings.mockRejectedValue(new Error('down'));
    const h = renderHook(() => useOfficeMaster());
    await act(async () => {});
    expect(h.result.current.wings).toEqual([]);
  });
});

describe('Wing form: State 1 / 0', () => {
  const mount = () => renderHook(() => useWingMaster());
  it('a saved wing with State 1 loads as In State; State 0 as Out State (numbers from the server)', async () => {
    const h = mount();
    await act(async () => { h.result.current.updateWingCode('1'); await h.result.current.fetchWing('1'); });
    expect(h.result.current.data).toMatchObject({ name: 'BHILAI', state: '1' });
    api.getWing.mockResolvedValue({ success: true, data: { wingId: '2', wingName: 'RAIPUR', state: 0 } });
    await act(async () => { await h.result.current.fetchWing('2'); });
    expect(h.result.current.data.state).toBe('0');
  });
  it('a new wing is created with the code, name and state', async () => {
    const h = mount();
    act(() => { h.result.current.updateWingCode(' 3 '); h.result.current.updateName(' NEW '); h.result.current.updateState('0'); });
    await act(async () => { await h.result.current.handleOK(); });
    expect(api.createWing).toHaveBeenCalledWith({ wingId: '3', wingName: 'NEW', state: '0' });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining('Out State (0)') }));
  });
  it('a loaded wing is updated, not created', async () => {
    const h = mount();
    await act(async () => { h.result.current.updateWingCode('1'); await h.result.current.fetchWing('1'); });
    await act(async () => { await h.result.current.handleOK(); });
    expect(api.updateWing).toHaveBeenCalledWith('1', expect.objectContaining({ wingId: '1' }));
    expect(api.createWing).not.toHaveBeenCalled();
  });
  it('the legacy "Invalid State": a state other than 1 or 0 is refused and nothing is sent', async () => {
    const h = mount();
    act(() => { h.result.current.updateWingCode('1'); h.result.current.updateName('BHILAI'); h.result.current.updateState('4'); });
    await act(async () => { await h.result.current.handleOK(); });
    expect(api.createWing).not.toHaveBeenCalled();
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid State', detail: STATE_MESSAGE }));
  });
  it('code and name are required; code at most 6 characters, name at most 45', async () => {
    const h = mount();
    await act(async () => { await h.result.current.handleOK(); });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: 'Wing Code and Name Required' }));
    act(() => { h.result.current.updateWingCode('1234567'); h.result.current.updateName('X'); });
    await act(async () => { await h.result.current.handleOK(); });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: 'Too Long' }));
    expect(api.createWing).not.toHaveBeenCalled();
  });
  it('a refused save shows the reason (for example the code exists)', async () => {
    api.createWing.mockResolvedValue({ success: false, message: 'Wing 3 already exists.' });
    const h = mount();
    act(() => { h.result.current.updateWingCode('3'); h.result.current.updateName('X'); });
    await act(async () => { await h.result.current.handleOK(); });
    expect(shown).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', detail: 'Wing 3 already exists.' }));
  });
  it('Cancel clears the form', () => {
    const h = mount();
    act(() => { h.result.current.updateWingCode('3'); h.result.current.updateState('0'); });
    act(() => h.result.current.handleCancel());
    expect(h.result.current.data).toEqual({ wingCode: '', name: '', state: '1' });
  });
});

describe('the page', () => {
  it('Division / RO lists the wings, and the "..." button opens the Wing Master tab', async () => {
    render(<WingOfficeMaster />);
    expect(await screen.findByText('Division / RO')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Wing Master' }));
    expect(await screen.findByLabelText('Wing Code')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /In State/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Out State/ })).toBeInTheDocument();
  });
  it('going back to the Office tab reloads the wings (a wing just added is there)', async () => {
    render(<WingOfficeMaster />);
    await screen.findByText('Division / RO');
    const before = api.getWings.mock.calls.length;
    fireEvent.click(screen.getByRole('tab', { name: /Wing/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Office/ }));
    await waitFor(() => expect(api.getWings.mock.calls.length).toBeGreaterThan(before));
  });
  it('the Branch No box says a new branch is left blank', async () => {
    render(<WingOfficeMaster />);
    expect(await screen.findByText('Leave blank for new')).toBeInTheDocument();
  });
});
