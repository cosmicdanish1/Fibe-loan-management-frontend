import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ChangePassword from '../../../service/Administration/Security/ChangePassword/page/ChangePassword';

// Mock the fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof window.fetch;

// Mock the alert function
global.alert = vi.fn();

describe('ChangePassword Component', () => {
  test('renders the change password form', () => {
    render(<ChangePassword />);
    
    // Check if the component renders with the correct title
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    
    // Check if all input fields are rendered with proper types
    const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
    
    expect(currentPasswordInput).toBeInTheDocument();
    expect(newPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toBeInTheDocument();
    
    // Check input types
    expect(currentPasswordInput.type).toBe('password');
    expect(newPasswordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
    
    // Check if the update password button is rendered and initially disabled
    const updateButton = screen.getByRole('button', { name: /update password/i });
    expect(updateButton).toBeInTheDocument();
    expect(updateButton).toBeDisabled();
  });

  test('toggles password visibility when eye icon is clicked', () => {
    render(<ChangePassword />);
    
    // Get all eye icons using a more reliable selector
    const passwordInputs = screen.getAllByLabelText(/password/i);
    const toggleButtons = screen.getAllByRole('button', { name: /toggle password visibility/i });
    
    // Test toggling for each password field
    toggleButtons.forEach((button, index) => {
      const input = passwordInputs[index] as HTMLInputElement;
      
      // Initial state should be password
      expect(input.type).toBe('password');
      
      // Click to show password
      fireEvent.click(button);
      expect(input.type).toBe('text');
      
      // Click again to hide password
      fireEvent.click(button);
      expect(input.type).toBe('password');
    });
  });

  test('updates password strength indicator based on input', () => {
    render(<ChangePassword />);
    
    // Get the new password input
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    
    // Test with a weak password
    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
    
    // Test with a medium strength password
    fireEvent.change(newPasswordInput, { target: { value: 'Better123' } });
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    
    // Test with a strong password
    fireEvent.change(newPasswordInput, { target: { value: 'Strong@123' } });
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
    
    // Test with a very strong password
    fireEvent.change(newPasswordInput, { target: { value: 'Very$trongP@ssw0rd' } });
    expect(screen.getByText(/very strong/i)).toBeInTheDocument();
    
    // Test with empty password
    fireEvent.change(newPasswordInput, { target: { value: '' } });
    expect(screen.queryByText(/weak|medium|strong|very strong/i)).not.toBeInTheDocument();
  });

  test('shows error when passwords do not match', () => {
    render(<ChangePassword />);
    
    // Fill in the new password
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } });
    
    // Fill in a different confirm password
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } });
    
    // Check if the error message is shown
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    
    // The update button should still be disabled
    const updateButton = screen.getByRole('button', { name: /update password/i });
    expect(updateButton).toBeDisabled();
    
    // Fix the password to match
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
    expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
  });

  test('enables the update button only when all fields are valid', () => {
    render(<ChangePassword />);
    
    // Get all input fields and the update button with proper types
    const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
    const updateButton = screen.getByRole('button', { name: /update password/i });
    
    // Initially, the button should be disabled
    expect(updateButton).toBeDisabled();
    
    // Fill in current password only - button should still be disabled
    fireEvent.change(currentPasswordInput, { target: { value: 'CurrentPass123!' } });
    expect(updateButton).toBeDisabled();
    
    // Fill in new password - button should still be disabled (passwords don't match)
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } });
    expect(updateButton).toBeDisabled();
    
    // Fill in non-matching confirm password - button should still be disabled
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });
    expect(updateButton).toBeDisabled();
    
    // Fill in matching confirm password - button should be enabled
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
    expect(updateButton).not.toBeDisabled();
    
    // Clear a field - button should be disabled again
    fireEvent.change(currentPasswordInput, { target: { value: '' } });
    expect(updateButton).toBeDisabled();
  });

  test('shows success message after password update', () => {
    // Mock the fetch API
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Password updated successfully',
      }),
    });
    
    render(<ChangePassword />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Current Password'), { 
      target: { value: 'CurrentPass123!' } 
    });
    fireEvent.change(screen.getByLabelText('New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    
    // Click the update button
    const updateButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateButton);
    
    // Check if the fetch was called with the correct data
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPassword123!',
        }),
      })
    );
  });

  test('shows error message when password update fails', async () => {
    // Mock the fetch API to return an error
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: 'Current password is incorrect',
      }),
    });
    
    render(<ChangePassword />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Current Password'), { 
      target: { value: 'WrongPassword123!' } 
    });
    fireEvent.change(screen.getByLabelText('New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    
    // Click the update button
    const updateButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateButton);
    
    // Check if the error message is shown
    const errorMessage = await screen.findByText('Current password is incorrect');
    expect(errorMessage).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<ChangePassword />);
    expect(container).toMatchSnapshot();
  });

  test('successfully submits the form with valid data', async () => {
    // Mock a successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Password updated successfully',
      }),
    });

    render(<ChangePassword />);
    
    // Fill in all fields with valid data
    fireEvent.change(screen.getByLabelText('Current Password'), { 
      target: { value: 'CurrentPass123!' } 
    });
    fireEvent.change(screen.getByLabelText('New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    
    // Verify the API was called with the correct data
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            currentPassword: 'CurrentPass123!',
            newPassword: 'NewPassword123!',
          }),
        })
      );
      
      // Verify success message is shown
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
    });
  });

  test('shows error message when API call fails', async () => {
    // Mock a failed API response
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChangePassword />);
    
    // Fill in all fields with valid data
    fireEvent.change(screen.getByLabelText('Current Password'), { 
      target: { value: 'CurrentPass123!' } 
    });
    fireEvent.change(screen.getByLabelText('New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { 
      target: { value: 'NewPassword123!' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    
    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/failed to update password/i)).toBeInTheDocument();
    });
  });
});

