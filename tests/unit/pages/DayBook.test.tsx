// src/tests/unit/pages/DayBook.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DayBook from '../../../service/Reports/Daily/DayBook/page/DayBook';
import { useDayBook } from '../../../service/Reports/Daily/DayBook/hooks/useDayBook';

// Mock the useDayBook hook
vi.mock('../../../../service/Reports/Daily/DayBook/hooks/useDayBook');

describe('DayBook Component', () => {
  const mockOnPrint = vi.fn();
  const mockOnScreenView = vi.fn();
  const mockAddEntry = vi.fn();
  const mockClearEntries = vi.fn();

  const mockEntries = [
    {
      mbNo: 'MB001',
      name: 'John Doe',
      voucher: 'V001',
      amount: '1000.00',
      user: 'admin'
    },
    {
      mbNo: 'MB002',
      name: 'Jane Smith',
      voucher: 'V002',
      amount: '2000.00',
      user: 'user1'
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    (useDayBook as jest.Mock).mockReturnValue({
      entries: mockEntries,
      addEntry: mockAddEntry,
      clearEntries: mockClearEntries
    });
  });

  test('renders the component with title', () => {
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    expect(screen.getByText('Day - Book')).toBeInTheDocument();
  });

  test('displays current date by default', () => {
    const testDate = new Date('2025-09-09');
    render(<DayBook date={testDate} onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    
    const formattedDate = testDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  test('displays society information', () => {
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    
    expect(screen.getByText('Expat Karmchari Co-Operative Credit Society Limited.')).toBeInTheDocument();
    expect(screen.getByText(/Avenue A, Sahakari Sadan, Sector-6/)).toBeInTheDocument();
  });

  test('renders table with correct headers', () => {
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    
    const headers = ['MB No', 'Name', 'Voucher', 'Amount', 'User'];
    headers.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument();
    });
  });

  test('displays entries when available', () => {
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    
    // Check if mock entries are displayed
    mockEntries.forEach(entry => {
      expect(screen.getByText(entry.mbNo)).toBeInTheDocument();
      expect(screen.getByText(entry.name)).toBeInTheDocument();
      expect(screen.getByText(entry.voucher)).toBeInTheDocument();
      expect(screen.getByText(entry.amount)).toBeInTheDocument();
      expect(screen.getByText(entry.user)).toBeInTheDocument();
    });
  });

  test('displays "No entries available" when entries array is empty', () => {
    // Override the mock to return empty entries
    (useDayBook as jest.Mock).mockReturnValueOnce({
      entries: [],
      addEntry: mockAddEntry,
      clearEntries: mockClearEntries
    });
    
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    expect(screen.getByText('No entries available')).toBeInTheDocument();
  });

  test('calls onPrint when Print button is clicked', () => {
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    
    const printButton = screen.getByRole('button', { name: /printer/i });
    fireEvent.click(printButton);
    
    expect(mockOnPrint).toHaveBeenCalledTimes(1);
  });

  test('calls onScreenView when Screen button is clicked', () => {
    render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    
    const screenButton = screen.getByRole('button', { name: /screen/i });
    fireEvent.click(screenButton);
    
    expect(mockOnScreenView).toHaveBeenCalledTimes(1);
  });

  test('matches snapshot with entries', () => {
    const { container } = render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    expect(container).toMatchSnapshot();
  });

  test('matches snapshot with no entries', () => {
    // Override the mock to return empty entries
    (useDayBook as jest.Mock).mockReturnValueOnce({
      entries: [],
      addEntry: mockAddEntry,
      clearEntries: mockClearEntries
    });
    
    const { container } = render(<DayBook onPrint={mockOnPrint} onScreenView={mockOnScreenView} />);
    expect(container).toMatchSnapshot();
  });
});

