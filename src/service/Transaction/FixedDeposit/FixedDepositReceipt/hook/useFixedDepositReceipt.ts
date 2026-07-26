import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import apiService from '../../../../../services/api';
import {
    FixedDepositData,
    FixedDepositHookReturn,
    NomineeEntry
} from '../interface/FixedDepositReceiptInterfaces';

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

const emptyForm = (): FixedDepositData => ({
    memberNo: '',
    referenceMemberNo: '',
    prefix: '',
    firstName: '',
    middleName: '',
    lastName: '',
    fdHeadName: '',
    fdHeadCode: 'A003',  // BUG FIX: separate code field — fdHeadName is display-only
    isModify: false,
    isAdjustment: false,
    isRenewal: false,
    certificateNo: '',
    rate: '',
    depositPeriod: '',
    intCalculationMethod: '',
    depositAmount: '',
    maturityAmount: '',
    depositDate: dayjs(),
    depositUnit: 'Months',
    maturityDate: dayjs().add(12, 'month'),
    modeOfPayment: '',
    intAmount: '',
    paymentMode: 'cash',
    chequeDate: dayjs(),
    chequeNo: '',
    bankName: '',
    bankCode: '',
    customerBankName: ''
});

export const useFixedDepositReceipt = (): FixedDepositHookReturn => {
    const [formData, setFormData] = useState<FixedDepositData>(emptyForm());
    // BUG FIX: nomineeData must be in React state — static const never reflects UI updates
    const [nomineeData, setNomineeData] = useState<NomineeEntry[]>([]);
    const [bankBalance, setBankBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showLookupModal, setShowLookupModal] = useState(false);

    const updateField = useCallback((field: keyof FixedDepositData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const addNominee = useCallback(() => {
        setNomineeData(prev => [...prev, {
            key: Date.now().toString() + Math.random().toString(36).slice(2),
            name: '', address: '', age: 0, relation: '',
        }]);
    }, []);

    const updateNominee = useCallback((key: string, field: keyof NomineeEntry, value: any) => {
        setNomineeData(prev => prev.map(n => n.key === key
            ? { ...n, [field]: field === 'age' ? (parseInt(value) || 0) : value }
            : n));
    }, []);

    const removeNominee = useCallback((key: string) => {
        setNomineeData(prev => prev.filter(n => n.key !== key));
    }, []);

    // Auto-calculate Interest & Maturity amounts from rate / period / amount / method.
    useEffect(() => {
        const principal = parseFloat(formData.depositAmount) || 0;
        const rate = parseFloat(formData.rate) || 0;
        const period = parseFloat(formData.depositPeriod) || 0;
        if (principal <= 0 || rate <= 0 || period <= 0) return;

        const months = formData.depositUnit === 'Years' ? period * 12
            : formData.depositUnit === 'Days' ? period / 30
            : period; // Months
        const years = months / 12;

        // intCalculationMethod: '2' = compound (annual), else simple
        let interest: number;
        if (formData.intCalculationMethod === '2') {
            interest = principal * (Math.pow(1 + rate / 100, years) - 1);
        } else {
            interest = principal * (rate / 100) * years;
        }
        const intAmt = interest.toFixed(2);
        const matAmt = (principal + interest).toFixed(2);

        setFormData(prev => (prev.intAmount === intAmt && prev.maturityAmount === matAmt)
            ? prev
            : { ...prev, intAmount: intAmt, maturityAmount: matAmt });
    }, [formData.depositAmount, formData.rate, formData.depositPeriod, formData.depositUnit, formData.intCalculationMethod]);

    // Live balance of the funding account — cash (A1001) or the selected bank
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

    const handleSave = useCallback(async () => {
        // BUG FIX: expanded validation — rate and depositPeriod are critical for FD creation
        if (!formData.memberNo) {
            await showDialog('warning', 'Input Validation Error', 'Member Required', 'Please select a member before saving.');
            return null;
        }
        if (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0) {
            await showDialog('warning', 'Input Validation Error', 'Invalid Deposit Amount', 'Please enter a valid deposit amount greater than zero.');
            return null;
        }
        if (!formData.rate || parseFloat(formData.rate) <= 0) {
            await showDialog('warning', 'Input Validation Error', 'Interest Rate Required', 'Please enter a valid interest rate greater than zero.');
            return null;
        }
        if (!formData.depositPeriod || parseInt(formData.depositPeriod) <= 0) {
            await showDialog('warning', 'Input Validation Error', 'Deposit Period Required', 'Please enter a valid deposit period greater than zero.');
            return null;
        }
        if (!formData.depositDate) {
            await showDialog('warning', 'Input Validation Error', 'Deposit Date Required', 'Please select a deposit date.');
            return null;
        }

        setIsLoading(true);
        try {
            const nominee = nomineeData.length > 0 ? nomineeData[0] : null;
            const payload = {
                memberNo: parseInt(formData.memberNo),
                prefix: formData.prefix,
                firstName: formData.firstName,
                middleName: formData.middleName,
                lastName: formData.lastName,
                certificateNo: formData.certificateNo,
                rate: parseFloat(formData.rate) || 0,
                depositPeriod: parseFloat(formData.depositPeriod) || 12,
                depositUnit: formData.depositUnit === 'Years' ? 2 : 1,
                depositAmount: parseFloat(formData.depositAmount) || 0,
                maturityAmount: parseFloat(formData.maturityAmount) || 0,
                depositDate: formData.depositDate ? dayjs(formData.depositDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                maturityDate: formData.maturityDate ? dayjs(formData.maturityDate).format('YYYY-MM-DD') : dayjs().add(12, 'month').format('YYYY-MM-DD'),
                modeOfPayment: parseInt(formData.modeOfPayment) || 1,
                intAmount: parseFloat(formData.intAmount) || 0,
                paymentMode: formData.paymentMode,
                chequeNo: formData.chequeNo,
                bankName: formData.bankName,
                bankCode: formData.paymentMode === 'bank' ? (formData.bankCode || 'A1008') : 'A1001',
                // BUG FIX: use fdHeadCode (actual code field), NOT fdHeadName (display label)
                headCode: formData.fdHeadCode || 'A003',
                intCalMethod: formData.intCalculationMethod === '2' ? 2 : 1,
                // Operation type from the Modify panel: 3 = renewal, 2 = adjustment/modify, 1 = new
                operationMode: formData.isRenewal ? 3 : (formData.isAdjustment || formData.isModify ? 2 : 1),
                isModify: formData.isModify,
                isAdjustment: formData.isAdjustment,
                isRenewal: formData.isRenewal,
                nomineeName: nominee?.name || '',
                nomineeAge: nominee?.age?.toString() || '',
                nomineeAddress: nominee?.address || '',
                nomineeRelation: nominee?.relation || '',
                // Full nominee list (saved to fd_nominee) — keep only filled rows
                nominees: nomineeData
                    .filter(n => (n.name || '').trim())
                    .map(n => ({ name: n.name, age: n.age || 0, address: n.address || '', relation: n.relation || '' })),
            };

            const response = await apiService.createFixedDeposit(payload);
            if (response.success) {
                const result = response.data;
                const accNo = result?.accountNumber || '—';
                const vchr = result?.voucherNo || '—';
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Fixed Deposit Created Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `ACCOUNT NO    : ${accNo}\n` +
                    `CERTIFICATE   : ${formData.certificateNo || accNo}\n` +
                    `MEMBER NO     : ${formData.memberNo} - ${formData.firstName} ${formData.lastName}\n` +
                    `DEPOSIT AMT   : ₹${parseFloat(formData.depositAmount).toLocaleString('en-IN')}\n` +
                    `INTEREST RATE : ${formData.rate}%\n` +
                    `PERIOD        : ${formData.depositPeriod} ${formData.depositUnit}\n` +
                    `MATURITY DATE : ${formData.maturityDate ? dayjs(formData.maturityDate).format('DD-MMM-YYYY') : '—'}\n` +
                    `VOUCHER NO    : ${vchr}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Saved to fdmaster\n` +
                    `✓ Ledger entries posted`,
                );
                return {
                    certificateNo: formData.certificateNo || String(accNo),
                    memberNo: formData.memberNo,
                    amount: parseFloat(formData.depositAmount) || 0
                };
            } else {
                // BUG FIX: was response.error — apiService returns response.message, not response.error
                await showDialog('error', 'FD Creation Error', 'Failed to Create Fixed Deposit', response.message || 'An unexpected error occurred. Please try again.');
                return null;
            }
        } catch (error: any) {
            await showDialog('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [formData, nomineeData]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleReset = useCallback(() => {
        setFormData(emptyForm());
        setNomineeData([]);
    }, []);

    const handleExit = useCallback(() => {
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        formData,
        nomineeData,
        addNominee,
        updateNominee,
        removeNominee,
        bankBalance,
        isLoading,
        showLookupModal,
        setShowLookupModal,
        updateField,
        handleSave,
        handlePrint,
        handleReset,
        handleExit,
    };
};
