// Voucher Payment: the cashier picks a payment voucher from the drop-down, looks at the member's signature (Sign),
// chooses cash or bank and saves it. A saved voucher is then passed in Pass Transactions.
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { Modal } from 'antd';

const { api, dialog } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    getBankList: vi.fn(),
    getHeadBalance: vi.fn(),
    fetchProtectedFile: vi.fn(),
  },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => undefined }));

import VoucherPayment from '../../../src/service/Transaction/Receipt&Payment/VoucherPayment/page/VoucherPayment';

const LIST = [
  { voucherNo: 'P26466', voucherDate: '2026-11-22', total: 500, memberNo: '610031566', memberName: 'A ANAND' },
  { voucherNo: 'P26467', voucherDate: '2026-11-22', total: 20, memberNo: null, memberName: '' },
];
const DETAIL = {
  voucherNo: 'P26466', voucherDate: '2026-11-22', total: 500, memberNo: '610031566', memberName: 'A ANAND', officeNo: 1,
  isGeneral: false, narration: 'Advance tax',
  rows: [{ code: 'A1045', name: 'ADVANCE TAX', amount: 500, rdSrNo: '' }],
};
const GENERAL = { ...DETAIL, voucherNo: 'P26467', total: 20, memberNo: '0', memberName: '', officeNo: '', isGeneral: true, rows: [{ code: 'A1023', name: 'AGM ADVANCE', amount: 20, rdSrNo: '' }] };

const pickVoucher = async (container: HTMLElement, label: RegExp) => {
  const input = container.querySelector('#vp-no') as HTMLElement;
  fireEvent.mouseDown(input);
  fireEvent.click((await screen.findAllByText(label)).pop()!);
};

describe('Voucher Payment window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialog.mockResolvedValue(undefined);
    api.get.mockImplementation(async (url: string) => {
      if (url === '/utilities/payment-vouchers/unsigned') return { success: true, data: LIST };
      if (url.endsWith('/P26466')) return { success: true, data: DETAIL };
      if (url.endsWith('/P26467')) return { success: true, data: GENERAL };
      return { success: true, data: [] };
    });
    api.post.mockResolvedValue({ success: true, data: { success: true, voucherNo: 'P26466' } });
    api.delete.mockResolvedValue({ success: true });
    api.getBankList.mockResolvedValue({ success: true, data: [{ code: 'A1008', name: 'STATE BANK' }] });
    api.getHeadBalance.mockResolvedValue({ success: true, data: { balance: 100000 } });
    api.fetchProtectedFile.mockResolvedValue(null);
    (URL as any).createObjectURL = vi.fn(() => 'blob:signature');
    (URL as any).revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists the vouchers waiting and starts with nothing selected', async () => {
    render(<VoucherPayment />);
    expect(screen.getByRole('heading', { name: 'Voucher Payment' })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/utilities/payment-vouchers/unsigned'));
    expect(await screen.findByText(/waiting/)).toBeInTheDocument();
    expect(screen.getByText('No voucher selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Sign/ })).toBeDisabled();
  });

  it('picking a voucher shows the member, the rows and the total', async () => {
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    expect(await screen.findByText('ADVANCE TAX')).toBeInTheDocument();
    expect(screen.getByText('610031566')).toBeInTheDocument();
    expect(screen.getAllByText('A ANAND').length).toBeGreaterThan(0);
    expect(screen.getByText(/Advance tax/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled();
  });

  it('a general voucher says it is not for a member', async () => {
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26467/);
    expect(await screen.findByText(/General payment: not for a member/)).toBeInTheDocument();
  });

  it('Sign only shows the member signature (and never saves)', async () => {
    api.fetchProtectedFile.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    await screen.findByText('ADVANCE TAX');
    fireEvent.click(screen.getByRole('button', { name: /Sign/ }));
    await waitFor(() => expect(api.fetchProtectedFile).toHaveBeenCalledWith('/members/master/610031566/signature'));
    expect(await screen.findByAltText('Member signature')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('Sign says so when the member has no signature on file', async () => {
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    await screen.findByText('ADVANCE TAX');
    fireEvent.click(screen.getByRole('button', { name: /Sign/ }));
    expect(await screen.findByText('No signature available for display')).toBeInTheDocument();
  });

  it('Save (cash) posts the voucher with mode C and confirms', async () => {
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    await screen.findByText('ADVANCE TAX');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/utilities/payment-voucher/save', {
      voucherNo: 'P26466', modeOfPay: 'C', bankCode: '', cheqNo: '', cheqDate: '', bankName: '',
    }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('info', 'electron-react-ts', 'Voucher Saved', expect.stringContaining('Go to Pass Transactions')));
    // the list is reloaded and the window is cleared for the next voucher
    expect(await screen.findByText('No voucher selected')).toBeInTheDocument();
  });

  it('bank mode asks for the bank account and the cheque number before saving', async () => {
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    await screen.findByText('ADVANCE TAX');
    fireEvent.click(screen.getByRole('tab', { name: 'BANK' }));
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('warning', 'Input Validation Error', 'Bank Account Required', expect.any(String)));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the server message when saving fails and keeps the voucher', async () => {
    api.post.mockResolvedValue({ success: false, message: 'Voucher P26466 is already saved in Voucher Payment.' });
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    await screen.findByText('ADVANCE TAX');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'Voucher Payment', 'Failed to save the voucher', 'Voucher P26466 is already saved in Voucher Payment.'));
  });

  it('Delete voucher asks first, then removes it', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(((cfg: any) => { void cfg.onOk?.(); return {} as any; }) as any);
    const { container } = render(<VoucherPayment />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await pickVoucher(container, /P26466/);
    await screen.findByText('ADVANCE TAX');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Delete voucher/ })); });
    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/transactions/voucher/P26466'));
  });
});
