// Head Opening Balance: amount typing, balance check, save / apply / build tree, closed years, year switching races,
// and stress runs (a big chart, many quick edits).
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, msg } = vi.hoisted(() => ({
  api: {
    getHeadOpeningBalanceYears: vi.fn(), getHeadOpeningBalances: vi.fn(), saveHeadOpeningBalances: vi.fn(),
    applyYearOpeningBalances: vi.fn(), rebuildBalancesheet: vi.fn(),
  },
  msg: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../../src/services/api', () => ({ default: api, apiService: api }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => {} }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: any) => (o ? s.replace(/\{\{(\d)\}\}/g, (_m, i) => String(o[i])) : s) }) }));
vi.mock('antd', async () => {
  const actual: any = await vi.importActual('antd');
  return { ...actual, message: msg };
});

import HeadOpeningBalance from '../../../src/service/Administration/HeadOpeningBalance/page/HeadOpeningBalance';
import { parseAmount, sidesOf, toBalances, toEntry, round2, money, sectionSum } from '../../../src/service/Administration/HeadOpeningBalance/utils/openingBalance';

const row = (code: string, parent: string, name: string, bal = 0, extra: any = {}) => ({ code, parentCode: parent, headName: name, headType: 'OTH', openingBal: bal, hasYearData: true, ...extra });
const BALANCED = [
  row('M1000', 'ROOT', 'SOCIETY'), row('L1000', 'M1000', 'LIABILITIES'), row('A1000', 'M1000', 'ASSET'), row('I1000', 'M1000', 'INCOME'), row('E1000', 'M1000', 'EXPENDITURE'),
  row('L1001', 'L1000', 'SHARE', 700), row('A1001', 'A1000', 'CASH IN HAND', 1000), row('A1002', 'A1000', 'LOAN', 200), row('E1001', 'E1000', 'RENT', 0), row('I1001', 'I1000', 'INTEREST', 500),
];
const YEARS = [
  { yearcode: 1, startDate: '01 Apr 2026', endDate: '31 Mar 2027', label: '01 Apr 2026 - 31 Mar 2027', closed: false },
  { yearcode: 2, startDate: '01 Apr 2027', endDate: '31 Mar 2028', label: '01 Apr 2027 - 31 Mar 2028', closed: false },
];

describe('amount typing rules', () => {
  it.each([
    ['', null], ['-', null], ['.', null], ['-.', null], ['5.', 5], ['-5', -5], ['12.50', 12.5], ['  7 ', 7], ['-260155', -260155], ['0', 0],
  ])('%j -> %j', (text, want) => expect(parseAmount(text as string)).toBe(want));
  it.each(['abc', '1e5', '1,000', '--5', '5-', '1.2.3', '₹5'])('%j is not a number', (t) => expect(parseAmount(t)).toBeUndefined());
  it('rounds to the paisa and formats with Indian grouping', () => {
    expect(round2(1.005 + 1.005)).toBeCloseTo(2.01, 2);
    expect(money(1234567.5)).toBe('12,34,567.50');
    expect(money(-5)).toBe('-5.00');
    expect(money(0)).toBe('0.00');
  });
});

describe('side totals', () => {
  const E = BALANCED.map(toEntry);
  it('assets + expenditure against liabilities + income', () => {
    const s = sidesOf(E);
    expect(s).toMatchObject({ assets: 1200, expenditure: 0, liabilities: 700, income: 500, debit: 1200, credit: 1200, difference: 0, balanced: true });
  });
  it('a paisa out of balance is out of balance', () => {
    const s = sidesOf(E.map(e => (e.code === 'A1001' ? { ...e, openingBal: 1000.01 } : e)));
    expect(s.balanced).toBe(false);
    expect(s.difference).toBe(0.01);
  });
  it('section rows and M1000 are never counted', () => {
    const s = sidesOf(E.map(e => (e.code === 'A1000' || e.code === 'M1000' ? { ...e, openingBal: 999 } : e)));
    expect(s.debit).toBe(1200);
    expect(sectionSum(E, 'A1000')).toBe(1200);
  });
  it('the save body has every head (not sections), rounded', () => {
    const b = toBalances(E.map(e => (e.code === 'L1001' ? { ...e, openingBal: 700.456 } : e)));
    expect(b).toHaveLength(5);
    expect(b.find(x => x.headCode === 'L1001')!.closingBal).toBe(700.46);
    expect(b.some(x => ['L1000', 'M1000'].includes(x.headCode))).toBe(false);
  });
  it('bad numbers from the server become 0', () => expect(toEntry({ code: 'A1', openingBal: 'x' }).openingBal).toBe(0));
});

const mount = async (rows: any[] = BALANCED, years: any[] = YEARS, probe = 'A1001') => {
  api.getHeadOpeningBalanceYears.mockResolvedValue({ success: true, data: years });
  api.getHeadOpeningBalances.mockResolvedValue({ success: true, data: rows });
  render(<HeadOpeningBalance />);
  await waitFor(() => expect(api.getHeadOpeningBalances).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByLabelText(`Opening balance ${probe}`)).toBeInTheDocument());
};
// a direct query: getByLabelText walks the whole table on every call, which is slow on a 500-row chart
const box = (code: string) => {
  const el = document.querySelector(`input[aria-label="Opening balance ${code}"]`);
  if (!el) throw new Error(`no box for ${code}`);
  return el as HTMLInputElement;
};
const type = (code: string, v: string) => fireEvent.change(box(code), { target: { value: v } });

beforeEach(() => {
  vi.clearAllMocks();
  api.saveHeadOpeningBalances.mockResolvedValue({ success: true, message: 'Saved 5 head balances for year 2.' });
  api.applyYearOpeningBalances.mockResolvedValue({ success: true, message: 'Applied year 2 balances to 5 account heads.' });
  api.rebuildBalancesheet.mockResolvedValue({ success: true, data: { message: 'Balance sheet rebuilt from ledger. 142 accounts updated.' } });
});

describe('Head Opening Balance window', () => {
  it('opens on the latest year and shows its balances and the balance check', async () => {
    await mount();
    expect(api.getHeadOpeningBalances).toHaveBeenCalledWith(2);
    expect(box('A1001').value).toBe('1000');
    expect(screen.getByText('Debit and credit sides agree')).toBeInTheDocument();
  });

  it('says so when nothing is saved for the year yet (the numbers are the current opening balances)', async () => {
    await mount(BALANCED.map(r => ({ ...r, hasYearData: false })));
    expect(screen.getByText(/Nothing is saved for this year yet/)).toBeInTheDocument();
  });

  it('no such note when the year has saved balances', async () => {
    await mount();
    expect(screen.queryByText(/Nothing is saved for this year yet/)).not.toBeInTheDocument();
  });

  it('a minus sign and a decimal point can be typed (they used to be wiped)', async () => {
    await mount();
    type('A1001', '-');
    expect(box('A1001').value).toBe('-');
    type('A1001', '-5');
    type('A1001', '-5.');
    expect(box('A1001').value).toBe('-5.');
    type('A1001', '-5.25');
    expect(box('A1001').value).toBe('-5.25');
    expect(screen.getByText('1 unsaved')).toBeInTheDocument();
  });

  it('letters are refused and the box keeps its number', async () => {
    await mount();
    type('A1001', '12ab');
    expect(box('A1001').value).toBe('1000');
    expect(screen.queryByText('1 unsaved')).not.toBeInTheDocument();
  });

  it('editing updates the difference at once', async () => {
    await mount();
    type('A1001', '1100');
    expect(screen.getByText('Debit minus credit; the sides do not agree yet')).toBeInTheDocument();
  });

  it('saving a balanced year sends the year and every head, then clears the unsaved mark', async () => {
    await mount();
    type('A1001', '900'); type('A1002', '300');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.saveHeadOpeningBalances).toHaveBeenCalledTimes(1));
    const [year, balances] = api.saveHeadOpeningBalances.mock.calls[0]!;
    expect(year).toBe(2);
    expect(balances).toHaveLength(5);
    expect(balances.find((b: any) => b.headCode === 'A1001').closingBal).toBe(900);
    await waitFor(() => expect(msg.success).toHaveBeenCalledWith('Saved 5 head balances for year 2.'));
    expect(screen.queryByText('2 unsaved')).not.toBeInTheDocument();
  });

  it('an unbalanced year asks first: Cancel saves nothing, Save anyway saves', async () => {
    await mount();
    type('A1001', '1100');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText('The balances do not agree')).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Cancel' }));
    expect(api.saveHeadOpeningBalances).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save anyway' }));
    await waitFor(() => expect(api.saveHeadOpeningBalances).toHaveBeenCalledTimes(1));
  });

  it('a refused save shows the server reason and keeps the numbers', async () => {
    api.saveHeadOpeningBalances.mockRejectedValue(new Error('Financial year 2 is closed, so its opening balances cannot be changed.'));
    await mount();
    type('A1001', '900'); type('A1002', '300');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('Financial year 2 is closed, so its opening balances cannot be changed.'));
    expect(box('A1001').value).toBe('900');
    expect(screen.getByText('2 unsaved')).toBeInTheDocument();
  });

  it('a closed year can be read but not changed', async () => {
    await mount(BALANCED, [{ ...YEARS[0], closed: true }]);
    expect(box('A1001')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Build tree/ })).toBeDisabled();
    expect(screen.getByText('This year is closed. Its balances can be read but not changed.')).toBeInTheDocument();
  });

  it('Apply asks first, then applies this year only', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(api.applyYearOpeningBalances).toHaveBeenCalledWith(2));
    expect(api.rebuildBalancesheet).not.toHaveBeenCalled();
    await waitFor(() => expect(msg.success).toHaveBeenCalledWith('Applied year 2 balances to 5 account heads.'));
  });

  it('Build tree applies, then rebuilds the balance sheet; a failed apply stops before the rebuild', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: /Build tree/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Build' }));
    await waitFor(() => expect(api.rebuildBalancesheet).toHaveBeenCalledTimes(1));
    expect(api.applyYearOpeningBalances).toHaveBeenCalledWith(2);

    api.applyYearOpeningBalances.mockRejectedValue(new Error('No opening balances are saved for financial year 2. Save them first.'));
    api.rebuildBalancesheet.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Build tree/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Build' }));
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('No opening balances are saved for financial year 2. Save them first.'));
    expect(api.rebuildBalancesheet).not.toHaveBeenCalled();
  });

  it('Refresh with unsaved numbers asks first; Cancel keeps them, Discard reloads', async () => {
    await mount();
    type('A1001', '900');
    fireEvent.click(screen.getByLabelText('Refresh'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(box('A1001').value).toBe('900');
    expect(api.getHeadOpeningBalances).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Refresh'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(api.getHeadOpeningBalances).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(box('A1001').value).toBe('1000'));
  });

  it('a failed load shows the reason', async () => {
    api.getHeadOpeningBalanceYears.mockResolvedValue({ success: true, data: YEARS });
    api.getHeadOpeningBalances.mockRejectedValue(new Error('Financial year 2 does not exist.'));
    render(<HeadOpeningBalance />);
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('Financial year 2 does not exist.'));
  });

  it('search narrows the list', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'cash' } });
    expect(screen.getByLabelText('Opening balance A1001')).toBeInTheDocument();
    expect(screen.queryByLabelText('Opening balance L1001')).not.toBeInTheDocument();
  });
});

describe('stress', () => {
  it('an old year answering late never overwrites the year now shown', async () => {
    api.getHeadOpeningBalanceYears.mockResolvedValue({ success: true, data: YEARS });
    let slow!: (v: any) => void;
    api.getHeadOpeningBalances
      .mockResolvedValueOnce({ success: true, data: BALANCED })
      .mockImplementationOnce(() => new Promise(r => { slow = r; }))
      .mockResolvedValueOnce({ success: true, data: BALANCED.map(r => (r.code === 'A1001' ? { ...r, openingBal: 777 } : r)) });
    render(<HeadOpeningBalance />);
    await waitFor(() => expect(box('A1001').value).toBe('1000'));
    const pick = async (label: string) => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
      fireEvent.click(await screen.findByText(label, { selector: '.ant-select-item-option-content' }));
    };
    await pick('01 Apr 2026 - 31 Mar 2027');                      // year 1: answers slowly
    await waitFor(() => expect(api.getHeadOpeningBalances).toHaveBeenCalledWith(1));
    await pick('01 Apr 2027 - 31 Mar 2028');                      // back to year 2: answers at once
    await waitFor(() => expect(box('A1001').value).toBe('777'));
    await act(async () => { slow({ success: true, data: BALANCED.map(r => (r.code === 'A1001' ? { ...r, openingBal: 1 } : r)) }); });
    expect(box('A1001').value).toBe('777');
  });

  it('double click on Save sends one save', async () => {
    let finish!: (v: any) => void;
    api.saveHeadOpeningBalances.mockImplementation(() => new Promise(r => { finish = r; }));
    await mount();
    type('A1001', '900'); type('A1002', '300');
    const save = screen.getByRole('button', { name: /^Save$/ });
    fireEvent.click(save); fireEvent.click(save); fireEvent.click(save);
    await act(async () => { finish({ success: true, message: 'ok' }); });
    expect(api.saveHeadOpeningBalances).toHaveBeenCalledTimes(1);
  });

  it('500 heads draw, and 300 quick edits land on the right heads', async () => {
    const big = [...BALANCED.slice(0, 5), ...Array.from({ length: 500 }, (_, i) => row(`A${2000 + i}`, 'A1000', `HEAD ${i}`, i))];
    await mount(big, YEARS, 'A2000');
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(400);
    for (let i = 0; i < 300; i++) type(`A${2000 + i}`, String(i * 2 + 1)); // never equal to the value already in the box
    expect(screen.getByText('300 unsaved')).toBeInTheDocument();
    expect(box('A2299').value).toBe(String(299 * 2 + 1));
    expect(box('A2400').value).toBe('400');
  });
});
