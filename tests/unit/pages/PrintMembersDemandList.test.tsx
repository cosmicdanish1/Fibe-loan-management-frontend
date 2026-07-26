// src/tests/unit/pages/PrintMembersDemandList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import PrintMembersDemandList from '../../../service/Transaction/Demand&RecoveryList/PrintMembersDemandList/page/PrintMembersDemandList';
import useDemandPrinting from '../../../service/Transaction/Demand&RecoveryList/PrintMembersDemandList/hooks/useDemandPrinting';

// Mock the useDemandPrinting hook
vi.mock('../../../../service/Transaction/Demand&RecoveryList/PrintMembersDemandList/hooks/useDemandPrinting');

describe('PrintMembersDemandList Component', () => {
  // Mock data
  const defaultFormData = {
    divisionRO: 'Division 1',
    branch: 'Branch A',
    month: 'JAN',
    year: '2025',
    demandType: 'Regular',
    memberType: 'Active',
    memberNoFrom: 'M001',
    memberNoTo: 'M100',
    sortBy: 'Member No',
    printSequence: 'Ascending',
  };

  const mockUpdateFormData = vi.fn();
  const mockGenerateCrystalReport = vi.fn();
  const mockExportToDetails = vi.fn();

  const mockHookReturn = {
    formData: defaultFormData,
    updateFormData: mockUpdateFormData,
    generateCrystalReport: mockGenerateCrystalReport,
    exportToDetails: mockExportToDetails,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useDemandPrinting as jest.Mock).mockReturnValue(mockHookReturn);
  });

  test('renders the component with title', () => {
    render(<PrintMembersDemandList />);
    expect(screen.getByText('Demand Printing')).toBeInTheDocument();
  });

  test('displays form fields with default values', () => {
    render(<PrintMembersDemandList />);
    
    // Check form fields
    expect(screen.getByDisplayValue('Division 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Branch A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('JAN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025')).toBeInTheDocument();
    expect(screen.getByDisplayValue('M001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('M100')).toBeInTheDocument();
  });

  test('updates form data when inputs are changed', () => {
    render(<PrintMembersDemandList />);
    
    // Test division/RO input
    const divisionInput = screen.getByDisplayValue('Division 1');
    fireEvent.change(divisionInput, { target: { value: 'Division 2' } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('divisionRO', 'Division 2');
    
    // Test member number range
    const memberNoFrom = screen.getByDisplayValue('M001');
    fireEvent.change(memberNoFrom, { target: { value: 'M050' } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('memberNoFrom', 'M050');
  });

  test('calls generateCrystalReport when Print button is clicked', () => {
    render(<PrintMembersDemandList />);
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(mockGenerateCrystalReport).toHaveBeenCalledTimes(1);
  });

  test('calls exportToDetails when Export to Details button is clicked', () => {
    render(<PrintMembersDemandList />);
    const exportButton = screen.getByRole('button', { name: /export to details/i });
    fireEvent.click(exportButton);
    expect(mockExportToDetails).toHaveBeenCalledTimes(1);
  });

  test('disables buttons when required fields are missing', () => {
    // Mock empty form data
    (useDemandPrinting as jest.Mock).mockReturnValueOnce({
      ...mockHookReturn,
      formData: {
        ...defaultFormData,
        divisionRO: '',
        month: '',
        year: '',
      },
    });

    render(<PrintMembersDemandList />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    const exportButton = screen.getByRole('button', { name: /export to details/i });
    
    expect(printButton).toBeDisabled();
    expect(exportButton).toBeDisabled();
  });

  test('matches snapshot', () => {
    const { container } = render(<PrintMembersDemandList />);
    expect(container).toMatchSnapshot();
  });
});

