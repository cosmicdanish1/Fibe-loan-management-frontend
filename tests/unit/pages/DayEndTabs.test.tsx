// Day End window: the two sections (closing the day, and Date settings).
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../../src/service/Administration/DayEnd/hooks/useDayend', () => ({
  useDayend: () => ({
    dayendData: { date: '2026-08-25', openingBalance: 100, totalCredit: 0, totalDebit: 0, closingBalance: 100, paymentVouchers: 0, receiptVouchers: 0, journalVouchers: 0, dayendFlag: 'N', noWorkingDateSet: false },
    isProcessing: false, isLoading: false, error: null, processDayend: vi.fn(), refreshData: vi.fn(), initializeWorkingDate: vi.fn(), isInitializing: false,
  }),
  useDayendCalculations: () => ({ isBalanced: true, difference: 0 }),
}));
vi.mock('../../../src/service/Administration/DayEnd/components/DateSettings', () => ({ default: () => <div>date-settings-stub</div> }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => undefined }));

import DayEnd from '../../../src/service/Administration/DayEnd/page/DayEnd';

describe('Day End window sections', () => {
  it('opens on Day End with the next opening date, not on Date settings', () => {
    render(<DayEnd />);
    expect(screen.getByRole('tab', { name: 'Day End' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Next Opening Date')).toBeInTheDocument();
    expect(screen.queryByText('date-settings-stub')).not.toBeInTheDocument();
  });

  it('the Date settings tab shows the settings and hides the day-closing panel', () => {
    render(<DayEnd />);
    fireEvent.click(screen.getByRole('tab', { name: 'Date settings' }));
    expect(screen.getByText('date-settings-stub')).toBeInTheDocument();
    expect(screen.queryByText('Next Opening Date')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Date settings' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switching back returns to the day-closing panel', () => {
    render(<DayEnd />);
    fireEvent.click(screen.getByRole('tab', { name: 'Date settings' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Day End' }));
    expect(screen.getByText('Next Opening Date')).toBeInTheDocument();
    expect(screen.queryByText('date-settings-stub')).not.toBeInTheDocument();
  });

  it('shows the open day and the day after it as the next opening (25 Aug -> 26 Aug)', () => {
    render(<DayEnd />);
    expect(screen.getByText(/26 Aug 2026/)).toBeInTheDocument();
  });
});
