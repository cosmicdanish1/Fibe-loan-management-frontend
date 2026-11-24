// Change Loan Surety (ES-631): choosing a guarantor must not wipe the borrower / loan case.
// The shared member lookup also broadcasts 'member-selected' to every window; the page used to take that as a new borrower.
import { waitFor, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/services/apiVersionConfig', () => ({
  API_ROUTES: { loans: { suretyCases: (m: string) => `/s/${m}`, caseDetails: (c: string) => `/c/${c}`, changeSurety: (c: string) => `/p/${c}` } },
  getApiBaseUrl: async () => 'http://x', logApiVersion: () => {},
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { useChangeLoanSuretyForm } from '../../../src/service/Administration/loan/Change Loan Surety/hooks/useChangeLoanSuretyForm';

let broadcast: (e: any, m: any) => void = () => {};
const cases = [{ loanCaseNo: '500' }, { loanCaseNo: '501' }];
const detail = { loanCaseNo: '500', loanType: 'RLN', sanctionedAmount: 10000, surety1: '', surety2: '', memberNo: '610028636', memberName: 'A I SAJEE', officeName: 'BHILAI' };

beforeEach(() => {
  (window as any).electronAPI = { ipcRenderer: { on: (_c: string, h: any) => { broadcast = h; return () => {}; } } };
  (globalThis as any).fetch = vi.fn(async (url: string) => ({ ok: true, json: async () => ({ data: url.includes('/s/') ? cases : detail }) }));
});
afterEach(() => { delete (window as any).electronAPI; });

const setup = async () => {
  const h = renderHook(() => useChangeLoanSuretyForm());
  await act(async () => { h.result.current.handleInputChange('memberNumber', '610028636'); });
  await waitFor(() => expect(h.result.current.loanCases.length).toBe(2));
  await act(async () => { await h.result.current.fetchLoanDetails('500'); });
  return h;
};

describe('Change Loan Surety: picking a guarantor', () => {
  it('keeps the borrower and loan case when a guarantor is chosen, even if the broadcast arrives afterwards', async () => {
    const h = await setup();
    act(() => h.result.current.handleLookup('surety1'));
    act(() => h.result.current.handleMemberSelect({ memberNo: '610019753', memberName: 'G ONE' }));
    // the broadcast from the shared lookup arrives after the dialog has closed
    act(() => broadcast({}, { memberNo: '610019753', memberName: 'G ONE' }));
    const f = h.result.current.formData;
    expect(f.memberNumber).toBe('610028636');
    expect(f.loanCaseNo).toBe('500');
    expect(f.surety1).toBe('610019753');
    expect(h.result.current.loanCases.length).toBe(2);
  });

  it('both guarantors can be chosen one after the other', async () => {
    const h = await setup();
    for (const [field, no] of [['surety1', '610019753'], ['surety2', '30018767']] as const) {
      act(() => h.result.current.handleLookup(field));
      act(() => h.result.current.handleMemberSelect({ memberNo: no, memberName: 'N' + no }));
      act(() => broadcast({}, { memberNo: no, memberName: 'N' + no }));
    }
    const f = h.result.current.formData;
    expect([f.surety1, f.surety2, f.loanCaseNo, f.memberNumber]).toEqual(['610019753', '30018767', '500', '610028636']);
  });

  it('a borrower picked from another window (broadcast, no dialog here) still loads that borrower', async () => {
    const h = renderHook(() => useChangeLoanSuretyForm());
    act(() => broadcast({}, { memberNo: '610028636', memberName: 'A I SAJEE' }));
    expect(h.result.current.formData.memberNumber).toBe('610028636');
  });
});
