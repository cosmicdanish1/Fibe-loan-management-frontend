import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import BalanceTransfer from '../../../src/service/Administration/FinancialYear/BalanceTransfer/page/BalanceTransfer';
import { apiService } from '../../../src/services/api';

vi.mock('../../../src/services/api', () => ({
  apiService: {
    getHeadMasters: vi.fn(),
    manualBalanceTransfer: vi.fn(),
  },
}));

const HEADS = [
  { code: '1001', headName: 'General Reserve Fund' },
  { code: '2010', headName: 'Salaries & Establishment' },
];

describe('BalanceTransfer (redesigned)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getHeadMasters as any).mockResolvedValue({ success: true, data: HEADS });
    (apiService.manualBalanceTransfer as any).mockResolvedValue({ success: true });
  });

  it('renders title and loads GL heads', async () => {
    render(<BalanceTransfer />);
    expect(screen.getByText('Balance Transfer')).toBeInTheDocument();
    await waitFor(() => expect(apiService.getHeadMasters).toHaveBeenCalled());
  });

  it('Process transfer button starts disabled and enables once the form is valid', async () => {
    render(<BalanceTransfer />);
    await waitFor(() => expect(apiService.getHeadMasters).toHaveBeenCalled());

    const processBtn = screen.getByRole('button', { name: /process transfer/i });
    expect(processBtn).toBeDisabled();

    // Pick From account
    fireEvent.click(screen.getAllByText('Select source GL head')[0]);
    fireEvent.click(await screen.findByText('General Reserve Fund'));

    // Pick To account
    fireEvent.click(screen.getAllByText('Select destination GL head')[0]);
    fireEvent.click(await screen.findByText('Salaries & Establishment'));

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '500' } });
    fireEvent.change(screen.getByPlaceholderText(/Purpose of transfer/i), { target: { value: 'Test transfer' } });

    expect(processBtn).not.toBeDisabled();
  });

  it('blocks selecting the same GL head as both source and destination', async () => {
    render(<BalanceTransfer />);
    await waitFor(() => expect(apiService.getHeadMasters).toHaveBeenCalled());

    fireEvent.click(screen.getAllByText('Select source GL head')[0]);
    fireEvent.click(await screen.findByText('General Reserve Fund'));

    fireEvent.click(screen.getAllByText('Select destination GL head')[0]);
    fireEvent.click(await screen.findByText('General Reserve Fund'));

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '500' } });
    fireEvent.change(screen.getByPlaceholderText(/Purpose of transfer/i), { target: { value: 'Test transfer' } });

    expect(screen.getByRole('button', { name: /process transfer/i })).toBeDisabled();
  });

  it('full happy path: fill form -> confirm modal -> submit -> success screen', async () => {
    render(<BalanceTransfer />);
    await waitFor(() => expect(apiService.getHeadMasters).toHaveBeenCalled());

    fireEvent.click(screen.getAllByText('Select source GL head')[0]);
    fireEvent.click(await screen.findByText('General Reserve Fund'));
    fireEvent.click(screen.getAllByText('Select destination GL head')[0]);
    fireEvent.click(await screen.findByText('Salaries & Establishment'));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1250.50' } });
    fireEvent.change(screen.getByPlaceholderText(/Purpose of transfer/i), { target: { value: 'Q3 reallocation' } });

    fireEvent.click(screen.getByRole('button', { name: /process transfer/i }));

    // Confirm modal appears
    expect(await screen.findByText('Confirm transfer')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,250.50').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /process transfer/i })[1]);

    await waitFor(() => expect(apiService.manualBalanceTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ fromAccount: '1001', toAccount: '2010', amount: 1250.5, description: 'Q3 reallocation' })
    ));

    expect(await screen.findByText('Transfer complete')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows a general error banner and reopens the form when the API call fails', async () => {
    (apiService.manualBalanceTransfer as any).mockResolvedValue({ success: false, error: 'GL head is frozen' });
    render(<BalanceTransfer />);
    await waitFor(() => expect(apiService.getHeadMasters).toHaveBeenCalled());

    fireEvent.click(screen.getAllByText('Select source GL head')[0]);
    fireEvent.click(await screen.findByText('General Reserve Fund'));
    fireEvent.click(screen.getAllByText('Select destination GL head')[0]);
    fireEvent.click(await screen.findByText('Salaries & Establishment'));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText(/Purpose of transfer/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /process transfer/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /process transfer/i })[1]);

    expect(await screen.findByText('GL head is frozen')).toBeInTheDocument();
    // Confirm modal should have closed, returning to the main form
    expect(screen.queryByText('Confirm transfer')).not.toBeInTheDocument();
  });

  it('Reset clears the form back to empty', async () => {
    render(<BalanceTransfer />);
    await waitFor(() => expect(apiService.getHeadMasters).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/Purpose of transfer/i), { target: { value: 'scratch text' } });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByPlaceholderText(/Purpose of transfer/i)).toHaveValue('');
  });
});
