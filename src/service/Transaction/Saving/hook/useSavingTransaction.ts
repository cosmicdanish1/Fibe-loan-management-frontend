// hook/useSavingTransaction.ts

import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import {
    SavingTransactionData,
    TransactionHistoryRow,
    SavingTransactionHookReturn,
    SbAccountOption
} from '../interface/SavingTransactionInterfaces';
import { apiService } from '../../../../services/api';

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

const emptyForm = (): SavingTransactionData => ({
    voucherNo: '',
    accountNo: '',
    transDate: dayjs(),
    currentBalance: 0,
    minimumBalance: 0,
    unpassCr: 0,
    unpassDr: 0,
    availableBalance: 0,
    withdrawableBalance: 0,
    transactionType: 'deposit',
    amount: '',
    paymentMode: 'cash',
    actualAmount: 0,
    bankBal: 0,
    chequeDate: dayjs(),
    chequeNo: '',
    bankName: '',
    bankCode: '',
    modeOfOperation: '',
    operators: '',
    narration: ''
});

export const useSavingTransaction = (): SavingTransactionHookReturn => {
    const [formData, setFormData] = useState<SavingTransactionData>(emptyForm());
    const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryRow[]>([]);
    const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([]);
    const [sbAccounts, setSbAccounts] = useState<SbAccountOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAccount, setIsLoadingAccount] = useState(false);
    const [lastSaved, setLastSaved] = useState<{ voucherNo: string; accountNo: string; amount: number; type: string } | null>(null);

    // Real bank current accounts (from /reports/banks) for the bank cash leg
    useEffect(() => {
        apiService.getBankList()
            .then((response: any) => {
                const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
                if (mapped.length > 0) setBankAccounts(mapped);
            })
            .catch(() => { /* leave empty */ });
    }, []);

    // SB accounts for the A/C No picker — the field had no way to discover an account
    // number short of already knowing it by heart.
    useEffect(() => {
        apiService.getSbAccounts()
            .then((response: any) => {
                const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const mapped = (Array.isArray(raw) ? raw : []).map((a: any) => ({
                    accountNo: String(a.accountNo ?? a.acc_no ?? ''),
                    memberNo: String(a.memberNo ?? a.mbno ?? ''),
                    balance: Number(a.currentBalance ?? a.balance ?? 0),
                })).filter((a: SbAccountOption) => a.accountNo);
                setSbAccounts(mapped);
            })
            .catch(() => { /* leave empty — field still accepts free typing */ });
    }, []);

    // Live balance of the cash/bank account used for the offsetting leg
    const activeAccount = formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001';
    useEffect(() => {
        let cancelled = false;
        apiService.getHeadBalance(activeAccount)
            .then((response: any) => {
                if (cancelled) return;
                const bal = response?.data?.balance ?? response?.data?.data?.balance ?? 0;
                setFormData(prev => ({ ...prev, bankBal: Number(bal) || 0 }));
            })
            .catch(() => { if (!cancelled) setFormData(prev => ({ ...prev, bankBal: 0 })); });
        return () => { cancelled = true; };
    }, [activeAccount]);

    const updateField = useCallback((field: keyof SavingTransactionData, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'amount') {
                updated.actualAmount = parseFloat(value) || 0;
            }
            return updated;
        });
    }, []);

    const handleAccountNoChange = useCallback(async (accountNo: string) => {
        if (!accountNo || accountNo.trim() === '') {
            setFormData(prev => ({ ...emptyForm(), transDate: prev.transDate, transactionType: prev.transactionType }));
            setTransactionHistory([]);
            return;
        }

        setIsLoadingAccount(true);
        try {
            const response = await apiService.getSavingAccountDetails(accountNo);
            if (response.success && response.data) {
                const account = response.data;
                // BUG FIX 23: Postgres NUMERIC columns come back through node-pg as strings
                // ("7000.00", not 7000), and until BUG FIX 22 these fields always fell back to
                // the 0 (a real JS number) from emptyForm(), so this never surfaced. Now that
                // real values flow through, item.val.toFixed() crashed the whole form on render
                // because item.val was a string. Coerce every numeric field explicitly.
                setFormData(prev => ({
                    ...prev,
                    accountNo,
                    currentBalance: Number(account.currentBalance) || 0,
                    minimumBalance: Number(account.minimumBalance) || 0,
                    unpassCr: Number(account.unpassCr) || 0,
                    unpassDr: Number(account.unpassDr) || 0,
                    availableBalance: Number(account.availableBalance) || 0,
                    withdrawableBalance: Number(account.withdrawableBalance) || 0,
                    modeOfOperation: account.modeOfOperation || '',
                    operators: account.operators || '',
                }));
                const history = (account.transactionHistory || []).map((h: any) => ({
                    ...h,
                    amount: Number(h.amount) || 0,
                }));
                setTransactionHistory(history);
            } else {
                await showDialog('warning', 'electron-react-ts', 'Account Not Found', `No active savings account found for A/C No: ${accountNo}`);
                setFormData(prev => ({ ...emptyForm(), accountNo, transDate: prev.transDate, transactionType: prev.transactionType }));
                setTransactionHistory([]);
            }
        } catch (err: any) {
            await showDialog('error', 'electron-react-ts', 'Failed to Fetch Account', `Could not retrieve account details.\n\nTechnical: ${err.message}`);
            setFormData(prev => ({ ...emptyForm(), accountNo, transDate: prev.transDate, transactionType: prev.transactionType }));
            setTransactionHistory([]);
        } finally {
            setIsLoadingAccount(false);
        }
    }, []);

    const handleSave = useCallback(async () => {
        if (!formData.accountNo) {
            await showDialog('warning', 'electron-react-ts', 'Account Required', 'Please enter a Savings Account No before saving.');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            await showDialog('warning', 'electron-react-ts', 'Invalid Amount', 'Please enter a valid transaction amount greater than zero.');
            return;
        }
        if (!formData.narration) {
            await showDialog('warning', 'electron-react-ts', 'Narration Required', 'Please enter a narration for this transaction.');
            return;
        }
        // BUG FIX: validate cheque fields for bank mode
        if (formData.paymentMode === 'bank') {
            if (!formData.chequeNo) {
                await showDialog('warning', 'electron-react-ts', 'Cheque Number Required', 'Please enter the cheque number for bank/cheque payment mode.');
                return;
            }
            if (!formData.bankCode) {
                await showDialog('warning', 'electron-react-ts', 'Bank Account Required', 'Please select the bank account for bank/cheque payment mode.');
                return;
            }
        }

        // Validate withdrawal against withdrawable balance
        if (formData.transactionType === 'withdrawal') {
            const amount = parseFloat(formData.amount);
            if (amount > formData.withdrawableBalance) {
                await showDialog(
                    'error',
                    'electron-react-ts',
                    'Insufficient Balance',
                    `Withdrawable balance is ₹${formData.withdrawableBalance.toFixed(2)}.\nRequested amount ₹${amount.toFixed(2)} exceeds this limit.`
                );
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                accountNo: formData.accountNo,
                voucherNo: formData.voucherNo || '',
                transDate: formData.transDate ? dayjs(formData.transDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                transactionType: formData.transactionType,
                amount: parseFloat(formData.amount),
                paymentMode: formData.paymentMode,
                chequeNo: formData.paymentMode === 'bank' ? formData.chequeNo : '',
                chequeDate: formData.paymentMode === 'bank' && formData.chequeDate
                    ? dayjs(formData.chequeDate).format('YYYY-MM-DD') : null,
                bankName: formData.paymentMode === 'bank' ? formData.bankName : '',
                bankCode: formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001',
                narration: formData.narration,
            };

            const response = await apiService.saveSavingTransaction(payload);
            if (response.success) {
                const result = response.data;
                const txnLabel = formData.transactionType === 'deposit' ? 'Deposit' : 'Withdrawal';
                await showDialog(
                    'info',
                    'electron-react-ts',
                    `${txnLabel} Saved Successfully!`,
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `VOUCHER NO    : ${result?.voucherNo || '—'}\n` +
                    `ACCOUNT NO    : ${formData.accountNo}\n` +
                    `TYPE          : ${txnLabel}\n` +
                    `AMOUNT        : ₹${parseFloat(formData.amount).toLocaleString('en-IN')}\n` +
                    `MODE          : ${formData.paymentMode === 'bank' ? 'Bank/Cheque' : 'Cash'}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Ledger entries posted (DR + CR)\n` +
                    `✓ Account balance updated`
                );
                setLastSaved({
                    voucherNo: result?.voucherNo || '',
                    accountNo: formData.accountNo,
                    amount: parseFloat(formData.amount),
                    type: formData.transactionType,
                });
                // Refresh account details to show new balance
                await handleAccountNoChange(formData.accountNo);
                // BUG FIX 24: this used to rebuild from a blank emptyForm() and cherry-pick
                // specific fields back from `prev` to "keep account context" — confirmed live,
                // the balance panel kept showing the pre-transaction amount after a successful
                // save even though the DB was correct (verified: sbmaster.balance and the ledger
                // both had the right post-transaction values). Cherry-picking is exactly the kind
                // of thing that's easy to get subtly wrong. Merging onto `prev` instead means
                // every field the refresh above just set (balance, unpass cr/dr, etc.) carries
                // through automatically — only the fields that should actually clear for the next
                // transaction are listed here.
                setFormData(prev => ({
                    ...prev,
                    voucherNo: '',
                    transactionType: 'deposit',
                    amount: '',
                    paymentMode: 'cash',
                    actualAmount: 0,
                    bankBal: 0,
                    chequeDate: dayjs(),
                    chequeNo: '',
                    bankName: '',
                    bankCode: '',
                    narration: '',
                }));
            } else {
                // BUG FIX: was response.error — TransformInterceptor has no .error field; use response.message
                await showDialog('error', 'electron-react-ts', 'Transaction Failed', response.message || 'An unexpected error occurred. Please try again.');
            }
        } catch (err: any) {
            await showDialog('error', 'electron-react-ts', 'Unable to Connect to Server', `Technical details: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [formData, handleAccountNoChange]);

    const handleReset = useCallback(() => {
        setFormData(emptyForm());
        setTransactionHistory([]);
        setLastSaved(null);
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        formData,
        bankAccounts,
        sbAccounts,
        transactionHistory,
        isLoading,
        isLoadingAccount,
        lastSaved,
        updateField,
        handleAccountNoChange,
        handleSave,
        handleReset,
        handleExit,
    };
};
