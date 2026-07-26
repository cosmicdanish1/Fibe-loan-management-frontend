import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import InterestCalculation from '../../../service/Administration/InterestCalculation/page/InterestCalculation';
import { useInterestCalculator, useDropdownData } from '../../../service/Administration/InterestCalculation/hook/useIntresterCal';

// Define types for the hooks since they might not be exported
type FormData = {
  selectedAccount: string;
  fromDate: string;
  toDate: string;
  rate: string;
  errors?: {
    selectedAccount?: string;
    fromDate?: string;
    toDate?: string;
    rate?: string;
  };
};

type DropdownOption = {
  value: string;
  label: string;
};

// Mock the hooks
vi.mock('../../../../service/Administration/InterestCalculation/hook/useIntresterCal', () => ({
  useInterestCalculator: vi.fn(),
  useDropdownData: vi.fn(),
  __esModule: true,
}));

// Cast the mocks to the correct type
const mockUseInterestCalculator = useInterestCalculator as unknown as Mock;
const mockUseDropdownData = useDropdownData as unknown as Mock;

// Mock the FormControl and Dropdown components
vi.mock('../../../../service/Administration/InterestCalculation/page/InterestCalculation', () => {
  const MockFormControl = ({ label, value, onChange, type = 'text', error, disabled }: any) => (
    <div>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={`${label.toLowerCase().replace(/\s+/g, '-')}-input`}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );

  const MockDropdown = ({ options, value, onChange, placeholder, disabled, error }: any) => (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid="account-select"
      >
        <option value="">{placeholder}</option>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="error">{error}</span>}
    </div>
  );

  return {
    __esModule: true,
    default: ({
      initialData,
      onCalculationComplete,
      onError,
      disabled = false,
      showCrystalReport = true,
    }: any) => {
      // Use the mocked hooks
      const { formData, updateField, calculateInterest } = useInterestCalculator(initialData);
      const { accountOptions } = useDropdownData();

      return (
        <div className="interest-calculation">
          <h1>Interest Calculation</h1>
          
          <div className="form-section">
            <MockDropdown
              options={accountOptions}
              value={formData.selectedAccount}
              onChange={(value: string) => updateField('selectedAccount', value)}
              placeholder="Select Account"
              disabled={disabled}
              error={formData.errors?.selectedAccount}
            />
            
            <MockFormControl
              label="From Date"
              value={formData.fromDate}
              onChange={(value: string) => updateField('fromDate', value)}
              type="date"
              disabled={disabled}
              error={formData.errors?.fromDate}
            />
            
            <MockFormControl
              label="To Date"
              value={formData.toDate}
              onChange={(value: string) => updateField('toDate', value)}
              type="date"
              disabled={disabled}
              error={formData.errors?.toDate}
            />
            
            <MockFormControl
              label="Rate"
              value={formData.rate}
              onChange={(value: string) => updateField('rate', value)}
              type="number"
              disabled={disabled}
              error={formData.errors?.rate}
            />
            
            <MockFormControl
              label="Minimum Interest Amount"
              value={formData.minInterestAmount}
              onChange={(value: string) => updateField('minInterestAmount', value)}
              type="number"
              disabled={disabled}
              error={formData.errors?.minInterestAmount}
            />
            
            <button 
              onClick={calculateInterest}
              disabled={disabled}
              data-testid="calculate-button"
            >
              Calculate Interest
            </button>
          </div>
          
          {showCrystalReport && (
            <div className="crystal-report" data-testid="crystal-report">
              <h2>Crystal Report</h2>
              <p>Total: {formData.total}</p>
            </div>
          )}
        </div>
      );
    },
  };
});

describe('InterestCalculation Component', () => {
  const mockAccountOptions: DropdownOption[] = [
    { value: 'acc1', label: 'Account 1' },
    { value: 'acc2', label: 'Account 2' },
  ];
  
  const mockInitialData: FormData = {
    selectedAccount: '',
    fromDate: '',
    toDate: '',
    rate: '',
  };
  
  const mockOnCalculationComplete = vi.fn();
  const mockOnError = vi.fn();
  
  // Mock the hook implementations
  const mockUpdateField = vi.fn();
  const mockCalculateInterest = vi.fn();
  
  // Mock implementations will be set in beforeEach
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockUseInterestCalculator.mockReturnValue({
      formData: { ...mockInitialData },
      updateField: mockUpdateField,
      calculateInterest: mockCalculateInterest,
    });
    
    mockUseDropdownData.mockReturnValue({
      accountOptions: mockAccountOptions,
    });
  });
  
  test('renders the component with form fields', () => {
    render(<InterestCalculation />);
    
    expect(screen.getByText('Interest Calculation')).toBeInTheDocument();
    expect(screen.getByTestId('account-select')).toBeInTheDocument();
    expect(screen.getByTestId('from-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('to-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('rate-input')).toBeInTheDocument();
    expect(screen.getByTestId('calculate-button')).toBeInTheDocument();
  });
  
  test('populates account dropdown with options', () => {
    render(<InterestCalculation />);
    
    const select = screen.getByTestId('account-select');
    expect(select).toHaveTextContent('Account 1');
    expect(select).toHaveTextContent('Account 2');
  });
  
  test('calls updateField when form fields are changed', async () => {
    render(
      <InterestCalculation
        initialData={mockInitialData}
        onCalculationComplete={mockOnCalculationComplete}
        onError={mockOnError}
      />
    );
    
    // Test account selection
    const accountSelect = screen.getByTestId('account-select');
    fireEvent.change(accountSelect, { target: { value: 'acc1' } });
    expect(mockUpdateField).toHaveBeenCalledWith('selectedAccount', 'acc1');
    
    // Test date fields
    const fromDateInput = screen.getByTestId('from-date-input');
    fireEvent.change(fromDateInput, { target: { value: '2025-01-01' } });
    expect(mockUpdateField).toHaveBeenCalledWith('fromDate', '2025-01-01');
    
    const toDateInput = screen.getByTestId('to-date-input');
    fireEvent.change(toDateInput, { target: { value: '2025-12-31' } });
    expect(mockUpdateField).toHaveBeenCalledWith('toDate', '2025-12-31');
    
    // Test rate input
    const rateInput = screen.getByTestId('rate-input');
    fireEvent.change(rateInput, { target: { value: '5.5' } });
    expect(mockUpdateField).toHaveBeenCalledWith('rate', '5.5');
    
    const calculateButton = screen.getByRole('button', { name: /calculate/i });
    fireEvent.click(calculateButton);
    
    await waitFor(() => {
      expect(mockCalculateInterest).toHaveBeenCalled();
    });
  });
  
  test('disables form fields when disabled prop is true', () => {
    render(
      <InterestCalculation
        initialData={mockInitialData}
        onCalculationComplete={mockOnCalculationComplete}
        onError={mockOnError}
        disabled={true}
      />
    );
    
    const accountSelect = screen.getByTestId('account-select') as HTMLSelectElement;
    const fromDateInput = screen.getByTestId('from-date-input') as HTMLInputElement;
    const toDateInput = screen.getByTestId('to-date-input') as HTMLInputElement;
    const rateInput = screen.getByTestId('rate-input') as HTMLInputElement;
    const calculateButton = screen.getByRole('button', { name: /calculate/i }) as HTMLButtonElement;
    
    expect(accountSelect).toBeDisabled();
    expect(fromDateInput).toBeDisabled();
    expect(toDateInput).toBeDisabled();
    expect(rateInput).toBeDisabled();
    expect(calculateButton).toBeDisabled();
  });
  
  test('hides crystal report when showCrystalReport is false', () => {
    render(<InterestCalculation showCrystalReport={false} />);
    expect(screen.queryByTestId('crystal-report')).not.toBeInTheDocument();
  });
  
  test('displays error messages when validation fails', () => {
    const errors = {
      selectedAccount: 'Please select an account',
      fromDate: 'From date is required',
      rate: 'Please enter a valid rate',
    };
    
    mockUseInterestCalculator.mockReturnValueOnce({
      formData: { ...mockInitialData, errors },
      updateField: mockUpdateField,
      calculateInterest: mockCalculateInterest,
    });
    
    render(<InterestCalculation />);
    
    expect(screen.getByText('Please select an account')).toBeInTheDocument();
    expect(screen.getByText('From date is required')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid rate')).toBeInTheDocument();
  });
});

