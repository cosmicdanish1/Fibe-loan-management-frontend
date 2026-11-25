// Modify Business Rules (frontend): loading the flat server answer into the cards, saving the cards back, the profile
// file (export / import), and the refusal to save after a failed load. The API is mocked: no rule is ever written.
// Tests named "KNOWN BUG" use it.fails: they describe the CORRECT behaviour and fail today.
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { api } = vi.hoisted(() => ({ api: { getBusinessRules: vi.fn(), updateBusinessRules: vi.fn() } }));
vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { useBusinessRules, initialData } from '../../../src/service/Administration/ModifyBusinessRules/hook/useBusinessRules';
import { buildProfileFile, parseProfileFile, PROFILE_FORMAT, PROFILE_VERSION } from '../../../src/service/Administration/ModifyBusinessRules/util/rulesProfile';

// What the server sends for the legacy row 4032 (numerics arrive as strings from Postgres).
const SERVER = {
  RULE_LOAN_R_MAX_AMT: '1000000', RULE_LOAN_R_RATE: '12.00', RULE_LOAN_R_INSTALLMENTS: '50', RULE_LOAN_R_GUARANTORS: '2', RULE_PENAL_RATE: '3.00', RULE_LOAN_R_GRACE_DAYS: 15,
  RULE_LOAN_ADD_MAX_AMT: '500000', RULE_LOAN_ADD_RATE: '12.00', RULE_LOAN_ADD_INSTALLMENTS: '100', RULE_LOAN_ADD_GUARANTORS: '0',
  RULE_LOAN_EMG_MAX_AMT: '1000000', RULE_LOAN_EMG_RATE: '7.00', RULE_LOAN_EMG_INSTALLMENTS: '120', RULE_LOAN_EMG_GUARANTORS: '0',
  RULE_LOAN_MT_MAX_AMT: '25000', RULE_LOAN_MT_RATE: '13.00', RULE_LOAN_MT_INSTALLMENTS: '10', RULE_LOAN_MT_GUARANTORS: '0',
  RULE_LOAN_DEP_MAX_AMT: '500000', RULE_LOAN_DEP_RATE: '2.00', RULE_LOAN_DEP_INSTALLMENTS: '50',
  RULE_LOAN_DEP_FD_PCT: '90', RULE_LOAN_DEP_OVERALL_LIMIT: '500000', RULE_LOAN_DEP_SHARE_VAL_PCT: '0', RULE_LOAN_DEP_BASIC_PAY: '0',
  RULE_MEMBER_MIN_TENURE_MONTHS: '25', RULE_SHARE_MIN_AMT: '0', RULE_SHARE_MAX_AMT: '0', RULE_SECURITY_DEP_AMT: 0,
  SYS_DATA_ENTRY_MODE: false, SYS_PRINT_DEMAND_HORIZONTAL: true, SYS_USE_REDUCING_BALANCE: true, SYS_AVG_INT_CALC_SLOT: 0, SYS_PROFIT_HEAD: '',
  RULE_CD_INTEREST_CHART: '[{"monthlyContribution":200,"yearlyInterest":120}]',
  RULE_DEMAND_IMPORT_STRICTNESS: 'STANDARD',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  api.getBusinessRules.mockResolvedValue({ success: true, data: SERVER });
  api.updateBusinessRules.mockResolvedValue({ success: true });
});

const mount = async () => {
  const h = renderHook(() => useBusinessRules());
  await waitFor(() => expect(h.result.current.loading).toBe(false));
  return h;
};

describe('loading the server answer into the cards (legacy row 4032)', () => {
  it('Regular, Emergency (ALN), Loan Against RD (ELN) and Grain read the right fields, as numbers', async () => {
    const { result } = await mount();
    const r = result.current.businessRules;
    expect(r.regularLoan).toMatchObject({ maxAmount: 1000000, rate: 12, numberOfInstallments: 50, numberOfGuarantors: 2, penalRate: 3, graceDays: 15 });
    expect(r.additionalLoan).toMatchObject({ maxAmount: 500000, rate: 12, numberOfInstallments: 100 }); // the card titled "Emergency Loan"
    expect(r.emergencyLoan).toMatchObject({ maxAmount: 1000000, rate: 7, numberOfInstallments: 120 }); // the card titled "Loan Against RD"
    expect(r.mediumTermLoan).toMatchObject({ maxAmount: 25000, rate: 13, numberOfInstallments: 10 }); // "Grain Loan"
    expect(r.loanOnDeposit).toMatchObject({ maxAmount: 500000, rate: 2, numberOfInstallments: 50 });
  });

  it('limits, membership and switches', async () => {
    const { result } = await mount();
    const r = result.current.businessRules;
    expect(r.loanAgainstDeposits).toMatchObject({ fdPercentage: 90, overallLimit: 500000 });
    expect(r.others).toMatchObject({ minMembership: 25, minShareAmt: 0, maxShareAmt: 0, securityDep: 0 });
    expect(r.generalSettings).toMatchObject({ dataEntryMode: false, printDemandFormatHorizontal: true, calculateInterestUsingReducingBalance: true, demandImportStrictness: 'STANDARD' });
    expect(r.fundManagement.interestChart).toEqual([{ monthlyContribution: 200, yearlyInterest: 120 }]);
  });

  it('a stored 0 stays 0 (it is not replaced by the default); a missing value takes the default', async () => {
    api.getBusinessRules.mockResolvedValue({ success: true, data: { ...SERVER, RULE_LOAN_R_RATE: '0.00', RULE_LOAN_R_GUARANTORS: undefined } });
    const { result } = await mount();
    expect(result.current.businessRules.regularLoan.rate).toBe(0);
    expect(result.current.businessRules.regularLoan.numberOfGuarantors).toBe(initialData.regularLoan.numberOfGuarantors);
  });

  it('text or empty in a number field falls back to the default instead of NaN', async () => {
    api.getBusinessRules.mockResolvedValue({ success: true, data: { ...SERVER, RULE_LOAN_R_RATE: 'abc', RULE_LOAN_R_MAX_AMT: '' } });
    const { result } = await mount();
    expect(Number.isNaN(result.current.businessRules.regularLoan.rate)).toBe(false);
    expect(result.current.businessRules.regularLoan.maxAmount).toBe(initialData.regularLoan.maxAmount);
  });

  it('a broken interest chart text does not break the load', async () => {
    api.getBusinessRules.mockResolvedValue({ success: true, data: { ...SERVER, RULE_CD_INTEREST_CHART: '{oops' } });
    const { result } = await mount();
    expect(result.current.loaded).toBe(true);
    expect(result.current.businessRules.fundManagement.interestChart).toEqual([]);
  });

  it('an unknown strictness word shows STRICT (never the looser one)', async () => {
    api.getBusinessRules.mockResolvedValue({ success: true, data: { ...SERVER, RULE_DEMAND_IMPORT_STRICTNESS: 'lax' } });
    const { result } = await mount();
    expect(result.current.businessRules.generalSettings.demandImportStrictness).toBe('STRICT');
  });
});

describe('a failed load (ES-83)', () => {
  it.each([
    ['server says no', () => api.getBusinessRules.mockResolvedValue({ success: false, message: 'Forbidden' }), 'Forbidden'],
    ['no data in the answer', () => api.getBusinessRules.mockResolvedValue({ success: true }), 'Could not load'],
    ['network error', () => api.getBusinessRules.mockRejectedValue(new Error('Network down')), 'Network down'],
  ])('%s: the error is shown, nothing is "loaded", and Save is refused so the defaults cannot overwrite the live rules', async (_n, arrange, text) => {
    arrange();
    const { result } = await mount();
    expect(result.current.loaded).toBe(false);
    expect(result.current.loadError).toContain(text);
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.saveBusinessRules(initialData); });
    expect(ok).toBe(false);
    expect(api.updateBusinessRules).not.toHaveBeenCalled();
  });

  it('refresh after a failure recovers', async () => {
    api.getBusinessRules.mockRejectedValueOnce(new Error('down'));
    const { result } = await mount();
    expect(result.current.loaded).toBe(false);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.loaded).toBe(true);
    expect(result.current.loadError).toBeNull();
  });
});

describe('saving the cards back', () => {
  const save = async (mutate?: (d: typeof initialData) => void) => {
    const h = await mount();
    const data = JSON.parse(JSON.stringify(h.result.current.businessRules));
    mutate?.(data);
    let ok: boolean | undefined;
    await act(async () => { ok = await h.result.current.saveBusinessRules(data); });
    return { ok, sent: api.updateBusinessRules.mock.calls[0]?.[0] as Record<string, any>, h };
  };

  it('sends every card to the key the server expects, Emergency = ADD, Loan Against RD = EMG', async () => {
    const { ok, sent } = await save();
    expect(ok).toBe(true);
    expect(sent).toMatchObject({
      RULE_LOAN_R_MAX_AMT: 1000000, RULE_LOAN_R_RATE: 12, RULE_LOAN_R_INSTALLMENTS: 50, RULE_LOAN_R_GUARANTORS: 2, RULE_PENAL_RATE: 3,
      RULE_LOAN_ADD_MAX_AMT: 500000, RULE_LOAN_ADD_INSTALLMENTS: 100,
      RULE_LOAN_EMG_MAX_AMT: 1000000, RULE_LOAN_EMG_RATE: 7, RULE_LOAN_EMG_INSTALLMENTS: 120,
      RULE_LOAN_MT_MAX_AMT: 25000, RULE_LOAN_DEP_FD_PCT: 90, RULE_LOAN_DEP_OVERALL_LIMIT: 500000, RULE_MEMBER_MIN_TENURE_MONTHS: 25,
      RULE_DEMAND_IMPORT_STRICTNESS: 'STANDARD',
    });
  });

  it('what was loaded is what is saved: a load followed by a save changes no number (round trip)', async () => {
    const { sent } = await save();
    const asNumbers = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).filter(([k, v]) => /^RULE_(LOAN_(R|ADD|EMG|MT|DEP)_|PENAL|MEMBER|SHARE)/.test(k) && typeof SERVER[k as keyof typeof SERVER] !== 'undefined').map(([k, v]) => [k, Number(v)]));
    const expected = Object.fromEntries(Object.entries(SERVER).filter(([k]) => /^RULE_(LOAN_(R|ADD|EMG|MT|DEP)_|PENAL|MEMBER|SHARE)/.test(k)).map(([k, v]) => [k, Number(v)]));
    const got = asNumbers(sent);
    for (const k of Object.keys(expected)) expect([k, got[k]]).toEqual([k, expected[k]]);
  });

  it('an edit reaches the server (Regular rate 12 -> 9.5)', async () => {
    const { sent } = await save((d) => { d.regularLoan.rate = 9.5; });
    expect(sent.RULE_LOAN_R_RATE).toBe(9.5);
  });

  it('the interest chart is sent as JSON text', async () => {
    const { sent } = await save();
    expect(JSON.parse(sent.RULE_CD_INTEREST_CHART)).toEqual([{ monthlyContribution: 200, yearlyInterest: 120 }]);
  });

  it('reducing balance is always sent as the single method', async () => {
    const { sent } = await save();
    expect(sent.RULE_LOAN_INTEREST_METHOD).toBe('REDUCING_BALANCE');
  });

  it('a refused save returns false and keeps the server reason for the screen', async () => {
    api.updateBusinessRules.mockResolvedValue({ success: false, message: 'Loan limits are required', statusCode: 400 });
    const { ok, h } = await save();
    expect(ok).toBe(false);
    expect(h.result.current.getSaveFailure()).toMatchObject({ message: 'Loan limits are required' });
  });

  it('a network error on save returns false and does not throw', async () => {
    api.updateBusinessRules.mockRejectedValue(new Error('Network down'));
    const { ok, h } = await save();
    expect(ok).toBe(false);
    expect(h.result.current.getSaveFailure()).toEqual({ error: 'Network down' });
  });

  it('a successful save clears the previous failure', async () => {
    api.updateBusinessRules.mockResolvedValueOnce({ success: false, message: 'x' });
    const h = await mount();
    await act(async () => { await h.result.current.saveBusinessRules(h.result.current.businessRules); });
    expect(h.result.current.getSaveFailure()).not.toBeNull();
    await act(async () => { await h.result.current.saveBusinessRules(h.result.current.businessRules); });
    expect(h.result.current.getSaveFailure()).toBeNull();
  });

  it.fails('KNOWN BUG: a negative rate cannot even be sent by the hook (the check is only in the page, so any other caller can send it)', async () => {
    const { ok } = await save((d) => { d.regularLoan.rate = -5; });
    expect(ok).toBe(false);
  });
});

describe('the profile file (ES-540)', () => {
  const current = () => JSON.parse(JSON.stringify(initialData));

  it('an exported file reads back with no change (export then import is a no-op)', () => {
    const cur = current();
    const text = buildProfileFile(cur);
    const doc = JSON.parse(text);
    expect(doc.format).toBe(PROFILE_FORMAT);
    expect(doc.version).toBe(PROFILE_VERSION);
    const r = parseProfileFile(text, cur);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.changes).toEqual([]); expect(r.merged).toEqual(cur); }
  });

  it('a changed value is listed with the screen name of its card (Emergency Loan, not additionalLoan)', () => {
    const cur = current();
    const doc = JSON.parse(buildProfileFile(cur));
    doc.rules.additionalLoan.rate = 9;
    const r = parseProfileFile(JSON.stringify(doc), cur);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.changes).toEqual([{ group: 'Emergency Loan', field: 'rate', from: String(cur.additionalLoan.rate), to: '9' }]);
  });

  it('keys left out of the file keep their value', () => {
    const cur = current();
    const text = JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { regularLoan: { rate: 8 } } });
    const r = parseProfileFile(text, cur);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.merged.regularLoan.rate).toBe(8); expect(r.merged.regularLoan.maxAmount).toBe(cur.regularLoan.maxAmount); expect(r.merged.additionalLoan).toEqual(cur.additionalLoan); }
  });

  it.each([
    ['not JSON', 'hello', /not a valid JSON/],
    ['JSON but not an object', '[1,2]', /not a Business Rules profile/],
    ['wrong format name', JSON.stringify({ format: 'other', version: 1, rules: {} }), /not a Business Rules profile/],
    ['newer version', JSON.stringify({ format: PROFILE_FORMAT, version: 99, rules: {} }), /newer version/],
    ['version missing', JSON.stringify({ format: PROFILE_FORMAT, rules: {} }), /newer version/],
    ['no rules section', JSON.stringify({ format: PROFILE_FORMAT, version: 1 }), /no "rules"/],
    ['unknown section', JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { nope: {} } }), /Unknown section "nope"/],
    ['unknown setting', JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { regularLoan: { nope: 1 } } }), /Unknown setting "regularLoan.nope"/],
    ['text in a number', JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { regularLoan: { rate: '12' } } }), /"regularLoan.rate" must be a number/],
    ['number as true/false', JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { earlyClosureProtection: { autoPass: 1 } } }), /must be true or false/],
    ['bad choice', JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { loanRounding: { mode: 'HALF' } } }), /must be one of: NONE, NEAREST, UP, DOWN/],
    ['bad chart row', JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { fundManagement: { interestChart: [{ monthlyContribution: 'x' }] } } }), /interestChart/],
  ])('%s: the whole file is refused with a plain message', (_n, text, msg) => {
    const r = parseProfileFile(text as string, current());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(msg as RegExp);
  });

  it('one bad value refuses the whole file: nothing is half applied', () => {
    const doc = { format: PROFILE_FORMAT, version: 1, rules: { regularLoan: { rate: 8 }, loanRounding: { mode: 'HALF' } } };
    expect(parseProfileFile(JSON.stringify(doc), current()).ok).toBe(false);
  });

  it.fails('KNOWN BUG: a profile with a negative or over-100 rate is refused (today only the type is checked, so -5 or 5000 is accepted and goes to the review list)', () => {
    const doc = { format: PROFILE_FORMAT, version: 1, rules: { regularLoan: { rate: 5000 }, additionalLoan: { rate: -5 } } };
    expect(parseProfileFile(JSON.stringify(doc), current()).ok).toBe(false);
  });

  it('a 1000-row interest chart imports (stress)', () => {
    const chart = Array.from({ length: 1000 }, (_, i) => ({ monthlyContribution: 100 + i, yearlyInterest: i }));
    const r = parseProfileFile(JSON.stringify({ format: PROFILE_FORMAT, version: 1, rules: { fundManagement: { interestChart: chart } } }), current());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.merged.fundManagement.interestChart).toHaveLength(1000);
  });
});
