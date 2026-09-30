// hooks.ts
import { useState, useCallback } from 'react';
import type { LoanApplicationState, LoanDetails } from '../types/loan';
import type { NomineeDetail } from '../types/nominee';
import type { EmployeeDetail } from '../types/employee';
import type { FDRDetail } from '../types/fdr';

const initialLoanDetails: LoanDetails = {
  applDate: new Date().toISOString().split('T')[0] as string,
  memberNo: '',
  loanType: '',
  loanCaseNo: '',
  loanAmount: '',
  formNumber: '',
  reason: ''
};

const initialNomineeDetail: NomineeDetail = {
  id: 1,
  name: '',
  address: '',
  age: '',
  relation: ''
};

const initialEmployeeDetails: EmployeeDetail[] = [
  { id: 1, mbNo: '', name: '', netSalary: '', dateOfRetire: '', officeName: '', address: '' },
  { id: 2, mbNo: '', name: '', netSalary: '', dateOfRetire: '', officeName: '', address: '' },
];

const initialFDRDetail: FDRDetail = {
  id: 1,
  lien: false,
  fdrNo: '',
  accountNo: '',
  depDate: '',
  period: '',
  unit: '',
  rate: '',
  amount: '',
  matAmount: ''
} as const;

export const useLoanApplication = () => {
  const [state, setState] = useState<LoanApplicationState>({
    activeTab: 'loan-details',
    loanDetails: initialLoanDetails,
    nomineeDetails: [initialNomineeDetail],
    employeeDetails: initialEmployeeDetails,
    loanAgainstDeposit: {
      isEnabled: false,
      fdrDetails: [initialFDRDetail]
    }
  });

  const setActiveTab = useCallback((tab: LoanApplicationState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const updateLoanDetails = useCallback((field: keyof LoanDetails, value: string) => {
    setState(prev => ({
      ...prev,
      loanDetails: { ...prev.loanDetails, [field]: value }
    }));
  }, []);

  const updateNomineeDetails = useCallback((details: NomineeDetail[]) => {
    setState(prev => ({ ...prev, nomineeDetails: details }));
  }, []);

  const updateEmployeeDetails = useCallback((details: EmployeeDetail[]) => {
    setState(prev => ({ ...prev, employeeDetails: details }));
  }, []);

  const updateSuretyRow = useCallback((idx: number, data: EmployeeDetail) => {
    setState(prev => {
      const details = [...prev.employeeDetails];
      details[idx] = { ...data, id: idx + 1 };
      return { ...prev, employeeDetails: details };
    });
  }, []);

  const updateLoanAgainstDeposit = useCallback((isEnabled: boolean) => {
    setState(prev => ({
      ...prev,
      loanAgainstDeposit: { ...prev.loanAgainstDeposit, isEnabled }
    }));
  }, []);

  const updateFDRDetails = useCallback((details: FDRDetail[]) => {
    setState(prev => ({
      ...prev,
      loanAgainstDeposit: { ...prev.loanAgainstDeposit, fdrDetails: details }
    }));
  }, []);

  return {
    state,
    setActiveTab,
    updateLoanDetails,
    updateNomineeDetails,
    updateEmployeeDetails,
    updateSuretyRow,
    updateLoanAgainstDeposit,
    updateFDRDetails
  };
};

export const useTableData = <T extends { id: number }>(
  initialData: T[],
  onDataChange: (data: T[]) => void
) => {
  const addRow = useCallback((template: Omit<T, 'id'>) => {
    const newId = Math.max(...initialData.map(item => item.id), 0) + 1;
    const newRow = { ...template, id: newId } as T;
    const newData = [...initialData, newRow];
    onDataChange(newData);
  }, [initialData, onDataChange]);

  const updateRow = useCallback((id: number, field: keyof T, value: any) => {
    const newData = initialData.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onDataChange(newData);
  }, [initialData, onDataChange]);

  const deleteRow = useCallback((id: number) => {
    if (initialData.length > 1) {
      const newData = initialData.filter(item => item.id !== id);
      onDataChange(newData);
    }
  }, [initialData, onDataChange]);

  return { addRow, updateRow, deleteRow };
};

export const useFormValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((name: string, value: string, required: boolean = false) => {
    let error = '';
    
    if (required && !value.trim()) {
      error = 'This field is required';
    } else if (name.includes('amount') && value && isNaN(Number(value))) {
      error = 'Please enter a valid number';
    } else if (name.includes('date') && value && !isValidDate(value)) {
      error = 'Please enter a valid date';
    }

    setErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validateField, clearErrors };
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};
