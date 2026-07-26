// src/tests/unit/pages/FDInterestVoucherPosting.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import FDInterestVoucherPosting from '../../../service/Transaction/FixedDeposit/FDInterestVoucherPosting/page/FDInterestVoucherPosting';
import { useFDInterestVoucher } from '../../../service/Transaction/FixedDeposit/FDInterestVoucherPosting/hooks/useFDInterestVoucher';

// Define types for mock data
interface FDVoucher {
  voucherNo: string;
  transDate: string;
  fromDate: string;
  toDate: string;
}

interface FDDetail {
  id: string;
  fdNo: string;
  memberNo: string;
  memberName: string;
  amount: string;
  interestRate: string;
  interest: string;
  tds: string;
  netAmount: string;
}

interface FormData {
  fdOption: string;
  fdVoucher: FDVoucher;
  fdDetails: FDDetail[];
  totalAmount: string;
}

interface Errors {
  voucherNo: string;
  fromDate: string;
  toDate: string;
}

interface Actions {
  updateField: (field: string, value: string) => void;
  updateFdDetails: (details: FDDetail[]) => void;
  resetForm: () => void;
  handlePrint: () => void;
  setFdOption: (option: string) => void;
}

// Mock the useFDInterestVoucher hook
vi.mock('../../../service/Transaction/FixedDeposit/FDInterestVoucherPosting/hooks/useFDInterestVoucher', () => ({
  __esModule: true,
  useFDInterestVoucher: vi.fn()
}));

describe('FDInterestVoucherPosting Component', () => {
  // Mock data
  const defaultFormData: FormData = {
    fdOption: 'interest',
    fdVoucher: {
      voucherNo: 'V001',
      transDate: '2025-01-01',
      fromDate: '2024-12-01',
      toDate: '2024-12-31',
    },
    fdDetails: [
      {
        id: '1',
        fdNo: 'FD001',
        memberNo: 'M001',
        memberName: 'John Doe',
        amount: '10000',
        interestRate: '7.5',
        interest: '62.50',
        tds: '6.25',
        netAmount: '56.25',
      },
    ],
    totalAmount: '56.25',
  };

  const mockErrors: Errors = {
    voucherNo: '',
    fromDate: '',
    toDate: '',
  };

  const mockActions: Actions = {
    updateField: vi.fn(),
    updateFdDetails: vi.fn(),
    resetForm: vi.fn(),
    handlePrint: vi.fn(),
    setFdOption: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useFDInterestVoucher as Mock).mockReturnValue({
      formData: defaultFormData,
      errors: mockErrors,
      ...mockActions,
    });
  });

  test('renders the component with title', () => {
    render(<FDInterestVoucherPosting />);
    expect(screen.getByText('FD Voucher Creation...')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<FDInterestVoucherPosting />);
    
    // Check form fields
    expect(screen.getByDisplayValue('V001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('01/01/2025')).toBeInTheDocument();
  });

  test('displays FD details in the table', () => {
    render(<FDInterestVoucherPosting />);
    
    // Check if FD details are displayed
    expect(screen.getByText('FD001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('10,000.00')).toBeInTheDocument();
    expect(screen.getByText('7.50%')).toBeInTheDocument();
    expect(screen.getByText('62.50')).toBeInTheDocument();
  });

  test('handles FD option change', () => {
    render(<FDInterestVoucherPosting />);
    
    // Test FD option change
    const paymentOption = screen.getByLabelText('FD Payment');
    fireEvent.click(paymentOption);
    expect(mockActions.setFdOption).toHaveBeenCalledWith('payment');
  });

  test('calls resetForm when Reset button is clicked', () => {
    render(<FDInterestVoucherPosting />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    expect(mockActions.resetForm).toHaveBeenCalledTimes(1);
  });

  test('calls handlePrint when Print button is clicked', () => {
    render(<FDInterestVoucherPosting />);
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(mockActions.handlePrint).toHaveBeenCalledTimes(1);
  });

  test('shows validation errors', () => {
    // Mock with errors
    (useFDInterestVoucher as Mock).mockReturnValueOnce({
      formData: defaultFormData,
      errors: {
        voucherNo: 'Voucher number is required',
        fromDate: 'From date is required',
        toDate: 'To date is required',
      },
      ...mockActions,
    });

    render(<FDInterestVoucherPosting />);
    
    // Check if error messages are displayed
    expect(screen.getByText('Voucher number is required')).toBeInTheDocument();
    expect(screen.getByText('From date is required')).toBeInTheDocument();
    expect(screen.getByText('To date is required')).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<FDInterestVoucherPosting />);
    expect(container).toMatchSnapshot();
  });
});

