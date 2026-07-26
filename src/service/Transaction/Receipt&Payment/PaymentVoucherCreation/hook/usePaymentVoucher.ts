import { useState, useCallback, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { PaymentVoucherData, RowData, PaymentVoucherHookReturn } from '../interface/PaymentVoucherInterfaces';

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

const CASH_ACCOUNT = { code: 'A1001', name: 'CASH IN HAND' };

const emptyForm = (): PaymentVoucherData => ({
  voucherNo: '',
  transDate: dayjs().format('YYYY-MM-DD'),
  paymentType: 'payment',
  memberNo: '',
  memberName: '',
  officeNo: '',
  narration: '',
  payFromCode: CASH_ACCOUNT.code,
});

const newRow = (): RowData => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  code: '',
  name: '',
  amount: '',
  rdSrNo: '',
});

export const usePaymentVoucher = (): PaymentVoucherHookReturn => {
  const [formData, setFormData] = useState<PaymentVoucherData>(emptyForm());
  const [rows, setRows] = useState<RowData[]>([newRow()]);
  // "Pay From" options: Cash in hand + the real bank current accounts (from /reports/banks)
  const [payFromAccounts, setPayFromAccounts] = useState<{ code: string; name: string }[]>([CASH_ACCOUNT]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ voucherNo: string; memberNo: string; memberName: string; total: number; transDate: string } | null>(null);

  // Load the real bank current accounts on mount and prepend Cash.
  useEffect(() => {
    apiService.getBankList()
      .then(response => {
        const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
        setPayFromAccounts([CASH_ACCOUNT, ...mapped]);
      })
      .catch(() => setPayFromAccounts([CASH_ACCOUNT]));
  }, []);

  const totalAmount = useMemo(() =>
    rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [rows]
  );

  const updateField = useCallback((field: keyof PaymentVoucherData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    if (!formData.memberNo) {
      await showDialog('warning', 'Input Validation Error', 'Member Required', 'Please select a member before saving.');
      return;
    }
    // BUG FIX: validate transDate — empty string → Invalid Date in DB
    if (!formData.transDate) {
      await showDialog('warning', 'Input Validation Error', 'Date Required', 'Please select a transaction date.');
      return;
    }
    const validRows = rows.filter(r => r.code && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      await showDialog('warning', 'Input Validation Error', 'No Valid Rows', 'Please add at least one row with a head code and amount greater than zero.');
      return;
    }
    if (totalAmount <= 0) {
      await showDialog('warning', 'Input Validation Error', 'Invalid Total Amount', 'Total payment amount must be greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        memberNo: parseInt(formData.memberNo),
        voucherNo: formData.voucherNo || '',
        transDate: formData.transDate,
        paymentType: formData.paymentType,
        officeNo: formData.officeNo,
        narration: formData.narration,
        payFromCode: formData.payFromCode || 'A1001',
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
          'Payment Voucher Saved Successfully!',
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
        setFormData(emptyForm());
        setRows([newRow()]);
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await showDialog('error', 'Payment Voucher Error', 'Failed to Save Payment Voucher', response.message || 'An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formData, rows, totalAmount]);

  const handleClear = useCallback(() => {
    setFormData(emptyForm());
    setRows([newRow()]);
    setLastSaved(null);
  }, []);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('close-window');
    }
  }, []);

  return {
    formData, rows, totalAmount, payFromAccounts,
    lastSaved,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading,
  };
};
