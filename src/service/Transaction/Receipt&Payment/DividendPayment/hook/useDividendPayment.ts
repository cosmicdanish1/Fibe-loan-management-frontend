import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import {
    DividendPaymentData,
    DividendPaymentHookReturn,
    DividendEntry
} from '../interface/DividendPaymentInterfaces';
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

export const useDividendPayment = (): DividendPaymentHookReturn => {
    const [formData, setFormData] = useState<DividendPaymentData>({
        memberNo: '',
        subDivision: '',
        paymentMode: 'cash',
        transDate: dayjs().format('YYYY-MM-DD'),
        chequeDate: dayjs(),
        chequeNo: '',
        bankName: '',
        bankCode: '',
        narration: ''
    });

    const [actualAmount, setActualAmount] = useState(0);
    const [bankBalance, setBankBalance] = useState(0);
    const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([]);
    const [data, setData] = useState<DividendEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showLookupModal, setShowLookupModal] = useState(false);

    // Load real bank current accounts (from /reports/banks) for the pay-from selector
    useEffect(() => {
        apiService.getBankList()
            .then(response => {
                const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
                if (mapped.length > 0) {
                    setBankAccounts(mapped);
                    setFormData(prev => prev.bankCode ? prev : { ...prev, bankCode: mapped[0].code });
                }
            })
            .catch(() => { /* leave empty */ });
    }, []);

    // Live balance of the funding account — cash (A1001) for cash, the selected bank for bank
    const activeAccount = formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001';
    useEffect(() => {
        let cancelled = false;
        apiService.getHeadBalance(activeAccount)
            .then(response => {
                if (cancelled) return;
                const bal = response?.data?.balance ?? response?.data?.data?.balance ?? 0;
                setBankBalance(Number(bal) || 0);
            })
            .catch(() => { if (!cancelled) setBankBalance(0); });
        return () => { cancelled = true; };
    }, [activeAccount]);

    const updateField = useCallback((field: keyof DividendPaymentData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const fetchPendingDividends = useCallback(async (memberNo: string) => {
        if (!memberNo) {
            setData([]);
            setActualAmount(0);
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiService.getPendingDividends(memberNo);
            if (response.success && Array.isArray(response.data)) {
                const entries: DividendEntry[] = response.data.map((item: any) => ({
                    key: item.id?.toString() || '',
                    id: item.id,
                    wrNo: item.voucherNo || `DIV-${item.year}`,
                    year: item.year,
                    shareAmount: parseFloat(item.shareAmount || 0),
                    balance: parseFloat(item.shareAmount || 0),
                    rate: parseFloat(item.dividendRate || 0),
                    dividend: parseFloat(item.dividendAmount || 0),
                }));

                setData(entries);
                const total = entries.reduce((sum, item) => sum + item.dividend, 0);
                setActualAmount(total);

                if (entries.length === 0) {
                    await showDialog('info', 'electron-react-ts', 'No Pending Dividends', 'No pending dividends were found for this member.');
                }
            } else {
                setData([]);
                setActualAmount(0);
            }
        } catch (error: any) {
            console.error('Error fetching dividends:', error);
            await showDialog('error', 'Load Error', 'Failed to Fetch Dividends', `Could not retrieve pending dividends. Technical details: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounce fetch on memberNo change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.memberNo) {
                fetchPendingDividends(formData.memberNo);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [formData.memberNo, fetchPendingDividends]);

    const handleSave = useCallback(async () => {
        if (!formData.memberNo) {
            await showDialog('warning', 'Input Validation Error', 'Member Required', 'Please select a member before processing dividend payment.');
            return;
        }
        if (data.length === 0) {
            await showDialog('warning', 'Input Validation Error', 'No Pending Dividends', 'There are no pending dividends to pay for this member.');
            return;
        }
        // BUG FIX: validate amount > 0 to prevent saving ₹0 dividend records
        if (actualAmount <= 0) {
            await showDialog('warning', 'Input Validation Error', 'Invalid Dividend Amount', 'Total dividend amount must be greater than zero.');
            return;
        }
        // BUG FIX: validate cheque fields when bank mode selected
        if (formData.paymentMode === 'bank') {
            if (!formData.chequeNo) {
                await showDialog('warning', 'Input Validation Error', 'Cheque Number Required', 'Please enter the cheque number for bank/cheque payment mode.');
                return;
            }
            if (!formData.bankName) {
                await showDialog('warning', 'Input Validation Error', 'Bank Name Required', 'Please enter the bank name for bank/cheque payment mode.');
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                memberNo: formData.memberNo,
                // BUG FIX: was `vouchers: data.map(d => d.wrNo)` — sent wrNo strings but backend
                // expects `dividendIds: number[]` for `WHERE id = ANY($5)`. With the wrong key,
                // dividendIds arrived as undefined and the UPDATE dividend_master never executed,
                // leaving all dividends permanently "unpaid" in the DB.
                dividendIds: data.map(d => d.id),
                totalAmount: actualAmount,
                paymentMode: formData.paymentMode,
                transDate: formData.transDate,
                chequeNo: formData.paymentMode === 'bank' ? formData.chequeNo : null,
                chequeDate: formData.paymentMode === 'bank' ? (formData.chequeDate ? dayjs(formData.chequeDate).format('YYYY-MM-DD') : null) : null,
                bankName: formData.paymentMode === 'bank' ? formData.bankName : null,
                bankCode: formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001',
                narration: formData.narration || 'Dividend Payment',
            };

            const response = await apiService.processDividendPayment(payload);

            if (response.success) {
                const result = response.data;
                const vchr = result?.voucherNo || '—';
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Dividend Payment Processed Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `VOUCHER NO    : ${vchr}\n` +
                    `MEMBER NO     : ${formData.memberNo}\n` +
                    `TOTAL AMOUNT  : ₹${actualAmount.toLocaleString('en-IN')}\n` +
                    `MODE OF PAY   : ${formData.paymentMode === 'bank' ? 'Bank/Cheque' : 'Cash'}\n` +
                    `DIVIDENDS     : ${data.length} record(s) marked paid\n` +
                    (formData.paymentMode === 'bank' && formData.chequeNo ? `CHEQUE NO     : ${formData.chequeNo}\n` : '') +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Saved to ledger\n` +
                    `✓ Dividend records marked as paid`,
                );
                handleReset();
            } else {
                // BUG FIX: was response.error — apiService returns response.message, not response.error
                await showDialog('error', 'Dividend Payment Error', 'Payment Processing Failed', response.message || 'An unexpected error occurred. Please try again.');
            }
        } catch (error: any) {
            console.error('Save error:', error);
            await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [formData, data, actualAmount]);

    const handleReset = useCallback(() => {
        setFormData(prev => ({
            memberNo: '',
            subDivision: '',
            paymentMode: 'cash',
            transDate: dayjs().format('YYYY-MM-DD'),
            chequeDate: dayjs(),
            chequeNo: '',
            bankName: '',
            bankCode: prev.bankCode, // keep the loaded default bank account
            narration: ''
        }));
        setData([]);
        setActualAmount(0);
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        formData,
        actualAmount,
        bankBalance,
        bankAccounts,
        data,
        isLoading,
        showLookupModal,
        setShowLookupModal,
        updateField,
        handleSave,
        handleReset,
        handleExit,
    };
};
