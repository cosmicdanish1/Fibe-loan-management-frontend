import { useState } from 'react';
import type { LoanDetails } from '../types/loan';
import type { EmployeeDetail } from '../types/employee';

export const useLoanForm = () => {
  const [loanDetails, setLoanDetails] = useState<LoanDetails>({
    applDate: new Date().toISOString().split('T')[0] || '',
    memberNo: '',
    loanType: '',
    loanCaseNo: '',
    loanAmount: '',
    formNumber: '',
    reason: '',
    surety1: '',
    surety1Name: '',
    surety2: '',
    surety2Name: ''
  });

  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetail[]>(() => [{
    id: 1,
    mbNo: '',
    name: '',
    netSalary: '',
    dateOfRetire: '',
    officeName: '',
    address: ''
  } as EmployeeDetail]);

  const updateLoanDetails = (field: keyof LoanDetails, value: string) => {
    setLoanDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEmployeeDetails = (
    index: number,
    field: keyof Omit<EmployeeDetail, 'id'>,
    value: string
  ) => {
    setEmployeeDetails(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const addEmployeeDetail = () => {
    setEmployeeDetails(prev => {
      const newEmployee: EmployeeDetail = {
        id: prev.length > 0 ? Math.max(...prev.map(e => e.id ?? 0)) + 1 : 1,
        mbNo: '',
        name: '',
        netSalary: '',
        dateOfRetire: '',
        officeName: '',
        address: ''
      };
      return [...prev, newEmployee];
    });
  };

  const removeEmployeeDetail = (index: number) => {
    if (employeeDetails.length > 1) {
      setEmployeeDetails(prev => prev.filter((_, i) => i !== index));
    }
  };

  return {
    loanDetails,
    employeeDetails,
    updateLoanDetails,
    updateEmployeeDetails,
    addEmployeeDetail,
    removeEmployeeDetail
  };
};
