// src/tests/unit/pages/BankDetailLedger.test.tsx
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import BankDetailLedger from '../../../../service/Reports/Monthly/BankDetailLedger/page/BankDetailLedger';
import useBankDetailLedger from '../../../service/Reports/Monthly/BankDetailLedger/hooks/useBankDetailLedger';

// Mock the useBankDetailLedger hook
vi.mock('../../../../service/Reports/Monthly/BankDetailLedger/hooks/useBankDetailLedger');

describe('BankDetailLedger Component', () => {
  const mockUpdateDateRange = vi.fn();
  const mockUpdateBankAccount = vi.fn();
  const mockHandlePrint = vi.fn();
  const mockHandleScreenView = vi.fn();

  const mockBankAccount = {
    bankName: 'State Bank of India',
    accountNo: '1234567890',
    ifscCode: 'SBIN0001234',
    branch: 'Mumbai Main Branch'
  };

  const mockTransactions = [
    {
      id: '1',
      date: new Date('2025-09-01'),
      voucherNo: 'V001',
      description: 'Test Transaction',
      debit: 1000,
      credit: 0,
      balance: 1000,
      referenceNo: 'REF123',
      chequeNo: 'CHQ456'
    }
  ];

  const defaultState = {
    bankName: mockBankAccount.bankName,
    accountNo: mockBankAccount.accountNo,
    fromDate: new Date('2025-09-01'),
    toDate: new Date('2025-09-30'),
    isLoading: false,
    error: null,
    openingBalance: 0,
    closingBalance: 1000,
    transactions: mockTransactions
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useBankDetailLedger as jest.Mock).mockReturnValue({
      state: defaultState,
      accountInfo: mockBankAccount,
      updateDateRange: mockUpdateDateRange,
      updateBankAccount: mockUpdateBankAccount,
      handlePrint: mockHandlePrint,
      handleScreenView: mockHandleScreenView
    });
  });

  test('renders the component with title and account info', () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    expect(screen.getByText('Bank Detail Ledger')).toBeInTheDocument();
    expect(screen.getByText(mockBankAccount.bankName)).toBeInTheDocument();
    expect(screen.getByText(`A/C No: ${mockBankAccount.accountNo}`)).toBeInTheDocument();
  });

  test('displays date range picker with default values', () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    const fromDateInput = screen.getByPlaceholderText('Start date');
    const toDateInput = screen.getByPlaceholderText('End date');
    
    expect(fromDateInput).toHaveValue('01-Sep-2025');
    expect(toDateInput).toHaveValue('30-Sep-2025');
  });

  test('calls updateDateRange when date range is changed', async () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    const fromDateInput = screen.getByPlaceholderText('Start date');
    fireEvent.change(fromDateInput, { target: { value: '15-Sep-2025' } });
    
    await waitFor(() => {
      expect(mockUpdateDateRange).toHaveBeenCalledWith(
        expect.any(Object), // The date object
        defaultState.toDate
      );
    });
  });
 

  test('displays loading state when fetching data', () => {
    (useBankDetailLedger as jest.Mock).mockReturnValueOnce({
      ...useBankDetailLedger(),
      state: { ...defaultState, isLoading: true }
    });
    
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to fetch bank transactions';
    (useBankDetailLedger as jest.Mock).mockReturnValueOnce({
      ...useBankDetailLedger(),
      state: { ...defaultState, error: errorMessage }
    });
    
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays transactions when available', () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  test('calls handlePrint when Print button is clicked', () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    
    expect(mockHandlePrint).toHaveBeenCalledTimes(1);
  });

  test('calls handleScreenView when View button is clicked', () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    const viewButton = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewButton);
    
    expect(mockHandleScreenView).toHaveBeenCalledTimes(1);
  });

  test('displays account information correctly', () => {
    render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    
    expect(screen.getByText(mockBankAccount.bankName)).toBeInTheDocument();
    expect(screen.getByText(`A/C No: ${mockBankAccount.accountNo}`)).toBeInTheDocument();
    expect(screen.getByText(`IFSC: ${mockBankAccount.ifscCode}`)).toBeInTheDocument();
    expect(screen.getByText(`Branch: ${mockBankAccount.branch}`)).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<BankDetailLedger initialBankAccount={mockBankAccount} />);
    expect(container).toMatchSnapshot();
  });
});

