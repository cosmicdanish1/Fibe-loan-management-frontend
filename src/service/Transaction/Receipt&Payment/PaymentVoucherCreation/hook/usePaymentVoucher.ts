import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { PaymentVoucherData, RowData, PaymentVoucherHookReturn } from '../interface/PaymentVoucherInterfaces';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';


const emptyForm = (): PaymentVoucherData => ({
  voucherNo: '',
  transDate: dayjs().format('YYYY-MM-DD'),
  paymentType: 'payment',
  memberNo: '',
  memberName: '',
  officeNo: '',
  narration: '',
});

const newRow = (): RowData => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  code: '',
  name: '',
  amount: '',
  rdSrNo: '',
});

export const usePaymentVoucher = (): PaymentVoucherHookReturn => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<PaymentVoucherData>(emptyForm());
  // The voucher is dated by this window's Date setting (Day End > Date settings: the working date by default), which this
  // window can not change: the date shown is the one the server will use (the server ignores any date sent).
  const workingDateRef = useRef<string | null>(null);
  const withWorkingDate = <T extends { transDate: string }>(form: T): T => (workingDateRef.current ? { ...form, transDate: workingDateRef.current } : form);
  useEffect(() => {
    let alive = true;
    apiService.getPostingDate('RECEIPT_PAYMENT_VOUCHER_CREATION').then(res => {
      const d = (res as any)?.data?.date ?? (res as any)?.data?.data?.date;
      if (alive && res.success && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) { workingDateRef.current = d; setFormData(prev => ({ ...prev, transDate: d })); }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const [rows, setRows] = useState<RowData[]>([newRow()]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ voucherNo: string; memberNo: string; memberName: string; total: number; transDate: string } | null>(null);


  const totalAmount = useMemo(() =>
    rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [rows]
  );

  const updateField = useCallback((field: keyof PaymentVoucherData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // General Payment is not for a member: member selection is switched off (member 0) and cleared
      if (field === 'paymentType' && value === 'general') {
        updated.memberNo = '0';
        updated.memberName = '';
        updated.officeNo = '';
      }
      if (field === 'paymentType' && value !== 'general' && prev.memberNo === '0') {
        updated.memberNo = '';
      }
      return updated;
    });
  }, []);

  const handleMemberSelect = useCallback((memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    setFormData(prev => ({
      ...prev,
      memberNo: actualNo,
      memberName: memberData?.memberName || '',
      officeNo: memberData?.officeNo?.toString() || prev.officeNo,
    }));
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, newRow()]);
  }, []);

  const updateRow = useCallback((id: string, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    if (formData.paymentType !== 'general' && !formData.memberNo) {
      await showDialog('warning', t('Input Validation Error'), t('Member Required'), t('Please select a member before saving.'));
      return;
    }
    // BUG FIX: validate transDate — empty string → Invalid Date in DB
    if (!formData.transDate) {
      await showDialog('warning', t('Input Validation Error'), t('Date Required'), t('Please select a transaction date.'));
      return;
    }
    const validRows = rows.filter(r => r.code && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      await showDialog('warning', t('Input Validation Error'), t('No Valid Rows'), t('Please add at least one row with a head code and amount greater than zero.'));
      return;
    }
    if (totalAmount <= 0) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Total Amount'), t('Total payment amount must be greater than zero.'));
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        memberNo: formData.paymentType === 'general' ? 0 : parseInt(formData.memberNo),
        voucherNo: formData.voucherNo || '',
        transDate: formData.transDate,
        paymentType: formData.paymentType,
        officeNo: formData.officeNo,
        narration: formData.narration,
        rows: validRows.map(r => ({
          code: r.code,
          name: r.name,
          amount: parseFloat(r.amount) || 0,
          rdSrNo: r.rdSrNo,
        })),
      };

      const response = await apiService.savePaymentVoucher(payload);
      if (response.success) {
        const result = response.data;
        const vchr = result?.voucherNo || '—';
        await showDialog(
          'info',
          'electron-react-ts',
          t('Payment Voucher Saved Successfully!'),
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `VOUCHER NO    : ${vchr}\n` +
          `MEMBER NO     : ${formData.memberNo} - ${formData.memberName || 'N/A'}\n` +
          `TRANS DATE    : ${formData.transDate}\n` +
          `TOTAL AMOUNT  : ₹${totalAmount.toLocaleString('en-IN')}\n` +
          `ROWS          : ${validRows.length}\n` +
          (formData.narration ? `NARRATION     : ${formData.narration}\n` : '') +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Saved (Pending Pass)\n` +
          `✓ Go to Pass Transactions to approve`,
        );
        setLastSaved({
          voucherNo: vchr,
          memberNo: formData.memberNo,
          memberName: formData.memberName,
          total: totalAmount,
          transDate: formData.transDate,
        });
        setFormData(withWorkingDate(emptyForm()));
        setRows([newRow()]);
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await showDialog('error', t('Payment Voucher Error'), t('Failed to Save Payment Voucher'), response.message || t('An unexpected error occurred. Please try again.'));
      }
    } catch (err: any) {
      await showDialog('error', t('System Connection Error'), t('Unable to Connect to Server'), t('Technical details: {{1}}', { 1: err.message }));
    } finally {
      setIsLoading(false);
    }
  }, [formData, rows, totalAmount]);

  const handleClear = useCallback(() => {
    setFormData(withWorkingDate(emptyForm()));
    setRows([newRow()]);
    setLastSaved(null);
  }, []);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('window-close');
    }
  }, []);

  return {
    formData, rows, totalAmount,
    lastSaved,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading,
  };
};
