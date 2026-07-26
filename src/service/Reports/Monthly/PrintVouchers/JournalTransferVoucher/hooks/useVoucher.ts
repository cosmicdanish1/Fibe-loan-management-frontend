import { useState } from 'react';
import { VoucherEntry, VoucherState } from '../interfaces/Voucher.interface';
import { apiService } from '../../../../../services/api';

const useVoucher = () => {
  const today = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [state, setState] = useState<Omit<VoucherState, 'entries' | 'error'>>({
    date: today(),
    voucherNo: '',
    narration: '',
    chequeNo: '',
    isLoading: false,
  });

  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addEntry = () => {
    const newEntry: VoucherEntry = {
      id: Date.now().toString(),
      srNo: entries.length + 1,
      mbNo: '',
      name: '',
      code: '',
      debit: 0,
      credit: 0,
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    const updatedEntries = entries
      .filter(entry => entry.id !== id)
      .map((entry, index) => ({
        ...entry,
        srNo: index + 1,
      }));
    setEntries(updatedEntries);
  };

  const updateEntry = (id: string, field: keyof VoucherEntry, value: string | number) => {
    const updatedEntries = entries.map(entry => {
      if (entry.id === id) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    setEntries(updatedEntries);
  };

  const handleInputChange = (field: keyof Omit<VoucherState, 'entries' | 'isLoading' | 'error'>, value: string) => {
    setState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!state.voucherNo.trim()) {
      setError('Voucher No. is required');
      return false;
    }
    if (entries.length === 0) {
      setError('At least one entry is required');
      return false;
    }
    for (const entry of entries) {
      if (!entry.mbNo.trim() || !entry.name.trim() || !entry.code.trim()) {
        setError('All fields are required for each entry');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await apiService.getJournalVoucherByNo(state.voucherNo);

      if (response.success && response.data) {
        const voucher = response.data as any;
        if (voucher.narration) setState(prev => ({ ...prev, narration: voucher.narration }));
        if (voucher.chequeNo) setState(prev => ({ ...prev, chequeNo: voucher.chequeNo }));
        if (voucher.entries && Array.isArray(voucher.entries)) {
          setEntries(
            voucher.entries.map((e: any, i: number) => ({
              id: e.id || `${Date.now()}-${i}`,
              srNo: i + 1,
              mbNo: e.mbNo || '',
              name: e.name || '',
              code: e.code || '',
              debit: e.debit || 0,
              credit: e.credit || 0,
            }))
          );
        }
        return true;
      } else {
        setError(response.error || 'Voucher not found');
        return false;
      }
    } catch (err) {
      setError('Failed to fetch voucher. Please try again.');
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handlePrint = () => {
    if (!validateForm()) return;
    // TODO: Implement print functionality
    window.print();
  };

  const resetForm = () => {
    setState({
      date: today(),
      voucherNo: '',
      narration: '',
      chequeNo: '',
      isLoading: false,
    });
    setEntries([]);
    setError(null);
  };

  return {
    state,
    entries,
    error,
    addEntry,
    removeEntry,
    updateEntry,
    handleInputChange,
    handleSubmit,
    handlePrint,
    resetForm,
  };
};

export default useVoucher;
