import { useState } from 'react';
import type { FDRDetail, LoanAgainstDeposit } from '../types/fdr';

export const useFDRForm = () => {
  const [loanAgainstDeposit, setLoanAgainstDeposit] = useState<LoanAgainstDeposit>({
    isEnabled: false,
    fdrDetails: [{
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
    }]
  });

  const updateLoanAgainstDeposit = (field: keyof LoanAgainstDeposit, value: boolean | FDRDetail[]) => {
    setLoanAgainstDeposit(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateFDRDetail = (index: number, field: keyof FDRDetail, value: string | boolean) => {
    setLoanAgainstDeposit(prev => {
      const updatedFDRDetails = [...prev.fdrDetails];
      const currentDetail = updatedFDRDetails[index];
      // Create a new object with all required properties
      updatedFDRDetails[index] = {
        ...currentDetail,
        [field]: value
      } as FDRDetail;
      return { ...prev, fdrDetails: updatedFDRDetails };
    });
  };

  const addFDRDetail = () => {
    setLoanAgainstDeposit(prev => ({
      ...prev,
      fdrDetails: [
        ...prev.fdrDetails,
        {
          id: prev.fdrDetails.length + 1,
          lien: false,
          fdrNo: '',
          accountNo: '',
          depDate: '',
          period: '',
          unit: '',
          rate: '',
          amount: '',
          matAmount: ''
        }
      ]
    }));
  };

  const removeFDRDetail = (index: number) => {
    if (loanAgainstDeposit.fdrDetails.length > 1) {
      setLoanAgainstDeposit(prev => ({
        ...prev,
        fdrDetails: prev.fdrDetails.filter((_, i) => i !== index)
      }));
    }
  };

  return {
    loanAgainstDeposit,
    updateLoanAgainstDeposit,
    updateFDRDetail,
    addFDRDetail,
    removeFDRDetail
  };
};
