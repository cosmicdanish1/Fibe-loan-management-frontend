// hooks.ts
import { useState, useCallback, useEffect } from 'react';
import type {
    CalculationData,
    DropdownOption,
    ValidationResult,
    CalculationResult,
    ValidationErrors
} from '../type/type';
import type { 
  UseInterestCalculatorReturn, 
  UseDropdownDataReturn, 
  UseFormValidationReturn 
} from '../interface/interfaces';
import apiService from '../../../../services/api';
import dayjs from 'dayjs';

// Initial form data
const initialFormData: CalculationData = {
  selectedAccount: 'RECURRING DEPOSIT',
  fromDate: dayjs().subtract(1, 'year').startOf('year').format('DD-MMM-YYYY'),
  toDate: dayjs().subtract(1, 'year').endOf('year').format('DD-MMM-YYYY'),
  rate: '',
  minInterestAmount: '',
  total: 0,
  postDate: dayjs().format('DD-MMM-YYYY'),
  postAmount: 0
};

// Map account type display name → backend inttype code
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  'RECURRING DEPOSIT': 'RD',
  'SAVINGS ACCOUNT': 'SB',
  'CURRENT ACCOUNT': 'SB', // treat current as SB
  'FIXED DEPOSIT': 'FD',
  'NRI ACCOUNT': 'SB',
};

// Custom hook for form validation
export const useFormValidation = (): UseFormValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((field: keyof CalculationData, value: string | number): string | undefined => {
    switch (field) {
      case 'selectedAccount':
        return !value ? 'Please select an account' : undefined;
      case 'fromDate':
        return !value ? 'From date is required' : undefined;
      case 'toDate':
        return !value ? 'To date is required' : undefined;
      case 'rate':
        const rateNum = parseFloat(value as string);
        if (!value) return 'Rate is required';
        if (isNaN(rateNum) || rateNum < 0) return 'Please enter a valid rate';
        return undefined;
      case 'minInterestAmount':
        const minAmount = parseFloat(value as string);
        if (value && (isNaN(minAmount) || minAmount < 0)) {
          return 'Please enter a valid amount';
        }
        return undefined;
      case 'postDate':
        return !value ? 'Post date is required' : undefined;
      default:
        return undefined;
    }
  }, []);

  const validateForm = useCallback((data: CalculationData): ValidationResult => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    (Object.keys(data) as Array<keyof CalculationData>).forEach(key => {
      const error = validateField(key, data[key]);
      if (error) {
        newErrors[key as keyof ValidationErrors] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: keyof CalculationData) => {
    setErrors(prev => {
      const { [field as keyof ValidationErrors]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError
  };
};

// Custom hook for dropdown data
export const useDropdownData = (): UseDropdownDataReturn => {
  const [accountOptions, setAccountOptions] = useState<DropdownOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccountOptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const options: DropdownOption[] = [
        { value: 'RECURRING DEPOSIT', label: 'RECURRING DEPOSIT' },
        { value: 'SAVINGS ACCOUNT', label: 'SAVINGS ACCOUNT' },
        { value: 'CURRENT ACCOUNT', label: 'CURRENT ACCOUNT' },
        { value: 'FIXED DEPOSIT', label: 'FIXED DEPOSIT' },
        { value: 'NRI ACCOUNT', label: 'NRI ACCOUNT' }
      ];
      
      setAccountOptions(options);
    } catch (err) {
      setError('Failed to load account options');
      console.error('Error loading account options:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadAccountOptions();
  }, [loadAccountOptions]);

  useEffect(() => {
    loadAccountOptions();
  }, [loadAccountOptions]);

  return {
    accountOptions,
    isLoading,
    error,
    refreshData
  };
};

// Main hook for interest calculator
export const useInterestCalculator = (initialData?: Partial<CalculationData>): UseInterestCalculatorReturn => {
  const [formData, setFormData] = useState<CalculationData>({
    ...initialFormData,
    ...initialData
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { errors, validateForm, clearFieldError } = useFormValidation();

  // Load current interest rate on mount
  useEffect(() => {
    const loadRate = async () => {
      try {
        const response = await apiService.getCurrentInterestRate();
        if (response.success && response.data) {
          const rate = typeof response.data === 'number' ? response.data : (response.data as any).rate;
          if (rate) {
            setFormData(prev => ({ ...prev, rate: String(rate) }));
          }
        }
      } catch (err) {
        console.error('Error loading interest rate:', err);
      }
    };
    loadRate();
  }, []);

  const updateField = useCallback((field: keyof CalculationData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    clearFieldError(field);
  }, [clearFieldError]);

  const resetForm = useCallback(() => {
    setFormData({ ...initialFormData, ...initialData });
  }, [initialData]);

  const calculateInterest = useCallback(async (): Promise<CalculationResult> => {
    setIsLoading(true);
    
    try {
      // Convert DD-MMM-YYYY dates to YYYY-MM-DD for the API
      const fromDateISO = dayjs(formData.fromDate, 'DD-MMM-YYYY').format('YYYY-MM-DD');
      const toDateISO = dayjs(formData.toDate, 'DD-MMM-YYYY').format('YYYY-MM-DD');
      const rate = parseFloat(formData.rate) || 4;

      const accountTypeCode = ACCOUNT_TYPE_MAP[formData.selectedAccount] || 'SB';
      const payload = {
        fromDate: fromDateISO,
        toDate: toDateISO,
        interestRate: rate,
        accountType: accountTypeCode,
        accountHead: accountTypeCode,
        narration: `Interest calculation for ${formData.selectedAccount}`,
      };

      const response = await apiService.previewInterestCalculation(payload);

      if (!response.success) {
        throw new Error((response as any).message || 'Calculation failed');
      }

      const data = response.data as any;

      // Build transaction rows from member calculations
      const transactions = (data.memberCalculations || []).map((calc: any, i: number) => ({
        id: String(i + 1),
        date: calc.memberNumber || String(i + 1),
        description: calc.memberName || 'Member',
        amount: calc.openingBalance || 0,
        balance: calc.closingBalance || 0,
        interestEarned: calc.interestAmount || 0,
      }));

      const totalInterest = data.totalInterestAmount || 0;
      const totalBalance = (data.memberCalculations || []).reduce(
        (sum: number, c: any) => sum + (c.closingBalance || 0), 0
      );

      const result: CalculationResult = {
        total: totalBalance,
        postAmount: totalInterest,
        transactions,
      };

      // Update form with calculated values
      setFormData(prev => ({
        ...prev,
        total: result.total,
        postAmount: result.postAmount
      }));

      return result;
    } catch (error) {
      console.error('Error calculating interest:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to calculate interest');
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  return {
    formData,
    updateField,
    resetForm,
    validateForm: () => validateForm(formData),
    calculateInterest,
    isLoading,
    errors
  };
};

// Hook for managing local storage
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
};
