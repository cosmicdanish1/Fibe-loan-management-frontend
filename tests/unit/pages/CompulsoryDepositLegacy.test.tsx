// RD/CD Transaction Legacy: bulk charge. Each member's Compulsory Deposit is debited, the chosen head is credited.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, dialog } = vi.hoisted(() => ({
  api: { getCDMembers: vi.fn(), getCDChargeHeads: vi.fn(), postCDCharge: vi.fn() },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => undefined }));

import CompulsoryDepositLegacy from '../../../src/service/Transaction/CompulsoryDepositLegacy/page/CompulsoryDepositLegacy';

const MEMBERS = [
  { memberNo: 1001, memberName: 'ASHA', currentBalance: 500 },
  { memberNo: 1002, memberName: 'BALA', currentBalance: 20 },
];

// the first 0.00 box is the typed total; the member boxes follow in member order
const memberBox = (memberNo: number) => screen.getAllByPlaceholderText('0.00')[memberNo === 1001 ? 1 : 2]!;

const pickHead = async () => {
  fireEvent.mouseDown(await screen.findByText('Select GL Head...'));
  fireEvent.click((await screen.findAllByText('L1007 – BUILDING FUND')).pop()!);
};

describe('RD/CD Transaction Legacy window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialog.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.getCDMembers.mockResolvedValue({ success: true, data: MEMBERS });
    api.getCDChargeHeads.mockResolvedValue({ success: true, data: [{ code: 'L1007', name: 'BUILDING FUND' }] });
    api.postCDCharge.mockResolvedValue({ success: true, data: { voucherNo: 'J99001' } });
  });

  it('shows its own name, the charge wording and the legacy default narration', async () => {
    render(<CompulsoryDepositLegacy />);
    expect(screen.getByRole('heading', { name: 'RD/CD Transaction Legacy' })).toBeInTheDocument();
    expect(screen.getByText(/debits each member, credits the head/)).toBeInTheDocument();
    expect(screen.getByLabelText('Credit Head', { exact: false })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Transfer for CDS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Post Charges/ })).toBeInTheDocument();
    await waitFor(() => expect(api.getCDChargeHeads).toHaveBeenCalled());
    expect(await screen.findByText('ASHA')).toBeInTheDocument();
  });

  it('refuses to post without a head', async () => {
    render(<CompulsoryDepositLegacy />);
    await screen.findByText('ASHA');
    fireEvent.click(screen.getByRole('button', { name: /Post Charges/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'Credit Head Required', expect.any(String)));
    expect(api.postCDCharge).not.toHaveBeenCalled();
  });

  it('refuses to post without any amount', async () => {
    render(<CompulsoryDepositLegacy />);
    await screen.findByText('ASHA');
    await pickHead();
    fireEvent.click(screen.getByRole('button', { name: /Post Charges/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'No Amounts Entered', expect.any(String)));
    expect(api.postCDCharge).not.toHaveBeenCalled();
  });

  it('marks a charge above the member balance and refuses to post it', async () => {
    render(<CompulsoryDepositLegacy />);
    await screen.findByText('BALA');
    await pickHead();
    const box = memberBox(1002);
    fireEvent.change(box, { target: { value: '50' } });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Post Charges/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'Charge Exceeds Balance', expect.stringContaining('1002')));
    expect(api.postCDCharge).not.toHaveBeenCalled();
  });

  it('asks for confirmation and posts the charge to the charge endpoint', async () => {
    render(<CompulsoryDepositLegacy />);
    await screen.findByText('ASHA');
    await pickHead();
    fireEvent.change(memberBox(1001), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Post Charges/ }));
    await waitFor(() => expect(api.postCDCharge).toHaveBeenCalledTimes(1));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Post Charges'));
    expect(api.postCDCharge.mock.calls[0][0]).toMatchObject({
      incomeHeadCode: 'L1007', totalAmount: 100, narration: 'Transfer for CDS',
      distributions: [{ memberNo: 1001, postAmount: 100 }],
    });
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('info', 'electron-react-ts', 'Charges Posted Successfully!', expect.stringContaining('J99001')));
  });

  it('does not post when the confirmation is declined', async () => {
    (window.confirm as any).mockReturnValue(false);
    render(<CompulsoryDepositLegacy />);
    await screen.findByText('ASHA');
    await pickHead();
    fireEvent.change(memberBox(1001), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Post Charges/ }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(api.postCDCharge).not.toHaveBeenCalled();
  });

  it('shows the server message when the charge is refused', async () => {
    api.postCDCharge.mockResolvedValue({ success: false, message: 'The Compulsory Deposit of 1 member(s) is less than the charge' });
    render(<CompulsoryDepositLegacy />);
    await screen.findByText('ASHA');
    await pickHead();
    fireEvent.change(memberBox(1001), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Post Charges/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'CD Posting Failed', expect.stringContaining('less than the charge')));
  });
});
