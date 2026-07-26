import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DayEnd from '../../../service/Administration/DayEnd/page/DayEnd';
import * as dayendHooks from '../../../service/Administration/DayEnd/hooks/useDayend';

import * as calculationsHooks from '../../../service/Administration/DayEnd/hooks/useDayend';
import { vi } from 'vitest';

// Mock the hooks
vi.mock('../../../service/Administration/DayEnd/hooks/useDayend');
vi.mock('../../../service/Administration/DayEnd/hooks/useDayendCalculations');

describe('DayEnd Component', () => {
  const mockProcessDayend = vi.fn();
  const mockRefreshData = vi.fn();
  
  const mockDayendData = {
    lastProcessedDate: '2025-09-08T00:00:00.000Z',
    currentDate: '2025-09-09T00:00:00.000Z',
    totalTransactions: 42,
    totalAmount: 125000.75,
    status: 'idle' as const,
    error: null,
    processDayend: mockProcessDayend,
    refreshData: mockRefreshData,
  };

  const mockCalculations = {
    isProcessing: false,
    isBalanced: true,
    totals: {
      credit: 62500.25,
      debit: 62500.25,
      difference: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock implementations
    (dayendHooks.useDayend as jest.Mock).mockReturnValue(mockDayendData);
    (calculationsHooks.useDayendCalculations as jest.Mock).mockReturnValue(mockCalculations);
  });

  test('renders with default data', () => {
    render(<DayEnd />);
    
    // Check if all sections are rendered
    expect(screen.getByText('Day End Processing')).toBeInTheDocument();
    expect(screen.getByText('Last Processed Date')).toBeInTheDocument();
    expect(screen.getByText('Current Date')).toBeInTheDocument();
    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    
    // Check if action buttons are rendered
    expect(screen.getByRole('button', { name: /process day end/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  test('displays formatted dates and amounts', () => {
    render(<DayEnd />);
    
    // Check if dates are formatted correctly (assuming Indian locale)
    expect(screen.getByText('08/09/2025')).toBeInTheDocument();
    expect(screen.getByText('09/09/2025')).toBeInTheDocument();
    
    // Check if amounts are formatted correctly
    expect(screen.getByText('₹1,25,000.75')).toBeInTheDocument();
  });

  test('calls processDayend when Process Day End button is clicked', async () => {
    render(<DayEnd />);
    
    const processButton = screen.getByRole('button', { name: /process day end/i });
    fireEvent.click(processButton);
    
    await waitFor(() => {
      expect(mockProcessDayend).toHaveBeenCalledTimes(1);
    });
  });

  test('calls refreshData when Refresh button is clicked', async () => {
    render(<DayEnd />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });
  });

  test('shows loading state when processing', () => {
    (dayendHooks.useDayend as jest.Mock).mockReturnValue({
      ...mockDayendData,
      status: 'processing',
    });
    
    render(<DayEnd />);
    
    const processButton = screen.getByRole('button', { name: /processing.../i });
    expect(processButton).toBeInTheDocument();
    expect(processButton).toBeDisabled();
  });

  test('shows error state when there is an error', () => {
    const errorMessage = 'Failed to process day end';
    (dayendHooks.useDayend as jest.Mock).mockReturnValue({
      ...mockDayendData,
      status: 'error',
      error: errorMessage,
    });
    
    render(<DayEnd />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('shows unbalanced state when calculations are not balanced', () => {
    (calculationsHooks.useDayendCalculations as jest.Mock).mockReturnValue({
      ...mockCalculations,
      isBalanced: false,
      totals: {
        credit: 60000,
        debit: 62500.25,
        difference: 2500.25,
      },
    });
    
    render(<DayEnd />);
    
    expect(screen.getByText('Unbalanced')).toBeInTheDocument();
    expect(screen.getByText('Difference: ₹2,500.25')).toBeInTheDocument();
  });
});

