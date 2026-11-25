// Modify Member Balance: loan boxes are read-only (ES-683) and are never sent on Save.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  getMemberFunds: vi.fn(),
  updateMemberFunds: vi.fn(),
  lookupMembers: vi.fn(),
}));
vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { useModifyMemberBalance } from '../../../src/service/Masters/ModifyMemberBalance/hooks/useModifyMemberBalance';

const funds = {
  sharesOpeningBalance: 200000, sharesInstallment: 0, monthlyContributionOpeningBalance: 10, monthlyContributionInstallment: 8,
  compulsoryDepositOpeningBalance: 28, compulsoryDepositInstallment: 0, loanExecutionReceipt: 0, suspenseBalance: 0,
  rlnOpBal: 0, rlnAmt: 3674, elnOpBal: 0, elnAmt: 500,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.getMemberFunds.mockResolvedValue({ success: true, data: funds });
  api.updateMemberFunds.mockResolvedValue({ success: true });
  api.lookupMembers.mockResolvedValue({ data: [] });
  (window as any).electronAPI = { showMessageBox: vi.fn().mockResolvedValue({ response: 1 }) };
});

describe('Modify Member Balance hook', () => {
  it('shows the loan figures sent by the server', async () => {
    const { result } = renderHook(() => useModifyMemberBalance());
    act(() => result.current.handleMemberSelect('30016739', { memberNo: '30016739', memberName: 'X' }));
    await waitFor(() => expect(result.current.formData.rlnAmt).toBe('3674'));
    expect(result.current.formData.elnAmt).toBe('500');
  });

  it('Save sends only editable figures, never the loan boxes', async () => {
    const { result } = renderHook(() => useModifyMemberBalance());
    act(() => result.current.handleMemberSelect('30016739', { memberNo: '30016739', memberName: 'X' }));
    await waitFor(() => expect(result.current.formData.rlnAmt).toBe('3674'));
    await act(async () => { await result.current.save(); });
    expect(api.updateMemberFunds).toHaveBeenCalledTimes(1);
    const payload = api.updateMemberFunds.mock.calls[0][1];
    expect(payload).toMatchObject({ monthlyContributionInstallment: 8 });
    for (const k of ['rlnAmt', 'rlnOpBal', 'elnAmt', 'elnOpBal']) expect(payload).not.toHaveProperty(k);
  });
});
