// src/tests/unit/pages/MemberLedgerReport.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MemberDetailLedger from '../../../service/Reports/MemberLedgerReport/page/page/MemberLedgerReport';
import useLedgerReport from '../../../service/Reports/MemberLedgerReport/page/hooks/useLedgerReport';

// Mock the useLedgerReport hook
vi.mock('../../../../service/Reports/MemberLedgerReport/page/hooks/useLedgerReport');

describe('MemberDetailLedger Component', () => {
  const mockFetchLedgerData = vi.fn();
  const mockPrintLedger = vi.fn();
  const mockExportToExcel = vi.fn();
  const mockSetHeadName = vi.fn();
  const mockSetMemberNumber = vi.fn();
  const mockSetFromDate = vi.fn();
  const mockSetToDate = vi.fn();
  const mockSetOutputType = vi.fn();

  const today = new Date().toISOString().split('T')[0];
  const mockLedgerData = [
    {
      id: '1',
      date: '2025-09-01',
      particulars: 'Test Entry',
      voucherNo: 'V001',
      debit: 1000,
      credit: 0,
      balance: 1000
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useLedgerReport as jest.Mock).mockReturnValue({
      headName: '',
      memberNumber: '',
      fromDate: today,
      toDate: today,
      outputType: 'screen',
      error: null,
      isLoading: false,
      ledgerData: [],
      setHeadName: mockSetHeadName,
      setMemberNumber: mockSetMemberNumber,
      setFromDate: mockSetFromDate,
      setToDate: mockSetToDate,
      setOutputType: mockSetOutputType,
      fetchLedgerData: mockFetchLedgerData,
      printLedger: mockPrintLedger,
      exportToExcel: mockExportToExcel
    });
  });

  test('renders the component with title', () => {
    render(<MemberDetailLedger />);
    expect(screen.getByText('Member Detail Ledger')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<MemberDetailLedger />);
    
    expect(screen.getByPlaceholderText('Enter head name')).toHaveValue('');
    expect(screen.getByPlaceholderText('Enter member number')).toHaveValue('');
    expect(screen.getByLabelText('From Date')).toHaveValue(today);
    expect(screen.getByLabelText('To Date')).toHaveValue(today);
  });

  test('calls fetchLedgerData on form submission', () => {
    render(<MemberDetailLedger />);
    
    const showButton = screen.getByRole('button', { name: /show/i });
    fireEvent.click(showButton);
    
    expect(mockFetchLedgerData).toHaveBeenCalledTimes(1);
  });

  test('displays loading state when fetching data', () => {
    (useLedgerReport as jest.Mock).mockReturnValueOnce({
      ...useLedgerReport(),
      isLoading: true
    });
    
    render(<MemberDetailLedger />);
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to fetch ledger data';
    (useLedgerReport as jest.Mock).mockReturnValueOnce({
      ...useLedgerReport(),
      error: errorMessage
    });
    
    render(<MemberDetailLedger />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays ledger data when available', () => {
    (useLedgerReport as jest.Mock).mockReturnValueOnce({
      ...useLedgerReport(),
      ledgerData: mockLedgerData
    });
    
    render(<MemberDetailLedger />);
    
    expect(screen.getByText('Test Entry')).toBeInTheDocument();
    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  test('calls printLedger when Print button is clicked', () => {
    render(<MemberDetailLedger />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    
    expect(mockPrintLedger).toHaveBeenCalledTimes(1);
  });

  test('calls exportToExcel when Export to Excel button is clicked', () => {
    render(<MemberDetailLedger />);
    
    const exportButton = screen.getByRole('button', { name: /export to excel/i });
    fireEvent.click(exportButton);
    
    expect(mockExportToExcel).toHaveBeenCalledTimes(1);
  });

  test('updates output type when radio button is clicked', () => {
    render(<MemberDetailLedger />);
    
    const printerRadio = screen.getByRole('radio', { name: /printer/i });
    fireEvent.click(printerRadio);
    
    expect(mockSetOutputType).toHaveBeenCalledWith('printer');
  });

  test('matches snapshot', () => {
    const { container } = render(<MemberDetailLedger />);
    expect(container).toMatchSnapshot();
  });
});

