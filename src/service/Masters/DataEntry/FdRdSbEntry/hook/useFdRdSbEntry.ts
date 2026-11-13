// hook/useFdRdSbEntry.ts

import { useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { FdRdSbEntryData, FdRdSbEntryHookReturn, EntryType } from '../interface/FdRdSbEntryInterfaces';
import { apiService } from '../../../../../services/api';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog, toastError, isFailure } from '@/utils/dialog';

const emptyForm = (entryType: EntryType = 'RD'): FdRdSbEntryData => ({
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FdRdSbEntryData>(emptyForm('RD'));
  const [isLoading, setIsLoading] = useState(false);

  // Latest form state for callbacks that must not read it inside a setState updater.
  const formRef = useRef(formData);
  formRef.current = formData;
  // Out-of-order guard: only the most recent accounts request may apply.
  const accountsSeq = useRef(0);

  const loadAccounts = useCallback(async (memberNo: string, type: EntryType) => {
    const seq = ++accountsSeq.current;
    if (!memberNo) return;
    try {
      const response = await apiService.getFdRdSbAccounts(memberNo, type);
      if (isFailure(response)) toastError(response, 'load the member accounts');
      if (seq !== accountsSeq.current) return;
      const raw = Array.isArray(response.data) ? response.data : [];
      const accounts = raw.map((a: any) => ({
        accountNo: a.accountNo?.toString() || '',
        certNo: a.certNo || '',
        amount: a.amount?.toString() || '0',
        label: `${a.accountNo} — ${a.certNo || ''} (₹${parseFloat(a.amount || 0).toLocaleString()})`
      }));
      setFormData(prev => ({ ...prev, accounts, accountNo: accounts.length === 1 ? (accounts[0]?.accountNo ?? '') : '' }));
    } catch (err) {
      console.error('[FdRdSbEntry] Failed to load accounts:', err);
    }
  }, []);

  const updateField = useCallback((field: keyof FdRdSbEntryData, value: any) => {
    // Side effect kept OUT of the state updater (updaters run twice in StrictMode).
    const memberNo = formRef.current.memberNo;
    const typeChanged = field === 'entryType' && !!memberNo;
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'entryType' && prev.memberNo) {
        updated.accountNo = '';
        updated.accounts = [];
      }
      return updated;
    });
    if (typeChanged) loadAccounts(memberNo, value as EntryType);
  }, [loadAccounts]);

  const handleMemberSelect = useCallback(async (memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    const name = memberData?.memberName || '';

    accountsSeq.current++;
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
      await showDialog('warning', t('Input Validation Error'), t('Member Required'), t('Please select a member before saving.'));
      return;
    }
    if (formData.accounts.length > 0 && !formData.accountNo) {
      await showDialog('warning', t('Input Validation Error'), t('Account Required'), t('Please select the account this entry belongs to.'));
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Amount'), t('Please enter a valid amount greater than zero.'));
      return;
    }
    if (!formData.transDate) {
      await showDialog('warning', t('Input Validation Error'), t('Date Required'), t('Please select a transaction date.'));
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        entryType: formData.entryType,
        memberNo: parseInt(formData.memberNo),
        accountNo: parseInt(formData.accountNo, 10) || 0,
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
          t('{{1}} Entry Saved Successfully!', { 1: formData.entryType }),
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
        await showDialog('error', t('Entry Save Error'), t('Failed to Save Entry'), response.message || t('An unexpected error occurred. Please try again.'));
      }
    } catch (err: any) {
      await showDialog('error', t('System Connection Error'), t('Unable to Connect to Server'), t('Technical details: {{1}}', { 1: err.message }));
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const handleClear = useCallback(() => {
    accountsSeq.current++;
    setFormData(emptyForm(formData.entryType));
  }, [formData.entryType]);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('window-close');
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
