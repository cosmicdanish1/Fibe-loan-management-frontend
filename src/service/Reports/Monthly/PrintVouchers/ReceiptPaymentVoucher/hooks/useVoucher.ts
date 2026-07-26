import { useState } from 'react';
import { VoucherEntry } from '../interfaces/Voucher.interface';
import { apiService } from '../../../../../services/api';
import { message } from 'antd';

interface VoucherFormState {
  date: string;
  voucherNo: string;
  vchrType: string;
  memberNo: string;
  mode: string;
  narration: string;
  chequeNo: string;
  bank: string;
  chequeDate: string;
  totalAmount: string;
  isLoading: boolean;
}

const useVoucher = () => {
  const today = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [state, setState] = useState<VoucherFormState>({
    date: today(),
    voucherNo: '',
    vchrType: '',
    memberNo: '',
    mode: '',
    narration: '',
    chequeNo: '',
    bank: '',
    chequeDate: today(),
    totalAmount: '0.00',
    isLoading: false,
  });

  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addEntry = () => {
    const newEntry: VoucherEntry = {
      id: Date.now().toString(),
      srNo: entries.length + 1,
      head: '',
      description: '',
      payment: 0,
      receipt: 0,
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (id: string, field: keyof VoucherEntry, value: string | number) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const calculateTotal = () => {
    const total = entries.reduce((sum, entry) => {
      return sum + (entry.payment || 0) + (entry.receipt || 0);
    }, 0);
    
    setState(prev => ({
      ...prev,
      totalAmount: total.toFixed(2)
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!state.voucherNo) {
        message.warning('Please enter a voucher number');
        return false;
      }
      setState(prev => ({ ...prev, isLoading: true }));
      setError(null);

      const response = await apiService.getVoucherByNo(state.voucherNo);

      if (response.success && response.data) {
        const voucher = response.data as any;
        setState(prev => ({
          ...prev,
          date: voucher.date || prev.date,
          vchrType: voucher.vchrType || voucher.type || prev.vchrType,
          memberNo: voucher.memberNo || prev.memberNo,
          mode: voucher.mode || prev.mode,
          narration: voucher.narration || prev.narration,
          chequeNo: voucher.chequeNo || prev.chequeNo,
          bank: voucher.bank || prev.bank,
          chequeDate: voucher.chequeDate || prev.chequeDate,
          totalAmount: voucher.totalAmount?.toString() || prev.totalAmount,
        }));
        if (voucher.entries && Array.isArray(voucher.entries)) {
          setEntries(voucher.entries);
        }
        return true;
      } else {
        message.error(response.error || 'Voucher not found');
        return false;
      }
    } catch (err) {
      message.error('Failed to fetch voucher');
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const printVoucher = () => {
    window.print();
  };

  const exportToPDF = () => {
    window.print();
  };

  return {
    // State
    ...state,
    entries,
    error,
    
    // Setters
    setDate: (date: string) => setState(prev => ({ ...prev, date })),
    setVoucherNo: (voucherNo: string) => setState(prev => ({ ...prev, voucherNo })),
    setVchrType: (vchrType: string) => setState(prev => ({ ...prev, vchrType })),
    setMemberNo: (memberNo: string) => setState(prev => ({ ...prev, memberNo })),
    setMode: (mode: string) => setState(prev => ({ ...prev, mode })),
    setNarration: (narration: string) => setState(prev => ({ ...prev, narration })),
    setChequeNo: (chequeNo: string) => setState(prev => ({ ...prev, chequeNo })),
    setBank: (bank: string) => setState(prev => ({ ...prev, bank })),
    setChequeDate: (chequeDate: string) => setState(prev => ({ ...prev, chequeDate })),
    
    // Actions
    addEntry,
    updateEntry,
    removeEntry,
    handleSubmit,
    printVoucher,
    exportToPDF,
    calculateTotal,
  };
};

export default useVoucher;
