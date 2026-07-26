import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import LoanPayment from '../../../service/Transaction/LoanPayment/page/LoanPayment';
import useLoanPayment from '../../../service/Transaction/LoanPayment/hooks/useLoanPayment';

// Mock the useLoanPayment hook
vi.mock('../../../../service/Transaction/LoanPayment/hooks/useLoanPayment');

// Mock the lucide-react icons used in the component
vi.mock('lucide-react', () => ({
  Plus: () => <span>PlusIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  Save: () => <span>SaveIcon</span>,
  Printer: () => <span>PrinterIcon</span>,
  X: () => <span>CloseIcon</span>
}));

describe('LoanPayment Component', () => {
  const mockUpdateField = vi.fn();
  const mockUpdateMember = vi.fn();
  const mockUpdateHead = vi.fn();
  const mockUpdateChequeDetails = vi.fn();
  const mockAddPaymentEntry = vi.fn();
  const mockRemovePaymentEntry = vi.fn();

  const defaultState = {
    loanType: 'PERSONAL',
    loanCaseNo: 'LC123',
    noOfInst: 12,
    instAmount: 1000,
    sanctionLoanAmount: 12000,
    member: {
      id: 'M001',
      name: 'John Doe',
      code: 'JD001'
    },
    head: {
      id: 'H001',
      name: 'Loan Account',
      code: 'LA001'
    },
    paymentMode: 'CASH',
    actualAmount: 1000,
    bankBal: 50000,
    chequeDetails: {
      date: '01/01/2023',
      chequeNo: '',
      bank: ''
    },
    paymentEntries: [
      {
        id: '1',
        instNo: '1',
        dueDate: '01/01/2023',
        principal: 800,
        interest: 200,
        amount: 1000,
        balance: 11200
      }
    ],
    narration: 'Test payment',
    totalReceipt: 1000,
    totalPayment: 1000
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useLoanPayment as jest.Mock).mockReturnValue({
      state: defaultState,
      updateField: mockUpdateField,
      updateMember: mockUpdateMember,
      updateHead: mockUpdateHead,
      updateChequeDetails: mockUpdateChequeDetails,
      addPaymentEntry: mockAddPaymentEntry,
      removePaymentEntry: mockRemovePaymentEntry
    });
  });

  it('renders the component with default values', () => {
    render(<LoanPayment />);
    
    // Check header
    expect(screen.getByText('Loan Payment')).toBeInTheDocument();
    
    // Check loan type field
    expect(screen.getByLabelText('Loan Type')).toHaveValue('PERSONAL');
    
    // Check loan case no field
    expect(screen.getByLabelText('Loan Case No')).toHaveValue('LC123');
    
    // Check payment entries table
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('01/01/2023')).toBeInTheDocument();
    expect(screen.getByText('800.00')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
    expect(screen.getByText('11,200.00')).toBeInTheDocument();
  });

  it('calls updateField when loan type is changed', () => {
    render(<LoanPayment />);
    
    const loanTypeSelect = screen.getByLabelText('Loan Type');
    fireEvent.change(loanTypeSelect, { target: { value: 'HOUSING' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('loanType', 'HOUSING');
  });

  it('calls updateField when payment mode is changed', () => {
    render(<LoanPayment />);
    
    const paymentModeSelect = screen.getByLabelText('Payment Mode');
    fireEvent.change(paymentModeSelect, { target: { value: 'CHEQUE' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('paymentMode', 'CHEQUE');
  });

  it('shows cheque details when payment mode is CHEQUE', () => {
    (useLoanPayment as jest.Mock).mockReturnValue({
      ...useLoanPayment(),
      state: {
        ...defaultState,
        paymentMode: 'CHEQUE'
      }
    });
    
    render(<LoanPayment />);
    
    expect(screen.getByLabelText('Cheque Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheque No')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank')).toBeInTheDocument();
  });

  it('calls updateChequeDetails when cheque details are changed', () => {
    (useLoanPayment as jest.Mock).mockReturnValue({
      ...useLoanPayment(),
      state: {
        ...defaultState,
        paymentMode: 'CHEQUE'
      }
    });
    
    render(<LoanPayment />);
    
    const chequeNoInput = screen.getByLabelText('Cheque No');
    fireEvent.change(chequeNoInput, { target: { value: 'CHQ123456' } });
    
    expect(mockUpdateChequeDetails).toHaveBeenCalledWith('chequeNo', 'CHQ123456');
  });

  it('calls addPaymentEntry when Add button is clicked', () => {
    render(<LoanPayment />);
    
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);
    
    expect(mockAddPaymentEntry).toHaveBeenCalled();
  });

  it('calls removePaymentEntry when delete button is clicked', () => {
    render(<LoanPayment />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    expect(mockRemovePaymentEntry).toHaveBeenCalledWith('1');
  });

  it('displays the correct totals', () => {
    render(<LoanPayment />);
    
    expect(screen.getByText('Total Receipt:')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Total Payment:')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<LoanPayment />);
    expect(container).toMatchSnapshot();
  });
});

