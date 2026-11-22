// Receipt window: Receipt / General Receipt / Demand Receipt. Saving only stages the voucher (pending pass).
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, dialog } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    getBankList: vi.fn(),
    getHeadBalance: vi.fn(),
    getHeadList: vi.fn(),
    saveReceipt: vi.fn(),
    getPostingDate: vi.fn(),
  },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => undefined }));
// the member lookup is its own window; here it just hands back one member when it is opened
vi.mock('@/components/shared/kit/MemberLookupDialog', () => ({
  default: ({ open, onSelect }: any) => (open ? (
    <button type="button" onClick={() => onSelect({ memberNo: 610031566, memberName: 'A ANAND', officeNo: 1 })}>pick-member</button>
  ) : null),
}));

import Receipt from '../../../src/service/Transaction/Receipt&Payment/Receipt/page/Receipt';

const HEADS = [{ code: 'A1023', name: 'AGM ADVANCE' }, { code: 'L1004', name: 'COMPULSORY DEPOSIT' }];

const selectMember = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Member lookup/i }));
  fireEvent.click(await screen.findByText('pick-member'));
  await screen.findAllByText('A ANAND');
};

const addRow = async (amount: string, head = 'A1023 - AGM ADVANCE') => {
  fireEvent.click(screen.getByRole('button', { name: /Add Row/ }));
  const select = (await screen.findAllByText('Select...'))[0]!;
  fireEvent.mouseDown(select);
  fireEvent.click((await screen.findAllByText(head)).pop()!);
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: amount } });
};

describe('Receipt window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialog.mockResolvedValue(undefined);
    api.getBankList.mockResolvedValue({ success: true, data: [{ code: 'A1008', name: 'STATE BANK' }] });
    api.getHeadBalance.mockResolvedValue({ success: true, data: { balance: 5000 } });
    api.getHeadList.mockResolvedValue({ success: true, data: HEADS });
    api.get.mockResolvedValue({ success: true, data: { data: { loan_summary: { rln_balance: '200000.00', eln_balance: '0.00' } } } });
    api.saveReceipt.mockResolvedValue({ success: true, data: { voucherNo: 'R58900' } });
    api.getPostingDate.mockResolvedValue({ success: true, data: { date: '2026-08-25' } });
  });

  it('shows the three tabs, the sections and that the voucher is held until passed', async () => {
    render(<Receipt />);
    expect(screen.getByRole('heading', { name: 'Receipt' })).toBeInTheDocument();
    expect(screen.getByText('Held until passed in Pass Transactions')).toBeInTheDocument();
    for (const tab of ['Receipt', 'General Receipt', 'Demand Receipt']) expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    for (const card of ['Member details', 'Mode of payment', 'Receipt breakdown']) expect(screen.getByText(card)).toBeInTheDocument();
    await waitFor(() => expect(api.getHeadList).toHaveBeenCalled());
  });

  it('shows the Day-End working date and sends it as the voucher date', async () => {
    render(<Receipt />);
    expect(await screen.findByTitle('Working date')).toHaveTextContent('25-Aug-26');
    await selectMember();
    await addRow('111');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.saveReceipt).toHaveBeenCalledTimes(1));
    expect(api.saveReceipt.mock.calls[0][0].transDate).toBe('2026-08-25');
  });

  it('refuses to save without a member', async () => {
    render(<Receipt />);
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('warning', 'Input Validation Error', 'Member Required', expect.any(String)));
    expect(api.saveReceipt).not.toHaveBeenCalled();
  });

  it('picking a member shows the name and the real loan balances', async () => {
    render(<Receipt />);
    await selectMember();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/utilities/member/balance?memberNo=610031566'));
    expect(await screen.findByText('200000.00')).toBeInTheDocument();
  });

  it('General Receipt switches the member and office fields off', async () => {
    render(<Receipt />);
    fireEvent.click(screen.getByRole('tab', { name: 'General Receipt' }));
    expect(screen.getByPlaceholderText('0')).toBeDisabled();
    expect(screen.getByPlaceholderText('Office No...')).toBeDisabled();
  });

  it('saves a cash receipt as a staged voucher with the right payload', async () => {
    render(<Receipt />);
    await selectMember();
    await addRow('111');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.saveReceipt).toHaveBeenCalledTimes(1));
    const payload = api.saveReceipt.mock.calls[0][0];
    expect(payload).toMatchObject({ memberNo: 610031566, modeOfPay: 'C', bankCode: 'A1001', receiptType: 'receipt', cheqNo: '', bankName: '' });
    expect(payload.rows).toEqual([{ code: 'A1023', accType: 'OTH', amount: 111, rdSrNo: '' }]);
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('info', 'electron-react-ts', 'Receipt Saved Successfully!', expect.stringContaining('Saved (Pending Pass)')));
    expect(await screen.findByText('R58900')).toBeInTheDocument();
  });

  it('sends the RD serial number typed on a row', async () => {
    render(<Receipt />);
    await selectMember();
    await addRow('50', 'L1004 - COMPULSORY DEPOSIT');
    fireEvent.change(screen.getByPlaceholderText('RD ref...'), { target: { value: '77' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.saveReceipt).toHaveBeenCalled());
    expect(api.saveReceipt.mock.calls[0][0].rows[0]).toMatchObject({ code: 'L1004', rdSrNo: '77', accType: 'CD' });
  });

  it('bank mode needs a cheque number', async () => {
    render(<Receipt />);
    await selectMember();
    await addRow('10');
    fireEvent.click(screen.getByRole('tab', { name: 'BANK' }));
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('warning', 'Input Validation Error', 'Cheque Number Required', expect.any(String)));
    expect(api.saveReceipt).not.toHaveBeenCalled();
  });

  it('bank receipt sends the cheque details in their own fields', async () => {
    render(<Receipt />);
    await selectMember();
    await addRow('10');
    fireEvent.click(screen.getByRole('tab', { name: 'BANK' }));
    fireEvent.change(screen.getByPlaceholderText('Cheque No...'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Customer bank...'), { target: { value: 'TEST BANK' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.saveReceipt).toHaveBeenCalled());
    expect(api.saveReceipt.mock.calls[0][0]).toMatchObject({ modeOfPay: 'B', cheqNo: '123456', bankName: 'TEST BANK', narration: '' });
  });

  it('Demand Receipt carries the demand month and year', async () => {
    render(<Receipt />);
    fireEvent.click(screen.getByRole('tab', { name: 'Demand Receipt' }));
    await selectMember();
    await addRow('10');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.saveReceipt).toHaveBeenCalled());
    const p = api.saveReceipt.mock.calls[0][0];
    expect(p.receiptType).toBe('demand');
    expect(p.month).toMatch(/^[A-Z]{3}$/);
    expect(String(p.year)).toMatch(/^\d{4}$/);
  });

  it('shows the server message when the save is refused', async () => {
    api.saveReceipt.mockResolvedValue({ success: false, message: 'The voucher date can not be in the future.' });
    render(<Receipt />);
    await selectMember();
    await addRow('10');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'Receipt Error', 'Failed to Save Receipt', 'The voucher date can not be in the future.'));
  });

  it('limits the narration to the 100 characters the voucher can hold', () => {
    render(<Receipt />);
    expect(screen.getByPlaceholderText(/Enter narration/)).toHaveAttribute('maxlength', '100');
  });
});
