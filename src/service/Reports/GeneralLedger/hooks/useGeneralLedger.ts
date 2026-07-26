import { useState } from 'react';
import { LedgerEntry } from '../interfaces/LedgerReport.interface';
import { apiService } from '../../../services/api';
import { message } from 'antd';

const useGeneralLedger = () => {
  const today = new Date().toISOString().split('T')[0];
  
  const [state, setState] = useState({
    headName: '',
    memberNumber: '',
    fromDate: '2024-04-01',
    toDate: today,
    outputType: 'screen' as const,
    isLoading: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);

  const handleInputChange = <K extends keyof typeof state>(
    field: K,
    value: typeof state[K] | string
  ) => {
    setState(prev => ({
      ...prev,
      [field]: field === 'fromDate' || field === 'toDate' ? String(value) : value
    }));
  };

  const fetchLedgerData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      setError(null);

      const response = await apiService.getGeneralLedgerReport({
        headCode: state.headName,
        fromDate: state.fromDate,
        toDate: state.toDate,
      });

      if (response.success) {
        setLedgerData(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch ledger data');
        message.error('Failed to fetch ledger data');
      }
    } catch (err) {
      setError('Failed to fetch ledger data');
      message.error('Failed to fetch ledger data');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const printLedger = () => {
    window.print();
  };

  const exportToExcel = () => {
    try {
      
      const headers = ['Date', 'Particulars', 'Vch. No', 'Debit', 'Credit', 'Balance'];
      const csvRows = [
        headers.join(','),
        ...ledgerData.map(row => 
          [
            new Date(row.date).toLocaleDateString(),
            `"${row.particulars}"`,
            row.voucherNo,
            row.debit.toFixed(2),
            row.credit.toFixed(2),
            row.balance.toFixed(2)
          ].join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to export to Excel');
      console.error('Error exporting to Excel:', err);
    }
  };

  return {
    ...state,
    error,
    ledgerData,
    fetchLedgerData,
    printLedger,
    exportToExcel,
    setHeadName: (value: string) => handleInputChange('headName', value),
    setMemberNumber: (value: string) => handleInputChange('memberNumber', value),
    setFromDate: (value: string) => handleInputChange('fromDate', value),
    setToDate: (value: string) => handleInputChange('toDate', value),
    setOutputType: (value: 'screen' | 'printer') => handleInputChange('outputType', value),
  };
};

export default useGeneralLedger;
