import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import DemandPrintOrder from '../../../service/Administration/DemandPrintOrder/page/DemandPrintOrder';
import * as demandPrintOrderHook from '../../../service/Administration/DemandPrintOrder/hook/useDemandPrintOrder';

// Define types for the row data
type DemandPrintOrderRow = {
  headCode: string;
  headType: string;
  inttType: string;
  description: string;
  mapColName: string;
  printOrder: number;
};

// Mock the MDLAmountDetails component with proper typing
vi.mock('../../../../service/Administration/DemandPrintOrder/components/MDAmountDetails', () => ({
  __esModule: true,
  default: ({ headCode }: { headCode: string }) => (
    <div data-testid="md-amount-details">MD Amount Details - {headCode}</div>
  ),
}));

// Mock data with proper typing
const mockRows: DemandPrintOrderRow[] = [
  {
    headCode: 'A1002',
    headType: 'RLN',
    inttType: 'N',
    description: 'Regular Loan Account',
    mapColName: 'RLN_installment_amo',
    printOrder: 1,
  },
  {
    headCode: 'L1002',
    headType: 'MD',
    inttType: 'N',
    description: 'FAMILY RELIEF SCHEME',
    mapColName: 'MD_Amount',
    printOrder: 5,
  },
  {
    headCode: 'I1001',
    headType: 'INT',
    inttType: 'Y',
    description: 'Interest on Loan',
    mapColName: 'INT_Amount',
    printOrder: 2,
  },
];

describe('DemandPrintOrder Component', () => {
  // Mock functions for the hook
  const mockSetRows = vi.fn();
  
  beforeEach(() => {
    // Mock the hook return value with the expected properties
    vi.spyOn(demandPrintOrderHook, 'useDemandPrintOrder').mockReturnValue({
      rows: mockRows,
      setRows: mockSetRows,
    });
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders the component with table headers', () => {
    render(<DemandPrintOrder />);
    
    // Check if the title is rendered
    expect(screen.getByRole('heading', { name: /demand print order/i })).toBeInTheDocument();
    
    // Check if all table headers are rendered
    const headers = ['Head Code', 'Head Type', 'Intt Type', 'Description', 'Map Col Name', 'PrintOrder'];
    headers.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument();
    });
    
    // Check if save button is rendered
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  test('displays the correct number of rows including header', () => {
    render(<DemandPrintOrder />);
    
    // Get all rows including header
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    
    // Should have 1 header row + number of data rows
    expect(rows).toHaveLength(mockRows.length + 1);
    
    // Verify each row has the correct number of cells
    rows.forEach((row, index) => {
      if (index === 0) {
        // Header row
        expect(within(row).getAllByRole('columnheader')).toHaveLength(6);
      } else {
        // Data rows
        expect(within(row).getAllByRole('cell')).toHaveLength(6);
      }
    });
  });

  test('displays the correct data in the table', () => {
    render(<DemandPrintOrder />);
    
    // Verify each row's data is displayed correctly
    mockRows.forEach(row => {
      const rowElement = screen.getByRole('row', { 
        name: new RegExp(`${row.headCode}.*${row.description}`, 'i') 
      });
      
      // Check if all cell data is present in the row
      expect(within(rowElement).getByText(row.headCode)).toBeInTheDocument();
      expect(within(rowElement).getByText(row.headType)).toBeInTheDocument();
      expect(within(rowElement).getByText(row.inttType)).toBeInTheDocument();
      expect(within(rowElement).getByText(row.description)).toBeInTheDocument();
      
      // Check if print order is a number input with correct value
      const printOrderInput = within(rowElement).getByRole('spinbutton');
      expect(printOrderInput).toHaveValue(row.printOrder);
    });
  });

  test('renders MD_Amount and INT_Amount as clickable buttons', () => {
    render(<DemandPrintOrder />);
    
    // Check if MD_Amount is rendered as a button
    const mdButton = screen.getByRole('button', { name: /MD_Amount/i });
    expect(mdButton).toBeInTheDocument();
    
    // Check if INT_Amount is rendered as a button
    const intButton = screen.getByRole('button', { name: /INT_Amount/i });
    expect(intButton).toBeInTheDocument();
  });

  test('opens MD Amount modal when MD_Amount button is clicked', () => {
    render(<DemandPrintOrder />);
    
    // Click the MD_Amount button
    const mdButton = screen.getByRole('button', { name: /MD_Amount/i });
    fireEvent.click(mdButton);
    
    // Check if the modal is opened with the correct head code
    expect(screen.getByText('MD Amount Details - L1002')).toBeInTheDocument();
  });
  
  test('opens INT Amount modal when INT_Amount button is clicked', () => {
    render(<DemandPrintOrder />);
    
    // Click the INT_Amount button
    const intButton = screen.getByRole('button', { name: /INT_Amount/i });
    fireEvent.click(intButton);
    
    // Check if the modal is opened with the correct head code
    expect(screen.getByText('MD Amount Details - I1001')).toBeInTheDocument();
  });
  
  test('updates print order when changed', () => {
    render(<DemandPrintOrder />);
    
    // Get the first row's print order input
    const firstRow = screen.getByRole('row', { name: /A1002/i });
    const printOrderInput = within(firstRow).getByRole('spinbutton');
    
    // Change the print order
    fireEvent.change(printOrderInput, { target: { value: '3' } });
    
    // Verify the rows were updated with the new print order
    expect(mockSetRows).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          headCode: 'A1002',
          printOrder: 3
        })
      ])
    );
  });
  
  test('displays no data message when there are no rows', () => {
    // Mock empty rows
    (demandPrintOrderHook.useDemandPrintOrder as Mock).mockReturnValueOnce({
      rows: [],
      setRows: mockSetRows,
    });
    
    render(<DemandPrintOrder />);
    
    // Verify no data message is shown
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  test('closes MD Amount modal when close button is clicked', () => {
    render(<DemandPrintOrder />);
    
    // Open the modal
    const mdButton = screen.getByRole('button', { name: /MD_Amount/i });
    fireEvent.click(mdButton);
    
    // Close the modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Verify the modal is closed
    expect(screen.queryByText('MD Amount Details - L1002')).not.toBeInTheDocument();
  });

  test('does not render MD Amount modal by default', () => {
    render(<DemandPrintOrder />);
    
    // Check if the modal is not rendered initially
    expect(screen.queryByText('MD Amount Details')).not.toBeInTheDocument();
  });
});

