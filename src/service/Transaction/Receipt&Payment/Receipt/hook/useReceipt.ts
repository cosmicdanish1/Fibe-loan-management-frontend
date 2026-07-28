import { useState, useCallback, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { ReceiptData, ReceiptHookReturn, ReceiptRow } from '../interfaces/ReceiptInterfaces';
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

const emptyForm = (): ReceiptData => ({
  memberNo: '',
  memberName: '',
  voucherNo: '',
  transDate: dayjs().format('YYYY-MM-DD'),
  receiptType: 'receipt',
  officeNo: '',
  month: dayjs().format('MMM').toUpperCase(),
  year: dayjs().year().toString(),
  rlnBal: 0, rlnIntt: 0,
  elnBal: 0, elnIntt: 0,
  flnBal: 0, flnIntt: 0,
  bankBal: 0,
  modeOfPay: 'cash',
  bankCode: 'A1008',
  chequeDate: dayjs().format('YYYY-MM-DD'),
  chequeNo: '',
  bankName: '',
  customerBankName: '',
  narration: '',
  rows: [],
});

const newRow = (): ReceiptRow => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  code: '', accType: '', description: '', amount: '', rdSrNo: '',
});

export const useReceipt = (): ReceiptHookReturn => {
  const [formData, setFormData] = useState<ReceiptData>(emptyForm());
  const [bankHeads, setBankHeads] = useState<{ code: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ voucherNo: string; memberNo: string; memberName: string; total: number } | null>(null);

  // Load the real bank current accounts on mount (from /reports/banks)
  useEffect(() => {
    apiService.getBankList()
      .then(response => {
        const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
        if (mapped.length > 0) setBankHeads(mapped);
      })
      .catch(() => { /* leave empty; bankCode default still applies */ });
  }, []);

  // Live balance of the DR account — cash (A1001) for cash mode, the selected bank for bank mode
  const activeDrCode = formData.modeOfPay === 'cash' ? 'A1001' : (formData.bankCode || 'A1008');
  useEffect(() => {
    let cancelled = false;
    apiService.getHeadBalance(activeDrCode)
      .then(response => {
        if (cancelled) return;
        const bal = response?.data?.balance ?? response?.data?.data?.balance ?? 0;
        setFormData(prev => ({ ...prev, bankBal: Number(bal) || 0 }));
      })
      .catch(() => { if (!cancelled) setFormData(prev => ({ ...prev, bankBal: 0 })); });
    return () => { cancelled = true; };
  }, [activeDrCode]);

  const totalAmount = useMemo(() =>
    formData.rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [formData.rows]
  );

  const updateField = useCallback((field: keyof ReceiptData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // When switching to General Receipt, clear member fields and set memberNo to '0'
      if (field === 'receiptType' && value === 'general') {
        updated.memberNo = '0';
        updated.memberName = '';
        updated.officeNo = '';
        updated.rlnBal = 0; updated.rlnIntt = 0;
        updated.elnBal = 0; updated.elnIntt = 0;
        updated.flnBal = 0; updated.flnIntt = 0;
      }
      // When switching away from General Receipt, clear the '0'
      if (field === 'receiptType' && value !== 'general' && prev.memberNo === '0') {
        updated.memberNo = '';
      }
      return updated;
    });
  }, []);

  // Load loan balances for a member
  const loadMemberBalances = useCallback(async (memberNo: string, memberName: string, officeNo: string) => {
    setIsLoadingMember(true);
    try {
      const response = await apiService.get(`/utilities/member/balance?memberNo=${memberNo}`);
      // Response is double-wrapped by the transform interceptor: data.data holds the payload.
      const data = response?.data?.data ?? response?.data;
      const loan = data?.loan_summary || {};

      setFormData(prev => ({
        ...prev,
        memberNo,
        memberName,
        officeNo: officeNo || prev.officeNo,
        rlnBal: Number(loan.rln_balance) || 0,
        rlnIntt: 0, // interest balance not tracked in member_balances (only rates)
        elnBal: Number(loan.eln_balance) || 0,
        elnIntt: 0,
        flnBal: 0,  // no FLN (festival loan) balance source
        flnIntt: 0,
      }));
    } catch {
      setFormData(prev => ({ ...prev, memberNo, memberName, officeNo: officeNo || prev.officeNo }));
    } finally {
      setIsLoadingMember(false);
    }
  }, []);

  const handleMemberSelect = useCallback((memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    const name = memberData?.memberName || '';
    const officeNo = memberData?.officeNo?.toString() || '';
    loadMemberBalances(actualNo, name, officeNo);
  }, [loadMemberBalances]);

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
    if (!formData.memberNo) {
      await showDialog('warning', 'Input Validation Error', 'Member Required', 'Please select a member before saving.');
      return;
    }
    const validRows = formData.rows.filter(r => r.code && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      await showDialog('warning', 'Input Validation Error', 'No Valid Rows', 'Please add at least one row with a head code and amount greater than zero.');
      return;
    }
    if (totalAmount <= 0) {
      await showDialog('warning', 'Input Validation Error', 'Invalid Total Amount', 'Total receipt amount must be greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      // BUG FIX: cash mode must DR A1001 (CINH), not A1008 (bank).
      // Previously bankCode always defaulted to 'A1008' even for cash receipts,
      // causing cash collections to be posted to the bank account in the ledger.
      const resolvedBankCode = formData.modeOfPay === 'cash' ? 'A1001' : (formData.bankCode || 'A1008');

      const payload = {
        memberNo: parseInt(formData.memberNo),
        voucherNo: formData.voucherNo || '',
        transDate: formData.transDate,
        modeOfPay: formData.modeOfPay === 'bank' ? 'B' : 'C',
        bankCode: resolvedBankCode,
        narration: formData.narration || '',
        rows: validRows.map(r => ({
          code: r.code,
          accType: r.accType || 'OTH',
          amount: parseFloat(r.amount) || 0,
        })),
      };

      const response = await apiService.saveReceipt(payload);
      if (response.success) {
        const result = response.data;
        const vchr = result?.voucherNo || '—';
        await showDialog(
          'info',
          'electron-react-ts',
          'Receipt Saved Successfully!',
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `VOUCHER NO    : ${vchr}\n` +
          `MEMBER NO     : ${formData.memberNo} - ${formData.memberName || 'N/A'}\n` +
          `TRANS DATE    : ${formData.transDate}\n` +
          `MODE OF PAY   : ${formData.modeOfPay === 'bank' ? 'Bank/Cheque' : 'Cash'}\n` +
          `TOTAL AMOUNT  : ₹${totalAmount.toLocaleString('en-IN')}\n` +
          `ROWS          : ${validRows.length}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Saved to ledger\n` +
          `✓ ${formData.modeOfPay === 'cash' ? 'Cash account (A1001)' : 'Bank account'} debited`,
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
        await showDialog('error', 'Receipt Error', 'Failed to Save Receipt', response.message || 'An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formData, totalAmount]);

  const handleCancel = useCallback(() => {
    setFormData(emptyForm());
    setLastSaved(null);
  }, []);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('window-close');
    }
  }, []);

  return {
    formData, totalAmount, bankHeads, lastSaved, isLoadingMember,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleCancel, handleExit,
    isLoading,
  };
};
