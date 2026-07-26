// src/tests/unit/pages/GeneralLedger.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import GeneralLedger from '../../../service/Reports/GeneralLedger/page/GeneralLedger';
import useGeneralLedger from '../../../service/Reports/GeneralLedger/hooks/useGeneralLedger';

// Mock the useGeneralLedger hook
vi.mock('../../../../service/Reports/GeneralLedger/hooks/useGeneralLedger');

describe('GeneralLedger Component', () => {
  const mockFetchLedgerData = vi.fn();
  const mockPrintLedger = vi.fn();
  const mockExportToExcel = vi.fn();
  const mockSetHeadName = vi.fn();
  const mockSetMemberNumber = vi.fn();
  const mockSetFromDate = vi.fn();
  const mockSetToDate = vi.fn();
  const mockSetOutputType = vi.fn();

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
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    (useGeneralLedger as jest.Mock).mockReturnValue({
      headName: '',
      memberNumber: '',
      fromDate: '2025-01-01',
      toDate: '2025-09-09',
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
    render(<GeneralLedger />);
    expect(screen.getByText('General Ledger Report')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<GeneralLedger />);
    
    expect(screen.getByLabelText('Head Name')).toHaveValue('');
    expect(screen.getByLabelText('Member Number')).toHaveValue('');
    expect(screen.getByLabelText('From Date')).toHaveValue('2025-01-01');
    expect(screen.getByLabelText('To Date')).toHaveValue('2025-09-09');
  });

  test('calls fetchLedgerData on form submission', async () => {
    render(<GeneralLedger />);
    
    const viewButton = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewButton);
    
    expect(mockFetchLedgerData).toHaveBeenCalledTimes(1);
  });

  test('displays loading state when fetching data', () => {
    (useGeneralLedger as jest.Mock).mockReturnValueOnce({
      ...useGeneralLedger(),
      isLoading: true
    });
    
    render(<GeneralLedger />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to fetch ledger data';
    (useGeneralLedger as jest.Mock).mockReturnValueOnce({
      ...useGeneralLedger(),
      error: errorMessage
    });
    
    render(<GeneralLedger />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays ledger data when available', () => {
    (useGeneralLedger as jest.Mock).mockReturnValueOnce({
      ...useGeneralLedger(),
      ledgerData: mockLedgerData
    });
    
    render(<GeneralLedger />);
    
    expect(screen.getByText('Test Entry')).toBeInTheDocument();
    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  test('displays "No data available" message when ledgerData is empty', () => {
    render(<GeneralLedger />);
    
    expect(screen.getByText('No data available. Click \'View\' to load ledger entries.')).toBeInTheDocument();
  });

  test('calls printLedger when Print button is clicked', () => {
    render(<GeneralLedger />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    
    expect(mockPrintLedger).toHaveBeenCalledTimes(1);
  });

  test('calls exportToExcel when Export to Excel button is clicked', () => {
    render(<GeneralLedger />);
    
    const exportButton = screen.getByRole('button', { name: /export to excel/i });
    fireEvent.click(exportButton);
    
    expect(mockExportToExcel).toHaveBeenCalledTimes(1);
  });

  test('updates output type when radio button is clicked', () => {
    render(<GeneralLedger />);
    
    const printerRadio = screen.getByRole('radio', { name: /printer/i });
    fireEvent.click(printerRadio);
    
    expect(mockSetOutputType).toHaveBeenCalledWith('printer');
  });

  test('matches snapshot', () => {
    const { container } = render(<GeneralLedger />);
    expect(container).toMatchSnapshot();
  });
});

