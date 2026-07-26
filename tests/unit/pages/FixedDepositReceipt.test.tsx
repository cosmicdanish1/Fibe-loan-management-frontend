// src/tests/unit/pages/FixedDepositReceipt.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import FixedDepositReceipt from '../../../service/Transaction/FixedDeposit/FixedDepositReceipt/page/FixedDepositReceipt';
import { useFixedDepositForm } from '../../../service/Transaction/FixedDeposit/FixedDepositReceipt/hooks/useFixedDepositForm';

// Define types for test data
interface FixedDepositFormData {
  memberNo: string;
  memberName: string;
  fdNo: string;
  fdDate: string;
  fdAmount: number;
  maturityDate: string;
  interestRate: number;
  maturityAmount: number;
  period: number;
  periodType: string;
  nomineeName: string;
  relation: string;
  address: string;
  contactNo: string;
  panNo: string;
}

interface FormErrors {
  memberNo: string;
  fdNo: string;
  fdAmount: string;
  interestRate: string;
  period: string;
}

// Mock the useFixedDepositForm hook
vi.mock('../../../service/Transaction/FixedDeposit/FixedDepositReceipt/hooks/useFixedDepositForm', () => ({
  __esModule: true,
  useFixedDepositForm: vi.fn()
}));

describe('FixedDepositReceipt Component', () => {
  // Mock data
  const defaultFormData: FixedDepositFormData = {
    memberNo: 'M001',
    memberName: 'John Doe',
    fdNo: 'FD001',
    fdDate: '2025-01-01',
    fdAmount: 100000,
    maturityDate: '2026-01-01',
    interestRate: 7.5,
    maturityAmount: 107500,
    period: 12,
    periodType: 'Months',
    nomineeName: 'Jane Doe',
    relation: 'Spouse',
    address: '123 Test St, Test City',
    contactNo: '9876543210',
    panNo: 'ABCDE1234F',
  };

  const mockErrors: FormErrors = {
    memberNo: '',
    fdNo: '',
    fdAmount: '',
    interestRate: '',
    period: '',
  };

  const mockActions = {
    updateField: vi.fn(),
    resetForm: vi.fn(),
    handlePrint: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useFixedDepositForm as Mock).mockReturnValue({
      formData: defaultFormData,
      errors: mockErrors,
      ...mockActions,
    });
  });

  test('renders the component with title', () => {
    render(<FixedDepositReceipt />);
    expect(screen.getByText('Fixed Deposit Certificate Printing')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<FixedDepositReceipt />);
    
    // Check form fields
    expect(screen.getByDisplayValue('M001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('FD001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7.5')).toBeInTheDocument();
  });

  test('calls updateField when form fields are changed', () => {
    render(<FixedDepositReceipt />);
    
    // Test member number change
    const memberNoInput = screen.getByDisplayValue('M001');
    fireEvent.change(memberNoInput, { target: { value: 'M002' } });
    expect(mockActions.updateField).toHaveBeenCalledWith('memberNo', 'M002');
    
    // Test FD amount change
    const amountInput = screen.getByDisplayValue('100000');
    fireEvent.change(amountInput, { target: { value: '150000' } });
    expect(mockActions.updateField).toHaveBeenCalledWith('fdAmount', 150000);
  });

  test('calls resetForm when Reset button is clicked', () => {
    render(<FixedDepositReceipt />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    expect(mockActions.resetForm).toHaveBeenCalledTimes(1);
  });

  test('calls handlePrint when Print button is clicked', () => {
    render(<FixedDepositReceipt />);
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(mockActions.handlePrint).toHaveBeenCalledTimes(1);
  });

  test('shows validation errors', () => {
    // Mock with errors
    (useFixedDepositForm as Mock).mockReturnValueOnce({
      formData: defaultFormData,
      errors: {
        memberNo: 'Member number is required',
        fdNo: 'FD number is required',
        fdAmount: 'Amount must be greater than 0',
        interestRate: 'Interest rate is required',
        period: 'Period must be greater than 0',
      } as FormErrors,
      ...mockActions,
    });

    render(<FixedDepositReceipt />);
    
    // Check if error messages are displayed
    expect(screen.getByText('Member number is required')).toBeInTheDocument();
    expect(screen.getByText('FD number is required')).toBeInTheDocument();
    expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Interest rate is required')).toBeInTheDocument();
    expect(screen.getByText('Period is required')).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<FixedDepositReceipt />);
    expect(container).toMatchSnapshot();
  });
});

