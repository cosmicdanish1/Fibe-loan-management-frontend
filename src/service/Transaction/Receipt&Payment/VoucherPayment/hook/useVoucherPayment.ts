import { useState, useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Modal } from 'antd';
import { apiService } from '../../../../../services/api';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';
import type { SignForm, UnsignedVoucher, VoucherDetail, VoucherPaymentHookReturn } from '../interface/VoucherPaymentInterfaces';

const CASH_CODE = 'A1001';

const emptyForm = (): SignForm => ({
  modeOfPay: 'cash',
  bankCode: '',
  chequeDate: dayjs().format('YYYY-MM-DD'),
  chequeNo: '',
  bankName: '',
});

// the transform interceptor can wrap a payload once or twice
const payloadOf = (response: any) => response?.data?.data ?? response?.data;

export const useVoucherPayment = (): VoucherPaymentHookReturn => {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<UnsignedVoucher[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [selectedNo, setSelectedNo] = useState('');
  const [detail, setDetail] = useState<VoucherDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [form, setForm] = useState<SignForm>(emptyForm());
  const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([]);
  const [accountBalance, setAccountBalance] = useState(0);
  const [isSigning, setIsSigning] = useState(false);
  const signingRef = useRef(false);
  const detailSeq = useRef(0);

  // The member's signature from the member master, shown so the cashier can check it (the legacy "Sign" button did this).
  const [signature, setSignature] = useState<{ state: 'none' | 'loading' | 'ready' | 'missing'; url: string }>({ state: 'none', url: '' });
  const signatureUrlRef = useRef('');
  const setSignatureState = useCallback((state: 'none' | 'loading' | 'ready' | 'missing', url = '') => {
    if (signatureUrlRef.current) URL.revokeObjectURL(signatureUrlRef.current);
    signatureUrlRef.current = url;
    setSignature({ state, url });
  }, []);
  useEffect(() => () => { if (signatureUrlRef.current) URL.revokeObjectURL(signatureUrlRef.current); }, []);

  // "Sign" (legacy): a dialog that shows the member's signature, loaded only when it is opened
  const [signatureOpen, setSignatureOpen] = useState(false);
  const openSignature = useCallback(() => setSignatureOpen(true), []);
  const closeSignature = useCallback(() => setSignatureOpen(false), []);

  useEffect(() => {
    const memberNo = signatureOpen && detail && !detail.isGeneral ? detail.memberNo : '';
    if (!memberNo || memberNo === '0') { setSignatureState('none'); return; }
    let cancelled = false;
    setSignatureState('loading');
    apiService.fetchProtectedFile(`/members/master/${encodeURIComponent(memberNo)}/signature`)
      .then(blob => {
        if (cancelled) return;
        if (blob) setSignatureState('ready', URL.createObjectURL(blob));
        else setSignatureState('missing');
      })
      .catch(() => { if (!cancelled) setSignatureState('missing'); });
    return () => { cancelled = true; };
  }, [detail, signatureOpen, setSignatureState]);

  const loadList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const response = await apiService.get('/utilities/payment-vouchers/unsigned');
      const list = payloadOf(response);
      setVouchers(Array.isArray(list) ? list : []);
    } catch {
      setVouchers([]);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // our bank accounts, for "pay from" in bank mode
  useEffect(() => {
    apiService.getBankList()
      .then(response => {
        const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setBankAccounts((Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code })));
      })
      .catch(() => setBankAccounts([]));
  }, []);

  // live balance of the account the money goes out of
  const activeCode = form.modeOfPay === 'bank' ? (form.bankCode || '') : CASH_CODE;
  useEffect(() => {
    if (!activeCode) { setAccountBalance(0); return; }
    let cancelled = false;
    apiService.getHeadBalance(activeCode)
      .then(response => {
        if (cancelled) return;
        setAccountBalance(Number(response?.data?.balance ?? response?.data?.data?.balance ?? 0) || 0);
      })
      .catch(() => { if (!cancelled) setAccountBalance(0); });
    return () => { cancelled = true; };
  }, [activeCode]);

  const updateForm = useCallback((field: keyof SignForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const selectVoucher = useCallback(async (voucherNo: string) => {
    const seq = ++detailSeq.current;
    setSelectedNo(voucherNo);
    setDetail(null);
    setForm(emptyForm());
    if (!voucherNo) return;
    setIsLoadingDetail(true);
    try {
      const response = await apiService.get(`/utilities/payment-voucher/${encodeURIComponent(voucherNo)}`);
      if (seq !== detailSeq.current) return;
      const d = payloadOf(response);
      if (response?.success === false || !d?.voucherNo) {
        await showDialog('error', t('Voucher Payment'), t('Could not open the voucher'), response?.message || t('It may already be saved or deleted.'));
        setSelectedNo('');
        loadList();
        return;
      }
      setDetail(d);
    } catch (err: any) {
      if (seq === detailSeq.current) {
        await showDialog('error', t('System Connection Error'), t('Unable to Connect to Server'), err?.message || '');
        setSelectedNo('');
      }
    } finally {
      if (seq === detailSeq.current) setIsLoadingDetail(false);
    }
  }, [loadList, t]);

  const handleClear = useCallback(() => {
    detailSeq.current++;
    setSelectedNo('');
    setDetail(null);
    setForm(emptyForm());
  }, []);

  const handleSave = useCallback(async () => {
    if (signingRef.current || !detail) return;
    if (form.modeOfPay === 'bank') {
      if (!form.bankCode) {
        await showDialog('warning', t('Input Validation Error'), t('Bank Account Required'), t('Choose the bank account the payment is made from.'));
        return;
      }
      if (!form.chequeNo.trim()) {
        await showDialog('warning', t('Input Validation Error'), t('Cheque Number Required'), t('Please enter the cheque number for bank/cheque payment mode.'));
        return;
      }
    }
    signingRef.current = true;
    setIsSigning(true);
    try {
      const response: any = await apiService.post('/utilities/payment-voucher/save', {
        voucherNo: detail.voucherNo,
        modeOfPay: form.modeOfPay === 'bank' ? 'B' : 'C',
        bankCode: form.modeOfPay === 'bank' ? form.bankCode : '',
        cheqNo: form.modeOfPay === 'bank' ? form.chequeNo.trim() : '',
        cheqDate: form.modeOfPay === 'bank' ? form.chequeDate : '',
        bankName: form.modeOfPay === 'bank' ? form.bankName : '',
      });
      if (response?.success) {
        await showDialog(
          'info', 'electron-react-ts', t('Voucher Saved'),
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `VOUCHER NO    : ${detail.voucherNo}\n` +
          `MEMBER        : ${detail.isGeneral ? t('General') : `${detail.memberNo} - ${detail.memberName}`}\n` +
          `MODE OF PAY   : ${form.modeOfPay === 'bank' ? 'Bank/Cheque' : 'Cash'}\n` +
          `AMOUNT        : ₹${detail.total.toLocaleString('en-IN')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Saved in Voucher Payment\n` +
          `✓ Go to Pass Transactions to approve`,
        );
        handleClear();
        loadList();
      } else {
        await showDialog('error', t('Voucher Payment'), t('Failed to save the voucher'), response?.message || t('An unexpected error occurred. Please try again.'));
        loadList();
      }
    } catch (err: any) {
      await showDialog('error', t('System Connection Error'), t('Unable to Connect to Server'), err?.message || '');
    } finally {
      signingRef.current = false;
      setIsSigning(false);
    }
  }, [detail, form, handleClear, loadList, t]);

  const handleDelete = useCallback(() => {
    if (!detail) return;
    const no = detail.voucherNo;
    Modal.confirm({
      title: t('Delete voucher {{1}}?', { 1: no }),
      content: t('The voucher is removed completely. This cannot be undone.'),
      okText: t('Delete'),
      okButtonProps: { danger: true },
      cancelText: t('Cancel'),
      onOk: async () => {
        try {
          const response: any = await apiService.delete(`/transactions/voucher/${encodeURIComponent(no)}`);
          if (response?.success === false) {
            await showDialog('error', t('Voucher Payment'), t('Failed to delete the voucher'), response?.message || '');
          } else {
            handleClear();
          }
        } catch (err: any) {
          await showDialog('error', t('System Connection Error'), t('Unable to Connect to Server'), err?.message || '');
        } finally {
          loadList();
        }
      },
    });
  }, [detail, handleClear, loadList, t]);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('window-close');
    }
  }, []);

  return {
    vouchers, isLoadingList, selectedNo, detail, isLoadingDetail, signature, form, bankAccounts, accountBalance, isSigning,
    updateForm, selectVoucher, handleSave, signatureOpen, openSignature, closeSignature, handleDelete, handleRefresh: loadList, handleClear, handleExit,
  };
};
