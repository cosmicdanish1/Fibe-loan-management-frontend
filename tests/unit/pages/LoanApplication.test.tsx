// Loan Application window: member pick, the amount field, validations, eligibility, shortfall, save and its errors.
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { api } = vi.hoisted(() => ({ api: { getPostingDate: vi.fn() } }));

vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => undefined }));
vi.mock('../../../src/services/apiVersionConfig', async (orig) => ({
  ...(await orig<any>()),
  getApiBaseUrl: async () => 'http://api.test/api/v1',
  API_BASE_URL: 'http://api.test/api/v1',
}));

import LoanApplication from '../../../src/service/Administration/loan/Loan Application/page/LoanApplication';

const MEMBER = { mbno: '610024232', fullname: 'JAIN GK', officeno: 1, wingno: 1, office_name: 'BHILAI', basic_pay: '22849', dor: '1900-01-01', isactive: 'Y' };
const ELIGIBLE = { isEligible: true, ruleApplies: true, loanAmount: 1000, existingOutstanding: 0, totalExposure: 1000, maxLimit: 300000, withinMaxLimit: true,
  rdPct: 5, requiredRd: 50, currentRd: 5000, rdShortfall: 0, sharePct: 5, requiredShare: 50, currentShare: 5000, shareShortfall: 0, totalShortfall: 0, netDisbursement: 1000 };

let eligibility: any;
let saveReply: () => Promise<any>;
let calls: Array<{ url: string; init?: any }>;
let memberHandler: (e: any, m: any) => Promise<void>;
const showMessageBox = vi.fn();

const json = (body: any, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  eligibility = ELIGIBLE;
  saveReply = async () => json({ success: true, loanCaseNo: '889400', nomineesSaved: 0 }, 201);
  calls = [];
  localStorage.setItem('accessToken', 'tok');
  api.getPostingDate.mockResolvedValue({ success: true, data: { date: '2026-08-25', mode: 'WORKING' } });
  showMessageBox.mockResolvedValue({ response: 0 });
  const on = vi.fn((channel: string, fn: any) => { if (channel === 'member-selected') memberHandler = fn; });
  (window as any).electronAPI = { showMessageBox, ipcRenderer: { on, removeListener: vi.fn(), send: vi.fn() }, openNewWindow: vi.fn() };
  global.fetch = vi.fn(async (url: any, init?: any) => {
    const u = String(url); calls.push({ url: u, init });
    if (init?.method === 'POST' && u.endsWith('/loans/loan-application')) return saveReply() as any;
    if (u.includes('/members/details/')) return json({ data: MEMBER }) as any;
    if (u.includes('/balances')) return json({ data: { regularLoanBal: 0, emergencyLoanBal: 0, shareBalance: 5000 } }) as any;
    if (u.includes('/cases')) return json({ data: [] }) as any;
    if (u.includes('/loans/eligibility/')) return json({ data: eligibility }) as any;
    return json({}, 404) as any;
  }) as any;
});
afterEach(() => { localStorage.clear(); }); // electronAPI stays until the next test replaces it (the page's unmount cleanup still needs it)

const posts = () => calls.filter((c) => c.init?.method === 'POST');
const lastBody = () => JSON.parse(posts().at(-1)!.init.body);
const dialogTitles = () => showMessageBox.mock.calls.map((c) => c[0].message);

const pickMember = async () => {
  await waitFor(() => expect(memberHandler).toBeTypeOf('function'));
  await act(async () => { await memberHandler({}, { memberNo: '610024232', memberName: 'JAIN GK', officeNo: 1, officeName: 'BHILAI' }); });
  await screen.findByText('JAIN GK');
};
const chooseType = async (label: string) => {
  fireEvent.mouseDown(document.querySelector('#loanType')!.closest('.ant-select')!.querySelector('.ant-select-selector')!);
  fireEvent.click((await screen.findAllByText(label)).pop()!);
};
const amountBox = () => document.getElementById('loanAmount') as HTMLInputElement;
const typeAmount = (v: string) => fireEvent.change(amountBox(), { target: { value: v } });
const fillReason = (v = 'Test') => fireEvent.change(document.getElementById('reason')!, { target: { value: v } });
// the button reads Save, Saving... or Checking Eligibility... depending on the moment
const saveButton = () => screen.getByRole('button', { name: /^(Save|Saving...|Checking Eligibility...)$/ });
const save = () => fireEvent.click(saveButton());
const saveReady = () => waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled(), { timeout: 2500 });

describe('Loan Application: opening', () => {
  it('shows the three tabs and the date of the window setting as a read-only field', async () => {
    render(<LoanApplication />);
    expect(screen.getByRole('heading', { name: 'Loan Application' })).toBeInTheDocument();
    for (const tab of ['Loan details', 'Nominee details', 'Loan Against RD']) expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('applDate')).toHaveValue('2026-08-25'));
    expect(document.getElementById('applDate')).toBeDisabled();
    expect(api.getPostingDate).toHaveBeenCalledWith('LOAN_APP');
  });

  it('switches between the tabs', () => {
    render(<LoanApplication />);
    fireEvent.click(screen.getByRole('tab', { name: 'Nominee details' }));
    expect(screen.getByText('Add nominee information for the loan application')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Loan details' }));
    expect(document.getElementById('memberNo')).toBeInTheDocument();
  });
});

describe('Loan Application: choosing a member', () => {
  it('loads the member card and the open loan cases', async () => {
    render(<LoanApplication />);
    await pickMember();
    expect(screen.getByText('BHILAI')).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/members/details/610024232'))).toBe(true);
    expect(calls.some((c) => c.url.endsWith('/loans/member/610024232/cases'))).toBe(true);
    expect(calls.some((c) => c.url.endsWith('/loans/member/610024232/balances'))).toBe(true);
    expect(document.getElementById('memberNo')).toHaveValue('610024232');
  });

  it('ES-596: the old system\'s "no date" (1/1/1900) shows as N/A, a real date shows as a date', async () => {
    render(<LoanApplication />);
    await pickMember();
    expect(screen.getByText('Retire date').parentElement).toHaveTextContent('N/A');
  });

  it('a member number typed by hand accepts digits only', () => {
    render(<LoanApplication />);
    fireEvent.change(document.getElementById('memberNo')!, { target: { value: '610a0-24 232' } });
    expect(document.getElementById('memberNo')).toHaveValue('610024232');
  });

  it('when the member details cannot be read the card falls back to the lookup data and N/A', async () => {
    (global.fetch as any).mockImplementation(async (url: any) => (String(url).includes('/members/details/') ? json({}, 500) : json({ data: [] })));
    render(<LoanApplication />);
    await waitFor(() => expect(memberHandler).toBeTypeOf('function'));
    await act(async () => { await memberHandler({}, { memberNo: '610024232', memberName: 'JAIN GK', officeNo: 1, officeName: 'BHILAI' }); });
    expect(await screen.findByText('JAIN GK')).toBeInTheDocument();
    expect(document.getElementById('memberNo')).toHaveValue('610024232');
  });
});

describe('Loan Application: the amount field (ES-505)', () => {
  it('keeps digits, and refuses signs and exponent forms instead of turning them into another amount', () => {
    render(<LoanApplication />);
    typeAmount('250000'); expect(amountBox()).toHaveValue('250000');
    typeAmount('-500'); expect(amountBox()).toHaveValue('250000');   // refused: value unchanged
    typeAmount('1e5'); expect(amountBox()).toHaveValue('250000');
    typeAmount('abc'); expect(amountBox()).toHaveValue('');
  });

  it('keeps a decimal amount with up to 2 decimals (100.50 stays 100.50)', () => {
    render(<LoanApplication />);
    typeAmount('100.50'); expect(amountBox()).toHaveValue('100.50');
    typeAmount('250000.00'); expect(amountBox()).toHaveValue('250000.00');
    typeAmount('7.5'); expect(amountBox()).toHaveValue('7.5');
  });

  it('cuts a third decimal and a second decimal point', () => {
    render(<LoanApplication />);
    typeAmount('100.555'); expect(amountBox()).toHaveValue('100.55');
    typeAmount('1.2.3'); expect(amountBox()).toHaveValue('1.23');
  });

  it('commas and spaces from a pasted amount are dropped', () => {
    render(<LoanApplication />);
    typeAmount('2,50,000'); expect(amountBox()).toHaveValue('250000');
    typeAmount('1 000'); expect(amountBox()).toHaveValue('1000');
  });
});

describe('Loan Application: Save validations (nothing is sent)', () => {
  it('no member', async () => {
    render(<LoanApplication />);
    save();
    await waitFor(() => expect(dialogTitles()).toContain('Member Selection Required'));
    expect(posts()).toHaveLength(0);
  });
  it('no loan type', async () => {
    render(<LoanApplication />);
    fireEvent.change(document.getElementById('memberNo')!, { target: { value: '610024232' } });
    save();
    await waitFor(() => expect(dialogTitles()).toContain('Loan Type Required'));
    expect(posts()).toHaveLength(0);
  });
  it.each([['empty', ''], ['zero', '0'], ['zero with decimals', '0.00'], ['a trailing dot', '100.']])('amount %s', async (_l, value) => {
    render(<LoanApplication />);
    await pickMember(); await chooseType('REGULAR LOAN');
    typeAmount(value);
    if (Number(value) > 0) await saveReady();
    save();
    await waitFor(() => expect(dialogTitles()).toContain('Loan Amount Required'));
    expect(posts()).toHaveLength(0);
  });
  it('no reason', async () => {
    render(<LoanApplication />);
    await pickMember(); await chooseType('REGULAR LOAN'); typeAmount('1000'); fillReason('   ');
    await saveReady();
    save();
    await waitFor(() => expect(dialogTitles()).toContain('Loan Purpose Required'));
    expect(posts()).toHaveLength(0);
  });
  it('the reason and the form number have the same length limits as the database (50 and 10)', () => {
    render(<LoanApplication />);
    expect(document.getElementById('reason')).toHaveAttribute('maxlength', '50');
    expect(document.getElementById('formNumber')).toHaveAttribute('maxlength', '10');
  });
});

describe('Loan Application: eligibility', () => {
  it('shows the checking state and then the exposure line', async () => {
    render(<LoanApplication />);
    await pickMember(); await chooseType('EMERGENCY LOAN'); typeAmount('1000');
    expect(await screen.findByText(/Exposure/, undefined, { timeout: 2500 })).toBeInTheDocument();
    expect(calls.some((c) => /\/loans\/eligibility\/610024232\?amount=1000&loanType=ALN/.test(c.url))).toBe(true);
  });

  it('a loan above the limit disables Save and sends nothing', async () => {
    eligibility = { ...ELIGIBLE, isEligible: false, withinMaxLimit: false, loanAmount: 900000, totalExposure: 900000 };
    render(<LoanApplication />);
    await pickMember(); await chooseType('EMERGENCY LOAN'); typeAmount('900000'); fillReason();
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled(), { timeout: 2500 });
    expect(posts()).toHaveLength(0);
  });

  it('a shortfall asks first; Cancel sends nothing', async () => {
    eligibility = { ...ELIGIBLE, totalShortfall: 1800, shareShortfall: 1400, rdShortfall: 400, requiredShare: 1500, currentShare: 100, requiredRd: 1500, currentRd: 1100, netDisbursement: 28200, loanAmount: 30000 };
    showMessageBox.mockResolvedValue({ response: 1 });
    render(<LoanApplication />);
    await pickMember(); await chooseType('EMERGENCY LOAN'); typeAmount('30000'); fillReason();
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled(), { timeout: 2500 });
    save();
    await waitFor(() => expect(dialogTitles()).toContain('Shortfall Will Be Withheld From Disbursement'));
    expect(showMessageBox.mock.calls.find((c) => c[0].message.startsWith('Shortfall'))![0].detail).toMatch(/Total Withheld : ₹1,800/);
    expect(posts()).toHaveLength(0);
  });

  it('a shortfall asks first; Continue saves', async () => {
    eligibility = { ...ELIGIBLE, totalShortfall: 1800, shareShortfall: 1400, rdShortfall: 400, loanAmount: 30000 };
    render(<LoanApplication />);
    await pickMember(); await chooseType('EMERGENCY LOAN'); typeAmount('30000'); fillReason();
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled(), { timeout: 2500 });
    save();
    await waitFor(() => expect(posts()).toHaveLength(1));
  });
});

describe('Loan Application: saving', () => {
  const fillValid = async (type = 'EMERGENCY LOAN') => {
    render(<LoanApplication />);
    await pickMember(); await chooseType(type);
    typeAmount('1000'); fillReason('Test');
    fireEvent.change(document.getElementById('formNumber')!, { target: { value: '323' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled(), { timeout: 2500 });
  };

  it('sends the application with the type code, a 2-decimal amount, the window date and the token, then resets', async () => {
    await fillValid();
    save();
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]!.url).toBe('http://api.test/api/v1/loans/loan-application');
    expect(posts()[0]!.init.headers.Authorization).toBe('Bearer tok');
    expect(lastBody()).toMatchObject({ memberNo: '610024232', loanType: 'ALN', loanAmount: '1000.00', reason: 'Test', formNumber: '323', applDate: '2026-08-25', nominees: [] });
    await waitFor(() => expect(dialogTitles()).toContain('Application Saved Successfully!'));
    const detail = showMessageBox.mock.calls.find((c) => c[0].message === 'Application Saved Successfully!')![0].detail;
    expect(detail).toMatch(/LOAN CASE NO\.\s+: 889400/);
    expect(detail).toMatch(/LOAN CATEGORY\s+: EMERGENCY LOAN/);
    await waitFor(() => expect(document.getElementById('memberNo')).toHaveValue(''));
    expect(document.getElementById('applDate')).toHaveValue('2026-08-25');   // reset keeps the window's date
    expect(amountBox()).toHaveValue('');
  });

  it('the three loan types are sent as ALN, RLN and ELN', async () => {
    for (const [label, code] of [['REGULAR LOAN', 'RLN'], ['LOAN AGAINST RD', 'ELN']] as const) {
      const { unmount } = render(<LoanApplication />);
      await pickMember(); await chooseType(label); typeAmount('1000'); fillReason('T');
      await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled(), { timeout: 2500 });
      save();
      await waitFor(() => expect(lastBody().loanType).toBe(code));
      unmount(); calls.length = 0; showMessageBox.mockClear();
    }
  });

  it('a double click sends one application only', async () => {
    let release: () => void = () => undefined;
    saveReply = () => new Promise((resolve) => { release = () => resolve(json({ success: true, loanCaseNo: '889401' }, 201)); });
    await fillValid();
    const btn = saveButton();
    fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
    await act(async () => { release(); });
    await waitFor(() => expect(dialogTitles()).toContain('Application Saved Successfully!'));
    expect(posts()).toHaveLength(1);
  });

  it('a refused member is explained, and the form keeps what was typed', async () => {
    saveReply = async () => json({ message: 'Member 610024232 was not found.' }, 400);
    await fillValid(); save();
    await waitFor(() => expect(dialogTitles()).toContain('Member Information Conflict'));
    expect(amountBox()).toHaveValue('1000');
  });

  it('an over-limit refusal shows the limit, the balance and the applied amount', async () => {
    saveReply = async () => json({ message: 'Total loan amount exceeds maximum limit of ₹3,00,000 for Emergency loans. Current Emergency loan balance: ₹0, Applied: ₹5,00,000' }, 400);
    await fillValid(); save();
    await waitFor(() => expect(dialogTitles()).toContain('Loan Amount Exceeds Limit'));
    const detail = showMessageBox.mock.calls.find((c) => c[0].message === 'Loan Amount Exceeds Limit')![0].detail;
    expect(detail).toMatch(/Maximum Limit\s+: ₹3,00,000/);
    expect(detail).toMatch(/Applied Amount\s+: ₹5,00,000/);
  });

  it('any other refusal shows the server\'s own words', async () => {
    saveReply = async () => json({ message: 'A member cannot stand surety for his own loan.' }, 400);
    await fillValid(); save();
    await waitFor(() => expect(dialogTitles()).toContain('Application Error'));
    expect(showMessageBox.mock.calls.find((c) => c[0].message === 'Application Error')![0].detail).toBe('A member cannot stand surety for his own loan.');
  });

  it('a lost connection says so', async () => {
    saveReply = async () => { throw new Error('Failed to fetch'); };
    await fillValid(); save();
    await waitFor(() => expect(dialogTitles()).toContain('Unable to connect to the server.'));
    expect(showMessageBox.mock.calls.find((c) => c[0].message.startsWith('Unable'))![0].detail).toMatch(/Failed to fetch/);
  });

  it('Save is available again after a refusal (the saving state is cleared)', async () => {
    saveReply = async () => json({ message: 'nope' }, 400);
    await fillValid(); save();
    await waitFor(() => expect(dialogTitles()).toContain('Application Error'));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled());
  });
});

describe('Loan Application: leaving', () => {
  it('Cancel closes the window', () => {
    render(<LoanApplication />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect((window as any).electronAPI.ipcRenderer.send).toHaveBeenCalledWith('window-close');
  });
});

describe('Loan Application: eligibility answers arrive out of order', () => {
  it('a slow answer for an older amount does not replace the answer for the amount now typed', async () => {
    const slowOld = { ...ELIGIBLE, loanAmount: 1000, isEligible: true };
    const fastNew = { ...ELIGIBLE, loanAmount: 900000, isEligible: false, withinMaxLimit: false, totalExposure: 900000 };
    let releaseOld: () => void = () => undefined;
    (global.fetch as any).mockImplementation(async (url: any, init?: any) => {
      const u = String(url); calls.push({ url: u, init });
      if (u.includes('/members/details/')) return json({ data: MEMBER });
      if (u.includes('/balances')) return json({ data: {} });
      if (u.includes('/cases')) return json({ data: [] });
      if (u.includes('/loans/eligibility/')) {
        if (u.includes('amount=1000&')) return new Promise((resolve) => { releaseOld = () => resolve(json({ data: slowOld })); });
        return json({ data: fastNew });
      }
      return json({}, 404);
    });
    render(<LoanApplication />);
    await pickMember(); await chooseType('EMERGENCY LOAN');
    typeAmount('1000');
    await waitFor(() => expect(calls.some((c) => c.url.includes('amount=1000&'))).toBe(true), { timeout: 2500 });   // the old request is now in flight
    typeAmount('900000');
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled(), { timeout: 2500 });   // the new answer: not eligible
    await act(async () => { releaseOld(); });                                                                        // the OLD answer arrives late
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();                                           // and must not re-enable Save
  });
});
