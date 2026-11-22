// Payment Voucher Creation: stages the debit rows of a payment voucher. Cash or bank is chosen later in Voucher Payment.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, dialog } = vi.hoisted(() => ({
  api: { getHeadList: vi.fn(), savePaymentVoucher: vi.fn(), getPostingDate: vi.fn() },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => undefined }));
vi.mock('@/components/shared/kit/MemberLookupDialog', () => ({
  default: ({ open, onSelect }: any) => (open ? (
    <button type="button" onClick={() => onSelect({ memberNo: 610031566, memberName: 'A ANAND', officeNo: 1 })}>pick-member</button>
  ) : null),
}));

import PaymentVoucherCreation from '../../../src/service/Transaction/Receipt&Payment/PaymentVoucherCreation/page/PaymentVoucherCreation';

const HEADS = [{ code: 'A1045', name: 'ADVANCE TAX' }, { code: 'A1023', name: 'AGM ADVANCE' }];

const selectMember = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Member lookup/i }));
  fireEvent.click(await screen.findByText('pick-member'));
  await screen.findAllByText('A ANAND');
};

const fillRow = async (amount: string, head = 'A1045 - ADVANCE TAX') => {
  fireEvent.mouseDown((await screen.findAllByText('Select...'))[0]!);
  fireEvent.click((await screen.findAllByText(head)).pop()!);
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: amount } });
};

describe('Payment Voucher Creation window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialog.mockResolvedValue(undefined);
    api.getHeadList.mockResolvedValue({ success: true, data: HEADS });
    api.savePaymentVoucher.mockResolvedValue({ success: true, data: { voucherNo: 'P26500' } });
    api.getPostingDate.mockResolvedValue({ success: true, data: { date: '2026-08-25' } });
  });

  it('shows the sections and no longer asks where the money is paid from', async () => {
    render(<PaymentVoucherCreation />);
    expect(screen.getByRole('heading', { name: 'Voucher Creation' })).toBeInTheDocument();
    for (const card of ['Voucher', 'Member', 'Transactions']) expect(screen.getByText(card)).toBeInTheDocument();
    expect(screen.queryByText('Pay From')).not.toBeInTheDocument();
    await waitFor(() => expect(api.getHeadList).toHaveBeenCalled());
  });

  it('shows the working date as a read-only field and sends it as the voucher date', async () => {
    render(<PaymentVoucherCreation />);
    const date = document.getElementById('pvc-date') as HTMLInputElement;
    await waitFor(() => expect(date).toHaveValue('25-Aug-2026'));
    expect(date).toBeDisabled();
    expect(screen.getByText('Voucher Date')).toBeInTheDocument();
    await selectMember();
    await fillRow('500');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.savePaymentVoucher).toHaveBeenCalledTimes(1));
    expect(api.savePaymentVoucher.mock.calls[0][0].transDate).toBe('2026-08-25');
  });

  it('keeps the working date after Clear', async () => {
    render(<PaymentVoucherCreation />);
    const date = document.getElementById('pvc-date') as HTMLInputElement;
    await waitFor(() => expect(date).toHaveValue('25-Aug-2026'));
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));
    await waitFor(() => expect(date).toHaveValue('25-Aug-2026'));
  });

  it('refuses to save without a member', async () => {
    render(<PaymentVoucherCreation />);
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('warning', 'Input Validation Error', 'Member Required', expect.any(String)));
    expect(api.savePaymentVoucher).not.toHaveBeenCalled();
  });

  it('refuses to save without a row that has a head and an amount', async () => {
    render(<PaymentVoucherCreation />);
    await selectMember();
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('warning', 'Input Validation Error', 'No Valid Rows', expect.any(String)));
    expect(api.savePaymentVoucher).not.toHaveBeenCalled();
  });

  it('shows the running total of the rows', async () => {
    render(<PaymentVoucherCreation />);
    await selectMember();
    await fillRow('500');
    expect(await screen.findByText(/Total Amount 500.00/)).toBeInTheDocument();
  });

  it('saves the debit rows as a pending voucher and says what comes next', async () => {
    render(<PaymentVoucherCreation />);
    await selectMember();
    await fillRow('500');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.savePaymentVoucher).toHaveBeenCalledTimes(1));
    const payload = api.savePaymentVoucher.mock.calls[0][0];
    expect(payload).toMatchObject({ memberNo: 610031566, paymentType: 'payment', voucherNo: '' });
    expect(payload).not.toHaveProperty('payFromCode');
    expect(payload.rows).toEqual([{ code: 'A1045', name: 'ADVANCE TAX', amount: 500, rdSrNo: '' }]);
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('info', 'electron-react-ts', 'Payment Voucher Saved Successfully!', expect.stringContaining('Go to Pass Transactions')));
    expect(await screen.findByText('P26500')).toBeInTheDocument();
  });

  it('General Payment switches the member off and saves with member 0', async () => {
    render(<PaymentVoucherCreation />);
    fireEvent.click(screen.getByRole('tab', { name: 'General Payment' }));
    expect(screen.getByPlaceholderText('0')).toBeDisabled();
    await fillRow('20', 'A1023 - AGM ADVANCE');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.savePaymentVoucher).toHaveBeenCalled());
    expect(api.savePaymentVoucher.mock.calls[0][0]).toMatchObject({ memberNo: 0, paymentType: 'general' });
  });

  it('switching back to Payment gives the member field back', () => {
    render(<PaymentVoucherCreation />);
    fireEvent.click(screen.getByRole('tab', { name: 'General Payment' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Payment' }));
    expect(screen.getByPlaceholderText(/Member no/)).toBeEnabled();
  });

  it('shows the server message when the save is refused', async () => {
    api.savePaymentVoucher.mockResolvedValue({ success: false, message: 'The voucher date can not be in the future.' });
    render(<PaymentVoucherCreation />);
    await selectMember();
    await fillRow('10');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'Payment Voucher Error', 'Failed to Save Payment Voucher', 'The voucher date can not be in the future.'));
  });

  it('limits the narration to 100 characters', () => {
    render(<PaymentVoucherCreation />);
    expect(document.getElementById('pvc-narr')).toHaveAttribute('maxlength', '100');
  });
});
