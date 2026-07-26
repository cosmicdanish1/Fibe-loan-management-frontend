import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DesignationMaster from '../../../service/Masters/DesignationMaster/page/DesignationMaster';
import { useDesignationMaster } from '../../../service/Masters/DesignationMaster/hooks/useDesignationMaster';

// Mock the useDesignationMaster hook
vi.mock('../../../../service/Masters/DesignationMaster/hooks/useDesignationMaster');

const mockUseDesignationMaster = useDesignationMaster as jest.MockedFunction<typeof useDesignationMaster>;

describe('DesignationMaster Component', () => {
  // Mock functions
  const mockHandleChange = vi.fn();
  const mockHandleSave = vi.fn();
  const mockHandleCancel = vi.fn();
  const mockHandleExit = vi.fn();
  
  // Default mock implementation
  const defaultProps = {
    formData: {
      code: '',
      name: '',
      level: ''
    },
    handleChange: mockHandleChange,
    handleSave: mockHandleSave,
    handleCancel: mockHandleCancel,
    handleExit: mockHandleExit
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Set up the default mock implementation
    mockUseDesignationMaster.mockReturnValue(defaultProps);
  });

  test('renders the component with all form fields', () => {
    render(<DesignationMaster />);
    
    // Check if the title is rendered
    expect(screen.getByText('Designation Master')).toBeInTheDocument();
    
    // Check if all form fields are rendered
    expect(screen.getByLabelText('Designation Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Designation Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Designation Level')).toBeInTheDocument();
    
    // Check if all buttons are rendered
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
  });

  test('handles input changes for all fields', () => {
    render(<DesignationMaster />);
    
    // Test code input
    const codeInput = screen.getByLabelText('Designation Code');
    fireEvent.change(codeInput, { target: { value: 'MGR' } });
    expect(mockHandleChange).toHaveBeenCalledWith('code', 'MGR');
    
    // Test name input
    const nameInput = screen.getByLabelText('Designation Name');
    fireEvent.change(nameInput, { target: { value: 'Manager' } });
    expect(mockHandleChange).toHaveBeenCalledWith('name', 'Manager');
    
    // Test level input
    const levelInput = screen.getByLabelText('Designation Level');
    fireEvent.change(levelInput, { target: { value: '2' } });
    expect(mockHandleChange).toHaveBeenCalledWith('level', '2');
  });

  test('calls handleSave when save button is clicked', () => {
    render(<DesignationMaster />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(mockHandleSave).toHaveBeenCalledTimes(1);
  });

  test('calls handleCancel when cancel button is clicked', () => {
    render(<DesignationMaster />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockHandleCancel).toHaveBeenCalledTimes(1);
  });

  test('calls handleExit when exit button is clicked', () => {
    render(<DesignationMaster />);
    
    const exitButton = screen.getByRole('button', { name: /exit/i });
    fireEvent.click(exitButton);
    
    expect(mockHandleExit).toHaveBeenCalledTimes(1);
  });

  test('displays current form data', () => {
    // Override the default mock with test data
    const testData = {
      code: 'MGR',
      name: 'Manager',
      level: '2'
    };
    
    mockUseDesignationMaster.mockReturnValueOnce({
      ...defaultProps,
      formData: testData
    });
    
    render(<DesignationMaster />);
    
    // Check if the form fields display the test data
    expect(screen.getByDisplayValue('MGR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Manager')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<DesignationMaster />);
    expect(container).toMatchSnapshot();
  });
});

