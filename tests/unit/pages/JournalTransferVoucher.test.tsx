// src/tests/unit/pages/JournalTransferVoucher.test.tsx
// @ts-nocheck
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import JournalTransferVoucher from '../../../service/Reports/Monthly/PrintVouchers/JournalTransferVoucher/page/JournalTransferVoucher';
import useVoucher from '../../../service/Reports/Monthly/PrintVouchers/JournalTransferVoucher/hooks/useVoucher';

// Define the VoucherEntry type since it's not exported from the module
type VoucherEntry = {
  id: string;
  accountHead: string;
  particulars: string;
  debit: number;
  credit: number;
};

// Mock the useVoucher hook
vi.mock('../../../../service/Reports/Monthly/PrintVouchers/JournalTransferVoucher/hooks/useVoucher', () => ({
  __esModule: true,
  default: vi.fn(),
}));

describe('JournalTransferVoucher Component', () => {
  const mockAddEntry = vi.fn();
  const mockRemoveEntry = vi.fn();
  const mockUpdateEntry = vi.fn();
  const mockHandleInputChange = vi.fn();
  const mockHandleSubmit = vi.fn();
  const mockHandlePrint = vi.fn();
  const mockResetForm = vi.fn();

  const mockEntries: VoucherEntry[] = [
    {
      id: '1',
      accountHead: 'Cash Account',
      particulars: 'Test Particulars',
      debit: 1000,
      credit: 0,
    },
    {
      id: '2',
      accountHead: 'Bank Account',
      particulars: 'Test Particulars',
      debit: 0,
      credit: 1000,
    },
  ];

  const defaultState = {
    date: '2025-09-09',
    voucherNo: 'JV-001',
    narration: 'Test Narration',
    isLoading: false,
  };

  const mockError = '';
  
  // Cast the mock to the correct type
  const mockUseVoucher = useVoucher as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseVoucher.mockReturnValue({
      state: defaultState,
      entries: mockEntries,
      error: mockError,
      addEntry: mockAddEntry,
      removeEntry: mockRemoveEntry,
      updateEntry: mockUpdateEntry,
      handleInputChange: mockHandleInputChange,
      handleSubmit: mockHandleSubmit,
      handlePrint: mockHandlePrint,
      resetForm: mockResetForm,
    });
  });

  test('renders the component with title', () => {
    render(<JournalTransferVoucher />);
    expect(screen.getByText('Search Transfer Voucher')).toBeInTheDocument();
  });

  test('displays date input with default value', () => {
    render(<JournalTransferVoucher />);
    const dateInput = screen.getByLabelText('Date');
    expect(dateInput).toHaveValue('2025-09-09');
  });

  test('displays voucher number input', () => {
    render(<JournalTransferVoucher />);
    const voucherNoInput = screen.getByLabelText('Voucher No.');
    expect(voucherNoInput).toHaveValue('JV-001');
  });

  test('displays narration input', () => {
    render(<JournalTransferVoucher />);
    const narrationInput = screen.getByLabelText('Narration');
    expect(narrationInput).toHaveValue('Test Narration');
  });

  test('displays voucher entries', async () => {
    // Arrange
    render(<JournalTransferVoucher />);
    
    // Act - Wait for entries to be displayed
    const entryRows = await screen.findAllByRole('row');
    
    // Assert - Check for header row + 2 entries
    expect(entryRows).toHaveLength(3); // Header + 2 entries
  });

  test('calls addEntry when Add Row button is clicked', () => {
    render(<JournalTransferVoucher />);
    const addButton = screen.getByRole('button', { name: /add row/i });
    fireEvent.click(addButton);
    expect(mockAddEntry).toHaveBeenCalledTimes(1);
  });

  test('calls removeEntry when delete button is clicked', async () => {
    // Arrange
    render(<JournalTransferVoucher />);
    
    // Act - Find and click the delete button for the first entry
    const deleteButtons = await screen.findAllByRole('button', { 
      name: /delete entry/i 
    });
    fireEvent.click(deleteButtons[0]);
    
    // Assert
    expect(mockRemoveEntry).toHaveBeenCalledWith('1');
  });

  test('calls updateEntry when an entry field is changed', () => {
    render(<JournalTransferVoucher />);
    
    // Find the account head input by its label
    const accountHeadInput = screen.getByRole('textbox', { 
      name: /account head/i 
    }) as HTMLInputElement;
    
    fireEvent.change(accountHeadInput, { target: { value: 'New Account' } });
    
    expect(mockUpdateEntry).toHaveBeenCalledWith('1', {
      accountHead: 'New Account',
      particulars: 'Test Particulars',
      debit: 1000,
      credit: 0,
    });
  });

  test('calls handleSubmit when Save button is clicked', () => {
    render(<JournalTransferVoucher />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  test('calls handlePrint when Print button is clicked', () => {
    render(<JournalTransferVoucher />);
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(mockHandlePrint).toHaveBeenCalledTimes(1);
  });

  test('calls resetForm when Reset button is clicked', () => {
    render(<JournalTransferVoucher />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    expect(mockResetForm).toHaveBeenCalledTimes(1);
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to save voucher';
    (useVoucher as jest.Mock).mockReturnValueOnce({
      ...useVoucher(),
      error: errorMessage,
    });
    
    render(<JournalTransferVoucher />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('disables buttons when loading', () => {
    mockUseVoucher.mockReturnValueOnce({
      ...mockUseVoucher(),
      state: { ...defaultState, isLoading: true },
    });
    
    render(<JournalTransferVoucher />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    const printButton = screen.getByRole('button', { name: /print/i });
    const resetButton = screen.getByRole('button', { name: /reset/i });
    
    expect(saveButton).toBeDisabled();
    expect(printButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  test('matches snapshot', () => {
    const { container } = render(<JournalTransferVoucher />);
    expect(container).toMatchSnapshot();
  });
});

