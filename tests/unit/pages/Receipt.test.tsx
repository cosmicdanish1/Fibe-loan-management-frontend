import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Receipt from '../../../service/Transaction/Receipt&Payment/Receipt/page/Receipt';
import { useReceipt } from '../../../service/Transaction/Receipt&Payment/Receipt/hooks/useReceipt';

// Mock the useReceipt hook
vi.mock('../../../../service/Transaction/Receipt&Payment/Receipt/hooks/useReceipt');

// Mock the lucide-react icons used in the component
vi.mock('lucide-react', () => ({
  Save: () => <span>SaveIcon</span>,
  X: () => <span>CloseIcon</span>,
  Plus: () => <span>PlusIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  Printer: () => <span>PrinterIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
  Search: () => <span>SearchIcon</span>
}));

describe('Receipt Component', () => {
  const mockSetReceiptData = vi.fn();
  const mockHandleAddRow = vi.fn();
  const mockHandleUpdateRow = vi.fn();
  const mockHandleRemoveRow = vi.fn();
  const mockHandleSave = vi.fn();
  const mockHandleCancel = vi.fn();
  const mockHandleExit = vi.fn();

  const defaultReceiptData = {
    receiptType: 'receipt' as const,
    memberNo: 'M001',
    officeNo: 'OFF001',
    month: 'JAN',
    year: '2023',
    rlnBal: 1000,
    rlnInt: 10,
    elnBal: 2000,
    elnInt: 20,
    flnBal: 3000,
    flnInt: 30,
    bankBal: 5000,
    paymentMode: 'cash' as const,
    actualAmount: 1000,
    chequeDetails: {
      date: '2023-01-15',
      chequeNo: '',
      bank: '',
      customerBankName: ''
    },
    items: [
      {
        id: '1',
        code: 'SHARES',
        name: 'Share Capital',
        amount: '1000',
        rdSrNo: 'RD001'
      }
    ],
    narration: 'Test receipt',
    totalAmount: 1000
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useReceipt as jest.Mock).mockReturnValue({
      receiptData: defaultReceiptData,
      setReceiptData: mockSetReceiptData,
      handleAddRow: mockHandleAddRow,
      handleUpdateRow: mockHandleUpdateRow,
      handleRemoveRow: mockHandleRemoveRow,
      handleSave: mockHandleSave,
      handleCancel: mockHandleCancel,
      handleExit: mockHandleExit
    });
  });

  it('renders the component with default values', () => {
    render(<Receipt />);
    
    // Check header
    expect(screen.getByText('Receipt')).toBeInTheDocument();
    
    // Check member and office fields
    expect(screen.getByLabelText('Member No')).toHaveValue('M001');
    expect(screen.getByLabelText('Office No')).toHaveValue('OFF001');
    
    // Check month and year
    expect(screen.getByDisplayValue('JAN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023')).toBeInTheDocument();
    
    // Check loan balances and interests
    expect(screen.getByLabelText('RLN Bal')).toHaveValue(1000);
    expect(screen.getByLabelText('RLN Int')).toHaveValue(10);
    
    // Check items table
    expect(screen.getByText('SHARES')).toBeInTheDocument();
    expect(screen.getByText('Share Capital')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    
    // Check total amount
    expect(screen.getByText('Total Amount:')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  it('allows changing member details', () => {
    render(<Receipt />);
    
    const memberNoInput = screen.getByLabelText('Member No');
    fireEvent.change(memberNoInput, { target: { value: 'M002' } });
    
    expect(mockSetReceiptData).toHaveBeenCalled();
  });

  it('allows changing payment mode', () => {
    render(<Receipt />);
    
    const paymentModeSelect = screen.getByLabelText('Payment Mode');
    fireEvent.change(paymentModeSelect, { target: { value: 'bank' } });
    
    expect(mockSetReceiptData).toHaveBeenCalledWith(expect.objectContaining({
      paymentMode: 'bank'
    }));
  });

  it('shows cheque details when payment mode is bank', () => {
    (useReceipt as jest.Mock).mockReturnValue({
      receiptData: {
        ...defaultReceiptData,
        paymentMode: 'bank' as const
      },
      setReceiptData: mockSetReceiptData,
      handleAddRow: mockHandleAddRow,
      handleUpdateRow: mockHandleUpdateRow,
      handleRemoveRow: mockHandleRemoveRow,
      handleSave: mockHandleSave,
      handleCancel: mockHandleCancel,
      handleExit: mockHandleExit
    });
    
    render(<Receipt />);
    
    expect(screen.getByLabelText('Cheque Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheque No')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank')).toBeInTheDocument();
  });

  it('allows adding a new receipt item', () => {
    render(<Receipt />);
    
    const addButton = screen.getByRole('button', { name: /add row/i });
    fireEvent.click(addButton);
    
    expect(mockHandleAddRow).toHaveBeenCalled();
  });

  it('allows removing a receipt item', () => {
    render(<Receipt />);
    
    const removeButton = screen.getByRole('button', { name: /remove row/i });
    fireEvent.click(removeButton);
    
    expect(mockHandleRemoveRow).toHaveBeenCalledWith(0);
  });

  it('updates receipt item when edited', () => {
    render(<Receipt />);
    
    const amountInput = screen.getByDisplayValue('1000');
    fireEvent.change(amountInput, { target: { value: '2000' } });
    
    expect(mockHandleUpdateRow).toHaveBeenCalledWith(0, 'amount', '2000');
  });

  it('saves the receipt when save button is clicked', () => {
    render(<Receipt />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(mockHandleSave).toHaveBeenCalled();
  });

  it('cancels the receipt when cancel button is clicked', () => {
    render(<Receipt />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockHandleCancel).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { container } = render(<Receipt />);
    expect(container).toMatchSnapshot();
  });
});

