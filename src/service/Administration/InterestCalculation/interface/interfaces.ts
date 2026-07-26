// interfaces.ts
// interfaces.ts
import type { CalculationData, DropdownOption, ValidationResult, CalculationResult } from '../type/type';

export interface UseInterestCalculatorReturn {
  formData: CalculationData;
  updateField: (field: keyof CalculationData, value: string | number) => void;
  resetForm: () => void;
  validateForm: () => ValidationResult;
  calculateInterest: () => Promise<CalculationResult>;
  isLoading: boolean;
  errors: ValidationResult['errors'];
}

export interface UseDropdownDataReturn {
  accountOptions: DropdownOption[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export interface UseFormValidationReturn {
  errors: ValidationResult['errors'];
  validateField: (field: keyof CalculationData, value: string | number) => string | undefined;
  validateForm: (data: CalculationData) => ValidationResult;
  clearErrors: () => void;
  clearFieldError: (field: keyof CalculationData) => void;
}

export interface InterestCalculatorProps {
  initialData?: Partial<CalculationData>;
  onCalculationComplete?: (result: CalculationResult) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  showCrystalReport?: boolean;
}

export interface PostSectionProps {
  postDate: string;
  postAmount: number;
  onPostDateChange: (date: string) => void;
  onPostClick: () => void;
  disabled?: boolean;
}

export interface DataGridProps {
  transactions: any[];
  isLoading?: boolean;
  error?: string | null;
  onRowSelect?: (rowId: string) => void;
  selectedRows?: string[];
}

export interface FormControlProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date';
  placeholder?: string;
  disabled?: boolean;
  error?: string | undefined;
  required?: boolean;
  className?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | undefined;
  className?: string;
}
