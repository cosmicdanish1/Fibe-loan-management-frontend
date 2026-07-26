import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import DepositLoanSlab from '../../../service/Administration/DepositLoanSlab/page/DepositLoanSlab';
import useDepositSlab from '../../../service/Administration/DepositLoanSlab/hook/useDepositSlab';
import { DepositTypeEnum } from '../../../service/Administration/DepositLoanSlab/interface/depositSlab.interface';

// Define types for test data
type SlabDetail = {
  srNo: number;
  amountFrom: string;
  amountUpTo: string;
  periodFrom: string;
  periodUpTo: string;
  unit: string;
  rate: string;
  prematureRate: string;
  applicableFrom: string;
  applicableUpTo: string;
};

type DepositTypeOption = {
  value: string;
  label: string;
  isActive: boolean;
};

// Mock the X icon from lucide-react
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="close-icon">×</span>,
}));

// Mock the useDepositSlab hook
vi.mock('../../../service/Administration/DepositLoanSlab/hook/useDepositSlab', () => ({
  __esModule: true,
  default: vi.fn()
}));

// Sample data for testing with proper typing
const mockSlabDetails: SlabDetail[] = [
  {
    srNo: 1,
    amountFrom: '1,000',
    amountUpTo: '50,000',
    periodFrom: '1',
    periodUpTo: '12',
    unit: 'Months',
    rate: '5.5',
    prematureRate: '4.0',
    applicableFrom: '01/01/2023',
    applicableUpTo: '31/12/2023',
  },
  {
    srNo: 2,
    amountFrom: '50,001',
    amountUpTo: '200,000',
    periodFrom: '13',
    periodUpTo: '36',
    unit: 'Months',
    rate: '6.5',
    prematureRate: '5.0',
    applicableFrom: '01/01/2023',
    applicableUpTo: '31/12/2023',
  },
  {
    srNo: 3,
    amountFrom: '200,001',
    amountUpTo: '500,000',
    periodFrom: '37',
    periodUpTo: '60',
    unit: 'Months',
    rate: '7.0',
    prematureRate: '5.5',
    applicableFrom: '01/01/2023',
    applicableUpTo: '31/12/2023',
  },
];

const mockDepositTypeOptions: DepositTypeOption[] = [
  { value: 'fixed', label: 'Fixed Deposit', isActive: true },
  { value: 'recurring', label: 'Recurring Deposit', isActive: false },
  { value: 'loan', label: 'Loan', isActive: false },
];

describe('DepositLoanSlab Component', () => {
  const mockOnClose = vi.fn();
  // Mock functions for the hook
  const mockHandleDepositTypeChange = vi.fn();
  
  beforeEach(() => {
    // Mock the hook return value with the expected properties
    (useDepositSlab as Mock).mockReturnValue({
      depositType: DepositTypeEnum.FIXED,
      depositTypeOptions: mockDepositTypeOptions,
      slabDetails: mockSlabDetails,
      handleDepositTypeChange: mockHandleDepositTypeChange,
      isLoading: false,
      error: null,
      selectedRows: [],
      validationErrors: [],
      handleSort: vi.fn(),
      handleFilter: vi.fn(),
      handleSelectRow: vi.fn(),
      handleSelectAllRows: vi.fn(),
      handleAddSlab: vi.fn(),
      handleUpdateSlab: vi.fn(),
      handleDeleteSlabs: vi.fn(),
      handleValidate: vi.fn(),
      handleReset: vi.fn(),
      handleSave: vi.fn(),
      filteredSlabDetails: mockSlabDetails,
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders the component with initial props', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
        initialSlabDetails={mockSlabDetails}
      />
    );

    // Check if the component renders with the correct title
    const title = screen.getByRole('heading', { name: /deposit\/loan slab details/i });
    expect(title).toBeInTheDocument();
    
    // Check if the close button is rendered
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    
    // Check if deposit type tabs are rendered with proper active state
    const fixedTab = screen.getByRole('tab', { name: /fixed deposit/i, selected: true });
    const recurringTab = screen.getByRole('tab', { name: /recurring deposit/i, selected: false });
    const loanTab = screen.getByRole('tab', { name: /loan/i, selected: false });
    
    expect(fixedTab).toBeInTheDocument();
    expect(recurringTab).toBeInTheDocument();
    expect(loanTab).toBeInTheDocument();
  });

  test('displays the correct table headers', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );

    // Check main headers
    const table = screen.getByRole('table');
    
    // Verify all expected headers are present
    const expectedHeaders = [
      'Sr.No.',
      'Amount',
      'Period',
      'Unit',
      'Rate',
      'Premature Rate',
      'Applicable From',
      'Applicable Up To'
    ];
    
    expectedHeaders.forEach(headerText => {
      expect(within(table).getByText(headerText)).toBeInTheDocument();
    });
  });
  
  test('displays slab details in the table', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
        initialSlabDetails={mockSlabDetails}
      />
    );
    
    // Verify each slab detail is displayed correctly
    mockSlabDetails.forEach(slab => {
      // Find the row by serial number
      const row = screen.getByRole('row', { 
        name: new RegExp(String(slab.srNo), 'i') 
      });
      
      // Check each cell in the row
      expect(within(row).getByText(slab.srNo)).toBeInTheDocument();
      expect(within(row).getByText(slab.amountFrom)).toBeInTheDocument();
      expect(within(row).getByText(slab.amountUpTo)).toBeInTheDocument();
      expect(within(row).getByText(slab.rate)).toBeInTheDocument();
      expect(within(row).getByText(slab.prematureRate)).toBeInTheDocument();
    });
  });

  test('displays slab details in the table', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
        initialSlabDetails={mockSlabDetails}
      />
    );

    // Check if the first row data is displayed correctly
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Months')).toBeInTheDocument();
    expect(screen.getByText('5.5')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText('01/01/2023')).toBeInTheDocument();
    expect(screen.getByText('31/12/2023')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('handles deposit type change', () => {
    // Update the mock to use the existing mockHandleDepositTypeChange
    (useDepositSlab as Mock).mockReturnValueOnce({
      depositType: DepositTypeEnum.FIXED,
      depositTypeOptions: mockDepositTypeOptions,
      slabDetails: mockSlabDetails,
      handleDepositTypeChange: mockHandleDepositTypeChange,
      isLoading: false,
      error: null,
      selectedRows: [],
      validationErrors: [],
      filteredSlabDetails: mockSlabDetails,
      handleSort: vi.fn(),
      handleFilter: vi.fn(),
      handleSelectRow: vi.fn(),
      handleSelectAllRows: vi.fn(),
      handleAddSlab: vi.fn(),
      handleUpdateSlab: vi.fn(),
      handleDeleteSlabs: vi.fn(),
      handleValidate: vi.fn(),
      handleReset: vi.fn(),
      handleSave: vi.fn(),
    });

    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );

    // Click on the Recurring Deposit tab
    const recurringDepositTab = screen.getByText('Recurring Deposit');
    fireEvent.click(recurringDepositTab);
    
    expect(mockHandleDepositTypeChange).toHaveBeenCalledWith('recurring');
  });

  test('displays loading state when isLoading is true', () => {
    (useDepositSlab as Mock).mockReturnValueOnce({
      depositType: DepositTypeEnum.FIXED,
      depositTypeOptions: mockDepositTypeOptions,
      slabDetails: [],
      handleDepositTypeChange: vi.fn(),
      isLoading: true,
      error: null,
      selectedRows: [],
      validationErrors: [],
      filteredSlabDetails: [],
      handleSort: vi.fn(),
      handleFilter: vi.fn(),
      handleSelectRow: vi.fn(),
      handleSelectAllRows: vi.fn(),
      handleAddSlab: vi.fn(),
      handleUpdateSlab: vi.fn(),
      handleDeleteSlabs: vi.fn(),
      handleValidate: vi.fn(),
      handleReset: vi.fn(),
      handleSave: vi.fn(),
    });

    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays the correct number of rows', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
        initialSlabDetails={mockSlabDetails}
      />
    );
    
    // Get all rows including header
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    
    // Should have 1 header row + number of data rows
    expect(rows).toHaveLength(mockSlabDetails.length + 1);
    
    // Verify each data row has the correct number of cells
    rows.forEach((row, index) => {
      if (index === 0) {
        // Header row
        expect(within(row).getAllByRole('columnheader')).toHaveLength(8);
      } else {
        // Data rows
        const cells = within(row).getAllByRole('cell');
        expect(cells).toHaveLength(8);
      }
    });
  });
  
  test('calls onClose when close button is clicked', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  test('calls handleDepositTypeChange when a different tab is clicked', () => {
    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );
    
    const loanTab = screen.getByRole('tab', { name: /loan/i });
    fireEvent.click(loanTab);
    
    expect(mockHandleDepositTypeChange).toHaveBeenCalledWith('loan');
  });
  
  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to load data';
    
    (useDepositSlab as Mock).mockReturnValueOnce({
      depositType: DepositTypeEnum.FIXED,
      depositTypeOptions: mockDepositTypeOptions,
      slabDetails: [],
      handleDepositTypeChange: vi.fn(),
      isLoading: false,
      error: errorMessage,
      selectedRows: [],
      validationErrors: [],
      filteredSlabDetails: [],
    });

    render(
      <DepositLoanSlab 
        onClose={mockOnClose} 
        initialDepositType="fixed"
      />
    );

    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });
});

