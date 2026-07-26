import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ModifyFdAccount from '../../../service/Masters/ModifyFdAccount/page/ModifyFdAccount';
import { useModifyFD } from '../../../service/Masters/ModifyFdAccount/hooks/useModifyFD';

// Mock the useModifyFD hook
vi.mock('../../../../service/Masters/ModifyFdAccount/hooks/useModifyFD');

const mockUseModifyFD = useModifyFD as jest.MockedFunction<typeof useModifyFD>;

describe('ModifyFdAccount Component', () => {
  // Default mock data
  const defaultData = {
    selectFD: '',
    prefix: 'Mr',
    firstName: '',
    middleName: '',
    lastName: '',
    certificateNo: '',
    depositDate: '22-Aug-2025',
    rate: '',
    depositUnit: '',
    depositPeriod: '',
    maturityDate: '22-Aug-2025',
    modeOfPayment: '',
    fdAmount: '',
    maturityAmount: '',
    intAmount: '',
    interestBalance: '',
    lastIntPaymentDate: '22-Aug-2025',
    interestPaid: '',
    status: '',
    nominees: []
  };

  // Mock functions
  const mockUpdateSelectFD = vi.fn();
  const mockUpdatePrefix = vi.fn();
  const mockUpdateFirstName = vi.fn();
  const mockUpdateMiddleName = vi.fn();
  const mockUpdateLastName = vi.fn();
  const mockUpdateCertificateNo = vi.fn();
  const mockUpdateDepositDate = vi.fn();
  const mockUpdateRate = vi.fn();
  const mockUpdateDepositUnit = vi.fn();
  const mockUpdateDepositPeriod = vi.fn();
  const mockUpdateMaturityDate = vi.fn();
  const mockUpdateModeOfPayment = vi.fn();
  const mockUpdateFdAmount = vi.fn();
  const mockUpdateMaturityAmount = vi.fn();
  const mockUpdateIntAmount = vi.fn();
  const mockUpdateInterestBalance = vi.fn();
  const mockUpdateLastIntPaymentDate = vi.fn();
  const mockUpdateInterestPaid = vi.fn();
  const mockUpdateStatus = vi.fn();
  const mockAddNominee = vi.fn();
  const mockRemoveNominee = vi.fn();
  const mockUpdateNominee = vi.fn();

  // Mock save and reset functions
  const mockSave = vi.fn();
  const mockReset = vi.fn();

  // Default mock implementation
  const defaultProps = {
    data: defaultData,
    updateSelectFD: mockUpdateSelectFD,
    updatePrefix: mockUpdatePrefix,
    updateFirstName: mockUpdateFirstName,
    updateMiddleName: mockUpdateMiddleName,
    updateLastName: mockUpdateLastName,
    updateCertificateNo: mockUpdateCertificateNo,
    updateDepositDate: mockUpdateDepositDate,
    updateRate: mockUpdateRate,
    updateDepositUnit: mockUpdateDepositUnit,
    updateDepositPeriod: mockUpdateDepositPeriod,
    updateMaturityDate: mockUpdateMaturityDate,
    updateModeOfPayment: mockUpdateModeOfPayment,
    updateFdAmount: mockUpdateFdAmount,
    updateMaturityAmount: mockUpdateMaturityAmount,
    updateIntAmount: mockUpdateIntAmount,
    updateInterestBalance: mockUpdateInterestBalance,
    updateLastIntPaymentDate: mockUpdateLastIntPaymentDate,
    updateInterestPaid: mockUpdateInterestPaid,
    updateStatus: mockUpdateStatus,
    addNominee: mockAddNominee,
    removeNominee: mockRemoveNominee,
    updateNominee: mockUpdateNominee,
    save: mockSave,
    reset: mockReset
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Set up the default mock implementation
    mockUseModifyFD.mockReturnValue(defaultProps);
  });

  test('renders the component with correct title', () => {
    render(<ModifyFdAccount />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Modify Fixed Deposit....')).toBeInTheDocument();
  });

  test('renders the FD selection input field', () => {
    render(<ModifyFdAccount />);
    
    // Check if the FD selection input is rendered
    const fdInput = screen.getByLabelText('Select FD');
    expect(fdInput).toBeInTheDocument();
    expect(fdInput).toHaveAttribute('type', 'text');
  });

  test('renders name fields with prefix dropdown', () => {
    render(<ModifyFdAccount />);
    
    // Check prefix field
    const prefixInput = screen.getByLabelText('Prefix');
    expect(prefixInput).toBeInTheDocument();
    
    // Check first name field
    const firstNameInput = screen.getByLabelText('First');
    expect(firstNameInput).toBeInTheDocument();
    expect(firstNameInput).toHaveAttribute('type', 'text');
    
    // Check middle name field
    const middleNameInput = screen.getByLabelText('Middle');
    expect(middleNameInput).toBeInTheDocument();
    expect(middleNameInput).toHaveAttribute('type', 'text');
    
    // Check last name field
    const lastNameInput = screen.getByLabelText('Last');
    expect(lastNameInput).toBeInTheDocument();
    expect(lastNameInput).toHaveAttribute('type', 'text');
  });

  test('handles input changes for name fields', () => {
    render(<ModifyFdAccount />);
    
    // Test first name input
    const firstNameInput = screen.getByLabelText('First');
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    expect(mockUpdateFirstName).toHaveBeenCalledWith('John');
    
    // Test middle name input
    const middleNameInput = screen.getByLabelText('Middle');
    fireEvent.change(middleNameInput, { target: { value: 'William' } });
    expect(mockUpdateMiddleName).toHaveBeenCalledWith('William');
    
    // Test last name input
    const lastNameInput = screen.getByLabelText('Last');
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    expect(mockUpdateLastName).toHaveBeenCalledWith('Doe');
  });

  test('handles FD amount input change', () => {
    render(<ModifyFdAccount />);
    
    // Test FD amount input
    const fdAmountInput = screen.getByLabelText('FD Amount');
    fireEvent.change(fdAmountInput, { target: { value: '10000' } });
    expect(mockUpdateFdAmount).toHaveBeenCalledWith('10000');
  });

  test('handles rate input change', () => {
    render(<ModifyFdAccount />);
    
    // Test rate input
    const rateInput = screen.getByLabelText('Rate');
    fireEvent.change(rateInput, { target: { value: '7.5' } });
    expect(mockUpdateRate).toHaveBeenCalledWith('7.5');
  });

  test('displays current form data', () => {
    // Override the default mock with test data
    const testData = {
      ...defaultData,
      firstName: 'John',
      lastName: 'Doe',
      fdAmount: '10000',
      rate: '7.5'
    };
    
    mockUseModifyFD.mockReturnValueOnce({
      ...defaultProps,
      data: testData
    });
    
    render(<ModifyFdAccount />);
    
    // Check if the form fields display the test data
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7.5')).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<ModifyFdAccount />);
    expect(container).toMatchSnapshot();
  });
});

