import { useState, useEffect } from 'react';
import type { 
  LoanPaymentState, 
  PaymentEntry, 
  Member, 
  Head, 
  ChequeDetails 
} from '../types';

const useLoanPayment = (initialState: Partial<LoanPaymentState> = {}) => {
  const [state, setState] = useState<LoanPaymentState>({
    loanType: '',
    loanCaseNo: '',
    noOfInst: 0,
    instAmount: 0,
    sanctionLoanAmount: 0,
    member: null,
    head: null,
    paymentMode: 'CASH',
    actualAmount: 0,
    bankBal: 0,
    chequeDetails: {
      date: new Date().toLocaleDateString('en-GB'), // Format: DD/MM/YYYY
      chequeNo: '',
      bank: ''
    },
    paymentEntries: [],
    narration: '',
    totalReceipt: 0,
    totalPayment: 0,
    ...initialState
  });

  const updateField = <K extends keyof LoanPaymentState>(
    field: K,
    value: LoanPaymentState[K]
  ) => {
    setState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateMember = (member: Partial<Member>) => {
    setState(prev => ({
      ...prev,
      member: prev.member ? { ...prev.member, ...member } : null
    }));
  };

  const updateHead = (head: Partial<Head>) => {
    setState(prev => ({
      ...prev,
      head: prev.head ? { ...prev.head, ...head } : null
    }));
  };

  const updateChequeDetails = (details: Partial<ChequeDetails>) => {
    setState(prev => ({
      ...prev,
      chequeDetails: { ...prev.chequeDetails, ...details }
    }));
  };

  const addPaymentEntry = (entry: Omit<PaymentEntry, 'srNo'>) => {
    const newEntry: PaymentEntry = {
      ...entry,
      srNo: state.paymentEntries.length + 1
    };
    
    setState(prev => ({
      ...prev,
      paymentEntries: [...prev.paymentEntries, newEntry]
    }));
  };

  const removePaymentEntry = (srNo: number) => {
    setState(prev => ({
      ...prev,
      paymentEntries: prev.paymentEntries
        .filter(entry => entry.srNo !== srNo)
        .map((entry, index) => ({ ...entry, srNo: index + 1 }))
    }));
  };

  const calculateTotals = () => {
    const totalReceipt = state.paymentEntries
      .filter(entry => entry.rpType === 'R')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    const totalPayment = state.paymentEntries
      .filter(entry => entry.rpType === 'P')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    return { totalReceipt, totalPayment };
  };

  // Recalculate totals when payment entries change
  useEffect(() => {
    const { totalReceipt, totalPayment } = calculateTotals();
    setState(prev => ({
      ...prev,
      totalReceipt,
      totalPayment
    }));
  }, [state.paymentEntries]);

  return {
    state,
    updateField,
    updateMember,
    updateHead,
    updateChequeDetails,
    addPaymentEntry,
    removePaymentEntry,
    setState
  };
};

export default useLoanPayment;
