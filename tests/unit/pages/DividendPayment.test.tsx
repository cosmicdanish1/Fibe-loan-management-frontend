import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import DividendPayment from '../../../service/Transaction/Receipt&Payment/DividendPayment/page/DividendPayment';
import { useDividendForm } from '../../../service/Transaction/Receipt&Payment/DividendPayment/hooks/useDividendForm';

// Mock the useDividendForm hook
vi.mock('../../../../service/Transaction/Receipt&Payment/DividendPayment/hooks/useDividendForm');

// Mock the lucide-react icons used in the component
vi.mock('lucide-react', () => ({
  Save: () => <span>SaveIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  Plus: () => <span>PlusIcon</span>,
  X: () => <span>CloseIcon</span>
}));

describe('DividendPayment Component', () => {
  const mockUpdateField = vi.fn();
  const mockUpdateChequeDetails = vi.fn();
  const mockAddDividendRecord = vi.fn();
  const mockUpdateDividendRecord = vi.fn();
  const mockRemoveDividendRecord = vi.fn();
  const mockCalculateDividend = vi.fn();
  const mockResetForm = vi.fn();

  const defaultFormData = {
    memberNo: 'M001',
    subDivision: 'SD001',
    transDate: '01/01/2023',
    paymentMode: 'cash' as const,
    actualAmount: 1000,
    bankBal: 5000,
    chequeDetails: {
      date: '01/01/2023',
      chequeNo: '',
      bank: ''
    },
    dividendRecords: [
      {
        id: '1',
        wrNo: 'WR001',
        balance: 10000,
        rate: 5,
        dividend: 500
      }
    ],
    narration: 'Test dividend payment',
    totalDividend: 500
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useDividendForm as jest.Mock).mockReturnValue({
      formData: defaultFormData,
      updateField: mockUpdateField,
      updateChequeDetails: mockUpdateChequeDetails,
      addDividendRecord: mockAddDividendRecord,
      updateDividendRecord: mockUpdateDividendRecord,
      removeDividendRecord: mockRemoveDividendRecord,
      calculateDividend: mockCalculateDividend,
      resetForm: mockResetForm
    });
  });

  it('renders the component with default values', () => {
    render(<DividendPayment />);
    
    // Check header
    expect(screen.getByText('Dividend Payment')).toBeInTheDocument();
    
    // Check member fields
    expect(screen.getByLabelText('Member No')).toHaveValue('M001');
    expect(screen.getByLabelText('Sub Division')).toHaveValue('SD001');
    
    // Check dividend record fields
    expect(screen.getByLabelText('WR No')).toHaveValue('WR001');
    expect(screen.getByLabelText('Balance')).toHaveValue(10000);
    expect(screen.getByLabelText('Rate %')).toHaveValue(5);
    expect(screen.getByLabelText('Dividend')).toHaveValue(500);
    
    // Check total
    expect(screen.getByText('Total Dividend:')).toBeInTheDocument();
    expect(screen.getByText('500.00')).toBeInTheDocument();
  });

  it('allows changing member details', () => {
    render(<DividendPayment />);
    
    const memberNoInput = screen.getByLabelText('Member No');
    fireEvent.change(memberNoInput, { target: { value: 'M002' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('memberNo', 'M002');
  });

  it('allows changing payment mode', () => {
    render(<DividendPayment />);
    
    const paymentModeSelect = screen.getByLabelText('Payment Mode');
    fireEvent.change(paymentModeSelect, { target: { value: 'bank' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('paymentMode', 'bank');
  });

  it('shows cheque details when payment mode is bank', () => {
    (useDividendForm as jest.Mock).mockReturnValue({
      formData: {
        ...defaultFormData,
        paymentMode: 'bank' as const
      },
      updateField: mockUpdateField,
      updateChequeDetails: mockUpdateChequeDetails,
      addDividendRecord: mockAddDividendRecord,
      updateDividendRecord: mockUpdateDividendRecord,
      removeDividendRecord: mockRemoveDividendRecord,
      calculateDividend: mockCalculateDividend,
      resetForm: mockResetForm
    });
    
    render(<DividendPayment />);
    
    expect(screen.getByLabelText('Cheque Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheque No')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank')).toBeInTheDocument();
  });

  it('allows adding a new dividend record', () => {
    render(<DividendPayment />);
    
    const addButton = screen.getByRole('button', { name: /add record/i });
    fireEvent.click(addButton);
    
    expect(mockAddDividendRecord).toHaveBeenCalled();
  });

  it('allows removing a dividend record', () => {
    render(<DividendPayment />);
    
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    expect(mockRemoveDividendRecord).toHaveBeenCalledWith(0);
  });

  it('calculates dividend when balance or rate changes', () => {
    render(<DividendPayment />);
    
    const balanceInput = screen.getByLabelText('Balance');
    fireEvent.change(balanceInput, { target: { value: '20000' } });
    
    expect(mockUpdateDividendRecord).toHaveBeenCalledWith(0, 'balance', '20000');
    expect(mockCalculateDividend).toHaveBeenCalledWith(0);
  });

  it('resets the form when reset button is clicked', () => {
    window.confirm = vi.fn(() => true);
    
    render(<DividendPayment />);
    
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to reset the form? All changes will be lost.');
    expect(mockResetForm).toHaveBeenCalled();
  });

  it('submits the form when save button is clicked', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<DividendPayment />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(alertSpy).toHaveBeenCalledWith('Dividend payment submitted successfully!');
    
    alertSpy.mockRestore();
  });

  it('matches snapshot', () => {
    const { container } = render(<DividendPayment />);
    expect(container).toMatchSnapshot();
  });
});

