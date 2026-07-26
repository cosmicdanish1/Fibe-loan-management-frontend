import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MemberMaster from '../../../service/Masters/MemberMaster/page/MemberMaster';
import { useMemberForm } from '../../../service/Masters/MemberMaster/Hook/useMemberForm';
import { defaultFormValues } from '../../../service/Masters/MemberMaster/interface/interface';

// Mock the useMemberForm hook
vi.mock('../../../../service/Masters/MemberMaster/Hook/useMemberForm');

const mockUseMemberForm = useMemberForm as jest.MockedFunction<typeof useMemberForm>;

describe('MemberMaster Component', () => {
  // Mock functions
  const mockHandleInputChange = vi.fn();
  const mockResetForm = vi.fn();
  const mockSetFormValues = vi.fn();
  
  // Default mock implementation
  const defaultProps = {
    formData: { ...defaultFormValues },
    handleInputChange: mockHandleInputChange,
    resetForm: mockResetForm,
    setFormValues: mockSetFormValues
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Set up the default mock implementation
    mockUseMemberForm.mockReturnValue(defaultProps);
  });

  test('renders the component with main title', () => {
    render(<MemberMaster />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Member Master')).toBeInTheDocument();
  });

  test('renders member number input field', () => {
    render(<MemberMaster />);
    
    // Check if member number input is rendered
    const memberNumberInput = screen.getByLabelText('Member Number');
    expect(memberNumberInput).toBeInTheDocument();
    expect(memberNumberInput).toHaveAttribute('type', 'text');
    
    // Check if the helper text is shown
    expect(screen.getByText('(For New Member, Leave Blank Member Number)')).toBeInTheDocument();
  });

  test('renders name fields with title selection', () => {
    render(<MemberMaster />);
    
    // Check title dropdown
    const titleSelect = screen.getByLabelText('Member Name');
    expect(titleSelect).toBeInTheDocument();
    expect(titleSelect.tagName).toBe('SELECT');
    
    // Check first name field
    const firstNameInput = screen.getByLabelText('First Name');
    expect(firstNameInput).toBeInTheDocument();
    expect(firstNameInput).toHaveAttribute('type', 'text');
    
    // Check middle name field
    const middleNameInput = screen.getByLabelText('Middle Name');
    expect(middleNameInput).toBeInTheDocument();
    expect(middleNameInput).toHaveAttribute('type', 'text');
    
    // Check last name field
    const lastNameInput = screen.getByLabelText('Last Name');
    expect(lastNameInput).toBeInTheDocument();
    expect(lastNameInput).toHaveAttribute('type', 'text');
  });

  test('handles input changes for text fields', () => {
    render(<MemberMaster />);
    
    // Test member number input
    const memberNumberInput = screen.getByLabelText('Member Number');
    fireEvent.change(memberNumberInput, { target: { value: 'M12345' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('memberNumber', 'M12345');
    
    // Test first name input
    const firstNameInput = screen.getByLabelText('First Name');
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('firstName', 'John');
  });

  test('handles title selection change', () => {
    render(<MemberMaster />);
    
    const titleSelect = screen.getByLabelText('Member Name');
    fireEvent.change(titleSelect, { target: { value: 'Mrs' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('title', 'Mrs');
  });

  test('handles active status toggle', () => {
    render(<MemberMaster />);
    
    const activeCheckbox = screen.getByLabelText('Active');
    fireEvent.click(activeCheckbox, { target: { checked: true } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('isActive', true);
  });

  test('renders father\'s name field', () => {
    render(<MemberMaster />);
    
    const fathersNameInput = screen.getByLabelText("Father's Name");
    expect(fathersNameInput).toBeInTheDocument();
    
    // Test input change
    fireEvent.change(fathersNameInput, { target: { value: 'John Doe Sr.' } });
    expect(mockHandleInputChange).toHaveBeenCalledWith('fatherName', 'John Doe Sr.');
  });

  test('matches snapshot', () => {
    const { container } = render(<MemberMaster />);
    expect(container).toMatchSnapshot();
  });

  test('displays current form data', () => {
    // Override the default mock with test data
    const testData = {
      ...defaultFormValues,
      memberNumber: 'M12345',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true
    };
    
    mockUseMemberForm.mockReturnValueOnce({
      ...defaultProps,
      formData: testData
    });
    
    render(<MemberMaster />);
    
    // Check if the form fields display the test data
    expect(screen.getByDisplayValue('M12345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByLabelText('Active')).toBeChecked();
  });
});

