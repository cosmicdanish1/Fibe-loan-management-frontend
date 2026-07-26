import { useState } from 'react';
import { useLoanForm } from './useLoanForm';
import { useNomineeForm } from './useNomineeForm';
import { useFDRForm } from './useFDRForm';
import type { LoanApplicationState } from '../types/loan';
import type { EmployeeDetail } from '../types/employee';
import type { LoanDetails } from '../types/loan';
import type { NomineeDetail } from '../types/nominee';

export const useLoanApplication = (): {
  state: LoanApplicationState;
  setActiveTab: (tab: LoanApplicationState['activeTab']) => void;
  updateLoanDetails: <K extends keyof LoanDetails>(field: K, value: LoanDetails[K]) => void;
  updateEmployeeDetails: (index: number, field: keyof Omit<EmployeeDetail, 'id'>, value: string) => void;
  updateNomineeDetails: (index: number, field: keyof NomineeDetail, value: string | number) => void;
  updateFDRDetails: (index: number, field: string, value: string | boolean) => void;
  updateLoanAgainstDeposit: (field: string, value: boolean) => void;
  addEmployeeDetail: () => void;
  removeEmployeeDetail: (index: number) => void;
  addNomineeDetail: () => void;
  removeNomineeDetail: (index: number) => void;
  addFDRDetail: () => void;
  removeFDRDetail: (index: number) => void;
} => {
  const [activeTab, setActiveTab] = useState<LoanApplicationState['activeTab']>('loan-details');
  
  const {
    loanDetails,
    employeeDetails,
    updateLoanDetails,
    updateEmployeeDetails,
    addEmployeeDetail,
    removeEmployeeDetail
  } = useLoanForm();

  const {
    nomineeDetails,
    updateNomineeDetails,
    addNomineeDetail,
    removeNomineeDetail
  } = useNomineeForm();

  const {
    loanAgainstDeposit,
    updateLoanAgainstDeposit: updateLAD,
    updateFDRDetail,
    addFDRDetail,
    removeFDRDetail
  } = useFDRForm();

  // Wrapper functions to maintain compatibility with existing components
  const updateFDRDetails = (index: number, field: string, value: string | boolean) => {
    updateFDRDetail(index, field as any, value);
  };

  const state: LoanApplicationState = {
    activeTab,
    loanDetails,
    nomineeDetails,
    employeeDetails,
    loanAgainstDeposit
  };

  return {
    state,
    setActiveTab,
    updateLoanDetails,
    updateEmployeeDetails,
    updateNomineeDetails,
    updateFDRDetails,
    updateLoanAgainstDeposit: (field: string, value: boolean) => updateLAD(field as any, value),
    addEmployeeDetail,
    removeEmployeeDetail,
    addNomineeDetail,
    removeNomineeDetail,
    addFDRDetail,
    removeFDRDetail
  };
};
