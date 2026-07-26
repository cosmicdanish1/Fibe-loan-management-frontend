// src/tests/unit/pages/CashBookMonthly.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import CashBookMonthly from '../../../service/Reports/Monthly/CashBookMonthly/page/CashBookMonthly';
import useCashBook from '../../../service/Reports/Monthly/CashBookMonthly/hooks/useCashBook';

// Mock the useCashBook hook
vi.mock('../../../../service/Reports/Monthly/CashBookMonthly/hooks/useCashBook');

describe('CashBookMonthly Component', () => {
  const mockUpdateMonth = vi.fn();
  const mockUpdateYear = vi.fn();
  const mockHandlePrint = vi.fn();
  const mockHandleExport = vi.fn();

  const mockEntries = [
    { code: '001', headName: 'Member Contributions', receipt: 15000, payment: 0 },
    { code: '002', headName: 'Loan Repayments', receipt: 25000, payment: 0 },
    { code: '003', headName: 'Interest Income', receipt: 5000, payment: 0 },
    { code: '004', headName: 'Salary Payments', receipt: 0, payment: 18000 },
    { code: '005', headName: 'Office Maintenance', receipt: 0, payment: 5000 },
    { code: '006', headName: 'Loan Disbursements', receipt: 0, payment: 30000 },
  ];

  const defaultState = {
    month: 'Aug',
    year: '2025',
    entries: mockEntries,
    isLoading: false,
    error: null,
  };

  const mockTotals = {
    totalReceipts: 45000,
    totalPayments: 53000,
    balance: -8000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useCashBook as jest.Mock).mockReturnValue({
      state: defaultState,
      totals: mockTotals,
      updateMonth: mockUpdateMonth,
      updateYear: mockUpdateYear,
      handlePrint: mockHandlePrint,
      handleExport: mockHandleExport,
    });
  });

  test('renders the component with title and period', () => {
    render(<CashBookMonthly />);
    
    expect(screen.getByText('Monthly Cash Book')).toBeInTheDocument();
    expect(screen.getByText('For the Month of Aug - 2025')).toBeInTheDocument();
  });

  test('displays month and year selectors with default values', () => {
    render(<CashBookMonthly />);
    
    const monthSelect = screen.getByDisplayValue('Aug');
    const yearSelect = screen.getByDisplayValue('2025');
    
    expect(monthSelect).toBeInTheDocument();
    expect(yearSelect).toBeInTheDocument();
  });

  test('calls updateMonth when month is changed', () => {
    render(<CashBookMonthly />);
    
    const monthSelect = screen.getByDisplayValue('Aug');
    fireEvent.change(monthSelect, { target: { value: 'Sep' } });
    
    expect(mockUpdateMonth).toHaveBeenCalledWith('Sep');
  });

  test('calls updateYear when year is changed', () => {
    render(<CashBookMonthly />);
    
    const yearSelect = screen.getByDisplayValue('2025');
    fireEvent.change(yearSelect, { target: { value: '2024' } });
    
    expect(mockUpdateYear).toHaveBeenCalledWith('2024');
  });

  test('displays loading state when fetching data', () => {
    (useCashBook as jest.Mock).mockReturnValueOnce({
      ...useCashBook(),
      state: { ...defaultState, isLoading: true }
    });
    
    render(<CashBookMonthly />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to fetch cash book data';
    (useCashBook as jest.Mock).mockReturnValueOnce({
      ...useCashBook(),
      state: { ...defaultState, error: errorMessage }
    });
    
    render(<CashBookMonthly />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays cash book entries correctly', () => {
    render(<CashBookMonthly />);
    
    // Check if all entries are displayed
    mockEntries.forEach(entry => {
      expect(screen.getByText(entry.headName)).toBeInTheDocument();
      if (entry.receipt > 0) {
        expect(screen.getByText(entry.receipt.toLocaleString())).toBeInTheDocument();
      }
      if (entry.payment > 0) {
        expect(screen.getByText(entry.payment.toLocaleString())).toBeInTheDocument();
      }
    });
  });

  test('displays totals correctly', () => {
    render(<CashBookMonthly />);
    
    expect(screen.getByText(mockTotals.totalReceipts.toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(mockTotals.totalPayments.toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(mockTotals.balance.toLocaleString())).toBeInTheDocument();
  });

  test('calls handlePrint when Print button is clicked', () => {
    render(<CashBookMonthly />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    
    expect(mockHandlePrint).toHaveBeenCalledTimes(1);
  });

  test('calls handleExport when Export button is clicked', () => {
    render(<CashBookMonthly />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    expect(mockHandleExport).toHaveBeenCalledTimes(1);
  });

  test('matches snapshot', () => {
    const { container } = render(<CashBookMonthly />);
    expect(container).toMatchSnapshot();
  });
});

