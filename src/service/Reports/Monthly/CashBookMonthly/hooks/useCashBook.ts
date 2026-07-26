import { useState, useCallback } from 'react';
import { CashBookData, CashBookEntry, CashBookState } from '../interfaces/CashBook.interface';
import { apiService } from '../../../../../services/api';
import { message } from 'antd';

const useCashBook = () => {
  const [state, setState] = useState<CashBookState>({
    month: new Date().toLocaleString('default', { month: 'short' }),
    year: new Date().getFullYear().toString(),
    entries: [],
    isLoading: false,
    error: null,
  });

  const updateMonth = useCallback((month: string) => {
    setState(prev => ({ ...prev, month }));
  }, []);

  const updateYear = useCallback((year: string) => {
    setState(prev => ({ ...prev, year }));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await apiService.getCashBookMonthly(state.month, parseInt(state.year));

      if (response.success) {
        const data = response.data as any;
        const entries = Array.isArray(data) ? data : (data?.entries || []);
        setState(prev => ({ ...prev, entries, isLoading: false }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch cash book data.',
          isLoading: false,
        }));
        message.error('Failed to fetch cash book data');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch cash book data. Please try again.',
        isLoading: false,
      }));
      message.error('Failed to fetch cash book data');
    }
  }, [state.month, state.year]);

  const handlePrint = useCallback(() => {
    // In a real app, you would implement print functionality here
    window.print();
  }, []);

  const handleExport = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const headers = ['Code', 'Head Name', 'Receipt', 'Payment'];
    const csvRows = [
      headers.join(','),
      ...state.entries.map((e: CashBookEntry) =>
        [e.code, `"${e.headName}"`, e.receipt, e.payment].join(',')
      ),
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashbook_${state.month}_${state.year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.entries, state.month, state.year]);

  // Calculate totals
  const totals = state.entries.reduce(
    (acc, entry) => ({
      receipt: acc.receipt + entry.receipt,
      payment: acc.payment + entry.payment,
    }),
    { receipt: 0, payment: 0 }
  );

  const balance = totals.receipt - totals.payment;

  return {
    state,
    totals: {
      ...totals,
      balance,
    },
    updateMonth,
    updateYear,
    fetchData,
    handlePrint,
    handleExport,
  };
};

export default useCashBook;
