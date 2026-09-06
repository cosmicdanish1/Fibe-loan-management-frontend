import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';

const notify = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail: string) => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
  }
};
import type { ModifyFDData, ModifyFDHookReturn, NomineeDetail } from '../interfaces/interface';
import { apiService } from '../../../../services/api';

const emptyData = (): ModifyFDData => ({
  selectFD: '',
  allFdAccounts: [],
  prefix: '',
  firstName: '',
  middleName: '',
  lastName: '',
  certificateNo: '',
  depositDate: '',
  rate: '',
  depositUnit: '',
  depositPeriod: '',
  maturityDate: '',
  modeOfPayment: '',
  fdAmount: '',
  maturityAmount: '',
  intAmount: '',
  interestBalance: '',
  lastIntPaymentDate: '',
  interestPaid: '',
  status: '',
  nominee: { name: '', address: '', age: '', relation: '' }
});

export const useModifyFD = (): ModifyFDHookReturn => {
  const [data, setData] = useState<ModifyFDData>(emptyData());

  // Load all FD accounts on mount
  useEffect(() => {
    apiService.getAllFdAccounts()
      .then(response => {
        const accounts = Array.isArray(response.data) ? response.data : [];
        setData(prev => ({
          ...prev,
          allFdAccounts: accounts.map((a: any) => ({
            accountNumber: a.accountNumber?.toString() || '',
            label: `${a.accountNumber} — ${[a.prefix, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ')} (${a.certificateNo || ''})`
          }))
        }));
      })
      .catch(err => {
        console.error('[ModifyFD] Failed to load FD accounts:', err);
        notify('error', 'Load Error', 'Failed to Load FD Accounts', err.message || 'Unable to retrieve FD account list.');
      });
  }, []);

  // Called when an FD is selected from the dropdown
  const handleFdSelect = useCallback(async (accountNumber: string) => {
    setData(prev => ({
      ...emptyData(),
      allFdAccounts: prev.allFdAccounts,
      selectFD: accountNumber,
    }));

    if (!accountNumber) return;

    try {
      const response = await apiService.getFdAccount(accountNumber);
      const fd = response?.data;
      if (fd) {
        setData(prev => ({
          ...prev,
          selectFD: accountNumber,
          prefix: fd.prefix || '',
          firstName: fd.firstName || '',
          middleName: fd.middleName || '',
          lastName: fd.lastName || '',
          certificateNo: fd.certificateNo || '',
          depositDate: fd.depositDate ? dayjs(fd.depositDate).format('YYYY-MM-DD') : '',
          rate: fd.rate != null ? fd.rate.toString() : '',
          depositUnit: fd.depositUnit != null ? fd.depositUnit.toString() : '',
          depositPeriod: fd.depositPeriod != null ? fd.depositPeriod.toString() : '',
          maturityDate: fd.maturityDate ? dayjs(fd.maturityDate).format('YYYY-MM-DD') : '',
          modeOfPayment: fd.modeOfPayment != null ? fd.modeOfPayment.toString() : '',
          fdAmount: fd.fdAmount != null ? fd.fdAmount.toString() : '',
          maturityAmount: fd.maturityAmount != null ? fd.maturityAmount.toString() : '',
          intAmount: fd.interestAmount != null ? fd.interestAmount.toString() : '',
          interestBalance: fd.interestBalance != null ? fd.interestBalance.toString() : '',
          lastIntPaymentDate: fd.lastIntPaymentDate ? dayjs(fd.lastIntPaymentDate).format('YYYY-MM-DD') : '',
          interestPaid: fd.interestPaid != null ? fd.interestPaid.toString() : '',
          status: fd.status || '',
          nominee: {
            name: fd.nominee || '',
            age: fd.nomineeAge || '',
            address: fd.nomineeAddress || '',
            relation: fd.nomineeRelation || ''
          }
        }));
      }
    } catch (err) {
      console.error('[ModifyFD] Failed to load FD account:', err);
      notify('error', 'Load Error', 'FD Account Not Found', 'The selected account could not be loaded. Please try again.');
    }
  }, []);

  const updateField = useCallback(<K extends keyof ModifyFDData>(key: K, value: ModifyFDData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateNominee = useCallback((field: keyof NomineeDetail, value: string) => {
    setData(prev => ({ ...prev, nominee: { ...prev.nominee, [field]: value } }));
  }, []);

  const save = useCallback(async () => {
    if (!data.selectFD) {
      await notify('warning', 'Input Validation Error', 'No FD Account Selected', 'Please select an FD account from the dropdown before saving.');
      return;
    }

    const payload: any = {
      prefix: data.prefix,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      certificateNo: data.certificateNo,
      rate: parseFloat(data.rate) || 0,
      depositUnit: parseInt(data.depositUnit) || 0,
      depositPeriod: parseFloat(data.depositPeriod) || 0,
      fdAmount: parseFloat(data.fdAmount) || 0,
      maturityAmount: parseFloat(data.maturityAmount) || 0,
      interestAmount: parseFloat(data.intAmount) || 0,
      interestBalance: parseFloat(data.interestBalance) || 0,
      interestPaid: parseFloat(data.interestPaid) || 0,
      status: data.status,
      modeOfPayment: parseInt(data.modeOfPayment) || 0,
    };

    if (data.depositDate) payload.depositDate = new Date(data.depositDate);
    if (data.maturityDate) payload.maturityDate = new Date(data.maturityDate);
    if (data.lastIntPaymentDate) payload.lastIntPaymentDate = new Date(data.lastIntPaymentDate);

    payload.nominee = data.nominee.name || null;
    payload.nomineeAge = data.nominee.age || null;
    payload.nomineeAddress = data.nominee.address || null;
    payload.nomineeRelation = data.nominee.relation || null;

    try {
      const response = await apiService.updateFdAccount(data.selectFD, payload);
      if (response.success) {
        await notify(
          'info',
          'electron-react-ts',
          'FD Account Updated Successfully!',
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `ACCOUNT NO    : ${data.selectFD}\n` +
          `CERTIFICATE   : ${data.certificateNo || '—'}\n` +
          `FD AMOUNT     : ₹${parseFloat(data.fdAmount || '0').toLocaleString('en-IN')}\n` +
          `RATE          : ${data.rate}%\n` +
          `MATURITY DATE : ${data.maturityDate || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Updated in fdmaster`
        );
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await notify('error', 'FD Account Error', 'Failed to Update FD Account', response.message || 'An unexpected error occurred. Please try again.');
      }
    } catch (error: any) {
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [data]);

  const reset = useCallback(() => {
    if (data.selectFD) {
      handleFdSelect(data.selectFD);
    } else {
      setData(prev => ({ ...emptyData(), allFdAccounts: prev.allFdAccounts }));
    }
  }, [data.selectFD, handleFdSelect]);

  return {
    data,
    handleFdSelect,
    updateField,
    updateNominee,
    save,
    reset
  };
};
