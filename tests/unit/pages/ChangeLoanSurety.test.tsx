import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ChangeLoanSuretyForm from '../../../service/Administration/loan/Change Loan Surety/pages/ChangeLoanSurety';
import { useChangeLoanSuretyForm } from '../../../service/Administration/loan/Change Loan Surety/hooks/useChangeLoanSuretyForm';

// Mock the hook
vi.mock('../../../../service/Administration/loan/Change Loan Surety/hooks/useChangeLoanSuretyForm');

// Mock the FormField and SelectField components
vi.mock('../../../../service/Administration/loan/Change Loan Surety/compoenets/FormField', () => ({
  __esModule: true,
  default: ({ 
    label, 
    name, 
    value, 
    onChange, 
    type = 'text', 
    error, 
    hasLookup,
    onLookup 
  }: any) => (
    <div>
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        data-testid={`${name}-input`}
      />
      {hasLookup && (
        <button onClick={onLookup} data-testid={`${name}-lookup`}>
          Lookup
        </button>
      )}
      {error && <span className="error">{error}</span>}
    </div>
  ),
}));

vi.mock('../../../../service/Administration/loan/Change Loan Surety/compoenets/SelectField', () => ({
  __esModule: true,
  default: ({ 
    label, 
    name, 
    value, 
    onChange, 
    options, 
    error 
  }: any) => (
    <div>
      <label>{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        data-testid={`${name}-select`}
      >
        <option value="">Select an option</option>
        {options.map((option: any) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <span className="error">{error}</span>}
    </div>
  ),
}));

describe('ChangeLoanSuretyForm', () => {
  const mockFormData = {
    loanType: '',
    memberNumber: '',
    office: '',
    loanCaseNo: '',
    sanctionDate: '',
    sanctionAmount: '',
    surety1: '',
    surety2: '',
  };

  const mockErrors = {};
  const mockHandleInputChange = vi.fn();
  const mockHandleSubmit = vi.fn();
  const mockResetForm = vi.fn();
  const mockHandleLookup = vi.fn();

  const mockUseChangeLoanSuretyForm = {
    formData: mockFormData,
    errors: mockErrors,
    handleInputChange: mockHandleInputChange,
    handleSubmit: mockHandleSubmit,
    resetForm: mockResetForm,
    handleLookup: mockHandleLookup,
  };

  const mockLoanTypes = [
    { id: '1', name: 'Personal Loan' },
    { id: '2', name: 'Home Loan' },
    { id: '3', name: 'Car Loan' },
  ];

  // Mock the loan types constant
  vi.mock('../../../../service/Administration/loan/Change Loan Surety/constants/loanTypes', () => ({
    loanTypes: [
      { id: '1', name: 'Personal Loan' },
      { id: '2', name: 'Home Loan' },
      { id: '3', name: 'Car Loan' },
    ],
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useChangeLoanSuretyForm).mockReturnValue(mockUseChangeLoanSuretyForm);
  });

  test('renders the form with all sections', () => {
    render(<ChangeLoanSuretyForm />);
    
    // Check main heading
    expect(screen.getByText('CHANGE LOAN SURETY')).toBeInTheDocument();
    
    // Check section headings
    expect(screen.getByText('Loan Information')).toBeInTheDocument();
    expect(screen.getByText('Loan Details')).toBeInTheDocument();
    expect(screen.getByText('Surety Information')).toBeInTheDocument();
    
    // Check form fields
    expect(screen.getByLabelText('Loan Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Member No.')).toBeInTheDocument();
    expect(screen.getByLabelText('Office')).toBeInTheDocument();
    expect(screen.getByLabelText('Loan Case No')).toBeInTheDocument();
    expect(screen.getByLabelText('Sanction Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Sanction Amt')).toBeInTheDocument();
    expect(screen.getByLabelText('Surety 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Surety 2')).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  test('calls handleInputChange when input values change', () => {
    render(<ChangeLoanSuretyForm />);
    
    // Test text input
    const memberNumberInput = screen.getByTestId('memberNumber-input');
    fireEvent.change(memberNumberInput, { target: { value: 'M12345' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('memberNumber', 'M12345');
    
    // Test date input
    const sanctionDateInput = screen.getByTestId('sanctionDate-input');
    fireEvent.change(sanctionDateInput, { target: { value: '2025-01-01' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('sanctionDate', '2025-01-01');
    
    // Test number input
    const sanctionAmountInput = screen.getByTestId('sanctionAmount-input');
    fireEvent.change(sanctionAmountInput, { target: { value: '50000' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('sanctionAmount', '50000');
  });

  test('calls handleLookup when lookup button is clicked', () => {
    render(<ChangeLoanSuretyForm />);
    
    // Test member number lookup
    const memberLookupBtn = screen.getByTestId('memberNumber-lookup');
    fireEvent.click(memberLookupBtn);
    expect(mockHandleLookup).toHaveBeenCalledWith('memberNumber');
    
    // Test office lookup
    const officeLookupBtn = screen.getByTestId('office-lookup');
    fireEvent.click(officeLookupBtn);
    expect(mockHandleLookup).toHaveBeenCalledWith('office');
  });

  test('calls handleSubmit when Save button is clicked', () => {
    render(<ChangeLoanSuretyForm />);
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  test('calls resetForm when Reset button is clicked', () => {
    render(<ChangeLoanSuretyForm />);
    
    const resetButton = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);
    
    expect(mockResetForm).toHaveBeenCalled();
  });

  test('displays error messages when validation fails', () => {
    const mockErrors = {
      loanType: 'Loan type is required',
      memberNumber: 'Member number is required',
      loanCaseNo: 'Loan case number is required',
    };
    
    vi.mocked(useChangeLoanSuretyForm).mockReturnValue({
      ...mockUseChangeLoanSuretyForm,
      errors: mockErrors,
    });
    
    render(<ChangeLoanSuretyForm />);
    
    expect(screen.getByText('Loan type is required')).toBeInTheDocument();
    expect(screen.getByText('Member number is required')).toBeInTheDocument();
    expect(screen.getByText('Loan case number is required')).toBeInTheDocument();
  });

  test('renders loan type options correctly', () => {
    render(<ChangeLoanSuretyForm />);
    
    const loanTypeSelect = screen.getByTestId('loanType-select');
    const options = Array.from(loanTypeSelect.querySelectorAll('option')).map(opt => ({
      value: opt.value,
      text: opt.textContent,
    }));
    
    expect(options).toEqual([
      { value: '', text: 'Select an option' },
      { value: '1', text: 'Personal Loan' },
      { value: '2', text: 'Home Loan' },
      { value: '3', text: 'Car Loan' },
    ]);
  });
});

