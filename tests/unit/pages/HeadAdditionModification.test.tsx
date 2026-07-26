import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import HeadAdditionModification from '../../../service/Administration/HeadAdditionModification/page/HeadAdditionModification';
import type { IAccountingInterfaceProps } from '../../../service/Administration/HeadAdditionModification/interface/interfaces';
import { AccountEntry, CompanyInfo } from '../../../service/Administration/HeadAdditionModification/type/types';

// Mock types for the component

// Mock the hooks
const mockUseAccountEntries = vi.fn();
const mockUseAccountCalculations = vi.fn();

vi.mock('../../../../service/Administration/HeadAdditionModification/hook/seAccountEntries', () => ({
  useAccountEntries: mockUseAccountEntries,
  useAccountCalculations: mockUseAccountCalculations,
  __esModule: true,
}));

// Sample test data
const mockCompanyInfo: CompanyInfo = {
  name: 'Test Company',
  address: '123 Test St',
  sector: 'Test Sector',
  postOffice: 'Test PO',
  district: 'Test District',
  pincode: '123456',
};

const mockInitialEntries: AccountEntry[] = [
  {
    code: '1001',
    headName: 'Cash in Hand',
    opening: 1000,
    debit: 500,
    credit: 200,
    balance: 1300,
  },
  {
    code: '1002',
    headName: 'Bank Account',
    opening: 5000,
    debit: 1000,
    credit: 2000,
    balance: 4000,
  },
];

describe('HeadAdditionModification Component', () => {
  const mockAddEntry = vi.fn();
  const mockDeleteEntry = vi.fn();
  const mockModifyEntry = vi.fn();
  const mockSelectEntry = vi.fn();
  const mockClearEntries = vi.fn();
  const mockCalculateTotals = vi.fn();
  const mockCalculateBalance = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    mockCalculateTotals.mockImplementation((entries: AccountEntry[]) => ({
      totalDebit: entries.reduce((sum, entry) => sum + (entry.debit || 0), 0),
      totalCredit: entries.reduce((sum, entry) => sum + (entry.credit || 0), 0),
      totalBalance: entries.reduce((sum, entry) => sum + (entry.balance || 0), 0),
    }));

    mockCalculateBalance.mockImplementation((opening: number, debit: number, credit: number) => {
      return opening + debit - credit;
    });

    // Setup hook mocks
    mockUseAccountEntries.mockReturnValue({
      entries: [...mockInitialEntries],
      selectedEntry: null,
      isLoading: false,
      error: null,
      addEntry: mockAddEntry,
      deleteEntry: mockDeleteEntry,
      modifyEntry: mockModifyEntry,
      selectEntry: mockSelectEntry,
      clearEntries: mockClearEntries,
    });

    mockUseAccountCalculations.mockReturnValue({
      calculateTotals: mockCalculateTotals,
      calculateBalance: mockCalculateBalance,
    });
  });

  const renderComponent = (props: Partial<IAccountingInterfaceProps> = {}) => {
    const defaultProps: IAccountingInterfaceProps = {
      companyInfo: mockCompanyInfo,
      initialEntries: mockInitialEntries,
      onEntryAdd: vi.fn(),
      onEntryDelete: vi.fn(),
      onEntryModify: vi.fn(),
      readOnly: false,
      showDemoControls: true,
      ...props,
    };
    
    return render(<HeadAdditionModification {...defaultProps} />);
  };

  test('renders with default props', () => {
    renderComponent();
    
    // Check if company info is displayed
    expect(screen.getByText(mockCompanyInfo.name, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(mockCompanyInfo.address, { exact: false })).toBeInTheDocument();
    
    // Check if initial entries are rendered
    mockInitialEntries.forEach(entry => {
      expect(screen.getByText(entry.code, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(entry.headName, { exact: false })).toBeInTheDocument();
    });
    
    // Check if action buttons are rendered
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  test('displays loading state', () => {
    mockUseAccountEntries.mockReturnValue({
      entries: [],
      selectedEntry: null,
      isLoading: true,
      error: null,
      addEntry: mockAddEntry,
        deleteEntry: mockDeleteEntry,
        modifyEntry: mockModifyEntry,
        selectEntry: mockSelectEntry,
        clearEntries: mockClearEntries,
      });

    renderComponent();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to load data';
    mockUseAccountEntries.mockReturnValue({
      entries: [],
      selectedEntry: null,
      isLoading: false,
      error: new Error(errorMessage),
      addEntry: mockAddEntry,
      deleteEntry: mockDeleteEntry,
      modifyEntry: mockModifyEntry,
      selectEntry: mockSelectEntry,
      clearEntries: mockClearEntries,
    });

    renderComponent();
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  test('calls addEntry when Add button is clicked with valid data', async () => {
    renderComponent();
    
    // Fill in the form
    const codeInput = screen.getByLabelText(/code/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/head name/i) as HTMLInputElement;
    const openingInput = screen.getByLabelText(/opening/i) as HTMLInputElement;
    
    fireEvent.change(codeInput, { target: { value: '1003' } });
    fireEvent.change(nameInput, { target: { value: 'New Account' } });
    fireEvent.change(openingInput, { target: { value: '2000' } });
    
    // Click Add button
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);
    
    // Check if addEntry was called with the correct data
    await waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalledWith({
        code: '1003',
        headName: 'New Account',
        opening: 2000,
        debit: 0,
        credit: 0,
        balance: 2000,
      });
    });
  });

  test('deletes an entry when delete button is clicked', () => {
    renderComponent();
    
    // Click the delete button for the first entry
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0] as HTMLElement);
    
    // Check if deleteEntry was called with the correct index
    expect(mockDeleteEntry).toHaveBeenCalledWith(0);
  });

  test('selects an entry when clicked', () => {
    renderComponent();
    
    // Find the first entry row
    const firstEntry = mockInitialEntries[0];
    if (!firstEntry) {
      throw new Error('No entries found in mock data');
    }
    
    // Click on the first entry row
    const firstEntryRow = screen.getByText(firstEntry.headName, { exact: false }).closest('tr');
    if (firstEntryRow) {
      fireEvent.click(firstEntryRow);
      expect(mockSelectEntry).toHaveBeenCalledWith(expect.objectContaining({
        code: firstEntry.code,
        headName: firstEntry.headName,
      }));
    } else {
      throw new Error('First entry row not found');
    }
  });

  test('calculates and displays totals correctly', () => {
    const mockTotals = {
      totalDebit: mockInitialEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0),
      totalCredit: mockInitialEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0),
      totalBalance: mockInitialEntries.reduce((sum, entry) => sum + (entry.balance || 0), 0),
    };
    
    mockUseAccountCalculations.mockReturnValue({
      calculateTotals: () => mockTotals,
      calculateBalance: mockCalculateBalance,
    });
    
    renderComponent();
    
    expect(screen.getByText(mockTotals.totalDebit.toString())).toBeInTheDocument();
    expect(screen.getByText(mockTotals.totalCredit.toString())).toBeInTheDocument();
    expect(screen.getByText(mockTotals.totalBalance.toString())).toBeInTheDocument();
  });

  test('disables form controls in read-only mode', () => {
    renderComponent({ readOnly: true });
    
    // Check if form controls are disabled
    const codeInput = screen.getByLabelText(/code/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/head name/i) as HTMLInputElement;
    const openingInput = screen.getByLabelText(/opening/i) as HTMLInputElement;
    
    expect(codeInput).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(openingInput).toBeDisabled();
    
    // Check if action buttons are disabled
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /modify/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
  });
});

