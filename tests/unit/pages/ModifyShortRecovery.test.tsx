// src/tests/unit/pages/ModifyShortRecovery.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ModifyShortRecovery from '../../../service/Transaction/Demand&RecoveryList/ModifyShortRecovery/page/ModifyShortRecovery';
import useAccessRecovery from '../../../service/Transaction/Demand&RecoveryList/ModifyShortRecovery/hooks/useAccessRecovery';

// Mock the useAccessRecovery hook
vi.mock('../../../../service/Transaction/Demand&RecoveryList/ModifyShortRecovery/hooks/useAccessRecovery');

describe('ModifyShortRecovery Component', () => {
  // Mock data
  const defaultFormData = {
    selectedWing: 'Wing A',
    memberNo: 'M001',
    memberName: 'John Doe',
    designation: 'Employee',
    dateOfJoining: '2020-01-01',
    currentRecord: 1,
    totalRecords: 5,
    recoveryDetails: {
      demandNo: 'D001',
      demandDate: '2025-01-01',
      amount: '1000',
      recoveryType: 'Monthly',
      recoveryFor: 'Subscription',
    },
  };

  const mockUpdateFormData = vi.fn();
  const mockNavigateFirst = vi.fn();
  const mockNavigatePrevious = vi.fn();
  const mockNavigateNext = vi.fn();
  const mockNavigateLast = vi.fn();
  const mockAddNewRecord = vi.fn();
  const mockDeleteRecord = vi.fn();

  const mockHookReturn = {
    formData: defaultFormData,
    updateFormData: mockUpdateFormData,
    navigateFirst: mockNavigateFirst,
    navigatePrevious: mockNavigatePrevious,
    navigateNext: mockNavigateNext,
    navigateLast: mockNavigateLast,
    addNewRecord: mockAddNewRecord,
    deleteRecord: mockDeleteRecord,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAccessRecovery as jest.Mock).mockReturnValue(mockHookReturn);
  });

  test('renders the component with title', () => {
    render(<ModifyShortRecovery />);
    expect(screen.getByText('Access Recovery')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<ModifyShortRecovery />);
    
    // Check form fields
    expect(screen.getByDisplayValue('Wing A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('M001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Employee')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2020-01-01')).toBeInTheDocument();
  });

  test('displays recovery details', () => {
    render(<ModifyShortRecovery />);
    
    expect(screen.getByDisplayValue('D001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Subscription')).toBeInTheDocument();
  });

  test('calls navigation functions when navigation buttons are clicked', () => {
    render(<ModifyShortRecovery />);
    
    // Test navigation buttons
    fireEvent.click(screen.getByRole('button', { name: /first/i }));
    expect(mockNavigateFirst).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(mockNavigatePrevious).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(mockNavigateNext).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByRole('button', { name: /last/i }));
    expect(mockNavigateLast).toHaveBeenCalledTimes(1);
  });

  test('calls addNewRecord when Add New Record button is clicked', () => {
    render(<ModifyShortRecovery />);
    const addButton = screen.getByRole('button', { name: /add new record/i });
    fireEvent.click(addButton);
    expect(mockAddNewRecord).toHaveBeenCalledTimes(1);
  });

  test('calls deleteRecord when Delete Record button is clicked', () => {
    render(<ModifyShortRecovery />);
    const deleteButton = screen.getByRole('button', { name: /delete record/i });
    fireEvent.click(deleteButton);
    expect(mockDeleteRecord).toHaveBeenCalledTimes(1);
  });

  test('displays current record information', () => {
    render(<ModifyShortRecovery />);
    expect(screen.getByText('Record: 1 of 5')).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<ModifyShortRecovery />);
    expect(container).toMatchSnapshot();
  });
});

