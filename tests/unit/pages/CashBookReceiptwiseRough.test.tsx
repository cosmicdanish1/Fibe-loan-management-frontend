// src/tests/unit/pages/CashBookReceiptwiseRough.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import CashBookReceiptwiseRough from '../../../service/Reports/Daily/CashBookReceiptwiseRough/page/CashBookReceiptwiseRough';
import { useCashBook } from '../../../service/Reports/Daily/CashBookReceiptwiseRough/hooks/useCashBook';

// Mock the useCashBook hook
vi.mock('../../../../service/Reports/Daily/CashBookReceiptwiseRough/hooks/useCashBook');

describe('CashBookReceiptwiseRough Component', () => {
  const mockSetDate = vi.fn();
  const mockSetOutputType = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    (useCashBook as jest.Mock).mockReturnValue({
      date: '2025-08-23',
      setDate: mockSetDate,
      outputType: 'screen',
      setOutputType: mockSetOutputType
    });
  });

  test('renders the component with title', () => {
    render(<CashBookReceiptwiseRough />);
    expect(screen.getByText('Cash-Book (Transaction)')).toBeInTheDocument();
  });

  test('displays default date', () => {
    render(<CashBookReceiptwiseRough />);
    const dateInput = screen.getByDisplayValue('2025-08-23');
    expect(dateInput).toBeInTheDocument();
  });

  test('allows changing date', () => {
    render(<CashBookReceiptwiseRough />);
    const dateInput = screen.getByDisplayValue('2025-08-23');
    fireEvent.change(dateInput, { target: { value: '2025-09-01' } });
    expect(mockSetDate).toHaveBeenCalledWith('2025-09-01');
  });

  test('displays output type radio buttons with screen selected by default', () => {
    render(<CashBookReceiptwiseRough />);
    const screenRadio = screen.getByRole('radio', { name: /screen/i }) as HTMLInputElement;
    const printerRadio = screen.getByRole('radio', { name: /printer/i }) as HTMLInputElement;
    expect(screenRadio.checked).toBe(true);
    expect(printerRadio.checked).toBe(false);
  });

  test('allows changing output type to printer', () => {
    render(<CashBookReceiptwiseRough />);
    const printerRadio = screen.getByRole('radio', { name: /printer/i });
    fireEvent.click(printerRadio);
    expect(mockSetOutputType).toHaveBeenCalledWith('printer');
  });

  test('displays Crystal Report button', () => {
    render(<CashBookReceiptwiseRough />);
    expect(screen.getByRole('button', { name: /crystal report/i })).toBeInTheDocument();
  });

  test('displays "Total Pages" label', () => {
    render(<CashBookReceiptwiseRough />);
    expect(screen.getByText('Total Pages *')).toBeInTheDocument();
  });

  test('renders the empty report area', () => {
    render(<CashBookReceiptwiseRough />);
    const reportArea = screen.getByRole('region', { name: /report area/i });
    expect(reportArea).toBeInTheDocument();
    expect(reportArea).toHaveClass('h-56', 'bg-gray-50');
  });

  test('matches snapshot', () => {
    const { container } = render(<CashBookReceiptwiseRough />);
    expect(container).toMatchSnapshot();
  });
});

