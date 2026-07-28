import { useState, useCallback, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { VoucherPaymentData, VoucherPaymentHookReturn, ReceiptRow } from '../interface/VoucherPaymentInterfaces';
import { apiService } from '../../../../../services/api';

const CASH_ACCOUNT = { code: 'A1001', name: 'CASH IN HAND' };

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

const emptyForm = (): VoucherPaymentData => ({
  memberNo: '',
  memberName: '',
  voucherNo: '',
  transDate: dayjs().format('YYYY-MM-DD'),
  paymentType: 'payment',
  subDivision: '',
  modeOfPay: 'cash',
  chequeDate: dayjs().format('YYYY-MM-DD'),
  chequeNo: '',
  bankName: '',
  receiveIntoCode: CASH_ACCOUNT.code,
  narration: '',
  rows: [],
});

const newRow = (): ReceiptRow => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  code: '',
  accType: '',
  description: '',
  amount: '',
});

export const useVoucherPayment = (): VoucherPaymentHookReturn => {
  const [formData, setFormData] = useState<VoucherPaymentData>(emptyForm());
  const [isLoading, setIsLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([CASH_ACCOUNT]);
  const [accountBalance, setAccountBalance] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ voucherNo: string; memberNo: string; memberName: string; total: number } | null>(null);

  // Cash + real bank current accounts (from /reports/banks) for the "Receive Into" selector
  useEffect(() => {
    apiService.getBankList()
      .then(response => {
        const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
        setBankAccounts([CASH_ACCOUNT, ...mapped]);
      })
      .catch(() => setBankAccounts([CASH_ACCOUNT]));
  }, []);

  // Live balance of the receiving account (cash A1001, or the chosen bank account)
  const activeAccount = formData.modeOfPay === 'bank' ? (formData.receiveIntoCode || 'A1001') : 'A1001';
  useEffect(() => {
    let cancelled = false;
    apiService.getHeadBalance(activeAccount)
      .then(response => {
        if (cancelled) return;
        const bal = response?.data?.balance ?? response?.data?.data?.balance ?? 0;
        setAccountBalance(Number(bal) || 0);
      })
      .catch(() => { if (!cancelled) setAccountBalance(0); });
    return () => { cancelled = true; };
  }, [activeAccount]);

  const totalAmount = useMemo(() =>
    formData.rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [formData.rows]
  );

  const updateField = useCallback((field: keyof VoucherPaymentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMemberSelect = useCallback((memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    setFormData(prev => ({
      ...prev,
      memberNo: actualNo,
      memberName: memberData?.memberName || '',
      subDivision: memberData?.officeNo?.toString() || prev.subDivision,
    }));
  }, []);

  const addRow = useCallback(() => {
    setFormData(prev => ({ ...prev, rows: [...prev.rows, newRow()] }));
  }, []);

  const updateRow = useCallback((id: string, field: keyof ReceiptRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  }, []);

  const removeRow = useCallback((id: string) => {
    setFormData(prev => ({ ...prev, rows: prev.rows.filter(r => r.id !== id) }));
  }, []);

  const handleSave = useCallback(async () => {
    // "General Payment" is a non-member (office/general ledger) voucher, so a member
    // is only required for a member "Payment".
    const isGeneral = formData.paymentType === 'general';
    if (!isGeneral && !formData.memberNo) {
      await showDialog('warning', 'Input Validation Error', 'Member Required', 'Please select a member, or switch to "General Payment".');
      return;
    }
    const validRows = formData.rows.filter(r => r.code && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      await showDialog('warning', 'Input Validation Error', 'No Valid Rows', 'Please add at least one row with a head code and amount greater than zero.');
      return;
    }
    // BUG FIX: added total > 0 guard
    if (totalAmount <= 0) {
      await showDialog('warning', 'Input Validation Error', 'Invalid Total Amount', 'Total voucher amount must be greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        memberNo: formData.memberNo ? parseInt(formData.memberNo) : 0,
        paymentType: formData.paymentType,
        voucherNo: formData.voucherNo || '',
        transDate: formData.transDate,
        modeOfPay: formData.modeOfPay === 'bank' ? 'B' : 'C',
        // Cash receipts debit cash (A1001); bank receipts debit the chosen bank account.
        receiveIntoCode: formData.modeOfPay === 'bank' ? (formData.receiveIntoCode || 'A1001') : 'A1001',
        narration: formData.narration || '',
        cheqNo: formData.chequeNo || '',
        cheqDate: formData.chequeDate || '',
        bankName: formData.bankName || '',
        rows: validRows.map(r => ({
          code: r.code,
          accType: r.accType || 'OTH',
          amount: parseFloat(r.amount) || 0,
        })),
      };

      const response = await apiService.saveReceiptVoucher(payload);
      if (response.success) {
        const result = response.data;
        const vchr = result?.voucherNo || '—';
        await showDialog(
          'info',
          'electron-react-ts',
          'Voucher Payment Staged Successfully!',
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `VOUCHER NO    : ${vchr}\n` +
          `MEMBER NO     : ${formData.memberNo} - ${formData.memberName || 'N/A'}\n` +
          `MODE OF PAY   : ${formData.modeOfPay === 'bank' ? 'Bank/Cheque' : 'Cash'}\n` +
          `TOTAL AMOUNT  : ₹${totalAmount.toLocaleString('en-IN')}\n` +
          `ROWS          : ${validRows.length}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Staged in transactions (pending pass)\n` +
          `✓ Awaiting cashier authorization`,
        );
        setLastSaved({
          voucherNo: vchr,
          memberNo: formData.memberNo,
          memberName: formData.memberName,
          total: totalAmount,
        });
        setFormData(emptyForm());
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await showDialog('error', 'Voucher Payment Error', 'Failed to Save Voucher Payment', response.message || 'An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formData, totalAmount]);

  const handleClear = useCallback(() => {
    setFormData(emptyForm());
    setLastSaved(null);
  }, []);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('window-close');
    }
  }, []);

  return {
    formData, totalAmount, bankAccounts, accountBalance, lastSaved,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading,
  };
};
