// useChangePassword.ts
import { useState, useCallback } from 'react';
import type {
    ChangePasswordFormData,
    PasswordValidation,
    UseChangePasswordReturn,
    PasswordRequirements
} from '../interface/types';
import { API_BASE_URL, getApiBaseUrl } from '../../../../../services/apiVersionConfig';

const defaultPasswordRequirements: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false
};

export const useChangePassword = (): UseChangePasswordReturn => {
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    userName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const updateField = useCallback((field: keyof ChangePasswordFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const validatePassword = useCallback((password: string): PasswordValidation => {
    const errors: string[] = [];
    const requirements = defaultPasswordRequirements;

    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const validateForm = useCallback((): PasswordValidation => {
    const formErrors: string[] = [];
    const newErrors: { [key: string]: string } = {};

    // Check if all fields are filled
    if (!formData.userName.trim()) {
      formErrors.push('User name is required');
      newErrors.userName = 'User name is required';
    }

    if (!formData.currentPassword) {
      formErrors.push('Current password is required');
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      formErrors.push('New password is required');
      newErrors.newPassword = 'New password is required';
    }

    if (!formData.confirmPassword) {
      formErrors.push('Confirm password is required');
      newErrors.confirmPassword = 'Confirm password is required';
    }

    // Validate new password strength
    if (formData.newPassword) {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        formErrors.push(...passwordValidation.errors);
        if (passwordValidation.errors[0] !== undefined) {
          newErrors.newPassword = passwordValidation.errors[0];
        }
      }
    }

    // Check if new password matches confirmation
    if (formData.newPassword && formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        formErrors.push('New password and confirm password do not match');
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Check if new password is different from current password
    if (formData.currentPassword && formData.newPassword) {
      if (formData.currentPassword === formData.newPassword) {
        formErrors.push('New password must be different from current password');
        newErrors.newPassword = 'New password must be different from current password';
      }
    }

    setErrors(newErrors);

    return {
      isValid: formErrors.length === 0,
      errors: formErrors
    };
  }, [formData, validatePassword]);

  const isFormValid = useCallback((): boolean => {
    return validateForm().isValid;
  }, [validateForm]);

  const submitPasswordChange = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const validation = validateForm();

    if (!validation.isValid) {
      return { success: false, error: 'Form validation failed' };
    }

    setIsLoading(true);

    try {
      // BUG FIX 1: Actually call the backend API — was previously only simulating
      const token = localStorage.getItem('token');
      const response = await fetch(`${await getApiBaseUrl()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: formData.userName,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Server error: ${response.statusText}`;
        setErrors({ general: errorMessage });
        return { success: false, error: errorMessage };
      }

      resetForm();
      return { success: true };

    } catch (error) {
      console.error('Password change failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setErrors({ general: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm]);

  const resetForm = useCallback(() => {
    setFormData({
      userName: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setIsLoading(false);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    formData,
    isLoading,
    errors,
    updateField,
    validateForm,
    validatePassword,
    submitPasswordChange,
    resetForm,
    clearErrors,
    isFormValid
  };
};
