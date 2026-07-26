import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import {
    FDWithdrawalData,
    FDWithdrawalHookReturn,
    FDEntry
} from '../interface/FDWithdrawalInterestPaymentInterfaces';

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

const emptyForm = (): FDWithdrawalData => ({
    voucherNo: '',
    fdOption: 'interest',
    memberNo: '',
    certNo: '',
    officeNo: '',
    fdCertNo: '',
    fdAccountNumber: '',  // BUG FIX: new field — fdmaster.account_number for interest posting
    depositDate: '',
    rate: '',
    depositUnit: '',
    depPer: '',
    maturityDate: '',
    fdInterest: '',
    lastIntPaidDate: '',
    fdAmount: '',
    interestPaid: '',
    intPaymentMode: '',
    maturityAmount: '',
    paymentMode: 'cash',
    transDate: dayjs().format('YYYY-MM-DD'),
    chequeDate: dayjs(),
    chequeNo: '',
    bankName: '',
    bankCode: '',
    narration: ''
});

export const useFDWithdrawalInterestPayment = (): FDWithdrawalHookReturn => {
    const [formData, setFormData] = useState<FDWithdrawalData>(emptyForm());
    const [actualAmount, setActualAmount] = useState(0);
    const [bankBalance, setBankBalance] = useState(0);
    const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([]);
    const [showLookupModal, setShowLookupModal] = useState(false);
    const [memberFDs, setMemberFDs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Real bank current accounts (from /reports/banks) for the pay-from selector
    useEffect(() => {
        apiService.getBankList()
            .then((response: any) => {
                const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
                if (mapped.length > 0) setBankAccounts(mapped);
            })
            .catch(() => { /* leave empty */ });
    }, []);

    // Live balance of the funding account — cash (A1001) or the chosen bank
    const activeAccount = formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001';
    useEffect(() => {
        let cancelled = false;
        apiService.getHeadBalance(activeAccount)
            .then((response: any) => {
                if (cancelled) return;
                const bal = response?.data?.balance ?? response?.data?.data?.balance ?? 0;
                setBankBalance(Number(bal) || 0);
            })
            .catch(() => { if (!cancelled) setBankBalance(0); });
        return () => { cancelled = true; };
    }, [activeAccount]);

    // BUG FIX: corrected API field name mapping.
    // getFdAccountsByMember returns: accountNumber, fdAmount, interestAmount, lastIntPayDate, depositPeriod
    // Previous mapping used wrong keys (acNo, amount, interest) causing blank table.
    const data: FDEntry[] = memberFDs.map(fd => ({
        key: fd.certNo,
        acNo: fd.accountNumber,                          // was fd.acNo → API returns accountNumber
        certNo: fd.certNo,
        amount: parseFloat(fd.fdAmount || 0),            // was fd.amount → API returns fdAmount
        rate: parseFloat(fd.rate || 0),
        lastPayDate: fd.lastIntPayDate                   // was fd.lastPayDate → API returns lastIntPayDate
            ? dayjs(fd.lastIntPayDate).format('DD-MMM-YYYY')
            : '-',
        interest: parseFloat(fd.interestAmount || 0)    // was fd.interest → API returns interestAmount
    }));

    const updateField = useCallback((field: keyof FDWithdrawalData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const fetchMemberFDs = useCallback(async (mbNo: string) => {
        if (!mbNo) return;
        setLoading(true);
        try {
            const res = await apiService.getMemberActiveFDs(mbNo);
            if (res.success && Array.isArray(res.data)) {
                setMemberFDs(res.data);
                if (res.data.length === 0) {
                    await showDialog('info', 'electron-react-ts', 'No Active FDs', 'No active Fixed Deposits found for this member.');
                }
            } else {
                setMemberFDs([]);
                await showDialog('info', 'electron-react-ts', 'No Active FDs', 'No active Fixed Deposits found for this member.');
            }
        } catch (error: any) {
            await showDialog('error', 'Load Error', 'Failed to Fetch FDs', `Could not retrieve FD list. Technical details: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-calculate actual amount based on fdOption
    useEffect(() => {
        if (formData.fdOption === 'interest') {
            setActualAmount(parseFloat(formData.fdInterest || '0'));
        } else {
            setActualAmount(parseFloat(formData.maturityAmount || '0'));
        }
    }, [formData.fdOption, formData.fdInterest, formData.maturityAmount]);

    // BUG FIX: corrected auto-populate field names from API response.
    // getFdAccountsByMember returns depositPeriod (not depPer), interestAmount (not interest),
    // lastIntPayDate (not lastPayDate), fdAmount (not amount), accountNumber (not acNo).
    useEffect(() => {
        if (formData.certNo && memberFDs.length > 0) {
            const fd = memberFDs.find(f => f.certNo === formData.certNo);
            if (fd) {
                setFormData(prev => ({
                    ...prev,
                    fdAccountNumber: (fd.accountNumber || '').toString(),  // NEW — needed for interest posting
                    fdCertNo: fd.certNo,
                    depositDate: fd.depositDate ? dayjs(fd.depositDate).format('DD-MMM-YYYY') : '',
                    rate: (fd.rate || '').toString(),
                    depositUnit: (fd.depositUnit || '').toString(),
                    depPer: (fd.depositPeriod || '').toString(),           // was fd.depPer → API: depositPeriod
                    maturityDate: fd.maturityDate ? dayjs(fd.maturityDate).format('DD-MMM-YYYY') : '',
                    fdInterest: (fd.interestAmount || 0).toString(),       // was fd.interest → API: interestAmount
                    lastIntPaidDate: fd.lastIntPayDate                      // was fd.lastPayDate → API: lastIntPayDate
                        ? dayjs(fd.lastIntPayDate).format('DD-MMM-YYYY')
                        : '',
                    fdAmount: (fd.fdAmount || 0).toString(),               // was fd.amount → API: fdAmount
                    interestPaid: (fd.interestPaid || 0).toString(),
                    intPaymentMode: (fd.intPaymentMode || '').toString(),
                    maturityAmount: (fd.maturityAmount || 0).toString()
                }));
            }
        }
    }, [formData.certNo, memberFDs]);

    const handleSave = useCallback(async () => {
        if (!formData.memberNo || !formData.certNo) {
            await showDialog('warning', 'Input Validation Error', 'Member & Certificate Required', 'Please select both a member and a certificate before saving.');
            return;
        }
        // BUG FIX: validate amount > 0
        if (actualAmount <= 0) {
            await showDialog('warning', 'Input Validation Error', 'Invalid Amount', 'Transaction amount must be greater than zero. Please select a valid FD certificate.');
            return;
        }
        // BUG FIX: validate cheque fields for bank mode
        if (formData.paymentMode === 'bank') {
            if (!formData.chequeNo) {
                await showDialog('warning', 'Input Validation Error', 'Cheque Number Required', 'Please enter the cheque number for bank/cheque payment mode.');
                return;
            }
            if (!formData.bankCode) {
                await showDialog('warning', 'Input Validation Error', 'Bank Account Required', 'Please select the bank account to pay from for bank/cheque payment mode.');
                return;
            }
        }

        try {
            let res;
            if (formData.fdOption === 'interest') {
                // BUG FIX: build correct payload for postFdInterestVoucher.
                // Previously spread all of formData — backend received accountNumber=undefined
                // (no such field in FDWithdrawalData) and interestAmount=undefined (key is fdInterest).
                if (!formData.fdAccountNumber) {
                    await showDialog('warning', 'Input Validation Error', 'FD Account Not Loaded', 'Please select a certificate from the table so the account number can be resolved.');
                    return;
                }
                // This is a PAYOUT screen: pay the accrued interest OUT to the member
                // (DR A003 / CR cash-bank, P voucher) — not the J accrual done elsewhere.
                const interestPayload = {
                    memberNo: parseInt(formData.memberNo),
                    accountNumber: parseInt(formData.fdAccountNumber),
                    certNo: formData.certNo,
                    interestAmount: actualAmount,
                    transDate: formData.transDate || new Date().toISOString().split('T')[0],
                    paymentMode: formData.paymentMode,
                    bankCode: formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001',
                    chequeNo: formData.chequeNo,
                    bankName: formData.bankName,
                    narration: formData.narration || 'FD Interest Payment',
                };
                res = await apiService.payFdInterest(interestPayload);
            } else {
                // Withdrawal / FD closure — most fields match what v2 closeFixedDeposit expects
                const withdrawalPayload = {
                    ...formData,
                    totalAmount: actualAmount,
                    transDate: formData.transDate || new Date().toISOString().split('T')[0],
                    bankCode: formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001',
                    payeeName: `${formData.memberNo}`,
                };
                res = await apiService.closeFixedDeposit(withdrawalPayload);
            }

            if (res.success) {
                const result = res.data;
                const vchr = result?.voucherNo || result?.voucherId || '—';
                const label = formData.fdOption === 'interest' ? 'FD Interest Payment' : 'FD Withdrawal';
                await showDialog(
                    'info',
                    'electron-react-ts',
                    `${label} Processed Successfully!`,
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `VOUCHER NO    : ${vchr}\n` +
                    `MEMBER NO     : ${formData.memberNo}\n` +
                    `CERTIFICATE   : ${formData.certNo}\n` +
                    `AMOUNT        : ₹${actualAmount.toLocaleString('en-IN')}\n` +
                    `MODE OF PAY   : ${formData.paymentMode === 'bank' ? 'Bank/Cheque' : 'Cash'}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    (formData.fdOption === 'interest'
                        ? `✓ Ledger entries posted\n✓ FD master updated (lastintpaydate, intpaid)`
                        : `✓ FD status set to Closed\n✓ Ledger entries posted`),
                );
                handleReset();
            } else {
                // BUG FIX: was generic 'Transaction failed' — now shows actual server message
                await showDialog('error', 'FD Transaction Error', 'Transaction Failed', res.message || 'An unexpected error occurred. Please try again.');
            }
        } catch (error: any) {
            await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        }
    }, [formData, actualAmount]);

    const handleReset = useCallback(() => {
        setFormData(emptyForm());
        setMemberFDs([]);
        setActualAmount(0);
    }, []);

    const handleExit = useCallback(() => {
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        formData,
        actualAmount,
        bankBalance,
        bankAccounts,
        data,
        updateField,
        handleSave,
        handleReset,
        handleExit,
        showLookupModal,
        setShowLookupModal,
        fetchMemberFDs,
        loading
    };
};
