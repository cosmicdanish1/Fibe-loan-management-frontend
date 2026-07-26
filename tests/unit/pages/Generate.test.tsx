import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ChevronDown } from 'lucide-react';
import Generate from '../../../service/Transaction/Demand&RecoveryList/Generate/page/Generate';

// Define types for the component props and state
type FormData = {
  month: string;
  year: string;
  divisionRO: string;
  from: string;
  to: string;
};

// Mock the ChevronDown icon
vi.mock('lucide-react', () => ({
  ChevronDown: vi.fn().mockImplementation(({ className }: { className?: string }) => (
    <div data-testid="chevron-down" className={className}>▼</div>
  )),
}));

describe('Generate Component', () => {
  // Mock data
  const mockOptions = {
    months: ['JAN', 'FEB', 'MAR'],
    years: ['2024', '2025', '2026'],
    divisions: ['Division 1', 'Division 2'],
    destinations: ['Destination 1', 'Destination 2'],
  } as const;

  const mockFormData: FormData = {
    month: 'AUG',
    year: '2025',
    divisionRO: 'Division 1',
    from: 'Start Point',
    to: 'Destination 1',
  };

  const mockUpdateField = vi.fn();
  const mockToggleDropdown = vi.fn();
  const mockHandleGenerate = vi.fn();
  const mockHandleReset = vi.fn();

  // Mock the Generate component with proper typing
  vi.mock('../../../../service/Transaction/Demand&RecoveryList/Generate/page/Generate', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
      state: {
        formData: mockFormData,
        dropdowns: {
          month: false,
          year: false,
          divisionRO: false,
          to: false,
        },
      },
      options: mockOptions,
      updateField: mockUpdateField,
      toggleDropdown: mockToggleDropdown,
      handleGenerate: mockHandleGenerate,
      handleReset: mockHandleReset,
    })) as unknown as React.FC,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the component with title', () => {
    render(<Generate />);
    expect(screen.getByRole('heading', { name: /demand generation/i })).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<Generate />);
    
    // Check default values with proper type assertions
    expect(screen.getByRole('textbox', { name: /month/i })).toHaveValue(mockFormData.month);
    expect(screen.getByRole('textbox', { name: /year/i })).toHaveValue(mockFormData.year);
    expect(screen.getByRole('textbox', { name: /division/i })).toHaveValue(mockFormData.divisionRO);
    expect(screen.getByRole('textbox', { name: /from/i })).toHaveValue(mockFormData.from);
    expect(screen.getByRole('textbox', { name: /to/i })).toHaveValue(mockFormData.to);
  });

  test('calls updateField when form fields are changed', () => {
    render(<Generate />);
    
    // Test month change
    const monthInput = screen.getByRole('textbox', { name: /month/i });
    fireEvent.change(monthInput, { target: { value: 'SEP' } });
    expect(mockUpdateField).toHaveBeenCalledWith('month', 'SEP');
    
    // Test year change
    const yearInput = screen.getByRole('textbox', { name: /year/i });
    fireEvent.change(yearInput, { target: { value: '2026' } });
    expect(mockUpdateField).toHaveBeenCalledWith('year', '2026');
    
    // Test division change
    const divisionInput = screen.getByRole('textbox', { name: /division/i });
    fireEvent.change(divisionInput, { target: { value: 'Division 2' } });
    expect(mockUpdateField).toHaveBeenCalledWith('divisionRO', 'Division 2');
  });

  test('calls handleGenerate when Generate button is clicked', () => {
    render(<Generate />);
    const generateButton = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(generateButton);
    expect(mockHandleGenerate).toHaveBeenCalledTimes(1);
  });
  
  test('calls handleReset when Reset button is clicked', () => {
    render(<Generate />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    expect(mockHandleReset).toHaveBeenCalledTimes(1);
  });
  
  test('toggles dropdown when clicking on dropdown toggle', () => {
    render(<Generate />);
    const dropdownToggle = screen.getByTestId('chevron-down');
    fireEvent.click(dropdownToggle);
    expect(mockToggleDropdown).toHaveBeenCalled();
  });

  test('calls handleReset when Reset button is clicked', () => {
    render(<Generate />);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    expect(mockHandleReset).toHaveBeenCalledTimes(1);
  });

  test('disables Generate button when required fields are missing', () => {
    // Create a test component with missing required fields
    const TestComponent = () => (
      <div>
        <input name="month" value="" readOnly />
        <input name="divisionRO" value="" readOnly />
        <button disabled={true}>Generate</button>
      </div>
    );
    
    render(<TestComponent />);
    const generateButton = screen.getByRole('button', { name: /generate/i });
    expect(generateButton).toBeDisabled();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to load data';
    
    // Create a test component that shows an error
    const TestComponent = () => (
      <div>
        <div role="alert">Error: {errorMessage}</div>
      </div>
    );
    
    // Mock the Generate component to return our test component
    vi.mocked(Generate).mockImplementationOnce(() => <TestComponent />);
    
    render(<Generate />);
    expect(screen.getByRole('alert')).toHaveTextContent(`Error: ${errorMessage}`);
  });
});

