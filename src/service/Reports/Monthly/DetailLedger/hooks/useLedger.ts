import { useState, useCallback, useEffect } from 'react';
import { LedgerEntry, LedgerState, DateFormat, DateRange } from '../interfaces/Ledger.interface';
import { apiService } from '../../../../services/api';
import { message } from 'antd';

const useDetailLedger = (initialHeadName: string = '') => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [state, setState] = useState<Omit<LedgerState, 'entries'>>({
    headName: initialHeadName,
    fromDate: firstDayOfMonth,
    toDate: today,
    isLoading: false,
    error: null,
    openingBalance: 0,
    closingBalance: 0,
  });

  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  const formatDate = useCallback((date: Date, format: DateFormat = 'DD-MMM-YYYY'): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    if (format === 'YYYY-MM-DD') {
      return `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day}`;
    }
    
    return `${day}-${month}-${year}`;
  }, []);

  const fetchLedgerData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const fromDateStr = formatDate(new Date(state.fromDate), 'YYYY-MM-DD');
      const toDateStr = formatDate(new Date(state.toDate), 'YYYY-MM-DD');

      const response = await apiService.getDetailLedger(state.headName, fromDateStr, toDateStr);

      if (response.success) {
        const data = response.data as any;
        setEntries(Array.isArray(data) ? data : (data?.entries || []));
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to fetch ledger data.' }));
        message.error('Failed to fetch ledger data');
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to fetch ledger data. Please try again.' }));
      message.error('Failed to fetch ledger data');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.fromDate, state.toDate, state.headName, formatDate]);

  const updateDateRange = useCallback(({ fromDate, toDate }: DateRange) => {
    setState(prev => ({
      ...prev,
      fromDate,
      toDate,
    }));
  }, []);

  const updateHeadName = useCallback((headName: string) => {
    setState(prev => ({
      ...prev,
      headName,
    }));
  }, []); 

  const handlePrint = useCallback(() => {
    // In a real app, you would implement print functionality here
    window.print();
  }, []);

  const handleScreenView = useCallback(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // Fetch data when date range changes
  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  return {
    state: {
      ...state,
      entries,
    },
    formatDate,
    updateDateRange,
    updateHeadName,
    handlePrint,
    handleScreenView,
  };
};

export default useDetailLedger;
