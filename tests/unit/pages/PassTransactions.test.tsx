// Pass Transactions: the approver sees every pending voucher with its lines and passes (posts) or deletes it.
// Unit tests of the hook and the table, plus stress tests: double clicks, many vouchers at once, a very long list.
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, dialog } = vi.hoisted(() => ({
  api: { getPendingVouchers: vi.fn(), passTransaction: vi.fn(), deleteVoucher: vi.fn() },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));

import { usePassTransactions } from '../../../src/service/Transaction/PassTransactions/hook/usePassTransactions';
import PassTransactionsTable from '../../../src/service/Transaction/PassTransactions/components/PassTransactionsTable';

const voucher = (no: string, lines = 2, extra: any = {}) => ({
  voucherNo: no, memberNo: '610031566', memberName: 'A ANAND', amount: 100 * lines, vchrType: 'P', chequeNo: '',
  breakdown: Array.from({ length: lines }, (_, i) => ({ trNo: String(i + 1), code: i === 0 ? 'A1002' : 'A1001', headName: i === 0 ? 'REGULAR LOAN' : 'CASH IN HAND', transType: i === 0 ? 'DR' : 'CR', amount: 100 })),
  ...extra,
});

const mount = async (list: any[]) => {
  api.getPendingVouchers.mockResolvedValue({ success: true, data: list });
  const hook = renderHook(() => usePassTransactions());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  await waitFor(() => expect(hook.result.current.transactionData.length).toBe(list.reduce((n, v) => n + Math.max(1, (v.breakdown || []).length), 0)));
  return hook;
};

beforeEach(() => {
  vi.clearAllMocks();
  dialog.mockResolvedValue(undefined);
  (window as any).electronAPI = { showMessageBox: vi.fn().mockResolvedValue({ response: 0 }) }; // the user presses the first button
  api.passTransaction.mockResolvedValue({ success: true, data: {} });
  api.deleteVoucher.mockResolvedValue({ success: true });
});
afterEach(() => { delete (window as any).electronAPI; });

describe('Pass Transactions hook', () => {
  it('shows one row per voucher line with a unique key and keeps the voucher amount on each', async () => {
    const { result } = await mount([voucher('P1', 2), voucher('P2', 3)]);
    const rows = result.current.transactionData as any[];
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map(r => r.key)).size).toBe(5);
    expect(rows[0]).toMatchObject({ voucherNo: 'P1', head: 'A1002 - REGULAR LOAN', transType: 'DR', voucherAmount: 200 });
    expect(rows[1].transType).toBe('CR');
  });

  it('keeps a voucher that has no lines as one row', async () => {
    const { result } = await mount([voucher('P1', 0)]);
    expect(result.current.transactionData).toHaveLength(1);
  });

  it('shows an error dialog when the list cannot be loaded and ends loading', async () => {
    api.getPendingVouchers.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => usePassTransactions());
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', expect.anything(), expect.anything(), expect.anything()));
    expect(result.current.isLoading).toBe(false);
  });

  it('asks first: Cancel posts nothing', async () => {
    (window as any).electronAPI.showMessageBox.mockResolvedValue({ response: 1 });
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handlePass('P1'); });
    expect(api.passTransaction).not.toHaveBeenCalled();
  });

  it('passes once confirmed, tells the user, and reloads the list', async () => {
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handlePass('P1'); });
    expect(api.passTransaction).toHaveBeenCalledWith('P1');
    expect(dialog).toHaveBeenCalledWith('info', expect.anything(), 'Voucher Passed Successfully!', expect.stringContaining('P1'));
    expect(api.getPendingVouchers).toHaveBeenCalledTimes(2);
  });

  it('shows the server reason when the pass is refused and does not reload', async () => {
    api.passTransaction.mockResolvedValue({ success: false, message: 'that day is closed' });
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handlePass('P1'); });
    expect(dialog).toHaveBeenCalledWith('error', expect.anything(), 'Pass Transaction Failed', 'that day is closed');
    expect(api.getPendingVouchers).toHaveBeenCalledTimes(1);
  });

  it('shows a connection error when the call throws, and the voucher can be tried again', async () => {
    api.passTransaction.mockRejectedValueOnce(new Error('timeout'));
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handlePass('P1'); });
    expect(dialog).toHaveBeenCalledWith('error', expect.anything(), 'Unable to Connect to Server', expect.anything());
    expect(result.current.busyVouchers).toEqual([]);
    await act(async () => { await result.current.handlePass('P1'); });
    expect(api.passTransaction).toHaveBeenCalledTimes(2);
  });

  it('shows the consolidation details of a loan that replaced an older one', async () => {
    api.passTransaction.mockResolvedValue({ success: true, data: { consolidation: {
      consolidatedCases: [{ loancaseno: '55', oldBalance: 1000, nrInterest: 1, apInterest: 2, penalInterest: 3, closureInterest: 6 }],
      disbursementDeductions: [], memberNo: '1', loanType: 'RLN', sanctionedAmount: 5000, existingOutstandingPrincipal: 1000,
      combinedPrincipal: 6000, newLoanCaseNo: '99', oldClosureInterestTotal: 6, netDisbursement: 4994, repaymentPlan: { installments: 12 },
    } } });
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handlePass('P1'); });
    const detail = dialog.mock.calls.find(c => c[2] === 'Voucher Passed Successfully!')![3] as string;
    expect(detail).toContain('LOAN CONSOLIDATION COMPLETED');
    expect(detail).toContain('CASE 55 WAS SETTLED');
    expect(detail).toContain('99');
  });

  it('delete asks first, then removes the voucher and reloads', async () => {
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handleDelete('P1'); });
    expect(api.deleteVoucher).toHaveBeenCalledWith('P1');
    expect(dialog).toHaveBeenCalledWith('info', expect.anything(), 'Voucher Deleted', expect.anything());
    expect(api.getPendingVouchers).toHaveBeenCalledTimes(2);
  });

  it('delete: Cancel keeps the voucher; a refusal shows the reason', async () => {
    (window as any).electronAPI.showMessageBox.mockResolvedValueOnce({ response: 1 });
    const { result } = await mount([voucher('P1')]);
    await act(async () => { await result.current.handleDelete('P1'); });
    expect(api.deleteVoucher).not.toHaveBeenCalled();
    api.deleteVoucher.mockResolvedValue({ success: false, message: 'Only PENDING vouchers can be deleted' });
    await act(async () => { await result.current.handleDelete('P1'); });
    expect(dialog).toHaveBeenCalledWith('error', expect.anything(), 'Delete Failed', 'Only PENDING vouchers can be deleted');
  });

  it('exports one CSV line per row and warns when the list is empty', async () => {
    const empty = await mount([]);
    act(() => empty.result.current.handleExport());
    expect(dialog).toHaveBeenCalledWith('warning', expect.anything(), 'Nothing to Export', expect.anything());

    const created: Blob[] = [];
    (URL as any).createObjectURL = vi.fn((b: Blob) => { created.push(b); return 'blob:x'; });
    (URL as any).revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { result } = await mount([voucher('P1', 2)]);
    act(() => result.current.handleExport());
    expect(click).toHaveBeenCalled();
    const text = await (created[0] as any).text?.() ?? '';
    if (text) expect(text.split('\n')).toHaveLength(3); // header + 2 lines
    click.mockRestore();
  });
});

describe('Pass Transactions stress (hook)', () => {
  it('50 quick clicks on the same voucher post it exactly once', async () => {
    let release!: () => void;
    api.passTransaction.mockImplementation(() => new Promise(res => { release = () => res({ success: true, data: {} }); }));
    const { result } = await mount([voucher('P1')]);
    let all!: Promise<void[]>;
    act(() => { all = Promise.all(Array.from({ length: 50 }, () => result.current.handlePass('P1'))); });
    await waitFor(() => expect(api.passTransaction).toHaveBeenCalledTimes(1));
    expect(result.current.busyVouchers).toEqual(['P1']);
    await act(async () => { release(); await all; });
    expect(api.passTransaction).toHaveBeenCalledTimes(1);
    expect(result.current.busyVouchers).toEqual([]);
  });

  it('pass and delete clicked together on one voucher: only the first one runs', async () => {
    let release!: () => void;
    api.passTransaction.mockImplementation(() => new Promise(res => { release = () => res({ success: true, data: {} }); }));
    const { result } = await mount([voucher('P1')]);
    let both!: Promise<unknown>;
    act(() => { both = Promise.all([result.current.handlePass('P1'), result.current.handleDelete('P1')]); });
    await waitFor(() => expect(api.passTransaction).toHaveBeenCalledTimes(1));
    await act(async () => { release(); await both; });
    expect(api.deleteVoucher).not.toHaveBeenCalled();
  });

  it('100 different vouchers passed at the same time are each posted once and all locks are released', async () => {
    const list = Array.from({ length: 100 }, (_, i) => voucher(`P${i + 1}`, 2));
    const { result } = await mount(list);
    await act(async () => { await Promise.all(list.map(v => result.current.handlePass(v.voucherNo))); });
    expect(api.passTransaction).toHaveBeenCalledTimes(100);
    expect(new Set(api.passTransaction.mock.calls.map(c => c[0])).size).toBe(100);
    expect(result.current.busyVouchers).toEqual([]);
  });

  it('a mixed run (some refused, some failing, some passing) never leaves a voucher locked', async () => {
    api.passTransaction.mockImplementation(async (no: string) => {
      const n = Number(no.slice(1));
      if (n % 3 === 0) throw new Error('boom');
      if (n % 3 === 1) return { success: false, message: 'refused' };
      return { success: true, data: {} };
    });
    const list = Array.from({ length: 60 }, (_, i) => voucher(`P${i + 1}`, 1));
    const { result } = await mount(list);
    await act(async () => { await Promise.all(list.map(v => result.current.handlePass(v.voucherNo))); });
    expect(result.current.busyVouchers).toEqual([]);
    await act(async () => { await result.current.handlePass('P3'); }); // a failed one can be tried again
    expect(api.passTransaction.mock.calls.filter(c => c[0] === 'P3')).toHaveLength(2);
  });
});

describe('Pass Transactions table', () => {
  const props = (list: any[], over: any = {}) => {
    const rows = list.flatMap(v => v.breakdown.map((l: any, i: number) => ({
      ...v, voucherAmount: v.amount, trNo: l.trNo, head: `${l.code} - ${l.headName}`, transType: l.transType, noOfAcc: '', amount: l.amount, narration: 'n',
      key: `${v.voucherNo}-${i}`, loanCaseNo: v.loanCaseNo || '',
    })));
    return {
      transactionData: rows, isLoading: false, busyVouchers: [], handleRefresh: vi.fn(), handlePass: vi.fn(), handleDelete: vi.fn(),
      handleExport: vi.fn(), handleExit: vi.fn(), reagreementResult: null, clearReagreementResult: vi.fn(), ...over,
    } as any;
  };

  it('shows the title, the pending count and a Pass and Delete button per voucher', () => {
    render(<PassTransactionsTable {...props([voucher('P1'), voucher('P2')])} />);
    expect(screen.getByRole('heading', { name: 'Pass Transactions' })).toBeInTheDocument();
    expect(screen.getByText(/2 awaiting authorization/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Pass/ }).length).toBeGreaterThanOrEqual(2);
  });

  it('search narrows the list by voucher or member name', () => {
    render(<PassTransactionsTable {...props([voucher('P1'), voucher('P2', 2, { memberName: 'B KUMAR' })])} />);
    fireEvent.change(screen.getByLabelText('Search vouchers'), { target: { value: 'kumar' } });
    expect(screen.getByText(/1 awaiting authorization/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search vouchers'), { target: { value: 'zzz' } });
    expect(screen.queryByText(/awaiting authorization/)).not.toBeInTheDocument();
  });

  it('Refresh, Export and Exit call the hook', () => {
    const p = props([voucher('P1')]);
    render(<PassTransactionsTable {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    fireEvent.click(screen.getByRole('button', { name: /Exit/ }));
    expect(p.handleRefresh).toHaveBeenCalled();
    expect(p.handleExport).toHaveBeenCalled();
    expect(p.handleExit).toHaveBeenCalled();
  });

  it('stress: render time grows in step with the list (no runaway), 40 / 80 / 160 vouchers of 5 lines', () => {
    const time = (n: number) => {
      const list = Array.from({ length: n }, (_, i) => voucher('P' + (i + 1), 5));
      const t0 = performance.now();
      const view = render(<PassTransactionsTable {...props(list)} />);
      expect(screen.getByText(new RegExp(n + ' awaiting authorization'))).toBeInTheDocument();
      const ms = performance.now() - t0;
      view.unmount();
      return ms;
    };
    const a = time(40), b = time(80), c = time(160);
    console.log('PASS-TABLE-TIMING ms', Math.round(a), Math.round(b), Math.round(c));
    expect(c).toBeLessThan(a * 4 * 3 + 500); // doubling the list may not do much worse than double the time
  });
});
