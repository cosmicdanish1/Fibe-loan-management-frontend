// src/tests/unit/pages/NewLoanDisbursed.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import NewLoanDisbursed, { accountTypes } from '../../../service/Reports/Monthly/NewLoanDisbursed/page/NewLoanDisbursed';
import useLoanForm from '../../../service/Reports/Monthly/NewLoanDisbursed/hooks/useLoanForm';

// Mock the useLoanForm hook
vi.mock('../../../../service/Reports/Monthly/NewLoanDisbursed/hooks/useLoanForm');

describe('NewLoanDisbursed Component', () => {
  const mockUpdateFormData = vi.fn();
  const mockGenerateReport = vi.fn();
  const mockResetForm = vi.fn();

  const defaultFormData = {
    accountType: accountTypes[0], // EMERGENCY LOAN
    fromDate: '2025-09-01',
    toDate: '2025-09-30',
    outputType: 'screen' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useLoanForm as jest.Mock).mockReturnValue({
      formData: defaultFormData,
      updateFormData: mockUpdateFormData,
      generateReport: mockGenerateReport,
      resetForm: mockResetForm,
    });
  });

  test('renders the component with title', () => {
    render(<NewLoanDisbursed />);
    expect(screen.getByText('New Loan Disbursed')).toBeInTheDocument();
  });

  test('displays account type dropdown with default value', () => {
    render(<NewLoanDisbursed />);
    const defaultAccountType = accountTypes[0];
    // Use type assertion to ensure TypeScript knows this is a string
    const accountTypeSelect = screen.getByDisplayValue(defaultAccountType as string);
    expect(accountTypeSelect).toBeInTheDocument();
  });

  test('displays all account type options', () => {
    render(<NewLoanDisbursed />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(accountTypes.length + 1); // +1 for the default selected option
  });

  test('calls updateFormData when account type is changed', () => {
    render(<NewLoanDisbursed />);
    const accountTypeSelect = screen.getByRole('combobox', { name: /a\/c type/i });
    fireEvent.change(accountTypeSelect, { target: { value: accountTypes[1] } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('accountType', accountTypes[1]);
  });

  test('displays date inputs with default values', () => {
    render(<NewLoanDisbursed />);
    const fromDateInput = screen.getByLabelText(/from date/i);
    const toDateInput = screen.getByLabelText(/to date/i);
    
    expect(fromDateInput).toHaveValue('2025-09-01');
    expect(toDateInput).toHaveValue('2025-09-30');
  });

  test('calls updateFormData when dates are changed', () => {
    render(<NewLoanDisbursed />);
    const fromDateInput = screen.getByLabelText(/from date/i);
    fireEvent.change(fromDateInput, { target: { value: '2025-09-15' } });
    
    expect(mockUpdateFormData).toHaveBeenCalledWith('fromDate', '2025-09-15');
  });

  test('displays output type radio buttons', () => {
    render(<NewLoanDisbursed />);
    expect(screen.getByLabelText(/screen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/printer/i)).toBeInTheDocument();
  });

  test('calls updateFormData when output type is changed', () => {
    render(<NewLoanDisbursed />);
    const printerRadio = screen.getByLabelText(/printer/i);
    fireEvent.click(printerRadio);
    
    expect(mockUpdateFormData).toHaveBeenCalledWith('outputType', 'printer');
  });

  test('calls generateReport when Show button is clicked', () => {
    render(<NewLoanDisbursed />);
    const showButton = screen.getByRole('button', { name: /show/i });
    fireEvent.click(showButton);
    
    expect(mockGenerateReport).toHaveBeenCalledTimes(1);
  });

  test('calls resetForm when Reset button is clicked', () => {
    render(<NewLoanDisbursed />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    expect(mockResetForm).toHaveBeenCalledTimes(1);
  });

  test('disables Show button when form is submitting', () => {
    (useLoanForm as jest.Mock).mockReturnValueOnce({
      formData: defaultFormData,
      updateFormData: mockUpdateFormData,
      generateReport: mockGenerateReport,
      resetForm: mockResetForm,
      isSubmitting: true,
    });

    render(<NewLoanDisbursed />);
    const showButton = screen.getByRole('button', { name: /show/i });
    expect(showButton).toBeDisabled();
  });

  test('disables Reset button when form is submitting', () => {
    (useLoanForm as jest.Mock).mockReturnValueOnce({
      formData: defaultFormData,
      updateFormData: mockUpdateFormData,
      generateReport: mockGenerateReport,
      resetForm: mockResetForm,
      isSubmitting: true,
    });

    render(<NewLoanDisbursed />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    expect(resetButton).toBeDisabled();
  });

  test('matches snapshot', () => {
    const { container } = render(<NewLoanDisbursed />);
    expect(container).toMatchSnapshot();
  });
});

