// src/tests/unit/pages/DetailLedger.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DetailLedger from '../../../service/Reports/Monthly/DetailLedger/page/DetailLedger';
import useDetailLedger from '../../../service/Reports/Monthly/DetailLedger/hooks/useLedger';

// Mock the useDetailLedger hook
vi.mock('../../../../service/Reports/Monthly/DetailLedger/hooks/useLedger');

describe('DetailLedger Component', () => {
  const mockUpdateDateRange = vi.fn();
  const mockUpdateHeadName = vi.fn();
  const mockHandlePrint = vi.fn();
  const mockHandleScreenView = vi.fn();

  const mockEntries = [
    {
      id: '1',
      date: new Date('2025-09-01'),
      voucherNo: 'V001',
      description: 'Test Transaction',
      debit: 1000,
      credit: 0,
      balance: 1000,
      isOpening: false
    }
  ];

  const defaultState = {
    headName: 'Test Account',
    fromDate: new Date('2025-09-01'),
    toDate: new Date('2025-09-30'),
    isLoading: false,
    error: null,
    openingBalance: 0,
    closingBalance: 1000,
    entries: mockEntries
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useDetailLedger as jest.Mock).mockReturnValue({
      state: defaultState,
      updateDateRange: mockUpdateDateRange,
      updateHeadName: mockUpdateHeadName,
      handlePrint: mockHandlePrint,
      handleScreenView: mockHandleScreenView
    });
  });

  test('renders the component with title', () => {
    render(<DetailLedger initialHeadName="Test Account" />);
    expect(screen.getByText('Detail Ledger')).toBeInTheDocument();
  });

  test('displays head name input with initial value', () => {
    render(<DetailLedger initialHeadName="Test Account" />);
    const headNameInput = screen.getByPlaceholderText('Enter head name');
    expect(headNameInput).toHaveValue('Test Account');
  });

  test('calls updateHeadName when head name is changed', () => {
    render(<DetailLedger />);
    const headNameInput = screen.getByPlaceholderText('Enter head name');
    fireEvent.change(headNameInput, { target: { value: 'New Account' } });
    expect(mockUpdateHeadName).toHaveBeenCalledWith('New Account');
  });

  test('displays date range pickers with default values', () => {
    render(<DetailLedger />);
    const fromDateInput = screen.getByLabelText('From Date');
    const toDateInput = screen.getByLabelText('To Date');
    
    expect(fromDateInput).toHaveValue('01-Sep-2025');
    expect(toDateInput).toHaveValue('30-Sep-2025');
  });

  test('calls updateDateRange when date is changed', () => {
    render(<DetailLedger />);
    const fromDateInput = screen.getByLabelText('From Date');
    fireEvent.change(fromDateInput, { target: { value: '15-Sep-2025' } });
    
    expect(mockUpdateDateRange).toHaveBeenCalledWith({
      fromDate: expect.any(Date),
      toDate: defaultState.toDate
    });
  });

  test('displays loading state when fetching data', () => {
    (useDetailLedger as jest.Mock).mockReturnValueOnce({
      ...useDetailLedger(),
      state: { ...defaultState, isLoading: true }
    });
    
    render(<DetailLedger />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to fetch ledger data';
    (useDetailLedger as jest.Mock).mockReturnValueOnce({
      ...useDetailLedger(),
      state: { ...defaultState, error: errorMessage }
    });
    
    render(<DetailLedger />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays ledger entries when available', () => {
    render(<DetailLedger />);
    
    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  test('displays opening and closing balances', () => {
    render(<DetailLedger />);
    
    expect(screen.getByText('Opening Balance:')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByText('Closing Balance:')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  test('calls handlePrint when Print button is clicked', () => {
    render(<DetailLedger />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    
    expect(mockHandlePrint).toHaveBeenCalledTimes(1);
  });

  test('calls handleScreenView when View button is clicked', () => {
    render(<DetailLedger />);
    
    const viewButton = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewButton);
    
    expect(mockHandleScreenView).toHaveBeenCalledTimes(1);
  });

  test('matches snapshot', () => {
    const { container } = render(<DetailLedger />);
    expect(container).toMatchSnapshot();
  });
});

