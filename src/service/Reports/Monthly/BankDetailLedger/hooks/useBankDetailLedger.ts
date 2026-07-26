import { useState, useCallback, useEffect } from 'react';
import {
  BankDetailLedgerState,
  BankAccountInfo,
  BankTransaction,
  DateRange
} from '../interfaces/BankDetailLedger.interface';
import { apiService } from '../../../../services/api';
import { message } from 'antd';

const useBankDetailLedger = (initialBankAccount?: BankAccountInfo) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [state, setState] = useState<Omit<BankDetailLedgerState, 'transactions'>>({
    bankName: initialBankAccount?.bankName || '',
    accountNo: initialBankAccount?.accountNo || '',
    fromDate: firstDayOfMonth,
    toDate: today,
    isLoading: false,
    error: null,
    openingBalance: 0,
    closingBalance: 0,
  });

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accountInfo, setAccountInfo] = useState<BankAccountInfo | null>(initialBankAccount || null);

  const fetchBankTransactions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const fromDateStr = new Date(state.fromDate).toISOString().split('T')[0];
      const toDateStr = new Date(state.toDate).toISOString().split('T')[0];

      const response = await apiService.getBankDetailLedger(
        state.bankName || state.accountNo,
        fromDateStr,
        toDateStr
      );

      if (response.success) {
        const data = response.data as any;
        setTransactions(Array.isArray(data) ? data : (data?.transactions || data?.entries || []));
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to fetch bank transactions.' }));
        message.error('Failed to fetch bank transactions');
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to fetch bank transactions. Please try again.' }));
      message.error('Failed to fetch bank transactions');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.fromDate, state.toDate, state.bankName, state.accountNo]);

  const updateDateRange = useCallback(({ fromDate, toDate }: DateRange) => {
    setState(prev => ({
      ...prev,
      fromDate,
      toDate,
    }));
  }, []);

  const updateBankAccount = useCallback((info: BankAccountInfo) => {
    setAccountInfo(info);
    setState(prev => ({
      ...prev,
      bankName: info.bankName,
      accountNo: info.accountNo,
    }));
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleScreenView = useCallback(() => {
    fetchBankTransactions();
  }, [fetchBankTransactions]);

  // Fetch transactions when date range or account changes
  useEffect(() => {
    if (accountInfo) {
      fetchBankTransactions();
    }
  }, [fetchBankTransactions, accountInfo]);

  return {
    state: {
      ...state,
      transactions,
    },
    accountInfo,
    updateDateRange,
    updateBankAccount,
    handlePrint,
    handleScreenView,
  };
};

export default useBankDetailLedger;
