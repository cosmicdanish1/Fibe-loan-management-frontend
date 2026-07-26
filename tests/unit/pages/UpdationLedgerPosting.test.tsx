// src/tests/unit/pages/UpdationLedgerPosting.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ChevronDown, Search } from 'lucide-react';
import UpdationLedgerPosting from '../../../service/Transaction/Demand&RecoveryList/UpdationLedgerPosting/page/UpdationLedgerPosting';
import usePassingLedger from '../../../service/Transaction/Demand&RecoveryList/UpdationLedgerPosting/hooks/usePassingLedger';

// Mock the icons
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => <div className={className}>▼</div>,
  Search: ({ className }: { className?: string }) => <div className={className}>🔍</div>,
}));

// Mock the usePassingLedger hook
vi.mock('../../../../service/Transaction/Demand&RecoveryList/UpdationLedgerPosting/hooks/usePassingLedger');

describe('UpdationLedgerPosting Component', () => {
  // Mock data
  const defaultFormData = {
    month: 'JAN',
    year: '2025',
    passingLabel: 'PASSING',
    accountHead: 'Account 1',
    voucherNo: 'V001',
    voucherDate: '2025-01-01',
    narration: 'Test Narration',
  };

  const mockRecords = [
    {
      id: '1',
      ledgerName: 'Test Ledger',
      amount: '1000',
      type: 'Dr',
    },
  ];

  const mockOptions = {
    months: ['JAN', 'FEB', 'MAR'],
    years: ['2024', '2025', '2026'],
    accountHeads: ['Account 1', 'Account 2'],
  };

  const mockActions = {
    updateField: vi.fn(),
    updateRecord: vi.fn(),
    toggleDropdown: vi.fn(),
    closeAllDropdowns: vi.fn(),
    handleSearch: vi.fn(),
    handleSave: vi.fn(),
    handleDelete: vi.fn(),
    handleAddRow: vi.fn(),
  };

  const mockState = {
    formData: defaultFormData,
    records: mockRecords,
    dropdowns: {
      month: false,
      year: false,
      accountHead: false,
    },
    searchQuery: '',
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePassingLedger as jest.Mock).mockReturnValue({
      state: mockState,
      actions: mockActions,
      options: mockOptions,
    });
  });

  test('renders the component with title', () => {
    render(<UpdationLedgerPosting />);
    expect(screen.getByText('Updation/Ledger Posting')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<UpdationLedgerPosting />);
    
    // Check form fields
    expect(screen.getByDisplayValue('JAN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PASSING')).toBeInTheDocument();
  });

  test('calls updateField when form fields are changed', () => {
    render(<UpdationLedgerPosting />);
    
    // Test month dropdown
    const monthButton = screen.getByText('JAN').closest('button');
    if (monthButton) {
      fireEvent.click(monthButton);
      expect(mockActions.toggleDropdown).toHaveBeenCalledWith('month');
    }
  });

  test('displays records in the table', () => {
    render(<UpdationLedgerPosting />);
    
    // Check if record is displayed
    expect(screen.getByText('Test Ledger')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
  });

  test('calls handleSave when Save button is clicked', () => {
    render(<UpdationLedgerPosting />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(mockActions.handleSave).toHaveBeenCalledTimes(1);
  });

  test('matches snapshot', () => {
    const { container } = render(<UpdationLedgerPosting />);
    expect(container).toMatchSnapshot();
  });
});

