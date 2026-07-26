import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import CreateModifyUsers from '../../../service/Administration/Security/CreateModifyUsers/page/CreateModifyUsers';
import { useUserManagement } from '../../../service/Administration/Security/CreateModifyUsers/hook/useUserManagement';

// Mock the useUserManagement hook
vi.mock('../../../../service/Administration/Security/CreateModifyUsers/hook/useUserManagement');

const mockUseUserManagement = useUserManagement as jest.MockedFunction<typeof useUserManagement>;

describe('CreateModifyUsers Component', () => {
  const mockFormData = {
    userName: '',
    password: '',
    confirmPassword: '',
    userLevel: '',
    allowPassTransactions: false,
    defaultRights: [
      'View Reports',
      'Edit Users',
      'Delete Records',
      'Export Data'
    ],
    rightsAllot: [
      'Admin Access',
      'Supervisor Rights'
    ]
  };

  const mockFunctions = {
    updateFormData: vi.fn(),
    moveRights: vi.fn(),
    moveAllRights: vi.fn(),
    validateForm: vi.fn().mockReturnValue(true),
    resetForm: vi.fn(),
    setSelectedDefaultRights: vi.fn(),
    setSelectedRightsAllot: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock implementation
    mockUseUserManagement.mockReturnValue({
      formData: { ...mockFormData },
      selectedDefaultRights: [],
      selectedRightsAllot: [],
      ...mockFunctions
    });
  });

  test('renders the component with all form fields', () => {
    render(<CreateModifyUsers />);
    
    // Check if the main title is rendered
    expect(screen.getByText('CREATE/MODIFY USER')).toBeInTheDocument();
    
    // Check if all form fields are rendered
    expect(screen.getByLabelText('User Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText('User Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Allow Pass Transactions')).toBeInTheDocument();
    
    // Check if the rights transfer interface is rendered
    expect(screen.getByText('Default Rights')).toBeInTheDocument();
    expect(screen.getByText('Rights Allot')).toBeInTheDocument();
    
    // Check if action buttons are rendered
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  test('allows entering user information', () => {
    render(<CreateModifyUsers />);
    
    // Simulate user input
    const userNameInput = screen.getByLabelText('User Name');
    fireEvent.change(userNameInput, { target: { value: 'testuser' } });
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Check if updateFormData was called with the correct values
    expect(mockFunctions.updateFormData).toHaveBeenCalledWith('userName', 'testuser');
    expect(mockFunctions.updateFormData).toHaveBeenCalledWith('password', 'password123');
  });

  test('allows selecting user level from dropdown', () => {
    render(<CreateModifyUsers />);
    
    const userLevelSelect = screen.getByLabelText('User Level');
    fireEvent.change(userLevelSelect, { target: { value: 'admin' } });
    
    expect(mockFunctions.updateFormData).toHaveBeenCalledWith('userLevel', 'admin');
  });

  test('allows toggling the allow pass transactions checkbox', () => {
    render(<CreateModifyUsers />);
    
    const checkbox = screen.getByLabelText('Allow Pass Transactions');
    fireEvent.click(checkbox);
    
    expect(mockFunctions.updateFormData).toHaveBeenCalledWith('allowPassTransactions', true);
  });

  test('allows moving rights between lists', () => {
    render(<CreateModifyUsers />);
    
    // Click the right arrow button
    const rightArrowButton = screen.getByRole('button', { name: '>' });
    fireEvent.click(rightArrowButton);
    
    // Check if moveRights was called with the correct direction
    expect(mockFunctions.moveRights).toHaveBeenCalledWith('default', 'allot');
    
    // Click the left arrow button
    const leftArrowButton = screen.getByRole('button', { name: '<' });
    fireEvent.click(leftArrowButton);
    
    // Check if moveRights was called with the correct direction
    expect(mockFunctions.moveRights).toHaveBeenCalledWith('allot', 'default');
  });

  test('allows moving all rights between lists', () => {
    render(<CreateModifyUsers />);
    
    // Click the double right arrow button
    const doubleRightArrowButton = screen.getByRole('button', { name: '>>' });
    fireEvent.click(doubleRightArrowButton);
    
    // Check if moveAllRights was called with the correct direction
    expect(mockFunctions.moveAllRights).toHaveBeenCalledWith('default', 'allot');
    
    // Click the double left arrow button
    const doubleLeftArrowButton = screen.getByRole('button', { name: '<<' });
    fireEvent.click(doubleLeftArrowButton);
    
    // Check if moveAllRights was called with the correct direction
    expect(mockFunctions.moveAllRights).toHaveBeenCalledWith('allot', 'default');
  });

  test('calls save function when save button is clicked', () => {
    // Mock validateForm to return true
    mockUseUserManagement.mockReturnValue({
      formData: { ...mockFormData, userName: 'test', password: 'pass', confirmPassword: 'pass' },
      selectedDefaultRights: [],
      selectedRightsAllot: [],
      ...mockFunctions,
      validateForm: vi.fn().mockReturnValue(true)
    });
    
    render(<CreateModifyUsers />);
    
    // Click the save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    // Check if validateForm was called
    expect(mockFunctions.validateForm).toHaveBeenCalled();
  });

  test('shows error when form validation fails', () => {
    // Mock validateForm to return false
    mockUseUserManagement.mockReturnValue({
      formData: { ...mockFormData },
      selectedDefaultRights: [],
      selectedRightsAllot: [],
      ...mockFunctions,
      validateForm: vi.fn().mockReturnValue(false)
    });
    
    // Mock window.alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<CreateModifyUsers />);
    
    // Click the save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    // Check if alert was called with the correct message
    expect(alertMock).toHaveBeenCalledWith('Please fill all required fields correctly and ensure passwords match.');
    
    // Clean up
    alertMock.mockRestore();
  });

  test('resets the form when reset button is clicked', () => {
    render(<CreateModifyUsers />);
    
    // Click the reset button
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    // Check if resetForm was called
    expect(mockFunctions.resetForm).toHaveBeenCalled();
  });

  test('matches snapshot', () => {
    const { container } = render(<CreateModifyUsers />);
    expect(container).toMatchSnapshot();
  });
});

