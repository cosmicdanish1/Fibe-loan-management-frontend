import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import '@testing-library/jest-dom';
import PassTransactions from '../../../service/Transaction/PassTransactions/page/PassTransactions';
import useTransactionTable from '../../../service/Transaction/PassTransactions/hooks/useTransactionTable';

// Mock the useTransactionTable hook
vi.mock('../../../service/Transaction/PassTransactions/hooks/useTransactionTable', () => ({
  __esModule: true,
  default: vi.fn(),
}));

// Mock the lucide-react icons used in the component
vi.mock('lucide-react', () => ({
  Save: () => <span>SaveIcon</span>,
  X: () => <span>CloseIcon</span>,
  Edit: () => <span>EditIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  Plus: () => <span>PlusIcon</span>,
  Printer: () => <span>PrinterIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
  Search: () => <span>SearchIcon</span>
}));

describe('PassTransactions Component', () => {
  const mockAddRecord = vi.fn();
  const mockUpdateRecord = vi.fn();
  const mockDeleteRecord = vi.fn();
  const mockSelectRecord = vi.fn();
  const mockSelectAllRecords = vi.fn();
  const mockClearSelection = vi.fn();
  const mockStartEditing = vi.fn();
  const mockStopEditing = vi.fn();
  const mockSortBy = vi.fn();
  const mockSetSearchTerm = vi.fn();
  const mockSaveData = vi.fn();
  const mockCancelChanges = vi.fn();

  const mockRecords = [
    {
      id: '1',
      trNo: '001',
      vchrNo: 'V001',
      mbNo: 'MB001',
      name: 'John Doe',
      noOfAcc: '1',
      head: 'Shares',
      transType: 'Credit',
      transAmount: '5000.00',
      vchrTyp: 'Receipt',
      chequeNo: 'CHQ001',
      chequeDate: '2024-01-15'
    },
    {
      id: '2',
      trNo: '002',
      vchrNo: 'V002',
      mbNo: 'MB002',
      name: 'Jane Smith',
      noOfAcc: '2',
      head: 'Monthly Contribution',
      transType: 'Debit',
      transAmount: '2500.00',
      vchrTyp: 'Payment',
      chequeNo: 'CHQ002',
      chequeDate: '2024-01-16'
    }
  ] as const;

  const defaultState = {
    records: mockRecords,
    selectedRecords: new Set<string>(),
    isEditing: false,
    editingRecord: null,
    sortColumn: null,
    sortDirection: 'asc',
    searchTerm: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useTransactionTable as Mock).mockReturnValue({
      state: defaultState,
      actions: {
        addRecord: mockAddRecord,
        updateRecord: mockUpdateRecord,
        deleteRecord: mockDeleteRecord,
        selectRecord: mockSelectRecord,
        selectAllRecords: mockSelectAllRecords,
        clearSelection: mockClearSelection,
        startEditing: mockStartEditing,
        stopEditing: mockStopEditing,
        sortBy: mockSortBy,
        setSearchTerm: mockSetSearchTerm,
        saveData: mockSaveData,
        cancelChanges: mockCancelChanges
      },
      filteredRecords: mockRecords
    });
  });

  it('renders the component with transaction records', () => {
    render(<PassTransactions />);
    
    // Check table headers
    expect(screen.getByText('Tr No')).toBeInTheDocument();
    expect(screen.getByText('Voucher No')).toBeInTheDocument();
    expect(screen.getByText('MB No')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('No of Acc')).toBeInTheDocument();
    expect(screen.getByText('Head')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    
    // Check if records are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('5,000.00')).toBeInTheDocument();
    expect(screen.getByText('2,500.00')).toBeInTheDocument();
  });

  it('allows sorting by column headers', () => {
    render(<PassTransactions />);
    
    const trNoHeader = screen.getByText('Tr No');
    fireEvent.click(trNoHeader);
    
    expect(mockSortBy).toHaveBeenCalledWith('trNo');
  });

  it('allows selecting records', () => {
    render(<PassTransactions />);
    
    // Find the select all checkbox more specifically
    const selectAllCheckbox = screen.getByRole('checkbox', { 
      name: /select all/i 
    });
    
    fireEvent.click(selectAllCheckbox);
    
    expect(mockSelectAllRecords).toHaveBeenCalled();
  });

  it('allows adding a new record', () => {
    render(<PassTransactions />);
    
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);
    
    expect(mockAddRecord).toHaveBeenCalled();
  });

  it('allows editing a record', () => {
    // Set state to editing mode
    (useTransactionTable as Mock).mockReturnValue({
      state: {
        ...defaultState,
        isEditing: true,
        editingRecord: mockRecords[0]
      },
      actions: {
        addRecord: mockAddRecord,
        updateRecord: mockUpdateRecord,
        deleteRecord: mockDeleteRecord,
        selectRecord: mockSelectRecord,
        selectAllRecords: mockSelectAllRecords,
        clearSelection: mockClearSelection,
        startEditing: mockStartEditing,
        stopEditing: mockStopEditing,
        sortBy: mockSortBy,
        setSearchTerm: mockSetSearchTerm,
        saveData: mockSaveData,
        cancelChanges: mockCancelChanges
      },
      filteredRecords: mockRecords
    });
    
    render(<PassTransactions />);
    
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'John Updated' } });
    
    expect(mockUpdateRecord).toHaveBeenCalledWith('1', { name: 'John Updated' });
  });

  it('allows deleting a record', () => {
    render(<PassTransactions />);
    
    // Find the delete button for the first record
    const deleteButton = screen.getByRole('button', { 
      name: /delete/i,
      // Add more specific query if needed, e.g., `exact: false` or a more specific name
    });
    
    fireEvent.click(deleteButton);
    
    expect(mockDeleteRecord).toHaveBeenCalledWith('1');
  });

  it('allows searching records', () => {
    render(<PassTransactions />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(mockSetSearchTerm).toHaveBeenCalledWith('John');
  });

  it('allows saving changes', () => {
    render(<PassTransactions />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(mockSaveData).toHaveBeenCalled();
  });

  it('allows canceling changes', () => {
    render(<PassTransactions />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockCancelChanges).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { container } = render(<PassTransactions />);
    expect(container).toMatchSnapshot();
  });
});

