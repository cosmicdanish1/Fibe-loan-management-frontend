// types.ts
export interface ChangePasswordFormData {
    userName: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }
  
  export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
  }
  
  export interface UseChangePasswordReturn {
    formData: ChangePasswordFormData;
    isLoading: boolean;
    errors: { [key: string]: string };
    updateField: (field: keyof ChangePasswordFormData, value: string) => void;
    validateForm: () => PasswordValidation;
    validatePassword: (password: string) => PasswordValidation;
    submitPasswordChange: () => Promise<{ success: boolean; error?: string }>;
    resetForm: () => void;
    clearErrors: () => void;
    isFormValid: () => boolean;
  }
  
  export interface PasswordRequirements {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  }
  
  export interface ChangePasswordConfig {
    passwordRequirements: PasswordRequirements;
    showPasswordStrength: boolean;
    enableAutoComplete: boolean;
  }
