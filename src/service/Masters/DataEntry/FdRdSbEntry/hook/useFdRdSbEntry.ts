// hook/useFdRdSbEntry.ts

import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { FdRdSbEntryData, FdRdSbEntryHookReturn, EntryType } from '../interface/FdRdSbEntryInterfaces';
import { apiService } from '../../../../../services/api';

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail: string,
) => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({
      type, title, message: msg, detail, buttons: ['OK'], defaultId: 0,
    });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
  }
};

const emptyForm = (entryType: EntryType = 'FD'): FdRdSbEntryData => ({
  entryType,
  memberNo: '',
  memberName: '',
  accountNo: '',
  accounts: [],
  transDate: dayjs().format('YYYY-MM-DD'),
  transType: 'CR',
  amount: '',
  receiptVchrNo: '',
  vchrType: 'R',
  modeOfPay: 'C',
  narration: '',
});

export const useFdRdSbEntry = (): FdRdSbEntryHookReturn => {
  const [formData, setFormData] = useState<FdRdSbEntryData>(emptyForm('FD'));
  const [isLoading, setIsLoading] = useState(false);

  const updateField = useCallback((field: keyof FdRdSbEntryData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'entryType' && prev.memberNo) {
        updated.accountNo = '';
        updated.accounts = [];
        loadAccounts(prev.memberNo, value as EntryType);
      }
      return updated;
    });
  }, []);

  const loadAccounts = useCallback(async (memberNo: string, type: EntryType) => {
    if (!memberNo) return;
    try {
      const response = await apiService.getFdRdSbAccounts(memberNo, type);
      const raw = Array.isArray(response.data) ? response.data : [];
      const accounts = raw.map((a: any) => ({
        accountNo: a.accountNo?.toString() || '',
        certNo: a.certNo || '',
        amount: a.amount?.toString() || '0',
        label: `${a.accountNo} — ${a.certNo || ''} (₹${parseFloat(a.amount || 0).toLocaleString()})`
      }));
      setFormData(prev => ({ ...prev, accounts, accountNo: accounts.length === 1 ? accounts[0].accountNo : '' }));
    } catch (err) {
      console.error('[FdRdSbEntry] Failed to load accounts:', err);
    }
  }, []);

  const handleMemberSelect = useCallback(async (memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    const name = memberData?.memberName || '';

    setFormData(prev => ({
      ...prev,
      memberNo: actualNo,
      memberName: name,
      accountNo: '',
      accounts: [],
    }));

    if (actualNo) {
      await loadAccounts(actualNo, formData.entryType);
    }
  }, [formData.entryType, loadAccounts]);

  const handleSave = useCallback(async () => {
    if (!formData.memberNo) {
      await showDialog('warning', 'Input Validation Error', 'Member Required', 'Please select a member before saving.');
      return;
    }
    if (!formData.accountNo && formData.entryType === 'FD') {
      await showDialog('warning', 'Input Validation Error', 'FD Account Required', 'Please select an FD account before saving.');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      await showDialog('warning', 'Input Validation Error', 'Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }
    if (!formData.transDate) {
      await showDialog('warning', 'Input Validation Error', 'Date Required', 'Please select a transaction date.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        entryType: formData.entryType,
        memberNo: parseInt(formData.memberNo),
        accountNo: formData.entryType === 'FD' && formData.accountNo ? parseInt(formData.accountNo) : 0,
        transDate: formData.transDate,
        transType: formData.transType,
        amount: parseFloat(formData.amount),
        receiptVchrNo: formData.receiptVchrNo,
        vchrType: formData.vchrType || 'R',
        modeOfPay: formData.modeOfPay || 'C',
        narration: formData.narration,
      };

      const response = await apiService.saveFdRdSbEntry(payload);
      if (response.success) {
        const result = response.data;
        const transNo = result?.transNo || '—';
        const vchr = result?.voucherNo || formData.receiptVchrNo || '—';
        await showDialog(
          'info',
          'electron-react-ts',
          `${formData.entryType} Entry Saved Successfully!`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `ENTRY TYPE  : ${formData.entryType}\n` +
          `MEMBER NO   : ${formData.memberNo} - ${formData.memberName || 'N/A'}\n` +
          `TRANS TYPE  : ${formData.transType === 'CR' ? 'Credit (Deposit)' : 'Debit (Withdrawal)'}\n` +
          `AMOUNT      : ₹${parseFloat(formData.amount).toLocaleString('en-IN')}\n` +
          `VOUCHER NO  : ${vchr}\n` +
          `TRANS NO    : ${transNo}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Saved to ledger\n` +
          `✓ Cash/Bank account updated`,
        );
        // Clear form but keep entry type and member
        setFormData(prev => ({
          ...emptyForm(prev.entryType),
          memberNo: prev.memberNo,
          memberName: prev.memberName,
          accounts: prev.accounts,
        }));
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await showDialog('error', 'Entry Save Error', 'Failed to Save Entry', response.message || 'An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const handleClear = useCallback(() => {
    setFormData(emptyForm(formData.entryType));
  }, [formData.entryType]);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('close-window');
    }
  }, []);

  return {
    formData,
    updateField,
    handleMemberSelect,
    handleSave,
    handleClear,
    handleExit,
    isLoading,
  };
};
