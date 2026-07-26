// src/tests/unit/pages/ReceiptPaymentVoucher.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ReceiptPaymentVoucher from '../../../service/Reports/Monthly/PrintVouchers/ReceiptPaymentVoucher/page/ReceiptPaymentVoucher';
import useVoucher from '../../../service/Reports/Monthly/PrintVouchers/ReceiptPaymentVoucher/hooks/useVoucher';

// Mock the useVoucher hook
vi.mock('../../../../service/Reports/Monthly/PrintVouchers/ReceiptPaymentVoucher/hooks/useVoucher');

describe('ReceiptPaymentVoucher Component', () => {
  // Mock functions
  const mockSetDate = vi.fn();
  const mockSetVoucherNo = vi.fn();
  const mockSetVchrType = vi.fn();
  const mockSetMemberNo = vi.fn();
  const mockSetMode = vi.fn();
  const mockSetNarration = vi.fn();
  const mockSetChequeNo = vi.fn();
  const mockSetBank = vi.fn();
  const mockSetChequeDate = vi.fn();
  const mockAddEntry = vi.fn();
  const mockUpdateEntry = vi.fn();
  const mockRemoveEntry = vi.fn();
  const mockHandleSubmit = vi.fn();
  const mockPrintVoucher = vi.fn();
  const mockExportToPDF = vi.fn();
  const mockCalculateTotal = vi.fn();

  // Default state
  const defaultState = {
    date: '2025-09-09',
    voucherNo: 'PV-001',
    vchrType: 'Payment',
    memberNo: 'M001',
    mode: 'Cash',
    narration: 'Test Narration',
    chequeNo: '',
    bank: '',
    chequeDate: '',
    totalAmount: 1000,
    entries: [
      {
        id: '1',
        accountHead: 'Test Account',
        particulars: 'Test Particulars',
        amount: 1000,
      },
    ],
    error: '',
    isLoading: false,
  };

  // Mock implementation
  const mockUseVoucher = {
    ...defaultState,
    setDate: mockSetDate,
    setVoucherNo: mockSetVoucherNo,
    setVchrType: mockSetVchrType,
    setMemberNo: mockSetMemberNo,
    setMode: mockSetMode,
    setNarration: mockSetNarration,
    setChequeNo: mockSetChequeNo,
    setBank: mockSetBank,
    setChequeDate: mockSetChequeDate,
    addEntry: mockAddEntry,
    updateEntry: mockUpdateEntry,
    removeEntry: mockRemoveEntry,
    handleSubmit: mockHandleSubmit,
    printVoucher: mockPrintVoucher,
    exportToPDF: mockExportToPDF,
    calculateTotal: mockCalculateTotal,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useVoucher as jest.Mock).mockReturnValue(mockUseVoucher);
  });

  test('renders the component with title', () => {
    render(<ReceiptPaymentVoucher />);
    expect(screen.getByText('Receipt/Payment Voucher')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<ReceiptPaymentVoucher />);
    
    expect(screen.getByLabelText('Date')).toHaveValue('2025-09-09');
    expect(screen.getByLabelText('Voucher No.')).toHaveValue('PV-001');
    expect(screen.getByLabelText('Voucher Type')).toHaveValue('Payment');
    expect(screen.getByLabelText('Member No.')).toHaveValue('M001');
    expect(screen.getByLabelText('Mode')).toHaveValue('Cash');
    expect(screen.getByLabelText('Narration')).toHaveValue('Test Narration');
  });

  test('calls setDate when date is changed', () => {
    render(<ReceiptPaymentVoucher />);
    const dateInput = screen.getByLabelText('Date');
    fireEvent.change(dateInput, { target: { value: '2025-09-10' } });
    expect(mockSetDate).toHaveBeenCalledWith('2025-09-10');
  });

  test('calls setVchrType when voucher type is changed', () => {
    render(<ReceiptPaymentVoucher />);
    const vchrTypeSelect = screen.getByLabelText('Voucher Type');
    fireEvent.change(vchrTypeSelect, { target: { value: 'Receipt' } });
    expect(mockSetVchrType).toHaveBeenCalledWith('Receipt');
  });

  test('displays voucher entries', () => {
    render(<ReceiptPaymentVoucher />);
    const entryRows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(entryRows).toHaveLength(1);
  });

  test('calls addEntry when Add Row button is clicked', () => {
    render(<ReceiptPaymentVoucher />);
    const addButton = screen.getByRole('button', { name: /add row/i });
    fireEvent.click(addButton);
    expect(mockAddEntry).toHaveBeenCalledTimes(1);
  });

  test('calls removeEntry when delete button is clicked', () => {
    render(<ReceiptPaymentVoucher />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(mockRemoveEntry).toHaveBeenCalledWith('1');
  });

  test('displays total amount', () => {
    render(<ReceiptPaymentVoucher />);
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  test('calls handleSubmit when Save button is clicked', () => {
    render(<ReceiptPaymentVoucher />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  test('calls printVoucher when Print button is clicked', () => {
    render(<ReceiptPaymentVoucher />);
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(mockPrintVoucher).toHaveBeenCalledTimes(1);
  });

  test('calls exportToPDF when Export to PDF button is clicked', () => {
    render(<ReceiptPaymentVoucher />);
    const exportButton = screen.getByRole('button', { name: /export to pdf/i });
    fireEvent.click(exportButton);
    expect(mockExportToPDF).toHaveBeenCalledTimes(1);
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to save voucher';
    (useVoucher as jest.Mock).mockReturnValueOnce({
      ...mockUseVoucher,
      error: errorMessage,
    });
    
    render(<ReceiptPaymentVoucher />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('disables buttons when loading', () => {
    (useVoucher as jest.Mock).mockReturnValueOnce({
      ...mockUseVoucher,
      isLoading: true,
    });
    
    render(<ReceiptPaymentVoucher />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    const printButton = screen.getByRole('button', { name: /print/i });
    const exportButton = screen.getByRole('button', { name: /export to pdf/i });
    
    expect(saveButton).toBeDisabled();
    expect(printButton).toBeDisabled();
    expect(exportButton).toBeDisabled();
  });

  test('matches snapshot', () => {
    const { container } = render(<ReceiptPaymentVoucher />);
    expect(container).toMatchSnapshot();
  });
});

