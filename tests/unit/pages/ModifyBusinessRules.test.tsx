import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ModifyBusinessRules from '../../../service/Administration/ModifyBusinessRules/page/ModifyBusinessRules';
import { useBusinessRules } from '../../../service/Administration/ModifyBusinessRules/hook/useBusinessRules';

// Mock the useBusinessRules hook
vi.mock('../../../../service/Administration/ModifyBusinessRules/hook/useBusinessRules');

describe('ModifyBusinessRules Component', () => {
  const mockBusinessRules = {
    loanAgainstR: {
      maxAmount: 1000000.00,
      numberOfInstallments: 120,
      rate: 7.00,
      numberOfGuarantors: 0
    },
    dataEntryMode: {
      printDemandFormatHorizontal: false,
      considerInitBefore10th: false,
      calculateInterestUsingReducingBalance: false,
      minBalanceForSavingAccount: 0.00,
      showConsolidateInttAmountInDemand: false,
      getWorkingChargesEnabled: false,
      workingChargesAmount: 0
    },
    generalServing: {
      showConsolidateInitAmountInDemand: false,
      getWorkingCharges: false,
      averageInterestCalculationSlot: false,
      profitHead: ''
    }
  };

  const mockUpdateLoanParameters = vi.fn();
  const mockUpdateDataEntryMode = vi.fn();
  const mockUpdateGeneralServing = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the useBusinessRules hook
    (useBusinessRules as jest.Mock).mockReturnValue({
      businessRules: mockBusinessRules,
      updateLoanParameters: mockUpdateLoanParameters,
      updateDataEntryMode: mockUpdateDataEntryMode,
      updateGeneralServing: mockUpdateGeneralServing
    });
  });

  test('renders the component with tabs', () => {
    render(<ModifyBusinessRules />);
    
    // Check if tabs are rendered
    expect(screen.getByText('Loan Parameters')).toBeInTheDocument();
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    
    // Check if the default tab is active
    expect(screen.getByText('Loan Against R')).toBeInTheDocument();
  });

  test('switches between tabs correctly', () => {
    render(<ModifyBusinessRules />);
    
    // Click on General Settings tab
    fireEvent.click(screen.getByText('General Settings'));
    
    // Check if the Data Entry Mode section is visible
    expect(screen.getByText('Data Entry Mode')).toBeInTheDocument();
    expect(screen.getByText('General Serving')).toBeInTheDocument();
  });

  test('updates loan parameters when input values change', () => {
    render(<ModifyBusinessRules />);
    
    // Find the maxAmount input and change its value
    const maxAmountInput = screen.getByLabelText('Max Amount');
    fireEvent.change(maxAmountInput, { target: { value: '1500000' } });
    
    // Verify that updateLoanParameters was called with the correct parameters
    expect(mockUpdateLoanParameters).toHaveBeenCalledWith('loanAgainstR', 'maxAmount', 1500000);
  });

  test('updates data entry mode checkboxes when clicked', () => {
    render(<ModifyBusinessRules />);
    
    // Switch to General Settings tab
    fireEvent.click(screen.getByText('General Settings'));
    
    // Find the specific checkbox by its label or test ID
    const checkbox = screen.getByRole('checkbox', { 
      name: /print demand format horizontal/i 
    });
    
    fireEvent.click(checkbox);
    
    // Verify that updateDataEntryMode was called with the correct parameters
    expect(mockUpdateDataEntryMode).toHaveBeenCalledWith(
      'printDemandFormatHorizontal',
      true
    );
  });

  test('renders input fields with correct default values', () => {
    render(<ModifyBusinessRules />);
    
    // Check if input fields have correct default values
    const maxAmountInput = screen.getByLabelText('Max Amount') as HTMLInputElement;
    const rateInput = screen.getByLabelText('Rate') as HTMLInputElement;
    
    expect(maxAmountInput.value).toBe('1000000');
    expect(rateInput.value).toBe('7');
  });

  test('updates general serving settings when inputs change', () => {
    render(<ModifyBusinessRules />);
    
    // Switch to General Settings tab
    fireEvent.click(screen.getByText('General Settings'));
    
    // Find the profit head input and change its value
    const profitHeadInput = screen.getByLabelText('Profit Head');
    fireEvent.change(profitHeadInput, { target: { value: 'PROFIT-001' } });
    
    // Verify that updateGeneralServing was called with the correct parameters
    expect(mockUpdateGeneralServing).toHaveBeenCalledWith('profitHead', 'PROFIT-001');
  });

  test('matches snapshot', () => {
    const { container } = render(<ModifyBusinessRules />);
    expect(container).toMatchSnapshot();
  });
});

