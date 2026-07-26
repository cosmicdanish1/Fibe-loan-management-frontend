// src/tests/unit/pages/ChangeMemberOffice.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ChangeMemberOffice from '../../../service/Transaction/Demand&RecoveryList/ChangeMemberOffice/page/ChangeMemberOffice';
import useChangeMemberDivision from '../../../service/Transaction/Demand&RecoveryList/ChangeMemberOffice/hooks/useChangeMemberDivision';

// Mock the useChangeMemberDivision hook
vi.mock('../../../../service/Transaction/Demand&RecoveryList/ChangeMemberOffice/hooks/useChangeMemberDivision');

describe('ChangeMemberOffice Component', () => {
  // Mock data
  const defaultFormData = {
    month: 'JAN',
    year: '2025',
    memberNo: 'M001',
    memberName: 'John Doe',
    currentOffice: 'Office A',
    newOffice: 'Office B',
  };

  const mockUpdateFormData = vi.fn();
  const mockProcessMemberTransfer = vi.fn();

  const mockHookReturn = {
    formData: defaultFormData,
    updateFormData: mockUpdateFormData,
    processMemberTransfer: mockProcessMemberTransfer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useChangeMemberDivision as jest.Mock).mockReturnValue(mockHookReturn);
  });

  test('renders the component with title', () => {
    render(<ChangeMemberOffice />);
    expect(screen.getByText("Change Member's Division")).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<ChangeMemberOffice />);
    
    // Check month dropdown
    const monthSelect = screen.getByDisplayValue('JAN');
    expect(monthSelect).toBeInTheDocument();
    
    // Check year input
    expect(screen.getByDisplayValue('2025')).toBeInTheDocument();
    
    // Check member information
    expect(screen.getByDisplayValue('M001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Office A')).toBeInTheDocument();
  });

  test('updates form data when month is changed', () => {
    render(<ChangeMemberOffice />);
    const monthSelect = screen.getByDisplayValue('JAN');
    fireEvent.change(monthSelect, { target: { value: 'FEB' } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('month', 'FEB');
  });

  test('updates form data when year is changed', () => {
    render(<ChangeMemberOffice />);
    const yearInput = screen.getByDisplayValue('2025');
    fireEvent.change(yearInput, { target: { value: '2026' } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('year', '2026');
  });

  test('calls processMemberTransfer when Transfer button is clicked', () => {
    render(<ChangeMemberOffice />);
    const transferButton = screen.getByRole('button', { name: /transfer/i });
    fireEvent.click(transferButton);
    expect(mockProcessMemberTransfer).toHaveBeenCalledTimes(1);
  });

  test('disables Transfer button when required fields are missing', () => {
    // Mock empty form data
    (useChangeMemberDivision as jest.Mock).mockReturnValueOnce({
      ...mockHookReturn,
      formData: {
        ...defaultFormData,
        memberNo: '',
        newOffice: '',
      }
    });

    render(<ChangeMemberOffice />);
    const transferButton = screen.getByRole('button', { name: /transfer/i });
    expect(transferButton).toBeDisabled();
  });

  test('displays current office and new office selectors', () => {
    render(<ChangeMemberOffice />);
    
    const currentOfficeInput = screen.getByDisplayValue('Office A');
    const newOfficeInput = screen.getByDisplayValue('Office B');
    
    expect(currentOfficeInput).toBeInTheDocument();
    expect(newOfficeInput).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<ChangeMemberOffice />);
    expect(container).toMatchSnapshot();
  });
});

