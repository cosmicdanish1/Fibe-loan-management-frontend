// src/tests/unit/pages/CashBook.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import CashBook from '../../../service/Reports/Daily/CashBook/page/CashBook';
import { useCashBook } from '../../../service/Reports/Daily/CashBook/hooks/useCashBook';

// Mock the useCashBook hook
vi.mock('../../../../service/Reports/Daily/CashBook/hooks/useCashBook');

describe('CashBook Component', () => {
  const mockSetFinYear = vi.fn();
  const mockSetDate = vi.fn();
  const mockSetOutputType = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    (useCashBook as jest.Mock).mockReturnValue({
      finYear: '2024-2025',
      setFinYear: mockSetFinYear,
      date: '2025-08-23',
      setDate: mockSetDate,
      outputType: 'screen',
      setOutputType: mockSetOutputType
    });
  });

  test('renders the component with title', () => {
    render(<CashBook />);
    expect(screen.getByText('CASHBOOK')).toBeInTheDocument();
  });

  test('displays default financial year and date', () => {
    render(<CashBook />);
    
    const finYearInput = screen.getByDisplayValue('2024-2025');
    const dateInput = screen.getByDisplayValue('2025-08-23');
    
    expect(finYearInput).toBeInTheDocument();
    expect(dateInput).toBeInTheDocument();
  });

  test('allows changing financial year', () => {
    render(<CashBook />);
    
    const finYearInput = screen.getByDisplayValue('2024-2025');
    fireEvent.change(finYearInput, { target: { value: '2025-2026' } });
    
    expect(mockSetFinYear).toHaveBeenCalledWith('2025-2026');
  });

  test('allows changing date', () => {
    render(<CashBook />);
    
    const dateInput = screen.getByDisplayValue('2025-08-23');
    fireEvent.change(dateInput, { target: { value: '2025-09-01' } });
    
    expect(mockSetDate).toHaveBeenCalledWith('2025-09-01');
  });

  test('displays output type radio buttons with screen selected by default', () => {
    render(<CashBook />);
    
    const screenRadio = screen.getByRole('radio', { name: /screen/i }) as HTMLInputElement;
    const printerRadio = screen.getByRole('radio', { name: /printer/i }) as HTMLInputElement;
    
    expect(screenRadio.checked).toBe(true);
    expect(printerRadio.checked).toBe(false);
  });

  test('allows changing output type to printer', () => {
    render(<CashBook />);
    
    const printerRadio = screen.getByRole('radio', { name: /printer/i });
    fireEvent.click(printerRadio);
    
    expect(mockSetOutputType).toHaveBeenCalledWith('printer');
  });

  test('displays Crystal Report button', () => {
    render(<CashBook />);
    expect(screen.getByRole('button', { name: /crystal report/i })).toBeInTheDocument();
  });

  test('displays society header information', () => {
    render(<CashBook />);
    
    expect(screen.getByText('Espat Karmchari Co-Operative Credit Society Limited.')).toBeInTheDocument();
    expect(screen.getByText(/Avenue A, Sahakari Sadan, Sector-6/)).toBeInTheDocument();
  });

  test('renders the cash book table with correct headers', () => {
    render(<CashBook />);
    
    // Check main headers
    expect(screen.getByText('CODE')).toBeInTheDocument();
    expect(screen.getByText('HEAD NAME')).toBeInTheDocument();
    expect(screen.getByText('RECEIPT')).toBeInTheDocument();
    expect(screen.getByText('PAYMENT')).toBeInTheDocument();
    
    // Check sub-headers
    expect(screen.getAllByText('CASH').length).toBe(2); // One for receipt, one for payment
    expect(screen.getAllByText('TRANSFER').length).toBe(2); // One for receipt, one for payment
  });

  test('matches snapshot', () => {
    const { container } = render(<CashBook />);
    expect(container).toMatchSnapshot();
  });
});

