// src/tests/unit/pages/CompulsoryDepositTransaction.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import CompulsoryDepositTransaction from '../../../service/Transaction/CompulsoryDepositTransaction/page/CompulsoryDepositTransaction';
import useCompulsoryDeposit from '../../../service/Transaction/CompulsoryDepositTransaction/hooks/useCompulsoryDeposit';

// Mock the useCompulsoryDeposit hook
vi.mock('../../../../service/Transaction/CompulsoryDepositTransaction/hooks/useCompulsoryDeposit');

describe('CompulsoryDepositTransaction Component', () => {
  // Mock data
  const mockIncomeHeads = [
    { id: '1', name: 'Savings Account', code: 'SAV001' },
    { id: '2', name: 'Fixed Deposit', code: 'FD001' },
  ];

  const defaultState = {
    amount: '1000',
    selectedIncomeHead: mockIncomeHeads[0],
    memberNo: 'M001',
    memberName: 'John Doe',
    isLoading: false,
    error: null,
  };

  const mockActions = {
    setAmount: vi.fn(),
    setSelectedIncomeHead: vi.fn(),
    setMemberNo: vi.fn(),
    handleSubmit: vi.fn(),
    handleReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useCompulsoryDeposit as jest.Mock).mockReturnValue({
      state: defaultState,
      actions: mockActions,
      incomeHeads: mockIncomeHeads,
    });
  });

  test('renders the component with title', () => {
    render(<CompulsoryDepositTransaction />);
    expect(screen.getByText('Compulsory Deposit Transaction')).toBeInTheDocument();
  });

  test('displays amount input with default value', () => {
    render(<CompulsoryDepositTransaction />);
    const amountInput = screen.getByLabelText('Amount');
    expect(amountInput).toHaveValue('1000');
  });

  test('validates amount input to accept only numbers and decimal point', () => {
    render(<CompulsoryDepositTransaction />);
    const amountInput = screen.getByLabelText('Amount');
    
    // Test valid input
    fireEvent.change(amountInput, { target: { value: '1500.50' } });
    expect(mockActions.setAmount).toHaveBeenCalledWith('1500.50');
    
    // Test invalid input (should not call setAmount)
    fireEvent.change(amountInput, { target: { value: 'abc' } });
    expect(mockActions.setAmount).toHaveBeenCalledTimes(1); // Still only called once
  });

  test('displays member information', () => {
    render(<CompulsoryDepositTransaction />);
    expect(screen.getByDisplayValue('M001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });

  test('displays income head dropdown with options', () => {
    render(<CompulsoryDepositTransaction />);
    const dropdownButton = screen.getByRole('button', { name: /select income head/i });
    expect(dropdownButton).toHaveTextContent('Savings Account');
  });

  test('calls handleSubmit when Save button is clicked', () => {
    render(<CompulsoryDepositTransaction />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(mockActions.handleSubmit).toHaveBeenCalledTimes(1);
  });

  test('calls handleReset when Reset button is clicked', () => {
    render(<CompulsoryDepositTransaction />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    expect(mockActions.handleReset).toHaveBeenCalledTimes(1);
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to process transaction';
    (useCompulsoryDeposit as jest.Mock).mockReturnValueOnce({
      state: { ...defaultState, error: errorMessage },
      actions: mockActions,
      incomeHeads: mockIncomeHeads,
    });
    
    render(<CompulsoryDepositTransaction />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('disables buttons when loading', () => {
    (useCompulsoryDeposit as jest.Mock).mockReturnValueOnce({
      state: { ...defaultState, isLoading: true },
      actions: mockActions,
      incomeHeads: mockIncomeHeads,
    });
    
    render(<CompulsoryDepositTransaction />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    const resetButton = screen.getByRole('button', { name: /reset/i });
    
    expect(saveButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  test('matches snapshot', () => {
    const { container } = render(<CompulsoryDepositTransaction />);
    expect(container).toMatchSnapshot();
  });
});

