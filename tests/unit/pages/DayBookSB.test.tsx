// src/tests/unit/pages/DayBookSB.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DayBookSB from '../../../service/Reports/Daily/DayBookSB/page/DayBookSB';
import { useDayBookSB } from '../../../service/Reports/Daily/DayBookSB/hooks/useDayBookSB';

// Mock the useDayBookSB hook
vi.mock('../../../../service/Reports/Daily/DayBookSB/hooks/useDayBookSB');

describe('DayBookSB Component', () => {
  const mockOnCrystalReport = vi.fn();
  const mockOnScreen = vi.fn();
  const mockOnPrint = vi.fn();
  const mockFormatDate = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementation
    (useDayBookSB as jest.Mock).mockReturnValue({
      formatDate: mockFormatDate
    });
    
    // Default mock implementation for formatDate
    mockFormatDate.mockImplementation((date: Date) => 
      date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    );
  });

  test('renders the component with title', () => {
    render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText('DAY BOOK [SAVING]')).toBeInTheDocument();
  });

  test('formats and displays the current date by default', () => {
    const testDate = new Date('2025-09-09');
    mockFormatDate.mockReturnValueOnce('09 Sep 2025');
    
    render(
      <DayBookSB 
        date={testDate}
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    
    expect(mockFormatDate).toHaveBeenCalledWith(testDate);
    expect(screen.getByText('09 Sep 2025')).toBeInTheDocument();
  });

  test('displays the correct total pages', () => {
    const totalPages = 5;
    
    render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
        totalPages={totalPages}
      />
    );
    
    expect(screen.getByText(totalPages.toString())).toBeInTheDocument();
  });

  test('calls onCrystalReport when Crystal Report button is clicked', () => {
    render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    
    const crystalReportButton = screen.getByRole('button', { name: /crystal report/i });
    fireEvent.click(crystalReportButton);
    
    expect(mockOnCrystalReport).toHaveBeenCalledTimes(1);
  });

  test('calls onScreen when Screen button is clicked', () => {
    render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    
    const screenButton = screen.getByRole('button', { name: /screen/i });
    fireEvent.click(screenButton);
    
    expect(mockOnScreen).toHaveBeenCalledTimes(1);
  });

  test('calls onPrint when Printer button is clicked', () => {
    render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    
    const printButton = screen.getByRole('button', { name: /printer/i });
    fireEvent.click(printButton);
    
    expect(mockOnPrint).toHaveBeenCalledTimes(1);
  });

  test('displays the report content area', () => {
    render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    
    const contentArea = screen.getByText('Report content would be displayed here');
    expect(contentArea).toBeInTheDocument();
    expect(contentArea.closest('div')).toHaveClass('min-h-[200px]', 'bg-gray-50');
  });

  test('matches snapshot with default props', () => {
    const { container } = render(
      <DayBookSB 
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
      />
    );
    expect(container).toMatchSnapshot();
  });

  test('matches snapshot with custom props', () => {
    const testDate = new Date('2025-09-09');
    mockFormatDate.mockReturnValueOnce('09 Sep 2025');
    
    const { container } = render(
      <DayBookSB 
        date={testDate}
        onCrystalReport={mockOnCrystalReport}
        onScreen={mockOnScreen}
        onPrint={mockOnPrint}
        totalPages={3}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

