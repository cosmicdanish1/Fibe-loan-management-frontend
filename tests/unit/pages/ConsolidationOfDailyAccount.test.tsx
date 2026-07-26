// src/tests/unit/pages/ConsolidationOfDailyAccount.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ConsolidationOfDailyAccount from '../../../service/Reports/Daily/ConsolidationOfDailyAccount/page/ConsolidationOfDailyAccount';
import { useConsolidation } from '../../../service/Reports/Daily/ConsolidationOfDailyAccount/hooks/useConsolidation';

// Mock the useConsolidation hook
vi.mock('../../../../service/Reports/Daily/ConsolidationOfDailyAccount/hooks/useConsolidation');

describe('ConsolidationOfDailyAccount Component', () => {
  const mockSetDate = vi.fn();
  const mockSetOutputType = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    (useConsolidation as jest.Mock).mockReturnValue({
      date: '2025-08-23',
      setDate: mockSetDate,
      outputType: 'screen',
      setOutputType: mockSetOutputType
    });
  });

  test('renders the component with title', () => {
    render(<ConsolidationOfDailyAccount />);
    expect(screen.getByText('Consolidation Of Daily Accounts')).toBeInTheDocument();
  });

  test('displays default date', () => {
    render(<ConsolidationOfDailyAccount />);
    const dateInput = screen.getByDisplayValue('2025-08-23');
    expect(dateInput).toBeInTheDocument();
  });

  test('allows changing date', () => {
    render(<ConsolidationOfDailyAccount />);
    const dateInput = screen.getByDisplayValue('2025-08-23');
    fireEvent.change(dateInput, { target: { value: '2025-09-01' } });
    expect(mockSetDate).toHaveBeenCalledWith('2025-09-01');
  });

  test('displays output type radio buttons with screen selected by default', () => {
    render(<ConsolidationOfDailyAccount />);
    const screenRadio = screen.getByRole('radio', { name: /screen/i }) as HTMLInputElement;
    const printerRadio = screen.getByRole('radio', { name: /printer/i }) as HTMLInputElement;
    expect(screenRadio.checked).toBe(true);
    expect(printerRadio.checked).toBe(false);
  });

  test('allows changing output type to printer', () => {
    render(<ConsolidationOfDailyAccount />);
    const printerRadio = screen.getByRole('radio', { name: /printer/i });
    fireEvent.click(printerRadio);
    expect(mockSetOutputType).toHaveBeenCalledWith('printer');
  });

  test('displays Crystal Report button', () => {
    render(<ConsolidationOfDailyAccount />);
    expect(screen.getByRole('button', { name: /crystal report/i })).toBeInTheDocument();
  });

  test('renders the table with correct headers', () => {
    render(<ConsolidationOfDailyAccount />);
    
    // Check table headers
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    
    // Check if headers have the correct styling
    const headers = screen.getAllByRole('columnheader');
    headers.forEach(header => {
      expect(header).toHaveClass('text-red-600');
    });
  });

  test('renders an empty table body by default', () => {
    render(<ConsolidationOfDailyAccount />);
    const tableRows = screen.getAllByRole('row');
    
    // Should have header row + 1 empty data row
    expect(tableRows).toHaveLength(2);
    
    // Check empty cells in the data row
    const emptyCells = screen.getAllByRole('cell');
    expect(emptyCells).toHaveLength(3); // 3 empty cells in the data row
    emptyCells.forEach(cell => {
      expect(cell).toHaveTextContent('');
    });
  });

  test('matches snapshot', () => {
    const { container } = render(<ConsolidationOfDailyAccount />);
    expect(container).toMatchSnapshot();
  });
});

