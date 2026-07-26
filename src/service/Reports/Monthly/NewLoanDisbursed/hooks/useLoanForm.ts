import { useState } from 'react';
import { LoanFormData, UseLoanFormHook } from '../interfaces/NewLoanDisbursed.interface';
import { apiService } from '../../../../../services/api';
import { message } from 'antd';

const getToday = (): string => {
  const today = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
};

const useLoanForm = (): UseLoanFormHook => {
  const [formData, setFormData] = useState<LoanFormData>({
    accountType: 'EMERGENCY LOAN',
    fromDate: getToday(),
    toDate: getToday(),
    outputType: 'screen'
  });

  const updateFormData = (field: keyof LoanFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateReport = async () => {
    try {
      const response = await apiService.getNewLoanDisbursed(
        formData.fromDate,
        formData.toDate,
        formData.accountType
      );
      if (!response.success) {
        message.error(response.error || 'Failed to generate report');
      }
    } catch {
      message.error('Failed to generate report');
    }
  };

  const resetForm = () => {
    setFormData({
      accountType: 'EMERGENCY LOAN',
      fromDate: getToday(),
      toDate: getToday(),
      outputType: 'screen'
    });
  };

  return {
    formData,
    updateFormData,
    generateReport,
    resetForm
  };
};

export default useLoanForm;
